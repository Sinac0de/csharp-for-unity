# 15. Saving, JSON and File I/O

Save systems look simple and fail in painful ways: corrupted files, lost progress, incompatible versions. A little structure prevents most of it.

## 15.1 Choosing a storage method

| Method | Good for | Notes |
|---|---|---|
| `PlayerPrefs` | A few settings (volume, language) | Small, unencrypted, and stored in a platform-specific location. Not for game progress |
| `JsonUtility` + file | Simple save files | Built in and fast; limited feature set |
| Newtonsoft Json | Complex data, dictionaries, APIs | Install the *Newtonsoft Json* package from the Package Manager |
| Cloud or server storage | Online games, cross-device progress | The server should be the source of truth |
| `BinaryFormatter` | **Never** | Insecure and deprecated. Loading a tampered file can run attacker-controlled code |

## 15.2 JsonUtility

```csharp
[Serializable]
public class PlayerSaveData
{
    public int level;
    public int coins;
}

var data = new PlayerSaveData { level = 5, coins = 1200 };
string json = JsonUtility.ToJson(data);
PlayerSaveData loaded = JsonUtility.FromJson<PlayerSaveData>(json);
```

`JsonUtility` follows Unity's serialization rules (Chapter 11), which means:

- It serializes **fields**, not properties.
- It cannot serialize `Dictionary`, and cannot handle a top-level array or `List` (wrap it in an object).
- It does not support polymorphism, `DateTime` or nullable values. Store timestamps as a `long` (ticks) or an ISO string.
- Custom classes need `[Serializable]`.

| `JsonUtility` | Newtonsoft.Json |
|---|---|
| Simple and Unity-friendly | More powerful and flexible |
| Limited support for complex structures | Dictionaries, properties, polymorphism, custom converters |
| Enough for straightforward save files | Better for APIs and complex models |
| No extra package | Requires the package |

## 15.3 A safer save system

Goals: never corrupt the only copy, survive failures, and allow future format changes.

```csharp
[Serializable]
public class SaveData
{
    public int version = 1;      // increase when the format changes
    public int level;
    public int coins;
    public List<int> unlockedItemIds = new();
}
```

```csharp
public static class SaveSystem
{
    private static string PathFor(string slot) =>
        Path.Combine(Application.persistentDataPath, slot + ".json");

    public static bool TrySave(string slot, SaveData data)
    {
        try
        {
            string path = PathFor(slot);
            string temp = path + ".tmp";
            File.WriteAllText(temp, JsonUtility.ToJson(data));

            if (File.Exists(path))
                File.Copy(path, path + ".bak", true);   // keep a backup
            File.Copy(temp, path, true);
            File.Delete(temp);
            return true;
        }
        catch (Exception e)
        {
            Debug.LogException(e);
            return false;
        }
    }

    public static bool TryLoad(string slot, out SaveData data)
    {
        data = null;
        string path = PathFor(slot);

        foreach (string file in new[] { path, path + ".bak" })
        {
            try
            {
                if (!File.Exists(file)) continue;
                data = JsonUtility.FromJson<SaveData>(
                    File.ReadAllText(file));
                if (data != null) return true;
            }
            catch (Exception e) { Debug.LogException(e); }
        }
        return false;
    }
}
```

The temp-file step means a crash while writing leaves the previous save intact, and the `.bak` file gives `TryLoad` something to fall back on.

## 15.4 Save-system best practices

- **Version your data.** After loading, check `data.version` and migrate old formats step by step.
- **Save IDs, not references.** Store an item's id, not a Unity object. Rebuild the object from the id when loading.
- **Validate on load.** Clamp values and handle missing fields, because files can be old, edited or damaged.
- **Choose save moments carefully:** checkpoints, level end, settings changes. On mobile also save in `OnApplicationPause(true)`, because the app can be killed without warning.
- **Keep I/O off the critical frame.** Large files should be read and written asynchronously.
- **Use `Application.persistentDataPath`** for writable data. The install folder is not writable on most platforms.
- **Use `InvariantCulture`** when you convert numbers to text yourself (Chapter 1).
- **Obfuscation is not security.** Encrypting or encoding a local save deters casual editing only; anyone with the device can read it.

> [warn] Never trust the client for online games
> For currency, rankings and match results, the **server must be authoritative**. The client sends requests; the server validates and stores the outcome. A local save file can always be modified.

> [interview] How would you design a save system?
> Serializable data classes with a version number, a save service that writes to a temp file then replaces the old file (with a backup), IDs instead of object references, validation and migration on load, and an interface (`ISaveService`) so the storage can be swapped for a cloud implementation or a fake in tests.

> [recap] Chapter 15
> - `PlayerPrefs` for tiny settings; JSON files for progress; never `BinaryFormatter`.
> - `JsonUtility` handles fields and simple types only; use Newtonsoft for complex data.
> - Write to a temp file, keep a backup, catch exceptions, and version the format.
> - Save IDs, validate on load, save on mobile pause.
> - Online games need an authoritative server.

# 16. Reflection and Attributes

**Reflection** lets code inspect and use types, methods and fields at runtime. **Attributes** attach metadata to code. Together they power serializers, Inspectors, test frameworks and dependency injection containers.

## 16.1 Reflection

```csharp
Type type = typeof(Player);              // or player.GetType()
MethodInfo[] methods = type.GetMethods();

FieldInfo field = type.GetField(
    "health", BindingFlags.NonPublic | BindingFlags.Instance);
object value = field.GetValue(player);
field.SetValue(player, 50);
```

Costs of reflection:

- It is **slow** compared with normal calls and often allocates.
- It is **not type-safe**: mistakes (a misspelled member name) surface at runtime.
- It can break when code is renamed, obfuscated or **stripped** by the build (see 16.3).

Do not use reflection in `Update` or other hot paths. If you need it, do the lookup **once**, cache the result, and reuse it.

## 16.2 Attributes

Unity uses attributes everywhere: `[SerializeField]`, `[Header]`, `[Range]`, `[CreateAssetMenu]`, `[RequireComponent]`. You can create your own and read them with reflection:

```csharp
[AttributeUsage(AttributeTargets.Method)]
public class ConsoleCommandAttribute : Attribute
{
    public string Name { get; }
    public ConsoleCommandAttribute(string name) => Name = name;
}

public static class Cheats
{
    [ConsoleCommand("god")]
    public static void GodMode() { /* ... */ }
}
```

```csharp Discover commands once at startup and cache them
var commands = new Dictionary<string, MethodInfo>();
const BindingFlags flags = BindingFlags.Public | BindingFlags.Static;

foreach (MethodInfo m in typeof(Cheats).GetMethods(flags))
{
    var attr = m.GetCustomAttribute<ConsoleCommandAttribute>();
    if (attr != null) commands[attr.Name] = m;
}

commands["god"].Invoke(null, null);       // run the command
```

## 16.3 IL2CPP, stripping and AOT

Most shipping builds use **IL2CPP**, which converts your C# to C++ ahead of time (AOT), and **managed code stripping**, which removes code that appears unused.

- A type used **only through reflection** may look unused and be stripped. Protect it with the `[Preserve]` attribute (`UnityEngine.Scripting`) or a `link.xml` file.
- Creating generic types at runtime (`MakeGenericType`, generic methods over value types found only through reflection) can fail on AOT platforms because the code was never generated.
- Test reflection-dependent features in a **real device build**, not only in the Editor.

## 16.4 Alternatives to reflection

- **Interfaces and abstract classes** for behaviour that varies by type.
- **Explicit registration:** register handlers or commands in code rather than discovering them.
- **`TypeCache`** (Editor only) for fast lookup of derived types in editor tools.
- **Source generators** for advanced compile-time generation.

> [recap] Chapter 16
> - Reflection inspects types at runtime; it is powerful, slow and unsafe. Look up once, cache, reuse.
> - Attributes are metadata; Unity uses them heavily and you can define your own.
> - Stripping can remove reflection-only code: use `[Preserve]` or `link.xml`, and test on device.
> - Prefer interfaces and explicit registration when you can.
