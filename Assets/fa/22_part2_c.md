# 15. ذخیره‌سازی، JSON و کار با فایل

سیستم‌های ذخیره ساده به نظر می‌رسند و به شکل‌های دردناکی خراب می‌شوند: فایل خراب، پیشرفت گم‌شده، نسخه‌های ناسازگار. کمی نظم جلوی بیشترشان را می‌گیرد.

## 15.1 انتخاب روش ذخیره‌سازی

| روش | برای چه خوب است | نکته |
|---|---|---|
| `PlayerPrefs` | چند تنظیم ساده (صدا، زبان) | کوچک و رمزنگاری‌نشده است و در مسیری مخصوص هر پلتفرم ذخیره می‌شود. برای پیشرفت بازی نه |
| `JsonUtility` + فایل | فایل ذخیرهٔ ساده | درون‌ساخت و سریع؛ امکاناتش محدود است |
| Newtonsoft Json | دادهٔ پیچیده، دیکشنری، APIها | پکیج *Newtonsoft Json* را از Package Manager نصب کن |
| فضای ابری یا سرور | بازی‌های آنلاین، پیشرفت بین دستگاه‌ها | منبع حقیقت باید سرور باشد |
| `BinaryFormatter` | **هیچ‌وقت** | ناامن و منسوخ است. خواندن یک فایل دست‌کاری‌شده می‌تواند کدی که مهاجم کنترلش می‌کند اجرا کند |

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

`JsonUtility` از قواعد سریالایز یونیتی پیروی می‌کند (فصل ۱۱)، یعنی:

- **فیلدها** را سریالایز می‌کند، نه پراپرتی‌ها.
- نمی‌تواند `Dictionary` را سریالایز کند و با آرایه یا `List` در سطح بالا هم کار نمی‌کند (باید داخل یک شیء بپیچی‌اش).
- از چندریختی، `DateTime` و مقدارهای nullable پشتیبانی نمی‌کند. زمان‌ها را به‌صورت `long` (تیک) یا یک رشتهٔ ISO نگه دار.
- کلاس‌های سفارشی به `[Serializable]` نیاز دارند.

| `JsonUtility` | Newtonsoft.Json |
|---|---|
| ساده و یونیتی‌پسند | قوی‌تر و انعطاف‌پذیرتر |
| پشتیبانی محدود از ساختارهای پیچیده | دیکشنری، پراپرتی، چندریختی، مبدل‌های سفارشی |
| برای فایل ذخیرهٔ سرراست کافی است | برای APIها و مدل‌های پیچیده بهتر است |
| پکیج اضافه لازم ندارد | به پکیج نیاز دارد |

## 15.3 یک سیستم ذخیرهٔ امن‌تر

هدف‌ها: هیچ‌وقت تنها نسخهٔ موجود خراب نشود، از شکست‌ها جان سالم به در ببرد و اجازهٔ تغییر قالب در آینده را بدهد.

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

آن مرحلهٔ فایل موقت باعث می‌شود اگر وسط نوشتن کرش کنی، ذخیرهٔ قبلی سالم بماند؛ و فایل `.bak` به `TryLoad` چیزی می‌دهد که به آن برگردد.

## 15.4 بهترین روش‌های سیستم ذخیره

- **به داده‌ات نسخه بده.** بعد از بارگذاری `data.version` را چک کن و قالب‌های قدیمی را قدم‌به‌قدم مهاجرت بده.
- **شناسه ذخیره کن، نه ارجاع.** شناسهٔ یک آیتم را ذخیره کن، نه شیء یونیتی را. موقع بارگذاری شیء را از روی شناسه بازسازی کن.
- **موقع بارگذاری اعتبارسنجی کن.** مقدارها را محدود کن و فیلدهای غایب را مدیریت کن، چون فایل‌ها می‌توانند قدیمی، دست‌کاری‌شده یا خراب باشند.
- **لحظهٔ ذخیره را با دقت انتخاب کن:** چک‌پوینت‌ها، پایان مرحله، تغییر تنظیمات. روی موبایل در `OnApplicationPause(true)` هم ذخیره کن، چون اپ می‌تواند بدون هشدار کشته شود.
- **ورودی/خروجی را از فریم حساس دور نگه دار.** فایل‌های بزرگ باید ناهمگام خوانده و نوشته شوند.
- **از `Application.persistentDataPath` استفاده کن** برای داده‌ای که باید نوشته شود. پوشهٔ نصب روی بیشتر پلتفرم‌ها قابل نوشتن نیست.
- **از `InvariantCulture` استفاده کن** وقتی خودت عددها را به متن تبدیل می‌کنی (فصل ۱).
- **مبهم‌سازی امنیت نیست.** رمزنگاری یا کدکردن یک فایل ذخیرهٔ محلی فقط جلوی ویرایش سرسری را می‌گیرد؛ هر کسی که دستگاه را دارد می‌تواند بخواندش.

> [warn] در بازی آنلاین هیچ‌وقت به کلاینت اعتماد نکن
> برای ارز، رتبه‌بندی و نتیجهٔ مسابقه، **سرور باید مرجع باشد**. کلاینت درخواست می‌فرستد؛ سرور اعتبارسنجی و ذخیره می‌کند. فایل ذخیرهٔ محلی همیشه قابل تغییر است.

> [interview] سیستم ذخیره را چطور طراحی می‌کنی؟
> کلاس‌های دادهٔ سریالایزشده با یک شمارهٔ نسخه، یک سرویس ذخیره که در فایل موقت می‌نویسد و بعد فایل قدیمی را جایگزین می‌کند (با نسخهٔ پشتیبان)، شناسه به‌جای ارجاع به شیء، اعتبارسنجی و مهاجرت موقع بارگذاری، و یک اینترفیس (`ISaveService`) تا بتوان ذخیره‌سازی را با پیاده‌سازی ابری یا یک fake در تست‌ها عوض کرد.

> [recap] جمع‌بندی فصل ۱۵
> - `PlayerPrefs` برای تنظیم‌های ریز؛ فایل JSON برای پیشرفت؛ هیچ‌وقت `BinaryFormatter`.
> - `JsonUtility` فقط فیلد و نوع‌های ساده را می‌فهمد؛ برای دادهٔ پیچیده Newtonsoft.
> - در فایل موقت بنویس، پشتیبان نگه دار، استثناها را بگیر و قالب را نسخه‌بندی کن.
> - شناسه ذخیره کن، موقع بارگذاری اعتبارسنجی کن، روی موبایل موقع pause ذخیره کن.
> - بازی‌های آنلاین به سرور مرجع نیاز دارند.

# 16. رفلکشن و اتریبیوت‌ها

**رفلکشن** به کد اجازه می‌دهد در زمان اجرا نوع‌ها، متدها و فیلدها را بازرسی و استفاده کند. **اتریبیوت‌ها** متادیتا به کد می‌چسبانند. این دو با هم موتور سریالایزرها، Inspectorها، فریم‌ورک‌های تست و ظرف‌های تزریق وابستگی را می‌چرخانند.

## 16.1 رفلکشن

```csharp
Type type = typeof(Player);              // or player.GetType()
MethodInfo[] methods = type.GetMethods();

FieldInfo field = type.GetField(
    "health", BindingFlags.NonPublic | BindingFlags.Instance);
object value = field.GetValue(player);
field.SetValue(player, 50);
```

هزینه‌های رفلکشن:

- در مقایسه با فراخوانی معمولی **کند** است و اغلب تخصیص می‌گیرد.
- **ایمن‌به‌نوع نیست**: اشتباه‌ها (مثلاً نام اشتباه یک عضو) در زمان اجرا معلوم می‌شوند.
- با تغییر نام کد، مبهم‌سازی یا **حذف شدن کد در بیلد** (بخش ۱۶.۳) می‌شکند.

در `Update` و بقیهٔ مسیرهای پرتکرار از رفلکشن استفاده نکن. اگر لازم داری، جست‌وجو را **یک‌بار** انجام بده، نتیجه را کش کن و دوباره به کارش ببر.

## 16.2 اتریبیوت‌ها

یونیتی همه‌جا از اتریبیوت استفاده می‌کند: `[SerializeField]`، `[Header]`، `[Range]`، `[CreateAssetMenu]`، `[RequireComponent]`. خودت هم می‌توانی اتریبیوت بسازی و با رفلکشن بخوانی‌اش:

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

```csharp یک‌بار در شروع برنامه فرمان‌ها را پیدا و کش کن
var commands = new Dictionary<string, MethodInfo>();
const BindingFlags flags = BindingFlags.Public | BindingFlags.Static;

foreach (MethodInfo m in typeof(Cheats).GetMethods(flags))
{
    var attr = m.GetCustomAttribute<ConsoleCommandAttribute>();
    if (attr != null) commands[attr.Name] = m;
}

commands["god"].Invoke(null, null);       // run the command
```

## 16.3 IL2CPP، حذف کد و AOT

بیشتر بیلدهای نهایی از **IL2CPP** استفاده می‌کنند که C# تو را از قبل به C++ تبدیل می‌کند (AOT)، و از **managed code stripping** که کدی را که به نظر بی‌استفاده می‌آید حذف می‌کند.

- نوعی که **فقط از طریق رفلکشن** استفاده می‌شود ممکن است بی‌استفاده به نظر برسد و حذف شود. با اتریبیوت `[Preserve]` (از `UnityEngine.Scripting`) یا یک فایل `link.xml` محافظتش کن.
- ساختن نوع‌های جنریک در زمان اجرا (`MakeGenericType`، متدهای جنریک روی نوع‌های مقداری که فقط با رفلکشن پیدا می‌شوند) روی پلتفرم‌های AOT می‌تواند شکست بخورد، چون آن کد هیچ‌وقت تولید نشده است.
- قابلیت‌هایی که به رفلکشن وابسته‌اند را در **بیلد واقعی روی دستگاه** تست کن، نه فقط در ادیتور.

## 16.4 جایگزین‌های رفلکشن

- **اینترفیس‌ها و کلاس‌های abstract** برای رفتاری که با نوع فرق می‌کند.
- **ثبت صریح:** هندلرها یا فرمان‌ها را در کد ثبت کن، به‌جای اینکه خودشان را کشف کنی.
- **`TypeCache`** (فقط ادیتور) برای پیدا کردن سریع نوع‌های مشتق‌شده در ابزارهای ادیتور.
- **Source generatorها** برای تولید پیشرفته در زمان کامپایل.

> [recap] جمع‌بندی فصل ۱۶
> - رفلکشن در زمان اجرا نوع‌ها را بازرسی می‌کند؛ قدرتمند، کند و ناایمن است. یک‌بار جست‌وجو کن، کش کن، دوباره به کار ببر.
> - اتریبیوت‌ها متادیتا هستند؛ یونیتی حسابی از آن‌ها استفاده می‌کند و تو هم می‌توانی خودت تعریف کنی.
> - حذف کد در بیلد می‌تواند کدی که فقط رفلکشنی است را بردارد: از `[Preserve]` یا `link.xml` استفاده کن و روی دستگاه تست بگیر.
> - هر جا می‌توانی اینترفیس و ثبت صریح را ترجیح بده.
