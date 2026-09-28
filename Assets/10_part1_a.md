@part Part I — C# Foundations | The language itself. Every Unity script is C#, so fluency here pays off in every later chapter.

# 1. Language Essentials

The syntax you should know so well that it never slows you down while solving a problem.

## 1.1 Built-in types

| Type | Size | Typical use in Unity |
|---|---|---|
| `int` | 4 bytes | Health, score, indices, counts |
| `float` | 4 bytes | Positions, speed, timers. The default number type of the Unity API |
| `double` | 8 bytes | Rare: very precise timers or large-scale math |
| `bool` | 1 byte | Flags such as `isGrounded` |
| `char` | 2 bytes | A single UTF-16 character |
| `string` | reference | Text: names, IDs, UI labels |
| `long` | 8 bytes | Large counters, timestamps |
| `byte` | 1 byte | Raw data, small values 0 to 255 |
| `decimal` | 16 bytes | Money-style math; almost never used in games |

```csharp Declaring values
int health = 100;
float speed = 5.5f;        // the f suffix is required for float
double precise = 5.5;      // no suffix means double
bool isGrounded = true;
string playerName = "Aria";

health -= 10;
speed *= 1.2f;
```

```csharp Numeric gotchas
int a = 5 / 2;               // 2, not 2.5 (integer division)
float b = 5 / 2f;            // 2.5
int c = (int)3.9f;           // 3 (a cast truncates)
int d = Mathf.RoundToInt(3.9f);  // 4
bool same = Mathf.Approximately(x, y); // never use == on floats
```

> [warn] Float precision
> Floats are approximations, so `==` can fail even when the math looks right. Compare with `Mathf.Approximately`, or check that the difference is smaller than a small epsilon. Integer arithmetic overflows silently by default, for example `int.MaxValue + 1` wraps to a negative number.

## 1.2 var, const and readonly

| Keyword | Meaning | Use it for |
|---|---|---|
| `var` | The compiler infers the type from the right side | Local variables when the type is obvious |
| `const` | Compile-time constant, always static | Numbers and strings that never change |
| `readonly` | Assigned once, in the declaration or constructor | Values fixed after construction |
| `static readonly` | One shared runtime constant | Constants that are not simple literals |

```csharp
var speed = 5f;                       // still strongly typed: float
const float Gravity = 9.81f;
static readonly Vector3 SpawnOffset = new Vector3(0f, 1f, 0f);

private readonly int maxHealth;
public Player(int maxHealth) { this.maxHealth = maxHealth; }
```

> [interview] var is not dynamic
> `var` is resolved at compile time and the variable keeps a fixed type. `dynamic` is a different feature that defers type checks to runtime. Use `var` when the type is clear from the right-hand side (`var list = new List<Enemy>();`) and write the type out when it is not.

> [warn] const across assemblies
> A `const` value is copied into every place that uses it at compile time. If a `const` lives in another assembly and you change it, dependants keep the old value until they are recompiled. Prefer `static readonly` for values that may change.

## 1.3 Strings

Strings are **immutable**: every change creates a new string. That is fine for occasional use and expensive inside loops or per-frame code.

```csharp
string msg = $"HP: {health}/{maxHealth}";     // interpolation
string path = @"C:\Saves\slot1.json";          // verbatim: no escapes
bool ok = string.Equals(a, b, StringComparison.Ordinal);

// Building many pieces? Use a StringBuilder.
var sb = new StringBuilder();
for (int i = 0; i < 5; i++) sb.Append(i).Append(',');
string result = sb.ToString();
```

```csharp Culture-safe number text (using System.Globalization)
string s = 3.5f.ToString(CultureInfo.InvariantCulture);
float f = float.Parse("3.5", CultureInfo.InvariantCulture);
```

> [tip] Always use InvariantCulture for data
> On a device with a different language setting, `3.5f.ToString()` may produce `3,5`, and parsing back with another culture can fail. Use `CultureInfo.InvariantCulture` for save files, network data and config, and the user's culture only for text shown to the player.

## 1.4 Control flow

```csharp
if (health <= 0) Die();
else if (health < 25) EnterCriticalState();

for (int i = 0; i < enemies.Count; i++) enemies[i].Tick();
foreach (Enemy e in enemies) e.Tick();

while (queue.Count > 0) Process(queue.Dequeue());

int damage = isCritical ? 50 : 25;             // ternary
```

```csharp Switch expression (C# 8+); GameState is an enum
string label = state switch
{
    GameState.Playing => "Playing",
    GameState.Paused  => "Paused",
    _                 => "Menu",
};
```

Use `break` to leave a loop and `continue` to skip to the next iteration. Prefer **guard clauses** (return early) over deeply nested `if` blocks; see Chapter 20.

## 1.5 Methods

```csharp
public float CalculateDamage(float baseDamage, float multiplier = 1f)
    => baseDamage * multiplier;

float a = CalculateDamage(20f);                    // 20
float b = CalculateDamage(20f, multiplier: 2f);    // named argument

public (int min, int max) GetRange() => (10, 20);  // tuple return
var (lo, hi) = GetRange();                          // deconstruction
```

- **Optional parameters** need a default value and must come last.
- **`params`** accepts a variable number of arguments but allocates an array on every call, so avoid it in hot paths.
- **Local functions** (methods declared inside methods) keep small helpers private to the method that needs them.

## 1.6 ref, out and in

| Modifier | Direction | Typical use |
|---|---|---|
| `out` | Method must assign it; caller need not initialise it | `TryGet` patterns returning a bool plus a result |
| `ref` | Caller must initialise it; method may read and change it | Modifying the caller's variable directly |
| `in` | Passed by reference but read-only | Avoiding copies of large structs |

```csharp
bool TryFindEnemy(out Enemy enemy)
{
    enemy = FindNearestEnemy();
    return enemy != null;
}

if (TryFindEnemy(out Enemy target)) target.Stun();

void AddBonus(ref int score) { score += 10; }
```

> [tip] Prefer the Try pattern
> Methods that can legitimately fail (dictionary lookups, parsing, component queries) should return `bool` and use `out` for the result, like `TryGetValue`, `int.TryParse` and `TryGetComponent`. It avoids exceptions and null checks. Use `ref` and `in` only when you have a real reason.

## 1.7 Properties

```csharp
public int Health { get; private set; }             // read outside, write inside
public bool IsDead => Health <= 0;                  // computed each call
[field: SerializeField] public int MaxHealth { get; private set; } = 100;
```

- A property looks like a field but is a method pair (`get` and `set`), so it can validate, compute or raise events.
- Keep getters cheap and free of side effects. Callers assume reading a property is as fast as reading a field.
- Unity does **not** serialize properties. `[field: SerializeField]` serializes the hidden backing field of an auto-property.

## 1.8 Access modifiers

| Modifier | Visible to |
|---|---|
| `public` | Everyone |
| `private` | The declaring type only (default for members) |
| `protected` | The declaring type and derived types |
| `internal` | The same assembly (default for top-level types) |
| `protected internal` | Same assembly or derived types |
| `private protected` | Derived types within the same assembly |

> [tip] Serialize privately
> Use `[SerializeField] private float speed;` rather than `public float speed;`. The Inspector still shows the field, but other scripts cannot change it accidentally. Expose only what other classes really need.

## 1.9 static, namespaces and using

- A `static` member belongs to the type, not to an instance. Static classes suit stateless helpers such as math utilities.
- **Static state is dangerous in Unity**: it survives scene loads, and if you disable *Reload Domain* in Enter Play Mode settings it even survives between Play sessions. Reset static fields explicitly (see the Singleton pattern in Chapter 18).
- Wrap your code in a namespace such as `namespace MyGame.Combat { ... }` to avoid name clashes. Use the block form; file-scoped namespaces need C# 10.

```csharp Resolving name ambiguity
using Random = UnityEngine.Random;   // System.Random also exists
using Debug = UnityEngine.Debug;     // System.Diagnostics.Debug too
```

> [recap] Chapter 1
> - `float` needs the `f` suffix; never compare floats with `==`.
> - `var` is static typing with less typing. `const` is compile-time, `readonly` is set once at runtime.
> - Strings are immutable; use `StringBuilder` for many appends and `InvariantCulture` for stored data.
> - Prefer `Try...` methods with `out` over exceptions for expected failures.
> - Make members as private as possible; use `[SerializeField] private` for Inspector fields.
> - Static state outlives scenes: initialise and reset it deliberately.

# 2. Value Types, Reference Types and Memory

Understanding what gets copied, and what gets shared, explains a large share of bugs and performance problems.

## 2.1 Two families of types

| Value types | Reference types |
|---|---|
| `int`, `float`, `bool`, `char` | `class` instances |
| `enum` | `string` |
| `struct` (`Vector3`, `Quaternion`, `Color`, `RaycastHit`) | Arrays, `List<T>`, `Dictionary<K,V>` |
| Tuples (`ValueTuple`) | Delegates, `GameObject`, `Transform`, `MonoBehaviour`, `ScriptableObject` |

A value-type variable **holds the data itself**, so assignment copies it. A reference-type variable **holds a reference to an object**, so assignment copies only the reference and both variables point at the same object.

```csharp
int a = 10;
int b = a;      // copy
b = 20;         // a is still 10

Player p1 = new Player();   // Player is a plain class
Player p2 = p1;             // same object, two references
p2.Health = 0;              // p1.Health is now 0 as well
```

## 2.2 Stack and heap

| Concept | Meaning |
|---|---|
| Stack | Fast, small area for method calls and local variables. Freed automatically when a method returns |
| Heap | Area for objects that live beyond one call. Cleaned up by the Garbage Collector (GC) |

Where a value lives depends on its context, not only on its type:

- A local `int` or `struct` variable normally lives on the stack.
- The same `int` as a **field of a class** lives inside that object on the heap.
- An array of structs is one block on the heap with the structs stored inline.
- A local captured by a lambda is moved into a heap-allocated closure object.

> [interview] Is every struct on the stack?
> No. A struct is a value type, but if it is a field of a class, an element of an array, or captured by a closure, it lives on the heap as part of that object.

## 2.3 Boxing and unboxing

**Boxing** wraps a value type in an object on the heap. **Unboxing** extracts it again. Each boxing operation allocates.

```csharp
int score = 100;
object boxed = score;     // boxing: heap allocation
int back = (int)boxed;    // unboxing
```

Common sources of hidden boxing:

- Passing a value type to a parameter of type `object` (for example `Debug.Log(score)` or `string.Format` arguments).
- Using non-generic collections such as `ArrayList` or `Hashtable`.
- Casting a struct to an interface it implements (`IComparable c = 5;`).
- Calling `Equals(object)` on a struct.

> [perf] Avoid boxing in frequent code
> One boxed int is harmless. Thousands per second in `Update` create garbage and eventually a GC spike. Use generic collections and generic methods, which avoid boxing.

## 2.4 Structs in practice

Structs are copied on assignment, on being passed to a method, and when read from a property or list. That leads to a classic Unity compile error:

```csharp
// transform.position.y = 5f;   // error CS1612: returns a copy

Vector3 pos = transform.position;   // copy out
pos.y = 5f;                         // modify the copy
transform.position = pos;           // write it back
```

The same applies to a `List<T>` of structs: `list[0].x = 5` does not compile. Read the element, change it, and store it back.

**Choose a struct when** the type is small (roughly 16 bytes or less), represents a single value, is short-lived, and is best kept immutable. Otherwise use a class.

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
```

> [tip] Mark immutable structs readonly
> `readonly struct` tells the compiler nothing can change after construction, which prevents accidental copy-modify bugs and lets it skip defensive copies. If you use a struct as a `Dictionary` key or in `HashSet`, implement `IEquatable<T>` and `GetHashCode` to avoid boxing and slow reflection-based comparison.

## 2.5 Passing arguments

| Kind | What the method receives | Can it affect the caller? |
|---|---|---|
| Value type | A copy | No |
| Reference type | A copy of the reference | It can change the object's contents, not which object the caller holds |
| `ref` / `out` | The caller's variable itself | Yes, including reassigning it |

```csharp
void Heal(Enemy e)      { e.Health = 100; }      // caller sees this
void Swap(Enemy e)      { e = new Enemy(); }     // caller does NOT
void SwapRef(ref Enemy e) { e = new Enemy(); }   // caller DOES
```

## 2.6 Special cases and equality

- `string` is a reference type but immutable, and `==` compares its **content**.
- Arrays are reference types even when they hold value types. Assigning an array does not copy its elements.
- For classes, `==` compares **identity** unless the type overloads it. Unity overloads `==` for `UnityEngine.Object` (see Chapter 8).
- `Instantiate` clones a Unity object. Assigning a variable never does.
- `new List<T>(source)` makes a **shallow copy**: a new list, but the same element objects.

> [recap] Chapter 2
> - Value types copy on assignment; reference types share the object.
> - Stack versus heap depends on context. A struct inside a class lives on the heap.
> - Boxing allocates. Prefer generics, and be careful with `object` parameters.
> - Structs are copies: you cannot edit `transform.position.y` directly.
> - Use small, immutable (`readonly`) structs; use classes for everything else.
> - Reference-type parameters are passed by value: reassigning the parameter does not change the caller.

# 3. Object-Oriented Programming

OOP organises code around objects that combine data and behaviour. The four ideas to master are encapsulation, inheritance, polymorphism and abstraction.

## 3.1 Classes and encapsulation

**Encapsulation** means hiding an object's internal state and exposing a small, safe interface for changing it.

```csharp
public class PlayerHealth
{
    public int Current { get; private set; }
    public int Max { get; }

    public PlayerHealth(int max)
    {
        Max = max;
        Current = max;
    }

    public void TakeDamage(int amount)
    {
        if (amount <= 0) return;
        Current = Mathf.Max(0, Current - amount);
    }
}
```

The rule: **other code cannot put the object into an invalid state** (health below zero) because the only way to change it is through a method that enforces the rules.

## 3.2 Constructors and Unity objects

Plain C# classes use constructors. **Unity objects do not.** Never write `new MyMonoBehaviour()` or give a `MonoBehaviour` or `ScriptableObject` a constructor with logic; Unity creates them itself.

```csharp Creating Unity objects correctly
var go = new GameObject("Enemy");               // GameObject: new is fine
var enemy = go.AddComponent<EnemyController>(); // components: AddComponent
enemy.Initialize(data);                         // your own setup method

var copy = Instantiate(prefab);                 // clone a prefab
var so = ScriptableObject.CreateInstance<WeaponData>();
```

> [tip] Initialise Unity objects with methods
> For a `MonoBehaviour` that needs data from outside, add an `Initialize(...)` method (or use dependency injection, Chapter 19) and call it right after `Instantiate` or `AddComponent`.

## 3.3 Inheritance

A derived class reuses and extends a base class (an **is-a** relationship).

```csharp
public abstract class Weapon
{
    public int Damage { get; protected set; }
    public abstract void Attack();          // must be overridden
    public virtual void Reload() { }        // may be overridden
}

public sealed class Sword : Weapon
{
    public Sword() { Damage = 15; }
    public override void Attack() => Debug.Log("Slash");
}

public class Gun : Weapon
{
    public override void Attack() => Debug.Log("Shoot");
    public override void Reload() => Debug.Log("Reload");
}
```

| Keyword | Meaning |
|---|---|
| `virtual` | The method has a default body that derived classes may replace |
| `abstract` | No body; derived (non-abstract) classes must implement it |
| `override` | Replaces a virtual or abstract member |
| `sealed` | Prevents further inheritance or overriding |
| `base` | Refers to the base class (`base.Method()`) |
| `new` (on a member) | Hides a base member instead of overriding it. Usually a mistake; avoid |

> [warn] Base Awake, Start and Update
> Unity finds `Awake`, `Start` and `Update` by name on the most-derived class. If a derived class declares its own `Awake` and the base class also has one, the base one is **not called** unless you make it `protected virtual` and call `base.Awake()`.

```csharp
public abstract class EnemyBase : MonoBehaviour
{
    protected virtual void Awake() { /* shared setup */ }
}

public class Goblin : EnemyBase
{
    protected override void Awake()
    {
        base.Awake();
        // goblin-specific setup
    }
}
```

## 3.3.1 Polymorphism

**Polymorphism** lets code work with a base type or interface while each concrete type supplies its own behaviour.

```csharp
Weapon weapon = new Sword();
weapon.Attack();          // "Slash"
weapon = new Gun();
weapon.Attack();          // "Shoot" (chosen at runtime)
```

> [interview] What is polymorphism?
> Using one abstraction (a base class or interface) while the actual behaviour comes from the concrete type at runtime. It removes `if (type == ...)` chains: adding a new weapon means adding a class, not editing the code that uses weapons.

A long `switch` on a type or enum that runs different code for each case is often a hint that polymorphism (or the Strategy pattern, Chapter 18) would be cleaner.

## 3.4 Interfaces and abstract classes

An **interface** is a contract of capabilities. An **abstract class** is a partial base class that can hold shared state and code.

```csharp
public interface IDamageable { void TakeDamage(int amount); }
public interface IInteractable { void Interact(Player player); }

public class Crate : MonoBehaviour, IDamageable
{
    public void TakeDamage(int amount) { /* break the crate */ }
}
```

| Interface | Abstract class |
|---|---|
| Describes a capability or contract | Describes a family of related types |
| A class can implement many | A class can inherit only one |
| No instance state | Can hold fields and shared code |
| `IDamageable`, `IInteractable`, `ISaveable` | `EnemyBase`, `WeaponBase` |

> [interview] Interface or abstract class?
> Use an interface when unrelated classes share a capability (a player, an enemy and a crate can all be `IDamageable`). Use an abstract class when types form a true family with shared state and behaviour.

> [warn] Interfaces do not appear in the Inspector
> Unity cannot serialize a field of an interface type. Workarounds: serialize a `MonoBehaviour` or abstract base class and cast; fetch the interface with `GetComponent<IDamageable>()` or `TryGetComponent`; or use `[SerializeReference]` for plain C# classes (Chapter 11).

```csharp
if (other.TryGetComponent<IDamageable>(out var target))
    target.TakeDamage(10);
```

## 3.5 Composition over inheritance

Inheritance creates rigid trees: `Enemy`, `FlyingEnemy`, `FlyingShootingEnemy`, `FlyingShootingBossEnemy`... Every new combination needs a new class. **Composition** builds an object from small parts (a **has-a** relationship) that you can mix freely.

```csharp
public class Enemy : MonoBehaviour
{
    [SerializeField] private Health health;
    [SerializeField] private Movement movement;
    [SerializeField] private Weapon weapon;
}
```

Unity itself is built on composition: a `GameObject` is a container and each `Component` adds one capability. If you need a new subclass for each new combination of behaviours, inheritance is being overused.

> [tip] A working rule
> Inherit only for a true **is-a** relationship with shared behaviour, and keep hierarchies shallow (two or three levels). Everything else: compose small components, and connect them with interfaces and events.

## 3.6 Object basics and helpers

- Every class inherits from `object`, giving you `ToString()`, `Equals()` and `GetHashCode()`. Override `ToString()` for readable debug output. If you override `Equals`, override `GetHashCode` too; equal objects must produce equal hash codes.
- **Extension methods** add methods to existing types without changing them:

```csharp
public static class TransformExtensions
{
    public static void ResetLocal(this Transform t)
    {
        t.localPosition = Vector3.zero;
        t.localRotation = Quaternion.identity;
        t.localScale = Vector3.one;
    }
}

transform.ResetLocal();
```

- **`partial` classes** split one class over several files, often used with generated code.

> [recap] Chapter 3
> - Encapsulate: private state, public methods that enforce the rules.
> - Never construct `MonoBehaviour` or `ScriptableObject` with `new`; use `AddComponent`, `Instantiate` or `CreateInstance`.
> - Use `virtual`/`override`/`abstract` for polymorphism; avoid hiding with `new`.
> - Make base-class `Awake` `protected virtual` and call `base.Awake()`.
> - Interface for a shared capability, abstract class for a shared family.
> - Interface-typed fields are not serialized by Unity.
> - Prefer composition and small components over deep inheritance.
