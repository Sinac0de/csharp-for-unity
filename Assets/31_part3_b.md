# 19. Dependency Injection and Service Locator

Most classes need other objects to do their work. **How** they obtain those objects decides how flexible and testable your code is.

## 19.1 The problem: hard-wired dependencies

```csharp
public class LevelManager
{
    // Tied to one concrete class: cannot be replaced or tested
    private readonly FirebaseAnalyticsService analytics = new();

    public void CompleteLevel() => analytics.LogEvent("level_complete");
}
```

Reaching for `Singleton.Instance` or `FindObjectOfType` has the same problem: the dependency is hidden inside the method body.

## 19.2 Dependency Injection

With **dependency injection (DI)**, a class declares what it needs, usually in its constructor, and someone else supplies it.

```csharp
public interface IAnalyticsService { void LogEvent(string name); }

public class FakeAnalyticsService : IAnalyticsService
{
    public readonly List<string> Events = new();
    public void LogEvent(string name) => Events.Add(name);
}

public class LevelManager
{
    private readonly IAnalyticsService analytics;

    public LevelManager(IAnalyticsService analytics)
        => this.analytics = analytics;

    public void CompleteLevel() => analytics.LogEvent("level_complete");
}
```

Now the real service, a debug service or a test fake can be passed in. The place that creates and connects objects is called the **composition root**: one location (a bootstrap script) that wires everything together.

```csharp
public class GameBootstrap : MonoBehaviour
{
    private void Awake()
    {
        IAnalyticsService analytics = new FakeAnalyticsService();
        var levels = new LevelManager(analytics);
        levels.CompleteLevel();
    }
}
```

## 19.3 DI and MonoBehaviours

Unity creates `MonoBehaviour` objects itself, so they have no constructors you can use. Options:

- **Method injection:** an `Initialize(IService service)` method called by whoever creates the object.
- **Serialized references** to other components or ScriptableObjects (simple and common).
- **A DI container** that injects fields, properties or methods automatically.

## 19.4 Service Locator

A **service locator** is a central registry. Code asks it for a service by type.

```csharp
public static class ServiceLocator
{
    private static readonly Dictionary<Type, object> services = new();

    public static void Register<T>(T service) where T : class
        => services[typeof(T)] = service;

    public static bool TryGet<T>(out T service) where T : class
    {
        if (services.TryGetValue(typeof(T), out object obj))
        {
            service = (T)obj;
            return true;
        }
        service = null;
        return false;
    }

    public static void Unregister<T>() where T : class
        => services.Remove(typeof(T));

    [RuntimeInitializeOnLoadMethod(
        RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void Reset() => services.Clear();
}
```

| Dependency Injection | Service Locator |
|---|---|
| Dependencies are visible in the constructor | Dependencies are hidden inside method bodies |
| Easy to test with mocks and fakes | Testing needs registry setup and cleanup |
| More setup, especially without a container | Very quick to set up in a small project |
| Errors appear at wiring time | Errors appear when the service is requested |

> [interview] Why prefer DI?
> Dependencies are explicit, so the class is honest about what it needs, and I can pass a fake in tests. A service locator can still be a practical choice in a small project where simplicity matters, but it hides dependencies and makes code harder to test.

## 19.5 DI containers

Unity has no built-in container. Popular options are **VContainer** (lightweight and fast) and **Zenject / Extenject** (feature-rich). You register types and lifetimes (single instance, new instance each time, per scene), and the container builds objects and their dependencies automatically. They pay off in larger projects; a small game rarely needs one.

## 19.6 The thin MonoBehaviour

A powerful architecture habit: put decisions and rules in **plain C# classes** and keep `MonoBehaviour`s thin, adapting Unity (input, transforms, physics) to that logic. Plain classes can be tested instantly without loading a scene.

> [recap] Chapter 19
> - Hard-wired dependencies (`new`, `Instance`, `Find`) make code rigid and hard to test.
> - Inject abstractions (interfaces). Wire everything in one composition root.
> - Service locators are quick but hide dependencies. Use them consciously.
> - Keep logic in plain C# classes and MonoBehaviours thin.

# 20. Clean Code, Project Organisation and Testing

Code is read far more often than it is written. Consistent structure and tests make a project pleasant to return to after a break.

## 20.1 Naming conventions

Follow Microsoft's C# conventions, which most Unity teams use:

| Element | Convention | Example |
|---|---|---|
| Class, struct, enum, record | PascalCase | `PlayerHealth` |
| Interface | `I` + PascalCase | `IDamageable` |
| Method, property, event | PascalCase | `TakeDamage`, `Died` |
| Local variable, parameter | camelCase | `damageAmount` |
| Private field | camelCase, or `_camelCase`. **Pick one style and stay consistent** | `health` or `_health` |
| Constant | PascalCase | `MaxLevel` |
| Boolean | Reads like a question | `isGrounded`, `hasKey`, `canJump` |
| Async method | Ends with `Async` | `LoadSaveAsync` |
| Event handler | `On` or `Handle` + event | `OnDied`, `HandleDeath` |
| File | Same as the class name | `PlayerHealth.cs` |

> [warn] File name must match the MonoBehaviour
> A `MonoBehaviour` or `ScriptableObject` class must live in a file with **exactly the same name** as the class, or Unity will not let you attach it.

## 20.2 Order of members in a class

A consistent order makes any file easy to scan:

```csharp
public class Turret : MonoBehaviour
{
    // 1. Constants and static fields
    private const float MinRange = 1f;

    // 2. Serialized fields (Inspector)
    [SerializeField] private float range = 10f;

    // 3. Private fields
    private Transform target;

    // 4. Properties and events
    public bool HasTarget => target != null;
    public event Action Fired;

    // 5. Unity messages in lifecycle order
    private void Awake() { }
    private void OnEnable() { }
    private void Update() { }
    private void OnDisable() { }

    // 6. Public methods, then 7. private methods
    public void Fire() { }
    private void Aim() { }
}
```

## 20.3 Clean code habits

- **Descriptive names** beat comments. `float timeUntilNextShot` needs no explanation.
- **Small methods** that do one thing, at one level of detail.
- **Comments explain why**, not what. Remove commented-out code (version control remembers it).
- **No magic numbers.** Name them as constants or put them in a ScriptableObject.
- **Avoid duplication**, but do not abstract too early.
- **Use guard clauses** instead of deep nesting:

```csharp
// Deeply nested: hard to follow
void Attack(Enemy e)
{
    if (e != null)
        if (!e.IsDead)
            if (InRange(e))
                Hit(e);
}

// Guard clauses: flat and clear
void Attack(Enemy e)
{
    if (e == null || e.IsDead) return;
    if (!InRange(e)) return;
    Hit(e);
}
```

- **XML documentation** (`///`) on public APIs that others will use.
- Prefer `[SerializeField] private` over `public` fields.

## 20.4 Project organisation

```text
Assets/
  _Project/
    Scripts/
      Core/          GameManager, StateMachine, Services
      Player/        PlayerController, PlayerHealth
      Enemies/       EnemyController, AI strategies
      Combat/        IDamageable, DamageInfo, pools
      Data/          WeaponData, EnemyData, SaveData
      UI/            Presenters and views
      Editor/        Editor-only scripts
    Prefabs/  Scenes/  ScriptableObjects/  Art/  Audio/
```

- **Namespaces** that mirror folders (`MyGame.Combat`) prevent name clashes.
- **Assembly Definitions** (`.asmdef`) split code into separate assemblies. That speeds up recompiles (only changed assemblies rebuild) and enforces boundaries: gameplay code cannot accidentally reference editor code or UI code.
- Group by **feature** when the project grows, so everything for one feature sits together.
- Avoid the `Resources` folder for loading content at runtime. Use direct references or Addressables.

## 20.5 Version control for Unity

- In *Project Settings > Editor*, set **Asset Serialization** to *Force Text* and **Version Control** to *Visible Meta Files*.
- **Commit `.meta` files.** They hold the GUIDs that link assets together.
- Ignore generated folders: `Library/`, `Temp/`, `Obj/`, `Logs/`, `Build/`, and user-specific settings. Start from a Unity `.gitignore` template.
- Use **Git LFS** for large binary assets (textures, audio, models).
- Reduce merge conflicts: work in **prefabs** and additive scenes instead of one big shared scene, commit small changes often, and use Unity's YAML merge tool.

## 20.6 Testing

The **Unity Test Framework** uses NUnit. **Edit Mode** tests run instantly without entering Play mode, which is ideal for plain C# logic. **Play Mode** tests run in a real scene and can use `[UnityTest]` coroutines.

```csharp
using NUnit.Framework;

public class CooldownTests
{
    [Test]
    public void TryUse_WhenReady_SucceedsThenBlocks()
    {
        var cooldown = new Cooldown(2f);          // Arrange

        bool first = cooldown.TryUse();           // Act
        bool second = cooldown.TryUse();

        Assert.IsTrue(first);                     // Assert
        Assert.IsFalse(second);

        cooldown.Tick(2f);
        Assert.IsTrue(cooldown.Ready);
    }
}
```

- Name tests after the behaviour: `Method_Condition_Result`.
- Use **Arrange, Act, Assert** in every test.
- Tests need their own test assembly definition that references your code assembly.
- Logic in plain C# classes (Chapters 18 and 19) is what makes this easy.

> [recap] Chapter 20
> - Follow standard naming; file name equals class name for Unity components.
> - Keep a consistent member order, small methods, guard clauses, no magic numbers.
> - Organise by feature, use namespaces and assembly definitions.
> - Use Force Text and visible `.meta` files; commit `.meta`; use LFS for big assets.
> - Test plain C# logic with Edit Mode tests.

# 21. Debugging and Common Errors

Debugging is a skill: form a hypothesis, test it, and narrow the problem. This chapter gives you the tools and a table of the errors you will meet most often.

## 21.1 Logging and visual debugging

```csharp
Debug.Log("Info");
Debug.LogWarning("Something looks wrong");
Debug.LogError("Something failed", this);   // 'this' highlights the object
Debug.LogException(ex);

Debug.DrawLine(origin, target, Color.red, 2f);   // visible in Scene view
Debug.DrawRay(origin, direction, Color.green);
```

- Click a Console message with a context object to **ping** that object in the Hierarchy.
- **Gizmos** (`OnDrawGizmos`, `OnDrawGizmosSelected`) draw ranges and paths in the Scene view.
- Use the Console's **Collapse** and filters, and clear on Play.
- Wrap logging with a `[Conditional]` helper for shipping builds (Chapter 14).
- **Inspector Debug mode** (the Inspector's menu) shows private fields, which is handy without changing code.

## 21.2 Using a debugger

Logging is quick but blunt. A debugger lets you pause and inspect everything.

1. Attach your IDE (Visual Studio, Rider or VS Code) to the Unity Editor.
2. Set a **breakpoint** on a line and enter Play mode. Execution pauses there.
3. Inspect variables, the **call stack**, and step through code (step over, step into, step out).
4. Use **conditional breakpoints** (pause only when `health < 0`) and **watch expressions**.
5. For device builds, enable *Development Build* and *Script Debugging*.

## 21.3 Errors you will meet

| Error | Usual cause | Fix |
|---|---|---|
| `NullReferenceException` | An Inspector field was not assigned, a component is missing, or an object was destroyed | Validate in `Awake`, use `TryGetComponent`, check `!= null` |
| `UnassignedReferenceException` | A serialized reference was left empty in the Inspector | Assign it; use `OnValidate` to warn |
| `MissingReferenceException` | Using an object after it was destroyed (often a forgotten event unsubscribe) | Unsubscribe in `OnDisable`, check the object before use |
| `MissingComponentException` | `GetComponent` returned nothing and the result was used | `[RequireComponent]` or `TryGetComponent` |
| `IndexOutOfRange`, `ArgumentOutOfRange` | Index outside the list or array | Check `Count` or `Length` |
| `KeyNotFoundException` | Missing dictionary key | Use `TryGetValue` |
| `InvalidOperationException: Collection was modified` | Changing a collection during `foreach` | Loop backwards or use `RemoveAll` |
| `StackOverflowException` | Infinite recursion, for example `public int X { get => X; }` | Return the backing field, fix the recursion |
| Script cannot be attached or "class not derived from MonoBehaviour" | File name differs from class name | Rename file or class to match |
| "... can only be called from the main thread" | A Unity API was used from a background thread | Return to the main thread first (Chapter 13) |
| `CS1612` | Modifying a struct returned by a property (`transform.position.y = 1`) | Copy to a local, change it, assign back |
| `CS0246` | Missing `using` or assembly reference | Add the namespace or assembly definition reference |
| `CS0120` | Instance member accessed as if static | Use an instance, or make the member static |
| `CS0518` (`IsExternalInit`) | Records or `init` used without the shim | Declare the `IsExternalInit` type (Chapter 9) |

## 21.4 A debugging routine that works

1. **Reproduce** the problem reliably. If you cannot reproduce it, you cannot know you fixed it.
2. **Read** the error message and the top lines of the stack trace. Double-click the message to jump to the code.
3. **Form a hypothesis** ("this reference is null because...") and test it with a log or breakpoint. Do not change code blindly.
4. **Isolate:** disable systems, or use version control to find the change that introduced the bug.
5. **Fix the root cause**, not the symptom, and consider adding a test or an assertion so it cannot silently return.

`Debug.Assert(condition, "message")` and `UnityEngine.Assertions.Assert` check assumptions in the Editor and development builds, and are compiled out of release builds.

> [recap] Chapter 21
> - Use logs with context objects, Debug.Draw and Gizmos for quick answers, and a debugger for hard problems.
> - Learn the common exceptions and what each usually means.
> - Reproduce, hypothesise, isolate, fix the root cause, protect against regression.
