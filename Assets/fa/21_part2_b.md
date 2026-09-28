# 13. کوروتین، async/await و تردها

بازی مدام منتظر می‌ماند: منتظر یک تایمر، جواب سرور، بارگذاری یک صحنه. یونیتی چند ابزار برای این کار دارد و انتخاب ابزار درست مهم است.

## 13.1 کدام ابزار برای کدام کار

| | کوروتین | `async` / `Task` | `Awaitable` | `Thread` |
|---|---|---|---|---|
| کجا اجرا می‌شود | ترد اصلی | ترد اصلی، یا یک ترد از استخر داخل `Task.Run` | ترد اصلی؛ می‌تواند ترد عوض کند | ترد خودش |
| API یونیتی امن است | بله | بعد از `await` روی ترد اصلی بله؛ داخل `Task.Run` نه | روی ترد اصلی بله | نه |
| مقدار برمی‌گرداند | نه | بله | بله | مستقیم نه |
| خودکار متوقف می‌شود | وقتی GameObject غیرفعال یا نابود شود | نه (با token) | نه (با token) | نه |
| بهترین کاربردش | دنباله‌های فریم‌محور، تایمرها، افکت‌ها | ورودی/خروجی، شبکه، ترکیب کارهای ناهمگام | کد ناهمگام یونیتی‌پسند | محاسبات سنگین و خالص C# |

> [interview] کوروتین یک ترد است؟
> نه. کوروتین روی ترد اصلی اجرا می‌شود و یونیتی همان جایی که `yield` می‌کنی ادامه‌اش می‌دهد. به تو «صبر کن، بعد ادامه بده» می‌دهد بدون اینکه چیزی را قفل کند، ولی هیچ کار موازی‌ای انجام نمی‌دهد.

## 13.2 کوروتین‌ها

```csharp
private Coroutine routine;
private static readonly WaitForSeconds Delay = new WaitForSeconds(0.5f);

private void OnEnable()  => routine = StartCoroutine(SpawnLoop());
private void OnDisable()
{
    if (routine != null) StopCoroutine(routine);
}

private IEnumerator SpawnLoop()
{
    while (true)
    {
        SpawnEnemy();
        yield return Delay;
    }
}
```

| `yield return ...` | کِی ادامه می‌دهد |
|---|---|
| `null` | فریم بعد |
| `new WaitForSeconds(t)` | بعد از `t` ثانیه از زمان مقیاس‌شده |
| `new WaitForSecondsRealtime(t)` | بعد از `t` ثانیهٔ واقعی (بی‌توجه به `timeScale`) |
| `new WaitForFixedUpdate()` | در گام فیزیک بعدی |
| `new WaitForEndOfFrame()` | بعد از رندر شدن فریم |
| `new WaitUntil(() => ready)` / `WaitWhile` | وقتی یک شرط درست / نادرست شود |
| `StartCoroutine(Other())` | وقتی کوروتین دیگر تمام شود |
| یک `AsyncOperation` یا درخواست وب | وقتی عملیات کامل شود |

نکته‌هایی که باید یادت باشد:

- یک کوروتین متعلق به همان `MonoBehaviour`ی است که شروعش کرده. وقتی آن **GameObject** غیرفعال یا نابود شود، کوروتین هم می‌ایستد. غیرفعال‌کردن فقط همان *کامپوننت* کوروتین را **متوقف نمی‌کند**.
- کوروتین‌ها نمی‌توانند مقدار برگردانند و یک استثنا کوروتین را تمام می‌کند.
- شیءهای `WaitForSeconds` را که دوباره استفاده می‌کنی کش کن؛ ساختن یکی در هر دور حلقه تخصیص می‌گیرد.
- برای منوهای pause از `WaitForSecondsRealtime` استفاده کن، چون `WaitForSeconds` وقتی `timeScale` صفر است می‌خوابد.

## 13.3 async و await

```csharp
public async Task<int> LoadScoreAsync(CancellationToken token)
{
    await Task.Delay(100, token);     // stands in for a server request
    return 100;
}
```

```csharp صدا زدنش به‌شکل امن از یونیتی
private async void Start()            // Unity messages may be async void
{
    try
    {
        int score = await LoadScoreAsync(destroyCancellationToken);
        scoreText.text = score.ToString();   // back on the main thread
    }
    catch (OperationCanceledException) { }   // object was destroyed
}
```

قاعده‌هایی که بیشتر باگ‌های async در یونیتی را جلویشان می‌گیرند:

- یونیتی یک synchronization context دارد، پس بعد از `await` روی ترد اصلی، کدت **روی ترد اصلی ادامه می‌یابد** و می‌توانی از APIهای یونیتی استفاده کنی.
- کد داخل `Task.Run(...)` روی یک **ترد از استخر ترد** اجرا می‌شود. نباید به شیءهای یونیتی مثل `transform` دست بزند.
- **هیچ‌وقت** ترد اصلی را با `.Result` یا `.Wait()` قفل نکن. می‌تواند بازی را فریز کند یا به deadlock بخورد.
- `async Task` یا `async Task<T>` را ترجیح بده. از `async void` فقط برای نقطه‌های ورودی به سبک handler مثل `Start` استفاده کن و بدنه‌اش را در `try/catch` بپیچ.
- **Taskها با نابودشدن شیء یا بیرون‌آمدن از حالت Play لغو نمی‌شوند.** به کارشان ادامه می‌دهند. یک `CancellationToken` پاس بده. روی `MonoBehaviour`، خود `destroyCancellationToken` (یونیتی 2022.2 و بالاتر) وقتی شیء نابود شود خودکار لغو می‌شود.
- `Task.Delay` از زمان واقعی استفاده می‌کند و `Time.timeScale` را نادیده می‌گیرد.
- WebGL چندریسمانی را پشتیبانی نمی‌کند، پس آنجا به `Thread` یا `Task.Run` تکیه نکن.

```csharp اجرای موازی کارها و لغو کردنشان
private CancellationTokenSource cts;

public async Task LoadAllAsync()
{
    cts = new CancellationTokenSource();
    await Task.WhenAll(
        LoadPlayerAsync(cts.Token),
        LoadInventoryAsync(cts.Token),
        LoadSettingsAsync(cts.Token));
}

public void Cancel()
{
    cts?.Cancel();
    cts?.Dispose();
    cts = null;
}
```

```csharp کار سنگین CPU روی یک ترد پس‌زمینه
// Pure C# data only: no Unity objects inside the lambda
int result = await Task.Run(() => HeavyCalculation(data));

// Here we are back on the main thread and may use Unity APIs
resultText.text = result.ToString();
```

## 13.4 Awaitable

`Awaitable` (از یونیتی 2023.1 و یونیتی 6 به بعد) نوع `await`پذیر خودِ یونیتی است. با حلقهٔ بازیکن یکپارچه است و طوری طراحی شده که کمتر از `Task` حافظه بگیرد.

```csharp
private async Awaitable FlashAsync()
{
    await Awaitable.WaitForSecondsAsync(0.5f, destroyCancellationToken);
    await Awaitable.NextFrameAsync(destroyCancellationToken);
}
```

کمک‌کارهای مرتبط: `Awaitable.BackgroundThreadAsync()` به یک ترد پس‌زمینه می‌رود و `Awaitable.MainThreadAsync()` به ترد اصلی برمی‌گردد. روی یک نمونهٔ `Awaitable` دو بار `await` نزن، چون نمونه‌ها از استخر می‌آیند. خیلی از تیم‌ها از کتابخانهٔ ثالث **UniTask** هم برای کد ناهمگام بدون تخصیص روی همهٔ نسخه‌های یونیتی استفاده می‌کنند.

## 13.5 تردها و ایمنی ترد

```csharp
var worker = new Thread(() => HeavyCalculation());
worker.Start();
```

بیشتر APIهای یونیتی فقط از **ترد اصلی** قابل صدا زدن‌اند. ریاضیات سادهٔ C# و ساختارهای دادهٔ خودت روی تردهای دیگر مشکلی ندارند، ولی دادهٔ مشترک به محافظت نیاز دارد (`lock`، `Interlocked` یا مجموعه‌های همزمان). یک الگوی رایج، برگرداندن نتیجه به ترد اصلی از طریق یک صف است:

```csharp
private readonly ConcurrentQueue<Action> mainThreadQueue = new();

// Any thread:
public void RunOnMain(Action a) => mainThreadQueue.Enqueue(a);

// Main thread:
private void Update()
{
    while (mainThreadQueue.TryDequeue(out Action a)) a();
}
```

> [note] Jobها و Burst
> برای حجم زیاد محاسبات عددی روی تعداد زیادی آیتم (هزاران عامل، مش‌های رویه‌ای)، یونیتی **C# Job System** را همراه **NativeArray** و کامپایلر **Burst** دارد. این‌ها کد را ایمن و خیلی سریع موازی اجرا می‌کنند، ولی محدودیت‌هایی روی نوع داده‌های قابل‌استفاده دارند. اول پایه‌های همین فصل را یاد بگیر، بعد وقتی پروفایل نشان داد لازم داری سراغ Jobها برو.

> [interview] می‌توانم داخل یک Task یک transform را عوض کنم؟
> عموماً نه. APIهای یونیتی فقط روی ترد اصلی کار می‌کنند. محاسبه را در پس‌زمینه انجام بده و بعد نتیجه را روی ترد اصلی اعمال کن (بعد از `await` کد روی ترد اصلی است).

> [recap] جمع‌بندی فصل ۱۳
> - کوروتین‌ها روی ترد اصلی اجرا می‌شوند و برای زمان‌بندی فریم‌محور ایده‌آل‌اند. با GameObject می‌ایستند، نه با کامپوننت.
> - `async/await` برای ورودی/خروجی و ترکیب کارها می‌درخشد؛ توکن لغو پاس بده.
> - کد داخل `Task.Run` نباید به شیءهای یونیتی دست بزند. هیچ‌وقت با `.Result` یا `.Wait()` قفل نکن.
> - از `destroyCancellationToken` (یا توکن خودت) استفاده کن تا کار با نابودشدن شیءها بایستد.
> - `Awaitable` گزینهٔ بومی یونیتی در یونیتی 6 است؛ UniTask جایگزین محبوبی است.

# 14. حافظه، جمع‌آوری زباله و کارایی

بازیکن‌ها پرش زمان فریم و لگ را بیشتر از یک نرخ فریم پایین ولی یکنواخت حس می‌کنند. بیشتر این پرش‌ها در کد C# از **جمع‌آوری زباله (GC)** می‌آید، پس این فصل دربارهٔ کمتر تخصیص دادن و درست اندازه‌گیری کردن است.

## 14.1 جمع‌آوری زباله چه بلایی سر بازی می‌آورد

هر شیء نوع ارجاعی که می‌سازی (`new`، رشته‌ها، آرایه‌ها، لیست‌ها، بسته‌ها، بوکس‌ها) روی هیپ می‌نشیند. وقتی هیپ پر شود، Garbage Collector کار را نگه می‌دارد تا شیءهایی را که کسی به آن‌ها ارجاع ندارد پیدا و آزاد کند. یونیتی از جمع‌کنندهٔ Boehm-Demers-Weiser استفاده می‌کند و **حالت incremental** به‌طور پیش‌فرض روشن است. حالت incremental کار را روی چند فریم پخش می‌کند و اندازهٔ هر پرش را کم می‌کند، ولی کدی که مدام تخصیص می‌دهد هنوز هم وقت CPU و حافظه می‌خورد.

> [interview] چرا GC برای بازی‌ها مشکل است؟
> چون جمع‌آوری وقت CPU می‌گیرد و می‌تواند وسط یک فریم بیفتد و لگ بسازد. هر چه در هر فریم زبالهٔ بیشتری بسازی، بیشتر و طولانی‌تر اجرا می‌شود. بازی‌ای که هدفش ۶۰ فریم است، هر فریم ۱۶٫۶ میلی‌ثانیه بودجه دارد و هر فریمی که از این بودجه رد شود، پرش محسوب می‌شود.

## 14.2 تخصیص‌ها از کجا می‌آیند

| منبع | راه بهتر |
|---|---|
| `new List<T>()`، `new T[]`، نمونه‌های `new` داخل `Update` | یک‌بار بساز، بازاستفاده کن، `Clear()` بزن |
| الحاق رشته، درون‌گذاری، `ToString()` در هر فریم | متن را فقط وقتی مقدار عوض شد به‌روز کن؛ `StringBuilder`؛ `SetText` در TextMeshPro |
| بوکس‌کردن یک نوع مقداری به `object` | جنریک؛ از پارامترهای `object` پرهیز کن |
| لامبداهایی که متغیر می‌گیرند؛ متدهایی که به‌عنوان دیلیگیت پاس می‌شوند | لامبدای `static`؛ دیلیگیت را در یک فیلد کش کن |
| LINQ | در مسیرهای پرتکرار حلقهٔ ساده |
| `foreach` از طریق `IEnumerable<T>` یا `IList<T>` | از `for` یا نوع واقعی مجموعه استفاده کن |
| `GetComponents<T>()`، `Physics.RaycastAll`، `OverlapSphere` | نسخه‌های لیست‌دار و `NonAlloc` |
| `gameObject.tag`، `gameObject.name` | `CompareTag`، مقدارهای کش‌شده |
| `renderer.material` (یک کپی می‌سازد) | `sharedMaterial` یا `MaterialPropertyBlock` |
| `new WaitForSeconds` داخل حلقه | کشش کن |
| `Instantiate` و `Destroy` به‌صورت انبوه | استخر (pooling) |
| `string.Format` و آرایه‌های `params` | در مسیرهای پرتکرار پرهیز کن |

```csharp
private readonly List<Enemy> nearby = new();    // reused every call

void FindNearby()
{
    nearby.Clear();                             // keeps capacity
    for (int i = 0; i < allEnemies.Count; i++)
        if (InRange(allEnemies[i])) nearby.Add(allEnemies[i]);
}

// UI: rebuild text only when the number actually changes
if (score != lastShownScore)
{
    lastShownScore = score;
    scoreText.SetText("Score: {0}", score);     // TextMeshPro, no garbage
}
```

## 14.3 استخر شیء (Object pooling)

**Pooling** یعنی شیءها را یک‌بار بسازی و دوباره به کار ببری، به‌جای اینکه مدام `Instantiate` و `Destroy` بزنی. گزینه‌های معمولش: گلوله‌ها، دشمن‌ها، افکت‌های ذره‌ای، پاپ‌آپ آسیب، متن‌های شناور، المان‌های موقت رابط کاربری و شیءهای شبکه‌ای کوتاه‌عمر.

یونیتی 2021.1 و بالاتر یک استخر آماده در `UnityEngine.Pool` دارد:

```csharp
using UnityEngine.Pool;

public class BulletSpawner : MonoBehaviour
{
    [SerializeField] private Bullet prefab;
    private ObjectPool<Bullet> pool;

    private void Awake()
    {
        pool = new ObjectPool<Bullet>(
            createFunc: () => Instantiate(prefab),
            actionOnGet: b => b.gameObject.SetActive(true),
            actionOnRelease: b => b.gameObject.SetActive(false),
            actionOnDestroy: b => Destroy(b.gameObject),
            collectionCheck: true,
            defaultCapacity: 20,
            maxSize: 100);
    }

    public void Fire(Vector3 pos, Quaternion rot)
    {
        Bullet bullet = pool.Get();
        bullet.transform.SetPositionAndRotation(pos, rot);
        bullet.Init(pool);            // so it can release itself
    }
}

public class Bullet : MonoBehaviour
{
    private IObjectPool<Bullet> pool;

    public void Init(IObjectPool<Bullet> owner) => pool = owner;
    private void OnHit() => pool.Release(this);
}
```

قاعده‌های استخر:

- وقتی شیء از استخر گرفته می‌شود **حالتش را ریست کن** (جان، سرعت، تایمرها، trail renderer، عضویت در رویدادها).
- هر شیء را وقتی کارش تمام شد **برگردان**. آزادکردن دوبارهٔ یک شیء باگ است؛ `collectionCheck: true` در ادیتور می‌گیردش.
- یک **حداکثر اندازه** بگذار و اگر اولین استفاده نباید لگ بزند، استخر را از قبل گرم کن.

> [warn] اول اندازه بگیر
> Pooling پیچیدگی و باگ می‌آورد (حالت باقی‌مانده از قبل). جایی به کارش ببر که Profiler نشان می‌دهد `Instantiate` یا `Destroy` یا GC هزینهٔ واقعی است، نه همه‌جا از سر عادت.

## 14.4 روند پروفایل‌گیری

قاعده این است: **اول Profiler، بعد بهینه‌سازی**. حدس‌زدن فقط وقت می‌سوزاند.

1. یک **Development Build** بساز و Profiler را وصل کن (Autoconnect Profiler). روی دستگاه هدف اندازه بگیر، چون ادیتور نمایندهٔ خوبی نیست.
2. در **CPU Usage** همان فریمی که پرش کرده را پیدا کن و با یک فریم سالم مقایسه کن.
3. نمای Hierarchy را بر اساس زمان مرتب کن و ستون **GC Alloc** را ببین تا بفهمی کدام متدها تخصیص می‌دهند.
4. از **Deep Profile** فقط کوتاه استفاده کن. سربار سنگینی دارد و عددها را خراب می‌کند.
5. دور کد مشکوک **marker** بگذار (پایین را ببین)، ریشه را درست کن و دوباره اندازه بگیر.
6. از پکیج **Memory Profiler** برای گرفتن snapshot و مقایسهٔ آن‌ها استفاده کن و برای مشکلات رندر از **Frame Debugger**.

| نرخ فریم هدف | بودجهٔ زمانی هر فریم |
|---|---|
| ۳۰ فریم | ۳۳٫۳ میلی‌ثانیه |
| ۶۰ فریم | ۱۶٫۶ میلی‌ثانیه |
| ۱۲۰ فریم | ۸٫۳ میلی‌ثانیه |

```csharp مارکر سفارشی Profiler
using Unity.Profiling;

private static readonly ProfilerMarker AiMarker = new("Enemy.AI");

private void Tick()
{
    using (AiMarker.Auto())
    {
        // the code you want to see as its own row in the Profiler
    }
}
```

> [interview] هر چند ثانیه یک پرش فریم داری. چه می‌کنی؟
> یک Development Build را روی دستگاه هدف پروفایل می‌کنم. فریم پرش‌دار را با یک فریم معمولی مقایسه می‌کنم. به CPU Timeline و ستون GC Alloc نگاه می‌کنم. ریشه را پیدا می‌کنم (تخصیص، `Instantiate`، LINQ، ساختن رشته، طوفان رویداد، بارگذاری صحنه). درستش می‌کنم و بعد دوباره اندازه می‌گیرم تا مطمئن شوم بهتر شده.

## 14.5 عادت‌های روزمرهٔ کارایی

- `Transform`، کامپوننت‌ها و نتیجه‌هایی که مکرر می‌خوانی را کش کن. اگر در کد پرتکرار استفاده می‌شود، `Camera.main` را هم کش کن.
- فاصله‌ها را با `sqrMagnitude` مقایسه کن تا ریشهٔ دوم حساب نشود.
- از **لایه‌ها و ماسک‌های** فیزیک استفاده کن تا کوئری‌ها فقط چیزهایی را تست کنند که مهم‌اند.
- کارهای سنگین را روی چند فریم پخش کن (هر فریم چند دشمن را پردازش کن) یا با یک تایمر اجرا کن، نه هر فریم.
- از `Debug.Log` در کد نهایی پرهیز کن: کند است و حتی در بیلد ریلیز هم تخصیص می‌گیرد. طوری بپیچشش که صدا زدن‌ها از بیلد حذف شوند:

```csharp
public static class Log
{
    [System.Diagnostics.Conditional("UNITY_EDITOR")]
    [System.Diagnostics.Conditional("DEVELOPMENT_BUILD")]
    public static void Info(string message)
        => UnityEngine.Debug.Log(message);
}
```

صدا زدن یک متد `[Conditional]` — همراه با ارزیابی آرگومان‌هایش — وقتی هیچ‌کدام از آن دو نماد تعریف نشده باشند، توسط کامپایلر حذف می‌شود.

## 14.6 نشتی حافظه

در یک زبان مدیریت‌شده، «نشتی» یعنی چیزی ارجاعی را نگه داشته که تو دیگر لازمش نداری، پس GC نمی‌تواند آزادش کند. علت‌های رایج در یونیتی:

- رویدادهایی که هیچ‌وقت `-=` نشده‌اند، و فیلدها یا مجموعه‌های **static** که مدام رشد می‌کنند.
- دارایی‌های **Addressables** که بارگذاری شده‌اند ولی هیچ‌وقت آزاد نشده‌اند.
- تکسچرها، متریال‌ها و مش‌هایی که **در کد ساخته** شده‌اند و هیچ‌وقت نابود نشده‌اند.
- `NativeArray` و بقیهٔ ظرف‌های بومی که هیچ‌وقت `Dispose` نشده‌اند. GC مدیریتشان نمی‌کند.
- کوروتین‌ها یا تسک‌هایی که همچنان اجرا می‌شوند و ارجاع نگه می‌دارند.

GC جای `IDisposable` را نمی‌گیرد. هر چیزی که صاحب یک منبع مدیریت‌نشده است (فایل، استریم، حافظهٔ بومی) باید صریح آزاد شود:

```csharp
using (var stream = File.OpenRead(path))
{
    // read from the stream
}   // Dispose() runs here, even if an exception is thrown

using var reader = new StreamReader(path);   // disposed at end of scope
```

> [interview] نشتی حافظه را چطور پیدا می‌کنی؟
> قبل و بعد از یک چرخهٔ کامل (بارگذاری مرحله، بازی، تخلیه) از Memory Profiler snapshot می‌گیرم. مقایسه‌شان می‌کنم، دنبال شیءهایی می‌گردم که باید رفته باشند و بعد زنجیرهٔ ارجاع را تا چیزی که نگهشان داشته دنبال می‌کنم: فیلدهای static، عضویت در رویدادها، کش‌ها یا handleهای آزادنشده.

> [recap] جمع‌بندی فصل ۱۴
> - زباله پرش فریم می‌سازد؛ GC یونیتی incremental است ولی مجانی نیست.
> - منابع رایج تخصیص و جایگزین‌های بدون زباله‌شان را بشناس.
> - شیءهایی که زیاد ساخته می‌شوند را استخر کن، آن هم وقتی Profiler بگوید مهم است.
> - روی دستگاه و با Development Build پروفایل بگیر؛ فریم پرش‌دار را با فریم سالم مقایسه کن؛ هر اصلاحی را تأیید کن.
> - رویدادها را `-=` کن، Addressables را آزاد کن و منابع بومی و مدیریت‌نشده را dispose کن.
