# 19. تزریق وابستگی و Service Locator

بیشتر کلاس‌ها برای انجام کارشان به اشیای دیگری نیاز دارند. اینکه **چطور** آن اشیا را به دست می‌آورند، تعیین می‌کند کدت چقدر انعطاف‌پذیر و تست‌پذیر است.

## 19.1 مشکل: وابستگی‌های سیم‌کشی‌شده

```csharp
public class LevelManager
{
    // Tied to one concrete class: cannot be replaced or tested
    private readonly FirebaseAnalyticsService analytics = new();

    public void CompleteLevel() => analytics.LogEvent("level_complete");
}
```

دست‌بردن به `Singleton.Instance` یا `FindObjectOfType` همان مشکل را دارد: وابستگی داخل بدنهٔ متد قایم شده است.

## 19.2 تزریق وابستگی

در **تزریق وابستگی (DI)**، یک کلاس اعلام می‌کند به چه چیزهایی نیاز دارد — معمولاً در سازنده‌اش — و کس دیگری آن‌ها را تأمین می‌کند.

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

حالا می‌شود سرویس واقعی، یک سرویس دیباگ یا یک fake تستی را پاس داد. جایی که اشیا را می‌سازد و به هم وصل می‌کند **composition root** نام دارد: یک نقطه (یک اسکریپت bootstrap) که همه‌چیز را سیم‌کشی می‌کند.

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

## 19.3 DI و MonoBehaviourها

یونیتی خودش `MonoBehaviour`ها را می‌سازد، پس سازنده‌ای که بتوانی استفاده کنی ندارند. گزینه‌ها:

- **تزریق متدی:** یک متد `Initialize(IService service)` که هر کسی که شیء را می‌سازد صدایش می‌زند.
- **ارجاع‌های سریالایزشده** به کامپوننت‌ها یا ScriptableObjectهای دیگر (ساده و رایج).
- **یک ظرف DI** که فیلدها، پراپرتی‌ها یا متدها را خودکار تزریق می‌کند.

## 19.4 Service Locator

**service locator** یک دفتر ثبت مرکزی است. کد بر اساس نوع، سرویسش را از آن می‌خواهد.

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

| تزریق وابستگی | Service Locator |
|---|---|
| وابستگی‌ها در سازنده دیده می‌شوند | وابستگی‌ها داخل بدنهٔ متدها قایم‌اند |
| تست‌کردن با mock و fake راحت است | تست‌کردن به آماده‌سازی و پاک‌سازی دفتر ثبت نیاز دارد |
| راه‌اندازی بیشتر، خصوصاً بدون ظرف | راه‌اندازی در یک پروژهٔ کوچک خیلی سریع است |
| خطاها در زمان سیم‌کشی معلوم می‌شوند | خطاها وقتی سرویس درخواست شود معلوم می‌شوند |

> [interview] چرا DI را ترجیح می‌دهی؟
> چون وابستگی‌ها صریح‌اند، کلاس صادقانه می‌گوید به چه نیاز دارد و در تست می‌توانم یک fake پاس بدهم. یک service locator می‌تواند در پروژهٔ کوچکی که سادگی مهم است انتخاب عملی باشد، ولی وابستگی‌ها را قایم می‌کند و تست‌کردن کد را سخت‌تر می‌کند.

## 19.5 ظرف‌های DI

یونیتی ظرف درون‌ساخت ندارد. گزینه‌های محبوب **VContainer** (سبک و سریع) و **Zenject / Extenject** (پرمکانات) هستند. نوع‌ها و طول عمرشان را ثبت می‌کنی (یک نمونهٔ واحد، نمونهٔ تازه هر بار، در هر صحنه) و ظرف خودش اشیا و وابستگی‌هایشان را می‌سازد. این‌ها در پروژه‌های بزرگ‌تر به درد می‌خورند؛ یک بازی کوچک کم پیش می‌آید که به یکی نیاز داشته باشد.

## 19.6 MonoBehaviour نازک

یک عادت معماری قدرتمند: تصمیم‌ها و قاعده‌ها را در **کلاس‌های سادهٔ C#** بگذار و `MonoBehaviour`ها را نازک نگه دار و کارشان فقط تطبیق‌دادن یونیتی (ورودی، ترنسفورم، فیزیک) با آن منطق باشد. کلاس‌های ساده را می‌توانی بی‌درنگ و بدون بارگذاری صحنه تست کنی.

> [recap] جمع‌بندی فصل ۱۹
> - وابستگی‌های سیم‌کشی‌شده (`new`، `Instance`، `Find`) کد را خشک و تست‌کردنش را سخت می‌کنند.
> - انتزاع‌ها (اینترفیس‌ها) را تزریق کن. همه‌چیز را در یک composition root سیم‌کشی کن.
> - Service locator سریع است ولی وابستگی‌ها را قایم می‌کند. آگاهانه استفاده‌اش کن.
> - منطق را در کلاس‌های سادهٔ C# و MonoBehaviourها را نازک نگه دار.

# 20. کد تمیز، ساختار پروژه و تست

کد بسیار بیشتر از آن‌که نوشته شود، خوانده می‌شود. ساختار یکدست و تست، برگشتن به یک پروژه بعد از یک وقفه را لذت‌بخش می‌کند.

## 20.1 قرارداد نام‌گذاری

قراردادهای C# مایکروسافت را که بیشتر تیم‌های یونیتی استفاده می‌کنند دنبال کن:

| المان | قرارداد | نمونه |
|---|---|---|
| کلاس، struct، enum، record | PascalCase | `PlayerHealth` |
| اینترفیس | `I` به‌علاوهٔ PascalCase | `IDamageable` |
| متد، پراپرتی، رویداد | PascalCase | `TakeDamage`، `Died` |
| متغیر محلی و پارامتر | camelCase | `damageAmount` |
| فیلد خصوصی | camelCase، یا `_camelCase`. **یک سبک انتخاب کن و پایدار بمان** | `health` یا `_health` |
| ثابت | PascalCase | `MaxLevel` |
| بولین | مثل یک پرسش خوانده شود | `isGrounded`، `hasKey`، `canJump` |
| متد ناهمگام | با `Async` تمام شود | `LoadSaveAsync` |
| هندلر رویداد | `On` یا `Handle` به‌علاوهٔ نام رویداد | `OnDied`، `HandleDeath` |
| نام فایل | همان نام کلاس | `PlayerHealth.cs` |

> [warn] نام فایل باید با MonoBehaviour مطابق باشد
> یک کلاس `MonoBehaviour` یا `ScriptableObject` باید در فایلی با **دقیقاً همان نام** کلاس باشد، وگرنه یونیتی نمی‌گذارد وصلش کنی.

## 20.2 ترتیب اعضا در یک کلاس

یک ترتیب یکدست، خواندن هر فایل را راحت می‌کند:

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

## 20.3 عادت‌های کد تمیز

- **نام‌های گویا** از کامنت بهترند. `float timeUntilNextShot` توضیح لازم ندارد.
- **متدهای کوچک** که یک کار را در یک سطح از جزئیات انجام می‌دهند.
- **کامنت باید «چرا» را بگوید**، نه «چه». کد کامنت‌شده را پاک کن (کنترل نسخه یادش می‌ماند).
- **عدد جادویی نداشته باش.** به‌صورت ثابت نام‌گذاری کن یا در یک ScriptableObject بگذار.
- **از تکرار پرهیز کن**، ولی زیادی زود انتزاع نساز.
- **از شرط‌های نگهبان استفاده کن** به‌جای تو در توی عمیق:

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

- **مستندسازی XML** (`///`) روی APIهای عمومی که دیگران استفاده می‌کنند.
- `[SerializeField] private` را به فیلدهای `public` ترجیح بده.

## 20.4 ساختار پروژه

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

- **namespaceهایی** که آینهٔ پوشه‌ها هستند (`MyGame.Combat`) جلوی تصادم نام‌ها را می‌گیرند.
- **Assembly Definition** (فایل `.asmdef`) کد را به اسمبلی‌های جدا می‌شکند. این کار کامپایل دوباره را سریع‌تر می‌کند (فقط اسمبلی‌های تغییرکرده دوباره ساخته می‌شوند) و مرزها را تحمیل می‌کند: کد گیم‌پلی نمی‌تواند اشتباهی به کد ادیتور یا رابط کاربری ارجاع بدهد.
- وقتی پروژه بزرگ شد، بر اساس **فیچر** گروه‌بندی کن تا همه‌چیز یک فیچر کنار هم باشد.
- برای بارگذاری محتوا در زمان اجرا از پوشهٔ `Resources` پرهیز کن. از ارجاع مستقیم یا Addressables استفاده کن.

## 20.5 کنترل نسخه برای یونیتی

- در *Project Settings > Editor* گزینهٔ **Asset Serialization** را روی *Force Text* و **Version Control** را روی *Visible Meta Files* بگذار.
- **فایل‌های `.meta` را کامیت کن.** آن‌ها همان GUIDهایی را نگه می‌دارند که دارایی‌ها را به هم وصل می‌کند.
- پوشه‌های تولیدشده را ignore کن: `Library/`، `Temp/`، `Obj/`، `Logs/`، `Build/` و تنظیمات مخصوص کاربر. از یک قالب `.gitignore` مخصوص یونیتی شروع کن.
- برای دارایی‌های باینری بزرگ (تکسچر، صدا، مدل) از **Git LFS** استفاده کن.
- تصادم‌های merge را کم کن: در **پریفب** و صحنه‌های افزودنی کار کن نه در یک صحنهٔ بزرگ مشترک، تغییرهای کوچک را زیاد کامیت کن و از ابزار merge یونیتی برای YAML استفاده کن.

## 20.6 تست

**Unity Test Framework** از NUnit استفاده می‌کند. تست‌های **Edit Mode** بدون وارد شدن به حالت Play و بی‌درنگ اجرا می‌شوند که برای منطق سادهٔ C# ایده‌آل است. تست‌های **Play Mode** در یک صحنهٔ واقعی اجرا می‌شوند و می‌توانند از کوروتین `[UnityTest]` استفاده کنند.

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

- تست‌ها را بر اساس رفتار نام‌گذاری کن: `Method_Condition_Result`.
- در هر تست از **Arrange, Act, Assert** استفاده کن.
- تست‌ها به assembly definition مخصوص خودشان نیاز دارند که به اسمبلی کدت ارجاع بدهد.
- منطق در کلاس‌های سادهٔ C# (فصل‌های ۱۸ و ۱۹) همان چیزی است که این کار را راحت می‌کند.

> [recap] جمع‌بندی فصل ۲۰
> - قرارداد نام‌گذاری استاندارد را دنبال کن؛ برای کامپوننت‌های یونیتی نام فایل برابر نام کلاس است.
> - ترتیب اعضا را یکدست نگه دار، متدها کوچک، شرط‌های نگهبان، بدون عدد جادویی.
> - بر اساس فیچر سازمان بده، از namespace و assembly definition استفاده کن.
> - Force Text و فایل‌های `.meta` قابلمشاهده را روشن کن؛ `.meta` را کامیت کن؛ برای دارایی‌های بزرگ LFS.
> - منطق سادهٔ C# را با تست‌های Edit Mode تست کن.

# 21. دیباگ و خطاهای رایج

دیباگ یک مهارت است: فرضیه بساز، امتحانش کن و مسئله را تنگ‌تر کن. این فصل ابزارها و جدولی از خطاهایی را می‌دهد که بیشتر با آن‌ها روبه‌رو می‌شوی.

## 21.1 لاگ و دیباگ بصری

```csharp
Debug.Log("Info");
Debug.LogWarning("Something looks wrong");
Debug.LogError("Something failed", this);   // 'this' highlights the object
Debug.LogException(ex);

Debug.DrawLine(origin, target, Color.red, 2f);   // visible in Scene view
Debug.DrawRay(origin, direction, Color.green);
```

- روی یک پیام Console که شیء context دارد کلیک کن تا آن شیء در Hierarchy **برجسته (ping)** شود.
- **Gizmoها** (`OnDrawGizmos`، `OnDrawGizmosSelected`) بردها و مسیرها را در نمای Scene می‌کشند.
- از **Collapse** و فیلترهای Console استفاده کن و پاک‌کردن در حالت Play را روشن کن.
- برای بیلد نهایی لاگ‌کردن را با یک کمک‌کار `[Conditional]` بپیچ (فصل ۱۴).
- **حالت Debug در Inspector** (از منوی Inspector) فیلدهای خصوصی را نشان می‌دهد، که بدون دست‌زدن به کد به‌کار می‌آید.

## 21.2 استفاده از دیباگر

لاگ سریع است ولی کندوکاو نمی‌کند. دیباگر می‌گذارد همه‌چیز را نگه داری و بررسی کنی.

1. IDE خودت (Visual Studio، Rider یا VS Code) را به ادیتور یونیتی وصل کن.
2. روی یک خط **breakpoint** بگذار و وارد حالت Play شو. اجرا همان‌جا نگه می‌دارد.
3. متغیرها و **call stack** را ببین و کد را قدم‌به‌قدم جلو ببر (step over، step into، step out).
4. از **breakpoint شرطی** (فقط وقتی `health < 0` نگه دار) و **watch expression** استفاده کن.
5. برای بیلد دستگاه، *Development Build* و *Script Debugging* را روشن کن.

## 21.3 خطاهایی که به آن‌ها می‌خوری

| خطا | علت معمولش | رفعش |
|---|---|---|
| `NullReferenceException` | یک فیلد Inspector پر نشده، یک کامپوننت غایب است یا شیئی نابود شده | در `Awake` اعتبارسنجی کن، `TryGetComponent` بزن، `!= null` را چک کن |
| `UnassignedReferenceException` | یک ارجاع سریالایزشده در Inspector خالی مانده | پرش کن؛ با `OnValidate` هشدار بده |
| `MissingReferenceException` | استفاده از شیء بعد از نابودی (اغلب `-=` فراموش‌شده) | در `OnDisable` بیرون بیا، قبل از استفاده شیء را چک کن |
| `MissingComponentException` | `GetComponent` چیزی برنگردانده و نتیجه استفاده شده | `[RequireComponent]` یا `TryGetComponent` |
| `IndexOutOfRange`، `ArgumentOutOfRange` | اندیس بیرون از لیست یا آرایه | `Count` یا `Length` را چک کن |
| `KeyNotFoundException` | کلید غایب در دیکشنری | از `TryGetValue` استفاده کن |
| `InvalidOperationException: Collection was modified` | عوض‌کردن مجموعه وسط `foreach` | از آخر به اول بچرخ یا `RemoveAll` بزن |
| `StackOverflowException` | بازگشت بی‌پایان، مثلاً `public int X { get => X; }` | فیلد پشتیبان را برگردان، بازگشت را درست کن |
| اسکریپت وصل نمی‌شود یا «class not derived from MonoBehaviour» | نام فایل با نام کلاس فرق دارد | نام فایل یا کلاس را یکی کن |
| «... can only be called from the main thread» | یک API یونیتی از یک ترد پس‌زمینه استفاده شده | اول به ترد اصلی برگرد (فصل ۱۳) |
| `CS1612` | تغییر یک struct که از پراپرتی برگشته (`transform.position.y = 1`) | در یک متغیر محلی کپی کن، عوضش کن، برگردانش |
| `CS0246` | `using` یا ارجاع اسمبلی غایب است | namespace یا ارجاع assembly definition را اضافه کن |
| `CS0120` | به عضو نمونه طوری دسترسی شده که انگار static است | از یک نمونه استفاده کن یا عضو را static کن |
| `CS0518` (`IsExternalInit`) | record یا `init` بدون آن تعریف کوچک استفاده شده | نوع `IsExternalInit` را تعریف کن (فصل ۹) |

## 21.4 یک روند دیباگ که جواب می‌دهد

1. **بازتولید** کن، آن هم قابل‌اعتماد. اگر نتوانی مشکلی را بازتولید کنی، نمی‌توانی مطمئن شوی حلش کرده‌ای.
2. پیام خطا و خط‌های بالای stack trace را **بخوان**. روی پیام دوبار کلیک کن تا سر کد بروی.
3. یک **فرضیه بساز** («این ارجاع null است چون...») و با یک لاگ یا breakpoint امتحانش کن. کورکورانه کد را عوض نکن.
4. **جدا کن:** سیستم‌ها را غیرفعال کن یا با کنترل نسخه همان تغییری را پیدا کن که باگ را آورد.
5. **ریشه را درست کن**، نه نشانه را؛ و به فکر اضافه‌کردن یک تست یا assertion باش تا بی‌صدا برنگردد.

`Debug.Assert(condition, "message")` و `UnityEngine.Assertions.Assert` فرض‌ها را در ادیتور و بیلد توسعه بررسی می‌کنند و از بیلد ریلیز حذف می‌شوند.

> [recap] جمع‌بندی فصل ۲۱
> - از لاگ با شیء context، Debug.Draw و Gizmo برای جواب‌های سریع و از دیباگر برای مسائل سخت استفاده کن.
> - استثناهای رایج و اینکه هر کدام معمولاً یعنی چه را یاد بگیر.
> - بازتولید کن، فرضیه بساز، جدا کن، ریشه را درست کن و از برگشتنش جلوگیری کن.
