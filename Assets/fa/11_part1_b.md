# 4. مجموعه‌ها و ساختارهای داده

انتخاب مجموعهٔ درست یک تصمیم طراحی است، نه فقط یک انتخاب سینتکسی. روی سرعت، حافظه و خوانایی کد اثر می‌گذارد.

## 4.1 مجموعه‌های اصلی

| مجموعه | ترتیب | عملیات‌های کلیدی (هزینهٔ معمول) | کجا به کارش ببر |
|---|---|---|---|
| آرایهٔ `T[]` | با اندیس | دسترسی O(1)؛ جست‌وجو O(n)؛ اندازهٔ ثابت | داده‌ای که اندازه‌اش ثابت است؛ سریع‌ترین دسترسی |
| `List<T>` | با اندیس | دسترسی O(1)؛ افزودن O(1) سرشکن؛ درج/حذف O(n)؛ `Contains` با O(n) | لیست پویای پیش‌فرض |
| `Dictionary<K,V>` | تضمین‌شده نیست | جست‌وجو، افزودن و حذف به‌طور میانگین O(1) | جست‌وجوی سریع با کلید (شناسه به شیء) |
| `HashSet<T>` | تضمین‌شده نیست | افزودن، حذف و `Contains` به‌طور میانگین O(1) | یکتایی و آزمون عضویت |
| `Queue<T>` | FIFO | صف‌کردن و از صف درآوردن O(1) | صف اسپاون، ترتیب نوبت‌ها، جست‌وجوی سطح‌به‌سطح |
| `Stack<T>` | LIFO | `Push` و `Pop` با O(1) | تاریخچهٔ undo، پشتهٔ صفحه‌ها، جست‌وجوی عمق‌اول |
| `LinkedList<T>` | دنباله‌ای | درج/حذف روی گرهٔ مشخص O(1)؛ جست‌وجو O(n) | کم پیش می‌آید؛ حذف مکرر از میانه |
| `SortedDictionary`، `SortedSet` | مرتب | O(log n) | داده‌ای که باید مرتب بماند |

```csharp
var enemies = new List<Enemy>();
enemies.Add(goblin);
enemies.Remove(goblin);

var players = new Dictionary<int, Player>();
players[42] = player;
if (players.TryGetValue(42, out Player found)) found.RefreshUI();

var collected = new HashSet<int>();
if (collected.Add(itemId)) Debug.Log("First time!");   // false if present

var spawnQueue = new Queue<Enemy>();
spawnQueue.Enqueue(goblin);
Enemy next = spawnQueue.Dequeue();

var history = new Stack<GameState>();
history.Push(current);
GameState previous = history.Pop();
```

> [interview] کدام مجموعه را انتخاب می‌کنی؟
> شناسهٔ بازیکن به بازیکن: `Dictionary<int, Player>`، چون عملیات اصلی جست‌وجو با شناسه است. شناسهٔ آیتم‌های جمع‌شده: `HashSet<int>`، چون یکتایی و `Contains` مهم است. دشمنانی که در صف اسپاون‌اند: `Queue<Enemy>`. تاریخچهٔ undo: `Stack<T>`. دشمنانی که همین حالا در صحنه‌اند: `List<Enemy>`.

## 4.2 حذف امن عضوها

عوض‌کردن یک `List` یا `Dictionary` وقتی یک `foreach` دارد روی آن می‌چرخد، `InvalidOperationException` می‌دهد. به‌جایش یکی از این‌ها را انجام بده:

```csharp
// 1. Loop backwards and remove by index
for (int i = enemies.Count - 1; i >= 0; i--)
    if (enemies[i].IsDead) enemies.RemoveAt(i);

// 2. Or remove everything that matches
enemies.RemoveAll(e => e.IsDead);
```

اگر ترتیب مهم نیست، «جابه‌جا کن و بردار» با O(1) حذف می‌کند، به‌جای اینکه همهٔ عضوهای بعدی را جابه‌جا کند:

```csharp
static void RemoveUnordered<T>(List<T> list, int index)
{
    int last = list.Count - 1;
    list[index] = list[last];
    list.RemoveAt(last);       // removing the last item is cheap
}
```

## 4.3 ظرفیت، بازاستفاده و دیکشنری‌ها

- `List<T>` با دو برابر کردن ظرفیت رشد می‌کند و کپی می‌سازد. اگر اندازه را می‌دانی، همان اول جا بگیر: `new List<T>(64)`.
- `Clear()` مجموعه را خالی می‌کند ولی **ظرفیتش را نگه می‌دارد**، پس اگر یک لیست را به‌عنوان فیلد نگه داری و دوباره استفاده کنی، تخصیص‌های تکراری حذف می‌شود.
- به‌جای `ContainsKey` و بعد ایندکسر — که کلید را دو بار جست‌وجو می‌کند — از `TryGetValue` استفاده کن.
- کلیدهای دیکشنری به هش پایدار نیاز دارند. شیئی که هشش تغییر می‌کند را کلید نکن. کلیدهای struct سفارشی باید `IEquatable<T>` پیاده کنند.
- هیچ‌وقت به ترتیب چرخش دیکشنری تکیه نکن.

## 4.4 بیرون دادن امن مجموعه‌ها

اگر لیست داخلی‌ات را به صدازننده‌ها برگردانی، می‌توانند عوضش کنند. یک نمای فقط‌خواندنی بده:

```csharp
private readonly List<Enemy> enemies = new();
public IReadOnlyList<Enemy> Enemies => enemies;   // no allocation
```

## 4.5 چرخش روی مجموعه‌ها و زباله

- `foreach` روی آرایه، `List<T>` یا `Dictionary` در نسخه‌های امروزی یونیتی **تخصیصی ندارد**.
- `foreach` روی همان مجموعه از طریق متغیری از نوع `IEnumerable<T>` یا `IList<T>` **enumerator را بوکس می‌کند** و این تخصیص می‌گیرد. در کدهای پرتکرار نوع واقعی را نگه دار.
- متدهایی که آرایه یا لیست تازه برمی‌گردانند (`Physics.OverlapSphere`، `GetComponents<T>()`) هر بار تخصیص می‌گیرند. از نسخه‌های قابل‌بازاستفاده استفاده کن:

```csharp کوئری فیزیک بدون تخصیص
private readonly Collider[] hits = new Collider[16];

void Scan(Vector3 center, float radius, LayerMask mask)
{
    int count = Physics.OverlapSphereNonAlloc(center, radius, hits, mask);
    for (int i = 0; i < count; i++) Process(hits[i]);
}
```

```csharp لیست‌های موقت از استخر (using UnityEngine.Pool)
using (ListPool<Enemy>.Get(out List<Enemy> temp))
{
    CollectEnemiesInRange(temp);
    foreach (Enemy e in temp) e.Alert();
}   // the list returns to the pool here
```

> [recap] جمع‌بندی فصل ۴
> - پیش‌فرض `List`، برای جست‌وجو با کلید `Dictionary`، برای یکتایی `HashSet` و برای ترتیب `Queue` و `Stack`.
> - وسط `foreach` مجموعه را عوض نکن؛ از آخر به اول بچرخ یا `RemoveAll` بزن.
> - `TryGetValue` را به کار ببر، از قبل برای مجموعه جا بگیر و با `Clear()` دوباره استفاده‌اش کن.
> - `IReadOnlyList<T>` بیرون بده، نه خودِ لیست داخلی.
> - در کدهای پرتکرار: نوع مشخص مجموعه را نگه دار و از APIهای `NonAlloc` یا لیست‌های استخری استفاده کن.

# 5. جنریک‌ها و ایمنی نوع

جنریک‌ها می‌گذارند یک کلاس یا متد را یک‌بار بنویسی و با نوع‌های زیادی استفاده کنی، در حالی که کامپایلر هنوز هر استفاده را چک می‌کند.

## 5.1 چرا جنریک؟

- **ایمنی نوع:** `List<Enemy>` نمی‌تواند اشتباهی یک `Bullet` را در خودش جا بدهد. خطاها در زمان کامپایل معلوم می‌شوند.
- **بدون کست:** یک `Enemy` تحویل می‌گیری، نه یک `object`.
- **بدون بوکسینگ:** `List<int>` خودِ intها را نگه می‌دارد، برخلاف `ArrayList` قدیمی.
- **بازاستفاده:** یک پیاده‌سازی از استخر، رویداد‌باس یا ماشین حالت به کار همهٔ نوع‌ها می‌آید.

```csharp
public class SimplePool<T> where T : class, new()
{
    private readonly Stack<T> items = new();

    public T Get() => items.Count > 0 ? items.Pop() : new T();
    public void Release(T item) => items.Push(item);
}

var bullets = new SimplePool<Bullet>();   // Bullet is a plain class
```

## 5.2 متدهای جنریک و استنتاج نوع

```csharp
public static T GetRandom<T>(IReadOnlyList<T> items)
{
    return items[UnityEngine.Random.Range(0, items.Count)];
}

Enemy e = GetRandom(enemies);   // T is inferred as Enemy
```

## 5.3 محدودیت‌ها (Constraints)

محدودیت‌ها به کامپایلر می‌گویند یک پارامتر نوع چه چیزهایی باید داشته باشد، تا بتوانی با خیال راحت از آن‌ها استفاده کنی.

| محدودیت | یعنی |
|---|---|
| `where T : class` | نوع ارجاعی |
| `where T : struct` | نوع مقداری غیرقابل‌null |
| `where T : unmanaged` | struct بدون فیلد ارجاعی (برای Jobs و Burst) |
| `where T : new()` | سازندهٔ عمومی بدون پارامتر دارد |
| `where T : BaseClass` | همان `BaseClass` است یا از آن ارث می‌برد |
| `where T : IInterface` | آن اینترفیس را پیاده کرده |
| `where T : Component` | یک کامپوننت یونیتی |

```csharp
public static T Spawn<T>(T prefab, Vector3 position)
    where T : Component
{
    return UnityEngine.Object.Instantiate(
        prefab, position, Quaternion.identity);
}

Bullet b = Spawn(bulletPrefab, muzzle.position);   // typed result
```

## 5.4 جنریک‌ها در یونیتی

- تا وقتی نوع یک `MonoBehaviour` باز است (`Bar<T>`) نمی‌توانی به شیء اضافه‌اش کنی. یک کلاس مشخص و **بسته** مشتق کن (`class HealthBar : Bar<Health>`) و در فایلی با همان نام بگذارش.
- یونیتی امروزی فیلدهایی را سریالایز می‌کند که نوعشان یک کلاس جنریک `[Serializable]` است، مثل `Wrapper<int>`.
- یک کلاس پایهٔ Singleton جنریک (`Singleton<T> : MonoBehaviour`) رایج است، ولی همهٔ بدی‌های Singleton را به ارث می‌برد (فصل ۱۸).
- فیلدهای static در یک کلاس جنریک **به‌ازای هر نوع بسته یک‌بار** وجود دارند: `Cache<int>` و `Cache<string>` دو static جدا دارند.

> [interview] چرا جنریک بهتر از object است؟
> ایمنی نوع را نگه می‌دارد (خطاها در زمان کامپایل)، کست‌ها را حذف می‌کند و از بوکسینگ نوع‌های مقداری جلوگیری می‌کند. از همه مهم‌تر قصد را مستند می‌کند: `Pool<Bullet>` دقیقاً می‌گوید چه چیزی درونش است.

> [recap] جمع‌بندی فصل ۵
> - جنریک‌ها بازاستفاده به‌علاوهٔ ایمنی نوع می‌دهند، بدون بوکسینگ.
> - با محدودیت‌ها (`where T : ...`) اعضای `T` را در دسترس بگیر.
> - `default(T)` مقدار صفر یا null می‌دهد؛ `typeof(T)` خودِ نوع را.
> - فقط نوع‌های بسته را می‌توان به‌عنوان کامپوننت یونیتی اضافه کرد.

# 6. دیلیگیت‌ها، رویدادها و لامبداها

این‌ها بلوک‌های سازندهٔ کدهای callback و رویدادمحور هستند که در تقریباً هر پروژهٔ یونیتی سیستم‌ها را از هم جدا می‌کنند.

## 6.1 دیلیگیت‌ها

**دیلیگیت** یک ارجاع ایمن‌به‌نوع به یک متد است. یک دیلیگیت می‌تواند چند متد را نگه دارد (multicast) و به‌ترتیب صدا بزندشان.

```csharp
public delegate void DamageHandler(int amount);

void ShowDamage(int amount) => Debug.Log(amount);

DamageHandler handler = ShowDamage;
handler += FlashScreen;     // multicast: both methods now run
handler(20);
```

## 6.2 Action و Func و Predicate

کم پیش می‌آید که خودت نوع دیلیگیت تعریف کنی. فریم‌ورک انواع جنریکش را دارد:

| نوع | شکلش | مثال |
|---|---|---|
| `Action` | بدون پارامتر و بدون خروجی | `Action onDied;` |
| `Action<T>` | پارامتر دارد، خروجی ندارد | `Action<int> onHealthChanged;` |
| `Func<T, R>` | پارامتر دارد و `R` برمی‌گرداند | `Func<int, int, int> add;` |
| `Predicate<T>` | یک پارامتر، خروجی `bool` | `Predicate<Enemy> isDead;` |
| `Comparison<T>` | دو مقدار را مقایسه می‌کند | `list.Sort((a, b) => a.Id - b.Id);` |

```csharp
Func<int, int, int> add = (a, b) => a + b;
Predicate<Enemy> isDead = e => e.Health <= 0;
List<Enemy> dead = enemies.FindAll(isDead);
```

## 6.3 رویدادها

کلیدواژهٔ `event` یک دیلیگیت را می‌پیچد تا کد بیرونی فقط بتواند **عضو شود (`+=`) و عضو را بردارد (`-=`)**. تنها کلاسی که صاحبش است می‌تواند رویداد را فرا بخواند. این همان الگوی Observer است که داخل خودِ زبان جا گرفته.

```csharp
public class PlayerHealth : MonoBehaviour
{
    public event Action<int> HealthChanged;
    public event Action Died;

    private int current = 100;

    public void TakeDamage(int amount)
    {
        current = Mathf.Max(0, current - amount);
        HealthChanged?.Invoke(current);
        if (current == 0) Died?.Invoke();
    }
}
```

```csharp عضو شدن در یک شنونده (مثلاً یک اسکریپت رابط کاربری)
[SerializeField] private PlayerHealth health;

private void OnEnable()
{
    health.HealthChanged += UpdateBar;
    health.Died += ShowDeathScreen;
}

private void OnDisable()
{
    health.HealthChanged -= UpdateBar;
    health.Died -= ShowDeathScreen;
}
```

> [tip] منتشرکننده نباید شنونده‌هایش را بشناسد
> `PlayerHealth` هیچ‌وقت از رابط کاربری، صدا یا سیستم ذرات اسم نمی‌برد. فقط اعلام می‌کند «جان عوض شد» و «مُرد». هر سیستمی که علاقه‌مند است خودش عضو می‌شود. اضافه‌کردن یک واکنش جدید (لرزش دوربین، دستاورد) هیچ تغییری در `PlayerHealth` لازم ندارد.

شکل `?.Invoke()` وقتی هیچ‌کس عضو نیست امن است. هر `+=` را با یک `-=` جفت کن: در `OnEnable` عضو شو و در `OnDisable` بیرون بیا.

## 6.4 دام‌های رویداد

- **فراموش‌کردن `-=`:** منتشرکننده شنونده را زنده نگه می‌دارد، پس هیچ‌وقت جمع نمی‌شود و ممکن است بعد از نابودی‌اش هم صدا زده شود (`MissingReferenceException`).
- **رویدادهای static** به عمر کل اپلیکیشن زنده‌اند و از بارگذاری صحنه‌ها جان سالم به در می‌برند؛ پس با حوصله `-=` بزن و اگر Domain Reload خاموش است ریستشان کن.
- **یک استثنا در یکی از شنونده‌ها** بقیهٔ شنونده‌های همان فراخوانی را متوقف می‌کند.
- **به ترتیب صدا زدن تکیه نکن.** شنونده‌ها به ترتیب عضوشدن اجرا می‌شوند، ولی این یک تصادف است نه قرارداد.
- عوض‌کردن شنونده‌ها وسط فراخوانی رویداد امن است: تغییر روی فراخوانی بعدی اثر می‌گذارد.

## 6.5 رویداد C# یا UnityEvent؟

| `event` و `Action` سی‌شارپ | `UnityEvent` |
|---|---|
| در کد سیم‌کشی می‌شود | در Inspector سیم‌کشی می‌شود |
| ایمن‌به‌نوع، سریع، بدون هزینهٔ سریالایز | کندتر؛ در بعضی حالت‌ها با آرگومان تخصیص می‌گیرد |
| برای ارتباط کد با کد بهترین است | برای وصل‌کردن‌های طراح‌پسند بهترین است (دکمه‌ها، تریگرها) |
| جست‌وجو و ریفکتور کردنش راحت است | با تغییر نام متدها بی‌صدا می‌شکند |

## 6.6 لامبدا و بسته (Closure)

**لامبدا** یک تابع بی‌نام و درون‌خطی است. **بسته (closure)** وقتی ساخته می‌شود که لامبدا از یک متغیر متد اطرافش استفاده کند.

```csharp
Func<int, bool> isPositive = x => x > 0;
enemies.RemoveAll(e => e.IsDead);

int bonus = 5;
Func<int, int> addBonus = x => x + bonus;   // captures 'bonus'
```

- لامبدایی که متغیر **می‌گیرد**، کامپایلر را مجبور می‌کند یک شیء پنهان (بسته) بسازد و این تخصیص حافظه است. اگر هر فریم این کار را بکنی، زباله تولید می‌شود.
- لامبدای `static` (C# 9) نمی‌تواند چیزی بگیرد، پس تضمین می‌کند بسته‌ای ساخته نشود: `Func<int,int> twice = static x => x * 2;`
- پاس‌دادن نام یک متد جایی که دیلیگیت انتظار می‌رود (`list.Sort(Compare)`) ممکن است هر بار یک دیلیگیت تازه بسازد. در کدهای پرتکرار دیلیگیت را در یک فیلد نگه دار.
- لامبدای بی‌نام را بعداً نمی‌توانی حذف کنی، چون ارجاعی برای برداشتن نداری. برای شنونده‌های رویداد از متد نام‌دار استفاده کن.

```csharp
health.Died += () => Debug.Log("dead");   // cannot be removed later
health.Died += OnDied;                    // can be removed with -=
```

> [recap] جمع‌بندی فصل ۶
> - `Action` و `Func` و `Predicate` تقریباً هر نیاز دیلیگیتی را پوشش می‌دهند.
> - `event` غریبه‌ها را به `+=` و `-=` محدود می‌کند؛ برای فراخوانی از `?.Invoke()` استفاده کن.
> - در `OnEnable` عضو شو و در `OnDisable` بیرون بیا. همیشه.
> - لامبداهایی که متغیر می‌گیرند تخصیص می‌کنند؛ برای شنونده‌های رویداد متد نام‌دار بهتر است.
> - رویدادهای C# برای کد؛ `UnityEvent` وقتی طراح باید در Inspector چیزی را وصل کند.

# 7. LINQ

LINQ مخفف Language Integrated Query است و به تو اجازه می‌دهد مجموعه‌ها را با سبکی خوانا و اعلانی فیلتر، تبدیل و جمع‌بندی کنی. `using System.Linq;` را یادت نرود.

## 7.1 عملگرهای پرکاربرد

| عملگر | کارش |
|---|---|
| `Where` | فیلتر کردن |
| `Select` | تبدیل هر عضو |
| `OrderBy`، `ThenBy`، `OrderByDescending` | مرتب‌سازی |
| `First`، `FirstOrDefault` | اولین عضو (یا اولین تطابق). اگر چیزی نباشد `First` استثنا می‌دهد |
| `Single`، `SingleOrDefault` | دقیقاً یک تطابق؛ اگر چند تا باشد استثنا می‌دهد |
| `Any`، `All` | حداقل یکی / همه تطابق داشته باشند |
| `Count`، `Sum`، `Min`، `Max`، `Average` | جمع‌بندی |
| `Distinct`، `Take`، `Skip` | حذف تکراری‌ها، برداشتن یا رد کردن تعدادی عضو |
| `GroupBy` | گروه‌بندی بر اساس یک کلید |
| `ToList`، `ToArray`، `ToDictionary` | تبدیل نتیجه به یک مجموعه |

```csharp
var alive = enemies
    .Where(e => e.Health > 0)
    .OrderBy(e => e.DistanceToPlayer)
    .ToList();

bool anyBoss = enemies.Any(e => e.IsBoss);
int totalGold = items.Sum(i => i.Gold);
Enemy boss = enemies.FirstOrDefault(e => e.IsBoss);   // null if none
var byType = enemies.GroupBy(e => e.Type);
```

## 7.2 اجرای به‌تعویق‌افتاده

بیشتر کوئری‌های LINQ **همان‌جا که می‌نویسی‌شان اجرا نمی‌شوند**؛ هر بار که روی‌شان بچرخی اجرا می‌شوند.

```csharp
var query = enemies.Where(e => e.IsAlive);  // nothing has run yet
enemies.Add(newEnemy);                       // change the source
foreach (Enemy e in query) { }               // runs now, sees newEnemy
```

چرخیدن دو بار روی یک کوئری، دو بار اجرایش می‌کند. هر وقت یک عکس لحظه‌ای ثابت می‌خواهی، `ToList()` یا `ToArray()` بزن.

## 7.3 LINQ و کارایی

LINQ enumerator و بسته و مجموعهٔ نتیجه می‌سازد. در کدی که هر فریم اجرا می‌شود، این‌ها روی هم جمع می‌شوند و هم زباله می‌دهند و هم وقت CPU می‌گیرند.

- **بی‌مشکل:** بارگذاری داده، ساختن منو، ابزارهای ادیتور، تست‌ها، کد آماده‌سازی یک‌باره.
- **پرهیز کن:** `Update`، callbackهای فیزیک، حلقه‌های هوش مصنوعی برای تعداد زیادی عامل، هر چیزی که در هر فریم چند بار صدا زده می‌شود.
- در مسیرهای پرتکرار یک حلقهٔ سادهٔ معمولی بنویس. معمولاً به‌همان اندازه خوانا است:

```csharp
Enemy FindNearest(List<Enemy> enemies, Vector3 from)
{
    Enemy best = null;
    float bestSqr = float.MaxValue;

    for (int i = 0; i < enemies.Count; i++)
    {
        float sqr = (enemies[i].Position - from).sqrMagnitude;
        if (sqr < bestSqr) { bestSqr = sqr; best = enemies[i]; }
    }
    return best;
}
```

> [interview] چرا LINQ در `Update` می‌تواند مشکل باشد؟
> چون enumerator و بسته و لیست نتیجه می‌سازد و هزینه‌اش به کوئری بستگی دارد. یک بار صدازدنش شاید ارزان باشد، ولی هر فریم که تکرار شود فشار GC و پرش فریم می‌سازد. قبل از تصمیم‌گرفتن پروفایل می‌کنم و در مسیرهای پرتکرار حلقهٔ ساده می‌نویسم.

> [warn] IL2CPP و نوع‌های مقداری جنریک
> روی پلتفرم‌های از‌پیش‌کامپایل‌شده (iOS، کنسول‌ها، WebGL) بعضی الگوهای LINQ یا جنریک روی نوع‌های مقداری ممکن است در زمان اجرا شکست بخورند، چون کد لازم برای آن نوع هیچ‌وقت تولید نشده است. کدهای پُرِ LINQ را روی بیلد واقعی دستگاه تست کن، نه فقط در ادیتور.

> [recap] جمع‌بندی فصل ۷
> - LINQ برای خوانایی عالی است: `Where`، `Select`، `OrderBy`، `Any`، `FirstOrDefault`، `ToList`.
> - کوئری‌ها تنبل‌اند؛ اگر عکس لحظه‌ای می‌خواهی با `ToList()` مادی‌اش کن.
> - LINQ را از کدهای هر فریم بیرون نگه دار؛ آنجا حلقه بنویس.
> - وقتی ممکن است تطابقی نباشد، `FirstOrDefault` (با چک‌کردن null) بهتر از `First` است.
