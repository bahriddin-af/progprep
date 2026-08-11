# M2 · .NET runtime va performans

Bu modul «qopqoq ostida nima bo'layapti» degan savollarga javob beradi. Senior
darajasida ajratuvchi omil — **taxmin qilmaslik va o'lchay olish**.

| # | Mavzu | P |
|---|---|---|
| [2.1](#21--clr-jit-va-aot) | CLR, JIT, AOT, assembly yuklanishi | P2 |
| [2.2](#22--gc-generatsiyalari-va-loh-) | GC generatsiyalari, LOH ⭐ | P0 |
| [2.3](#23--xotira-sizishi-net-da-) | Xotira sizishi .NET'da ⭐ | P1 |
| [2.4](#24--spant-memoryt-arraypool) | `Span<T>`, `Memory<T>`, `ArrayPool<T>` | P1 |
| [2.5](#25--allocationni-kamaytirish) | Allocation'ni kamaytirish, `ValueTask` | P2 |
| [2.6](#26--benchmarkdotnet-bilan-olchash) | BenchmarkDotNet bilan o'lchash | P2 |
| [2.7](#27--profiling-va-dump-tahlili) | Profiling va dump tahlili | P2 |

---

# 2.1 · CLR, JIT va AOT

## Nima va nega

C# kodi to'g'ridan-to'g'ri mashina kodiga kompilyatsiya qilinmaydi. Oraliqda **IL**
(Intermediate Language) va **CLR** (Common Language Runtime) turadi — va bu
platformalararo ishlash, GC, tur xavfsizligi va reflection'ning asosi.

```
   ┌──────────┐   Roslyn    ┌──────────┐    JIT     ┌────────────────┐
   │  .cs     │ ──────────► │  IL      │ ─────────► │  Mashina kodi  │
   │  fayl    │  (build)    │  (.dll)  │ (ishlash   │  (x64/ARM64)   │
   └──────────┘             └──────────┘  vaqtida)  └────────────────┘
                                 │                          ▲
                                 │  + metadata              │
                                 │    (turlar, imzolar)     │
                                 └──────────────────────────┘
                                     reflection shundan o'qiydi
```

## JIT bosqichlari — tiered compilation

```
   Metod birinchi marta chaqiriladi
              │
              ▼
   ┌─────────────────────────┐
   │  Tier 0: TEZ kompilyatsiya│  ← optimallashtirilmagan, tez ishga tushadi
   └────────────┬────────────┘
                │  metod ~30 marta chaqirildi
                ▼
   ┌─────────────────────────┐
   │  Tier 1: TO'LIQ optimallash│  ← inline, sikl optimallash, SIMD
   └────────────┬────────────┘
                │  profil ma'lumoti to'plandi (Dynamic PGO, .NET 8+)
                ▼
   ┌─────────────────────────┐
   │  Qayta optimallash       │  ← eng ko'p uchraydigan yo'l bo'yicha
   └─────────────────────────┘
```

**Amaliy oqibat:** birinchi so'rovlar sekinroq — bu «warm-up» effekti. Shuning
uchun benchmark'da birinchi o'lchov tashlab yuboriladi (2.6).

## AOT — oldindan kompilyatsiya

| | JIT | Native AOT |
|---|---|---|
| Kompilyatsiya | Ishlash vaqtida | Build vaqtida |
| Ishga tushish | Sekinroq (warm-up) | **Juda tez** (~ms) |
| Xotira | Ko'proq | Kamroq |
| Cho'qqi performans | **Yuqoriroq** (PGO) | Biroz pastroq |
| Reflection | To'liq | **Cheklangan** |
| Fayl hajmi | Kichik + runtime | Bitta katta fayl |

```xml
<PropertyGroup>
  <PublishAot>true</PublishAot>
  <InvariantGlobalization>true</InvariantGlobalization>
</PropertyGroup>
```

```
   AOT qachon mos:
   ✅ CLI vositalar · serverless (cold start muhim) · konteynerda kichik image

   AOT qachon mos EMAS:
   ❌ Reflection'ga tayanadigan kod (eski ORM, dinamik proxy)
   ❌ Runtime kod generatsiyasi (Expression.Compile)
   ❌ Uzoq ishlaydigan server — u yerda JIT + PGO tezroq
```

> EF Core AOT'ni to'liq qo'llab-quvvatlamaydi — shuning uchun tipik fintech
> backend'da AOT emas, JIT ishlatiladi.

## Assembly yuklanishi

```csharp
// Assembly birinchi ishlatilganda LAZY yuklanadi
var type = typeof(SomeTypeInOtherAssembly);   // shu paytda yuklanadi

// Yuklangan assembly'lar
foreach (var a in AppDomain.CurrentDomain.GetAssemblies())
    Console.WriteLine($"{a.GetName().Name} {a.GetName().Version}");
```

**Klassik muammo — diamond dependency:**

```
   Ilova ──► Kutubxona A ──► Newtonsoft.Json 12.0
        └──► Kutubxona B ──► Newtonsoft.Json 13.0

   .NET Core'da: bitta versiya tanlanadi (eng yuqorisi)
   → A kutilmagan xatti-harakat ko'rishi mumkin
   → binding redirect kerak bo'lishi mumkin
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Warm-up'ni hisobga olmasdan o'lchash | Natijalar 10× noto'g'ri |
| Reflection'ga tayanib AOT yoqish | Ishlash vaqtida xato |
| `Assembly.Load` ni issiq yo'lda | Sekin, xotira |
| `dynamic` ni ko'p ishlatish | JIT optimallashtira olmaydi |
| Debug build'da performans o'lchash | Optimallashtirish o'chirilgan |

## Fintech konteksti

- **Ishga tushish vaqti** — Kubernetes'da pod tez ko'tarilishi kerak. `ReadyToRun`
  (`<PublishReadyToRun>true</PublishReadyToRun>`) warm-up'ni kamaytiradi va AOT
  cheklovlarisiz ishlaydi — bu odatiy tanlov.
- **Health check** — warm-up davomida `readiness` probe muvaffaqiyatsiz bo'lmasligi
  uchun oqilona kutish vaqti berilishi kerak.

## Intervyu savollari

**1. C# kodi qanday bajariladi?**

> Roslyn C# ni **IL** ga kompilyatsiya qiladi va metadata bilan birga `.dll` ga
> joylaydi. Ishlash vaqtida **CLR** metodni birinchi chaqirishda JIT orqali mashina
> kodiga o'giradi.
>
> Bu bosqich bizga platformalararo ishlash, GC, tur xavfsizligi va reflection'ni
> beradi. Narxi — birinchi chaqiruvlar sekinroq (warm-up).

**2. Tiered compilation nima?**

> JIT metodni avval **Tier 0** da tez, lekin optimallashtirmasdan kompilyatsiya
> qiladi — bu ishga tushishni tezlashtiradi. Metod ko'p marta chaqirilsa (~30),
> **Tier 1** da to'liq optimallashtirilgan kod generatsiya qilinadi.
>
> .NET 8 dan beri Dynamic PGO ham bor: runtime haqiqiy chaqiruv profilini yig'ib,
> eng ko'p uchraydigan yo'lni optimallashtiradi — statik kompilyatorlar buni qila
> olmaydi.

**3. Native AOT qachon ishlatasiz?**

> Ishga tushish vaqti kritik bo'lganda: CLI vositalar, serverless funksiyalar,
> kichik konteyner image'lari.
>
> Server ilovasida odatda **yo'q**: reflection cheklangan (EF Core to'liq
> ishlamaydi), va uzoq ishlaydigan jarayonda JIT + PGO aslida **tezroq** kod
> beradi.
>
> Oraliq variant — `ReadyToRun`: warm-up kamayadi, cheklovlar esa yo'q.

## Deliverable

```csharp
[Fact]
public void TieredCompilation_ShowsWarmupEffect()
{
    var first = Measure(() => HotPath(), iterations: 1);
    for (int i = 0; i < 100; i++) HotPath();          // Tier 1 ga o'tkazamiz
    var warmed = Measure(() => HotPath(), iterations: 1);

    Assert.True(warmed < first);   // ⚠ real o'lchov uchun BenchmarkDotNet (2.6)
}
```

## Xotira kartasi

```
Oqim         C# → (Roslyn) → IL + metadata → (JIT) → mashina kodi
CLR beradi   GC · tur xavfsizligi · reflection · platformalararo ishlash
Tiered       Tier 0 (tez, optimallashsiz) → ~30 chaqiruv → Tier 1 (to'liq)
Dynamic PGO  .NET 8+ · haqiqiy profil bo'yicha qayta optimallash
Warm-up      birinchi so'rovlar sekin → benchmark'da tashlanadi
AOT          tez start, kam xotira · reflection CHEKLANGAN · EF Core to'liq emas
ReadyToRun   oraliq variant — warm-up kam, cheklov yo'q → server uchun odatiy
```

---

# 2.2 · GC generatsiyalari va LOH ⭐

## Nima va nega

.NET'da xotirani `free()` qilmaysiz — GC buni o'zi qiladi. Lekin **qanday** qilishini
bilish kerak, chunki noto'g'ri kod GC'ni haddan tashqari ko'p ishlatadi va bu
kechikish sakrashlariga olib keladi.

## Generatsiyalar — asosdagi gipoteza

> **Obyektlarning aksariyati tez o'ladi.** Shuning uchun har safar butun heap emas,
> uning eng yosh qismini skanerlash yetarli.

```
   ┌─ Gen 0 ─────────┐  kichik (~256 KB – bir necha MB)
   │ yangi obyektlar │  TEZ-TEZ yig'iladi, juda tez
   └────────┬────────┘
            │ omon qolsa
            ▼
   ┌─ Gen 1 ─────────┐  bufer zona
   │                 │  kamroq yig'iladi
   └────────┬────────┘
            │ omon qolsa
            ▼
   ┌─ Gen 2 ─────────┐  uzoq yashaydiganlar (kesh, singleton)
   │                 │  KAM yig'iladi, lekin QIMMAT
   └─────────────────┘

   ┌─ LOH (Large Object Heap) ─────────────────────────┐
   │  ≥ 85 000 bayt obyektlar                          │
   │  Gen 2 bilan birga yig'iladi                      │
   │  ⚠ sukut bo'yicha KOMPAKTLANMAYDI → fragmentatsiya│
   └───────────────────────────────────────────────────┘
```

## GC qanday ishlaydi

```
   1. MARK    — root'lardan (stack, static, GC handle) yuriladi,
                yetib boriladigan obyektlar belgilanadi

   2. SWEEP   — belgilanmaganlar bo'sh deb hisoblanadi

   3. COMPACT — tirik obyektlar zichlashtiriladi, fragmentatsiya yo'qoladi
                (LOH'da sukut bo'yicha bajarilmaydi)

   ⚠ MARK bosqichida boshqariladigan thread'lar TO'XTATILADI (stop-the-world)
     Server GC'da bu vaqt qisqa, lekin nolga teng emas.
```

## Workstation va Server GC

| | Workstation | Server |
|---|---|---|
| Heap | Bitta | **Har yadro uchun alohida** |
| GC thread | Bitta | Har heap uchun |
| Maqsad | Past kechikish, UI | **Yuqori throughput** |
| Default | Desktop ilovalar | ASP.NET Core |

```xml
<PropertyGroup>
  <ServerGarbageCollection>true</ServerGarbageCollection>
  <ConcurrentGarbageCollection>true</ConcurrentGarbageCollection>
</PropertyGroup>
```

```
   ⚠ Konteynerda ehtiyot bo'ling:
     Server GC har yadro uchun heap yaratadi. 16 yadroli node'da
     xotira limiti 512 MB bo'lgan konteyner uchun bu ortiqcha.
     .NET buni CPU limit'dan aniqlaydi, lekin limit qo'yilmagan bo'lsa — muammo.
```

## LOH — 85 000 bayt chegarasi

```csharp
var small = new byte[84_000];    // Gen 0
var large = new byte[85_000];    // LOH  ← chegara

// Massiv elementlari uchun ham amal qiladi:
var arr = new long[10_625];      // 10 625 × 8 = 85 000 → LOH
```

```
   LOH fragmentatsiyasi:

   ┌──────┬────┬──────────┬────┬────────┐
   │ 200KB│bo'sh│  150 KB  │bo'sh│ 300 KB │
   └──────┴────┴──────────┴────┴────────┘
            ▲              ▲
            └──────────────┴── bo'sh joy bor, lekin UZLUKSIZ emas
                               → 250 KB so'ralsa OutOfMemoryException
                                 (xotira bo'lsa ham!)
```

```csharp
// Zaruratda LOH'ni kompaktlash — QIMMAT, faqat alohida holatlarda
GCSettings.LargeObjectHeapCompactionMode = GCLargeObjectHeapCompactionMode.CompactOnce;
GC.Collect();
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `GC.Collect()` ni chaqirish | Generatsiyalar mantiqini buzadi, sekinlashtiradi |
| Katta bufer'larni har safar yaratish | LOH fragmentatsiyasi |
| Issiq yo'lda ko'p allocation | Gen0 tez-tez, pauza ko'payadi |
| Katta obyektlarni keshda ushlash | Gen2 o'sadi, yig'ish qimmatlashadi |
| `IDisposable` ni GC bilan chalkashtirish | Ulanish/deskriptor sizadi (M1.8) |
| Konteynerda xotira limitini qo'ymaslik | GC noto'g'ri sozlanadi |

```csharp
// ❌ Har so'rovda 100 KB massiv — LOH'ga tushadi
byte[] buffer = new byte[100_000];

// ✅ Pool'dan olish (2.4)
byte[] buffer = ArrayPool<byte>.Shared.Rent(100_000);
try { /* ... */ }
finally { ArrayPool<byte>.Shared.Return(buffer); }
```

## Fintech konteksti

- **Kechikish barqarorligi** — to'lov API'sida p99 muhim. Gen2 yig'ilishi bir necha
  yuz millisekund pauza berishi mumkin; buni kamaytirish uchun uzoq yashaydigan
  obyektlar sonini kamaytirish kerak.
- **Katta hisobot generatsiyasi** — CSV/PDF eksport LOH'ni to'ldiradi. Yechim:
  streaming va `ArrayPool`.
- **GC metrikalari** monitoringda bo'lishi kerak: Gen2 chastotasi, `% Time in GC`,
  LOH hajmi.

## Intervyu savollari

**1. GC nima uchun generatsiyalarga bo'lingan?** ⭐

> Gipoteza oddiy: **obyektlarning aksariyati tez o'ladi**. Shuning uchun har safar
> butun heap'ni skanerlash o'rniga faqat eng yosh qismi (Gen0) yig'iladi — bu juda
> tez.
>
> Omon qolgan obyektlar Gen1 ga, keyin Gen2 ga ko'chadi. Gen2 kam yig'iladi, lekin
> yig'ilishi qimmat.
>
> Amaliy xulosa: qisqa umrli obyektlar arzon, uzoq yashaydiganlar qimmat.

**2. LOH nima va nega muammo tug'diradi?**

> 85 000 baytdan katta obyektlar Large Object Heap'ga tushadi. Sabab: katta
> obyektlarni ko'chirish (compact) qimmat, shuning uchun sukut bo'yicha u
> **kompaktlanmaydi**.
>
> Oqibat — fragmentatsiya: bo'sh joy jami yetarli bo'lsa ham, uzluksiz blok
> topilmasa `OutOfMemoryException` chiqadi.
>
> Yechim: katta bufer'larni `ArrayPool<T>` orqali qayta ishlatish yoki streaming'ga
> o'tish.

**3. `GC.Collect()` ni qachon chaqirasiz?**

> Deyarli hech qachon. U generatsiyalar mantiqini buzadi: majburiy yig'ish omon
> qolgan obyektlarni keyingi generatsiyaga ko'taradi va ularni yig'ish
> qimmatlashadi.
>
> Istisno: benchmark yoki test'da aniq holatni tekshirish, yoki bir marta bajariladigan
> katta ish tugagach LOH kompaktlash.

**4. Server GC va Workstation GC farqi nima?**

> Server GC **har yadro uchun alohida heap va GC thread** yaratadi — bu throughput'ni
> oshiradi va ASP.NET Core'da default.
>
> Workstation GC bitta heap ishlatadi va past kechikishga qaratilgan.
>
> Konteynerda ehtiyot bo'lish kerak: CPU limiti qo'yilmagan bo'lsa, .NET node'ning
> barcha yadrolarini ko'radi va haddan tashqari ko'p heap yaratadi.

## Deliverable

```csharp
public class GcTests
{
    [Fact]
    public void LargeArray_GoesToLoh()
    {
        var small = new byte[84_000];
        var large = new byte[85_000];

        Assert.Equal(0, GC.GetGeneration(small));
        Assert.Equal(2, GC.GetGeneration(large));   // LOH → Gen2 bilan hisoblanadi
    }

    [Fact]
    public void ArrayPool_AvoidsLohAllocation()
    {
        var before = GC.CollectionCount(2);

        for (int i = 0; i < 1000; i++) {
            var buf = ArrayPool<byte>.Shared.Rent(100_000);
            ArrayPool<byte>.Shared.Return(buf);
        }

        Assert.Equal(before, GC.CollectionCount(2));   // Gen2 yig'ilishi yo'q
    }

    [Fact]
    public void ShortLivedObjects_AreCheap()
    {
        var before = GC.CollectionCount(2);
        for (int i = 0; i < 1_000_000; i++) _ = new object();
        Assert.True(GC.CollectionCount(2) - before <= 1);   // Gen0 da o'ldi
    }
}
```

## Xotira kartasi

```
Gipoteza     obyektlarning aksariyati TEZ O'LADI
Gen0         yangi · kichik · tez-tez va TEZ yig'iladi
Gen1         bufer zona
Gen2         uzoq yashaydiganlar · kam yig'iladi, lekin QIMMAT
LOH          ≥ 85 000 bayt · Gen2 bilan · sukut bo'yicha KOMPAKTLANMAYDI
             → fragmentatsiya → xotira bo'lsa ham OutOfMemoryException
Bosqichlar   mark → sweep → compact · mark'da stop-the-world
Server GC    har yadro uchun heap · ASP.NET Core default · konteynerda ehtiyot
GC.Collect() DEYARLI HECH QACHON — generatsiya mantiqini buzadi
Yechim       ArrayPool · streaming · uzoq yashaydigan obyektlarni kamaytirish
```

---

# 2.3 · Xotira sizishi .NET'da ⭐

## Nima va nega

GC bor bo'lsa ham .NET'da xotira sizishi mumkin. Sabab: GC **yetib boriladigan**
obyektlarni yig'maydi. Agar kimdir keraksiz obyektga havolani ushlab tursa — u
abadiy yashaydi.

> **Ta'rif:** .NET'da xotira sizishi = «kerak bo'lmagan obyektga havola qolib
> ketgan».

## Beshta asosiy sabab

### 1. Event obunasi bekor qilinmagan

```
   ┌──────────────────┐             ┌──────────────────┐
   │  Publisher       │   event     │  Subscriber      │
   │  (singleton)     │  havolasi   │  (scoped)        │
   │  Completed ──────┼────────────►│  OnCompleted     │
   └──────────────────┘             └──────────────────┘

   Subscriber "o'lishi" kerak edi, lekin singleton unga havola ushlab turibdi.
   Har so'rovda yangi subscriber → XOTIRA MONOTON O'SADI.
```

```csharp
// ✅ Dispose'da obunani bekor qilish
public sealed class Handler : IDisposable
{
    public Handler(IEventBus bus) { _bus = bus; _bus.Completed += OnCompleted; }
    public void Dispose() => _bus.Completed -= OnCompleted;
}
```

### 2. Static kolleksiya

```csharp
// ❌ Hech qachon tozalanmaydi
private static readonly Dictionary<Guid, Payment> _cache = new();

// ✅ Cheklangan hajm va muddat
private readonly IMemoryCache _cache;   // SizeLimit + AbsoluteExpiration bilan
```

### 3. Captive dependency (M1 / M7)

```csharp
// ❌ Singleton Scoped DbContext'ni butun ilova umriga ushlaydi
services.AddSingleton<CacheService>();   // ichida AppDbContext bor
```

### 4. Uzoq yashaydigan closure

```csharp
// ❌ Timer callback'i katta obyektni ushlab qoladi
var hugeData = LoadEverything();                    // 200 MB
_timer = new Timer(_ => Log(hugeData.Count), null, 0, 1000);
// hugeData abadiy yashaydi

// ✅ Faqat kerakli qiymatni ushlash
int count = hugeData.Count;
_timer = new Timer(_ => Log(count), null, 0, 1000);
```

### 5. `IDisposable` chaqirilmagan (M1.8)

Bu texnik jihatdan xotira sizishi emas, lekin natija bir xil: resurs tugaydi.

## Aniqlash

```bash
# 1. Xotira o'sishini kuzatish
dotnet-counters monitor -p <pid> \
    --counters System.Runtime[gc-heap-size,gen-2-gc-count,alloc-rate]

# 2. Ikki nuqtada dump olish (masalan 10 daqiqa oralatib)
dotnet-dump collect -p <pid> -o /tmp/dump1.dmp
dotnet-dump collect -p <pid> -o /tmp/dump2.dmp

# 3. Tahlil
dotnet-dump analyze /tmp/dump2.dmp
> dumpheap -stat                    # tur bo'yicha eng ko'p xotira
> gcroot <obyekt manzili>           # KIM uni ushlab turibdi ← asosiy savol
```

```
   dumpheap -stat natijasi:

   MT           Count    TotalSize  Class Name
   00007ff...   145 302   34 872 480  PaymentEventHandler   ← shubhali
   00007ff...     1 024    2 097 152  System.Byte[]

   → gcroot bilan kim ushlab turganini topamiz:
     PaymentEventHandler ← EventBus.Completed ← Singleton
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Event obunasini bekor qilmaslik | Monoton o'sish |
| Static kolleksiyaga cheksiz qo'shish | Gen2 to'ladi |
| `IMemoryCache` ga `SizeLimit` qo'ymaslik | Kesh xotirani yeydi |
| Uzoq yashaydigan closure'da katta obyekt | Yashirin ushlab qolish |
| Faqat «xotira o'sdi» deb GC'ni ayblash | Sabab kod'da |
| Bir dump'ga qarab xulosa qilish | Ikki nuqta solishtirilishi kerak |

## Fintech konteksti

- **Uzoq ishlaydigan servis** — outbox relay, reconciliation job'lari. Ular kunlar
  davomida ishlaydi, ya'ni kichik sizish ham sezilarli bo'ladi.
- **Kesh** — kurs va ma'lumotnomalar keshlanadi, lekin **hajm va muddat cheklangan**
  bo'lishi shart.
- Monitoringda: `gc-heap-size` trendi. Barqaror o'sish — sizish belgisi.

## Intervyu savollari

**1. GC bor bo'lsa ham .NET'da xotira sizishi mumkinmi?** ⭐

> Ha. GC **yetib boriladigan** obyektlarni yig'maydi — u faqat hech kim havola
> qilmagan obyektlarni tozalaydi.
>
> Ya'ni .NET'da sizish = «kerak bo'lmagan obyektga havola qolib ketgan».
>
> Eng ko'p uchraydigan sabablar: bekor qilinmagan event obunasi, cheksiz o'sadigan
> static kolleksiya, captive dependency va uzoq yashaydigan closure.

**2. Xotira sizishini qanday aniqlaysiz?**

> Avval **o'lchayman**, taxmin qilmayman.
>
> 1. `dotnet-counters` bilan `gc-heap-size` trendini kuzataman — barqaror o'sish
>    bormi.
> 2. Ikki nuqtada `dotnet-dump collect` bilan dump olaman.
> 3. `dumpheap -stat` bilan qaysi tur o'sganini topaman.
> 4. **`gcroot`** bilan uni **kim ushlab turganini** aniqlayman — asosiy savol shu.
>
> Bitta dump yetarli emas: solishtirish kerak.

**3. Event obunasi qanday sizish beradi?**

> Publisher subscriber'ning metodiga havola ushlab turadi. Agar publisher uzoq
> yashasa (singleton), subscriber esa qisqa umrli bo'lsa (scoped) — har so'rovda
> yangi subscriber qo'shiladi va hech biri yig'ilmaydi.
>
> Yechim: `Dispose` da `-=`, yoki weak event naqshi. Fintech'da esa umuman `event`
> o'rniga outbox ishlatiladi (M1.7).

## Deliverable

```csharp
public class MemoryLeakTests
{
    [Fact]
    public void UnsubscribedHandler_IsCollected()
    {
        var bus = new EventBus();
        var weak = CreateAndDispose(bus);      // Dispose ichida -= bor

        GC.Collect(); GC.WaitForPendingFinalizers(); GC.Collect();
        Assert.False(weak.IsAlive);
    }

    [Fact]
    public void SubscribedHandler_LeaksWithoutUnsubscribe()
    {
        var bus = new EventBus();
        var weak = CreateWithoutDispose(bus);

        GC.Collect(); GC.WaitForPendingFinalizers(); GC.Collect();
        Assert.True(weak.IsAlive);             // ⚠ sizish ISBOTLANDI
    }

    [Fact]
    public void MemoryCache_RespectsSizeLimit()
    {
        var cache = new MemoryCache(new MemoryCacheOptions { SizeLimit = 100 });
        for (int i = 0; i < 1000; i++)
            cache.Set(i, new byte[1024], new MemoryCacheEntryOptions { Size = 1 });

        Assert.True(cache.Count <= 100);
    }

    [Fact]
    public async Task LongRunningService_HeapStaysStable()
    {
        var before = GC.GetTotalMemory(forceFullCollection: true);
        for (int i = 0; i < 10_000; i++) await relay.ProcessBatchAsync();
        var after = GC.GetTotalMemory(forceFullCollection: true);

        Assert.True(after - before < 10 * 1024 * 1024);   // < 10 MB o'sish
    }
}
```

## Xotira kartasi

```
Ta'rif       .NET'da sizish = kerak bo'lmagan obyektga HAVOLA qolib ketgan
             GC yetib boriladigan obyektni yig'MAYDI
5 sabab      1. event obunasi bekor qilinmagan
             2. static kolleksiya cheksiz o'sadi
             3. captive dependency (singleton → scoped)
             4. uzoq yashaydigan closure katta obyektni ushlaydi
             5. IDisposable chaqirilmagan
Aniqlash     dotnet-counters (gc-heap-size trendi)
             → dotnet-dump collect IKKI nuqtada
             → dumpheap -stat (qaysi tur o'sdi)
             → gcroot (KIM ushlab turibdi) ← asosiy savol
Kesh         IMemoryCache uchun SizeLimit + expiration MAJBURIY
Fintech      uzoq ishlaydigan job'lar — kichik sizish ham kunlar ichida sezilarli
```

---

# 2.4 · `Span<T>`, `Memory<T>`, `ArrayPool`

## Nima va nega

Ko'p kod xotirani **bekorga nusxalaydi**: satrni kesish, massivning bir qismini
uzatish, bufer yaratish. `Span<T>` bu nusxalarni yo'q qiladi — u **xotiraga
oyna**, nusxa emas.

```
   ❌ Substring — YANGI allocation
   "1000.50 UZS"
    └──┬───┘
       └──► new string "1000.50"        (heap'da yangi obyekt)

   ✅ Span — nusxa YO'Q
   "1000.50 UZS"
    └──┬───┘
       └──► ReadOnlySpan<char>          (faqat ko'rsatkich + uzunlik)
            ┌──────────┬────────┐
            │ ptr      │ length │        stack'da, 16 bayt
            └──────────┘────────┘
```

## `Span<T>` cheklovlari

`Span<T>` — `ref struct` (M1.3), ya'ni **hech qachon heap'ga tushmaydi**:

```csharp
// ❌ Bularning hech biri mumkin emas
class Holder { Span<byte> _field; }          // class maydoni
async Task M() { Span<byte> s = ...; await X(); }   // await orqali o'tmaydi
IEnumerable<int> Iter() { Span<int> s = ...; yield return 1; }
object boxed = span;                          // boxing

// ✅ Async kerak bo'lsa — Memory<T>
async Task ProcessAsync(Memory<byte> buffer) {
    await stream.ReadAsync(buffer);
    Span<byte> span = buffer.Span;            // sinxron qismda Span'ga o'tamiz
}
```

| | `Span<T>` | `Memory<T>` |
|---|---|---|
| Qayerda yashaydi | Faqat stack | Heap'ga tusha oladi |
| `async` da | ❌ | ✅ |
| Class maydoni | ❌ | ✅ |
| Tezlik | Eng tez | Biroz sekinroq (`.Span` kerak) |

## Amaliy misollar

```csharp
// Allocation'siz parsing
static bool TryParseAmount(ReadOnlySpan<char> input, out long minor)
{
    var space = input.IndexOf(' ');
    var amountPart = space < 0 ? input : input[..space];
    return long.TryParse(amountPart, out minor);
}

TryParseAmount("125050 UZS".AsSpan(), out var m);   // 0 allocation

// stackalloc — kichik bufer stack'da
Span<byte> buffer = stackalloc byte[64];            // heap YO'Q
// ⚠ faqat kichik va MA'LUM hajm uchun (≤ 1 KB), siklda EMAS

// Massiv qismini uzatish
void Process(ReadOnlySpan<byte> data) { }
byte[] arr = GetData();
Process(arr.AsSpan(100, 50));                       // nusxa yo'q
```

## `ArrayPool<T>`

Katta bufer'larni qayta ishlatish — LOH fragmentatsiyasidan qutulish yo'li.

```csharp
var pool = ArrayPool<byte>.Shared;
byte[] buffer = pool.Rent(100_000);        // ⚠ SO'RALGANDAN KATTA bo'lishi mumkin
try
{
    var used = buffer.AsSpan(0, 100_000);  // shuning uchun aniq uzunlik bilan
    await stream.ReadAsync(used);
}
finally
{
    pool.Return(buffer, clearArray: true); // maxfiy ma'lumot bo'lsa TOZALANG
}
```

```
   ⚠ ArrayPool qoidalari:

   1. Rent() so'ralgandan KATTA massiv qaytarishi mumkin
      → har doim .AsSpan(0, kerakliUzunlik)

   2. Return() dan keyin massivga TEGMANG
      → boshqa kod uni allaqachon olgan bo'lishi mumkin

   3. Return() ni finally'da chaqiring
      → exception bo'lsa ham qaytarilsin

   4. Maxfiy ma'lumot → clearArray: true
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Siklda `stackalloc` | Stack overflow |
| Katta `stackalloc` (> 1 KB) | Stack overflow |
| `Return` dan keyin massivdan foydalanish | Ma'lumot buzilishi |
| `Return` ni `finally`siz | Pool tugaydi |
| `Rent` qaytargan uzunlikka ishonish | Ortiqcha ma'lumot o'qiladi |
| `Span` ni `async` metodda ishlatishga urinish | Kompilyatsiya xatosi |
| Erta optimallashtirish | Kod murakkablashadi, foyda yo'q |

## Fintech konteksti

- **Fayl eksporti** (CSV hisobot, bank fayllari) — streaming + `ArrayPool`, aks
  holda LOH to'ladi.
- **ISO 8583 / fixed-width formatlar** bilan ishlash — `Span` bilan parsing
  allocation'siz bo'ladi.
- **Kriptografiya** — kalit va imzo bufer'lari `Return(clearArray: true)` bilan
  tozalanishi shart.

> **Muhim:** bu optimizatsiyalar **o'lchangan** bo'g'izda qo'llanadi. Tipik to'lov
> API'sida bo'g'iz DB va tarmoq, `Span` esa u yerda hech nima o'zgartirmaydi.

## Intervyu savollari

**1. `Span<T>` nima beradi?**

> U xotiraga **oyna** — massiv, satr yoki stack bufer'ining bir qismiga nusxasiz
> murojaat.
>
> Amaliy foyda: `Substring`, massiv nusxalash, oraliq bufer'lar — bularning hammasi
> allocation'siz bajariladi.
>
> Narxi: `Span<T>` — `ref struct`, ya'ni faqat stack'da yashaydi va `async`
> metodda, class maydonida, LINQ'da ishlatib bo'lmaydi.

**2. `Span<T>` va `Memory<T>` farqi nima?**

> `Span<T>` faqat stack'da yashaydi — shuning uchun tezroq, lekin `async` orqali
> o'tmaydi va obyekt maydoni bo'la olmaydi.
>
> `Memory<T>` heap'ga tusha oladi va `async` metodda ishlaydi. Sinxron qismda undan
> `.Span` olinadi.
>
> Amaliy naqsh: API'da `Memory<T>` qabul qilinadi, ichkarida `Span<T>` ga o'tiladi.

**3. `ArrayPool` qachon kerak?**

> Katta (85 KB dan oshadigan) bufer'lar **tez-tez** yaratilganda. Ular LOH'ga
> tushadi va fragmentatsiya beradi.
>
> Qoidalar: `Rent` so'ralgandan katta massiv qaytarishi mumkin, shuning uchun aniq
> uzunlik bilan ishlash kerak; `Return` `finally` da bo'lishi; va qaytargandan keyin
> massivga tegmaslik.
>
> Maxfiy ma'lumot bo'lsa — `Return(clearArray: true)`.

**4. `stackalloc` xavflimi?**

> Noto'g'ri ishlatilsa ha — stack cheklangan (odatda 1 MB), va uni to'ldirish
> `StackOverflowException` beradi. Bu exception **ushlanmaydi** va jarayonni
> darhol o'ldiradi.
>
> Qoida: faqat kichik (≤ 1 KB) va **oldindan ma'lum** hajm uchun, va **hech qachon
> siklda**.

## Deliverable

```csharp
public class SpanTests
{
    [Fact]
    public void Span_DoesNotAllocate()
    {
        var input = "125050 UZS";
        var before = GC.GetAllocatedBytesForCurrentThread();

        var span = input.AsSpan();
        var amount = span[..span.IndexOf(' ')];
        _ = long.Parse(amount);

        Assert.Equal(0, GC.GetAllocatedBytesForCurrentThread() - before);
    }

    [Fact]
    public void Substring_Allocates()
    {
        var input = "125050 UZS";
        var before = GC.GetAllocatedBytesForCurrentThread();
        _ = long.Parse(input.Substring(0, input.IndexOf(' ')));
        Assert.True(GC.GetAllocatedBytesForCurrentThread() - before > 0);
    }

    [Fact]
    public void ArrayPool_MayReturnLargerArray()
    {
        var buf = ArrayPool<byte>.Shared.Rent(100);
        try { Assert.True(buf.Length >= 100); }        // ANIQ 100 emas
        finally { ArrayPool<byte>.Shared.Return(buf); }
    }

    [Fact]
    public void ArrayPool_ClearsSensitiveData()
    {
        var buf = ArrayPool<byte>.Shared.Rent(64);
        buf[0] = 0xFF;
        ArrayPool<byte>.Shared.Return(buf, clearArray: true);

        var again = ArrayPool<byte>.Shared.Rent(64);
        Assert.Equal(0, again[0]);
        ArrayPool<byte>.Shared.Return(again);
    }
}
```

## Xotira kartasi

```
Span<T>      xotiraga OYNA, nusxa emas · ref struct → faqat stack
             async/class maydoni/LINQ da ISHLAMAYDI
Memory<T>    heap'ga tushadi · async'da ishlaydi · .Span bilan o'tiladi
Naqsh        API'da Memory<T>, ichkarida Span<T>
stackalloc   kichik (≤1 KB) va MA'LUM hajm · SIKLDA EMAS → StackOverflow
ArrayPool    ≥85 KB bufer'lar tez-tez kerak bo'lsa → LOH fragmentatsiyasidan qutulish
Qoidalar     Rent KATTA qaytarishi mumkin → .AsSpan(0, n)
             Return finally'da · qaytargandan keyin TEGMANG
             maxfiy ma'lumot → clearArray: true
Ogohlantirish  bularni faqat O'LCHANGAN bo'g'izda qo'llang
```

---

# 2.5 · Allocation'ni kamaytirish

## Nima va nega

Har allocation — GC uchun kelajakdagi ish. Yuqori throughput'li kodda allocation'ni
kamaytirish kechikish barqarorligini oshiradi.

> Lekin bu **oxirgi** optimizatsiya. Avval algoritm, so'rovlar va I/O.

## Yashirin allocation manbalari

```csharp
// 1. Boxing (M1.1)
object o = 42;
IComparable c = 42;
void Log(object msg); Log(42);

// 2. Closure — compiler class yaratadi
int threshold = 100;
list.Where(x => x > threshold);        // Closure obyekti + delegate

// ✅ Static lambda — closure yo'q
list.Where(static x => x > 100);

// 3. LINQ zanjiri — har operator enumerator yaratadi
var result = items.Where(...).Select(...).ToList();

// ✅ Issiq yo'lda oddiy sikl
var result = new List<T>(items.Count);
foreach (var i in items) if (Test(i)) result.Add(Map(i));

// 4. params massivi
void Log(string fmt, params object[] args);   // har chaqiruvda massiv + boxing

// ✅ Generic overload
void Log<T0, T1>(string fmt, T0 a0, T1 a1);

// 5. String interpolatsiya va konkatenatsiya
logger.LogDebug($"Value: {x}");        // ⚠ Debug o'chiq bo'lsa ham hisoblanadi

// ✅ Structured logging — shablon o'zgarmas
logger.LogDebug("Value: {Value}", x);
```

## `ValueTask` — qachon

```
   Task<T>      → har chaqiruvda HEAP allocation
   ValueTask<T> → natija SINXRON tayyor bo'lsa allocation YO'Q

   Foydali:  keshdan o'qish — 95% holat sinxron tugaydi
   Foydasiz: har doim async I/O — u yerda baribir allocation bo'ladi
```

```csharp
// ✅ Ko'pincha sinxron tugaydigan yo'l
public ValueTask<Rate> GetRateAsync(string pair)
{
    if (_cache.TryGetValue(pair, out var cached))
        return new ValueTask<Rate>(cached);        // allocation YO'Q

    return new ValueTask<Rate>(LoadFromDbAsync(pair));
}
```

```
   ⚠ ValueTask cheklovlari:

   · FAQAT BIR MARTA await qilinadi
   · .Result / .GetAwaiter().GetResult() ni sinxron chaqirmang
   · Task.WhenAll ga to'g'ridan-to'g'ri berilmaydi (.AsTask() kerak)
   · Saqlab qo'yib keyin await qilish MUMKIN EMAS

   Shubha bo'lsa — Task<T> ishlating.
```

## Boshqa vositalar

```csharp
// Struct enumerator — foreach da allocation yo'q
foreach (var item in list) { }         // List<T> struct enumerator ishlatadi
foreach (var item in (IEnumerable<T>)list) { }   // ❌ boxing

// Cached delegate
private static readonly Func<Payment, bool> IsLarge = p => p.Minor > 1_000_000;

// ObjectPool — qimmat obyektlar uchun
var pool = new DefaultObjectPool<StringBuilder>(new StringBuilderPooledObjectPolicy());
var sb = pool.Get();
try { /* ... */ } finally { pool.Return(sb); }

// ArrayPool (2.4)
// [SkipLocalsInit] — lokal o'zgaruvchilarni nolga to'ldirmaslik (ehtiyot bilan)
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Erta optimallashtirish | Kod murakkab, foyda yo'q |
| `ValueTask` ni ikki marta `await` qilish | Kutilmagan xatti-harakat yoki exception |
| `ValueTask` ni saqlab qo'yish | Undefined behavior |
| Har joyda `ValueTask` | Murakkablik, foyda kam |
| `$"..."` bilan log yozish | Log darajasi o'chiq bo'lsa ham hisoblanadi |
| Allocation'ni o'lchamasdan «optimallashtirish» | Vaqt behuda |

## Fintech konteksti

- Tipik to'lov API'sida bo'g'iz — **DB va tarmoq**, allocation emas. Bu bo'lim
  kerak bo'ladigan joylar: xabar navbatini yuqori tezlikda qayta ishlash, katta
  fayl eksporti, ISO 8583 parsing.
- `LoggerMessage` source generator (M1.11) — issiq yo'lda log yozishda allocation'ni
  yo'qotadi.

## Intervyu savollari

**1. `ValueTask` qachon ishlatasiz?**

> Metod **ko'pincha sinxron** tugaganda — masalan keshdan o'qish, 95% holat kesh
> hit bo'lsa.
>
> `Task<T>` har chaqiruvda heap allocation qiladi; `ValueTask<T>` esa sinxron
> yo'lda uni butunlay yo'qotadi.
>
> Lekin cheklovlari bor: faqat bir marta `await` qilinadi, saqlab qo'yib bo'lmaydi,
> `Task.WhenAll` ga to'g'ridan-to'g'ri berilmaydi. Shubha bo'lsa — `Task<T>`.

**2. Yashirin allocation manbalarini sanang.**

> Boxing; closure (lambda tashqi o'zgaruvchini ushlasa compiler class yaratadi);
> LINQ zanjiridagi enumerator'lar; `params object[]`; string interpolatsiya;
> `IEnumerable` orqali `foreach` (struct enumerator boxing bo'ladi).
>
> Ularni topish uchun `GC.GetAllocatedBytesForCurrentThread()` yoki
> BenchmarkDotNet'ning `[MemoryDiagnoser]` atributi ishlatiladi.

**3. Qachon allocation optimizatsiyasiga kirishasiz?**

> Faqat **o'lchangan** muammo bo'lganda: GC pauzalari p99 kechikishga ta'sir
> qilayotgani ko'rinsa, yoki allocation rate juda yuqori bo'lsa.
>
> Tipik backend'da bo'g'iz DB va tarmoq — u yerda `Span` bilan mikrooptimizatsiya
> hech nima bermaydi, faqat kodni murakkablashtiradi.

## Deliverable

```csharp
[MemoryDiagnoser]
public class AllocationBenchmarks
{
    private readonly List<int> _items = Enumerable.Range(0, 1000).ToList();

    [Benchmark(Baseline = true)]
    public int LinqChain() => _items.Where(x => x % 2 == 0).Select(x => x * 2).Sum();

    [Benchmark]
    public int ManualLoop()
    {
        int sum = 0;
        foreach (var x in _items) if (x % 2 == 0) sum += x * 2;
        return sum;
    }

    [Benchmark]
    public async Task<int> WithTask() => await CachedTaskAsync();

    [Benchmark]
    public async ValueTask<int> WithValueTask() => await CachedValueTaskAsync();
}
```

```csharp
[Fact]
public void StaticLambda_DoesNotAllocateClosure()
{
    var before = GC.GetAllocatedBytesForCurrentThread();
    _ = _items.Where(static x => x > 100).Count();
    var withStatic = GC.GetAllocatedBytesForCurrentThread() - before;

    int threshold = 100;
    before = GC.GetAllocatedBytesForCurrentThread();
    _ = _items.Where(x => x > threshold).Count();
    var withClosure = GC.GetAllocatedBytesForCurrentThread() - before;

    Assert.True(withStatic < withClosure);
}
```

## Xotira kartasi

```
Tartib        avval algoritm/so'rov/I/O · allocation OXIRGI optimizatsiya
Yashirin      boxing · closure · LINQ enumerator · params object[]
              string interpolatsiya · IEnumerable orqali foreach
static lambda closure allocation'ini yo'qotadi
ValueTask     sinxron tugaydigan yo'lda allocation YO'Q (kesh o'qish)
              ⚠ BIR MARTA await · saqlab bo'lmaydi · WhenAll uchun .AsTask()
              shubha bo'lsa → Task<T>
Vositalar     ObjectPool · ArrayPool · cached delegate · LoggerMessage
O'lchash      GC.GetAllocatedBytesForCurrentThread() · [MemoryDiagnoser]
Fintech       bo'g'iz odatda DB va tarmoq — bu yerda foyda YO'Q
```

---

# 2.6 · BenchmarkDotNet bilan o'lchash

## Nima va nega

`Stopwatch` bilan o'lchash **deyarli har doim noto'g'ri** natija beradi: JIT
warm-up, GC aralashuvi, kompilyator optimizatsiyasi, CPU chastotasining
o'zgarishi.

```
   Stopwatch bilan o'lchashda nima buzadi:

   ┌────────────────────────────────────────────────────────┐
   │ 1. Tier 0 kod o'lchanadi (hali optimallashtirilmagan)  │
   │ 2. GC o'rtada ishga tushadi                            │
   │ 3. Kompilyator natijasi ishlatilmagan kodni O'CHIRADI  │
   │ 4. CPU turbo/thermal throttling                        │
   │ 5. Bitta o'lchov — statistik ishonch yo'q              │
   └────────────────────────────────────────────────────────┘
```

BenchmarkDotNet bularning hammasini hal qiladi: warm-up, ko'p iteratsiya,
statistik tahlil, alohida jarayon, natijani «ishlatilgan» qilib ko'rsatish.

## Asosiy shablon

```csharp
[MemoryDiagnoser]                       // allocation ham o'lchanadi
[SimpleJob(RuntimeMoniker.Net80)]
public class MoneyBenchmarks
{
    private decimal[] _decimals = null!;
    private long[] _longs = null!;

    [GlobalSetup]
    public void Setup()
    {
        _decimals = Enumerable.Range(0, 1000).Select(i => (decimal)i / 100).ToArray();
        _longs    = Enumerable.Range(0, 1000).Select(i => (long)i).ToArray();
    }

    [Benchmark(Baseline = true)]
    public decimal SumDecimal()
    {
        decimal sum = 0;
        foreach (var d in _decimals) sum += d;
        return sum;                      // ⚠ QAYTARING — aks holda optimallashtiriladi
    }

    [Benchmark]
    public long SumLong()
    {
        long sum = 0;
        foreach (var l in _longs) sum += l;
        return sum;
    }
}

// Program.cs
BenchmarkRunner.Run<MoneyBenchmarks>();
```

```bash
dotnet run -c Release          # ⚠ Release MAJBURIY
```

## Natijani o'qish

```
| Method     | Mean       | Error    | StdDev   | Ratio | Allocated |
|----------- |-----------:|---------:|---------:|------:|----------:|
| SumLong    |   612.4 ns |  3.21 ns |  2.85 ns |  1.00 |         - |
| SumDecimal | 8,241.7 ns | 42.10 ns | 39.38 ns | 13.46 |         - |
```

| Ustun | Ma'nosi |
|---|---|
| `Mean` | O'rtacha vaqt |
| `Error` | Ishonch oralig'ining yarmi (99.9%) |
| `StdDev` | Standart og'ish — **katta bo'lsa natija beqaror** |
| `Ratio` | Baseline'ga nisbatan |
| `Allocated` | Bir chaqiruvdagi allocation |

> Yuqoridagi natija M4.2 dagi da'voni tasdiqlaydi: `decimal` `long`dan ~13 barobar
> sekin. Va shu bilan birga ko'rsatadi: 1000 ta qo'shish **8 mikrosekund** — DB
> so'rovi esa millisekundlar. Ya'ni fintech'da bu farq ahamiyatsiz.

## Tipik xatolar

| Xato | Natija |
|---|---|
| Debug build'da o'lchash | Optimallashtirish o'chiq — natija ma'nosiz |
| Natijani qaytarmaslik | Kompilyator kodni butunlay o'chiradi |
| `[GlobalSetup]` o'rniga benchmark ichida tayyorlash | Tayyorgarlik ham o'lchanadi |
| Bitta iteratsiya | Statistik ishonch yo'q |
| Yuklangan mashinada o'lchash | `StdDev` katta, natija beqaror |
| Mikrobenchmark natijasini tizimga ko'chirish | 13× farq real yukda 0.1% bo'lishi mumkin |

```csharp
// ❌ Natija ishlatilmasa — JIT butun siklni o'chiradi
[Benchmark]
public void Bad() { for (int i = 0; i < 1000; i++) { var x = i * 2; } }

// ✅
[Benchmark]
public int Good() { int sum = 0; for (int i = 0; i < 1000; i++) sum += i * 2; return sum; }
```

## Fintech konteksti

Benchmark **javob beradigan** savollar:

- `decimal` va `long` arifmetikasi farqi (M4.2)
- Ledger balansini hisoblash: `SUM` har safar vs snapshot
- Serializatsiya: `System.Text.Json` vs boshqa variantlar
- `Span` bilan parsing haqiqatan foyda beryaptimi

Benchmark **javob bermaydigan** savollar:

- Butun endpoint kechikishi — bu **load testing** (k6, JMeter)
- DB so'rovi tezligi — bu `EXPLAIN ANALYZE` (M5.9)
- Production'dagi p99 — bu **APM va real trafik**

## Intervyu savollari

**1. Nega `Stopwatch` bilan o'lchash noto'g'ri?**

> Bir necha sabab birdan: JIT warm-up tufayli birinchi o'lchov Tier 0 kodni
> o'lchaydi; GC o'rtada ishga tushishi mumkin; kompilyator natijasi ishlatilmagan
> kodni butunlay o'chiradi; va bitta o'lchov statistik ishonch bermaydi.
>
> BenchmarkDotNet bularning hammasini hal qiladi: warm-up, ko'p iteratsiya,
> statistika, alohida jarayon.

**2. Benchmark natijasini qanday talqin qilasiz?**

> `Mean` bilan birga **`StdDev`** ga qarayman — u katta bo'lsa natija beqaror va
> ishonchsiz.
>
> Va eng muhimi — **kontekstga qo'yaman**. «13 barobar sekin» ta'sirli eshitiladi,
> lekin agar bu 8 mikrosekund bo'lsa va yonida 5 millisekundlik DB so'rovi tursa —
> bu 0.1% ta'sir, ya'ni ahamiyatsiz.
>
> Mikrobenchmark natijasini tizim darajasiga ko'chirish — keng tarqalgan xato.

**3. Benchmark va load testing farqi nima?**

> Benchmark — **bitta metod** darajasidagi mikroo'lchov, izolyatsiyalangan
> muhitda.
>
> Load testing — **butun tizim** yuk ostida: endpoint kechikishi, throughput, DB
> ulanishlari, p95/p99. Bu k6, JMeter yoki NBomber bilan qilinadi.
>
> Ikkalasi turli savollarga javob beradi va bir-birini almashtirmaydi.

## Deliverable

```csharp
[MemoryDiagnoser]
public class LedgerBenchmarks
{
    private LedgerEntry[] _entries = null!;

    [Params(1_000, 100_000)]
    public int EntryCount { get; set; }

    [GlobalSetup]
    public void Setup() => _entries = GenerateEntries(EntryCount);

    [Benchmark(Baseline = true)]
    public long SumAllEntries()
    {
        long balance = 0;
        foreach (var e in _entries)
            balance += e.Direction == 'C' ? e.AmountMinor : -e.AmountMinor;
        return balance;
    }

    [Benchmark]
    public long FromSnapshot()
    {
        long balance = _snapshot.BalanceMinor;
        foreach (var e in _entries.AsSpan(_snapshot.LastEntryIndex))
            balance += e.Direction == 'C' ? e.AmountMinor : -e.AmountMinor;
        return balance;
    }
}
```

## Xotira kartasi

```
Nega BDN     Stopwatch: warm-up · GC · JIT kodni o'chiradi · statistika yo'q
Majburiy     dotnet run -c RELEASE
Atributlar   [MemoryDiagnoser] · [Benchmark(Baseline=true)] · [Params] · [GlobalSetup]
Qoida        natijani QAYTARING — aks holda JIT kodni o'chiradi
Natija       Mean · Error · StdDev (katta = beqaror) · Ratio · Allocated
Talqin       KONTEKSTGA qo'ying: 13× farq 8 µs bo'lsa, 5 ms DB yonida = 0.1%
Farq         benchmark = bitta metod · load testing = butun tizim (k6/NBomber)
             DB so'rovi = EXPLAIN ANALYZE · production p99 = APM
```

---

# 2.7 · Profiling va dump tahlili

## Nima va nega

Benchmark — bilingan joyni o'lchaydi. Profiling — **qayerda muammo ekanini
topadi**. Production'da tashxis qo'yishning yagona ishonchli yo'li.

## Diagnostika vositalari

```bash
dotnet tool install -g dotnet-counters dotnet-dump dotnet-trace dotnet-gcdump
```

| Vosita | Nima uchun | Ta'siri |
|---|---|---|
| `dotnet-counters` | Real vaqtda metrikalar | Juda past |
| `dotnet-gcdump` | Heap tarkibi (turlar, sonlar) | Past |
| `dotnet-dump` | To'liq xotira nusxasi | Jarayon to'xtaydi |
| `dotnet-trace` | CPU profili, hodisalar | O'rtacha |
| `dotnet-stack` | Barcha thread'lar stack'i | Past |

## Simptomdan sababga

```
   SIMPTOM: CPU 100%
   ┌────────────────────────────────────────────────────────┐
   │ dotnet-trace collect -p <pid> --profile cpu-sampling   │
   │ → SpeedScope/PerfView'da eng "issiq" metodlarni ko'rish │
   └────────────────────────────────────────────────────────┘

   SIMPTOM: xotira o'sadi
   ┌────────────────────────────────────────────────────────┐
   │ dotnet-counters (gc-heap-size trendi)                  │
   │ → dotnet-gcdump IKKI nuqtada → farqni solishtirish      │
   │ → dumpheap -stat → gcroot  (2.3)                        │
   └────────────────────────────────────────────────────────┘

   SIMPTOM: ilova "osilgan", CPU past
   ┌────────────────────────────────────────────────────────┐
   │ dotnet-stack report -p <pid>                            │
   │ → deadlock yoki thread pool starvation qidirish         │
   └────────────────────────────────────────────────────────┘

   SIMPTOM: kechikish sakraydi (p99 yomon)
   ┌────────────────────────────────────────────────────────┐
   │ dotnet-counters: % Time in GC · gen-2-gc-count          │
   │ → GC pauzasi bo'lsa: allocation'ni kamaytirish (2.5)    │
   │ → bo'lmasa: DB/tarmoq — APM va EXPLAIN                  │
   └────────────────────────────────────────────────────────┘
```

## Muhim metrikalar

```bash
dotnet-counters monitor -p <pid> --counters \
  System.Runtime[cpu-usage,gc-heap-size,gen-0-gc-count,gen-2-gc-count,\
                 alloc-rate,threadpool-thread-count,threadpool-queue-length,\
                 exception-count] \
  Microsoft.AspNetCore.Hosting[requests-per-second,current-requests]
```

| Metrika | Nimani ko'rsatadi |
|---|---|
| `gen-2-gc-count` | Qimmat yig'ishlar chastotasi |
| `alloc-rate` | Sekundiga qancha ajratilyapti |
| `threadpool-queue-length` | **Ko'tarilsa — thread pool starvation** |
| `exception-count` | Yashirin exception'lar (oqim boshqaruvi?) |
| `current-requests` | Bir vaqtdagi so'rovlar soni |

## Thread pool starvation — klassik holat

```
   Simptom: kechikish keskin oshadi, CPU PAST, threadpool-queue-length o'sadi

   Sabab: sinxron bloklash async kodda
          .Result · .Wait() · lock ichida async

   ┌──────────────────────────────────────────────────────┐
   │ Thread pool: 8 thread                                │
   │ Hammasi .Result ni kutyapti                          │
   │ Continuation'lar navbatda — lekin bajaruvchi yo'q    │
   │ → thread pool sekin-asta o'sadi (sekundiga 1-2 ta)   │
   │ → shu vaqtda tizim deyarli javob bermaydi            │
   └──────────────────────────────────────────────────────┘
```

```bash
# Tasdiqlash
dotnet-stack report -p <pid> | grep -c "SpinWait\|ManualResetEvent"
```

## Production'da dump olish

```bash
# 1. Konteynerda (SYS_PTRACE ruxsati kerak)
kubectl exec -it <pod> -- dotnet-dump collect -p 1 -o /tmp/dump.dmp
kubectl cp <pod>:/tmp/dump.dmp ./dump.dmp

# 2. Tahlil (offline, alohida mashinada)
dotnet-dump analyze dump.dmp
> clrstack -all              # barcha thread'lar
> dumpheap -stat             # turlar bo'yicha xotira
> gcroot <addr>              # kim ushlab turibdi
> syncblk                    # lock'lar — deadlock qidirish
> threadpool                 # thread pool holati
```

> ⚠ `dotnet-dump collect` jarayonni **to'xtatadi** (bir necha soniya). Production'da
> bu kutilgan uzilish bo'lishi kerak; iloji bo'lsa yukdan chiqarilgan pod'da oling.

## Tipik xatolar

| Xato | Natija |
|---|---|
| Profiling'siz optimallashtirish | Noto'g'ri joy tuzatiladi |
| Dev muhitida profiling | Ma'lumot hajmi va yuk boshqa |
| Bitta dump'ga qarab xulosa | Trend ko'rinmaydi |
| Production'da dump olishni bilmaslik | Incident paytida vaqt yo'qoladi |
| GC pauzasini har muammoga ayblash | Ko'pincha sabab DB yoki tarmoq |

## Fintech konteksti

- **Incident jarayoni** oldindan yozilgan bo'lishi kerak: qaysi vosita, qanday
  buyruq, dump qayerga saqlanadi, kim tahlil qiladi.
- To'lov tizimida dump olish **jarayonni to'xtatadi** — bu kutilgan uzilish sifatida
  rejalashtirilishi kerak, yoki avval pod yukdan chiqariladi.
- Dump'da **maxfiy ma'lumot** bo'ladi (karta raqamlari, tokenlar) — u shifrlangan
  holda saqlanishi va kirish cheklangan bo'lishi shart.

## Intervyu savollari

**1. Production'da CPU 100%. Qanday tashxis qo'yasiz?**

> `dotnet-trace collect --profile cpu-sampling` bilan bir necha daqiqalik profil
> olaman va uni SpeedScope yoki PerfView'da ochib eng «issiq» metodlarni ko'raman.
>
> Bir vaqtning o'zida `dotnet-counters` bilan GC metrikalariga qarayman: agar
> `% Time in GC` yuqori bo'lsa — muammo allocation'da, kod mantiqida emas.
>
> Va albatta: avval **oxirgi deploy** nima o'zgarganini tekshiraman.

**2. Xotira o'sib boryapti. Qadamlaringiz?**

> 1. `dotnet-counters` bilan `gc-heap-size` trendini tasdiqlayman — haqiqatan
>    monoton o'sishmi yoki shunchaki kesh to'lganmi.
> 2. **Ikki nuqtada** `dotnet-gcdump` olaman va farqni solishtiraman.
> 3. `dumpheap -stat` bilan qaysi tur o'sganini topaman.
> 4. `gcroot` bilan uni **kim ushlab turganini** aniqlayman — bu asosiy savol.
>
> Odatiy topilma: bekor qilinmagan event obunasi yoki cheksiz o'sadigan static
> kolleksiya (2.3).

**3. Ilova javob bermayapti, lekin CPU past. Nima bo'lgan?**

> Bu deyarli har doim **bloklash**: thread pool starvation yoki deadlock.
>
> `dotnet-counters` da `threadpool-queue-length` o'sayotganini va
> `threadpool-thread-count` sekin ko'tarilayotganini ko'raman.
>
> Tasdiqlash uchun `dotnet-stack report` — ko'p thread `SpinWait` yoki
> `ManualResetEvent` da turgan bo'lsa, sabab `.Result` yoki `.Wait()`.

## Deliverable

```markdown
<!-- dotnet/ops/diagnostics-runbook.md -->
# Diagnostika runbook

## CPU yuqori
1. `dotnet-counters monitor -p 1 --counters System.Runtime[cpu-usage,gc-heap-size]`
2. `% Time in GC` > 20% → allocation muammosi → 2.5
3. Aks holda: `dotnet-trace collect -p 1 --profile cpu-sampling --duration 00:00:30`
4. SpeedScope'da tahlil

## Xotira o'sadi
1. `gc-heap-size` trendini 30 daqiqa kuzatish
2. `dotnet-gcdump collect -p 1 -o /tmp/gc1.gcdump`  (10 daq kutib, gc2)
3. Farqni solishtirish → o'sgan tur
4. `dotnet-dump analyze` → `dumpheap -stat` → `gcroot`

## Javob bermayapti, CPU past
1. `threadpool-queue-length` va `threadpool-thread-count`
2. `dotnet-stack report -p 1`
3. `.Result` / `.Wait()` / `lock` ichida async qidirish

## Dump olish (production)
⚠ Jarayon bir necha soniya to'xtaydi. Avval pod'ni yukdan chiqaring.
```

## Xotira kartasi

```
Tartib        PROFILING'SIZ optimallashtirmang — noto'g'ri joy tuzatiladi
Vositalar     dotnet-counters (past ta'sir) · gcdump · dump (to'xtatadi)
              trace (CPU profili) · stack (thread'lar)
CPU 100%      trace --profile cpu-sampling → SpeedScope
              + % Time in GC tekshirish (allocation muammosimi?)
Xotira o'sadi counters trend → gcdump IKKI nuqtada → dumpheap -stat → GCROOT
Javob yo'q    threadpool-queue-length o'sadi + CPU past
CPU past      → thread pool starvation → .Result / .Wait() qidirish
Metrikalar    gen-2-gc-count · alloc-rate · threadpool-queue-length · exception-count
Production    dump jarayonni TO'XTATADI → avval yukdan chiqaring
              dump'da MAXFIY ma'lumot bor → shifrlash va kirish nazorati
```

---

## M2 — yakuniy tekshiruv ro'yxati

Kodsiz, og'zaki javob bera olsangiz — modul yopilgan:

- [ ] C# kodi qanday bajariladi: IL, JIT, tiered compilation
- [ ] Native AOT qachon mos, qachon mos emas
- [ ] GC nima uchun generatsiyalarga bo'lingan
- [ ] LOH nima va nega fragmentatsiya beradi
- [ ] `GC.Collect()` ni nega chaqirmaslik kerak
- [ ] GC bor bo'lsa ham xotira sizishi qanday mumkin — beshta sabab
- [ ] `gcroot` nima uchun kerak
- [ ] `Span<T>` va `Memory<T>` farqi va cheklovlari
- [ ] `ArrayPool` ning uchta qoidasi
- [ ] `ValueTask` qachon foydali va cheklovlari nima
- [ ] Nega `Stopwatch` bilan o'lchash noto'g'ri
- [ ] Thread pool starvation qanday aniqlanadi

**Deliverable'lar:**

- [ ] `GcTests` — LOH chegarasi, `ArrayPool` Gen2 ni tejashi
- [ ] `MemoryLeakTests` — event sizishini isbotlash va tuzatish
- [ ] `SpanTests` — allocation farqini o'lchash
- [ ] `AllocationBenchmarks` — LINQ vs sikl, `Task` vs `ValueTask`
- [ ] `LedgerBenchmarks` — `SUM` vs snapshot, `[Params]` bilan
- [ ] `diagnostics-runbook.md` — incident paytida ochiladigan qadamlar