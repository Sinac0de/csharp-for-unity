# 8. Errors, Null and Pattern Matching

Robust code decides in advance what happens when something goes wrong. This chapter covers exceptions, null handling (including Unity's special rules) and pattern matching.

## 8.1 Exceptions

```csharp
try
{
    LoadSaveFile();
}
catch (FileNotFoundException)
{
    CreateNewSave();               // an expected case: handle it
}
catch (IOException ex)
{
    Debug.LogException(ex);        // unexpected: log it with details
}
finally
{
    Cleanup();                     // always runs
}
```

Put specific `catch` blocks before general ones. Rules that professionals follow:

- Use exceptions for **unexpected** failures: file I/O, network, parsing untrusted data, invalid arguments. Do **not** use them for normal gameplay flow such as "the player died".
- Catch the most specific exception you can handle. Never leave an empty `catch` that hides errors.
- Rethrow with `throw;`, not `throw ex;`. The first keeps the original stack trace, the second resets it.
- Throwing and catching is slow compared with a return value. Use `int.TryParse` instead of `int.Parse` inside a `try`.
- Validate inputs with **guard clauses** at the top of a method.

```csharp
public void TakeDamage(int amount)
{
    if (amount < 0)
        throw new ArgumentOutOfRangeException(nameof(amount));
    if (IsDead) return;             // normal case: just return

    Current = Mathf.Max(0, Current - amount);
}
```

| Exception | Meaning |
|---|---|
| `ArgumentNullException`, `ArgumentOutOfRangeException` | A parameter is invalid |
| `InvalidOperationException` | The object is in the wrong state (also thrown when a collection changes during `foreach`) |
| `NullReferenceException` | A null reference was used |
| `IndexOutOfRangeException`, `KeyNotFoundException` | Bad index or missing dictionary key |
| `NotImplementedException` | Placeholder for unfinished code |

> [note] What Unity does with exceptions
> An unhandled exception inside `Update` or another Unity callback is logged to the Console and the rest of **that call** is skipped, but the game keeps running. An exception inside a **coroutine** stops that coroutine. In an `async void` method, or a `Task` nobody awaits, an exception can go unnoticed. Always catch and log inside those.

> [interview] throw versus return
> `return` is the normal control path. `throw` reports an exceptional situation to the caller, which may be several levels up the call stack. If failure is expected and frequent, return a `bool` or a result value instead.

## 8.2 Null handling operators

| Operator | Meaning | Example |
|---|---|---|
| `?.` | Null-conditional: stop if the left side is null | `enemy?.Attack();` |
| `??` | Null-coalescing: use the right side if the left is null | `name ?? "Unknown"` |
| `??=` | Assign only if the variable is currently null | `list ??= new List<int>();` |
| `is null`, `is not null` | Null tests (C# 9) | `if (x is not null)` |

```csharp
string display = playerName ?? "Unknown";
cache ??= new Dictionary<int, Enemy>();
int? length = text?.Length;       // null if text is null
```

## 8.3 Unity's "fake null"

`UnityEngine.Object` (which includes `GameObject`, `Component`, `MonoBehaviour`, `ScriptableObject`, `Texture` and more) overloads `==` and `!=`. When you destroy an object, the C# wrapper still exists but Unity's `== null` check reports **true**.

The `?.`, `??`, `??=` and `is null` operators bypass that overload, because they check the raw C# reference.

| For Unity objects | Use | Avoid |
|---|---|---|
| Is it missing or destroyed? | `if (obj == null)` or `if (!obj)` | `obj is null` |
| Does it exist? | `if (obj != null)` or `if (obj)` | `obj?.Method()` |
| Default value | `obj != null ? obj : fallback` | `obj ?? fallback` |

```csharp
Destroy(enemy.gameObject);
// ...at the end of the frame the object is really gone:
if (enemy != null) enemy.Attack();     // safe: Unity's check
enemy?.Attack();                       // WRONG: C# thinks it is alive
```

> [warn] Destroy is deferred
> `Destroy(obj)` marks the object and removes it at the end of the current frame, so `obj == null` stays false until then. If other code may still touch it during the frame, disable it (`SetActive(false)`) or check your own `IsDead` flag.

Reduce null bugs at the source:

```csharp
private void Awake()
{
    if (health == null)
        Debug.LogError($"{name}: Health is not assigned", this);
}
```

The second argument (`this`) makes the Console highlight the offending object when you click the message. `[RequireComponent(typeof(Rigidbody))]` and `TryGetComponent` remove whole classes of null checks.

## 8.4 Nullable value types

Value types cannot be null, but `T?` adds an "empty" state.

```csharp
int? bestScore = null;
if (bestScore.HasValue) Debug.Log(bestScore.Value);

int shown = bestScore ?? 0;                // 0 when empty
int also = bestScore.GetValueOrDefault();  // also 0
```

Use `int?` for an optional value that is genuinely "not set". Note that Unity cannot serialize nullable fields in the Inspector.

## 8.5 Pattern matching

Pattern matching tests the shape of a value and extracts parts of it in one step. Everything below works in C# 9 (Unity 2021.2 and newer).

```csharp
// Type pattern: test and cast at once
if (target is IDamageable damageable)
    damageable.TakeDamage(10);

// Switch expression with relational patterns
string tier = score switch
{
    < 100 => "Bronze",
    < 500 => "Silver",
    _     => "Gold",
};

// Property pattern
if (enemy is { IsBoss: true, Health: > 0 }) Announce(enemy);

// Combining patterns
bool valid = level is >= 1 and <= 50;
bool notNone = state is not GameState.MainMenu;
```

`as` casts to a type and returns null if it does not match: `var d = other as IDamageable;`. Prefer `is` with a pattern, which avoids a separate null check.

> [warn] Patterns and Unity objects
> Type patterns such as `is IDamageable d` are fine on components. But **null** patterns (`is null`, `is not null`, `{ }`) bypass Unity's destroyed-object check, so do not use them on `UnityEngine.Object` types.

> [recap] Chapter 8
> - Exceptions are for unexpected failures; use `Try...` methods and guard clauses for expected ones.
> - Catch specific exceptions, log them with `Debug.LogException`, and never swallow errors silently.
> - For Unity objects, use `== null`, `!= null` or `if (obj)`. Do not use `?.`, `??` or `is null`.
> - `Destroy` takes effect at the end of the frame.
> - Pattern matching (`is`, `switch` expressions, property and relational patterns) removes verbose casts and `if` chains.

# 9. Enums, Records, Tuples and Modern C#

Choosing the right data type makes intent obvious and prevents bugs. This chapter also lists which language features your Unity version supports.

## 9.1 Enums

An enum is a named set of constants. It replaces "magic numbers" and strings.

```csharp
public enum GameState { MainMenu, Playing, Paused, GameOver }

[Flags]
public enum Abilities
{
    None  = 0,
    Jump  = 1 << 0,
    Dash  = 1 << 1,
    Shoot = 1 << 2,
}

Abilities a = Abilities.Jump | Abilities.Dash;
bool canDash = (a & Abilities.Dash) != 0;   // test a flag
a |= Abilities.Shoot;                        // add a flag
a &= ~Abilities.Jump;                        // remove a flag
```

- Enums are stored as integers. If an enum is **serialized** (Inspector, save files), never reorder it or insert values in the middle. Add new values at the end or give every value an explicit number.
- Use `Enum.TryParse<T>(text, out var value)` to parse safely.
- In a `switch` over an enum, add a `default` branch that logs or throws, so a newly added value cannot be silently ignored.
- Give `[Flags]` values powers of two, and always include `None = 0`.

## 9.2 Structs

Small, immutable value-like data such as `DamageInfo` is a good struct. See Chapter 2 for when to choose a struct and how copying works. In short: keep them small, prefer `readonly struct`, and implement `IEquatable<T>` when used as dictionary keys.

## 9.3 Records

A **record** is a class designed for immutable data. It gives you value-based equality, a readable `ToString()` and non-destructive copying with `with`.

```csharp
public record PlayerSnapshot(int Id, int Score, int Level);

var a = new PlayerSnapshot(1, 100, 3);
var b = a with { Score = 150 };                  // copy, one value changed
bool same = a == new PlayerSnapshot(1, 100, 3);  // true: value equality
```

> [note] Records in Unity
> Records use init-only setters, which need the type `System.Runtime.CompilerServices.IsExternalInit`. Unity's runtime does not include it, so you must declare it once in your project. Unity's serialization system also does **not** support records, so do not use them for Inspector or `JsonUtility` data. Use them for in-memory immutable models such as snapshots and messages.

```csharp Declare once if you use records or init setters
namespace System.Runtime.CompilerServices
{
    internal static class IsExternalInit { }
}
```

## 9.4 Tuples

Tuples group values without declaring a type. They are value types, so they do not allocate.

```csharp
(int hp, int mp) stats = (100, 50);
Debug.Log(stats.hp);

(int min, int max) GetRange() => (10, 20);
var (lo, hi) = GetRange();          // deconstruction
var (_, high) = GetRange();         // discard the value you do not need
```

Use tuples for small private helpers. For public APIs, a named `struct` or `class` is clearer and easier to change.

## 9.5 Immutability

Objects that cannot change after creation are easier to reason about and cannot be corrupted by other code. Tools you have:

- `readonly` fields and get-only properties.
- `readonly struct` and records.
- `IReadOnlyList<T>` and `IReadOnlyDictionary<K,V>` to expose data without letting callers modify it.

Make data immutable by default and add mutability only where a system truly needs it. This is especially valuable for configuration data (weapon stats, level definitions) shared by many objects.

## 9.6 C# version support in Unity

Unity 2021.2 and newer, including current Unity 6 releases, use the Roslyn compiler with **C# 9.0**.

| Supported and useful | Not supported |
|---|---|
| String interpolation, `?.`, `??`, `out var`, tuples, local functions, expression-bodied members (C# 6 and 7) | File-scoped namespaces, global `using`, record structs (C# 10) |
| Switch expressions, property patterns, `using var`, static local functions (C# 8) | Anything newer than C# 9 |
| Target-typed `new()`, records (with the shim), relational and logical patterns, `static` lambdas (C# 9) | Covariant return types, module initializers (C# 9) |

> [tip] Check your version
> Unity's Manual page titled "C# compiler and language version reference" lists the exact language version and any unsupported features for your editor version. Check it whenever you upgrade Unity, because support can change.

> [recap] Chapter 9
> - Enums replace magic numbers. Keep serialized enum values stable, and use `[Flags]` with powers of two.
> - Records give immutable data with value equality but need a one-line shim and are not serializable by Unity.
> - Tuples are lightweight for private helpers; use named types in public APIs.
> - Prefer immutable data and read-only views.
> - Unity uses C# 9.0: know what is and is not available.
