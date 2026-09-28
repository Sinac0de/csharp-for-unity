# 13. Coroutines, async/await and Threads

Games constantly wait: for a timer, a network reply, a scene to load. Unity offers several tools for that. Choosing the right one matters.

## 13.1 Which tool for which job

| | Coroutine | `async` / `Task` | `Awaitable` | `Thread` |
|---|---|---|---|---|
| Runs on | Main thread | Main thread, or a pool thread inside `Task.Run` | Main thread; can switch threads | Its own thread |
| Unity API safe | Yes | Yes after `await` on the main thread; no inside `Task.Run` | Yes on the main thread | No |
| Returns a value | No | Yes | Yes | Not directly |
| Stops automatically | When the GameObject is deactivated or destroyed | No (use a token) | No (use a token) | No |
| Best for | Frame-based sequences, timers, effects | I/O, network, composing async work | Unity-friendly async code | Heavy pure C# computation |

> [interview] Is a coroutine a thread?
> No. A coroutine runs on the main thread and is resumed by Unity at the point you `yield`. It gives you "wait, then continue" without blocking, but it does no parallel work.

## 13.2 Coroutines

```csharp
private Coroutine routine;
private static readonly WaitForSeconds Delay = new WaitForSeconds(0.5f);

private void OnEnable()  => routine = StartCoroutine(SpawnLoop());
private void OnDisable()
{
    if (routine != null) StopCoroutine(routine);
}

private IEnumerator SpawnLoop()
{
    while (true)
    {
        SpawnEnemy();
        yield return Delay;
    }
}
```

| `yield return ...` | Resumes |
|---|---|
| `null` | Next frame |
| `new WaitForSeconds(t)` | After `t` seconds of scaled time |
| `new WaitForSecondsRealtime(t)` | After `t` real seconds (ignores `timeScale`) |
| `new WaitForFixedUpdate()` | At the next physics step |
| `new WaitForEndOfFrame()` | After rendering the frame |
| `new WaitUntil(() => ready)` / `WaitWhile` | When a condition becomes true / false |
| `StartCoroutine(Other())` | When the other coroutine finishes |
| An `AsyncOperation` or web request | When the operation completes |

Facts to remember:

- A coroutine belongs to the `MonoBehaviour` that started it. It stops when that **GameObject** is deactivated or destroyed. Disabling only the *component* does **not** stop it.
- Coroutines cannot return values, and an exception ends the coroutine.
- Cache `WaitForSeconds` objects that you reuse; creating one each loop allocates.
- Use `WaitForSecondsRealtime` for pause menus, because `WaitForSeconds` freezes when `timeScale` is 0.

## 13.3 async and await

```csharp
public async Task<int> LoadScoreAsync(CancellationToken token)
{
    await Task.Delay(100, token);     // stands in for a server request
    return 100;
}
```

```csharp Calling it safely from Unity
private async void Start()            // Unity messages may be async void
{
    try
    {
        int score = await LoadScoreAsync(destroyCancellationToken);
        scoreText.text = score.ToString();   // back on the main thread
    }
    catch (OperationCanceledException) { }   // object was destroyed
}
```

Rules that prevent most async bugs in Unity:

- Unity provides a synchronization context, so after `await` on the main thread your code **resumes on the main thread** and may use Unity APIs.
- Code inside `Task.Run(...)` runs on a **thread-pool thread**. It must not touch Unity objects such as `transform`.
- **Never block** the main thread with `.Result` or `.Wait()`. It can freeze the game or deadlock.
- Prefer `async Task` or `async Task<T>`. Use `async void` only for event-handler-style entry points such as `Start`, and wrap the body in `try/catch`.
- **Tasks are not cancelled when an object is destroyed or when you leave Play mode.** They keep running. Pass a `CancellationToken`. On a `MonoBehaviour`, `destroyCancellationToken` (Unity 2022.2 and newer) is cancelled automatically when the object is destroyed.
- `Task.Delay` uses real time and ignores `Time.timeScale`.
- WebGL does not support multithreading, so do not rely on `Thread` or `Task.Run` there.

```csharp Running work in parallel, and cancelling
private CancellationTokenSource cts;

public async Task LoadAllAsync()
{
    cts = new CancellationTokenSource();
    await Task.WhenAll(
        LoadPlayerAsync(cts.Token),
        LoadInventoryAsync(cts.Token),
        LoadSettingsAsync(cts.Token));
}

public void Cancel()
{
    cts?.Cancel();
    cts?.Dispose();
    cts = null;
}
```

```csharp CPU-heavy work on a background thread
// Pure C# data only: no Unity objects inside the lambda
int result = await Task.Run(() => HeavyCalculation(data));

// Here we are back on the main thread and may use Unity APIs
resultText.text = result.ToString();
```

## 13.4 Awaitable

`Awaitable` (Unity 2023.1 and Unity 6 onwards) is Unity's own awaitable type. It integrates with the player loop and is designed to allocate less than `Task`.

```csharp
private async Awaitable FlashAsync()
{
    await Awaitable.WaitForSecondsAsync(0.5f, destroyCancellationToken);
    await Awaitable.NextFrameAsync(destroyCancellationToken);
}
```

Related helpers: `Awaitable.BackgroundThreadAsync()` moves to a background thread, and `Awaitable.MainThreadAsync()` returns to the main thread. Do not `await` the same `Awaitable` instance twice, since instances are pooled. Many teams also use the third-party **UniTask** library for allocation-free async on all Unity versions.

## 13.5 Threads and thread safety

```csharp
var worker = new Thread(() => HeavyCalculation());
worker.Start();
```

Most Unity APIs may only be called from the **main thread**. Plain C# math and your own data structures are fine on other threads, but shared data needs protection (`lock`, `Interlocked`, or concurrent collections). A common pattern hands results back to the main thread through a queue:

```csharp
private readonly ConcurrentQueue<Action> mainThreadQueue = new();

// Any thread:
public void RunOnMain(Action a) => mainThreadQueue.Enqueue(a);

// Main thread:
private void Update()
{
    while (mainThreadQueue.TryDequeue(out Action a)) a();
}
```

> [note] Jobs and Burst
> For large amounts of number-crunching over many items (thousands of agents, procedural meshes), Unity offers the **C# Job System** with **NativeArray** and the **Burst compiler**. They run code in parallel safely and very fast, but with restrictions on the data types you can use. Learn the basics of this chapter first, then explore Jobs when profiling proves you need it.

> [interview] Can I change a transform inside a Task?
> Generally no. Unity APIs are main-thread only. Do the computation in the background, then apply the result on the main thread (after `await`, the code is back on the main thread).

> [recap] Chapter 13
> - Coroutines run on the main thread and are ideal for frame-based timing. They stop with the GameObject, not the component.
> - `async/await` shines for I/O and composition; pass cancellation tokens.
> - `Task.Run` code must not touch Unity objects. Never block with `.Result` or `.Wait()`.
> - Use `destroyCancellationToken` (or your own token) so work stops when objects are destroyed.
> - `Awaitable` is the Unity-native option in Unity 6; UniTask is a popular alternative.

# 14. Memory, Garbage Collection and Performance

Players notice frame-time spikes and stutter more than a low but steady frame rate. Most spikes in C# code come from **garbage collection**, so this chapter is about allocating less and measuring properly.

## 14.1 How garbage collection affects games

Every reference-type object you create (`new`, strings, arrays, lists, closures, boxes) lives on the heap. When the heap fills up, the Garbage Collector pauses work to find and free objects nobody references. Unity uses the Boehm-Demers-Weiser collector, and **incremental mode** is on by default. Incremental mode spreads the work over several frames, which reduces the size of single spikes, but code that allocates constantly still costs CPU time and memory.

> [interview] Why is GC a problem for games?
> Collection takes CPU time and can land in the middle of a frame, producing a stutter. The more garbage you create per frame, the more often and the longer it runs. A game targeting 60 FPS has 16.6 ms per frame, and a visible spike is any frame that exceeds that budget.

## 14.2 Where allocations come from

| Source | Better approach |
|---|---|
| `new List<T>()`, `new T[]`, `new` class instances in `Update` | Create once, reuse, `Clear()` |
| String concatenation, interpolation, `ToString()` every frame | Update text only when the value changes; `StringBuilder`; TextMeshPro `SetText` |
| Boxing a value type into `object` | Generics; avoid `object` parameters |
| Lambdas that capture variables; method groups passed as delegates | `static` lambdas; cache the delegate in a field |
| LINQ | Plain loops in hot paths |
| `foreach` through `IEnumerable<T>` / `IList<T>` | Use `for` or the concrete collection type |
| `GetComponents<T>()`, `Physics.RaycastAll`, `OverlapSphere` | List overloads and `NonAlloc` versions |
| `gameObject.tag`, `gameObject.name` | `CompareTag`, cached values |
| `renderer.material` (creates a copy) | `sharedMaterial` or a `MaterialPropertyBlock` |
| `new WaitForSeconds` in a loop | Cache it |
| `Instantiate` and `Destroy` in bulk | Pooling |
| `string.Format`, `params` arrays | Avoid in hot paths |

```csharp
private readonly List<Enemy> nearby = new();    // reused every call

void FindNearby()
{
    nearby.Clear();                             // keeps capacity
    for (int i = 0; i < allEnemies.Count; i++)
        if (InRange(allEnemies[i])) nearby.Add(allEnemies[i]);
}

// UI: rebuild text only when the number actually changes
if (score != lastShownScore)
{
    lastShownScore = score;
    scoreText.SetText("Score: {0}", score);     // TextMeshPro, no garbage
}
```

## 14.3 Object pooling

**Pooling** creates objects once and reuses them instead of calling `Instantiate` and `Destroy` repeatedly. Typical candidates: bullets, enemies, particle effects, damage popups, floating text, temporary UI elements, and short-lived networked objects.

Unity 2021.1 and newer include a ready-made pool in `UnityEngine.Pool`:

```csharp
using UnityEngine.Pool;

public class BulletSpawner : MonoBehaviour
{
    [SerializeField] private Bullet prefab;
    private ObjectPool<Bullet> pool;

    private void Awake()
    {
        pool = new ObjectPool<Bullet>(
            createFunc: () => Instantiate(prefab),
            actionOnGet: b => b.gameObject.SetActive(true),
            actionOnRelease: b => b.gameObject.SetActive(false),
            actionOnDestroy: b => Destroy(b.gameObject),
            collectionCheck: true,
            defaultCapacity: 20,
            maxSize: 100);
    }

    public void Fire(Vector3 pos, Quaternion rot)
    {
        Bullet bullet = pool.Get();
        bullet.transform.SetPositionAndRotation(pos, rot);
        bullet.Init(pool);            // so it can release itself
    }
}

public class Bullet : MonoBehaviour
{
    private IObjectPool<Bullet> pool;

    public void Init(IObjectPool<Bullet> owner) => pool = owner;
    private void OnHit() => pool.Release(this);
}
```

Pooling rules:

- **Reset state** when an object is taken from the pool (health, velocity, timers, trail renderers, event subscriptions).
- **Return** every object when it is finished. Releasing an object twice is a bug; `collectionCheck: true` catches it in the Editor.
- Set a **maximum size** and pre-warm the pool if the first use must not hitch.

> [warn] Measure first
> Pooling adds complexity and bugs (stale state). Use it where the Profiler shows `Instantiate`, `Destroy` or GC as a real cost, not everywhere by habit.

## 14.4 The profiling workflow

The rule is **Profiler first, optimise second**. Guessing wastes time.

1. Create a **Development Build** and connect the Profiler (Autoconnect Profiler). Measure on the target device, because the Editor is not representative.
2. In **CPU Usage**, find the frame that spikes. Compare it with a healthy frame.
3. Sort the Hierarchy view by time and check the **GC Alloc** column to see which methods allocate.
4. Use **Deep Profile** only briefly. It adds heavy overhead and distorts the numbers.
5. Add **markers** around suspicious code (below), fix the cause, and measure again.
6. Use the **Memory Profiler** package to take snapshots and compare them, and the **Frame Debugger** for rendering problems.

| Target frame rate | Time budget per frame |
|---|---|
| 30 FPS | 33.3 ms |
| 60 FPS | 16.6 ms |
| 120 FPS | 8.3 ms |

```csharp Custom profiler marker
using Unity.Profiling;

private static readonly ProfilerMarker AiMarker = new("Enemy.AI");

private void Tick()
{
    using (AiMarker.Auto())
    {
        // the code you want to see as its own row in the Profiler
    }
}
```

> [interview] You have a frame spike every few seconds. What do you do?
> Profile a Development Build on the target device. Compare a spike frame with a normal frame. Look at CPU Timeline and the GC Alloc column. Find the cause (allocation, `Instantiate`, LINQ, string building, event storm, scene loading). Fix it, then measure again to confirm the improvement.

## 14.5 Everyday performance habits

- Cache `Transform`, components and results you read repeatedly. Cache `Camera.main` if used in hot code.
- Compare distances with `sqrMagnitude` to avoid a square root.
- Use physics **layers and masks** so queries only test what matters.
- Spread expensive work across frames (process a few enemies per frame) or run it on a timer instead of every frame.
- Avoid `Debug.Log` in shipping code: it is slow and allocates even in release builds. Wrap it so calls disappear from builds:

```csharp
public static class Log
{
    [System.Diagnostics.Conditional("UNITY_EDITOR")]
    [System.Diagnostics.Conditional("DEVELOPMENT_BUILD")]
    public static void Info(string message)
        => UnityEngine.Debug.Log(message);
}
```

Calls to a `[Conditional]` method, including the evaluation of their arguments, are removed by the compiler when neither symbol is defined.

## 14.6 Memory leaks

In a managed language, a "leak" means something keeps a reference that you no longer need, so the GC cannot free it. Frequent causes in Unity:

- Events that were never unsubscribed, and **static** fields or collections that keep growing.
- **Addressables** assets loaded but never released.
- Textures, materials and meshes **created in code** and never destroyed.
- `NativeArray` and other native containers that were never `Dispose`d. The GC does not manage them.
- Coroutines or tasks that keep running and hold references.

The GC does not replace `IDisposable`. Anything that owns an unmanaged resource (files, streams, native memory) must be released explicitly:

```csharp
using (var stream = File.OpenRead(path))
{
    // read from the stream
}   // Dispose() runs here, even if an exception is thrown

using var reader = new StreamReader(path);   // disposed at end of scope
```

> [interview] How do you find a memory leak?
> Take Memory Profiler snapshots before and after a full lifecycle (load a level, play, unload). Compare them, look for objects that should be gone, then follow the reference chain to what is holding them: static fields, event subscriptions, caches or unreleased handles.

> [recap] Chapter 14
> - Garbage creates frame spikes; Unity's GC is incremental but not free.
> - Know the common allocation sources and their zero-garbage alternatives.
> - Pool frequently created objects, once the Profiler says it matters.
> - Profile on the device with a Development Build; compare a spike frame with a good frame; verify every fix.
> - Unsubscribe events, release Addressables, dispose native and unmanaged resources.
