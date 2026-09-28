# 4. Collections and Data Structures

Choosing the right collection is a design decision, not just syntax. It affects speed, memory and how clearly the code reads.

## 4.1 The main collections

| Collection | Order | Key operations (typical cost) | Use it for |
|---|---|---|---|
| `T[]` array | By index | Index O(1); search O(n); fixed size | Fixed-size data, fastest access |
| `List<T>` | By index | Index O(1); Add O(1) amortised; Insert/Remove O(n); Contains O(n) | The default dynamic list |
| `Dictionary<K,V>` | Not guaranteed | Lookup, add, remove O(1) on average | Fast lookup by key (id to object) |
| `HashSet<T>` | Not guaranteed | Add, remove, Contains O(1) on average | Uniqueness and membership tests |
| `Queue<T>` | FIFO | Enqueue, Dequeue O(1) | Spawn queues, turn order, breadth-first search |
| `Stack<T>` | LIFO | Push, Pop O(1) | Undo history, screen stacks, depth-first search |
| `LinkedList<T>` | Sequence | Insert/remove at a known node O(1); search O(n) | Rare; frequent removal from the middle |
| `SortedDictionary`, `SortedSet` | Sorted | O(log n) | Data that must stay sorted |

```csharp
var enemies = new List<Enemy>();
enemies.Add(goblin);
enemies.Remove(goblin);

var players = new Dictionary<int, Player>();
players[42] = player;
if (players.TryGetValue(42, out Player found)) found.RefreshUI();

var collected = new HashSet<int>();
if (collected.Add(itemId)) Debug.Log("First time!");   // false if present

var spawnQueue = new Queue<Enemy>();
spawnQueue.Enqueue(goblin);
Enemy next = spawnQueue.Dequeue();

var history = new Stack<GameState>();
history.Push(current);
GameState previous = history.Pop();
```

> [interview] Which collection would you pick?
> PlayerId to Player: `Dictionary<int, Player>`, because lookup by id is the main operation. IDs of collected items: `HashSet<int>`, because uniqueness and `Contains` matter. Enemies waiting to spawn: `Queue<Enemy>`. Undo history: `Stack<T>`. Enemies currently in the scene: `List<Enemy>`.

## 4.2 Removing items safely

Changing a `List` or `Dictionary` while a `foreach` is running throws `InvalidOperationException`. Use one of these instead:

```csharp
// 1. Loop backwards and remove by index
for (int i = enemies.Count - 1; i >= 0; i--)
    if (enemies[i].IsDead) enemies.RemoveAt(i);

// 2. Or remove everything that matches
enemies.RemoveAll(e => e.IsDead);
```

If order does not matter, "swap and pop" removes in O(1) instead of shifting every later element:

```csharp
static void RemoveUnordered<T>(List<T> list, int index)
{
    int last = list.Count - 1;
    list[index] = list[last];
    list.RemoveAt(last);       // removing the last item is cheap
}
```

## 4.3 Capacity, reuse and dictionaries

- A `List<T>` grows by doubling and copying. If you know the size, reserve it: `new List<T>(64)`.
- `Clear()` empties a collection but **keeps its capacity**, so reusing one list field avoids repeated allocations.
- Use `TryGetValue` instead of `ContainsKey` followed by the indexer, which looks the key up twice.
- Dictionary keys need a stable hash. Do not use a mutable object whose hash can change. Custom struct keys should implement `IEquatable<T>`.
- Never rely on dictionary iteration order.

## 4.4 Exposing collections safely

If you return your internal `List` to callers, they can modify it. Expose a read-only view:

```csharp
private readonly List<Enemy> enemies = new();
public IReadOnlyList<Enemy> Enemies => enemies;   // no allocation
```

## 4.5 Iteration and garbage

- `foreach` over an array, `List<T>` or `Dictionary` does **not** allocate in modern Unity versions.
- `foreach` over the same collection through an `IEnumerable<T>` or `IList<T>` variable **boxes the enumerator**, which allocates. Keep the concrete type in hot code.
- Methods that return new arrays or lists (`Physics.OverlapSphere`, `GetComponents<T>()`) allocate on every call. Use the reusable versions:

```csharp Allocation-free physics query
private readonly Collider[] hits = new Collider[16];

void Scan(Vector3 center, float radius, LayerMask mask)
{
    int count = Physics.OverlapSphereNonAlloc(center, radius, hits, mask);
    for (int i = 0; i < count; i++) Process(hits[i]);
}
```

```csharp Pooled temporary lists (using UnityEngine.Pool)
using (ListPool<Enemy>.Get(out List<Enemy> temp))
{
    CollectEnemiesInRange(temp);
    foreach (Enemy e in temp) e.Alert();
}   // the list returns to the pool here
```

> [recap] Chapter 4
> - `List` by default, `Dictionary` for keyed lookup, `HashSet` for uniqueness, `Queue` and `Stack` for order.
> - Do not modify a collection during `foreach`; iterate backwards or use `RemoveAll`.
> - Use `TryGetValue`, pre-size collections, and reuse them with `Clear()`.
> - Expose `IReadOnlyList<T>`, not the internal list.
> - In hot code: keep concrete collection types, and use `NonAlloc` APIs or pooled lists.

# 5. Generics and Type Safety

Generics let you write a class or method once and use it with many types, while the compiler still checks every use.

## 5.1 Why generics

- **Type safety:** `List<Enemy>` cannot accidentally contain a `Bullet`. Errors appear at compile time.
- **No casts:** you get an `Enemy` back, not an `object`.
- **No boxing:** `List<int>` stores ints directly, unlike the old `ArrayList`.
- **Reuse:** one implementation of a pool, event bus or state machine serves every type.

```csharp
public class SimplePool<T> where T : class, new()
{
    private readonly Stack<T> items = new();

    public T Get() => items.Count > 0 ? items.Pop() : new T();
    public void Release(T item) => items.Push(item);
}

var bullets = new SimplePool<Bullet>();   // Bullet is a plain class
```

## 5.2 Generic methods and type inference

```csharp
public static T GetRandom<T>(IReadOnlyList<T> items)
{
    return items[UnityEngine.Random.Range(0, items.Count)];
}

Enemy e = GetRandom(enemies);   // T is inferred as Enemy
```

## 5.3 Constraints

Constraints tell the compiler what a type parameter must support, so you can use those features safely.

| Constraint | Meaning |
|---|---|
| `where T : class` | Reference type |
| `where T : struct` | Non-nullable value type |
| `where T : unmanaged` | Struct with no reference fields (used by Jobs and Burst) |
| `where T : new()` | Has a public parameterless constructor |
| `where T : BaseClass` | Is or derives from `BaseClass` |
| `where T : IInterface` | Implements the interface |
| `where T : Component` | A Unity component type |

```csharp
public static T Spawn<T>(T prefab, Vector3 position)
    where T : Component
{
    return UnityEngine.Object.Instantiate(
        prefab, position, Quaternion.identity);
}

Bullet b = Spawn(bulletPrefab, muzzle.position);   // typed result
```

## 5.4 Generics in Unity

- A `MonoBehaviour` cannot be added while its type is still open (`Bar<T>`). Derive a **closed** concrete class (`class HealthBar : Bar<Health>`) and put it in a file with that name.
- Modern Unity serializes fields whose type is a `[Serializable]` generic class, such as `Wrapper<int>`.
- A generic singleton base (`Singleton<T> : MonoBehaviour`) is common but inherits every Singleton drawback (Chapter 18).
- Static fields in a generic class exist **once per closed type**: `Cache<int>` and `Cache<string>` have separate statics.

> [interview] Why is a generic better than object?
> It keeps type safety (errors at compile time), removes casts, and avoids boxing of value types. It also documents the intent: `Pool<Bullet>` tells you exactly what it holds.

> [recap] Chapter 5
> - Generics give reuse plus type safety without boxing.
> - Use constraints (`where T : ...`) to unlock members of `T`.
> - `default(T)` gives the zero or null value; `typeof(T)` gives the type.
> - Only closed types can be attached as Unity components.

# 6. Delegates, Events and Lambdas

These are the building blocks of callbacks and event-driven code, which decouple systems in almost every Unity project.

## 6.1 Delegates

A **delegate** is a type-safe reference to a method. A delegate can hold several methods (multicast) and calls them in order.

```csharp
public delegate void DamageHandler(int amount);

void ShowDamage(int amount) => Debug.Log(amount);

DamageHandler handler = ShowDamage;
handler += FlashScreen;     // multicast: both methods now run
handler(20);
```

## 6.2 Action, Func and Predicate

You rarely declare your own delegate types. The framework provides generic ones:

| Type | Shape | Example |
|---|---|---|
| `Action` | No parameters, no return | `Action onDied;` |
| `Action<T>` | Parameters, no return | `Action<int> onHealthChanged;` |
| `Func<T, R>` | Parameters, returns `R` | `Func<int, int, int> add;` |
| `Predicate<T>` | One parameter, returns `bool` | `Predicate<Enemy> isDead;` |
| `Comparison<T>` | Compares two values | `list.Sort((a, b) => a.Id - b.Id);` |

```csharp
Func<int, int, int> add = (a, b) => a + b;
Predicate<Enemy> isDead = e => e.Health <= 0;
List<Enemy> dead = enemies.FindAll(isDead);
```

## 6.3 Events

The `event` keyword wraps a delegate so outside code can only **subscribe (`+=`) and unsubscribe (`-=`)**. Only the owning class can raise it. This is the Observer pattern built into the language.

```csharp
public class PlayerHealth : MonoBehaviour
{
    public event Action<int> HealthChanged;
    public event Action Died;

    private int current = 100;

    public void TakeDamage(int amount)
    {
        current = Mathf.Max(0, current - amount);
        HealthChanged?.Invoke(current);
        if (current == 0) Died?.Invoke();
    }
}
```

```csharp Subscribing in a listener (for example a UI script)
[SerializeField] private PlayerHealth health;

private void OnEnable()
{
    health.HealthChanged += UpdateBar;
    health.Died += ShowDeathScreen;
}

private void OnDisable()
{
    health.HealthChanged -= UpdateBar;
    health.Died -= ShowDeathScreen;
}
```

> [tip] Publishers should not know their listeners
> `PlayerHealth` never mentions the UI, audio or particle systems. It only announces "health changed" and "died". Each interested system subscribes itself. Adding a new reaction (screen shake, achievements) needs no change to `PlayerHealth`.

The `?.Invoke()` form is safe when nobody is subscribed. Pair every `+=` with a `-=`: subscribe in `OnEnable`, unsubscribe in `OnDisable`.

## 6.4 Event pitfalls

- **Forgotten unsubscribe:** the publisher keeps the subscriber reachable, so it is never collected, and it can be called after it was destroyed (`MissingReferenceException`).
- **Static events** live for the whole application and survive scene loads, so unsubscribe carefully and reset them if Domain Reload is off.
- **An exception in one handler** stops the remaining handlers of that invocation.
- **Do not rely on call order.** Handlers run in subscription order, but that is an accident, not a contract.
- Changing subscribers while an event is being raised is safe: the change applies to the next raise.

## 6.5 C# events versus UnityEvent

| C# `event` / `Action` | `UnityEvent` |
|---|---|
| Wired in code | Wired in the Inspector |
| Type-safe, fast, no serialization cost | Slower, allocates when invoked with arguments in some cases |
| Best for code-to-code communication | Best for designer-friendly hookups (buttons, triggers) |
| Easy to search and refactor | References can break silently when methods are renamed |

## 6.6 Lambdas and closures

A **lambda** is an inline anonymous function. A **closure** happens when a lambda uses a variable from the surrounding method.

```csharp
Func<int, bool> isPositive = x => x > 0;
enemies.RemoveAll(e => e.IsDead);

int bonus = 5;
Func<int, int> addBonus = x => x + bonus;   // captures 'bonus'
```

- A lambda that **captures** variables makes the compiler create a hidden object (a closure), which allocates. Doing that every frame produces garbage.
- A `static` lambda (C# 9) cannot capture anything, which guarantees no closure: `Func<int,int> twice = static x => x * 2;`
- Passing a method name where a delegate is expected (`list.Sort(Compare)`) may allocate a new delegate each call. In hot code, store the delegate in a field.
- An anonymous lambda cannot be unsubscribed later, because you have no reference to remove. Use a named method for event handlers.

```csharp
health.Died += () => Debug.Log("dead");   // cannot be removed later
health.Died += OnDied;                    // can be removed with -=
```

> [recap] Chapter 6
> - `Action`, `Func` and `Predicate` cover almost every delegate need.
> - `event` restricts outsiders to `+=` and `-=`; use `?.Invoke()` to raise.
> - Subscribe in `OnEnable`, unsubscribe in `OnDisable`. Always.
> - Lambdas that capture variables allocate; prefer named methods for event handlers.
> - C# events for code; `UnityEvent` when designers need to wire things in the Inspector.

# 7. LINQ

LINQ (Language Integrated Query) lets you filter, transform and aggregate collections in a readable, declarative style. Add `using System.Linq;`.

## 7.1 Common operators

| Operator | Purpose |
|---|---|
| `Where` | Filter |
| `Select` | Transform each element |
| `OrderBy`, `ThenBy`, `OrderByDescending` | Sort |
| `First`, `FirstOrDefault` | First element (or first match). `First` throws if none |
| `Single`, `SingleOrDefault` | Exactly one match; throws if there are several |
| `Any`, `All` | At least one / every element matches |
| `Count`, `Sum`, `Min`, `Max`, `Average` | Aggregate |
| `Distinct`, `Take`, `Skip` | Remove duplicates, take or skip a number of items |
| `GroupBy` | Group by a key |
| `ToList`, `ToArray`, `ToDictionary` | Materialise the result into a collection |

```csharp
var alive = enemies
    .Where(e => e.Health > 0)
    .OrderBy(e => e.DistanceToPlayer)
    .ToList();

bool anyBoss = enemies.Any(e => e.IsBoss);
int totalGold = items.Sum(i => i.Gold);
Enemy boss = enemies.FirstOrDefault(e => e.IsBoss);   // null if none
var byType = enemies.GroupBy(e => e.Type);
```

## 7.2 Deferred execution

Most LINQ queries do **not** run when you write them; they run each time you enumerate them.

```csharp
var query = enemies.Where(e => e.IsAlive);  // nothing has run yet
enemies.Add(newEnemy);                       // change the source
foreach (Enemy e in query) { }               // runs now, sees newEnemy
```

Enumerating the same query twice runs it twice. Call `ToList()` or `ToArray()` when you want a fixed snapshot.

## 7.3 LINQ and performance

LINQ creates enumerators, closures and result collections. In code that runs every frame this adds up to garbage and CPU time.

- **Fine:** loading data, building menus, editor tools, tests, one-off setup code.
- **Avoid:** `Update`, physics callbacks, AI loops running for many agents, anything called many times per frame.
- In hot paths write a plain loop. It is often just as clear:

```csharp
Enemy FindNearest(List<Enemy> enemies, Vector3 from)
{
    Enemy best = null;
    float bestSqr = float.MaxValue;

    for (int i = 0; i < enemies.Count; i++)
    {
        float sqr = (enemies[i].Position - from).sqrMagnitude;
        if (sqr < bestSqr) { bestSqr = sqr; best = enemies[i]; }
    }
    return best;
}
```

> [interview] Why can LINQ be a problem in Update?
> It allocates enumerators, closures and result lists, and the cost depends on the query. One call may be cheap, but repeated every frame it creates GC pressure and frame spikes. I profile before deciding, and use plain loops in hot paths.

> [warn] IL2CPP and generic value types
> On ahead-of-time platforms (iOS, consoles, WebGL), some LINQ or generic patterns over value types can fail at runtime because the needed code was never generated. Always test LINQ-heavy code on a real device build, not only in the Editor.

> [recap] Chapter 7
> - LINQ is great for readability: `Where`, `Select`, `OrderBy`, `Any`, `FirstOrDefault`, `ToList`.
> - Queries are lazy; materialise with `ToList()` if you need a snapshot.
> - Keep LINQ out of per-frame code; use loops there.
> - Prefer `FirstOrDefault` (check for null) over `First` when a match might not exist.
