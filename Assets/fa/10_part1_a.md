@part بخش اول — مبانی زبان C# | خودِ زبان. هر اسکریپت یونیتی C# است، پس هر چقدر اینجا روان‌تر باشی، در همهٔ فصل‌های بعدی سود می‌بری.

# 1. مبانی زبان

سینتکسی که باید آن‌قدر بلد باشی که وقتی داری یک مسئله را حل می‌کنی، هیچ‌وقت جلویت را نگیرد.

## 1.1 نوع‌های داخلی

| نوع | حجم | کاربرد معمولش در یونیتی |
|---|---|---|
| `int` | ۴ بایت | جان، امتیاز، اندیس‌ها، شمارش‌ها |
| `float` | ۴ بایت | موقعیت، سرعت، تایمرها. نوع عددی پیش‌فرض خودِ API یونیتی |
| `double` | ۸ بایت | کم پیش می‌آید: تایمرهای بسیار دقیق یا محاسبات در مقیاس بزرگ |
| `bool` | ۱ بایت | پرچم‌هایی مثل `isGrounded` |
| `char` | ۲ بایت | یک کاراکتر UTF-16 |
| `string` | ارجاعی | متن: اسم‌ها، شناسه‌ها، نوشته‌های رابط کاربری |
| `long` | ۸ بایت | شمارنده‌های بزرگ، زمان‌ها |
| `byte` | ۱ بایت | دادهٔ خام، مقدارهای کوچک ۰ تا ۲۵۵ |
| `decimal` | ۱۶ بایت | محاسبات پولی؛ در بازی تقریباً هیچ‌وقت لازم نمی‌شود |

```csharp تعریف مقدارها
int health = 100;
float speed = 5.5f;        // the f suffix is required for float
double precise = 5.5;      // no suffix means double
bool isGrounded = true;
string playerName = "Aria";

health -= 10;
speed *= 1.2f;
```

```csharp نکته‌های ریزِ عددها
int a = 5 / 2;               // 2, not 2.5 (integer division)
float b = 5 / 2f;            // 2.5
int c = (int)3.9f;           // 3 (a cast truncates)
int d = Mathf.RoundToInt(3.9f);  // 4
bool same = Mathf.Approximately(x, y); // never use == on floats
```

> [warn] دقت `float`
> اعداد اعشاری تقریبی‌اند، پس `==` حتی وقتی حساب‌وکتاب درست به نظر می‌رسد هم می‌تواند جواب ندهد. با `Mathf.Approximately` مقایسه کن، یا چک کن که اختلافشان از یک اپسیلون کوچک کمتر باشد. حساب‌های صحیح هم به‌طور پیش‌فرض بی‌صدا سرریز می‌شوند؛ مثلاً `int.MaxValue + 1` به یک عدد منفی می‌پیچد.

## 1.2 var و const و readonly

| کلیدواژه | یعنی چه | کجا به کارش ببر |
|---|---|---|
| `var` | کامپایلر نوع را از سمت راست حدس می‌زند | متغیرهای محلی، وقتی نوع مشخص است |
| `const` | ثابت زمان کامپایل، همیشه static | عددها و رشته‌هایی که هیچ‌وقت عوض نمی‌شوند |
| `readonly` | یک‌بار مقدار می‌گیرد: همان‌جا یا در سازنده | مقدارهایی که بعد از ساخت ثابت می‌مانند |
| `static readonly` | یک ثابت مشترک در زمان اجرا | ثابت‌هایی که مقدارشان یک لیترال ساده نیست |

```csharp
var speed = 5f;                       // still strongly typed: float
const float Gravity = 9.81f;
static readonly Vector3 SpawnOffset = new Vector3(0f, 1f, 0f);

private readonly int maxHealth;
public Player(int maxHealth) { this.maxHealth = maxHealth; }
```

> [interview] `var` داینامیک نیست
> `var` در زمان کامپایل مشخص می‌شود و متغیر نوع ثابت خودش را نگه می‌دارد. `dynamic` یک قابلیت جداگانه است که بررسی نوع را می‌اندازد به زمان اجرا. هر جا سمت راست نوع را روشن می‌کند از `var` استفاده کن (`var list = new List<Enemy>();`) و هر جا روشن نیست، نوع را بنویس.

> [warn] `const` بین اسمبلی‌ها
> مقدار `const` در زمان کامپایل داخل هر جایی که از آن استفاده می‌کند کپی می‌شود. اگر یک `const` در اسمبلی دیگری باشد و تو عوضش کنی، بقیه تا زمانی که دوباره کامپایل نشوند همان مقدار قدیمی را می‌بینند. برای مقدارهایی که ممکن است تغییر کنند، `static readonly` بهتر است.

## 1.3 رشته‌ها

رشته‌ها **تغییرناپذیرند (immutable)**: هر تغییر یک رشتهٔ تازه می‌سازد. برای استفادهٔ گاه‌به‌گاه اشکالی ندارد و داخل حلقه‌ها یا کدِ هر فریم، گران تمام می‌شود.

```csharp
string msg = $"HP: {health}/{maxHealth}";     // interpolation
string path = @"C:\Saves\slot1.json";          // verbatim: no escapes
bool ok = string.Equals(a, b, StringComparison.Ordinal);

// Building many pieces? Use a StringBuilder.
var sb = new StringBuilder();
for (int i = 0; i < 5; i++) sb.Append(i).Append(',');
string result = sb.ToString();
```

```csharp متن عددی مستقل از فرهنگ (using System.Globalization)
string s = 3.5f.ToString(CultureInfo.InvariantCulture);
float f = float.Parse("3.5", CultureInfo.InvariantCulture);
```

> [tip] برای داده‌ها همیشه `InvariantCulture`
> روی دستگاهی که زبانش چیز دیگری است، `3.5f.ToString()` ممکن است `3,5` بدهد و بعداً خواندنش با یک فرهنگ دیگر شکست بخورد. برای فایل ذخیره، دادهٔ شبکه و کانفیگ از `CultureInfo.InvariantCulture` استفاده کن و فقط برای متنی که بازیکن می‌بیند، فرهنگ خودش را به کار ببر.

## 1.4 جریان کنترل

```csharp
if (health <= 0) Die();
else if (health < 25) EnterCriticalState();

for (int i = 0; i < enemies.Count; i++) enemies[i].Tick();
foreach (Enemy e in enemies) e.Tick();

while (queue.Count > 0) Process(queue.Dequeue());

int damage = isCritical ? 50 : 25;             // ternary
```

```csharp عبارت switch در C# 8 به بعد؛ GameState یک enum است
string label = state switch
{
    GameState.Playing => "Playing",
    GameState.Paused  => "Paused",
    _                 => "Menu",
};
```

برای بیرون آمدن از حلقه `break` بزن و برای پریدن به دور بعدی `continue`. **شرط‌های نگهبان (guard clause)** — یعنی همان اول برگرد — را به بلوک‌های تو در توی `if` ترجیح بده؛ فصل ۲۰ را ببین.

## 1.5 متدها

```csharp
public float CalculateDamage(float baseDamage, float multiplier = 1f)
    => baseDamage * multiplier;

float a = CalculateDamage(20f);                    // 20
float b = CalculateDamage(20f, multiplier: 2f);    // named argument

public (int min, int max) GetRange() => (10, 20);  // tuple return
var (lo, hi) = GetRange();                          // deconstruction
```

- **پارامترهای اختیاری** باید مقدار پیش‌فرض داشته باشند و همیشه آخر بیایند.
- **`params`** تعداد دلخواهی آرگومان می‌گیرد، ولی هر بار یک آرایه می‌سازد؛ پس در مسیرهای پرتکرار از آن پرهیز کن.
- **متدهای محلی (local function)** — متدی که داخل متد دیگر تعریف می‌شود — کمک‌کارهای کوچک را خصوصی نگه می‌دارند و فقط در دسترس همان متد می‌مانند.

## 1.6 ref و out و in

| کلمه | جهت | کاربرد معمولش |
|---|---|---|
| `out` | متد باید مقدارش را بدهد؛ لازم نیست صدازننده اول مقدار بدهد | الگوهای `TryGet` که یک bool و یک نتیجه برمی‌گردانند |
| `ref` | صدازننده باید مقدار بدهد؛ متد می‌تواند بخواند و عوضش کند | دست‌کاری مستقیم متغیر صدازننده |
| `in` | با ارجاع پاس می‌شود ولی فقط خواندنی | جلوگیری از کپی‌شدن structهای بزرگ |

```csharp
bool TryFindEnemy(out Enemy enemy)
{
    enemy = FindNearestEnemy();
    return enemy != null;
}

if (TryFindEnemy(out Enemy target)) target.Stun();

void AddBonus(ref int score) { score += 10; }
```

> [tip] الگوی Try را ترجیح بده
> متدهایی که ممکن است به‌شکل قانونی شکست بخورند (جست‌وجو در دیکشنری، تبدیل متن، گرفتن کامپوننت) بهتر است `bool` برگردانند و نتیجه را با `out` بدهند؛ همان‌طور که `TryGetValue`، `int.TryParse` و `TryGetComponent` کار می‌کنند. این‌طوری نه استثنا داری و نه چک‌کردن null. `ref` و `in` را فقط وقتی به کار ببر که دلیل واقعی داری.

## 1.7 پراپرتی‌ها

```csharp
public int Health { get; private set; }             // read outside, write inside
public bool IsDead => Health <= 0;                  // computed each call
[field: SerializeField] public int MaxHealth { get; private set; } = 100;
```

- پراپرتی ظاهرش مثل فیلد است ولی در واقع یک جفت متد است (`get` و `set`)، پس می‌تواند اعتبارسنجی کند، محاسبه کند یا رویداد بفرستد.
- `get` را ارزان نگه دار و بدون عارضهٔ جانبی. کسی که کد را می‌خواند فرض می‌کند خواندن پراپرتی همان‌قدر سریع است که خواندن فیلد.
- یونیتی پراپرتی‌ها را **سریالایز نمی‌کند**. `[field: SerializeField]` همان فیلد پشتیبان پراپرتی خودکار را سریالایز می‌کند.

## 1.8 سطح دسترسی

| کلمه | برای چه کسی دیده می‌شود |
|---|---|
| `public` | همه |
| `private` | فقط همان نوع تعریف‌کننده (پیش‌فرض اعضا) |
| `protected` | همان نوع و نوع‌های مشتق‌شده |
| `internal` | همان اسمبلی (پیش‌فرض نوع‌های سطح بالا) |
| `protected internal` | همان اسمبلی، یا نوع‌های مشتق‌شده |
| `private protected` | نوع‌های مشتق‌شده داخل همان اسمبلی |

> [tip] خصوصی سریالایز کن
> به‌جای `public float speed;` بنویس `[SerializeField] private float speed;`. هنوز در Inspector دیده می‌شود، ولی اسکریپت‌های دیگر اشتباهی عوضش نمی‌کنند. فقط همان چیزی را بیرون بده که بقیهٔ کلاس‌ها واقعاً لازم دارند.

## 1.9 static و namespace و using

- عضو `static` به خود نوع تعلق دارد، نه به نمونه. کلاس‌های static برای کمک‌کارهای بی‌حالت مثل توابع ریاضی خوب‌اند.
- **حالت static در یونیتی خطرناک است**: از بارگذاری صحنه جان سالم به در می‌برد و اگر در تنظیمات Enter Play Mode گزینهٔ *Reload Domain* را خاموش کرده باشی، حتی بین دو بار Play هم می‌ماند. فیلدهای static را خودت صریح ریست کن (الگوی Singleton در فصل ۱۸ را ببین).
- کدت را داخل یک namespace بگذار، مثلاً `namespace MyGame.Combat { ... }`، تا با نام‌ها تصادم نکنی. از شکل بلوکی استفاده کن؛ namespaceهای file-scoped به C# 10 نیاز دارند.

```csharp رفع ابهام نام‌ها
using Random = UnityEngine.Random;   // System.Random also exists
using Debug = UnityEngine.Debug;     // System.Diagnostics.Debug too
```

> [recap] جمع‌بندی فصل ۱
> - `float` به پسوند `f` نیاز دارد؛ هیچ‌وقت floatها را با `==` مقایسه نکن.
> - `var` همان تایپ‌دهی ثابت است با نوشتن کمتر. `const` در زمان کامپایل است و `readonly` یک‌بار در زمان اجرا مقدار می‌گیرد.
> - رشته‌ها تغییرناپذیرند؛ برای الحاق‌های زیاد `StringBuilder` و برای داده‌های ذخیره‌شده `InvariantCulture`.
> - برای شکست‌های قابل پیش‌بینی، متدهای `Try...` با `out` بهتر از استثنا هستند.
> - اعضا را تا جای ممکن خصوصی نگه دار؛ برای فیلدهای Inspector از `[SerializeField] private` استفاده کن.
> - حالت static از صحنه‌ها عمر بیشتری دارد: با فکر مقدارش بده و با فکر ریست کن.

# 2. نوع‌های مقداری، نوع‌های ارجاعی و حافظه

اینکه بفهمی چه چیزی کپی می‌شود و چه چیزی مشترک می‌ماند، سهم بزرگی از باگ‌ها و مشکلات کارایی را توضیح می‌دهد.

## 2.1 دو خانوادهٔ نوع

| نوع‌های مقداری | نوع‌های ارجاعی |
|---|---|
| `int`، `float`، `bool`، `char` | نمونه‌های `class` |
| `enum` | `string` |
| `struct` مثل `Vector3`، `Quaternion`، `Color`، `RaycastHit` | آرایه‌ها، `List<T>`، `Dictionary<K,V>` |
| تاپل‌ها (`ValueTuple`) | دیلیگیت‌ها، `GameObject`، `Transform`، `MonoBehaviour`، `ScriptableObject` |

متغیر نوع مقداری **خودِ داده را نگه می‌دارد**، پس انتساب کپی‌اش می‌کند. متغیر نوع ارجاعی **یک ارجاع به شیء را نگه می‌دارد**، پس انتساب فقط همان ارجاع را کپی می‌کند و هر دو متغیر به یک شیء اشاره می‌کنند.

```csharp
int a = 10;
int b = a;      // copy
b = 20;         // a is still 10

Player p1 = new Player();   // Player is a plain class
Player p2 = p1;             // same object, two references
p2.Health = 0;              // p1.Health is now 0 as well
```

## 2.2 پشته و هیپ

| مفهوم | یعنی چه |
|---|---|
| پشته (Stack) | ناحیهٔ سریع و کوچک برای فراخوانی متدها و متغیرهای محلی. با برگشتن از متد خودش آزاد می‌شود |
| هیپ (Heap) | ناحیهٔ اشیایی که بیشتر از یک فراخوانی زنده می‌مانند. Garbage Collector پاکش می‌کند |

اینکه یک مقدار کجا زندگی می‌کند به بافتش بستگی دارد، نه فقط به نوعش:

- یک `int` یا struct محلی معمولاً روی پشته است.
- همان `int` وقتی **فیلد یک کلاس** باشد، داخل آن شیء روی هیپ می‌نشیند.
- آرایهٔ structها یک بلوک روی هیپ است که structها داخلش پشت سر هم چیده شده‌اند.
- متغیر محلی‌ای که یک لامبدا می‌گیرد، به یک شیء بسته (closure) روی هیپ منتقل می‌شود.

> [interview] آیا هر struct روی پشته است؟
> نه. struct یک نوع مقداری است، ولی اگر فیلد یک کلاس باشد، عضوی از یک آرایه باشد یا یک closure بگیردش، به‌عنوان بخشی از آن شیء روی هیپ می‌نشیند.

## 2.3 بوکسینگ و آنبوکسینگ

**بوکسینگ** یک نوع مقداری را داخل یک شیء روی هیپ می‌پیچد. **آنبوکسینگ** دوباره بیرونش می‌کشد. هر بوکسینگ یک تخصیص حافظه است.

```csharp
int score = 100;
object boxed = score;     // boxing: heap allocation
int back = (int)boxed;    // unboxing
```

جاهایی که بی‌خبر بوکسینگ رخ می‌دهد:

- پاس‌دادن یک نوع مقداری به پارامتری از نوع `object` (مثلاً `Debug.Log(score)` یا آرگومان‌های `string.Format`).
- استفاده از مجموعه‌های غیرجنریک مثل `ArrayList` یا `Hashtable`.
- کست‌کردن یک struct به اینترفیسی که پیاده کرده (`IComparable c = 5;`).
- صدا زدن `Equals(object)` روی یک struct.

> [perf] در کدهای پرتکرار بوکسینگ نکن
> یک int بوکس‌شده هیچ آسیبی ندارد. ولی هزار تا در ثانیه داخل `Update` زباله می‌سازد و آخرش یک جهش GC تحویلت می‌دهد. از مجموعه‌ها و متدهای جنریک استفاده کن که بوکسینگ ندارند.

## 2.4 structها در عمل

structها موقع انتساب، هنگام پاس‌شدن به متد و موقع خواندن از یک پراپرتی یا لیست کپی می‌شوند. همین باعث یک خطای کلاسیک یونیتی می‌شود:

```csharp
// transform.position.y = 5f;   // error CS1612: returns a copy

Vector3 pos = transform.position;   // copy out
pos.y = 5f;                         // modify the copy
transform.position = pos;           // write it back
```

دقیقاً همین دربارهٔ `List<T>` از structها هم برقرار است: `list[0].x = 5` کامپایل نمی‌شود. عضو را بخوان، عوضش کن و برگردانش.

**کی struct بسازیم؟** وقتی نوع کوچک است (حدوداً ۱۶ بایت یا کمتر)، یک مقدار تنها را نمایندگی می‌کند، عمر کوتاهی دارد و بهتر است تغییرناپذیر بماند. در غیر این صورت کلاس بساز.

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

> [tip] structهای تغییرناپذیر را readonly کن
> `readonly struct` به کامپایلر می‌گوید بعد از ساخت هیچ‌چیز نمی‌تواند عوض شود؛ این هم جلوی باگ‌های کپی-تغییر اشتباهی را می‌گیرد و هم اجازه می‌دهد کامپایلر کپی‌های دفاعی را حذف کند. اگر از struct به‌عنوان کلید `Dictionary` یا داخل `HashSet` استفاده می‌کنی، `IEquatable<T>` و `GetHashCode` را پیاده کن تا خبری از بوکسینگ و مقایسهٔ کندِ مبتنی بر رفلکشن نباشد.

## 2.5 پاس‌دادن آرگومان‌ها

| حالت | متد چه چیزی می‌گیرد | می‌تواند روی صدازننده اثر بگذارد؟ |
|---|---|---|
| نوع مقداری | یک کپی | نه |
| نوع ارجاعی | یک کپی از ارجاع | می‌تواند محتوای شیء را عوض کند، ولی نمی‌تواند عوض کند صدازننده کدام شیء را در دست دارد |
| `ref` / `out` | خودِ متغیر صدازننده | بله، حتی می‌تواند دوباره مقدارش بدهد |

```csharp
void Heal(Enemy e)      { e.Health = 100; }      // caller sees this
void Swap(Enemy e)      { e = new Enemy(); }     // caller does NOT
void SwapRef(ref Enemy e) { e = new Enemy(); }   // caller DOES
```

## 2.6 حالت‌های خاص و مقایسه

- `string` یک نوع ارجاعی است ولی تغییرناپذیر، و `==` **محتوایش** را مقایسه می‌کند.
- آرایه‌ها نوع ارجاعی‌اند، حتی وقتی نوع مقداری نگه می‌دارند. انتساب یک آرایه عضوهایش را کپی نمی‌کند.
- برای کلاس‌ها `==` **همان‌بودن** را می‌سنجد، مگر اینکه نوعش آن را بازنویسی کرده باشد. یونیتی برای `UnityEngine.Object` عملگر `==` را بازنویسی کرده (فصل ۸).
- `Instantiate` یک شیء یونیتی را کلون می‌کند. انتساب به یک متغیر هیچ‌وقت این کار را نمی‌کند.
- `new List<T>(source)` یک **کپی سطحی** می‌سازد: لیست تازه است، ولی عضوها همان شیءهای قبلی‌اند.

> [recap] جمع‌بندی فصل ۲
> - نوع‌های مقداری موقع انتساب کپی می‌شوند؛ نوع‌های ارجاعی همان شیء را شریک می‌شوند.
> - پشته یا هیپ بودن به بافت بستگی دارد. structی که داخل یک کلاس است، روی هیپ می‌نشیند.
> - بوکسینگ حافظه می‌گیرد. جنریک‌ها را ترجیح بده و با پارامترهای `object` حواست باشد.
> - structها کپی‌اند: نمی‌توانی مستقیم `transform.position.y` را عوض کنی.
> - structهای کوچک و تغییرناپذیر (`readonly`) بساز؛ بقیه را کلاس کن.
> - پارامترهای ارجاعی با مقدار پاس می‌شوند: اگر پارامتر را دوباره مقدار بدهی، متغیر صدازننده عوض نمی‌شود.

# 3. برنامه‌نویسی شیءگرا

شیءگرایی کد را دور اشیایی می‌چیند که داده و رفتار را با هم دارند. چهار ایده‌ای که باید بلد باشی: کپسوله‌سازی، وراثت، چندریختی و انتزاع.

## 3.1 کلاس‌ها و کپسوله‌سازی

**کپسوله‌سازی** یعنی حالت داخلی شیء را پنهان کنی و یک رابط کوچک و امن برای عوض‌کردنش بیرون بگذاری.

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

قاعده این است: **هیچ کد دیگری نمی‌تواند شیء را به حالت نامعتبر ببرد** (جان زیر صفر)، چون تنها راه عوض‌کردنش متدی است که قواعد را رعایت می‌کند.

## 3.2 سازنده‌ها و شیءهای یونیتی

کلاس‌های سادهٔ C# سازنده دارند. **شیءهای یونیتی ندارند.** هیچ‌وقت `new MyMonoBehaviour()` ننویس و برای `MonoBehaviour` یا `ScriptableObject` سازندهٔ منطق‌دار نگذار؛ یونیتی خودش می‌سازدشان.

```csharp ساختن درست شیءهای یونیتی
var go = new GameObject("Enemy");               // GameObject: new is fine
var enemy = go.AddComponent<EnemyController>(); // components: AddComponent
enemy.Initialize(data);                         // your own setup method

var copy = Instantiate(prefab);                 // clone a prefab
var so = ScriptableObject.CreateInstance<WeaponData>();
```

> [tip] شیءهای یونیتی را با متد آماده کن
> برای `MonoBehaviour`ی که داده از بیرون لازم دارد، یک متد `Initialize(...)` بگذار (یا از تزریق وابستگی فصل ۱۹ استفاده کن) و دقیقاً بعد از `Instantiate` یا `AddComponent` صدایش بزن.

## 3.3 وراثت

کلاس مشتق‌شده یک کلاس پایه را بازاستفاده و گسترش می‌دهد (رابطهٔ **is-a**، یعنی «هست»).

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

| کلیدواژه | یعنی چه |
|---|---|
| `virtual` | متد بدنهٔ پیش‌فرض دارد و کلاس‌های مشتق می‌توانند عوضش کنند |
| `abstract` | بدنه ندارد؛ کلاس مشتق (غیر abstract) باید پیاده‌اش کند |
| `override` | عضو virtual یا abstract را جایگزین می‌کند |
| `sealed` | جلوی وراثت یا بازنویسی بیشتر را می‌گیرد |
| `base` | به کلاس پایه اشاره می‌کند (`base.Method()`) |
| `new` روی یک عضو | عضو پایه را پنهان می‌کند به‌جای اینکه بازنویسی کند. معمولاً اشتباه است؛ نکنش |

> [warn] Awake و Start و Update کلاس پایه
> یونیتی `Awake` و `Start` و `Update` را با اسم، روی مشتق‌ترین کلاس پیدا می‌کند. اگر کلاس مشتق `Awake` خودش را داشته باشد و کلاس پایه هم یکی داشته باشد، **`Awake` کلاس پایه صدا زده نمی‌شود**، مگر اینکه آن را `protected virtual` کنی و `base.Awake()` را صدا بزنی.

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

## 3.3.1 چندریختی

**چندریختی (Polymorphism)** می‌گذارد کد با یک نوع پایه یا اینترفیس کار کند، در حالی که هر نوع مشخص رفتار خودش را می‌آورد.

```csharp
Weapon weapon = new Sword();
weapon.Attack();          // "Slash"
weapon = new Gun();
weapon.Attack();          // "Shoot" (chosen at runtime)
```

> [interview] چندریختی چیست؟
> یعنی یک انتزاع واحد داشته باشی (یک کلاس پایه یا اینترفیس) و رفتار واقعی در زمان اجرا از نوع مشخص بیاید. این کار زنجیره‌های `if (type == ...)` را حذف می‌کند: اضافه‌کردن یک سلاح جدید یعنی یک کلاس تازه، نه دست‌زدن به کدی که با سلاح‌ها کار می‌کند.

یک `switch` طولانی روی یک نوع یا یک enum که برای هر حالت کد متفاوتی اجرا می‌کند، معمولاً نشانهٔ آن است که چندریختی (یا الگوی Strategy در فصل ۱۸) تمیزتر جواب می‌دهد.

## 3.4 اینترفیس‌ها و کلاس‌های abstract

**اینترفیس** یک قرارداد از توانایی‌ها است. **کلاس abstract** یک کلاس پایهٔ ناقص است که می‌تواند حالت و کد مشترک داشته باشد.

```csharp
public interface IDamageable { void TakeDamage(int amount); }
public interface IInteractable { void Interact(Player player); }

public class Crate : MonoBehaviour, IDamageable
{
    public void TakeDamage(int amount) { /* break the crate */ }
}
```

| اینترفیس | کلاس abstract |
|---|---|
| یک توانایی یا قرارداد را توصیف می‌کند | یک خانوادهٔ از نوع‌های مرتبط را توصیف می‌کند |
| یک کلاس می‌تواند چند تا را پیاده کند | یک کلاس فقط از یکی ارث می‌برد |
| حالت نمونه ندارد | می‌تواند فیلد و کد مشترک داشته باشد |
| `IDamageable`، `IInteractable`، `ISaveable` | `EnemyBase`، `WeaponBase` |

> [interview] اینترفیس یا کلاس abstract؟
> وقتی کلاس‌های بی‌ربط یک توانایی مشترک دارند اینترفیس بساز (بازیکن، دشمن و جعبه همه می‌توانند `IDamageable` باشند). وقتی نوع‌ها یک خانوادهٔ واقعی با حالت و رفتار مشترک می‌سازند، کلاس abstract بساز.

> [warn] اینترفیس‌ها در Inspector دیده نمی‌شوند
> یونیتی نمی‌تواند فیلدی از نوع اینترفیس را سریالایز کند. راه‌حل‌ها: یک `MonoBehaviour` یا کلاس پایهٔ abstract را سریالایز کن و کستش کن؛ اینترفیس را با `GetComponent<IDamageable>()` یا `TryGetComponent` بگیر؛ یا برای کلاس‌های سادهٔ C# از `[SerializeReference]` استفاده کن (فصل ۱۱).

```csharp
if (other.TryGetComponent<IDamageable>(out var target))
    target.TakeDamage(10);
```

## 3.5 ترکیب به‌جای وراثت

وراثت درخت‌های خشک می‌سازد: `Enemy`، `FlyingEnemy`، `FlyingShootingEnemy`، `FlyingShootingBossEnemy`... هر ترکیب تازه یک کلاس تازه لازم دارد. **ترکیب** شیء را از قطعه‌های کوچک می‌سازد (رابطهٔ **has-a**، یعنی «دارد») که آزادانه با هم مخلوط می‌شوند.

```csharp
public class Enemy : MonoBehaviour
{
    [SerializeField] private Health health;
    [SerializeField] private Movement movement;
    [SerializeField] private Weapon weapon;
}
```

خودِ یونیتی روی ترکیب بنا شده: `GameObject` یک ظرف است و هر `Component` یک توانایی اضافه می‌کند. اگر برای هر ترکیب تازهٔ رفتارها به یک زیرکلاس جدید نیاز داری، وراثت دارد زیاد استفاده می‌شود.

> [tip] یک قاعدهٔ کارراه‌انداز
> فقط برای رابطهٔ واقعی **is-a** با رفتار مشترک ارث‌بری کن و سلسله‌مراتب را کم‌عمق نگه دار (دو سه سطح). بقیهٔ موارد: کامپوننت‌های کوچک بساز و با اینترفیس‌ها و رویدادها به هم وصلشان کن.

## 3.6 پایه‌های شیء و کمک‌کارها

- هر کلاس از `object` ارث می‌برد و در نتیجه `ToString()` و `Equals()` و `GetHashCode()` را دارد. برای خروجی دیباگ خوانا `ToString()` را بازنویسی کن. اگر `Equals` را بازنویسی کردی، `GetHashCode` را هم بازنویسی کن؛ دو شیء برابر باید کد هش برابر بدهند.
- **متدهای الحاقی (extension method)** بدون دست‌زدن به یک نوع، متد به آن اضافه می‌کنند:

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

- **کلاس‌های `partial`** یک کلاس را بین چند فایل پخش می‌کنند؛ بیشتر همراه با کد تولیدشده استفاده می‌شود.

> [recap] جمع‌بندی فصل ۳
> - کپسوله کن: حالت خصوصی، متدهای عمومی که قواعد را رعایت می‌کنند.
> - هیچ‌وقت `MonoBehaviour` یا `ScriptableObject` را با `new` نساز؛ از `AddComponent`، `Instantiate` یا `CreateInstance` استفاده کن.
> - برای چندریختی از `virtual`/`override`/`abstract` استفاده کن؛ از پنهان‌کردن با `new` پرهیز کن.
> - `Awake` کلاس پایه را `protected virtual` کن و `base.Awake()` را صدا بزن.
> - اینترفیس برای توانایی مشترک، کلاس abstract برای خانوادهٔ مشترک.
> - یونیتی فیلدهای از نوع اینترفیس را سریالایز نمی‌کند.
> - ترکیب و کامپوننت‌های کوچک را به وراثت عمیق ترجیح بده.
