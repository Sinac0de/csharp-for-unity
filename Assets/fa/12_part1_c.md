# 8. خطاها، null و تطبیق الگو

کد مقاوم از قبل تصمیم می‌گیرد وقتی چیزی خراب شد چه اتفاقی بیفتد. این فصل استثناها، کار با null (شامل قواعد خاص یونیتی) و تطبیق الگو را پوشش می‌دهد.

## 8.1 استثناها

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

بلوک‌های `catch` مشخص را قبل از بلوک‌های کلی‌تر بنویس. قواعدی که حرفه‌ای‌ها رعایت می‌کنند:

- استثناها برای شکست‌های **غیرمنتظره** هستند: خواندن و نوشتن فایل، شبکه، تبدیل داده‌ای که به آن اعتماد نداری، آرگومان نامعتبر. برای جریان عادی بازی مثل «بازیکن مُرد» از آن‌ها استفاده **نکن**.
- مشخص‌ترین استثنایی را بگیر که از عهده‌اش برمی‌آیی. هیچ‌وقت `catch` خالی که خطا را قایم می‌کند نگذار.
- با `throw;` دوباره پرتاب کن، نه با `throw ex;`. اولی stack trace اصلی را نگه می‌دارد و دومی صفرش می‌کند.
- پرتاب و گرفتن استثنا در مقایسه با برگرداندن یک مقدار کند است. داخل `try` به‌جای `int.Parse` از `int.TryParse` استفاده کن.
- ورودی‌ها را همان اول متد با **شرط‌های نگهبان** اعتبارسنجی کن.

```csharp
public void TakeDamage(int amount)
{
    if (amount < 0)
        throw new ArgumentOutOfRangeException(nameof(amount));
    if (IsDead) return;             // normal case: just return

    Current = Mathf.Max(0, Current - amount);
}
```

| استثنا | یعنی |
|---|---|
| `ArgumentNullException`، `ArgumentOutOfRangeException` | یک پارامتر نامعتبر است |
| `InvalidOperationException` | شیء در حالت نادرست است (وقتی مجموعه وسط `foreach` عوض شود هم پرتاب می‌شود) |
| `NullReferenceException` | از یک ارجاع null استفاده شد |
| `IndexOutOfRangeException`، `KeyNotFoundException` | اندیس غلط یا کلید غایب در دیکشنری |
| `NotImplementedException` | جای خالی برای کدی که هنوز نوشته نشده |

> [note] یونیتی با استثناها چه می‌کند
> یک استثنای گرفته‌نشده داخل `Update` یا هر callback دیگری یونیتی، در Console لاگ می‌شود و بقیهٔ **همان فراخوانی** اجرا نمی‌شود، ولی بازی به کارش ادامه می‌دهد. استثنا داخل یک **کوروتین** آن کوروتین را متوقف می‌کند. در متد `async void` یا در `Task`ی که کسی await نمی‌کند، ممکن است استثنا هیچ‌وقت به چشم نیاید. داخل این‌ها همیشه استثنا را بگیر و لاگ کن.

> [interview] throw یا return؟
> `return` مسیر عادی کنترل است. `throw` یک وضعیت استثنایی را به صدازننده گزارش می‌دهد؛ صدازننده‌ای که شاید چند سطح بالاتر در پشتهٔ فراخوانی باشد. اگر شکست قابل انتظار و پرتکرار است، به‌جایش `bool` یا یک مقدار نتیجه برگردان.

## 8.2 عملگرهای کار با null

| عملگر | یعنی | مثال |
|---|---|---|
| `?.` | شرطی نسبت به null: اگر سمت چپ null باشد همان‌جا بایست | `enemy?.Attack();` |
| `??` | اگر سمت چپ null بود، سمت راست را بردار | `name ?? "Unknown"` |
| `??=` | فقط اگر متغیر الان null است مقدار بده | `list ??= new List<int>();` |
| `is null`، `is not null` | آزمون null (C# 9) | `if (x is not null)` |

```csharp
string display = playerName ?? "Unknown";
cache ??= new Dictionary<int, Enemy>();
int? length = text?.Length;       // null if text is null
```

## 8.3 «null جعلی» یونیتی

`UnityEngine.Object` (که `GameObject`، `Component`، `MonoBehaviour`، `ScriptableObject`، `Texture` و بقیه را در بر می‌گیرد) عملگرهای `==` و `!=` را بازنویسی کرده. وقتی شیئی را نابود می‌کنی، پوشش C# همچنان وجود دارد ولی بررسی `== null` یونیتی **درست** گزارش می‌کند.

عملگرهای `?.` و `??` و `??=` و `is null` از آن بازنویسی رد می‌شوند، چون ارجاع خام C# را چک می‌کنند.

| برای شیءهای یونیتی | استفاده کن از | پرهیز کن از |
|---|---|---|
| غایب یا نابود شده؟ | `if (obj == null)` یا `if (!obj)` | `obj is null` |
| وجود دارد؟ | `if (obj != null)` یا `if (obj)` | `obj?.Method()` |
| مقدار پیش‌فرض | `obj != null ? obj : fallback` | `obj ?? fallback` |

```csharp
Destroy(enemy.gameObject);
// ...at the end of the frame the object is really gone:
if (enemy != null) enemy.Attack();     // safe: Unity's check
enemy?.Attack();                       // WRONG: C# thinks it is alive
```

> [warn] نابودی به تعویق می‌افتد
> `Destroy(obj)` شیء را علامت می‌زند و آخر همان فریم برش می‌دارد، پس تا آن موقع `obj == null` هنوز false است. اگر ممکن است کد دیگری در همان فریم به آن دست بزند، غیرفعالش کن (`SetActive(false)`) یا پرچم `IsDead` خودت را چک کن.

باگ‌های null را از ریشه کم کن:

```csharp
private void Awake()
{
    if (health == null)
        Debug.LogError($"{name}: Health is not assigned", this);
}
```

آرگومان دوم (`this`) باعث می‌شود وقتی روی پیام در Console کلیک می‌کنی، همان شیء مقصر برجسته شود. `[RequireComponent(typeof(Rigidbody))]` و `TryGetComponent` کل دسته‌ای از بررسی‌های null را حذف می‌کنند.

## 8.4 نوع‌های مقداری nullable

نوع مقداری نمی‌تواند null باشد، ولی `T?` یک حالت «خالی» به آن اضافه می‌کند.

```csharp
int? bestScore = null;
if (bestScore.HasValue) Debug.Log(bestScore.Value);

int shown = bestScore ?? 0;                // 0 when empty
int also = bestScore.GetValueOrDefault();  // also 0
```

برای یک مقدار اختیاری که واقعاً «تنظیم نشده» است، از `int?` استفاده کن. فقط بدان که یونیتی فیلدهای nullable را در Inspector نمی‌تواند سریالایز کند.

## 8.5 تطبیق الگو

تطبیق الگو شکل یک مقدار را می‌سنجد و در یک قدم بخش‌هایی از آن را بیرون می‌کشد. همهٔ کدهای زیر در C# 9 کار می‌کنند (یونیتی 2021.2 و بالاتر).

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

`as` به یک نوع کست می‌کند و اگر تطابق نداشت null می‌دهد: `var d = other as IDamageable;`. ولی `is` با یک الگو بهتر است، چون یک چک null جداگانه لازم ندارد.

> [warn] الگوها و شیءهای یونیتی
> الگوهای نوع مثل `is IDamageable d` روی کامپوننت‌ها مشکلی ندارند. ولی الگوهای **null** (`is null`، `is not null`، `{ }`) از بررسی نابودشدن یونیتی رد می‌شوند، پس روی نوع‌های `UnityEngine.Object` به کارشان نبر.

> [recap] جمع‌بندی فصل ۸
> - استثناها برای شکست‌های غیرمنتظره‌اند؛ برای شکست‌های قابل انتظار از متدهای `Try...` و شرط‌های نگهبان استفاده کن.
> - استثناهای مشخص را بگیر، با `Debug.LogException` لاگشان کن و هیچ‌وقت خطا را بی‌صدا قورت نده.
> - برای شیءهای یونیتی از `== null`، `!= null` یا `if (obj)` استفاده کن. از `?.`، `??` و `is null` استفاده نکن.
> - `Destroy` آخر همان فریم اثر می‌کند.
> - تطبیق الگو (`is`، عبارت‌های `switch`، الگوهای پراپرتی و رابطه‌ای) کست‌های پُرحرف و زنجیره‌های `if` را حذف می‌کند.

# 9. enum و record و tuple و سی‌شارپ مدرن

انتخاب نوع دادهٔ درست، قصد کد را روشن می‌کند و جلوی باگ را می‌گیرد. این فصل همچنین فهرست می‌کند که نسخهٔ یونیتی تو کدام قابلیت‌های زبان را پشتیبانی می‌کند.

## 9.1 enumها

enum یک مجموعهٔ نام‌دار از ثابت‌ها است. جای «عددهای جادویی» و رشته‌ها را می‌گیرد.

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

- enumها به‌صورت عدد صحیح ذخیره می‌شوند. اگر یک enum **سریالایز می‌شود** (Inspector، فایل ذخیره)، هیچ‌وقت ترتیبش را عوض نکن و وسطش مقدار جدید نگذار. مقدارهای تازه را آخر اضافه کن یا به هر مقدار یک عدد صریح بده.
- برای تبدیل امن متن به enum از `Enum.TryParse<T>(text, out var value)` استفاده کن.
- در `switch` روی یک enum یک شاخهٔ `default` بگذار که لاگ کند یا استثنا بدهد، تا مقدار تازه‌ای که اضافه شده بی‌صدا نادیده نماند.
- به مقدارهای `[Flags]` توان‌های دو بده و همیشه `None = 0` را داشته باش.

## 9.2 structها

داده‌های کوچک و تغییرناپذیر شبیه یک مقدار، مثل `DamageInfo`، struct خوبی هستند. برای اینکه کِی struct بگیری و کپی‌شدن چطور کار می‌کند فصل ۲ را ببین. خلاصه‌اش: کوچکشان نگه دار، `readonly struct` را ترجیح بده و اگر کلید دیکشنری می‌شوند `IEquatable<T>` را پیاده کن.

## 9.3 recordها

**record** یک کلاس است که برای دادهٔ تغییرناپذیر طراحی شده. برابری مبتنی بر مقدار، `ToString()` خوانا و کپی بدون تخریب با `with` را به تو می‌دهد.

```csharp
public record PlayerSnapshot(int Id, int Score, int Level);

var a = new PlayerSnapshot(1, 100, 3);
var b = a with { Score = 150 };                  // copy, one value changed
bool same = a == new PlayerSnapshot(1, 100, 3);  // true: value equality
```

> [note] recordها در یونیتی
> recordها از setterهای init-only استفاده می‌کنند که به نوع `System.Runtime.CompilerServices.IsExternalInit` نیاز دارند. رانتَیم یونیتی این را ندارد، پس باید یک‌بار در پروژه‌ات تعریفش کنی. سیستم سریالایز یونیتی هم از recordها پشتیبانی **نمی‌کند**، پس برای دادهٔ Inspector یا `JsonUtility` از آن‌ها استفاده نکن. مناسب‌شان مدل‌های تغییرناپذیر در حافظه است، مثل snapshotها و پیام‌ها.

```csharp اگر از record یا setterهای init استفاده می‌کنی، یک‌بار تعریفش کن
namespace System.Runtime.CompilerServices
{
    internal static class IsExternalInit { }
}
```

## 9.4 تاپل‌ها

تاپل‌ها مقدارها را بدون تعریف یک نوع کنار هم می‌گذارند. نوع مقداری هستند، پس تخصیص حافظه ندارند.

```csharp
(int hp, int mp) stats = (100, 50);
Debug.Log(stats.hp);

(int min, int max) GetRange() => (10, 20);
var (lo, hi) = GetRange();          // deconstruction
var (_, high) = GetRange();         // discard the value you do not need
```

تاپل را برای کمک‌کارهای کوچک و خصوصی به کار ببر. برای API عمومی، یک `struct` یا `class` نام‌دار روشن‌تر است و تغییرش راحت‌تر.

## 9.5 تغییرناپذیری

اشیایی که بعد از ساخت عوض نمی‌شوند هم فهمیدنشان راحت‌تر است و هم کد دیگر نمی‌تواند خرابشان کند. ابزارهایی که در دست داری:

- فیلدهای `readonly` و پراپرتی‌های فقط‌خواندنی.
- `readonly struct` و recordها.
- `IReadOnlyList<T>` و `IReadOnlyDictionary<K,V>` برای بیرون دادن داده بدون اینکه صدازننده‌ها بتوانند عوضش کنند.

داده را به‌طور پیش‌فرض تغییرناپذیر بساز و فقط جایی که سیستمی واقعاً لازم دارد قابلیت تغییر اضافه کن. این کار برای دادهٔ کانفیگ که بین اشیای زیادی مشترک است (آمار سلاح‌ها، تعریف مرحله‌ها) بسیار ارزشمند است.

## 9.6 پشتیبانی نسخهٔ C# در یونیتی

یونیتی 2021.2 و بالاتر، از جمله نسخه‌های امروزی یونیتی 6، از کامپایلر Roslyn با **C# 9.0** استفاده می‌کنند.

| پشتیبانی‌شده و مفید | پشتیبانی‌نشده |
|---|---|
| درون‌گذاری رشته، `?.`، `??`، `out var`، تاپل‌ها، متدهای محلی، اعضای expression-bodied (C# 6 و 7) | namespaceهای file-scoped، `using` عمومی، record struct (C# 10) |
| عبارت‌های switch، الگوهای پراپرتی، `using var`، متدهای محلی static (C# 8) | هر چیزی جدیدتر از C# 9 |
| `new()` با نوع هدف، recordها (با آن تعریف کوچک)، الگوهای رابطه‌ای و منطقی، لامبداهای `static` (C# 9) | covariant return type، module initializer (C# 9) |

> [tip] نسخه‌ات را چک کن
> صفحهٔ «C# compiler and language version reference» در مستندات یونیتی، نسخهٔ دقیق زبان و قابلیت‌های پشتیبانی‌نشده را برای نسخهٔ ادیتور تو فهرست می‌کند. هر بار یونیتی را آپدیت کردی یک نگاه به آن بینداز، چون پشتیبانی می‌تواند عوض شود.

> [recap] جمع‌بندی فصل ۹
> - enumها جای عددهای جادویی را می‌گیرند. مقدارهای سریالایزشده را پایدار نگه دار و برای `[Flags]` از توان‌های دو استفاده کن.
> - recordها دادهٔ تغییرناپذیر با برابری مقداری می‌دهند، ولی به آن تعریف یک‌خطی نیاز دارند و یونیتی نمی‌تواند سریالایزشان کند.
> - تاپل‌ها برای کمک‌کارهای خصوصی سبک‌اند؛ در APIهای عمومی از نوع‌های نام‌دار استفاده کن.
> - دادهٔ تغییرناپذیر و نمای فقط‌خواندنی را ترجیح بده.
> - یونیتی از C# 9.0 استفاده می‌کند: بدان چه چیزی در دسترس است و چه چیزی نیست.
