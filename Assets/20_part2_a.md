@part Part II — The Unity Runtime | How Unity runs your C#: lifecycle, serialization, data assets, asynchronous code, memory, saving and reflection.

# 10. MonoBehaviour Lifecycle and Unity Essentials

Unity calls specific methods on your scripts at specific moments. Knowing the order tells you where each piece of code belongs.

## 10.1 The lifecycle

| Method | When it runs | Typical use |
|---|---|---|
| `Awake` | Once, when the object is created or loaded (even if the component is disabled, as long as the GameObject is active) | Cache components, set up your own state |
| `OnEnable` | Each time the component becomes enabled | Subscribe to events, reset state |
| `Start` | Once, before the first `Update`, only if enabled | Setup that depends on other objects being ready |
| `FixedUpdate` | On a fixed timestep (0.02 s by default), zero or several times per frame | Physics: forces, Rigidbody movement |
| `Update` | Once per frame | Input, game logic, timers |
| `LateUpdate` | Once per frame, after all `Update` calls | Camera follow, final adjustments |
| `OnDisable` | When disabled, deactivated or destroyed | Unsubscribe from events |
| `OnDestroy` | When the object is destroyed | Final cleanup |

Order guarantees worth remembering:

- For one script: `Awake`, then `OnEnable`, then `Start`, then the update loop.
- `Awake` and `OnEnable` of **all** objects in a scene run before any `Start`, but the order **between different scripts is not defined** unless you set it in *Script Execution Order*.
- Objects created with `Instantiate` or `AddComponent` run `Awake` and `OnEnable` immediately, and `Start` before their first `Update`.
- On an **inactive** GameObject nothing runs until it is activated.

> [tip] Awake for yourself, Start for others
> In `Awake`, set up **your own** data and cache your own components. In `Start`, talk to **other** objects, which have had their `Awake` by then. This avoids most initialisation-order bugs.

```csharp
public class Turret : MonoBehaviour
{
    private Rigidbody rb;
    [SerializeField] private Health health;

    private void Awake()   => rb = GetComponent<Rigidbody>();
    private void OnEnable()  => health.Died += OnDied;
    private void OnDisable() => health.Died -= OnDied;

    private void OnDied() => gameObject.SetActive(false);
}
```

## 10.2 Time and frame independence

Frame rates vary, so movement and timers must be scaled by the time of the last frame.

```csharp
void Update()
{
    // Same speed at 30 FPS and at 144 FPS
    transform.position += direction * (speed * Time.deltaTime);
}

void FixedUpdate()
{
    // Physics movement belongs here, using the fixed timestep
    rb.MovePosition(rb.position + move * Time.fixedDeltaTime);
}
```

| Property | Meaning |
|---|---|
| `Time.deltaTime` | Seconds since the previous frame (scaled by `timeScale`) |
| `Time.fixedDeltaTime` | The physics timestep |
| `Time.unscaledDeltaTime` | Like `deltaTime` but ignores `timeScale` (use for pause menus and UI) |
| `Time.timeScale` | Global time multiplier. `0` freezes gameplay, `Update` still runs |

> [tip] Read input in Update, apply physics in FixedUpdate
> Store what the player asked for in `Update` (for example a movement vector) and apply it to the Rigidbody in `FixedUpdate`. Reading input in `FixedUpdate` can miss key presses, because it may not run every frame.

## 10.3 Getting references

| Approach | Verdict |
|---|---|
| `[SerializeField]` field, assigned in the Inspector | **Best default.** Fast, explicit, visible in the editor |
| `GetComponent<T>()` once in `Awake`, then cached | Good for components on the same object |
| `TryGetComponent<T>(out var c)` | Good when the component may not exist (avoids errors and an allocation in the editor) |
| `GetComponentInChildren`, `GetComponentInParent` | Fine at setup time, not per frame |
| `[RequireComponent(typeof(T))]` | Guarantees the component exists |
| `FindObjectOfType`, `GameObject.Find`, `SendMessage` | Avoid: slow and fragile (names and strings) |

```csharp
[RequireComponent(typeof(Rigidbody))]
public class Mover : MonoBehaviour
{
    private Rigidbody rb;
    private void Awake() => rb = GetComponent<Rigidbody>();
}

// Comparing tags: CompareTag does not allocate
if (other.CompareTag("Player")) { }        // good
// if (other.tag == "Player") { }          // allocates a string
```

> [note] Find methods in newer Unity
> In recent Unity versions `FindObjectOfType` and `FindObjectsOfType` are deprecated in favour of `FindFirstObjectByType`, `FindAnyObjectByType` and `FindObjectsByType`. The new methods let you choose whether results must be sorted, which is cheaper when order does not matter. Even so, prefer serialized references or injected dependencies to searching the scene.

## 10.4 Creating and destroying objects

```csharp
GameObject bullet = Instantiate(bulletPrefab, muzzle.position, muzzle.rotation);
Destroy(bullet, 3f);               // destroy after 3 seconds
DontDestroyOnLoad(gameObject);     // survive scene loads
```

- Instantiate the **component type** you need to skip a `GetComponent` call: `Bullet b = Instantiate(bulletPrefab);` where `bulletPrefab` is a `Bullet` reference.
- `Instantiate` and `Destroy` are expensive when repeated often (bullets, effects). Use pooling (Chapter 14).
- Load scenes asynchronously (`SceneManager.LoadSceneAsync`) so the game does not freeze.

## 10.5 Useful Inspector attributes

| Attribute | Effect |
|---|---|
| `[SerializeField]` | Show a private field in the Inspector |
| `[Header("Text")]`, `[Space]` | Group and space fields |
| `[Tooltip("Text")]` | Hover help |
| `[Range(0, 1)]`, `[Min(0)]` | Slider and minimum value |
| `[HideInInspector]` | Serialized but not shown |
| `[RequireComponent(typeof(T))]` | Adds the component automatically |
| `[DisallowMultipleComponent]` | Only one per GameObject |
| `[ContextMenu("Name")]` | Adds a right-click command for debugging |

```csharp
[Header("Movement")]
[SerializeField, Min(0f)] private float speed = 5f;

private void OnValidate()          // runs in the Editor when values change
{
    speed = Mathf.Max(0f, speed);
}
```

`OnValidate` is ideal for clamping values and checking for missing references. `Reset` runs when a component is first added or reset, which is useful for auto-filling references.

## 10.6 Editor-only code

```csharp
#if UNITY_EDITOR
    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, attackRange);
    }
#endif
```

Code that uses the `UnityEditor` namespace **cannot be included in a player build**. Wrap it in `#if UNITY_EDITOR` or place it in a folder named `Editor` (or an assembly definition limited to the Editor platform), otherwise the build fails.

## 10.6.1 Habits that save frame time

- Delete empty `Update` methods. Unity still calls them.
- Prefer events over polling a value every frame.
- Cache references and results you read repeatedly.
- Disable components you do not need instead of skipping their logic with `if`.
- Never use `Find` or `GetComponent` inside `Update` when you can cache once.

> [recap] Chapter 10
> - Order: `Awake`, `OnEnable`, `Start`, then `FixedUpdate`, `Update`, `LateUpdate`, and finally `OnDisable`, `OnDestroy`.
> - Subscribe in `OnEnable`, unsubscribe in `OnDisable`.
> - Multiply movement by `Time.deltaTime`; use `FixedUpdate` for physics.
> - Prefer serialized references. Cache `GetComponent` results. Avoid `Find` and `SendMessage`.
> - Use `CompareTag` instead of `tag ==`.
> - Wrap editor code in `#if UNITY_EDITOR`.

# 11. Serialization and the Inspector

Serialization is how Unity saves your fields into scenes, prefabs and assets, and shows them in the Inspector. Many "why does my value reset?" bugs come from misunderstanding it.

## 11.1 What Unity serializes

| Unity serializes | Unity does not serialize |
|---|---|
| `public` fields and `[SerializeField]` fields | Properties (unless `[field: SerializeField]`) |
| `int`, `float`, `bool`, `string`, `enum` | `static`, `const` and `readonly` fields |
| Unity types: `Vector3`, `Color`, `AnimationCurve`, `LayerMask` | `Dictionary<K,V>`, `HashSet<T>`, `Queue<T>` |
| References to `UnityEngine.Object` types (prefabs, components, ScriptableObjects) | Fields of interface type |
| `[Serializable]` classes and structs | Nested collections such as `List<List<int>>` |
| Arrays and `List<T>` of the above | Polymorphic values (only the declared type is kept) unless `[SerializeReference]` |

```csharp
[Serializable]
public class LootEntry
{
    public ItemData item;
    [Range(0f, 1f)] public float chance = 0.25f;
}

public class LootTable : MonoBehaviour
{
    [SerializeField] private List<LootEntry> entries = new();
}
```

## 11.2 Common surprises

- **The Inspector value wins over your initializer.** `private int hp = 100;` is only the *default for new components*. Once the component is saved with another value, changing the code does not change existing objects.
- **Custom classes are never null.** A serialized `[Serializable]` field is created with default values, not null.
- **Renaming a field loses its data**, because Unity matches by name. Keep the old data with `[FormerlySerializedAs]`:

```csharp
using UnityEngine.Serialization;

[FormerlySerializedAs("hp")]
[SerializeField] private int maxHealth = 100;
```

- **`[HideInInspector]` still serializes;** `[NonSerialized]` does not.
- **Deep or cyclic object graphs** are not supported: serialization is for trees of data, not for arbitrary object webs.

## 11.3 SerializeReference and interfaces

`[SerializeReference]` stores a field by reference and keeps its concrete type, which allows interfaces and polymorphic lists of plain C# classes:

```csharp
public interface IAbility { void Use(); }

[Serializable] public class Dash : IAbility { public void Use() { } }
[Serializable] public class Heal : IAbility { public void Use() { } }

public class Hero : MonoBehaviour
{
    [SerializeReference] private List<IAbility> abilities = new();
}
```

> [note] SerializeReference has limits
> The default Inspector cannot create the concrete instances for you. You usually need a custom drawer, a package, or code that fills the list. For many projects, a `ScriptableObject` per ability (an asset you can assign) is simpler and more robust.

## 11.4 Serializing a dictionary

Unity cannot serialize a `Dictionary`, but you can store keys and values in two lists and rebuild the dictionary after loading:

```csharp
[Serializable]
public class SerializableMap<K, V> : ISerializationCallbackReceiver
{
    [SerializeField] private List<K> keys = new();
    [SerializeField] private List<V> values = new();

    public Dictionary<K, V> Map { get; } = new();

    public void OnBeforeSerialize()
    {
        keys.Clear();
        values.Clear();
        foreach (var pair in Map)
        {
            keys.Add(pair.Key);
            values.Add(pair.Value);
        }
    }

    public void OnAfterDeserialize()
    {
        Map.Clear();
        for (int i = 0; i < keys.Count && i < values.Count; i++)
            Map[keys[i]] = values[i];
    }
}
```

Use it through a closed field type such as `SerializableMap<string, int>`.

> [recap] Chapter 11
> - Fields are serialized if they are public or `[SerializeField]`, and of a supported type.
> - Properties, dictionaries, interfaces and statics are not serialized.
> - The Inspector value overrides the code initializer.
> - Renaming a serialized field needs `[FormerlySerializedAs]`.
> - `[SerializeReference]` enables polymorphism, but a ScriptableObject-per-variant is often simpler.

# 12. ScriptableObjects and Data-Driven Design

A **ScriptableObject** is a data container that lives as an asset in your project instead of on a GameObject. It lets designers change data without touching code, and lets many objects share one copy of that data.

## 12.1 Configuration data

```csharp
[CreateAssetMenu(fileName = "NewWeapon", menuName = "Game/Weapon Data")]
public class WeaponData : ScriptableObject
{
    [SerializeField] private string displayName;
    [SerializeField] private int damage = 10;
    [SerializeField] private float fireRate = 4f;
    [SerializeField] private int magazineSize = 12;
    [SerializeField] private GameObject prefab;

    public string DisplayName => displayName;
    public int Damage => damage;
    public float FireRate => fireRate;
    public int MagazineSize => magazineSize;
    public GameObject Prefab => prefab;
}

public class Weapon : MonoBehaviour
{
    [SerializeField] private WeaponData data;

    public void Fire() => Debug.Log($"Damage {data.Damage}");
}
```

Notice the data is exposed through **read-only properties**. The fields are private, so gameplay code cannot change the shared asset by accident.

> [tip] Data-driven design
> Put numbers, names, prefabs and rules in ScriptableObject assets: weapon stats, enemy definitions, level settings, item tables. Then adding a new weapon means creating an asset, not writing code. It also keeps a single source of truth for balancing.

## 12.2 The runtime-state pitfall

A ScriptableObject is an **asset**. In the Editor, changes made to it while playing **persist after you stop**, and every object that references the asset sees the same data. In a build, the changes disappear when the app restarts, so behaviour differs between Editor and build.

Rule: **configuration lives in the asset; runtime state lives in your own objects.**

```csharp
public class WeaponInstance          // plain C# class, per-weapon state
{
    public WeaponData Data { get; }
    public int Ammo { get; private set; }

    public WeaponInstance(WeaponData data)
    {
        Data = data;
        Ammo = data.MagazineSize;
    }

    public bool TryFire()
    {
        if (Ammo <= 0) return false;
        Ammo--;
        return true;
    }
}
```

If you must modify a ScriptableObject at runtime, work on a copy with `Instantiate(asset)`.

## 12.3 Event channels

A ScriptableObject can act as a shared event, letting two objects communicate without knowing each other or the scene.

```csharp
[CreateAssetMenu(menuName = "Game/Event")]
public class GameEventSO : ScriptableObject
{
    private readonly List<GameEventListener> listeners = new();

    public void Raise()
    {
        // Backwards: a listener may unregister itself while raising
        for (int i = listeners.Count - 1; i >= 0; i--)
            listeners[i].OnEventRaised();
    }

    public void Register(GameEventListener l) => listeners.Add(l);
    public void Unregister(GameEventListener l) => listeners.Remove(l);
}

public class GameEventListener : MonoBehaviour
{
    [SerializeField] private GameEventSO gameEvent;
    [SerializeField] private UnityEvent response;

    private void OnEnable()  => gameEvent.Register(this);
    private void OnDisable() => gameEvent.Unregister(this);

    public void OnEventRaised() => response.Invoke();
}
```

> [warn] Iterating and modifying
> A `foreach` over the listener list would throw if a listener unregisters itself during `Raise`. Iterating backwards (or over a copy) avoids that.

## 12.4 Other good uses

- **Item, enemy and level databases** that designers extend by adding assets.
- **Shared variables** (a `FloatVariable` holding player health that UI and gameplay both reference).
- **Runtime sets** of active objects (for example all enemies) without a singleton manager.
- **Ability or behaviour assets** used as a Strategy (Chapter 18).

Use `OnValidate` in the ScriptableObject to clamp values and warn about invalid data. Do not use a ScriptableObject for data that differs per instance, for save data, or as a hiding place for global mutable state.

> [interview] Why ScriptableObject over a MonoBehaviour for data?
> It is an asset independent of scenes, so many objects share one copy (less memory, one place to edit), designers can edit it without code, and it does not need a GameObject. The trade-off is that it is shared: mutable runtime state must not live in it.

> [recap] Chapter 12
> - ScriptableObjects are shared, asset-based data containers; ideal for configuration.
> - Expose data with read-only properties.
> - Keep runtime state in separate objects created from the asset.
> - Editor play-mode changes to assets persist; builds behave differently. Beware.
> - ScriptableObject event channels decouple systems, but iterate listeners safely.
