@part بخش دوم — محیط اجرای یونیتی | اینکه یونیتی کد سی‌شارپ تو را چطور اجرا می‌کند: چرخهٔ عمر، سریالایز، دارایی‌های داده، کدهای ناهمگام، حافظه، ذخیره‌سازی و رفلکشن.

# 10. چرخهٔ عمر MonoBehaviour و پایه‌های یونیتی

یونیتی متدهای مشخصی را در لحظه‌های مشخصی از اسکریپت‌های تو صدا می‌زند. اگر ترتیب را بدانی، می‌فهمی هر تکه کد جایش کجاست.

## 10.1 چرخهٔ عمر

| متد | کِی اجرا می‌شود | کاربرد معمولش |
|---|---|---|
| `Awake` | یک‌بار، وقتی شیء ساخته یا بارگذاری می‌شود (حتی اگر کامپوننت غیرفعال باشد، به شرطی که GameObject فعال باشد) | گرفتن و کش‌کردن کامپوننت‌ها، آماده‌کردن حالت خودت |
| `OnEnable` | هر بار که کامپوننت فعال می‌شود | عضو شدن در رویدادها، ریست کردن حالت |
| `Start` | یک‌بار، قبل از اولین `Update` و فقط اگر فعال باشد | آماده‌سازی‌هایی که به آماده‌بودن شیءهای دیگر وابسته‌اند |
| `FixedUpdate` | با گام زمانی ثابت (پیش‌فرض ۰٫۰۲ ثانیه)، در هر فریم صفر بار یا چند بار | فیزیک: نیروها، حرکت Rigidbody |
| `Update` | یک‌بار در هر فریم | ورودی، منطق بازی، تایمرها |
| `LateUpdate` | یک‌بار در هر فریم، بعد از همهٔ `Update`ها | دنبال‌کردن دوربین، تنظیمات نهایی |
| `OnDisable` | وقتی غیرفعال، خاموش یا نابود می‌شود | بیرون آمدن از رویدادها |
| `OnDestroy` | وقتی شیء نابود می‌شود | پاک‌سازی نهایی |

ترتیب‌هایی که ارزش حفظ‌کردن دارند:

- برای یک اسکریپت: `Awake`، بعد `OnEnable`، بعد `Start`، بعد حلقهٔ به‌روزرسانی.
- `Awake` و `OnEnable` **همهٔ** شیءهای صحنه قبل از هر `Start` اجرا می‌شوند، ولی ترتیب **بین اسکریپت‌های مختلف تعریف‌شده نیست**، مگر اینکه در *Script Execution Order* تنظیمش کنی.
- شیءهایی که با `Instantiate` یا `AddComponent` ساخته می‌شوند، `Awake` و `OnEnable` را همان لحظه اجرا می‌کنند و `Start` را قبل از اولین `Update`شان.
- روی یک GameObject **غیرفعال** هیچ‌چیز اجرا نمی‌شود تا فعالش کنی.

> [tip] `Awake` برای خودت، `Start` برای بقیه
> در `Awake` دادهٔ **خودت** را آماده کن و کامپوننت‌های خودت را بگیر. در `Start` با **شیءهای دیگر** حرف بزن، که تا آن موقع `Awake`شان را اجرا کرده‌اند. این کار بیشتر باگ‌های ترتیب مقداردهی را حذف می‌کند.

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

## 10.2 زمان و استقلال از نرخ فریم

نرخ فریم تغییر می‌کند، پس حرکت و تایمرها باید با زمان آخرین فریم مقیاس شوند.

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

| پراپرتی | یعنی |
|---|---|
| `Time.deltaTime` | ثانیه از فریم قبلی (مقیاس‌شده با `timeScale`) |
| `Time.fixedDeltaTime` | گام زمانی فیزیک |
| `Time.unscaledDeltaTime` | مثل `deltaTime` ولی `timeScale` را نادیده می‌گیرد (برای منوی pause و رابط کاربری) |
| `Time.timeScale` | ضریب زمانی سراسری. مقدار `0` گیم‌پلی را می‌خواباند، ولی `Update` همچنان اجرا می‌شود |

> [tip] ورودی را در `Update` بگیر، فیزیک را در `FixedUpdate` اعمال کن
> آنچه بازیکن خواسته را در `Update` ذخیره کن (مثلاً یک بردار حرکت) و در `FixedUpdate` روی Rigidbody اعمالش کن. خواندن ورودی در `FixedUpdate` می‌تواند فشردن کلیدها را از دست بدهد، چون ممکن است هر فریم اجرا نشود.

## 10.3 گرفتن ارجاع‌ها

| راهکار | حکم |
|---|---|
| فیلد `[SerializeField]` که در Inspector پر می‌شود | **بهترین پیش‌فرض.** سریع، صریح، در ادیتور قابل دیدن |
| `GetComponent<T>()` یک‌بار در `Awake`، بعد کش‌شده | برای کامپوننت‌های روی همان شیء خوب است |
| `TryGetComponent<T>(out var c)` | وقتی ممکن است کامپوننت وجود نداشته باشد (جلوگیری از خطا و یک تخصیص در ادیتور) |
| `GetComponentInChildren`، `GetComponentInParent` | در زمان آماده‌سازی خوب است، نه هر فریم |
| `[RequireComponent(typeof(T))]` | تضمین می‌کند کامپوننت وجود داشته باشد |
| `FindObjectOfType`، `GameObject.Find`، `SendMessage` | پرهیز کن: کند و شکننده‌اند (با اسم و رشته کار می‌کنند) |

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

> [note] متدهای Find در یونیتی‌های جدید
> در نسخه‌های تازهٔ یونیتی، `FindObjectOfType` و `FindObjectsOfType` منسوخ شده‌اند و به‌جایشان `FindFirstObjectByType`، `FindAnyObjectByType` و `FindObjectsByType` آمده‌اند. متدهای جدید می‌گذارند خودت انتخاب کنی که نتیجه باید مرتب باشد یا نه، که وقتی ترتیب مهم نیست ارزان‌تر است. با این حال، ارجاع‌های سریالایزشده یا وابستگی‌های تزریق‌شده را به جست‌وجو در صحنه ترجیح بده.

## 10.4 ساختن و نابودکردن شیءها

```csharp
GameObject bullet = Instantiate(bulletPrefab, muzzle.position, muzzle.rotation);
Destroy(bullet, 3f);               // destroy after 3 seconds
DontDestroyOnLoad(gameObject);     // survive scene loads
```

- همان **نوع کامپوننت**ی را درست کن که لازم داری تا یک `GetComponent` صرفه‌جویی شود: `Bullet b = Instantiate(bulletPrefab);` که در آن `bulletPrefab` یک ارجاع از نوع `Bullet` است.
- `Instantiate` و `Destroy` وقتی زیاد تکرار شوند گران‌اند (گلوله‌ها، افکت‌ها). از استخر (pool) استفاده کن (فصل ۱۴).
- صحنه‌ها را ناهمگام بارگذاری کن (`SceneManager.LoadSceneAsync`) تا بازی فریز نشود.

## 10.5 اتریبیوت‌های مفید Inspector

| اتریبیوت | اثرش |
|---|---|
| `[SerializeField]` | یک فیلد خصوصی را در Inspector نشان می‌دهد |
| `[Header("Text")]`، `[Space]` | فیلدها را گروه‌بندی و فاصله‌دار می‌کند |
| `[Tooltip("Text")]` | راهنمای شناور روی فیلد |
| `[Range(0, 1)]`، `[Min(0)]` | اسلایدر و کمینهٔ مقدار |
| `[HideInInspector]` | سریالایز می‌شود ولی نشان داده نمی‌شود |
| `[RequireComponent(typeof(T))]` | کامپوننت را خودکار اضافه می‌کند |
| `[DisallowMultipleComponent]` | فقط یکی روی هر GameObject |
| `[ContextMenu("Name")]` | یک فرمان کلیک‌راست برای دیباگ اضافه می‌کند |

```csharp
[Header("Movement")]
[SerializeField, Min(0f)] private float speed = 5f;

private void OnValidate()          // runs in the Editor when values change
{
    speed = Mathf.Max(0f, speed);
}
```

`OnValidate` برای محدودکردن مقدارها و چک‌کردن ارجاع‌های خالی ایده‌آل است. `Reset` وقتی اجرا می‌شود که کامپوننت تازه اضافه یا ریست شود؛ برای پرکردن خودکار ارجاع‌ها مفید است.

## 10.6 کد مخصوص ادیتور

```csharp
#if UNITY_EDITOR
    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, attackRange);
    }
#endif
```

کدی که از namespace `UnityEditor` استفاده می‌کند **نمی‌تواند در بیلد بازیکن بیاید**. داخل `#if UNITY_EDITOR` بگذارش یا در پوشه‌ای به نام `Editor` (یا یک assembly definition محدود به پلتفرم ادیتور) قرارش بده، وگرنه بیلد شکست می‌خورد.

## 10.6.1 عادت‌هایی که وقت فریم ذخیره می‌کنند

- متدهای `Update` خالی را پاک کن. یونیتی هنوز صدایشان می‌زند.
- به‌جای چک‌کردن یک مقدار در هر فریم، از رویداد استفاده کن.
- ارجاع‌ها و نتیجه‌هایی را که مکرر می‌خوانی کش کن.
- کامپوننت‌هایی که لازم نداری را غیرفعال کن، به‌جای اینکه با `if` از منطقشان بپری.
- هیچ‌وقت داخل `Update` از `Find` یا `GetComponent` استفاده نکن، وقتی می‌توانی یک‌بار کش کنی.

> [recap] جمع‌بندی فصل ۱۰
> - ترتیب: `Awake`، `OnEnable`، `Start`، بعد `FixedUpdate`، `Update`، `LateUpdate` و در پایان `OnDisable` و `OnDestroy`.
> - در `OnEnable` عضو شو و در `OnDisable` بیرون بیا.
> - حرکت را در `Time.deltaTime` ضرب کن؛ برای فیزیک از `FixedUpdate` استفاده کن.
> - ارجاع‌های سریالایزشده را ترجیح بده. نتیجهٔ `GetComponent` را کش کن. از `Find` و `SendMessage` پرهیز کن.
> - به‌جای `tag ==` از `CompareTag` استفاده کن.
> - کد ادیتور را در `#if UNITY_EDITOR` بپیچ.

# 11. سریالایز و Inspector

سریالایز همان چیزی است که یونیتی با آن فیلدهای تو را داخل صحنه‌ها، پریفب‌ها و دارایی‌ها ذخیره می‌کند و در Inspector نشانشان می‌دهد. خیلی از باگ‌های «چرا مقدارم ریست شد؟» از نفهمیدن همین می‌آید.

## 11.1 یونیتی چه چیزی را سریالایز می‌کند

| سریالایز می‌کند | سریالایز نمی‌کند |
|---|---|
| فیلدهای `public` و فیلدهای `[SerializeField]` | پراپرتی‌ها (مگر با `[field: SerializeField]`) |
| `int`، `float`، `bool`، `string`، `enum` | فیلدهای `static`، `const` و `readonly` |
| نوع‌های یونیتی: `Vector3`، `Color`، `AnimationCurve`، `LayerMask` | `Dictionary<K,V>`، `HashSet<T>`، `Queue<T>` |
| ارجاع به نوع‌های `UnityEngine.Object` (پریفب، کامپوننت، ScriptableObject) | فیلدهای از نوع اینترفیس |
| کلاس‌ها و structهای `[Serializable]` | مجموعه‌های تو در تو مثل `List<List<int>>` |
| آرایه‌ها و `List<T>` از موارد بالا | مقدارهای چندریخت (فقط نوع اعلام‌شده می‌ماند) مگر با `[SerializeReference]` |

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

## 11.2 غافلگیری‌های رایج

- **مقدار Inspector بر مقداردهی اولیهٔ کد غلبه می‌کند.** `private int hp = 100;` فقط *مقدار پیش‌فرض کامپوننت‌های تازه* است. وقتی کامپوننت با مقدار دیگری ذخیره شد، عوض‌کردن کد روی شیءهای موجود اثری ندارد.
- **کلاس‌های سفارشی هیچ‌وقت null نمی‌شوند.** یک فیلد `[Serializable]` سریالایزشده با مقدارهای پیش‌فرض ساخته می‌شود، نه null.
- **تغییر نام یک فیلد داده‌اش را از دست می‌دهد**، چون یونیتی با اسم تطبیق می‌دهد. با `[FormerlySerializedAs]` دادهٔ قدیمی را نگه دار:

```csharp
using UnityEngine.Serialization;

[FormerlySerializedAs("hp")]
[SerializeField] private int maxHealth = 100;
```

- **`[HideInInspector]` هنوز سریالایز می‌شود؛** `[NonSerialized]` نه.
- **گراف‌های تودرتو یا دایره‌ای شیءها** پشتیبانی نمی‌شوند: سریالایز برای درخت داده است، نه برای شبکهٔ دلبخواهی از شیءها.

## 11.3 SerializeReference و اینترفیس‌ها

`[SerializeReference]` یک فیلد را با ارجاع ذخیره می‌کند و نوع واقعی‌اش را نگه می‌دارد؛ همین باعث می‌شود اینترفیس‌ها و لیست‌های چندریخت از کلاس‌های سادهٔ C# ممکن شوند:

```csharp
public interface IAbility { void Use(); }

[Serializable] public class Dash : IAbility { public void Use() { } }
[Serializable] public class Heal : IAbility { public void Use() { } }

public class Hero : MonoBehaviour
{
    [SerializeReference] private List<IAbility> abilities = new();
}
```

> [note] `SerializeReference` محدودیت دارد
> Inspector پیش‌فرض نمی‌تواند نمونه‌های واقعی را برایت بسازد. معمولاً به یک drawer سفارشی، یک پکیج یا کدی نیاز داری که لیست را پر کند. در خیلی از پروژه‌ها، یک `ScriptableObject` برای هر توانایی (یک دارایی که می‌توانی وصل کنی) ساده‌تر و مقاوم‌تر است.

## 11.4 سریالایزکردن دیکشنری

یونیتی نمی‌تواند `Dictionary` را سریالایز کند، ولی می‌توانی کلیدها و مقدارها را در دو لیست نگه داری و بعد از بارگذاری دیکشنری را بازسازی کنی:

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

از آن با یک نوع بستهٔ مشخص استفاده کن، مثل `SerializableMap<string, int>`.

> [recap] جمع‌بندی فصل ۱۱
> - فیلدها سریالایز می‌شوند اگر public یا `[SerializeField]` باشند و نوعشان پشتیبانی‌شده باشد.
> - پراپرتی‌ها، دیکشنری‌ها، اینترفیس‌ها و staticها سریالایز نمی‌شوند.
> - مقدار Inspector روی مقداردهی اولیهٔ کد اولویت دارد.
> - تغییر نام یک فیلد سریالایزشده به `[FormerlySerializedAs]` نیاز دارد.
> - `[SerializeReference]` چندریختی را ممکن می‌کند، ولی یک ScriptableObject برای هر حالت اغلب ساده‌تر است.

# 12. ScriptableObject و طراحی داده‌محور

**ScriptableObject** یک ظرف داده است که به‌جای GameObject، به‌شکل یک دارایی در پروژه‌ات زندگی می‌کند. می‌گذارد طراح‌ها بدون دست‌زدن به کد داده را عوض کنند و اشیای زیادی یک نسخهٔ مشترک از آن داده را به کار ببرند.

## 12.1 دادهٔ کانفیگ

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

دقت کن که داده از طریق **پراپرتی‌های فقط‌خواندنی** بیرون داده شده. فیلدها خصوصی‌اند، پس کد گیم‌پلی نمی‌تواند اشتباهی دارایی مشترک را عوض کند.

> [tip] طراحی داده‌محور
> عددها، اسم‌ها، پریفب‌ها و قاعده‌ها را داخل دارایی‌های ScriptableObject بگذار: آمار سلاح، تعریف دشمن، تنظیمات مرحله، جدول آیتم‌ها. این‌طوری اضافه‌کردن یک سلاح جدید یعنی ساختن یک دارایی، نه نوشتن کد. یک منبع حقیقت واحد هم برای بالانس‌کردن بازی داری.

## 12.2 دام حالت زمان اجرا

ScriptableObject یک **دارایی** است. در ادیتور، تغییرهایی که موقع Play روی آن می‌دهی **بعد از Stop هم می‌مانند** و هر شیئی که به آن دارایی ارجاع دارد همان داده را می‌بیند. در بیلد، این تغییرها با ریستارت اپ از بین می‌روند؛ پس رفتار ادیتور و بیلد با هم فرق می‌کند.

قاعده این است: **کانفیگ در دارایی می‌ماند؛ حالت زمان اجرا در شیءهای خودت.**

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

اگر مجبوری در زمان اجرا یک ScriptableObject را عوض کنی، روی یک کپی کار کن: `Instantiate(asset)`.

## 12.3 کانال‌های رویداد

یک ScriptableObject می‌تواند نقش یک رویداد مشترک را بازی کند و بگذارد دو شیء بدون شناختن هم یا شناختن صحنه با هم حرف بزنند.

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

> [warn] چرخیدن و همزمان عوض‌کردن
> اگر با `foreach` روی لیست شنونده‌ها بچرخی و یک شنونده وسط `Raise` خودش را بیرون بکشد، استثنا می‌گیری. چرخیدن از آخر به اول (یا روی یک کپی) این مشکل را حل می‌کند.

## 12.4 کاربردهای خوب دیگر

- **پایگاه دادهٔ آیتم، دشمن و مرحله** که طراح‌ها با اضافه‌کردن دارایی گسترشش می‌دهند.
- **متغیرهای مشترک** (یک `FloatVariable` که جان بازیکن را نگه می‌دارد و رابط کاربری و گیم‌پلی هر دو به آن ارجاع می‌دهند).
- **مجموعه‌های زمان اجرا** از شیءهای فعال (مثلاً همهٔ دشمنان) بدون یک مدیر singleton.
- **دارایی‌های توانایی یا رفتار** که به‌عنوان Strategy استفاده می‌شوند (فصل ۱۸).

در خود ScriptableObject از `OnValidate` استفاده کن تا مقدارها را محدود کنی و دربارهٔ دادهٔ نامعتبر هشدار بدهی. ولی برای داده‌ای که بین نمونه‌ها فرق می‌کند، برای دادهٔ ذخیره و به‌عنوان مخفی‌گاه حالت تغییرپذیر سراسری از ScriptableObject استفاده نکن.

> [interview] چرا برای داده ScriptableObject بهتر از MonoBehaviour است؟
> یک دارایی مستقل از صحنه‌ها است، پس اشیای زیادی یک نسخهٔ مشترک را به کار می‌برند (حافظهٔ کمتر، یک جای ویرایش)، طراح‌ها می‌توانند بدون کد ویرایشش کنند و به GameObject نیازی ندارد. بهایش این است که مشترک است: حالت تغییرپذیر زمان اجرا نباید داخلش زندگی کند.

> [recap] جمع‌بندی فصل ۱۲
> - ScriptableObjectها ظرف‌های دادهٔ مشترک مبتنی بر دارایی‌اند؛ برای کانفیگ ایده‌آل.
> - داده را با پراپرتی‌های فقط‌خواندنی بیرون بده.
> - حالت زمان اجرا را در شیءهای جداگانه‌ای نگه دار که از دارایی ساخته می‌شوند.
> - تغییر دارایی‌ها در حالت Play ادیتور باقی می‌ماند؛ بیلد رفتار دیگری دارد. حواست باشد.
> - کانال‌های رویداد ScriptableObject سیستم‌ها را جدا می‌کنند، ولی روی شنونده‌ها امن بچرخ.
