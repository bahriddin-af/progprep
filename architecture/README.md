# M9 · Arxitektura va dizayn

`system-design/` dan farqi: **architecture** — bitta ilova ichidagi kod tashkiloti;
**system-design** — tarqoq tizim, infratuzilma, masshtab. Intervyuda bular ko'pincha
alohida round.

> **Bu modulning asosiy qoidasi:** har pattern uchun «buni ishlatmaslik qachon
> to'g'ri?» degan savolga javob bering. Pattern'ni maqtash — junior javob;
> chegarasini bilish — senior javob.

| # | Mavzu | P |
|---|---|---|
| [9.1](#91--solid-) | SOLID ⭐ | P0 |
| [9.2](#92--meros-vs-kompozitsiya-dry-kiss-yagni) | Meros vs kompozitsiya, DRY/KISS/YAGNI | P1 |
| [9.3](#93--design-patternlar) | Design pattern'lar | P1 |
| [9.4](#94--qatlamli-clean-hexagonal) | Qatlamli, Clean, Hexagonal | P1 |
| [9.5](#95--ddd-entity-value-object-aggregate-) | DDD: entity, value object, aggregate ⭐ | P1 |
| [9.6](#96--bounded-context-va-ubiquitous-language) | Bounded context, ubiquitous language | P1 |
| [9.7](#97--domain-event-va-integration-event) | Domain event va integration event | P1 |
| [9.8](#98--cqrs-) | CQRS ⭐ | P1 |
| [9.9](#99--event-sourcing) | Event sourcing | P2 |
| [9.10](#910--monolit-va-mikroservis-) | Monolit va mikroservis ⭐ | P1 |
| [9.11](#911--modular-monolith) | Modular monolith | P1 |
| [9.12](#912--adr--qaror-hujjatlashtirish) | ADR — qaror hujjatlashtirish | P2 |

---

# 9.1 · SOLID ⭐

## Nima va nega

SOLID — beshta prinsip, ular **o'zgarish narxini** kamaytirishga xizmat qiladi.
Intervyuda ta'rifni aytish yetarli emas: deyarli har doim «**o'z kodingizdan misol
keltiring**» deb so'raladi.

```
   Har prinsip bitta savolga javob beradi:

   S  — bu sinf O'ZGARISHI uchun nechta sabab bor?
   O  — yangi funksiya qo'shish uchun MAVJUD kodni o'zgartirish kerakmi?
   L  — vorisni ota-ona o'rniga qo'yganda kod buziladimi?
   I  — bu interfeysni implement qilganda KERAKSIZ metodlar chiqadimi?
   D  — yuqori qatlam pastki qatlamning DETALIGA bog'liqmi?
```

## S — Single Responsibility

> Sinfning o'zgarishi uchun **bitta sabab** bo'lsin.

```csharp
// ❌ Uchta sabab: to'lov mantiqi, SMS provayderi, chek formati
public sealed class PaymentService
{
    public async Task ProcessAsync(Payment p)
    {
        await _ledger.WriteAsync(p);
        await _sms.SendAsync(p.Phone, $"To'lov: {p.Amount}");     // SMS o'zgarsa — tegish
        var pdf = GenerateReceiptPdf(p);                          // format o'zgarsa — tegish
        await _storage.SaveAsync(pdf);
    }
}

// ✅ Bitta sabab; qolgani hodisaga reaksiya
public sealed class PaymentService
{
    public async Task<Result> ProcessAsync(Payment p, CancellationToken ct)
    {
        var result = await _ledger.WriteAsync(p, ct);
        if (result.IsSuccess)
            _outbox.Add(new PaymentCompleted(p.Id, p.Amount));    // M10.3
        return result;
    }
}
```

## O — Open/Closed

> Kengaytirishga ochiq, o'zgartirishga yopiq.

```csharp
// ❌ Har yangi provayderda SHU metod o'zgaradi
public decimal Charge(string provider, Money amount) => provider switch
{
    "click" => ClickPay(amount),
    "payme" => PaymePay(amount),
    _ => throw new NotSupportedException()
};

// ✅ Yangi provayder = yangi sinf, eski kod tegilmaydi
public interface IPaymentProvider
{
    string Code { get; }
    Task<ProviderResult> ChargeAsync(Money amount, IdempotencyKey key, CancellationToken ct);
}

public sealed class PaymentRouter(IEnumerable<IPaymentProvider> providers)
{
    public Task<ProviderResult> ChargeAsync(string code, Money amount, ...) =>
        providers.First(p => p.Code == code).ChargeAsync(amount, key, ct);
}
```

## L — Liskov Substitution

> Vorisni ota-ona o'rniga qo'yganda dastur buzilmasin.

```csharp
// ❌ Klassik buzilish
public class Account
{
    public virtual Result Withdraw(Money amount) { /* ... */ }
}

public sealed class SavingsAccount : Account
{
    public override Result Withdraw(Money amount)
        => throw new NotSupportedException("Bu hisobdan yechib bo'lmaydi");
    // ⚠ Chaqiruvchi Account bilan ishlayapti va exception KUTMAYDI
}

// ✅ Imkoniyatni turga chiqarish
public interface IAccount { Money Balance { get; } }
public interface IWithdrawable : IAccount { Result Withdraw(Money amount); }
```

```
   LSV buzilishining belgilari:
   · voris metodda exception tashlaydi
   · voris shartni QATTIQROQ qiladi (pre-condition kuchaytirish)
   · voris kamroq kafolat beradi (post-condition zaiflashtirish)
```

## I — Interface Segregation

> Katta interfeys o'rniga kichiklari.

```csharp
// ❌ Testda 15 metodni mock qilish kerak
public interface IRepository<T>
{
    Task<T?> GetAsync(Guid id);
    Task<IReadOnlyList<T>> ListAsync();
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(Guid id);
    Task<int> CountAsync();
    // ... yana 9 ta
}

// ✅ Faqat kerakli imkoniyat
public interface IAccountReader { Task<Account?> GetAsync(Guid id, CancellationToken ct); }
public interface IAccountWriter { void Add(Account account); }
```

> Amaliy signal: testda ko'p metodni mock qilish kerak bo'lsa — interfeys katta.

## D — Dependency Inversion

> Yuqori qatlam **abstraksiyaga** bog'lansin, konkret implementatsiyaga emas.

```
   ❌ Bog'liqlik yo'nalishi                ✅ Inversiya

   PaymentService                          PaymentService
        │                                       │
        ▼ (new SqlRepository)                   ▼ (IPaymentRepository)
   SqlRepository                           IPaymentRepository
                                                ▲
                                                │ implements
                                          SqlRepository

   → Domen infratuzilmani BILMAYDI
   → Test uchun almashtirish oson
```

```csharp
// ❌ Test yozib bo'lmaydi
public sealed class PaymentService
{
    private readonly SqlPaymentRepository _repo = new();
    private readonly HttpClient _http = new();
}

// ✅
public sealed class PaymentService(IPaymentRepository repo, IPaymentProvider provider);
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| SOLID'ni ta'rif bilan aytish | «O'z misolingiz?» savolida qoqilasiz |
| Har sinfni bitta metodga bo'lish | Anemik dizayn, kod tarqoq |
| Interfeysni faqat mock uchun yaratish | Ortiqcha abstraksiya |
| Meros bilan LSV ni buzish | Kutilmagan exception |
| DI ni service locator bilan chalkashtirish | Bog'liqliklar yashirin (M7.3) |

## Fintech konteksti

- **O** — to'lov provayderlari: yangisi qo'shilganda mavjud kodga tegilmasligi kerak.
- **D** — domen `IPaymentRepository` ga bog'lanadi; EF Core, Dapper yoki tashqi API
  — bu infratuzilma detali.
- **S** — `PaymentService` faqat pul harakatiga javob beradi; xabar yuborish,
  chek yasash — outbox orqali alohida handler'lar.

## Intervyu savollari

**1. SOLID'ni o'z kodingizdan misol bilan tushuntiring** ⭐

> Tayyor tuzilma: **prinsip → menda bo'lgan holat → nima o'zgardi**.
>
> **S**: to'lov servisi ichida SMS yuborish bor edi; provayder o'zgarganda to'lov
> testlari buzildi. Ajratdim — endi SMS alohida handler, outbox orqali.
>
> **O**: provayder tanlash `switch` bilan edi, har yangisida shu metod
> o'zgarardi. `IPaymentProvider` ga o'tkazdim — endi yangi provayder yangi sinf.
>
> **D**: servis ichida `new HttpClient()` bor edi, test yozib bo'lmasdi.
> Interfeysga o'tkazdim.
>
> Ta'rif emas, **o'zgarish natijasi** muhim: «endi X o'zgarsa Y ga tegmayman».

**2. Liskov prinsipi qanday buziladi?**

> Eng ko'p uchraydigan belgi — voris metodda `NotSupportedException` tashlaydi.
> Chaqiruvchi ota-ona turi bilan ishlayapti va bunday xatoni kutmaydi.
>
> Boshqa belgilar: voris kirish shartlarini qattiqroq qiladi yoki kamroq kafolat
> beradi.
>
> Yechim odatda — imkoniyatni alohida interfeysga chiqarish: `IWithdrawable`
> bo'lmagan hisob shunchaki uni implement qilmaydi.

**3. Har sinfga interfeys yaratasizmi?**

> Yo'q. Interfeys **haqiqiy sabab** bo'lganda yaratiladi: bir necha
> implementatsiya bor, chegara kesib o'tilyapti (domen ↔ infratuzilma), yoki
> almashtirish rejalashtirilgan.
>
> Faqat mock uchun interfeys — ortiqcha abstraksiya. Fintech'da men DB'ni
> Testcontainers bilan test qilaman (M6.9), ya'ni mock uchun interfeys kerak
> emas.

## Deliverable

```csharp
public class SolidTests
{
    [Fact]
    public void NewProvider_RequiresNoChangesToRouter()
    {
        var providers = new IPaymentProvider[] { new ClickProvider(), new FakeProvider() };
        var router = new PaymentRouter(providers);

        Assert.NotNull(router.Resolve("fake"));     // router kodiga tegilmadi
    }

    [Fact]
    public void AllAccountTypes_HonourWithdrawContract()
    {
        foreach (var account in AllWithdrawableAccounts())
        {
            var result = account.Withdraw(Money.FromMajor(1m, Currency.Uzs));
            Assert.IsType<Result>(result);          // exception EMAS — LSV
        }
    }

    [Fact]
    public void DomainLayer_DoesNotReferenceInfrastructure()
    {
        var domain = typeof(Payment).Assembly;
        var forbidden = new[] { "Microsoft.EntityFrameworkCore", "Npgsql", "System.Net.Http" };

        foreach (var reference in domain.GetReferencedAssemblies())
            Assert.DoesNotContain(reference.Name, forbidden);
    }
}
```

## Xotira kartasi

```
S  bitta o'zgarish sababi · to'lov ≠ SMS ≠ chek
O  yangi funksiya = yangi SINF, mavjud kod tegilmaydi (switch → interfeys)
L  voris ota-ona o'rniga qo'yilsa buzilmasin
   belgi: NotSupportedException · shartni qattiqlashtirish
I  kichik interfeyslar · signal: testda ko'p metod mock qilinadi
D  yuqori qatlam ABSTRAKSIYAGA bog'lanadi · domen infratuzilmani BILMAYDI
Intervyu   ta'rif YETARLI EMAS → prinsip → menda bo'lgan holat → nima o'zgardi
Ehtiyot    har sinfga interfeys ❌ · faqat mock uchun interfeys ❌
```

---

# 9.2 · Meros vs kompozitsiya, DRY/KISS/YAGNI

## Meros va kompozitsiya

```
   MEROS (is-a)                    KOMPOZITSIYA (has-a)
   ┌────────────────┐              ┌────────────────┐
   │  Account       │              │  Account       │
   └───────┬────────┘              │   ┌──────────┐ │
           │                       │   │ Limits   │ │
   ┌───────▼────────┐              │   └──────────┘ │
   │ SavingsAccount │              │   ┌──────────┐ │
   └────────────────┘              │   │ FeeRule  │ │
                                   │   └──────────┘ │
   · qattiq bog'lanish             └────────────────┘
   · ishlash vaqtida o'zgarmaydi   · moslashuvchan
   · LSV buzilishi xavfi            · ishlash vaqtida almashtiriladi
   · "fragile base class"           · test qilish oson
```

> **Amaliy qoida:** meros zanjirini 2 darajadan chuqurlashtirish deyarli har doim
> keyinchalik muammo bo'ladi. Shubha bo'lsa — kompozitsiya.

```csharp
// ❌ Meros bilan xatti-harakat variantlari
public class Account { }
public class VipAccount : Account { }
public class VipForeignAccount : VipAccount { }     // kombinatoriya portlashi

// ✅ Kompozitsiya
public sealed class Account
{
    private readonly IFeePolicy _feePolicy;
    private readonly ILimitPolicy _limitPolicy;
    // VIP + chet el = ikki policy kombinatsiyasi, yangi sinf kerak emas
}
```

## DRY — chegarasi bor

```
   DRY = Don't Repeat Yourself
   Lekin: DRY BILIMGA tegishli, KODGA emas.

   Ikki joyda bir xil ko'rinadigan kod, lekin BOSHQA sabablardan
   o'zgaradi → ular DUBLIKAT EMAS, ularni birlashtirish XATO.
```

```csharp
// ⚠ Bir xil ko'rinadi, lekin turli sabablardan o'zgaradi
decimal CalculatePaymentFee(Money amount) => amount.ToMajor() * 0.02m;
decimal CalculateRefundFee(Money amount)  => amount.ToMajor() * 0.02m;

// Ularni birlashtirsangiz: ertaga refund komissiyasi 0 bo'ladi
// va siz shartlar qo'sha boshlaysiz — bu yomonlashuv
```

> **Noto'g'ri abstraksiya dublikatdan qimmatroq.** Uchinchi marta takrorlangandan
> keyin abstraksiya qiling (rule of three) — shunda naqsh aniq ko'rinadi.

## KISS va YAGNI

```
   KISS  — Keep It Simple
           Eng sodda ishlaydigan yechim. Murakkablik OQLANISHI kerak.

   YAGNI — You Aren't Gonna Need It
           «Kelajakda kerak bo'lishi mumkin» degan kod YOZILMAYDI.
           Amalda u ~70% hollarda kerak bo'lmaydi va faqat yuk bo'ladi.
```

```csharp
// ❌ YAGNI buzilishi — hech kim so'ramagan moslashuvchanlik
public interface IPaymentProcessor<TRequest, TResponse, TContext>
    where TRequest : IPaymentRequest<TContext>
    where TResponse : IPaymentResponse
    where TContext : IProcessingContext { }

// ✅ Bugungi ehtiyoj
public interface IPaymentProcessor
{
    Task<Result<Payment>> ProcessAsync(PaymentRequest request, CancellationToken ct);
}
```

```
   ⚠ YAGNI ning CHEGARASI:

   Ba'zi qarorlarni keyin o'zgartirish JUDA QIMMAT:
   · ma'lumot modeli (migratsiya)
   · API shartnomasi (client'lar)
   · xavfsizlik va audit (regulyator)

   → Bularda oldindan o'ylash oqlanadi.
   → Qolgan hamma joyda YAGNI.
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Chuqur meros zanjiri | Fragile base class, o'zgartirish qo'rqinchli |
| DRY ni ko'r-ko'rona qo'llash | Noto'g'ri abstraksiya, shartlar to'plami |
| Erta abstraksiya | Ishlatilmaydigan moslashuvchanlik |
| «Kelajakda kerak» kodi | Qo'llab-quvvatlash yuki |
| KISS ni bahona qilib dizaynsiz kod | Texnik qarz |
| YAGNI ni ma'lumot modeliga qo'llash | Migratsiya qimmatga tushadi |

## Fintech konteksti

- **Ma'lumot modeli va API** — bu yerda YAGNI cheklangan: `amount_minor` va
  `currency` boshidan to'g'ri bo'lishi kerak (M4.3), keyin o'zgartirish qimmat.
- **Audit va idempotentlik** — «keyin qo'shamiz» deb qoldirilmaydi, ular boshidan
  arxitekturaga kiritiladi.
- **Qolgan hamma joyda** — eng sodda ishlaydigan yechim.

## Intervyu savollari

**1. Meros va kompozitsiya — qaysi birini tanlaysiz?**

> Default — **kompozitsiya**. Meros qattiq bog'lanish yaratadi, ishlash vaqtida
> o'zgarmaydi va LSV buzilishiga olib keladi.
>
> Meros faqat haqiqiy «is-a» munosabati bo'lganda va ierarxiya barqaror bo'lganda.
> Zanjir 2 darajadan chuqurlashsa — bu signal.
>
> Amaliy misol: VIP va chet el hisoblari. Meros bilan `VipForeignAccount` kabi
> kombinatoriya portlashi bo'ladi; kompozitsiya bilan ikki policy birga ishlaydi.

**2. DRY har doim to'g'rimi?** ⭐

> Yo'q. DRY **bilimga** tegishli, kodga emas.
>
> Ikki joyda bir xil ko'rinadigan, lekin **turli sabablardan** o'zgaradigan kod —
> dublikat emas. Ularni birlashtirsangiz, ertaga bittasi o'zgarganda shartlar qo'sha
> boshlaysiz va kod yomonlashadi.
>
> **Noto'g'ri abstraksiya dublikatdan qimmatroq.** Men «uch marta» qoidasiga
> amal qilaman: uchinchi takrorlanishdan keyin naqsh aniq ko'rinadi.

**3. YAGNI ning chegarasi bormi?**

> Ha. Ba'zi qarorlarni keyin o'zgartirish juda qimmat: ma'lumot modeli, API
> shartnomasi, xavfsizlik va audit.
>
> Fintech'da masalan `amount_minor` va `currency` boshidan to'g'ri bo'lishi kerak
> — keyin migratsiya qilish millionlab qatorga tegadi.
>
> Qolgan hamma joyda YAGNI: «kelajakda kerak bo'lishi mumkin» kodi amalda kamdan-kam
> kerak bo'ladi va faqat qo'llab-quvvatlash yuki qoldiradi.

## Xotira kartasi

```
Meros        is-a · qattiq bog'lanish · LSV xavfi · 2 darajadan chuqur = signal
Kompozitsiya has-a · moslashuvchan · ishlash vaqtida almashtiriladi · DEFAULT
DRY          BILIMGA tegishli, KODGA emas
             bir xil ko'rinishi ≠ dublikat (turli sabablardan o'zgarsa)
             ⚠ noto'g'ri abstraksiya DUBLIKATDAN QIMMATROQ
             rule of three — uchinchi takrorlanishdan keyin
KISS         eng sodda ishlaydigan yechim · murakkablik OQLANSIN
YAGNI        "kelajakda kerak" kodi YOZILMAYDI
Chegara      ma'lumot modeli · API shartnomasi · xavfsizlik/audit
             → bularda oldindan o'ylash OQLANADI
```

---

# 9.3 · Design pattern'lar

## Nima va nega

Hammasini yodlash shart emas. Amalda ishlatiladigan va intervyuda so'raladiganlar
o'nga yaqin — va har biri uchun **«qachon kerak emas»** javobi ham bo'lishi kerak.

## Strategy

```csharp
// Algoritmni ishlash vaqtida almashtirish
public interface IFeeStrategy { Money Calculate(Money amount); }

public sealed class PercentageFee(decimal percent) : IFeeStrategy
{
    public Money Calculate(Money amount) => amount.Percent(percent);
}

public sealed class FlatFee(Money fee) : IFeeStrategy
{
    public Money Calculate(Money amount) => fee;
}
```

> C#da ko'pincha `Func<Money, Money>` yetadi — alohida interfeys faqat holat yoki
> bir necha metod kerak bo'lganda.

## Factory

```csharp
// Yaratish mantiqini bir joyga yig'ish
public interface IPaymentProviderFactory
{
    IPaymentProvider Create(string providerCode);
}

// Amalda DI konteyner ko'pincha buni almashtiradi:
// IEnumerable<IPaymentProvider> yoki keyed services (M7.3)
```

## Decorator

```csharp
// Mavjud xatti-harakatga qo'shimcha — sinfni o'zgartirmasdan
public sealed class CachingRateProvider(IRateProvider inner, IMemoryCache cache)
    : IRateProvider
{
    public async Task<Rate> GetAsync(string pair, CancellationToken ct)
        => await cache.GetOrCreateAsync(pair, _ => inner.GetAsync(pair, ct))!;
}

public sealed class LoggingRateProvider(IRateProvider inner, ILogger logger)
    : IRateProvider { /* ... */ }

// Zanjir: Logging(Caching(Http(...)))
services.AddScoped<IRateProvider, HttpRateProvider>();
services.Decorate<IRateProvider, CachingRateProvider>();
services.Decorate<IRateProvider, LoggingRateProvider>();
```

> Decorator — cross-cutting mantiq uchun eng toza yechim: retry, kesh, log, metrika.

## Adapter

```csharp
// Tashqi API'ni bizning interfeysga moslashtirish
public sealed class ClickProviderAdapter(ClickApiClient client) : IPaymentProvider
{
    public async Task<ProviderResult> ChargeAsync(Money amount, IdempotencyKey key, CancellationToken ct)
    {
        var response = await client.CreateTransactionAsync(new ClickRequest
        {
            AmountTiyin = amount.Minor,          // ularning formatidan bizga
            MerchantTransId = key.Value
        }, ct);

        return Map(response);                    // ularning xatolarini bizning turga
    }
}
```

> **Anti-corruption layer** — tashqi tizim modeli bizning domenga kirmasligi uchun
> (9.6).

## Boshqa kerakli pattern'lar

| Pattern | Fintech misoli | Qachon kerak emas |
|---|---|---|
| **Builder** | Murakkab so'rov qurish | Konstruktor yetsa |
| **Observer** | Domen hodisalari (9.7) | Jarayonlar aro — broker kerak |
| **Chain of Responsibility** | Validatsiya zanjiri, middleware | Ikki-uch shart bo'lsa |
| **Template Method** | Umumiy import oqimi | Kompozitsiya afzalroq |
| **Specification** | Murakkab filtr qoidalari | Oddiy `Where` yetsa |
| **State** | To'lov holatlar mashinasi | Pattern matching yetadi (M1.10) |

## Anti-pattern'lar

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Singleton (qo'lda yozilgan)                                  │
   │  → global holat, test qilish qiyin · DI konteyner ishlatiladi │
   ├──────────────────────────────────────────────────────────────┤
   │  Service Locator                                              │
   │  → bog'liqliklar yashirin (M7.3)                              │
   ├──────────────────────────────────────────────────────────────┤
   │  Generic Repository                                           │
   │  → EF Core allaqachon Repository + UoW (M6.7)                 │
   ├──────────────────────────────────────────────────────────────┤
   │  Anemic Domain Model                                          │
   │  → entity faqat getter/setter, mantiq servisda (9.5)          │
   ├──────────────────────────────────────────────────────────────┤
   │  God Object                                                   │
   │  → 3000 qatorli "Manager" sinf                                │
   └──────────────────────────────────────────────────────────────┘
```

## Intervyu savollari

**1. Qaysi pattern'larni real ishlatgansiz?**

> Kundalik: **Strategy** (komissiya qoidalari), **Decorator** (kesh, retry, log
> qatlamlari), **Adapter** (tashqi provayder API'sini bizning interfeysga
> moslashtirish), **Factory** — lekin ko'pincha uni DI konteyner almashtiradi.
>
> Muhim nuans: C#da ba'zi pattern'lar til imkoniyatlari bilan almashadi —
> Strategy o'rniga `Func<>`, State o'rniga pattern matching.

**2. Repository pattern'ning kamchiligi nima?** ⭐

> `DbSet<T>` allaqachon Repository, `DbContext` — Unit of Work. Ustiga generic
> repository qo'shish **ortiqcha qatlam**: `Include`, proyeksiya, `AsSplitQuery`
> imkoniyatlari yo'qoladi.
>
> Va agar har repository o'z `SaveChanges` ini chaqirsa — **atomiklik yo'qoladi**.
>
> Aggregate-specific repository esa oqlanadi (M6.7): u domen tilida gapiradi va
> qulflash strategiyasini yashiradi.

**3. Decorator'ni qachon ishlatasiz?**

> Cross-cutting mantiq uchun: kesh, retry, log, metrika, audit.
>
> U asosiy sinfni o'zgartirmaydi va zanjir qilib yig'ilishi mumkin. Scrutor
> paketining `Decorate` metodi bilan DI'da qulay ro'yxatdan o'tkaziladi.
>
> Muqobil — middleware yoki interceptor; tanlov qatlamga bog'liq.

## Deliverable

```csharp
[Fact]
public async Task DecoratorChain_AppliesCachingAndLogging()
{
    var rate1 = await provider.GetAsync("USD/UZS", default);
    var rate2 = await provider.GetAsync("USD/UZS", default);

    Assert.Equal(1, httpProvider.CallCount);           // kesh ishladi
    Assert.Equal(2, logCollector.Entries.Count);       // ikkalasi ham log qilindi
}

[Fact]
public void FeeStrategies_ProduceExpectedResults()
{
    var amount = Money.FromMajor(1000m, Currency.Uzs);

    Assert.Equal(2000, new PercentageFee(2m).Calculate(amount).Minor);
    Assert.Equal(500,  new FlatFee(Money.FromMinor(500, Currency.Uzs)).Calculate(amount).Minor);
}
```

## Xotira kartasi

```
Strategy     algoritm almashtirish · C#da ko'pincha Func<> yetadi
Factory      yaratish mantiqi · DI konteyner ko'pincha almashtiradi
Decorator    cross-cutting: kesh, retry, log, metrika · Scrutor.Decorate
Adapter      tashqi API → bizning interfeys · anti-corruption layer
Boshqalar    Builder · Observer · Chain · Template · Specification · State
Anti-pattern qo'lda Singleton · Service Locator · Generic Repository
             Anemic Domain Model · God Object
Qoida        har pattern uchun "qachon KERAK EMAS" javobi bo'lsin
```

---

# 9.4 · Qatlamli, Clean, Hexagonal

## Klassik qatlamli arxitektura

```
   ┌─────────────────────────────────┐
   │  Presentation (API)             │
   ├─────────────────────────────────┤
   │  Application (use case'lar)     │
   ├─────────────────────────────────┤
   │  Domain (biznes qoidalari)      │
   ├─────────────────────────────────┤
   │  Infrastructure (DB, HTTP)      │
   └─────────────────────────────────┘
            │
            ▼  bog'liqlik PASTGA yo'nalgan
   ⚠ Muammo: domen infratuzilmaga BOG'LIQ
      → DB o'zgarsa domen ham o'zgaradi
      → domenni test qilish uchun DB kerak
```

## Clean / Hexagonal — bog'liqlikni teskari qilish

```
                    ┌──────────────────────┐
                    │    Infrastructure    │
                    │  (EF Core, HTTP,     │
                    │   Redis, provayder)  │
                    └──────────┬───────────┘
                               │ implements
                               ▼
        ┌──────────────────────────────────────────┐
        │            Application                    │
        │  · use case'lar (PaymentService)          │
        │  · PORT'lar: IPaymentRepository,          │
        │              IPaymentProvider             │
        └──────────────────┬───────────────────────┘
                           │ uses
                           ▼
        ┌──────────────────────────────────────────┐
        │              Domain                       │
        │  · Account, Payment, Money                │
        │  · invariantlar, biznes qoidalari         │
        │  · HECH NARSAGA bog'liq emas              │
        └──────────────────────────────────────────┘

   BOG'LIQLIK YO'NALISHI: hamma narsa DOMEN'ga qarab yo'nalgan
   Domen hech kimni bilmaydi — na DB, na HTTP, na framework
```

```
   Port va Adapter (Hexagonal):

   Port    — interfeys, application qatlamida e'lon qilinadi
             (IPaymentRepository, IPaymentProvider)
   Adapter — implementatsiya, infrastructure qatlamida
             (EfPaymentRepository, ClickProviderAdapter)

   Kiruvchi adapter: HTTP controller, gRPC, message consumer
   Chiquvchi adapter: DB, tashqi API, broker
```

## Loyiha tuzilishi

```
   src/
   ├── Fintech.Domain/                  ← bog'liqlik YO'Q
   │     Accounts/Account.cs
   │     Payments/Payment.cs
   │     Shared/Money.cs
   │
   ├── Fintech.Application/             ← faqat Domain'ga bog'liq
   │     Payments/CreatePaymentHandler.cs
   │     Abstractions/IPaymentRepository.cs      ← PORT
   │     Abstractions/IPaymentProvider.cs        ← PORT
   │
   ├── Fintech.Infrastructure/          ← Application va Domain'ga bog'liq
   │     Persistence/AppDbContext.cs
   │     Persistence/EfPaymentRepository.cs      ← ADAPTER
   │     Providers/ClickProviderAdapter.cs       ← ADAPTER
   │
   └── Fintech.Api/                     ← hammasini yig'adi (DI)
         Controllers/PaymentsController.cs
         Program.cs
```

```csharp
// Bog'liqlik yo'nalishini TEST bilan majburlash
[Fact]
public void Domain_HasNoDependencies()
{
    var domain = typeof(Payment).Assembly;
    var allowed = new[] { "System", "netstandard", "Fintech.Domain" };

    foreach (var reference in domain.GetReferencedAssemblies())
        Assert.Contains(allowed, a => reference.Name!.StartsWith(a));
}
```

> NetArchTest yoki ArchUnitNET bilan bu qoidalar CI'da tekshiriladi.

## Narxi

```
   ┌──────────────────────────────────────────────────────────────┐
   │  ✅ FOYDA                                                     │
   │  · domen framework'dan mustaqil → test tez va sodda           │
   │  · infratuzilmani almashtirish mumkin                         │
   │  · biznes qoidalari bir joyda, ko'rinadigan                   │
   ├──────────────────────────────────────────────────────────────┤
   │  ⚠ NARXI                                                      │
   │  · ko'proq loyiha va fayl                                     │
   │  · DTO ↔ domen ↔ entity xaritalash                            │
   │  · oddiy CRUD uchun ORTIQCHA                                  │
   └──────────────────────────────────────────────────────────────┘

   Qachon oqlanadi: murakkab biznes qoidalari, uzoq umr, katta jamoa
   Qachon ortiqcha: CRUD ilova, prototip, kichik servis
```

## Intervyu savollari

**1. Clean architecture nima beradi?**

> Asosiy g'oya — **bog'liqlik yo'nalishini teskari qilish**: infratuzilma domenga
> bog'lanadi, aksincha emas.
>
> Domen hech narsani bilmaydi — na EF Core, na HTTP, na framework. Natijada biznes
> qoidalarini **DB'siz va framework'siz** test qilish mumkin, va infratuzilmani
> almashtirish domenga tegmaydi.
>
> Amaliy mexanizm — port va adapter: interfeys application qatlamida e'lon
> qilinadi, implementatsiya infrastructure'da.

**2. Bu har doim kerakmi?**

> Yo'q. Narxi bor: ko'proq loyiha, ko'proq xaritalash, ko'proq fayl.
>
> Oddiy CRUD ilovada bu **ortiqcha murakkablik** — u yerda EF Core entity'lari
> to'g'ridan-to'g'ri ishlatilishi mumkin.
>
> Oqlanadigan holat: murakkab biznes qoidalari, uzoq umr ko'radigan tizim, katta
> jamoa. Fintech'da odatda oqlanadi.

**3. Bog'liqlik yo'nalishini qanday majburlaysiz?**

> Loyiha havolalari bilan: `Domain` loyihasi hech narsaga havola qilmaydi va bu
> kompilyatsiya darajasida majburlanadi.
>
> Qo'shimcha ravishda **arxitektura testi** yozaman (NetArchTest): domen assembly'si
> `Microsoft.EntityFrameworkCore` yoki `System.Net.Http` ga havola qilmasligini
> tekshiradi. U CI'da ishlaydi va qoidani hujjatdan **bajariladigan testga**
> aylantiradi.

## Deliverable

```csharp
public class ArchitectureTests
{
    [Fact]
    public void Domain_DoesNotDependOnInfrastructure()
        => Assert.True(Types.InAssembly(DomainAssembly)
            .ShouldNot().HaveDependencyOnAny("Microsoft.EntityFrameworkCore", "Npgsql")
            .GetResult().IsSuccessful);

    [Fact]
    public void Application_DoesNotDependOnApi()
        => Assert.True(Types.InAssembly(ApplicationAssembly)
            .ShouldNot().HaveDependencyOn("Fintech.Api")
            .GetResult().IsSuccessful);

    [Fact]
    public void Handlers_AreSealed()
        => Assert.True(Types.InAssembly(ApplicationAssembly)
            .That().HaveNameEndingWith("Handler")
            .Should().BeSealed().GetResult().IsSuccessful);
}
```

## Xotira kartasi

```
Klassik      Presentation → Application → Domain → Infrastructure
             ⚠ domen infratuzilmaga BOG'LIQ
Clean/Hex    bog'liqlik DOMENGA qarab yo'nalgan
             domen hech narsani bilmaydi (framework, DB, HTTP)
Port         interfeys — Application qatlamida
Adapter      implementatsiya — Infrastructure qatlamida
             kiruvchi: HTTP, gRPC, consumer · chiquvchi: DB, API, broker
Foyda        domen framework'siz test qilinadi · infratuzilma almashtiriladi
Narxi        ko'p loyiha · xaritalash · CRUD uchun ORTIQCHA
Majburlash   loyiha havolalari + ARXITEKTURA TESTI (NetArchTest) CI'da
```

---

# 9.5 · DDD: entity, value object, aggregate ⭐

## Asosiy tushunchalar

| Tushuncha | Aniqlanadi | Misol |
|---|---|---|
| **Entity** | **ID** bilan | `Account`, `Payment` |
| **Value Object** | **Qiymati** bilan | `Money`, `AccountNumber` |
| **Aggregate** | Invariant chegarasi | `Account` + uning yozuvlari |
| **Aggregate Root** | Kirish nuqtasi | `Account` |
| **Repository** | Aggregate'ni saqlash/yuklash | `IAccountRepository` |
| **Domain Service** | Bir aggregate'ga sig'maydigan mantiq | `TransferService` |
| **Domain Event** | Sodir bo'lgan hodisa | `PaymentCompleted` |

```
   Entity vs Value Object:

   Account(id=42, balance=100000)  — balans o'zgaradi, LEKIN u o'sha hisob
                                     → ID bilan aniqlanadi → ENTITY

   Money(100000, "UZS")            — 1000 so'm har doim 1000 so'm
                                     → qiymati bilan aniqlanadi → VALUE OBJECT
```

## Aggregate — invariant chegarasi

```
   ┌─ AGGREGATE: Account ────────────────────────────────────┐
   │                                                          │
   │   Account (ROOT)                                         │
   │      · Balance                                           │
   │      · Withdraw(), Deposit()   ← INVARIANT shu yerda     │
   │           │                                              │
   │           └──► LedgerEntry[]   ← faqat root orqali       │
   │                                                          │
   │  Qoida: tashqaridan FAQAT root'ga murojaat qilinadi      │
   │         ichki obyektlar to'g'ridan-to'g'ri o'zgartirilmaydi│
   └──────────────────────────────────────────────────────────┘
                            │
                     boshqa aggregate'ga
                     FAQAT ID orqali havola
                            │
                            ▼
                      ┌──────────┐
                      │   User   │
                      └──────────┘
```

```csharp
public sealed class Account   // Aggregate Root
{
    private readonly List<LedgerEntry> _entries = [];

    public Guid Id { get; private init; }
    public Guid OwnerId { get; private init; }        // ⚠ boshqa aggregate — faqat ID
    public Money Balance { get; private set; }
    public bool IsBlocked { get; private set; }

    public IReadOnlyList<LedgerEntry> Entries => _entries;   // faqat o'qish

    // ⚠ INVARIANT faqat shu yerda himoyalanadi
    public Result Withdraw(Money amount, IdempotencyKey key)
    {
        if (IsBlocked)            return Result.Fail("Hisob bloklangan");
        if (amount.Currency != Balance.Currency) return Result.Fail("Valyuta mos emas");
        if (!amount.IsPositive)   return Result.Fail("Summa musbat bo'lishi kerak");
        if (amount > Balance)     return Result.Fail("Mablag' yetarli emas");

        _entries.Add(LedgerEntry.Debit(Id, amount, key));
        Balance -= amount;

        _events.Add(new MoneyWithdrawn(Id, amount));      // domen hodisasi (9.7)
        return Result.Ok();
    }
}
```

## Anemic domain model — anti-pattern

```csharp
// ❌ Entity faqat ma'lumot konteyneri, mantiq servisda
public class Account { public decimal Balance { get; set; } }

public class AccountService
{
    public void Withdraw(Account a, decimal amount)
    {
        if (a.Balance < amount) throw new Exception();
        a.Balance -= amount;         // ⚠ invariantni HAR KIM buzishi mumkin
    }
}
// Boshqa joyda: account.Balance = -1000;   → hech kim to'smaydi
```

```
   Anemic model belgisi:
   · entity'da faqat getter/setter
   · barcha mantiq "...Service" sinflarida
   · invariantni himoya qiladigan joy yo'q

   Bu OOP emas — bu protsedura dasturlash obyekt niqobida.
```

## Aggregate chegarasini tanlash

```
   Savol: "Qaysi qoidalar BIR VAQTDA to'g'ri bo'lishi SHART?"

   Balans va uning yozuvlari    → BITTA aggregate (Δ = 0 invarianti)
   Foydalanuvchi profili        → BOSHQA aggregate
   Merchant sozlamalari         → BOSHQA aggregate

   ┌──────────────────────────────────────────────────────────────┐
   │  Aggregate ichida  → bitta tranzaksiyada, DARHOL muvofiq      │
   │  Aggregate'lar aro → eventual muvofiqlik, domen hodisasi      │
   └──────────────────────────────────────────────────────────────┘

   ⚠ Aggregate qancha KATTA bo'lsa, qulflar shuncha ko'p → KICHIK tuting
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Anemic model | Invariant himoyalanmaydi |
| Katta aggregate | Ko'p qulf, konflikt, sekinlik |
| Boshqa aggregate'ga obyekt havolasi | Chegara buziladi, katta graf yuklanadi |
| Ichki kolleksiyani `List<T>` sifatida ochish | Tashqaridan o'zgartiriladi |
| Har entity'ni aggregate root qilish | Chegara ma'nosini yo'qotadi |
| VO ni mutable qilish | Ulashilgan holat buziladi |

## Fintech konteksti

- **`Account`** aggregate: balans va uning yozuvlari — Δ = 0 invarianti aynan shu
  yerda himoyalanadi.
- **Pul o'tkazmasi** ikki aggregate'ga tegadi. Ikki variant: bitta tranzaksiyada
  ikkalasini qulflash (M5.6 tartib bilan), yoki saga (M10.6). Kichik tizimda
  birinchisi soddaroq va to'g'ri.
- **`Money`** — klassik value object (M4.3).

## Intervyu savollari

**1. Aggregate nima va chegarani qanday tanlaysiz?** ⭐

> Aggregate — **invariantni himoya qiluvchi chegara**. Ichidagi hamma narsa bitta
> tranzaksiyada muvofiq bo'ladi, tashqarisi bilan esa eventual.
>
> Chegarani tanlash savoli: «**qaysi qoidalar bir vaqtda to'g'ri bo'lishi shart?**»
>
> Balans va uning ledger yozuvlari — bitta aggregate, chunki Δ = 0 invarianti
> ularni bog'laydi. Foydalanuvchi profili — boshqasi.
>
> Va aggregate qancha katta bo'lsa qulflar shuncha ko'p — shuning uchun kichik
> tutiladi.

**2. Entity va value object farqi?**

> Entity **ID** bilan aniqlanadi va uning holati o'zgaradi: `Account` balansi
> o'zgarsa ham u o'sha hisob.
>
> Value object **qiymati** bilan aniqlanadi va immutable: 1000 so'm har doim 1000
> so'm, unga ID kerak emas.
>
> Amaliy foyda: value object tur xavfsizligini beradi — `Charge(AccountNumber,
> AccountNumber, Money)` da argumentlarni almashtirib bo'lmaydi (M1.12).

**3. Anemic domain model nima uchun yomon?**

> Entity faqat getter/setter bo'lsa, invariantni himoya qiladigan joy qolmaydi:
> `account.Balance = -1000` deyish mumkin va hech kim to'smaydi.
>
> Mantiq servislarga tarqaladi, takrorlanadi va bir joyda unutiladi.
>
> To'g'ri yondashuv: `account.Withdraw(amount)` — u barcha shartlarni tekshiradi va
> holatni o'zi o'zgartiradi. Setter'lar `private` bo'ladi.

**4. Pul o'tkazmasi ikki aggregate'ga tegsa nima qilasiz?**

> Ikki variant. Kichik tizimda — **bitta tranzaksiyada** ikkala hisobni qulflab
> (`ORDER BY id FOR UPDATE`, M5.6) o'zgartirish. Bu soddaroq va atomik.
>
> Katta yoki tarqoq tizimda — **saga** (M10.6): har qadam o'z tranzaksiyasida,
> xato bo'lsa compensating transaction.
>
> DDD purist'lari «bir tranzaksiyada bitta aggregate» deydi, lekin fintech'da
> atomiklik ko'pincha muhimroq — bu **ongli trade-off**.

## Deliverable

```csharp
public class AggregateTests
{
    [Fact]
    public void Withdraw_EnforcesInvariants()
    {
        var account = Account.Open(Money.FromMajor(1000m, Currency.Uzs));

        Assert.False(account.Withdraw(Money.FromMajor(5000m, Currency.Uzs), key).IsSuccess);
        Assert.Equal(1000_00, account.Balance.Minor);          // o'zgarmadi
    }

    [Fact]
    public void Balance_CannotBeSetDirectly()
    {
        var setter = typeof(Account).GetProperty(nameof(Account.Balance))!.SetMethod;
        Assert.True(setter is null || setter.IsPrivate);
    }

    [Fact]
    public void Entries_AreReadOnlyFromOutside()
    {
        var account = Account.Open(Money.FromMajor(1000m, Currency.Uzs));
        Assert.IsNotAssignableFrom<List<LedgerEntry>>(account.Entries);
    }

    [Fact]
    public void Withdraw_RaisesDomainEvent()
    {
        var account = Account.Open(Money.FromMajor(1000m, Currency.Uzs));
        account.Withdraw(Money.FromMajor(100m, Currency.Uzs), key);

        Assert.Single(account.PopEvents().OfType<MoneyWithdrawn>());
    }
}
```

## Xotira kartasi

```
Entity       ID bilan aniqlanadi · holati o'zgaradi (Account, Payment)
Value Object qiymati bilan · IMMUTABLE (Money, AccountNumber)
Aggregate    INVARIANT chegarasi · tashqaridan faqat ROOT orqali
             boshqa aggregate'ga FAQAT ID bilan havola
Chegara      "qaysi qoidalar BIR VAQTDA to'g'ri bo'lishi shart?"
             ichida — bitta tranzaksiya · aro — eventual + domen hodisasi
             ⚠ KICHIK tuting — katta aggregate = ko'p qulf
Anemic       faqat getter/setter, mantiq servisda → invariant HIMOYASIZ
             belgi: account.Balance = -1000 mumkin
To'g'ri      account.Withdraw(amount) · setter'lar private
Fintech      Account aggregate → Δ = 0 invarianti
             o'tkazma: bitta tranzaksiya (kichik) yoki saga (tarqoq)
```

---

# 9.6 · Bounded context va ubiquitous language

## Nima va nega

Bitta so'z turli kontekstlarda **turli narsani** anglatadi. Ularni bitta modelga
tiqishga urinish — eng ko'p uchraydigan loyihalash xatosi.

```
   "Customer" so'zi:

   ┌─ Sotuv konteksti ──────────┐  ┌─ Buxgalteriya konteksti ──┐
   │  · potentsial mijoz        │  │  · soliq identifikatori   │
   │  · aloqa tarixi            │  │  · to'lov shartlari       │
   │  · segment                 │  │  · qarzdorlik             │
   └────────────────────────────┘  └───────────────────────────┘

   ┌─ To'lov konteksti ─────────┐  ┌─ Qo'llab-quvvatlash ──────┐
   │  · hisoblar                │  │  · murojaatlar tarixi      │
   │  · limitlar                │  │  · qoniqish darajasi       │
   │  · KYC holati              │  │                            │
   └────────────────────────────┘  └───────────────────────────┘

   ⚠ Bitta ulkan "Customer" sinfi = hamma kontekst uchun noqulay
     va har o'zgarish hammaga tegadi
```

## Bounded context

```
   Bounded context — model va til BIR XIL ma'noga ega bo'lgan chegara.

   ┌────────────────────┐        ┌────────────────────┐
   │  Payments          │        │  Compliance        │
   │                    │        │                    │
   │  Customer =        │◄──────►│  Customer =        │
   │   hisoblar egasi   │  ACL   │   tekshiruv subyekti│
   │                    │        │                    │
   │  Account, Payment  │        │  KycCase, Risk     │
   └────────────────────┘        └────────────────────┘
                          ▲
                          │
                  Anti-Corruption Layer:
                  boshqa kontekst modeli
                  BIZNING domenga kirmasin
```

## Kontekstlar aro munosabatlar

| Naqsh | Ma'nosi |
|---|---|
| **Shared Kernel** | Umumiy kod (masalan `Money`) — ehtiyot bilan |
| **Customer/Supplier** | Yuqori oqim quyi oqim ehtiyojini hisobga oladi |
| **Conformist** | Quyi oqim yuqori oqim modeliga moslashadi |
| **Anti-Corruption Layer** | Tarjima qatlami — **eng himoyalangan** |
| **Published Language** | Umumiy shartnoma (event sxemasi, OpenAPI) |

```csharp
// Anti-Corruption Layer misoli
public sealed class ComplianceAdapter(IComplianceApi api) : IKycChecker
{
    public async Task<KycStatus> CheckAsync(Guid customerId, CancellationToken ct)
    {
        var external = await api.GetSubjectAsync(customerId, ct);

        // ⚠ Ularning modeli bizning domenga KIRMAYDI — tarjima qilinadi
        return external.RiskLevel switch
        {
            "LOW" or "MEDIUM" => KycStatus.Approved,
            "HIGH"            => KycStatus.ManualReview,
            _                 => KycStatus.Rejected
        };
    }
}
```

## Ubiquitous language

```
   Kod, hujjat va suhbat BIR XIL atamalarni ishlatsin.

   ❌ Biznes "o'tkazma" deydi, kod "TransactionRecord" yozadi
      → har suhbatda tarjima qilinadi, tushunmovchilik paydo bo'ladi

   ✅ Biznes "reversal" desa — kodda ham Reversal
      Biznes "hold" desa — kodda ham Hold, "Freeze" emas
```

```
   Fintech atamalari (ubiquitous language misoli):

   · Authorization  — mablag'ni rezervlash (hali yechilmagan)
   · Capture        — rezervlangan mablag'ni yechish
   · Void           — rezervni bekor qilish (capture'gacha)
   · Refund         — pulni qaytarish (capture'dan keyin)
   · Chargeback     — mijoz da'vosi bilan majburiy qaytarish
   · Settlement     — provayder bilan hisob-kitob
   · Reconciliation — bizning yozuvlar va provayder hisoboti solishtirilishi
```

## Context map

```
   ┌──────────────┐  event   ┌──────────────┐
   │  Payments    │─────────►│  Ledger      │
   └──────┬───────┘          └──────────────┘
          │ ACL
          ▼
   ┌──────────────┐          ┌──────────────┐
   │  Compliance  │          │ Notifications│
   │  (tashqi)    │          │              │
   └──────────────┘          └──────▲───────┘
                                    │ event
                             ┌──────┴───────┐
                             │  Payments    │
                             └──────────────┘
```

## Intervyu savollari

**1. Bounded context nima?**

> Model va **til** bir xil ma'noga ega bo'lgan chegara.
>
> «Customer» sotuvda potentsial mijoz, buxgalteriyada soliq subyekti, to'lovda
> hisoblar egasi. Ularni bitta ulkan sinfga tiqish — har kontekst uchun noqulay
> model va har o'zgarish hammaga tegadi.
>
> To'g'ri yondashuv: har kontekstda **o'z modeli**, va ular orasida aniq tarjima.

**2. Anti-corruption layer nima uchun kerak?**

> Boshqa kontekst yoki tashqi tizim modeli bizning domenga **kirib kelmasligi**
> uchun.
>
> Amaliy misol: compliance servisi `RiskLevel: "HIGH"` qaytaradi. Agar bu satr
> bizning domen bo'ylab tarqalsa, ular modelini o'zgartirganda bizda hamma joyga
> tegish kerak bo'ladi.
>
> ACL uni bizning `KycStatus` turiga tarjima qiladi — o'zgarish bitta joyda
> qoladi.

**3. Ubiquitous language nima beradi?**

> Kod, hujjat va biznes suhbati bir xil atamalarni ishlatadi — tarjima yo'qoladi.
>
> Fintech'da bu ayniqsa muhim: `authorization`, `capture`, `void`, `refund`,
> `chargeback` — bularning aniq ma'nolari bor va ularni chalkashtirish real pul
> xatosiga olib keladi.
>
> Agar biznes «reversal» desa, kodda ham `Reversal` bo'lishi kerak, `CorrectionEntry`
> emas.

## Xotira kartasi

```
Bounded context  model va TIL bir xil ma'noga ega chegara
                 "Customer" har kontekstda BOSHQA narsa
                 → har kontekstda O'Z modeli
Munosabatlar     Shared Kernel · Customer/Supplier · Conformist
                 ANTI-CORRUPTION LAYER (eng himoyalangan) · Published Language
ACL              tashqi model bizning domenga KIRMASIN
                 tarjima bitta joyda → ular o'zgarsa biz tegmaymiz
Ubiquitous lang. kod = hujjat = suhbat · tarjima yo'q
Fintech atamalar authorization · capture · void · refund
                 chargeback · settlement · reconciliation
Context map      kontekstlar va ular orasidagi munosabatlar sxemasi
```

---

# 9.7 · Domain event va integration event

## Nima va nega

Ikkalasi ham «hodisa», lekin **butunlay boshqa maqsad** va boshqa kafolatlar.

```
   ┌─ DOMAIN EVENT ─────────────────┬─ INTEGRATION EVENT ────────────┐
   │  Bitta bounded context ICHIDA  │  Kontekstlar/servislar ARO     │
   │  Jarayon ichida                │  Broker orqali                 │
   │  Bitta tranzaksiyada           │  Eventual consistency          │
   │  Ichki model (o'zgarishi oson) │  SHARTNOMA (versiyalanadi)     │
   │  Sinxron ishlanishi mumkin     │  Har doim asinxron             │
   ├────────────────────────────────┼────────────────────────────────┤
   │  MoneyWithdrawn                │  payment.completed             │
   │  (Account aggregate ichida)    │  (boshqa servislar uchun)      │
   └────────────────────────────────┴────────────────────────────────┘
```

## Domain event

```csharp
// Aggregate hodisani YIG'ADI, o'zi yubormaydi
public sealed class Account
{
    private readonly List<IDomainEvent> _events = [];

    public Result Withdraw(Money amount, IdempotencyKey key)
    {
        // ... invariantlar ...
        Balance -= amount;
        _events.Add(new MoneyWithdrawn(Id, amount, _clock.GetUtcNow()));
        return Result.Ok();
    }

    public IReadOnlyList<IDomainEvent> PopEvents()
    {
        var events = _events.ToList();
        _events.Clear();
        return events;
    }
}
```

```csharp
// SaveChanges paytida yig'iladi va OUTBOX'ga yoziladi (M6.4)
public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
{
    var events = ChangeTracker.Entries<IHasDomainEvents>()
        .SelectMany(e => e.Entity.PopEvents())
        .ToList();

    // ⚠ Integration event'ga aylantirilib, BITTA tranzaksiyada outbox'ga
    Outbox.AddRange(events.Select(IntegrationEventMapper.Map));

    return await base.SaveChangesAsync(ct);
}
```

## Ikkisi orasidagi tarjima

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Domain event                                                 │
   │  MoneyWithdrawn(AccountId, Money, DateTimeOffset)             │
   │        │                                                       │
   │        ▼  MAPPER (ataylab)                                     │
   │  Integration event                                             │
   │  {                                                             │
   │    "eventType": "payment.completed",                           │
   │    "version": 1,                                               │
   │    "paymentId": "...",                                         │
   │    "amountMinor": 8000000,                                     │
   │    "currency": "UZS",                                          │
   │    "occurredAt": "2026-08-04T09:30:00Z"                        │
   │  }                                                             │
   └──────────────────────────────────────────────────────────────┘

   ⚠ Domen modelini TO'G'RIDAN-TO'G'RI serializatsiya qilib yubormang:
     ichki refaktoring tashqi shartnomani buzadi
```

## Nega C# `event` ishlatilmaydi

```
   ❌ C# event (M1.7)
   · sinxron — handler xatosi asosiy oqimni buzadi
   · jarayon ICHIDA — boshqa servisga yetmaydi
   · tranzaksiya chegarasidan chiqmaydi
   · yo'qolishi mumkin (jarayon yiqilsa)

   ✅ Outbox + broker (M10.3)
   · biznes o'zgarishi bilan BITTA tranzaksiyada yoziladi
   · relay keyin brokerga uzatadi
   · at-least-once kafolat
```

```
   ⚠ MediatR bilan in-process domain event ishlatish mumkin,
     lekin FAQAT bitta tranzaksiya ichidagi mantiq uchun.
     Tashqi ta'sir (email, tashqi API) — HAR DOIM outbox orqali.
```

## Hodisa nomlash va versiyalash

```
   Nomlash: O'TGAN ZAMONDA, biznes tilida (9.6)

   ✅ payment.completed · account.blocked · limit.exceeded
   ❌ CreatePayment · UpdateAccount · PaymentHandler

   Versiyalash:
   · yangi IXTIYORIY maydon → versiya o'zgarmaydi
   · maydon o'chirish/nomini o'zgartirish → YANGI versiya
   · eski va yangi versiya bir muddat BIRGA yashaydi
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Domen modelini to'g'ridan-to'g'ri publish qilish | Ichki refaktoring shartnomani buzadi |
| Domain event'ni tashqi ta'sir uchun ishlatish | Tranzaksiya chegarasidan chiqadi |
| Hodisani `SaveChanges`dan **oldin** yuborish | Rollback bo'lsa noto'g'ri hodisa ketgan |
| Hodisada butun obyektni yuborish | Katta xabar, keraksiz bog'lanish |
| Hodisa versiyalanmagan | Consumer'lar buziladi |
| Buyruq nomi bilan nomlash | «Nima sodir bo'ldi» aniq emas |

## Fintech konteksti

- **`payment.completed`** — bu integration event: ledger, notification, analytics
  servislari uni tinglaydi.
- **`MoneyWithdrawn`** — domain event: `Account` aggregate ichida invariant
  bajarilganini bildiradi.
- **Hodisa yo'qolmasligi** kritik: outbox majburiy, chunki «to'lov bo'ldi, lekin
  hech kim bilmadi» — bu nomuvofiqlik.

## Intervyu savollari

**1. Domain event va integration event farqi?** ⭐

> **Domain event** — bounded context ichida, jarayon ichida, bitta tranzaksiyada.
> U ichki model va uni erkin o'zgartirish mumkin.
>
> **Integration event** — servislar aro, broker orqali, eventual consistency. U
> **shartnoma** — versiyalanadi va o'zgartirish consumer'larni buzadi.
>
> Ular orasida **ataylab mapper** bo'ladi: domen modelini to'g'ridan-to'g'ri
> serializatsiya qilib yubormaslik kerak, aks holda ichki refaktoring tashqi
> shartnomani buzadi.

**2. Hodisani qachon yuborasiz?**

> **`SaveChanges` bilan bitta tranzaksiyada outbox jadvaliga yozaman**, brokerga
> esa alohida relay uzatadi (M10.3).
>
> Tranzaksiyadan oldin yuborsam — rollback bo'lganda noto'g'ri hodisa ketgan
> bo'ladi. Keyin yuborsam — dual write muammosi: DB commit bo'lib broker yiqilishi
> mumkin.
>
> Outbox ikkalasini ham hal qiladi.

**3. C# `event` ishlatasizmi?**

> Domen hodisalari uchun yo'q. U sinxron, jarayon ichida ishlaydi, tranzaksiya
> chegarasidan chiqmaydi va handler'dagi xato asosiy biznes oqimini buzadi.
>
> In-process mediator (MediatR) bilan bitta tranzaksiya ichidagi mantiqni ishlatish
> mumkin, lekin **tashqi ta'sir** — email, tashqi API, boshqa servis — har doim
> outbox orqali.

**4. Hodisalarni qanday nomlaysiz?**

> **O'tgan zamonda va biznes tilida**: `payment.completed`, `account.blocked`,
> `limit.exceeded`.
>
> `CreatePayment` — bu buyruq nomi, hodisa emas. Hodisa **sodir bo'lgan** narsani
> bildiradi.
>
> Va har hodisada `version` maydoni bo'ladi: yangi ixtiyoriy maydon versiyani
> o'zgartirmaydi, maydon o'chirish esa yangi versiya talab qiladi.

## Deliverable

```csharp
[Fact]
public async Task DomainEvent_BecomesOutboxMessage()
{
    var account = await repository.GetAsync(accountId, default);
    account.Withdraw(Money.FromMajor(100m, Currency.Uzs), key);
    await db.SaveChangesAsync();

    var message = await db.Outbox.SingleAsync();
    Assert.Equal("payment.completed", message.Type);
}

[Fact]
public async Task FailedTransaction_PublishesNoEvent()
{
    await Assert.ThrowsAsync<DbUpdateException>(() => CreateInvalidPaymentAsync());
    Assert.Empty(await db.Outbox.ToListAsync());
}

[Fact]
public void IntegrationEvent_HasStableContract()
{
    var json = JsonSerializer.Serialize(new PaymentCompletedV1(id, 8_000_000, "UZS", now));
    var expected = """{"eventType":"payment.completed","version":1,...}""";

    Assert.Equal(Normalize(expected), Normalize(json));   // shartnoma testi
}
```

## Xotira kartasi

```
Domain event      kontekst ICHIDA · jarayon ichida · bitta tranzaksiya
                  ichki model — erkin o'zgartiriladi
Integration event servislar ARO · broker · eventual · SHARTNOMA (versiyalanadi)
Mapper            ataylab — domen modelini to'g'ridan-to'g'ri PUBLISH QILMANG
Qachon yuboriladi SaveChanges bilan bitta tranzaksiyada OUTBOX'ga
                  oldin yuborsa — rollback'da noto'g'ri hodisa
                  keyin yuborsa — dual write muammosi
C# event          domen hodisalari uchun ISHLATILMAYDI (sinxron, jarayon ichida)
                  MediatR — faqat bitta tranzaksiya ichidagi mantiq uchun
Nomlash           O'TGAN ZAMON, biznes tilida: payment.completed
                  CreatePayment — bu BUYRUQ, hodisa emas
Versiyalash       yangi ixtiyoriy maydon → versiya o'zgarmaydi
                  o'chirish/nom o'zgarishi → YANGI versiya
```

---

# 9.8 · CQRS ⭐

## Nima va nega

CQRS — **Command Query Responsibility Segregation**: yozish va o'qish uchun
**alohida model**.

```
                     ┌──────────────┐
   Command ─────────►│  Write model │────► DB (normalizatsiyalangan)
   (o'zgartiradi)    │  · aggregate │        · invariantlar
                     │  · invariant │        · tranzaksiyalar
                     └──────────────┘
                                              │
                                              │ (ixtiyoriy) proyeksiya
                                              ▼
                     ┌──────────────┐
   Query ───────────►│  Read model  │────► Denormalizatsiyalangan
   (o'zgartirmaydi)  │  · DTO       │        · tez o'qish
                     │  · proyeksiya│        · JOIN yo'q
                     └──────────────┘
```

## Uch daraja

```
   ┌─ 1. Yengil CQRS (bitta DB) ─────────────────────────────────┐
   │  Yozish → EF Core + aggregate                                │
   │  O'qish → Dapper + to'g'ridan-to'g'ri SQL (M6.8)             │
   │  ✅ Deyarli bepul, katta foyda                                │
   ├─ 2. Alohida read model (bitta DB) ──────────────────────────┤
   │  Materialized view yoki denormalizatsiyalangan jadval        │
   │  Trigger yoki job bilan yangilanadi                          │
   │  ⚠ Sinxronizatsiya muammosi paydo bo'ladi                    │
   ├─ 3. To'liq CQRS (alohida DB) ───────────────────────────────┤
   │  Write DB → event → Read DB (Elasticsearch, Redis)           │
   │  ⚠ EVENTUAL consistency · murakkablik keskin oshadi          │
   └─────────────────────────────────────────────────────────────┘
```

```csharp
// 1-daraja: eng ko'p oqlanadigan variant
public sealed class CreatePaymentHandler(IAccountRepository accounts, IUnitOfWork uow)
{
    public async Task<Result<Guid>> HandleAsync(CreatePaymentCommand cmd, CancellationToken ct)
    {
        var account = await accounts.GetForUpdateAsync(cmd.AccountId, ct);   // aggregate
        var result = account.Withdraw(cmd.Amount, cmd.IdempotencyKey);
        if (!result.IsSuccess) return Result.Fail<Guid>(result.Error!);

        await uow.SaveChangesAsync(ct);
        return Result.Ok(result.Value.Id);
    }
}

public sealed class PaymentQueries(NpgsqlDataSource dataSource)
{
    // ⚠ Aggregate YUKLANMAYDI — to'g'ridan-to'g'ri proyeksiya
    public async Task<IReadOnlyList<PaymentListItem>> ListAsync(
        Guid userId, DateOnly from, DateOnly to, CancellationToken ct)
    {
        const string sql = """
            SELECT p.id, p.amount_minor, p.currency, p.status,
                   m.name AS merchant_name, p.occurred_at
            FROM   payments p
            JOIN   merchants m ON m.id = p.merchant_id
            WHERE  p.user_id = @UserId AND p.occurred_at >= @From AND p.occurred_at < @To
            ORDER  BY p.occurred_at DESC
            """;

        await using var conn = await dataSource.OpenConnectionAsync(ct);
        return (await conn.QueryAsync<PaymentListItem>(sql, new { userId, from, to })).ToList();
    }
}
```

## Qachon kerak

```
   ✅ OQLANADI
   · o'qish va yozish yuklari KESKIN farq qiladi
   · o'qish uchun murakkab JOIN va agregatsiya kerak
   · yozish modeli invariantlar bilan murakkab
   · turli o'qish stsenariylari (hisobot, ro'yxat, qidiruv)

   ❌ ORTIQCHA
   · oddiy CRUD
   · kichik jamoa, tez o'zgaradigan talablar
   · o'qish va yozish deyarli bir xil
```

> **Intervyuda muhim:** «qachon kerak **emas**» degan javob sizni tajribali
> ko'rsatadi. Ko'pchilik CQRS'ni maqtaydi va narxini aytmaydi.

## Eventual consistency muammosi

```
   3-darajada (alohida DB):

   t0   POST /payments → write DB'ga yozildi        ✓
   t1   Client darhol GET /payments
        → read DB'dan o'qiladi
   t2   → <u>to'lov hali ko'rinmaydi</u>   (proyeksiya kechikdi)

   Yechimlar:
   · yozishdan keyin natijani DARHOL qaytarish (read-your-writes)
   · client'ga "ishlanmoqda" holatini ko'rsatish
   · kritik o'qishlarni write DB'dan qilish
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Oddiy CRUD'ga CQRS qo'llash | Ortiqcha murakkablik |
| Darhol 3-darajadan boshlash | Eventual consistency muammolari |
| Query'da aggregate yuklash | Foyda yo'qoladi |
| Command'dan ma'lumot qaytarish | CQRS mazmuni buziladi (ID qaytarish mumkin) |
| Read model'ni sinxronlashtirmaslik | Eskirgan ma'lumot |
| CQRS'ni event sourcing bilan chalkashtirish | Ular **alohida** naqshlar |

## Fintech konteksti

- **Yozish** — ledger yozuvlari, invariantlar, tranzaksiyalar: EF Core + aggregate.
- **O'qish** — tranzaksiyalar tarixi, hisobotlar, statement: Dapper + optimallashgan
  SQL.
- **Balans** — write model'dan o'qiladi (M7.11): u qaror qabul qilinadigan
  ma'lumot, eventual bo'lishi mumkin emas.

## Intervyu savollari

**1. CQRS nima va qachon kerak?** ⭐

> Yozish va o'qish uchun **alohida model**. Yozish modeli invariantlarni himoya
> qiladi (aggregate), o'qish modeli esa tez javob berish uchun optimallashtirilgan.
>
> Uch daraja bor. **Birinchi daraja** — bitta DB, yozish EF Core bilan, o'qish
> Dapper bilan — deyarli bepul va katta foyda beradi.
>
> **Uchinchi daraja** — alohida read DB — eventual consistency va sezilarli
> murakkablik keltiradi.
>
> Men odatda birinchi darajadan boshlayman va faqat o'lchangan ehtiyoj bo'lsa
> yuqoriga chiqaman.

**2. CQRS qachon kerak emas?** ⭐

> Oddiy CRUD ilovada — bu ortiqcha murakkablik. Ikki model, sinxronizatsiya,
> eventual consistency — bularning hammasi narxga ega.
>
> Va agar o'qish hamda yozish deyarli bir xil bo'lsa, ajratishdan foyda yo'q.
>
> Bu javobni ayta olish muhim: ko'pchilik CQRS'ni maqtaydi va narxini aytmaydi.

**3. CQRS va event sourcing bir narsami?**

> Yo'q, ular **alohida** naqshlar va ular tez-tez chalkashtiriladi.
>
> CQRS — o'qish va yozish modelini ajratish. Event sourcing — holatni emas,
> hodisalarni saqlash (9.9).
>
> Ular birga ishlatilishi mumkin va ko'pincha shunday qilinadi, lekin har biri
> alohida qo'llanishi ham mumkin. CQRS'siz event sourcing juda noqulay, lekin
> event sourcing'siz CQRS butunlay normal.

## Deliverable

```csharp
[Fact]
public async Task Query_DoesNotLoadAggregate()
{
    interceptor.Reset();
    await queries.ListAsync(userId, from, to, default);

    Assert.Equal(1, interceptor.QueryCount);
    Assert.DoesNotContain("ledger_entries", interceptor.LastSql);   // aggregate emas
}

[Fact]
public async Task Command_EnforcesInvariants()
{
    await SeedAccount(balance: 1_000);
    var result = await handler.HandleAsync(new CreatePaymentCommand(accountId, TooMuch), default);

    Assert.False(result.IsSuccess);
    Assert.Equal("Mablag' yetarli emas", result.Error);
}

[Fact]
public async Task Balance_IsReadFromWriteModel()
{
    await MakePaymentAsync();
    var balance = await accountQueries.GetBalanceAsync(accountId, default);

    Assert.Equal(await ComputeFromLedgerAsync(accountId), balance);   // eventual EMAS
}
```

## Xotira kartasi

```
CQRS         yozish va o'qish uchun ALOHIDA model
Write        aggregate · invariantlar · tranzaksiyalar (EF Core)
Read         proyeksiya · denormalizatsiya · tez SQL (Dapper)
3 daraja     1. bitta DB, EF+Dapper       ← deyarli bepul, KATTA foyda
             2. materialized view / denormalizatsiyalangan jadval
             3. alohida read DB           ← eventual consistency, murakkab
Oqlanadi     o'qish/yozish yuklari farq qiladi · murakkab JOIN · murakkab invariant
ORTIQCHA     oddiy CRUD · kichik jamoa · o'qish ≈ yozish
             ⭐ "qachon kerak EMAS" javobi sizni tajribali ko'rsatadi
CQRS ≠ ES    alohida naqshlar · birga ishlatilishi MUMKIN, lekin shart emas
Fintech      balans WRITE model'dan — u qaror qabul qilinadigan ma'lumot
```

---

# 9.9 · Event sourcing

## Nima va nega

Joriy holat saqlanmaydi — **hodisalar** saqlanadi. Holat ularni ketma-ket qo'llash
orqali tiklanadi.

```
   ┌─ ODATIY (state-based) ──────────────────────────────────────┐
   │  accounts jadvali:                                           │
   │  id=42, balance=20000                                        │
   │                                                               │
   │  ⚠ "Bu balans qanday hosil bo'ldi?" — JAVOB YO'Q             │
   └──────────────────────────────────────────────────────────────┘

   ┌─ EVENT SOURCING ────────────────────────────────────────────┐
   │  events jadvali:                                             │
   │  1. AccountOpened   { id: 42, owner: "ali" }                 │
   │  2. MoneyDeposited  { amount: 100000 }                       │
   │  3. MoneyWithdrawn  { amount:  80000 }                       │
   │                                                               │
   │  → joriy balans = 20 000                                     │
   │  → VA TO'LIQ TARIX saqlangan                                 │
   │  → istalgan LAHZADAGI holatni tiklash mumkin                 │
   └──────────────────────────────────────────────────────────────┘
```

## Mexanika

```csharp
public sealed class Account
{
    public Guid Id { get; private set; }
    public Money Balance { get; private set; }
    public long Version { get; private set; }

    // Hodisalardan holatni tiklash
    public static Account Rehydrate(IEnumerable<IEvent> events)
    {
        var account = new Account();
        foreach (var e in events) account.Apply(e);
        return account;
    }

    private void Apply(IEvent e)
    {
        switch (e)
        {
            case AccountOpened opened:
                Id = opened.AccountId; Balance = Money.Zero(opened.Currency); break;
            case MoneyDeposited d:
                Balance += d.Amount; break;
            case MoneyWithdrawn w:
                Balance -= w.Amount; break;
        }
        Version++;
    }

    // Yangi hodisa: avval TEKSHIRUV, keyin Apply
    public Result Withdraw(Money amount)
    {
        if (amount > Balance) return Result.Fail("Mablag' yetarli emas");

        var e = new MoneyWithdrawn(Id, amount, DateTimeOffset.UtcNow);
        Apply(e);
        _pending.Add(e);
        return Result.Ok();
    }
}
```

## Snapshot

```
   Muammo: 1 million hodisa bo'lsa, har yuklashda hammasini o'qish sekin

   Yechim: SNAPSHOT — har N hodisada holat nusxasi saqlanadi

   ┌────────────────────────────────────────────────────────┐
   │  events:    1 ... 1000 [SNAPSHOT] 1001 ... 1050        │
   │                            │                            │
   │  Yuklash: snapshot + oxirgi 50 hodisa                   │
   └────────────────────────────────────────────────────────┘
```

## Narxi

```
   ┌─ ✅ FOYDA ──────────────────────────────────────────────────┐
   │  · TO'LIQ audit — "nega bunday bo'ldi?" savoliga javob      │
   │  · istalgan lahzadagi holatni tiklash (time travel)         │
   │  · yangi proyeksiya — TARIXNI QAYTA O'YNATIB quriladi       │
   │  · debug: hodisalar ketma-ketligini takrorlash              │
   ├─ ⚠ NARXI ──────────────────────────────────────────────────┤
   │  · hodisa VERSIYALASH (sxema o'zgarsa eski hodisalar?)      │
   │  · snapshot va proyeksiya infratuzilmasi                    │
   │  · so'rov qilish qiyin → CQRS deyarli MAJBURIY              │
   │  · GDPR "o'chirish huquqi" bilan ziddiyat (immutable log)   │
   │  · jamoa uchun yangi tafakkur — o'rganish vaqti             │
   └─────────────────────────────────────────────────────────────┘
```

## Hodisa versiyalash

```csharp
// Eski hodisa formati
public sealed record MoneyWithdrawnV1(Guid AccountId, decimal Amount);

// Yangi format — valyuta qo'shildi
public sealed record MoneyWithdrawnV2(Guid AccountId, long AmountMinor, string Currency);

// Upcaster — eski hodisani yangi formatga o'girish
public sealed class MoneyWithdrawnUpcaster : IEventUpcaster
{
    public IEvent Upcast(IEvent old) => old switch
    {
        MoneyWithdrawnV1 v1 => new MoneyWithdrawnV2(
            v1.AccountId, (long)(v1.Amount * 100), "UZS"),   // ⚠ taxmin qilinadi
        _ => old
    };
}
```

> Bu — event sourcing'ning **eng qiyin** qismi: eski hodisalar o'zgarmaydi, ularni
> talqin qilish kodi esa o'zgarishi kerak.

## Fintech'da amaliy yondashuv

```
   ⚠ To'liq event sourcing fintech'da ODATDA KERAK EMAS.

   ✅ APPEND-ONLY LEDGER uning eng foydali qismini beradi:
      · yozuvlar o'chirilmaydi va o'zgartirilmaydi
      · xato bo'lsa REVERSAL yozuvi qo'shiladi
      · balans yozuvlardan hisoblanadi (M5.10, M11.2)
      · to'liq audit bor

   Farqi: bu domen darajasidagi hodisa emas, MOLIYAVIY yozuv.
          Sxema barqaror, versiyalash muammosi deyarli yo'q.
```

## Intervyu savollari

**1. Event sourcing nima?**

> Joriy holat saqlanmaydi — **hodisalar** saqlanadi, holat esa ularni ketma-ket
> qo'llash orqali tiklanadi.
>
> Asosiy foyda: to'liq audit va «nega bunday bo'ldi?» savoliga javob, istalgan
> lahzadagi holatni tiklash, va yangi proyeksiyani tarixni qayta o'ynatib qurish.
>
> Narxi: hodisa versiyalash, snapshot infratuzilmasi, va so'rov qilish qiyinligi —
> shuning uchun CQRS deyarli majburiy sherik.

**2. Event sourcing qachon ortiqcha?** ⭐

> Oddiy CRUD domenida — deyarli har doim.
>
> Narxi katta: eski hodisalar o'zgarmaydi va sxema o'zgarganda **upcaster** yozish
> kerak; snapshot kerak; so'rov qilish uchun alohida proyeksiya kerak; jamoa uchun
> yangi tafakkur.
>
> Va GDPR «o'chirish huquqi» bilan ziddiyat bor: immutable log'dan shaxsiy
> ma'lumotni o'chirish murakkab (odatda kripto-o'chirish bilan hal qilinadi).

**3. Fintech'da event sourcing ishlatasizmi?**

> To'liq shaklda odatda **yo'q**. Lekin **append-only ledger** uning eng foydali
> qismini beradi: yozuvlar o'chirilmaydi, xato bo'lsa reversal qo'shiladi, balans
> yozuvlardan hisoblanadi.
>
> Farqi: bu domen hodisasi emas, **moliyaviy yozuv** — sxemasi barqaror va
> versiyalash muammosi deyarli yo'q.
>
> Ya'ni men uni butun tizimga emas, **audit muhim bo'lgan qismga** qo'llagan
> bo'lardim.

## Xotira kartasi

```
Mexanizm     holat SAQLANMAYDI — hodisalar saqlanadi
             holat = hodisalarni ketma-ket qo'llash (Rehydrate)
Snapshot     har N hodisada holat nusxasi → yuklash tez bo'lsin
Foyda        to'liq audit · time travel · yangi proyeksiya (qayta o'ynatish)
Narxi        hodisa VERSIYALASH (upcaster) — eng qiyin qism
             snapshot + proyeksiya infratuzilmasi
             so'rov qiyin → CQRS deyarli MAJBURIY
             GDPR "o'chirish huquqi" bilan ziddiyat
Fintech      to'liq ES odatda KERAK EMAS
             ✅ APPEND-ONLY LEDGER eng foydali qismini beradi
             yozuv o'chirilmaydi · xato → REVERSAL · balans yozuvlardan
```

---

# 9.10 · Monolit va mikroservis ⭐

## Nima va nega

Bu savol intervyuda deyarli har doim beriladi va u **texnik emas, tashkiliy**
qaror haqida.

```
   ┌─ MONOLIT ──────────────────────┬─ MIKROSERVIS ─────────────────┐
   │  Bitta deploy birligi          │  Ko'p mustaqil deploy          │
   │  Bitta DB (odatda)             │  Har servis o'z DB'si          │
   │  Jarayon ichida chaqiruv       │  Tarmoq orqali                 │
   │  ACID tranzaksiya              │  SAGA, eventual consistency    │
   │  Oddiy debug va test           │  Distributed tracing kerak     │
   │  Bitta texnologiya             │  Har servis o'z tanlovi        │
   ├────────────────────────────────┼────────────────────────────────┤
   │  ⚠ katta jamoada to'qnashuv    │  ⚠ operatsion murakkablik      │
   │  ⚠ butun tizim birga deploy    │  ⚠ tarmoq nosozliklari         │
   └────────────────────────────────┴────────────────────────────────┘
```

## Mikroservis nimani hal qiladi

```
   ┌──────────────────────────────────────────────────────────────┐
   │  ✅ HAL QILADI:                                               │
   │  · MUSTAQIL DEPLOY — jamoalar bir-birini kutmaydi            │
   │  · alohida masshtablash (to'lov ≠ hisobot)                   │
   │  · nosozlik izolyatsiyasi (biri yiqilsa boshqalar ishlaydi)  │
   │  · texnologiya tanlash erkinligi                             │
   ├──────────────────────────────────────────────────────────────┤
   │  ❌ HAL QILMAYDI (ko'pincha YOMONLASHTIRADI):                 │
   │  · yomon dizayn — u shunchaki tarmoq ortiga ko'chadi         │
   │  · ma'lumot butunligi — ACID yo'qoladi                       │
   │  · debug — endi 5 servis log'ini birlashtirish kerak          │
   │  · lokal ishlab chiqish — 10 ta servisni ko'tarish            │
   └──────────────────────────────────────────────────────────────┘
```

> **Asosiy haqiqat:** mikroservis — **tashkiliy** yechim. U jamoalar bir-birini
> kutmasligi uchun kerak. Texnik muammolarni u ko'pincha **qo'shadi**, kamaytirmaydi.

## Distributed monolith — eng yomon holat

```
   ⚠ ANTI-PATTERN: mikroservis nomi, monolit bog'liqligi

   ┌──────────┐    sinxron    ┌──────────┐    sinxron    ┌──────────┐
   │ Service A│─────────────► │ Service B│─────────────► │ Service C│
   └──────────┘               └──────────┘               └──────────┘
        │                          │                          │
        └──────────────────────────┴──────────────────────────┘
                        BITTA umumiy DB

   Belgilari:
   · servislar bir vaqtda deploy qilinishi kerak
   · umumiy DB yoki umumiy jadval
   · biri yiqilsa hammasi ishlamaydi
   · sinxron zanjir chaqiruvlar

   → Monolitning barcha kamchiliklari + tarmoqning barcha muammolari
```

## Fintech'da nima to'g'ri

```
   Mahalliy fintech hajmida (kunlik millionlab tranzaksiya):

   ┌──────────────────────────────────────────────────────────────┐
   │  ✅ MODULAR MONOLITH (9.11) — deyarli har doim to'g'ri javob  │
   │     · ACID tranzaksiya saqlanadi (pul uchun MUHIM)            │
   │     · oddiy deploy va debug                                    │
   │     · kerak bo'lsa keyin ajratish mumkin                       │
   ├──────────────────────────────────────────────────────────────┤
   │  ⚠ Ajratish OQLANADIGAN qismlar:                              │
   │     · notification (mustaqil, tez o'zgaradi)                   │
   │     · reporting/analytics (boshqa yuk profili)                 │
   │     · integration adapter'lar (tashqi provayderlar)            │
   └──────────────────────────────────────────────────────────────┘

   ⚠ Ledger va balansni ajratmang — ular bitta tranzaksiyada bo'lishi kerak
```

## Ajratish qachon boshlanadi

```
   Signal'lar (texnik emas, TASHKILIY):
   · jamoa 8–10 kishidan oshdi va deploy'da to'qnashuv boshlandi
   · turli qismlar turli tezlikda o'zgaradi
   · bir qism boshqasidan 10× ko'proq resurs talab qiladi
   · aniq bounded context chegarasi bor (9.6)

   ⚠ "Zamonaviy" bo'lish — SIGNAL EMAS
```

## Intervyu savollari

**1. Monolit yoki mikroservis?** ⭐

> Savol texnik emas, **tashkiliy**. Mikroservis asosan **mustaqil deploy**
> muammosini hal qiladi — jamoalar bir-birini kutmasligi uchun.
>
> Mahalliy fintech hajmida men **modular monolith** dan boshlagan bo'lardim: ACID
> tranzaksiya saqlanadi (pul uchun bu muhim), deploy va debug sodda, va chegaralar
> to'g'ri chizilgan bo'lsa keyin ajratish mumkin.
>
> Mikroservis narxi katta: tarmoq nosozliklari, saga, distributed tracing, lokal
> muhitda 10 ta servis.

**2. Mikroservis qanday muammolarni hal qilmaydi?** ⭐

> **Yomon dizaynni** — u shunchaki tarmoq ortiga ko'chadi va debug qilish
> qiyinlashadi.
>
> **Ma'lumot butunligini** — ACID yo'qoladi, saga va idempotentlik kerak bo'ladi.
>
> **Debug'ni** — endi 5 servis logini correlation ID bo'yicha birlashtirish kerak.
>
> Va eng xavflisi — **distributed monolith**: servislar bir vaqtda deploy
> qilinadi, umumiy DB ishlatadi, sinxron zanjir bilan chaqiriladi. Bu monolitning
> barcha kamchiliklari plus tarmoqning barcha muammolari.

**3. Ajratishni qachon boshlaysiz?**

> Signal'lar tashkiliy: jamoa 8–10 kishidan oshdi va deploy'da to'qnashuv boshlandi;
> turli qismlar turli tezlikda o'zgaradi; bir qism boshqasidan ancha ko'p resurs
> talab qiladi.
>
> Va texnik shart: **aniq bounded context chegarasi** bo'lishi kerak (9.6). Chegara
> noaniq bo'lsa, ajratish faqat muammoni ko'paytiradi.
>
> Fintech'da men birinchi navbatda notification va reporting'ni ajratgan bo'lardim
> — ular mustaqil va boshqa yuk profiliga ega. **Ledger va balansni ajratmayman**
> — ular bitta tranzaksiyada bo'lishi kerak.

## Xotira kartasi

```
Monolit      bitta deploy · bitta DB · ACID · oddiy debug
Mikroservis  mustaqil deploy · o'z DB · saga · tracing kerak
HAL QILADI   MUSTAQIL DEPLOY (tashkiliy!) · alohida masshtab
             nosozlik izolyatsiyasi · texnologiya erkinligi
HAL QILMAYDI yomon dizayn (tarmoq ortiga ko'chadi) · ACID yo'qoladi
             debug qiyinlashadi · lokal muhit murakkablashadi
Anti-pattern DISTRIBUTED MONOLITH — birga deploy, umumiy DB, sinxron zanjir
             = monolit kamchiliklari + tarmoq muammolari
Signal       jamoa 8–10+ · turli o'zgarish tezligi · turli resurs profili
             + ANIQ bounded context chegarasi
             ⚠ "zamonaviy bo'lish" — signal EMAS
Fintech      modular monolith · ledger va balansni AJRATMANG
             ajratish mumkin: notification, reporting, integration adapter
```

---

# 9.11 · Modular monolith

## Nima va nega

Monolitning operatsion soddaligi + mikroservisning modulli chegaralari.

```
   ┌─────────────── BITTA DEPLOY BIRLIGI ─────────────────────────┐
   │                                                                │
   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
   │  │  Payments    │  │  Ledger      │  │ Notifications│        │
   │  │              │  │              │  │              │        │
   │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │        │
   │  │ │ Domain   │ │  │ │ Domain   │ │  │ │ Domain   │ │        │
   │  │ │ App      │ │  │ │ App      │ │  │ │ App      │ │        │
   │  │ │ Infra    │ │  │ │ Infra    │ │  │ │ Infra    │ │        │
   │  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │        │
   │  │              │  │              │  │              │        │
   │  │  Public API  │  │  Public API  │  │  Public API  │        │
   │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
   │         │                 │                 │                 │
   │         └─────────────────┴─────────────────┘                 │
   │              faqat PUBLIC API orqali aloqa                     │
   └────────────────────────────────────────────────────────────────┘

   ⚠ Modul ichki turlariga to'g'ridan-to'g'ri murojaat TAQIQLANADI
```

## Chegaralarni majburlash

```csharp
// Modul faqat o'z shartnomasini ochadi
namespace Fintech.Modules.Ledger.Contracts;

public interface ILedgerModule
{
    Task<Result> RecordTransferAsync(TransferRequest request, CancellationToken ct);
    Task<Money> GetBalanceAsync(Guid accountId, CancellationToken ct);
}

// Ichki turlar `internal` — boshqa modul ko'rmaydi
namespace Fintech.Modules.Ledger.Domain;
internal sealed class LedgerEntry { }
```

```csharp
// Arxitektura testi bilan majburlash (9.4)
[Fact]
public void Modules_CommunicateOnlyThroughContracts()
{
    var result = Types.InAssembly(PaymentsAssembly)
        .That().ResideInNamespace("Fintech.Modules.Payments")
        .ShouldNot().HaveDependencyOn("Fintech.Modules.Ledger.Domain")
        .GetResult();

    Assert.True(result.IsSuccessful);
}
```

## Ma'lumot chegaralari

```
   ┌─ Variant 1: bitta DB, ALOHIDA SXEMALAR ────────────────────┐
   │  payments.payments  ·  ledger.entries  ·  notify.outbox     │
   │                                                              │
   │  ✅ ACID tranzaksiya modullar aro ISHLAYDI                   │
   │  ⚠ chegarani buzish oson (JOIN yozib qo'yish)                │
   │  → grant bilan cheklash: payments_user ledger sxemasini      │
   │    ko'ra olmaydi                                             │
   ├─ Variant 2: alohida DB ────────────────────────────────────┤
   │  ✅ chegara qat'iy                                            │
   │  ⚠ ACID yo'qoladi → saga kerak                               │
   │  → bu allaqachon mikroservisga yaqin                         │
   └─────────────────────────────────────────────────────────────┘

   Fintech uchun odatda 1-variant: pul uchun ACID muhimroq
```

## Modullar aro aloqa

```csharp
// ✅ Sinxron — public interfeys orqali (bitta tranzaksiyada)
public sealed class CreatePaymentHandler(ILedgerModule ledger)
{
    public async Task<Result> HandleAsync(CreatePaymentCommand cmd, CancellationToken ct)
    {
        // Bitta tranzaksiyada — ACID saqlanadi
        return await ledger.RecordTransferAsync(new TransferRequest(...), ct);
    }
}

// ✅ Asinxron — in-process event (tashqi ta'sir uchun outbox)
_outbox.Add(new PaymentCompleted(payment.Id, payment.Amount));
// Notifications moduli uni tinglaydi
```

## Mikroservisga o'tish yo'li

```
   Modular monolith → mikroservis ajratish OSON, agar:

   1. Modul chegarasi aniq (public API + internal turlar)
   2. Modullar aro aloqa faqat shartnoma orqali
   3. Ma'lumot chegarasi bor (alohida sxema)
   4. Modullar aro sinxron chaqiruvlar minimal

   → Ajratish: public API'ni HTTP/gRPC ga aylantirish
     + ma'lumotni alohida DB'ga ko'chirish
     + sinxron chaqiruvlarni event'ga aylantirish
```

## Intervyu savollari

**1. Modular monolith nima?**

> Bitta deploy birligi, lekin **ichida aniq chegaralangan modullar**. Har modul o'z
> domeni, application va infratuzilma qatlamiga ega, va faqat **public API** orqali
> muloqot qiladi.
>
> Foyda: mikroservisning modulli tuzilishi + monolitning operatsion soddaligi.
> ACID tranzaksiya saqlanadi — fintech'da bu muhim.
>
> Va chegaralar to'g'ri bo'lsa, keyinchalik ajratish nisbatan oson.

**2. Chegarani qanday majburlaysiz?**

> Uch qatlam:
> 1. **`internal` modifikatori** — modul ichki turlari boshqa modulga ko'rinmaydi.
> 2. **Arxitektura testi** (NetArchTest) — CI'da tekshiriladi, qoida hujjatdan
>    bajariladigan testga aylanadi.
> 3. **DB grant'lari** — `payments_user` `ledger` sxemasini ko'ra olmaydi, ya'ni
>    tasodifiy `JOIN` yozib bo'lmaydi.
>
> Faqat kelishuvga tayanish ishlamaydi — chegara **texnik** majburlanishi kerak.

**3. Modullar aro tranzaksiya qanday ishlaydi?**

> Bitta DB va alohida sxemalar bo'lsa — **oddiy ACID tranzaksiya**. Bu modular
> monolitning asosiy afzalligi: to'lov va ledger yozuvi bitta tranzaksiyada
> bo'ladi.
>
> Tashqi ta'sir (notification, tashqi API) — **outbox** orqali asinxron.
>
> Agar modullar alohida DB'ga o'tsa — saga kerak bo'ladi va bu allaqachon
> mikroservisga yaqin holat.

## Xotira kartasi

```
Modular monolith  bitta deploy + ichida ANIQ CHEGARALANGAN modullar
Modul             o'z Domain/App/Infra + PUBLIC API
                  ichki turlar `internal` — boshqa modul ko'rmaydi
Majburlash        1. internal modifikatori
                  2. ARXITEKTURA TESTI (NetArchTest) CI'da
                  3. DB grant'lari — sxemani ko'ra olmasin
Ma'lumot          bitta DB + alohida SXEMALAR → ACID saqlanadi ✅
                  alohida DB → saga kerak (mikroservisga yaqin)
Aloqa             sinxron: public interfeys (bitta tranzaksiya)
                  asinxron: outbox → boshqa modul tinglaydi
Ajratish          chegara aniq bo'lsa OSON: public API → HTTP/gRPC
Fintech           deyarli har doim TO'G'RI javob
```

---

# 9.12 · ADR — qaror hujjatlashtirish

## Nima va nega

ADR (Architecture Decision Record) — **muhim qaror va uning sababi** yozib
qoldiriladigan qisqa hujjat.

```
   Muammo: 6 oydan keyin hech kim eslamaydi
           "nega biz mikroservis emas, monolit tanladik?"
           "nega bu yerda Dapper ishlatilgan?"
           "nega balans keshlanmaydi?"

   → Yangi odam kelib "bu noto'g'ri" deb o'zgartira boshlaydi
   → Yoki eski qarorni qayta-qayta muhokama qilinadi

   ADR buni hal qiladi: qaror + KONTEKST + oqibatlar yozilgan
```

## Shablon

```markdown
# ADR-007: Balans keshlanmaydi

## Holat
Qabul qilindi — 2026-08-04

## Kontekst
Balans o'qish endpoint'i eng ko'p chaqiriladigan (kuniga ~2 mln so'rov).
Redis kesh qo'shish taklif qilindi (p95 ni 40 ms dan 5 ms ga tushirish).

Lekin balans — **qaror qabul qilinadigan** ma'lumot: to'lov ruxsati
shunga qarab beriladi. Eskirgan qiymat ortiqcha pul yechilishiga olib keladi.

## Qaror
Balans keshlanmaydi. U har doim write model'dan (primary DB) o'qiladi.

Kurs va ma'lumotnomalar keshlanadi (TTL 5 daqiqa).

## Oqibatlar
+ Ma'lumot har doim to'g'ri, ortiqcha yechish xavfi yo'q
+ Reconciliation muammosi qo'shilmaydi
− Balans endpoint'i p95 ~40 ms bo'lib qoladi
− DB'ga yuk yuqoriroq → indeks va connection pool sozlanishi kerak

## Muqobil variantlar
1. **Qisqa TTL kesh (1 s)** — rad etildi: 1 soniyada ham ortiqcha yechish mumkin
2. **Write-through kesh** — rad etildi: nomuvofiqlik xavfi va murakkablik
3. **Read replica'dan o'qish** — rad etildi: replication lag xuddi shu muammo
```

## Qachon ADR yoziladi

```
   ✅ YOZILADI:
   · texnologiya tanlovi (PostgreSQL vs MongoDB)
   · arxitektura naqshi (modular monolith vs mikroservis)
   · qaytarish qiyin qarorlar (ma'lumot modeli, API shartnomasi)
   · "nega ODATIY yechim ishlatilmadi" degan holatlar
   · xavfsizlik va muvofiqlik qarorlari

   ❌ YOZILMAYDI:
   · kundalik kod qarorlari
   · osongina qaytariladigan narsalar
   · kutubxona versiyasini yangilash
```

## Holat va evolyutsiya

```
   Taklif qilingan → Qabul qilindi → (keyinroq) Almashtirildi

   ⚠ Eski ADR O'CHIRILMAYDI — u tarixning bir qismi.
     Yangi ADR eskisiga havola qiladi:

   # ADR-015: Balans uchun read replica ishlatiladi
   ## Holat
   Qabul qilindi — 2027-03-10 · ADR-007 ni almashtiradi

   ## Kontekst
   ADR-007 da kesh rad etilgan edi. Endi replication lag monitoring
   bilan 200 ms dan past ekani tasdiqlandi va biznes bu kechikishni
   qabul qildi (limit tekshiruvi baribir primary'dan).
```

## Amaliy tashkil qilish

```
   docs/adr/
   ├── 0001-modular-monolith.md
   ├── 0002-postgresql-tanlovi.md
   ├── 0003-money-minor-units.md
   ├── 0007-balans-keshlanmaydi.md
   └── README.md          ← ro'yxat va qisqacha izohlar

   · repozitoriyda saqlanadi (kod bilan birga versiyalanadi)
   · PR orqali muhokama qilinadi
   · qisqa: 1 sahifa yetadi
```

## Intervyu savollari

**1. Arxitektura qarorlarini qanday hujjatlashtirasiz?**

> **ADR** — Architecture Decision Record. Har muhim qaror uchun bir sahifalik
> hujjat: holat, **kontekst**, qaror, **oqibatlar** va ko'rib chiqilgan muqobil
> variantlar.
>
> Eng qimmatli qismi — kontekst va rad etilgan variantlar. 6 oydan keyin yangi odam
> «nega bunday qilingan?» deb so'raganda javob bor, va eski qaror qayta-qayta
> muhokama qilinmaydi.
>
> Ular repozitoriyda kod bilan birga saqlanadi va PR orqali muhokama qilinadi.

**2. Qaror o'zgarsa nima qilasiz?**

> Eski ADR **o'chirilmaydi** — u tarixning bir qismi va o'sha paytdagi kontekstni
> saqlaydi.
>
> Yangi ADR yoziladi, holati «eskisini almashtiradi» deb belgilanadi va unga
> havola qilinadi.
>
> Shunda «nega biz avval boshqacha qilgan edik va nima o'zgardi?» degan savolga
> ham javob bo'ladi.

**3. Har qaror uchun ADR yozasizmi?**

> Yo'q — u shovqinga aylanadi. Faqat **qaytarish qiyin** yoki **tushuntirish talab
> qiladigan** qarorlar uchun: texnologiya tanlovi, arxitektura naqshi, ma'lumot
> modeli, va «nega odatiy yechim ishlatilmadi» holatlari.
>
> Kundalik kod qarorlari va osongina qaytariladigan narsalar — kod ko'rib chiqishda
> hal qilinadi.

## Deliverable

```markdown
<!-- docs/adr/0003-money-minor-units.md -->
# ADR-003: Pul minor unit'da butun son sifatida saqlanadi

## Holat
Qabul qilindi — 2026-07-20

## Kontekst
Pul summalarini saqlash uchun uch variant: `decimal`, `numeric(19,4)`,
yoki butun son (tiyin). Tizim ko'p valyutali bo'ladi (UZS, USD, RUB).

## Qaror
`Money` value object: `long Minor` + `Currency`.
DB'da `amount_minor bigint` + `currency char(3)`.
API'da `{"amountMinor": 100050, "currency": "UZS"}`.

## Oqibatlar
+ Yaxlitlash xatosi mumkin emas, Δ = 0 tekshiruvi aniq
+ JavaScript client aniqlikni yo'qotmaydi
+ To'lov provayderlari (Click, Payme) shu formatni kutadi
− Har joyda konvertatsiya kerak (ToMajor/FromMajor)
− Valyuta eksponentini ma'lumotnomadan olish kerak

## Muqobil variantlar
1. `decimal` — rad etildi: JS client'da aniqlik yo'qoladi, va bo'lish
   qoldig'i muammosi baribir qoladi
2. `numeric(19,4)` DB'da + `decimal` kodda — rad etildi: yuqoridagi sabab
```

## Xotira kartasi

```
ADR          Architecture Decision Record — 1 sahifa
Tuzilma      Holat · KONTEKST · Qaror · OQIBATLAR · Muqobil variantlar
Qimmatli     kontekst + RAD ETILGAN variantlar
             → 6 oydan keyin "nega?" savoliga javob
             → eski qaror qayta-qayta muhokama qilinmaydi
Qachon       texnologiya tanlovi · arxitektura naqshi · qaytarish qiyin qarorlar
             "nega ODATIY yechim ishlatilmadi"
Qachon EMAS  kundalik kod qarorlari · osongina qaytariladigan narsalar
Evolyutsiya  eski ADR O'CHIRILMAYDI → yangi ADR "almashtiradi" deb havola qiladi
Joylashuv    docs/adr/ · repozitoriyda, kod bilan versiyalanadi · PR'da muhokama
```

---

## M9 — yakuniy tekshiruv ro'yxati

Kodsiz, og'zaki javob bera olsangiz — modul yopilgan:

- [ ] SOLID'ni **o'z kodingizdan** misol bilan (har prinsipga bittadan)
- [ ] Liskov prinsipi qanday buziladi — belgilari
- [ ] Har sinfga interfeys yaratasizmi
- [ ] Meros va kompozitsiya — qaysi biri default
- [ ] DRY har doim to'g'rimi
- [ ] YAGNI ning chegarasi qayerda
- [ ] Repository pattern'ning kamchiligi
- [ ] Decorator'ni qachon ishlatasiz
- [ ] Clean architecture nima beradi va narxi qancha
- [ ] Bog'liqlik yo'nalishini qanday majburlaysiz
- [ ] Aggregate chegarasini qanday tanlaysiz
- [ ] Anemic domain model nega yomon
- [ ] Bounded context va anti-corruption layer
- [ ] Domain event va integration event farqi
- [ ] Hodisani qachon yuborasiz
- [ ] CQRS qachon kerak **emas**
- [ ] CQRS va event sourcing bir narsami
- [ ] Event sourcing qachon ortiqcha
- [ ] Mikroservis qanday muammolarni hal qilmaydi
- [ ] Distributed monolith belgilari
- [ ] Modul chegarasini qanday majburlaysiz
- [ ] ADR nima va qachon yoziladi

**Deliverable'lar:**

- [ ] `SolidTests` — yangi provayder router'ga tegmasligi, LSV shartnomasi
- [ ] `ArchitectureTests` — domen bog'liqliklari, modul chegaralari (NetArchTest)
- [ ] `AggregateTests` — invariant himoyasi, `private set`, domen hodisasi
- [ ] `DecoratorChain` testi — kesh va log qatlamlari
- [ ] Integration event **shartnoma testi** — JSON formati barqarorligi
- [ ] `docs/adr/` — kamida 3 ta ADR: arxitektura naqshi, pul modeli, kesh siyosati
