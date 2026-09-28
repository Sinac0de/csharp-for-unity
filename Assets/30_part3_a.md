@part Part III — Architecture | Structuring code so a project can grow: principles, patterns, dependency management, clean code, testing and debugging.

# 17. SOLID and Design Principles

Good architecture is about making change cheap. SOLID is a set of five principles that guide you towards code that is easy to extend, test and understand.

## 17.1 The five principles

| | Principle | Meaning | Unity example |
|---|---|---|---|
| S | Single Responsibility | A class has one reason to change | `PlayerHealth` handles health only, not input, audio and UI |
| O | Open/Closed | Extend behaviour without editing existing code | New weapon type = new class, shooter code unchanged |
| L | Liskov Substitution | A subtype must work wherever its base type is expected | Every `EnemyBase` can be used without special cases |
| I | Interface Segregation | Prefer small, focused interfaces | `IDamageable` separate from `IInteractable` |
| D | Dependency Inversion | Depend on abstractions, not concrete classes | `PlayerController` uses `IInputService`, not a keyboard class |

## 17.2 S: Single Responsibility

```csharp
// Too many jobs: any change to input, UI or audio touches this class
public class Player : MonoBehaviour
{
    void Update() { ReadInput(); Move(); Shoot(); UpdateHud(); PlaySounds(); }
}

// One job each, connected by events
public class PlayerHealth : MonoBehaviour { /* health only */ }
public class PlayerMovement : MonoBehaviour { /* movement only */ }
public class PlayerAudio : MonoBehaviour { /* reacts to events */ }
```

> [tip] A quick test
> If you cannot describe what a class does without using "and", it probably has more than one responsibility. Large "Manager" classes that know about everything are the usual sign.

## 17.3 O and L: Open/Closed and Liskov

Program against an abstraction, so a new variant does not require editing the code that uses it:

```csharp
public interface IWeapon { void Attack(); }

public class Shooter
{
    private readonly IWeapon weapon;
    public Shooter(IWeapon weapon) => this.weapon = weapon;
    public void Fire() => weapon.Attack();     // never changes
}

public class Bow : IWeapon { public void Attack() { /* ... */ } }
```

**Liskov** is violated when a derived class breaks the promises of its base class:

```csharp
public class Chest { public virtual void AddItem(Item i) { /* ... */ } }

// Breaks callers that expect AddItem to work
public class LockedChest : Chest
{
    public override void AddItem(Item i)
        => throw new NotSupportedException();
}
```

If a subclass has to throw or ignore a base behaviour, the hierarchy is wrong. Split the abstraction (for example a separate `IAcceptsItems`) or use composition.

## 17.4 I and D: small interfaces and abstractions

```csharp
public interface IDamageable { void TakeDamage(int amount); }
public interface IHealable   { void Heal(int amount); }
// Not: IEntity with 15 unrelated methods that most classes leave empty
```

```csharp
public interface IInputService { Vector2 Move { get; } }

public class PlayerController
{
    private readonly IInputService input;

    public PlayerController(IInputService input) => this.input = input;

    public Vector2 GetVelocity(float speed) => input.Move * speed;
}
```

`IInputService` can be implemented by keyboard, gamepad, touch or a fake used in tests, and `PlayerController` never changes.

## 17.5 Other principles worth knowing

| Principle | Idea |
|---|---|
| DRY | Do not repeat knowledge. Extract shared logic |
| KISS | Keep it simple. The simplest design that works |
| YAGNI | Do not build features "just in case" |
| Tell, don't ask | Tell an object to do something; do not pull its data out and decide for it |
| Law of Demeter | Avoid long chains like `a.b.c.d.DoThing()` |
| Composition over inheritance | Build behaviour from parts (Chapter 3) |
| Separation of concerns | Data, logic and presentation live in different places |

> [warn] Do not over-engineer
> Principles are tools, not goals. A game jam or prototype does not need interfaces for everything. Start simple, and introduce an abstraction when you feel real pain: a second implementation appears, a class becomes hard to test, or a change ripples through many files.

> [interview] Explain SRP and DIP with a game example
> SRP: `PlayerHealth` manages health, while input, animation and audio are separate components, so changing one does not risk the others. DIP: `LevelManager` depends on `IAnalyticsService`, not on `FirebaseAnalyticsService`, so I can swap providers or use a fake in tests.

> [recap] Chapter 17
> - SOLID: one job per class, extend rather than edit, honour base-class promises, small interfaces, depend on abstractions.
> - Composition, events and interfaces are how these principles show up in Unity.
> - Simplicity first; add abstraction when real pain appears.

# 18. Design Patterns in Unity

Design patterns are proven solutions to recurring problems. Knowing them gives you shared vocabulary and saves you from reinventing structures.

## 18.1 Overview

| Pattern | Problem it solves | Typical Unity use |
|---|---|---|
| State | Behaviour changes with internal state | Player or enemy states, game flow |
| Strategy | Swap an algorithm at runtime | AI movement, difficulty, damage formulas |
| Observer | Notify others without coupling | Health changed, score changed |
| Factory | Create objects without depending on concrete types | Spawning enemies or items |
| Command | Represent actions as objects | Undo, replay, input buffering |
| Object Pool | Reuse objects | Bullets, VFX, popups |
| Singleton | Exactly one global instance | Audio, game bootstrap (use with care) |
| Service Locator | Central registry of services | Access to shared services |
| MVP | Separate UI from logic | HUD, menus, inventory screens |

## 18.2 State

Use it when an object behaves differently depending on its state and has clear transitions (idle, walk, jump, attack). Each state is a class with `Enter`, `Tick` and `Exit`.

```csharp
public interface IPlayerState
{
    void Enter(PlayerController player);
    void Tick(PlayerController player);
    void Exit(PlayerController player);
}

public class IdleState : IPlayerState
{
    public void Enter(PlayerController p) => p.PlayAnimation("Idle");

    public void Tick(PlayerController p)
    {
        if (p.MoveInput != Vector2.zero)
            p.ChangeState(p.Walk);         // reuse the cached instance
    }

    public void Exit(PlayerController p) { }
}
```

```csharp
public class PlayerController : MonoBehaviour
{
    public IPlayerState Idle { get; } = new IdleState();
    public IPlayerState Walk { get; } = new WalkState();
    public Vector2 MoveInput { get; private set; }

    private IPlayerState current;

    private void Start()  => ChangeState(Idle);
    private void Update() => current.Tick(this);

    public void ChangeState(IPlayerState next)
    {
        current?.Exit(this);
        current = next;
        current.Enter(this);
    }

    public void PlayAnimation(string name) { /* animator call */ }
}
```

> [perf] Create states once
> Allocate state objects once (as shown) and reuse them. Writing `ChangeState(new WalkState())` creates garbage on every transition.

For a handful of trivial states, an `enum` with a `switch` is simpler. Move to State classes when each state has its own logic and data.

## 18.3 Strategy

Use it when several interchangeable algorithms do the same job. Unlike State, the algorithm is chosen from outside and does not change itself.

```csharp
public interface IMoveStrategy
{
    Vector3 NextPosition(Vector3 current, Vector3 target, float dt);
}

public class ChaseStrategy : IMoveStrategy
{
    private readonly float speed;
    public ChaseStrategy(float speed) => this.speed = speed;

    public Vector3 NextPosition(
        Vector3 current, Vector3 target, float dt)
    {
        return Vector3.MoveTowards(current, target, speed * dt);
    }
}

public class FleeStrategy : IMoveStrategy
{
    private readonly float speed;
    public FleeStrategy(float speed) => this.speed = speed;

    public Vector3 NextPosition(
        Vector3 current, Vector3 target, float dt)
    {
        Vector3 away = (current - target).normalized;
        return current + away * (speed * dt);
    }
}
```

An enemy holds an `IMoveStrategy` and calls it each frame. To change behaviour (chase, then flee at low health), assign a different strategy. This replaces growing `if/else` chains with small, testable classes.

> [interview] State or Strategy?
> Strategy: interchangeable algorithms chosen from outside (easy AI versus hard AI). State: behaviour that depends on the object's current state, with transitions between states (Idle, Walk, Attack). The structure is similar; the intent is different.

## 18.4 Observer

The Observer pattern is built into C# as `event` (Chapter 6). The publisher announces something; any number of subscribers react. Use it for health, score, quest progress and UI updates. Remember the golden rule: **subscribe in `OnEnable`, unsubscribe in `OnDisable`**.

## 18.5 Factory

A factory centralises object creation so callers do not depend on prefabs or concrete classes.

```csharp
public enum EnemyType { Goblin, Orc }

public class EnemyFactory : MonoBehaviour
{
    [SerializeField] private Enemy goblinPrefab;
    [SerializeField] private Enemy orcPrefab;

    public Enemy Create(EnemyType type, Vector3 position)
    {
        Enemy prefab = type switch
        {
            EnemyType.Goblin => goblinPrefab,
            EnemyType.Orc    => orcPrefab,
            _ => throw new ArgumentOutOfRangeException(nameof(type)),
        };
        return Instantiate(prefab, position, Quaternion.identity);
    }
}
```

## 18.6 Command

A command turns an action into an object, which makes undo, replay, input buffering and networking possible.

```csharp
public interface ICommand { void Execute(); void Undo(); }

public class MoveCommand : ICommand
{
    private readonly Transform target;
    private readonly Vector3 delta;

    public MoveCommand(Transform target, Vector3 delta)
    {
        this.target = target;
        this.delta = delta;
    }

    public void Execute() => target.position += delta;
    public void Undo()    => target.position -= delta;
}

public class CommandHistory
{
    private readonly Stack<ICommand> done = new();

    public void Run(ICommand command)
    {
        command.Execute();
        done.Push(command);
    }

    public void UndoLast()
    {
        if (done.Count > 0) done.Pop().Undo();
    }
}
```

## 18.7 Singleton

A Singleton guarantees one instance with global access. It is popular in Unity for managers, and also the most overused pattern.

```csharp
public class AudioManager : MonoBehaviour
{
    public static AudioManager Instance { get; private set; }

    [RuntimeInitializeOnLoadMethod(
        RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void ResetStatics() => Instance = null;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);       // a duplicate: remove it
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }
}
```

The `ResetStatics` method matters when *Reload Domain* is disabled in the Editor, because otherwise the old instance would survive between Play sessions.

| Problem | Why it hurts |
|---|---|
| Hidden dependencies | Any class can reach it, so you cannot see what a class depends on |
| Hard to test | You cannot easily replace it with a fake |
| Lifecycle and order bugs | It may not exist yet, or may be destroyed on scene change |
| Global state | Anyone can change it, so bugs are hard to trace |
| Becomes a "God object" | Everything gets added to `GameManager` |

> [tip] When a Singleton is acceptable
> For genuinely unique, simple services in a small project (audio, input). Even then, hide it behind an interface, keep it small, and prefer dependency injection or a service locator as the project grows (Chapter 19).

## 18.8 MVP for UI

**Model-View-Presenter** keeps UI logic testable. The **model** holds data and rules, the **view** is a dumb MonoBehaviour that displays things, and the **presenter** is a plain C# class connecting them.

```csharp
public interface IHealthView { void SetHealth(int current, int max); }

public class HealthPresenter : IDisposable
{
    private readonly Health model;            // see Chapter 22
    private readonly IHealthView view;

    public HealthPresenter(Health model, IHealthView view)
    {
        this.model = model;
        this.view = view;
        model.Changed += OnChanged;
        OnChanged(model.Current);             // show the initial value
    }

    private void OnChanged(int current) => view.SetHealth(current, model.Max);
    public void Dispose() => model.Changed -= OnChanged;
}
```

The presenter can be tested without a scene by passing a fake `IHealthView`.

> [recap] Chapter 18
> - State: behaviour depends on state; Strategy: swappable algorithm; Observer: events; Factory: creation; Command: actions as objects.
> - Create State and Strategy objects once and reuse them.
> - Singletons are convenient and costly; keep them rare, small and behind interfaces.
> - MVP keeps logic in plain C# classes that are easy to test.
