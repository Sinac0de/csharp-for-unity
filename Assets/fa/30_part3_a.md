@part بخش سوم — معماری | ساختاربندی کد طوری که یک پروژه بتواند رشد کند: اصول، الگوها، مدیریت وابستگی، کد تمیز، تست و دیباگ.

# 17. اصول SOLID و طراحی

معماری خوب یعنی گران‌نبودن تغییر. SOLID مجموعه‌ای از پنج اصل است که تو را به سمت کدی می‌برد که گسترش دادن، تست کردن و فهمیدنش راحت است.

## 17.1 پنج اصل

| | اصل | یعنی | نمونه در یونیتی |
|---|---|---|---|
| S | مسئولیت واحد | کلاس یک دلیل برای تغییر دارد | `PlayerHealth` فقط جان را مدیریت می‌کند، نه ورودی و صدا و رابط کاربری |
| O | باز/بسته | رفتار را بدون دست‌زدن به کد موجود گسترش بده | سلاح جدید = کلاس جدید، کد تیراندازی دست‌نخورده |
| L | جانشینی لیسکوف | زیرنوع باید هر جایی که نوع پایه انتظار می‌رود کار کند | هر `EnemyBase` بدون حالت خاص قابل استفاده است |
| I | تفکیک اینترفیس | اینترفیس‌های کوچک و متمرکز | `IDamageable` جدا از `IInteractable` |
| D | وارونگی وابستگی | به انتزاع وابسته شو، نه به کلاس‌های مشخص | `PlayerController` از `IInputService` استفاده می‌کند، نه از یک کلاس کیبورد |

## 17.2 S: مسئولیت واحد

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

> [tip] یک آزمون سریع
> اگر نمی‌توانی کار یک کلاس را بدون استفاده از «و» توصیف کنی، احتمالاً بیش از یک مسئولیت دارد. کلاس‌های بزرگ «Manager» که از همه‌چیز سر در می‌آورند نشانهٔ معمولش هستند.

## 17.3 O و L: باز/بسته و لیسکوف

بر خلاف یک انتزاع برنامه بنویس، تا اضافه‌شدن یک حالت جدید به ویرایش کدی که از آن استفاده می‌کند نیاز نداشته باشد:

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

**لیسکوف** وقتی نقض می‌شود که یک کلاس مشتق قول‌های کلاس پایه‌اش را بشکند:

```csharp
public class Chest { public virtual void AddItem(Item i) { /* ... */ } }

// Breaks callers that expect AddItem to work
public class LockedChest : Chest
{
    public override void AddItem(Item i)
        => throw new NotSupportedException();
}
```

اگر یک زیرکلاس مجبور است استثنا بدهد یا یک رفتار پایه را نادیده بگیرد، سلسله‌مراتب غلط است. انتزاع را بشکن (مثلاً یک `IAcceptsItems` جدا) یا از ترکیب استفاده کن.

## 17.4 I و D: اینترفیس‌های کوچک و انتزاع

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

`IInputService` می‌تواند با کیبورد، گیم‌پد، لمس یا یک fake که در تست‌ها استفاده می‌شود پیاده شود، و `PlayerController` هیچ‌وقت عوض نمی‌شود.

## 17.5 اصول دیگری که ارزش دانستن دارند

| اصل | ایده |
|---|---|
| DRY | دانش را تکرار نکن. منطق مشترک را بیرون بکش |
| KISS | ساده نگهش دار. ساده‌ترین طراحی‌ای که کار می‌کند |
| YAGNI | چیزی را «محض احتیاط» نساز |
| بگو، نپرس | به شیء بگو کاری را انجام بدهد؛ داده‌اش را بیرون نکش و خودت برایش تصمیم نگیر |
| قانون دیمیتر | از زنجیره‌های بلند مثل `a.b.c.d.DoThing()` پرهیز کن |
| ترکیب به‌جای وراثت | رفتار را از قطعه‌ها بساز (فصل ۳) |
| جداسازی دغدغه‌ها | داده، منطق و نمایش در جای خودشان زندگی کنند |

> [warn] بیش از حد مهندسی نکن
> اصول ابزارند، نه هدف. یک بازی گیم‌جم یا پروتوتایپ به اینترفیس برای همه‌چیز نیاز ندارد. ساده شروع کن و انتزاع را وقتی معرفی کن که درد واقعی‌اش را حس کردی: یک پیاده‌سازی دوم ظاهر شود، یک کلاس تست‌کردنش سخت شود، یا تغییری به خیلی از فایل‌ها سرایت کند.

> [interview] SRP و DIP را با یک مثال بازی توضیح بده
> SRP: `PlayerHealth` جان را مدیریت می‌کند، در حالی که ورودی، انیمیشن و صدا کامپوننت‌های جدا هستند، پس عوض‌کردن یکی ریسکی برای بقیه نمی‌سازد. DIP: `LevelManager` به `IAnalyticsService` وابسته است، نه به `FirebaseAnalyticsService`، پس می‌توانم سرویس‌دهنده را عوض کنم یا در تست‌ها یک fake بگذارم.

> [recap] جمع‌بندی فصل ۱۷
> - SOLID: یک کار برای هر کلاس، گسترش بده به‌جای ویرایش، قول‌های کلاس پایه را نگه دار، اینترفیس‌های کوچک، وابستگی به انتزاع.
> - ترکیب، رویدادها و اینترفیس‌ها همان چیزی هستند که این اصول را در یونیتی نشان می‌دهند.
> - اول سادگی؛ انتزاع را وقتی درد واقعی ظاهر شد اضافه کن.

# 18. الگوهای طراحی در یونیتی

الگوهای طراحی راه‌حل‌های آزموده‌شده برای مسائل تکرارشونده‌اند. شناختنشان به تو واژگان مشترک می‌دهد و از اینکه هر بار ساختارها را از نو اختراع کنی نجاتت می‌دهد.

## 18.1 نمای کلی

| الگو | چه مشکلی را حل می‌کند | کاربرد معمولش در یونیتی |
|---|---|---|
| State | رفتار با حالت داخلی عوض می‌شود | حالت‌های بازیکن یا دشمن، جریان بازی |
| Strategy | تعویض یک الگوریتم در زمان اجرا | حرکت هوش مصنوعی، سختی، فرمول آسیب |
| Observer | خبر دادن به بقیه بدون وابستگی | جان عوض شد، امتیاز عوض شد |
| Factory | ساختن شیء بدون وابستگی به نوع مشخص | اسپاون دشمن یا آیتم |
| Command | نمایش کارها به شکل شیء | undo، replay، بافر کردن ورودی |
| Object Pool | بازاستفاده از شیءها | گلوله‌ها، افکت‌ها، پاپ‌آپ‌ها |
| Singleton | دقیقاً یک نمونهٔ سراسری | صدا، بوت‌استرپ بازی (با احتیاط) |
| Service Locator | یک دفتر مرکزی از سرویس‌ها | دسترسی به سرویس‌های مشترک |
| MVP | جدا کردن رابط کاربری از منطق | HUD، منوها، صفحهٔ کیف |

## 18.2 State

وقتی به کارش ببر که رفتار یک شیء بسته به حالتش فرق می‌کند و گذارهای روشنی دارد (ایستاده، راه‌رفتن، پرش، حمله). هر حالت یک کلاس با `Enter` و `Tick` و `Exit` است.

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

> [perf] حالت‌ها را یک‌بار بساز
> شیءهای حالت را یک‌بار (همان‌طور که در کد بالا آمده) تخصیص بده و دوباره به کارشان ببر. نوشتن `ChangeState(new WalkState())` در هر گذار زباله تولید می‌کند.

برای چند حالت پیش‌پاافتاده، یک `enum` با `switch` ساده‌تر است. وقتی هر حالت منطق و دادهٔ خودش را دارد، سراغ کلاس‌های State برو.

## 18.3 Strategy

وقتی به کارش ببر که چند الگوریتم قابل‌جانشینی یک کار را انجام می‌دهند. برخلاف State، الگوریتم از بیرون انتخاب می‌شود و خودش را عوض نمی‌کند.

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

یک دشمن یک `IMoveStrategy` نگه می‌دارد و هر فریم صدایش می‌زند. برای عوض‌کردن رفتار (تعقیب کن، و وقتی جانش کم شد فرار کن) یک استراتژی دیگر بده. این کار زنجیره‌های در حال رشد `if/else` را با کلاس‌های کوچک و تست‌پذیر جایگزین می‌کند.

> [interview] State یا Strategy؟
> Strategy: الگوریتم‌های قابل‌جانشینی که از بیرون انتخاب می‌شوند (هوش مصنوعی آسان در برابر سخت). State: رفتاری که به حالت فعلی شیء بستگی دارد و بین حالت‌ها گذار وجود دارد (Idle، Walk، Attack). ساختارشان شبیه است؛ نیتشان فرق دارد.

## 18.4 Observer

الگوی Observer در خود C# جا گرفته، به شکل `event` (فصل ۶). منتشرکننده چیزی را اعلام می‌کند و هر تعداد شنونده واکنش می‌دهد. برای جان، امتیاز، پیشرفت مأموریت و به‌روزرسانی رابط کاربری استفاده‌اش کن. آن قاعدهٔ طلایی را یادت باشد: **در `OnEnable` عضو شو و در `OnDisable` بیرون بیا**.

## 18.5 Factory

یک factory ساخت شیء را متمرکز می‌کند تا صدازننده‌ها به پریفب یا کلاس‌های مشخص وابسته نباشند.

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

Command یک کار را به یک شیء تبدیل می‌کند و همین undo و replay و بافر کردن ورودی و شبکه را ممکن می‌کند.

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

Singleton تضمین می‌کند یک نمونه با دسترسی سراسری وجود داشته باشد. در یونیتی برای مدیرها محبوب است و در عین حال پراستفاده‌ترین الگویی که بیش از حد به کار می‌رود.

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

متد `ResetStatics` وقتی مهم می‌شود که *Reload Domain* در ادیتور خاموش باشد، چون در غیر این صورت نمونهٔ قبلی بین دو بار Play زنده می‌ماند.

| مشکل | چرا بد است |
|---|---|
| وابستگی‌های پنهان | هر کلاسی می‌تواند به آن برسد، پس نمی‌فهمی یک کلاس به چه چیزهایی وابسته است |
| تست‌کردن سخت | نمی‌توانی راحت با یک fake جایگزینش کنی |
| باگ‌های چرخهٔ عمر و ترتیب | ممکن است هنوز وجود نداشته باشد، یا با تغییر صحنه نابود شود |
| حالت سراسری | هر کسی می‌تواند عوضش کند، پس ردیابی باگ‌ها سخت می‌شود |
| تبدیل به «شیء خدا» | همه‌چیز به `GameManager` اضافه می‌شود |

> [tip] کِی Singleton قابل قبول است
> برای سرویس‌های واقعاً یکتا و ساده در یک پروژهٔ کوچک (صدا، ورودی). حتی همان موقع هم پشت یک اینترفیس پنهانش کن، کوچک نگهش دار و هر چه پروژه بزرگ‌تر می‌شود تزریق وابستگی یا service locator را ترجیح بده (فصل ۱۹).

## 18.8 MVP برای رابط کاربری

**Model-View-Presenter** منطق رابط کاربری را تست‌پذیر نگه می‌دارد. **model** داده و قاعده‌ها را دارد، **view** یک MonoBehaviour ساده است که چیزها را نشان می‌دهد، و **presenter** یک کلاس سادهٔ C# است که آن دو را وصل می‌کند.

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

presenter را می‌توان بدون صحنه و با پاس‌دادن یک `IHealthView` قلابی تست کرد.

> [recap] جمع‌بندی فصل ۱۸
> - State: رفتار وابسته به حالت؛ Strategy: الگوریتم قابل‌تعویض؛ Observer: رویدادها؛ Factory: ساخت؛ Command: کارها به شکل شیء.
> - شیءهای State و Strategy را یک‌بار بساز و دوباره به کارشان ببر.
> - Singleton راحت است و گران؛ کمش کن، کوچکش کن و پشت اینترفیس پنهانش کن.
> - MVP منطق را در کلاس‌های سادهٔ C# نگه می‌دارد که تست‌کردنشان راحت است.
