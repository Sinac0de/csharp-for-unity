@part Part IV — Practice | Reusable systems to build, interview questions to rehearse, a capstone project, and quick-reference sheets for daily use.

# 22. Practical Systems

Small, reliable building blocks that appear in almost every game. Type them out, understand each decision, then adapt them.

## 22.1 Damage contract and Health

```csharp
public readonly struct DamageInfo
{
    public readonly int Amount;
    public readonly Vector3 HitPoint;

    public DamageInfo(int amount, Vector3 hitPoint)
    {
        Amount = amount;
        HitPoint = hitPoint;
    }
}

public interface IDamageable
{
    void TakeDamage(in DamageInfo info);
}
```

```csharp
public class Health : MonoBehaviour, IDamageable
{
    [SerializeField, Min(1)] private int max = 100;

    public int Max => max;
    public int Current { get; private set; }
    public bool IsDead => Current <= 0;

    public event Action<int> Changed;    // passes the new value
    public event Action Died;

    private void Awake() => Current = max;

    public void TakeDamage(in DamageInfo info)
    {
        if (info.Amount <= 0 || IsDead) return;

        Current = Mathf.Max(0, Current - info.Amount);
        Changed?.Invoke(Current);
        if (IsDead) Died?.Invoke();
    }

    public void Heal(int amount)
    {
        if (amount <= 0 || IsDead) return;

        Current = Mathf.Min(max, Current + amount);
        Changed?.Invoke(Current);
    }
}
```

Why it is built this way: health knows nothing about UI, sound or effects (they subscribe to events); invalid input is ignored; a dead object cannot be healed; and `DamageInfo` can grow (damage type, source) without changing the method signature.

## 22.2 Cooldown

A plain C# class with no Unity dependency, so it is trivial to test (Chapter 20).

```csharp
public class Cooldown
{
    private readonly float duration;
    private float remaining;

    public Cooldown(float duration) => this.duration = duration;

    public bool Ready => remaining <= 0f;
    public float Normalized =>
        duration <= 0f ? 1f : 1f - remaining / duration;

    public void Tick(float deltaTime)
        => remaining = Mathf.Max(0f, remaining - deltaTime);

    public bool TryUse()
    {
        if (!Ready) return false;
        remaining = duration;
        return true;
    }
}
```

```csharp
private readonly Cooldown fireCooldown = new Cooldown(0.25f);

private void Update()
{
    fireCooldown.Tick(Time.deltaTime);
    if (Input.GetButton("Fire1") && fireCooldown.TryUse()) Fire();
}
```

## 22.3 A reusable state machine

```csharp
public interface IState
{
    void Enter();
    void Tick();
    void Exit();
}

public class StateMachine
{
    public IState Current { get; private set; }

    public void ChangeState(IState next)
    {
        if (next == Current) return;
        Current?.Exit();
        Current = next;
        Current?.Enter();
    }

    public void Tick() => Current?.Tick();
}
```

```csharp A state that receives what it needs through its constructor
public class ChaseState : IState
{
    private readonly Transform self;
    private readonly Transform target;
    private readonly float speed;

    public ChaseState(Transform self, Transform target, float speed)
    {
        this.self = self;
        this.target = target;
        this.speed = speed;
    }

    public void Enter() { }
    public void Exit() { }

    public void Tick()
    {
        self.position = Vector3.MoveTowards(
            self.position, target.position, speed * Time.deltaTime);
    }
}
```

Create each state once (in `Awake`), keep them in fields, and call `machine.Tick()` from `Update`.

## 22.4 Score with events

```csharp
public class ScoreSystem
{
    public int Score { get; private set; }
    public event Action<int> ScoreChanged;

    public void Add(int amount)
    {
        if (amount <= 0) return;
        Score += amount;
        ScoreChanged?.Invoke(Score);
    }

    public void Reset()
    {
        Score = 0;
        ScoreChanged?.Invoke(Score);
    }
}
```

The HUD and the analytics service each subscribe to `ScoreChanged`. The score system knows neither.

## 22.5 A simple typed event bus

Lets unrelated systems communicate through message types, without direct references.

```csharp
public static class EventBus<T> where T : struct
{
    private static event Action<T> Raised;

    public static void Subscribe(Action<T> handler) => Raised += handler;
    public static void Unsubscribe(Action<T> handler) => Raised -= handler;
    public static void Publish(T message) => Raised?.Invoke(message);

    [RuntimeInitializeOnLoadMethod(
        RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void Reset() => Raised = null;
}

public readonly struct EnemyKilled
{
    public readonly int Points;
    public EnemyKilled(int points) => Points = points;
}

// Publish:    EventBus<EnemyKilled>.Publish(new EnemyKilled(50));
// Subscribe:  EventBus<EnemyKilled>.Subscribe(OnEnemyKilled);
```

> [warn] Event buses hide flow
> They decouple systems, but it becomes harder to see who reacts to what. Use them for broad game events; use direct C# events between closely related objects. Static events are why `Reset` matters, and why every `Subscribe` needs a matching `Unsubscribe`.

## 22.6 Inventory

```csharp
public class Inventory
{
    private readonly Dictionary<int, int> counts = new();   // itemId to count

    public event Action<int, int> Changed;   // itemId, new count

    public int GetCount(int itemId)
        => counts.TryGetValue(itemId, out int c) ? c : 0;

    public void Add(int itemId, int amount = 1)
    {
        if (amount <= 0) return;
        int total = GetCount(itemId) + amount;
        counts[itemId] = total;
        Changed?.Invoke(itemId, total);
    }

    public bool TryRemove(int itemId, int amount = 1)
    {
        int have = GetCount(itemId);
        if (amount <= 0 || have < amount) return false;

        int left = have - amount;
        if (left == 0) counts.Remove(itemId);
        else counts[itemId] = left;
        Changed?.Invoke(itemId, left);
        return true;
    }
}
```

Items are identified by ID so the inventory saves and loads simply (Chapter 15); item details (name, icon, stack limit) live in ScriptableObjects (Chapter 12).

> [recap] Chapter 22
> - Health, cooldown, score and inventory are plain, testable classes with events for outputs.
> - Validate input, ignore impossible actions, and raise events only when something changes.
> - Create states and strategies once; wire dependencies through constructors.
> - Reset static event state, and always pair `Subscribe` with `Unsubscribe`.

# 23. Interview Questions and Answers

Practise answering these **out loud**. A strong answer follows a pattern: a short, exact definition; a concrete Unity example; the trade-off; the performance or memory impact if relevant; and when you would not use it.

## 23.1 Fundamentals

Q: What is the difference between a class and a struct?
A: A class is a reference type: variables hold a reference, and it lives on the heap. A struct is a value type and is copied on assignment. Use a class for objects with identity and behaviour; use a small, ideally immutable struct for value-like data such as `DamageInfo`. Mutable structs cause copy bugs.

Q: Is every struct on the stack?
A: No. A struct inside a class, an array or a closure lives on the heap as part of that object.

Q: What is boxing?
A: Converting a value type to `object` or an interface, which allocates a heap object. It creates garbage when done frequently, for example passing ints to `object` parameters in `Update`.

Q: What is the difference between `const` and `readonly`?
A: `const` is a compile-time constant baked into the calling code. `readonly` is assigned once at runtime, in the declaration or a constructor. Use `static readonly` for values that may change between versions.

Q: What does `var` do?
A: The compiler infers the type at compile time. It is still statically typed and is not the same as `dynamic`.

Q: What are `ref`, `out` and `in`?
A: `ref` passes a variable by reference for reading and writing. `out` requires the method to assign the value (used for `Try` patterns). `in` passes by reference as read-only, avoiding copies of large structs.

Q: What is garbage collection?
A: Automatic reclamation of managed objects that nothing references. It costs CPU time and can cause frame spikes, so games minimise allocations in frequently executed code.

## 23.2 OOP and design

Q: What is polymorphism?
A: Code uses a base type or interface while the concrete type supplies the behaviour at runtime. It removes type-checking `if` chains and lets you add new variants without editing existing code.

Q: Interface or abstract class?
A: Interface for a capability shared by unrelated types (`IDamageable`). Abstract class for a family of related types that share state and code (`EnemyBase`). A class can implement many interfaces but inherit one class.

Q: What does "composition over inheritance" mean?
A: Build objects from small components rather than deep class hierarchies. Unity's GameObject/Component model is composition. It avoids a new subclass for every combination of behaviours.

Q: What are the SOLID principles?
A: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion. Together they aim for code that is easy to extend and test. I apply them pragmatically and avoid abstraction until there is a real need.

Q: What is wrong with Singletons?
A: Hidden dependencies, poor testability, lifecycle and initialisation-order problems, and a tendency to become a God object. They are acceptable for simple, genuinely unique services, ideally behind an interface.

Q: State pattern or Strategy pattern?
A: Strategy swaps interchangeable algorithms from outside. State changes behaviour based on internal state, with transitions. The structure looks similar; the intent differs.

Q: Dependency Injection or Service Locator?
A: DI makes dependencies explicit and easy to fake in tests. A service locator is quick to set up but hides dependencies. I prefer DI, and consider a locator acceptable in small projects.

## 23.3 C# features

Q: How do events differ from delegates?
A: An `event` wraps a delegate so outside code can only subscribe and unsubscribe, not invoke it or replace its handlers. It is the language's Observer implementation.

Q: What is the danger of events?
A: Forgetting to unsubscribe keeps the subscriber reachable and can call destroyed objects. I subscribe in `OnEnable` and unsubscribe in `OnDisable`.

Q: `event` (C#) or `UnityEvent`?
A: C# events for code-to-code communication: type-safe and fast. `UnityEvent` when designers need to wire behaviour in the Inspector.

Q: When would you avoid LINQ?
A: In per-frame and other hot paths, because it allocates enumerators and closures. It is fine for setup, tools and infrequent code. I profile before deciding.

Q: What do `?.` and `??` do, and what is the catch in Unity?
A: `?.` stops if the left side is null; `??` supplies a fallback. Unity overloads `==` for `UnityEngine.Object` so destroyed objects compare equal to null, but `?.` and `??` bypass that overload. For Unity objects use `== null` or `if (obj)`.

Q: Why are generics better than `object`?
A: Type safety at compile time, no casts, no boxing of value types, and reusable code.

Q: Dictionary or List?
A: Dictionary when lookup by key is the main operation (average O(1)). List when order and iteration matter. HashSet when you only need uniqueness and membership.

Q: What is a closure, and why does it matter for performance?
A: A lambda that captures variables from its surrounding scope. The compiler creates a hidden object to hold them, which allocates. In hot paths use static lambdas or named methods.

## 23.4 Unity specifics

Q: What is the order of Awake, OnEnable and Start?
A: `Awake`, then `OnEnable`, then `Start` before the first `Update`. `Awake` and `OnEnable` of all objects run before any `Start`. The order between different scripts is undefined unless set explicitly.

Q: Update, FixedUpdate and LateUpdate?
A: `Update` runs every frame for logic and input. `FixedUpdate` runs on a fixed timestep for physics. `LateUpdate` runs after all `Update` calls, for example a camera following a player.

Q: Coroutine or async/await?
A: Coroutines for frame-based sequencing and timing tied to a GameObject. `async/await` for I/O, network requests and composing asynchronous work, with cancellation tokens.

Q: Is a coroutine a thread?
A: No. It runs on the main thread and resumes at each `yield`.

Q: Can you use Unity APIs from a Task?
A: Only on the main thread. After `await` on the main thread the continuation returns to it, but code inside `Task.Run` must not use Unity objects.

Q: Why use ScriptableObjects?
A: Shared, asset-based data that designers can edit without code, giving one source of truth and less duplication. Runtime state must not live in them, because Editor changes persist.

Q: What does Unity serialize?
A: Public and `[SerializeField]` fields of supported types. Not properties, dictionaries, statics, interfaces or polymorphic values without `[SerializeReference]`.

Q: Why is `GetComponent` in `Update` a problem?
A: It repeats a lookup every frame. Cache the result in `Awake`. It is not forbidden in general, but cache what you read repeatedly.

## 23.5 Performance and memory

Q: How do you find a performance problem?
A: Profile a development build on the target device, find the expensive frames and methods, check GC Alloc, fix the biggest cost, and measure again.

Q: What causes garbage in Unity?
A: Creating collections and objects per frame, string operations, boxing, capturing lambdas, LINQ, `foreach` through interfaces, and APIs that return new arrays.

Q: When do you use object pooling?
A: For objects created and destroyed frequently, when profiling shows `Instantiate`, `Destroy` or GC as a real cost. Reset state on reuse and release every object exactly once.

Q: How do you find a memory leak?
A: Compare Memory Profiler snapshots before and after a full lifecycle, then trace what holds the reference: static fields, event subscriptions, caches or unreleased handles.

Q: Why is `IDisposable` still needed with a GC?
A: The GC frees managed memory but not unmanaged resources such as files, streams and native containers. These need deterministic release with `using` or `Dispose`.

## 23.6 Scenario questions

Q: The game stutters every few seconds. What do you do?
A: Profile a development build. Compare a spike frame with a normal one. Look at the CPU timeline and GC Alloc for allocations, `Instantiate`, LINQ, string building or loading. Fix the cause, then verify with a new capture.

Q: Health must notify the UI, audio and effects. How do you design it?
A: `Health` raises events (`Changed`, `Died`). UI, audio and VFX subscribe to them. `Health` holds no references to those systems, so adding a reaction never modifies `Health`.

Q: You have five kinds of enemy AI and the `if/else` code is out of control.
A: A Strategy for interchangeable movement or attack algorithms, and a State Machine when behaviour depends on state with defined transitions. Data such as speeds and ranges goes in ScriptableObjects.

Q: Cosmetic skins should download only when needed.
A: Addressables with a remote group. Check the download size, call `DownloadDependenciesAsync`, load and instantiate, and release the handle when the skin is no longer used.

Q: How would you structure a save system?
A: Versioned serializable data classes, a save service behind an interface, write to a temp file with a backup, IDs instead of object references, validate and migrate on load, and a server-authoritative model for anything competitive.

> [interview] Answer formula
> 1. Short, precise definition. 2. A real Unity example. 3. The trade-off. 4. Performance or memory impact, if relevant. 5. For architecture: coupling and testability. 6. When you would **not** use it. If you do not know something, say so and explain how you would find out.

# 24. Capstone Project

Building one small game that uses most of this book turns knowledge into skill. Aim for a top-down or side-view shooter. Keep the art simple; the goal is the code.

## 24.1 Requirements

1. **Player** with `Health`, movement and a weapon.
2. **Enemies** with `Health` and swappable AI strategies (chase, flee, patrol).
3. Health events drive the **UI**; the health bar never reads health in `Update`.
4. **Weapons** designed with an interface or abstract base (`IWeapon`).
5. **Bullets** managed by an object pool.
6. **`WeaponData` and `EnemyData`** as ScriptableObjects.
7. **Game states** (Menu, Playing, Paused, GameOver) using a state machine.
8. **Score** raised through events to the UI and an analytics service.
9. A **fake analytics service** provided through dependency injection.
10. **Save and load** player data as JSON with a version number and backup.
11. A **fake server request** with `async/await` and cancellation.
12. **Profile** the game and remove the biggest allocations.

## 24.2 Suggested structure

```text
Scripts/
  Core/       GameBootstrap, GameStateMachine, ServiceLocator
  Player/     PlayerController, PlayerWeapon
  Enemies/    EnemyController, IMoveStrategy, ChaseStrategy
  Combat/     IDamageable, DamageInfo, Health, BulletPool, Bullet
  Data/       WeaponData, EnemyData, SaveData
  Services/   IAnalyticsService, FakeAnalyticsService, SaveSystem
  UI/         HealthPresenter, HealthView, ScoreView
Tests/
  EditMode/   CooldownTests, InventoryTests, SaveDataTests
```

## 24.3 Build order

1. Movement and shooting with a temporary `Instantiate`.
2. `Health`, `IDamageable`, damage and death.
3. Replace `Instantiate` with the pool.
4. Move weapon and enemy numbers to ScriptableObjects.
5. Add enemy strategies, then the game state machine.
6. UI through events; score and analytics.
7. Save and load; fake server request.
8. Write Edit Mode tests for the plain C# classes.
9. Profile, fix, and note before and after numbers.

## 24.4 Self-check

- Can you explain every class in one sentence without using "and"?
- Does deleting the UI leave gameplay compiling and running?
- Are all event subscriptions paired, and does the Memory Profiler show no growth after replaying a level?
- Does the Profiler show zero GC allocation per frame during normal play?
- Could you swap the analytics implementation by changing one line?

**Stretch goals:** Addressables for enemy prefabs, an undo-able level editor using the Command pattern, a VContainer setup, and a Jobs-based crowd of a thousand agents.

# 25. Quick Reference

Cheat sheets for fast review. If a line here is unfamiliar, jump back to the relevant chapter.

## 25.1 Concepts at a glance

| Concept | One-line summary |
|---|---|
| class | Reference type, identity and behaviour |
| struct | Value type, small value-like data (prefer `readonly`) |
| interface | Contract of capabilities; many per class |
| abstract class | Shared base with state and code; one per class |
| generic | Reusable and type-safe; no boxing |
| delegate | Reference to callable code |
| event | Delegate with restricted access: subscribe and unsubscribe only |
| LINQ | Readable queries; not for hot paths |
| exception | Unexpected failure; not normal flow |
| `async` / `await` | Non-blocking waits; pass cancellation tokens |
| coroutine | Main-thread sequencing tied to a GameObject |
| ScriptableObject | Shared data asset; no mutable runtime state |
| IDisposable | Deterministic release of unmanaged resources |

## 25.2 Do and don't

| Do | Don't |
|---|---|
| `[SerializeField] private` fields | Public fields for Inspector convenience |
| Cache references in `Awake` | `GetComponent` or `Find` in `Update` |
| Subscribe in `OnEnable`, unsubscribe in `OnDisable` | Leave events subscribed |
| `TryGetValue`, `TryGetComponent`, `CompareTag` | Double lookups, string tag comparison |
| Reuse and `Clear()` collections | `new List<T>()` every frame |
| Pass a `CancellationToken` into async work | Fire-and-forget tasks with no error handling |
| `== null` for Unity objects | `?.`, `??`, `is null` on Unity objects |
| `InvariantCulture` for stored numbers | Default culture for save files |
| Profile a device build | Optimise from guesses |
| Keep logic in plain C# classes | Put everything in one MonoBehaviour |

## 25.3 Lifecycle order

| Order | Method |
|---|---|
| 1 | `Awake` |
| 2 | `OnEnable` |
| 3 | `Start` |
| 4 | `FixedUpdate` (0 or more times per frame) |
| 5 | `Update` |
| 6 | `LateUpdate` |
| 7 | `OnDisable` |
| 8 | `OnDestroy` |

## 25.4 Collections cheat sheet

| Need | Use |
|---|---|
| Dynamic list | `List<T>` |
| Fixed size, fastest | `T[]` |
| Lookup by key | `Dictionary<K,V>` with `TryGetValue` |
| Unique items or membership | `HashSet<T>` |
| First in, first out | `Queue<T>` |
| Last in, first out | `Stack<T>` |
| Expose safely | `IReadOnlyList<T>` |

## 25.5 Pre-commit checklist

1. No compiler warnings that you do not understand.
2. No `Debug.Log` spam left in hot paths.
3. Every `+=` has a matching `-=`.
4. No `Find`, `GetComponent` or LINQ inside `Update`.
5. Serialized references are assigned (or validated in `OnValidate`).
6. Files are named after their classes; namespaces match the folders.
7. Nothing large is allocated per frame (checked in the Profiler).
8. `.meta` files are included; no `Library` or `Temp` folders.
9. New logic has at least one test if it is plain C#.
10. You can explain the change in one sentence.

## 25.6 Glossary

| Term | Meaning |
|---|---|
| Allocation | Reserving heap memory for a new object |
| AOT / IL2CPP | Ahead-of-time compilation of C# to native code |
| Assembly definition | A Unity file that defines a separate code assembly |
| Boxing | Wrapping a value type in a heap object |
| Closure | A lambda together with the variables it captured |
| Coupling | How strongly one piece of code depends on another |
| Hot path | Code that runs very often, such as per frame |
| Main thread | The thread where Unity APIs may be used |
| Prefab | A reusable GameObject template |
| Serialization | Converting data to a storable form and back |
| Stripping | Build-time removal of code that appears unused |

## 25.7 Where to go next

- **Official documentation:** the Unity Manual and Scripting API for your exact version, and Microsoft's C# language documentation.
- **Books and free guides:** *Game Programming Patterns* by Robert Nystrom (free online), *Clean Code* by Robert C. Martin, and Unity's own free e-books on code style, game programming patterns and performance optimisation.
- **Tools to learn next:** Unity Profiler and Memory Profiler, the Unity Test Framework, Addressables, and later the Job System with Burst.
- **Practice:** rebuild the capstone with a different genre, and read other people's open-source Unity projects.

> [recap] Keep this in mind
> Learn C# to build real systems, not to memorise it. Make it work, make it clear, then make it fast, and measure before you optimise.
