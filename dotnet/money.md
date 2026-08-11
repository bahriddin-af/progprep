# M4 · Pul va aniqlik

Fintech'ning **veto zonasi**. Bu yerdagi bitta xato butun suhbatni tugatadi —
va farqi shundaki, boshqa mavzularda "bilmadim" deyish mumkin, bu yerda esa
noto'g'ri javob **dasturchi sifatida ishonchni yo'qotadi**.

| # | Mavzu | P |
|---|---|---|
| [4.1](#41--ieee-754-nega-double-pulga-yaramaydi-) | IEEE 754, nega `double` pulga yaramaydi ⭐ | P0 |
| [4.2](#42--decimal-ichki-tuzilishi-chegaralari-narxi) | `decimal` ichki tuzilishi, chegaralari, narxi | P0 |
| [4.3](#43--minor-units-va-money-value-object) | Minor units, `Money` value object | P0 |
| [4.4](#44--yaxlitlash-) | Yaxlitlash ⭐ | P0 |
| [4.5](#45--bolish-va-qoldiqni-taqsimlash) | Bo'lish va qoldiqni taqsimlash | P0 |
| [4.6](#46--kop-valyuta-va-kurs) | Ko'p valyuta va kurs | P1 |
| [4.7](#47--vaqt-utc-va-kun-chegarasi) | Vaqt: UTC va kun chegarasi | P1 |
| [4.8](#48--komissiya-soliq-chegirma-hisoblash-tartibi) | Komissiya, soliq, chegirma tartibi | P1 |
| [4.9](#49--limitlar) | Limitlar | P1 |

---

# 4.1 · IEEE 754, nega `double` pulga yaramaydi ⭐

## Nima va nega

Kompyuter sonlarni ikkilik sanoqda saqlaydi. Butun sonlar bilan muammo yo'q, lekin
**kasr sonlar** bilan tub muammo bor: o'nlik kasrlarning ko'pchiligi ikkilik sanoqda
**cheksiz davriy** bo'ladi.

O'nlikda 1/3 = 0.333… cheksiz. Xuddi shunday, **ikkilikda 1/10 cheksiz**:

```
   0.1 (o'nlik)  →  ikkilikda:

   0.0001100110011001100110011001100110011...
        └──┬──┘ └──┬──┘ └──┬──┘
        takrorlanadi, cheksiz

   Kompyuter 53 bitda kesadi → 0.1 EMAS, unga eng yaqin son:
   0.1000000000000000055511151231257827021181583404541015625
```

## Ichki mexanika — `double` bit tuzilishi

```
   double = 64 bit

   ┌─┬───────────┬────────────────────────────────────────────────┐
   │S│  exponent │                  mantissa                      │
   │1│    11     │                     52                         │
   └─┴───────────┴────────────────────────────────────────────────┘
    │      │                          │
    │      │                          └── aniqlik: ~15–17 o'nlik raqam
    │      └───────────────────────────── daraja: ±10^308
    └──────────────────────────────────── ishora

   Qiymat = (−1)^S × 1.mantissa × 2^(exponent−1023)
                              ▲
                              └── ASOS 2 — muammoning ildizi shu yerda
```

**Aniq ifodalanadigan sonlar:** faqat `m / 2^n` ko'rinishidagi kasrlar.
0.5 ✓ · 0.25 ✓ · 0.125 ✓ · **0.1 ✗** · **0.2 ✗** · **0.3 ✗**

## Kod

```csharp
double a = 0.1 + 0.2;
Console.WriteLine(a == 0.3);            // ❌ False
Console.WriteLine(a.ToString("R"));     // ❌ 0.30000000000000004

decimal b = 0.1m + 0.2m;
Console.WriteLine(b == 0.3m);           // ✅ True
```

**Xato yig'iladi — bu asosiy muammo:**

```csharp
// 1 million tranzaksiya, har biri 0.01
double sum = 0;
for (int i = 0; i < 1_000_000; i++) sum += 0.01;

Console.WriteLine(sum);            // ❌ 10000.000000018848
Console.WriteLine(sum == 10000);   // ❌ False
//                                       └── 1.88 mikro-so'm farq.
//                                           Auditor buni topadi.

decimal dsum = 0;
for (int i = 0; i < 1_000_000; i++) dsum += 0.01m;
Console.WriteLine(dsum == 10000m); // ✅ True
```

**Yashirin xatolar — eng xavflisi shu:**

```csharp
// ❌ Komissiya hisoblash
double amount = 1000.10, fee = amount * 0.03;
Console.WriteLine(Math.Round(fee, 2));      // 30.00
// ...lekin fee aslida 30.003000000000000247...
// 100 000 tranzaksiyada bu farq real pulga aylanadi

// ❌ Taqqoslash umuman ishlamaydi
if (balance == 0.0) { ... }                 // hech qachon rost bo'lmasligi mumkin

// ❌ Yaxlitlash chegarasida sakrash
Math.Round(2.675, 2);      // double  → 2.67  (kutilgan: 2.68)
Math.Round(2.675m, 2);     // decimal → 2.68
// Sabab: double'da 2.675 aslida 2.67499999999999982236431605997495353221893310546875
```

## Solishtirma jadval

| Tur | Asos | Hajm | Aniqlik | Diapazon | Pul uchun |
|---|---|---|---|---|---|
| `float` | 2 | 4 bayt | ~7 raqam | ±3.4×10³⁸ | ❌ Hech qachon |
| `double` | 2 | 8 bayt | ~15–17 raqam | ±1.7×10³⁰⁸ | ❌ Hech qachon |
| `decimal` | 10 | 16 bayt | 28–29 raqam | ±7.9×10²⁸ | ✅ Ha |
| `long` (tiyin) | — | 8 bayt | butun | ±9.2×10¹⁸ | ✅ Eng ishonchli |

**`double` qachon to'g'ri:** ilmiy hisoblar, grafika, statistika, ML — ya'ni
kirish ma'lumoti allaqachon taxminiy bo'lgan joylarda. **Pul taxminiy emas.**

## Tipik xatolar

| Xato | Natija |
|---|---|
| `double` da pul saqlash | Yig'ilgan xato, audit muvaffaqiyatsizligi |
| JSON'dan `double` ga deserializatsiya | Model `decimal` bo'lsa ham, oraliqda aniqlik yo'qoladi |
| `float`/`double` ni `==` bilan taqqoslash | Deyarli har doim `false` |
| JS front-end'dan kelgan son | JavaScript'da **hamma son `double`** — API'da satr sifatida uzating |
| `double` → `decimal` konvertatsiya | Xato allaqachon kirgan, konvertatsiya uni tuzatmaydi |

```csharp
// ❌ Kech konvertatsiya — xato allaqachon ichkarida
double raw = 0.1 + 0.2;
decimal fixed_ = (decimal)raw;      // 0.300000000000000044... → 0.3000000000000000
                                     // "tuzatilgan" ko'rinadi, lekin manba buzuq

// ✅ Boshidan oxirigacha decimal
decimal ok = 0.1m + 0.2m;
```

## Fintech konteksti

- **API chegarasi:** summani JSON'da `number` emas, **butun tiyin** yoki **satr**
  sifatida uzating. JavaScript client `number` ni `double` ga aylantiradi va
  9 007 199 254 740 991 dan katta qiymat buziladi.
- **DB:** `numeric(19,4)` yoki `bigint` (tiyin). `double precision` / `real` / `float` —
  **hech qachon**.
- **Tashqi provayder:** Payme, Click, Stripe — hammasi summani **eng kichik birlikda
  butun son** sifatida uzatadi. Bu tasodif emas.

## Intervyu savollari

**1. Nega pulni `double` da saqlab bo'lmaydi?** ⭐

> Chunki IEEE 754 binary float o'nlik kasrlarni aniq ifodalay olmaydi — 0.1 ikkilik
> sanoqda cheksiz davriy kasr, xuddi 1/3 o'nlikda bo'lgani kabi. Saqlanadigan qiymat
> 0.1 emas, unga **eng yaqin** ikkilik son.
>
> Har amalda mikroskopik xato qoladi va u **yig'iladi**: bir million marta 0.01 qo'shsangiz
> 10000 emas, 10000.000000018 chiqadi.
>
> Amaliy oqibat: kun oxirida ledger balansi nolga teng chiqmaydi va reconciliation
> muvaffaqiyatsiz bo'ladi.
>
> **Yechim:** `decimal` — o'nlik asosda ishlaydi. Yoki hamma narsani tiyinda `long` da
> saqlash. Narxi: `decimal` ~10 barobar sekinroq va 16 bayt — moliyada bu masala emas.

**2. `decimal` ham cheksiz aniq emas-ku?**

> To'g'ri. `decimal` ham 28–29 muhim raqam bilan cheklangan va 1/3 ni aniq saqlay olmaydi.
>
> Farq **asosda**: `decimal` o'nlik asosda ishlaydi, ya'ni biz pulda ishlatadigan
> qiymatlar (0.1, 0.01, 2.35) **aniq** ifodalanadi. Aynan shu bizga kerak.
>
> Bo'lish baribir ehtiyot talab qiladi — 4.5 dagi qoldiq masalasi.

**3. `double` qachon to'g'ri tanlov?**

> Kirish ma'lumoti allaqachon taxminiy bo'lgan joyda: ilmiy hisoblar, fizika,
> grafika, statistika, mashinaviy o'qitish. U yerda `double` tezroq va aniqligi yetarli.
>
> Pul esa **aniq qiymat** — 1000 so'm bu "taxminan 1000" emas.

**4. Front-end'dan summa qanday kelishi kerak?**

> JavaScript'da **barcha sonlar `double`** — alohida butun son turi yo'q. Shuning uchun
> JSON'da `"amount": 1000.10` yozilsa, client tomonida u allaqachon taxminiy.
>
> Men summani **butun tiyinda** (`"amountMinor": 100010`) yoki **satr sifatida**
> (`"amount": "1000.10"`) uzataman. Bu Stripe va boshqa yirik to'lov API'larining
> yondashuvi.

## Deliverable

```csharp
public class FloatingPointTests
{
    [Fact]
    public void Double_CannotRepresentSimpleDecimals()
    {
        Assert.NotEqual(0.3, 0.1 + 0.2);
        Assert.Equal("0.30000000000000004", (0.1 + 0.2).ToString("R"));
    }

    [Fact]
    public void Decimal_RepresentsThemExactly()
    {
        Assert.Equal(0.3m, 0.1m + 0.2m);
    }

    [Fact]
    public void Double_AccumulatesErrorOverManyOperations()
    {
        double d = 0; decimal m = 0;
        for (int i = 0; i < 1_000_000; i++) { d += 0.01; m += 0.01m; }

        Assert.NotEqual(10_000d, d);        // ❌ xato yig'ildi
        Assert.Equal(10_000m, m);           // ✅ aniq
    }

    [Fact]
    public void Rounding_DiffersBetweenDoubleAndDecimal()
    {
        Assert.Equal(2.67, Math.Round(2.675, 2));    // double  — kutilmagan
        Assert.Equal(2.68m, Math.Round(2.675m, 2));  // decimal — to'g'ri
    }
}
```

## Xotira kartasi

```
Sabab       IEEE 754 asos 2 · 0.1 ikkilikda cheksiz davriy
Oqibat      har amalda mikro-xato → YIG'ILADI
Isbot       0.1 + 0.2 != 0.3 · 1 mln × 0.01 != 10000
double      ilmiy hisob uchun · PUL UCHUN HECH QACHON
decimal     asos 10 · 28–29 raqam · 16 bayt · ~10× sekinroq
long tiyin  eng ishonchli · to'lov API'lari shuni ishlatadi
DB          numeric(19,4) yoki bigint · float/real YO'Q
JS          barcha son double → API'da satr yoki butun tiyin
```

---

# 4.2 · `decimal` ichki tuzilishi, chegaralari, narxi

## Nima va nega

`decimal` — bu "aniqroq `double`" emas, **butunlay boshqa tuzilma**. Uni tushunish
chegaralarini va narxini bilishga yordam beradi.

## Ichki mexanika

```
   decimal = 128 bit

   ┌─┬─────────┬────────────────────────────────────────────────────┐
   │S│  scale  │                  mantissa                          │
   │1│    8    │                     96                             │
   └─┴─────────┴────────────────────────────────────────────────────┘
    │     │                          │
    │     │                          └── butun son: 0 .. 79 228 162 514 264 337 593 543 950 335
    │     └───────────────────────────── 0..28 — o'nglagi kasr xonalar soni
    └──────────────────────────────────── ishora

   Qiymat = (−1)^S × mantissa / 10^scale
                                    ▲
                                    └── ASOS 10 — shuning uchun o'nlik kasrlar aniq
```

**Muhim xususiyat: `decimal` scale'ni "eslab qoladi".**

```csharp
decimal a = 1.0m;
decimal b = 1.00m;
decimal c = 1.000m;

Console.WriteLine(a == b);              // True  — qiymat teng
Console.WriteLine(a.ToString());        // 1.0
Console.WriteLine(b.ToString());        // 1.00   ← scale saqlangan!
Console.WriteLine(c.ToString());        // 1.000

Console.WriteLine(decimal.GetBits(b)[3]);   // scale = 2

// Amaliy oqibat: log va JSON'da har xil ko'rinadi
// 100.00 so'm va 100.0 so'm — bir xil qiymat, boshqa matn
```

Bu ba'zan foydali (valyuta aniqligini saqlaydi), ba'zan chalkashtiradi (test'da
`Assert.Equal("100.00", x.ToString())` sinishi mumkin).

## Chegaralar

| Xususiyat | Qiymat |
|---|---|
| Maksimal | 79 228 162 514 264 337 593 543 950 335 |
| Minimal | −79 228 162 514 264 337 593 543 950 335 |
| Muhim raqamlar | 28–29 |
| Maksimal scale | 28 |
| `MinValue`/`MaxValue` | `decimal.MinValue` / `decimal.MaxValue` |

```csharp
// Overflow — DIQQAT: decimal'da bu SUKUT BO'YICHA xato tashlaydi
decimal big = decimal.MaxValue;
var x = big + 1;                    // ❌ OverflowException

// double'da esa jimgina Infinity bo'ladi:
double d = double.MaxValue * 2;     // ❌ Infinity — xato yo'q, ma'lumot buzildi
```

> Bu `decimal`ning yana bir afzalligi: **xatoni yashirmaydi**.

**Aniqlik yo'qolishi hali ham mumkin:**

```csharp
decimal third = 1m / 3m;
// 0.3333333333333333333333333333  (28 raqam)

Console.WriteLine(third * 3);       // 0.9999999999999999999999999999
Console.WriteLine(third * 3 == 1m); // False!
```

Ya'ni `decimal` **bo'linishni sehrli qilmaydi** — 4.5 ga qarang.

## Narxi — o'lchangan

```
   Nisbiy tezlik (taxminiy, BenchmarkDotNet):

   long     ████                    1×      (bazaviy)
   double   █████                   1.2×
   decimal  ████████████████████████████    ~10–15× sekinroq

   Sabab: decimal apparat darajasida qo'llab-quvvatlanmaydi,
          amallar dasturiy bajariladi.
```

| | `long` (tiyin) | `decimal` |
|---|---|---|
| Tezlik | Eng tez | ~10–15× sekinroq |
| Hajm | 8 bayt | 16 bayt |
| Kasr | Yo'q — o'zingiz boshqarasiz | Bor, 28 xonagacha |
| Overflow | Jimgina o'raladi (`unchecked`) | `OverflowException` |
| Valyuta aniqligi | Qo'lda hisoblanadi | Tabiiy |
| Xatolik ehtimoli | Scale'ni adashtirish | Kamroq |

> **Amaliy xulosa:** to'lov tizimida sekundiga bir necha ming operatsiya bo'ladi —
> `decimal`ning sekinligi **hech qachon** bo'g'iz bo'lmaydi. Bo'g'iz DB va tarmoq.

## DB va serializatsiya

```csharp
// EF Core — precision ANIQ ko'rsatilishi SHART
modelBuilder.Entity<Payment>()
    .Property(p => p.Amount)
    .HasPrecision(19, 4);           // yoki [Precision(19, 4)]

// ❌ Ko'rsatilmasa: ba'zi provayderlarda default decimal(18,2)
//    va qiymat OGOHLANTIRISHSIZ kesiladi
```

```sql
-- PostgreSQL
amount numeric(19,4) NOT NULL     -- decimal
-- yoki
amount_minor bigint NOT NULL      -- tiyin

-- ❌ hech qachon: double precision, real, float
```

```csharp
// System.Text.Json — decimal to'g'ri ishlanadi
{ "amount": 1000.10 }             // decimal'ga to'g'ri o'qiladi

// ❌ Lekin client JS bo'lsa, u yerda bu allaqachon double
// ✅ Xavfsiz variant:
{ "amountMinor": 100010, "currency": "UZS" }
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| EF Core'da precision ko'rsatmaslik | Qiymat jimgina kesiladi |
| DB'da `decimal(18,2)`, kodda 4 xona | Yaxlitlash DB tomonida, kutilmagan |
| `decimal` ni `double` orqali o'tkazish | Aniqlik yo'qoladi va qaytmaydi |
| Scale farqini test'da hisobga olmaslik | `1.0m` va `1.00m` matn sifatida har xil |
| `1m/3m*3 == 1m` deb kutish | `False` — bo'linish baribir aniq emas |

## Fintech konteksti

- **Precision tanlovi:** `numeric(19,4)` — 4 xona kasr ko'p valyuta va oraliq
  hisoblar (komissiya foizi) uchun yetarli, 19 raqam esa katta summalarni qamraydi.
- **Oraliq hisoblarda ko'proq xona:** komissiyani 4 xonada hisoblab, faqat **yakuniy
  natijani** valyuta aniqligiga yaxlitlash.
- `long` (tiyin) tanlansa — **valyuta eksponentini** ham saqlash kerak (4.6).

## Intervyu savollari

**1. `decimal` ichkarida qanday saqlanadi?**

> 128 bit: 1 bit ishora, 8 bit scale (0–28), 96 bit mantissa. Qiymat =
> `mantissa / 10^scale`.
>
> Asos **10** — shuning uchun o'nlik kasrlar aniq ifodalanadi. `double`da asos 2, va
> muammo aynan shundan kelib chiqadi.

**2. `decimal` `double`dan qancha sekin? Bu muammomi?**

> Taxminan 10–15 barobar, chunki u apparat darajasida qo'llab-quvvatlanmaydi —
> amallar dasturiy bajariladi.
>
> To'lov tizimida bu **muammo emas**: sekundiga bir necha ming operatsiya, bo'g'iz esa
> DB va tarmoq. Millionlab hisob-kitob bo'ladigan analitikada esa boshqa yondashuv
> kerak — masalan `long` da tiyin.

**3. `decimal` da aniqlik yo'qolishi mumkinmi?**

> Ha, bo'linishda. `1m/3m*3` — `1m` emas, `0.9999...` beradi, chunki 28 raqamdan
> keyin kesiladi.
>
> Shuning uchun pulda bo'lish **hech qachon** oddiy bo'linish emas — qoldiqni aniq
> boshqarish kerak.

**4. `1.0m` va `1.00m` bir xilmi?**

> Qiymat sifatida teng (`==` rost), lekin `decimal` scale'ni saqlaydi — `ToString()`
> har xil natija beradi.
>
> Bu logda va JSON'da ko'rinadi. Test yozganda qiymatni taqqoslash kerak, matnni emas.

## Deliverable

```csharp
public class DecimalBehaviourTests
{
    [Fact]
    public void Decimal_PreservesScale()
    {
        Assert.Equal(1.0m, 1.00m);                       // qiymat teng
        Assert.NotEqual("1.0", 1.00m.ToString());        // matn har xil
    }

    [Fact]
    public void Decimal_ThrowsOnOverflow_UnlikeDouble()
    {
        Assert.Throws<OverflowException>(() => decimal.MaxValue + 1);
        Assert.True(double.IsInfinity(double.MaxValue * 2));   // jimgina buziladi
    }

    [Fact]
    public void Decimal_StillLosesPrecisionOnDivision()
    {
        Assert.NotEqual(1m, 1m / 3m * 3m);
    }

    [Fact]
    public async Task EfCore_PersistsFullPrecision()
    {
        var p = new Payment { Amount = 1234.5678m };
        db.Add(p); await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var loaded = await db.Payments.FindAsync(p.Id);
        Assert.Equal(1234.5678m, loaded.Amount);    // precision(19,4) bo'lmasa SINADI
    }
}
```

## Xotira kartasi

```
Tuzilish    128 bit: 1 ishora + 8 scale + 96 mantissa
Formula     mantissa / 10^scale — ASOS 10
Diapazon    ±7.9×10^28 · 28–29 muhim raqam
Scale       saqlanadi: 1.0m va 1.00m matn sifatida har xil
Overflow    OverflowException tashlaydi (double jimgina Infinity)
Narxi       ~10–15× sekin · 16 bayt · fintech'da muammo EMAS
Bo'linish   1m/3m*3 != 1m — decimal ham sehrli emas
EF Core     HasPrecision(19,4) ANIQ yozilsin — aks holda kesiladi
```

---

# 4.3 · Minor units va `Money` value object

## Nima va nega

`decimal amount` yakka o'zi **ma'nosiz**: 1000 — bu so'mmi, dollarmi, tiyinmi?
Valyutasiz summa xatoga tayyor.

Ikkinchi muammo: `decimal` bilan ham dasturchi kasrni noto'g'ri boshqarishi mumkin.
**Minor units** yondashuvi buni yo'q qiladi — pul **butun sonda**, eng kichik birlikda
saqlanadi.

```
   1 250,50 so'm  →  125050 tiyin      (exponent 2)
   19.99 USD      →  1999 cent          (exponent 2)
   1000 JPY       →  1000 yen           (exponent 0 — kasr yo'q)
   12.345 BHD     →  12345 fils         (exponent 3)
```

## Valyuta eksponentlari

| Valyuta | Exponent | 1 birlik = |
|---|---|---|
| UZS, JPY, KRW, VND | 0 yoki 2 * | so'm / yen |
| USD, EUR, RUB | 2 | 100 cent |
| BHD, KWD, JOD | 3 | 1000 fils |
| CLF | 4 | — |

`*` — O'zbekistonda tiyin amalda muomalada yo'q, lekin **ichki hisobda** exponent 2
ishlatish oraliq hisoblar (komissiya, ulush) uchun qulay. Bu qaror hujjatlashtirilishi
kerak.

> **Muhim:** eksponentni kodga qattiq yozmang — u valyuta ma'lumotnomasidan olinsin
> (ISO 4217).

## Kod — `Money` value object

```csharp
public readonly record struct Money : IComparable<Money>
{
    public long Minor { get; }          // tiyin/cent — butun son
    public Currency Currency { get; }

    private Money(long minor, Currency currency)
    {
        Minor = minor;
        Currency = currency;
    }

    // ── Yaratish ──────────────────────────────────────────────
    public static Money FromMinor(long minor, Currency c) => new(minor, c);

    public static Money FromMajor(decimal major, Currency c)
    {
        var scaled = major * c.MinorFactor;              // 1000.10 × 100
        if (scaled != decimal.Truncate(scaled))
            throw new ArgumentException(
                $"{major} {c.Code} — {c.Exponent} xonadan ortiq kasr", nameof(major));
        return new((long)scaled, c);
    }

    public decimal ToMajor() => (decimal)Minor / Currency.MinorFactor;

    // ── Amallar ───────────────────────────────────────────────
    public static Money operator +(Money a, Money b) =>
        new(checked(a.Minor + b.Minor), Same(a, b));

    public static Money operator -(Money a, Money b) =>
        new(checked(a.Minor - b.Minor), Same(a, b));

    public static Money operator *(Money a, int factor) =>
        new(checked(a.Minor * factor), a.Currency);

    public static bool operator >(Money a, Money b) => a.Minor > Same(a, b).Minor;
    public static bool operator <(Money a, Money b) => a.Minor < Same(a, b).Minor;

    private static Currency Same(Money a, Money b) =>
        a.Currency == b.Currency
            ? a.Currency
            : throw new InvalidOperationException(
                $"Valyuta mos emas: {a.Currency.Code} va {b.Currency.Code}");

    public int CompareTo(Money other) => Minor.CompareTo(Same(this, other).Minor);

    public bool IsZero     => Minor == 0;
    public bool IsPositive => Minor > 0;

    public override string ToString() =>
        $"{ToMajor().ToString($"N{Currency.Exponent}")} {Currency.Code}";
}

public readonly record struct Currency(string Code, int Exponent)
{
    public static readonly Currency Uzs = new("UZS", 2);
    public static readonly Currency Usd = new("USD", 2);
    public static readonly Currency Jpy = new("JPY", 0);

    public long MinorFactor => (long)Math.Pow(10, Exponent);
}
```

**Nima yutdik:**

```csharp
var a = Money.FromMajor(1000.50m, Currency.Uzs);
var b = Money.FromMajor(19.99m,   Currency.Usd);

var sum = a + b;        // ❌ InvalidOperationException — kompilyatsiya emas,
                        //    lekin ISHLASH paytida darhol ushlanadi

var ok = a + Money.FromMajor(500m, Currency.Uzs);   // ✅ 1500.50 UZS

Money.FromMajor(10.123m, Currency.Uzs);
// ❌ ArgumentException: 2 xonadan ortiq kasr — xato ERTA ushlandi
```

## Doimiylik (persistence)

```csharp
// EF Core — ikki ustunga yoyish
modelBuilder.Entity<Payment>().OwnsOne(p => p.Amount, m => {
    m.Property(x => x.Minor).HasColumnName("amount_minor").IsRequired();
    m.Property(x => x.Currency)
     .HasConversion(c => c.Code, code => Currency.FromCode(code))
     .HasColumnName("currency").HasMaxLength(3).IsRequired();
});
```

```sql
CREATE TABLE payments (
    id            uuid PRIMARY KEY,
    amount_minor  bigint  NOT NULL CHECK (amount_minor > 0),
    currency      char(3) NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);
```

```csharp
// JSON — API chegarasida ochiq va xavfsiz
public record PaymentDto(long AmountMinor, string Currency);
// { "amountMinor": 100050, "currency": "UZS" }
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Summani valyutasiz uzatish | Dollar va so'm aralashadi |
| Eksponentni kodga qattiq yozish (`* 100`) | JPY va BHD buziladi |
| `Money` ni mutable qilish | Tasodifiy o'zgarish, ulashilgan holat |
| `double` bilan `Money` yaratish | Xato boshidayoq kiradi |
| Bir necha ustunga tarqatib, `CHECK` qo'ymaslik | Manfiy summa, bo'sh valyuta |
| Front-end'ga major unit'da `number` uzatish | JS `double` — aniqlik yo'qoladi |

## Fintech konteksti

- **Ledger yozuvlari** — har doim minor unit, valyuta bilan. Bu Δ = 0 tekshiruvini
  butun son arifmetikasiga aylantiradi, ya'ni **mutlaqo aniq**.
- **Tashqi provayder** — Payme/Click/Stripe minor unit kutadi. Konvertatsiya
  chegarasida qilinadi, ichkarida emas.
- **Ko'rsatish** — faqat UI qatlamida `ToMajor()` va valyuta formati qo'llanadi.

## Intervyu savollari

**1. Pulni qanday modellashtirasiz?**

> `Money` value object: **butun son minor unit** + **valyuta**. Immutable, `readonly
> record struct`.
>
> Uch sabab:
> 1. Butun son — yaxlitlash xatosi yo'q, Δ = 0 tekshiruvi aniq.
> 2. Valyuta turga kiritilgan — dollar bilan so'mni qo'shib bo'lmaydi, tizim
>    ruxsat bermaydi.
> 3. Immutable — tasodifiy o'zgarish mumkin emas.
>
> DB'da ikki ustun: `amount_minor bigint` va `currency char(3)`.

**2. Nega `decimal` yetarli emas, minor unit kerak?**

> `decimal` aniqlik muammosini yechadi, lekin **ikkita boshqa muammoni** yechmaydi:
> valyuta yo'qligi va scale'ni dasturchi qo'lda boshqarishi.
>
> Minor unit bilan kasr **umuman yo'q** — bo'lish qoldig'i esa ochiq qaror bo'lib qoladi
> va uni yashirib bo'lmaydi.
>
> Amalda ikkalasi ham ishlatiladi: `decimal` oraliq hisoblarda (komissiya foizi),
> `long` minor esa saqlash va yakuniy natijada.

**3. UZS uchun exponent nechchi?**

> ISO 4217 bo'yicha UZS exponent — 2 (tiyin). Amalda tiyin muomalada yo'q, lekin
> **ichki hisobda** exponent 2 saqlash foydali: komissiya va ulushlarni hisoblashda
> qo'shimcha aniqlik beradi.
>
> Muhimi — bu qaror **hujjatlashtirilsin** va butun tizimda bir xil bo'lsin. Ba'zi joyda
> 0, boshqa joyda 2 bo'lsa — bu 100 barobar xato manbai.

**4. `Money` ni `struct` qilasizmi yoki `class`?**

> `readonly record struct` — kichik (16 bayt), immutable, qiymat semantikasi tabiiy
> (1000 UZS = 1000 UZS), va heap allocation yo'q.
>
> `class` qilsam har summa uchun allocation bo'lardi — ledger'da millionlab obyekt.

## Deliverable

```csharp
public class MoneyTests
{
    [Fact]
    public void Add_SameCurrency_Sums()
    {
        var a = Money.FromMajor(1000.50m, Currency.Uzs);
        var b = Money.FromMajor(499.50m,  Currency.Uzs);
        Assert.Equal(150_000, (a + b).Minor);        // 1500.00 → 150000 tiyin
    }

    [Fact]
    public void Add_DifferentCurrency_Throws()
    {
        var uzs = Money.FromMajor(1000m, Currency.Uzs);
        var usd = Money.FromMajor(10m,   Currency.Usd);
        Assert.Throws<InvalidOperationException>(() => uzs + usd);
    }

    [Theory]
    [InlineData(10.123, "UZS")]        // 2 xona ruxsat
    [InlineData(10.1,   "JPY")]        // 0 xona ruxsat
    public void FromMajor_TooManyDecimals_Throws(decimal amount, string code)
        => Assert.Throws<ArgumentException>(
               () => Money.FromMajor(amount, Currency.FromCode(code)));

    [Fact]
    public void Overflow_Throws_NotWraps()
    {
        var max = Money.FromMinor(long.MaxValue, Currency.Uzs);
        Assert.Throws<OverflowException>(() => max + Money.FromMinor(1, Currency.Uzs));
    }

    [Fact]
    public async Task RoundTrip_ThroughDatabase_Preserved()
    {
        var money = Money.FromMajor(1234.56m, Currency.Uzs);
        db.Add(new Payment { Amount = money });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var loaded = await db.Payments.SingleAsync();
        Assert.Equal(money, loaded.Amount);
    }
}
```

## Xotira kartasi

```
Muammo      decimal yakka o'zi ma'nosiz — valyuta yo'q
Yechim      Money = long Minor + Currency · readonly record struct
Minor       1250.50 so'm → 125050 tiyin · kasr YO'Q
Exponent    UZS/USD=2 · JPY=0 · BHD=3 · ISO 4217 dan olinadi
Himoya      valyuta mos kelmasa → exception · checked → overflow ushlanadi
DB          amount_minor bigint + currency char(3) + CHECK
API         { "amountMinor": 100050, "currency": "UZS" }
Konvertatsiya  faqat CHEGARADA (UI, tashqi API), ichkarida emas
```

---

# 4.4 · Yaxlitlash ⭐

## Nima va nega

Yaxlitlash **texnik detal emas — biznes qarori**. 2.5 ni 2 ga yaxlitlaysizmi yoki 3 ga?
Million tranzaksiyada bu farq real pulga aylanadi, va soliq organi uchun bu masala
qonun bilan belgilangan bo'lishi mumkin.

.NET'ning default'i ko'pchilikni hayron qoldiradi:

```csharp
Math.Round(2.5m);   // 2  ← maktabdagi qoida bo'yicha 3 kutilardi
Math.Round(3.5m);   // 4
Math.Round(4.5m);   // 4  ← yana pastga
```

## Ichki mexanika — nega `ToEven`

```
   AwayFromZero (maktab qoidasi) — 0.5 doim yuqoriga:

   0.5→1  1.5→2  2.5→3  3.5→4  4.5→5
    ▲      ▲      ▲      ▲      ▲
    │      │      │      │      │
    hammasi YUQORIGA → sistematik siljish

   Yig'indi: 0.5+1.5+2.5+3.5+4.5 = 12.5
   Yaxlitlangach:  1+2+3+4+5     = 15      (+2.5 siljish)


   ToEven (banker's rounding) — 0.5 juft tomonga:

   0.5→0  1.5→2  2.5→2  3.5→4  4.5→4
    ▼      ▲      ▼      ▲      ▼
    past  yuqori  past  yuqori  past   → muvozanat

   Yaxlitlangach:  0+2+2+4+4     = 12     (−0.5 siljish)
```

Katta hajmda `ToEven` siljishni nolga yaqinlashtiradi — shuning uchun u moliyaviy
hisobotlarda standart va .NET'da default.

## `MidpointRounding` variantlari

| Rejim | 2.5 | 3.5 | −2.5 | Qachon |
|---|---|---|---|---|
| `ToEven` (default) | 2 | 4 | −2 | Statistik muvozanat, ko'p hisobot |
| `AwayFromZero` | 3 | 4 | −3 | Soliq, ko'p mamlakat qonuni |
| `ToZero` | 2 | 3 | −2 | Kesish (truncate) |
| `ToNegativeInfinity` | 2 | 3 | −3 | Floor |
| `ToPositiveInfinity` | 3 | 4 | −2 | Ceiling |

```csharp
decimal m = 2.5m;
Math.Round(m);                                  // 2   — ToEven
Math.Round(m, MidpointRounding.AwayFromZero);   // 3
Math.Round(2.345m, 2);                          // 2.34
Math.Round(2.355m, 2);                          // 2.36
Math.Round(-2.5m, MidpointRounding.AwayFromZero); // -3
```

## Yaxlitlash **qaysi bosqichda**

Bu — savolning eng chuqur qismi. Natija bosqichga bog'liq:

```
   3 ta to'lov, har biri 1000 so'm, komissiya 2.75%

   ┌─ A: har birini alohida yaxlitlab, keyin qo'shish ────────┐
   │  round(27.50) × 3  =  28 × 3  =  84                      │
   └──────────────────────────────────────────────────────────┘

   ┌─ B: qo'shib, keyin yaxlitlash ───────────────────────────┐
   │  round(27.50 × 3) = round(82.50) = 82                    │
   └──────────────────────────────────────────────────────────┘

                      FARQ: 2 so'm

   1 million tranzaksiyada  →  ~666 000 so'm farq
```

**Qoida:** yaxlitlash **faqat bir marta**, oxirgi bosqichda — pul haqiqatan
harakatlanadigan nuqtada. Oraliq hisoblar to'liq aniqlikda saqlanadi.

```csharp
// ❌ Har qadamda yaxlitlash
decimal fee1 = Math.Round(amount * 0.0275m, 2);
decimal fee2 = Math.Round(fee1 * 1.12m, 2);        // NDS
decimal total = Math.Round(fee2 + fixedFee, 2);    // 3 marta xato kiritildi

// ✅ Oxirida bir marta
decimal exact = amount * 0.0275m * 1.12m + fixedFee;
long charged = ToMinor(exact, Currency.Uzs, MidpointRounding.AwayFromZero);
```

## Kod — markazlashtirilgan yaxlitlash

Yaxlitlash qoidasi **bitta joyda** bo'lishi kerak, aks holda kodning har burchagida
har xil bo'lib ketadi.

```csharp
public static class MoneyRounding
{
    // Butun tizim uchun BITTA qoida. O'zgartirish — biznes qarori.
    public const MidpointRounding Policy = MidpointRounding.AwayFromZero;

    public static Money Round(decimal major, Currency currency) =>
        Money.FromMinor(
            (long)Math.Round(major * currency.MinorFactor, 0, Policy),
            currency);

    /// <summary>Foiz bo'yicha komissiya — oraliqda yaxlitlanmaydi.</summary>
    public static Money Percentage(Money of, decimal percent) =>
        Money.FromMinor(
            (long)Math.Round(of.Minor * percent / 100m, 0, Policy),
            of.Currency);
}
```

```csharp
// Ishlatilishi
var amount = Money.FromMajor(1000m, Currency.Uzs);
var fee    = MoneyRounding.Percentage(amount, 2.75m);   // 27.50 → 2750 tiyin
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `ToEven` default ekanini bilmaslik | 2.5 → 2, kutilmagan natija |
| Har bosqichda yaxlitlash | Xato yig'iladi |
| Kodning har joyida har xil rejim | Bir hisobotda ikki xil natija |
| `(long)(x * 100)` — kesish | 2.999 → 299 (yaxlitlash emas, kesish) |
| `double` da yaxlitlash | 2.675 → 2.67 (4.1) |
| Yaxlitlash qoidasini hujjatlashtirmaslik | Buxgalteriya bilan nizo |

```csharp
// ❌ Kesish — pul yo'qoladi
long minor = (long)(29.999m * 100);        // 2999  (30.00 emas!)

// ✅ Aniq yaxlitlash
long minor = (long)Math.Round(29.999m * 100, 0, MidpointRounding.AwayFromZero);  // 3000
```

## Fintech konteksti

- **Soliq va komissiya** — ko'p yurisdiksiyada `AwayFromZero` talab qilinadi.
  Qoidani buxgalteriya bilan **yozma** kelishing.
- **Foiz hisoblash** (kredit, depozit) — kunlik hisoblanadi va yaxlitlanadi; qoida
  shartnomada yozilgan bo'ladi.
- **Reconciliation** — provayder boshqa yaxlitlash ishlatsa, kunlik farq chiqadi.
  Bu farq **kutilgan** bo'lishi va tolerantlik chegarasi belgilangan bo'lishi kerak.

## Intervyu savollari

**1. `Math.Round(2.5m)` nima qaytaradi?** ⭐

> `2`. Chunki .NET'ning default rejimi `MidpointRounding.ToEven` — banker's rounding.
>
> Sabab: har doim yuqoriga yaxlitlash katta hajmda **sistematik siljish** beradi.
> ToEven yarmini pastga, yarmini yuqoriga yo'naltirib buni muvozanatlaydi.
>
> Ko'pchilik `3` deb kutadi — shuning uchun bu joy xato manbai va uni bilish muhim.

**2. Qaysi yaxlitlash rejimini tanlaysiz?**

> Bu **kod qarori emas, biznes qarori**. Men buxgalteriya yoki mahsulot egasidan
> so'rayman va javobni hujjatlashtiraman.
>
> Amalda: soliq va komissiya ko'pincha `AwayFromZero` talab qiladi, statistik hisobotlar
> `ToEven` bilan qoladi.
>
> Eng muhimi — qoida **bitta joyda** belgilanib, butun tizimda bir xil qo'llanilsin.
> Har servisda har xil bo'lsa, hisobotlar hech qachon mos kelmaydi.

**3. Yaxlitlashni qaysi bosqichda qilasiz?**

> **Faqat bir marta, oxirida** — pul haqiqatan harakatlanadigan nuqtada. Oraliq hisoblar
> to'liq aniqlikda qoladi.
>
> Misol: 1000 so'mdan 2.75% komissiya, 3 ta to'lov. Har birini alohida yaxlitlasangiz 84,
> qo'shib keyin yaxlitlasangiz 82. Million tranzaksiyada bu farq katta summaga aylanadi.

**4. `(long)(amount * 100)` — bu to'g'rimi?**

> Yo'q, bu **kesish** (truncate), yaxlitlash emas. `29.999 * 100 = 2999.9` → `2999`,
> ya'ni 0.01 so'm yo'qoldi.
>
> To'g'risi: `(long)Math.Round(amount * 100, 0, Policy)`.
>
> Bu jimgina xato — test'da 29.99 bilan tekshirsangiz ko'rinmaydi.

## Deliverable

```csharp
public class RoundingTests
{
    [Theory]
    [InlineData(2.5,  2)]   // ToEven — juftga
    [InlineData(3.5,  4)]
    [InlineData(4.5,  4)]
    [InlineData(-2.5, -2)]
    public void Default_IsBankersRounding(decimal input, decimal expected)
        => Assert.Equal(expected, Math.Round(input));

    [Theory]
    [InlineData(2.5,  3)]
    [InlineData(-2.5, -3)]
    public void AwayFromZero_MatchesSchoolRule(decimal input, decimal expected)
        => Assert.Equal(expected, Math.Round(input, MidpointRounding.AwayFromZero));

    [Fact]
    public void RoundingStage_ChangesResult()
    {
        decimal each = 1000m * 0.0275m;                      // 27.50

        var perItem = Math.Round(each, 0, MidpointRounding.AwayFromZero) * 3;   // 84
        var atEnd   = Math.Round(each * 3, 0, MidpointRounding.AwayFromZero);   // 82

        Assert.NotEqual(perItem, atEnd);   // farq REAL — shuning uchun qoida kerak
    }

    [Fact]
    public void Truncation_LosesMoney()
    {
        Assert.Equal(2999, (long)(29.999m * 100));                    // ❌ kesildi
        Assert.Equal(3000, (long)Math.Round(29.999m * 100, 0,
                                 MidpointRounding.AwayFromZero));     // ✅
    }

    [Fact]
    public void BankersRounding_HasLessDrift_OverManySamples()
    {
        decimal[] halves = Enumerable.Range(0, 1000).Select(i => i + 0.5m).ToArray();

        decimal driftEven = halves.Sum(x => Math.Round(x) - x);
        decimal driftAway = halves.Sum(x => Math.Round(x, MidpointRounding.AwayFromZero) - x);

        Assert.True(Math.Abs(driftEven) < Math.Abs(driftAway));
    }
}
```

## Xotira kartasi

```
Default     .NET → MidpointRounding.ToEven (banker's) · 2.5 → 2
Sabab       AwayFromZero katta hajmda sistematik siljish beradi
Variantlar  ToEven · AwayFromZero · ToZero · ToNegative/PositiveInfinity
Qaror       BIZNES qarori, kod qarori emas → hujjatlashtiring
Bosqich     yaxlitlash FAQAT BIR MARTA, oxirida
Markaz      bitta MoneyRounding.Policy — butun tizimda bir xil
Tuzoq       (long)(x*100) = KESISH · Math.Round kerak
double      2.675 → 2.67 — yaxlitlashdan oldin decimal'ga o'ting
```

---

# 4.5 · Bo'lish va qoldiqni taqsimlash

## Nima va nega

100 so'mni 3 kishiga teng bo'ling. Javob 33.33 **emas** — pulda kasr tiyin yo'q.

To'g'ri javob: **33 / 33 / 34**. Va eng muhim savol: **oshgan 1 so'm kimga tegadi?**
Bu tasodif emas, **qaror** bo'lishi kerak.

```
   ❌ Sodda bo'lish:
      100 / 3 = 33 (butun bo'lish)
      33 × 3  = 99
      YO'QOLDI: 1 so'm

   Million marta takrorlansa → ledger Δ ≠ 0 → reconciliation sinadi
```

## Ichki mexanika — largest remainder

Standart yondashuv: butun ulushni hisoblab, qoldiqni **birma-bir** taqsimlash.

```
   1000 so'mni 3 ga bo'lish (exponent 0 uchun soddalashtirilgan):

   base      = 1000 / 3 = 333   (har biriga)
   remainder = 1000 − 333×3 = 1

   Taqsimlash:
   ┌─────────┬────────┬───────────┬─────────┐
   │ ulush   │  base  │ +qoldiq   │  jami   │
   ├─────────┼────────┼───────────┼─────────┤
   │   #1    │  333   │    +1     │   334   │
   │   #2    │  333   │     —     │   333   │
   │   #3    │  333   │     —     │   333   │
   ├─────────┼────────┼───────────┼─────────┤
   │ JAMI    │  999   │    +1     │  1000 ✓ │
   └─────────┴────────┴───────────┴─────────┘

   INVARIANT: sum(ulushlar) == jami   ← har doim tekshiriladi
```

## Kod — teng bo'lish

```csharp
public static class MoneySplit
{
    /// <summary>Teng bo'lish. Qoldiq birinchi ulushlarga qo'shiladi.</summary>
    public static Money[] Equally(Money total, int parts)
    {
        if (parts <= 0) throw new ArgumentOutOfRangeException(nameof(parts));

        long each      = total.Minor / parts;
        long remainder = total.Minor - each * parts;      // 0 .. parts-1

        var result = new Money[parts];
        for (int i = 0; i < parts; i++)
        {
            long minor = each + (i < remainder ? 1 : 0);
            result[i] = Money.FromMinor(minor, total.Currency);
        }

        // Invariant — HAR DOIM tekshiriladi
        Debug.Assert(result.Sum(m => m.Minor) == total.Minor);
        return result;
    }
}
```

**Nisbat bo'yicha bo'lish (largest remainder method):**

```csharp
/// <summary>Vaznlar bo'yicha bo'lish — masalan 50% / 30% / 20%.</summary>
public static Money[] ByWeights(Money total, params decimal[] weights)
{
    decimal sumW = weights.Sum();
    if (sumW <= 0) throw new ArgumentException("Vaznlar yig'indisi musbat bo'lsin");

    var exact  = weights.Select(w => total.Minor * w / sumW).ToArray();
    var floors = exact.Select(e => (long)Math.Floor(e)).ToArray();

    long remainder = total.Minor - floors.Sum();

    // Qoldiq eng katta kasr qismiga ega ulushlarga beriladi — adolatli va barqaror
    var order = Enumerable.Range(0, weights.Length)
                          .OrderByDescending(i => exact[i] - floors[i])
                          .ThenBy(i => i)                    // barqaror tartib
                          .ToArray();

    for (int k = 0; k < remainder; k++) floors[order[k]]++;

    Debug.Assert(floors.Sum() == total.Minor);
    return floors.Select(m => Money.FromMinor(m, total.Currency)).ToArray();
}
```

```csharp
// Misol: 1000.00 so'mni 50/30/20 bo'yicha
var parts = MoneySplit.ByWeights(Money.FromMajor(1000m, Currency.Uzs), 50, 30, 20);
// → 500.00 · 300.00 · 200.00

// Misol: 100.00 so'mni 3 ga
var three = MoneySplit.Equally(Money.FromMajor(100m, Currency.Uzs), 3);
// → 33.34 · 33.33 · 33.33   (tiyinda: 3334 · 3333 · 3333)
```

## Qoldiq kimga — variantlar

| Siyosat | Kim oladi | Qachon |
|---|---|---|
| Birinchi ulushlar | Ro'yxatning boshi | Sodda, bashorat qilinadi |
| Eng katta kasr | Matematik adolatli | Nisbat bo'yicha bo'lishda |
| Merchant / platforma | Tashkilot | Komissiya taqsimotida |
| Tasodifiy | — | ❌ Hech qachon — takrorlanmaydi |

> **Muhim:** siyosat **deterministik** bo'lishi shart. Bir xil kirish har doim bir xil
> natija bersin, aks holda qayta hisoblash va audit imkonsiz.

## Tipik xatolar

| Xato | Natija |
|---|---|
| `total / n` va qoldiqni tashlash | Pul yo'qoladi, Δ ≠ 0 |
| Har ulushni alohida yaxlitlash | Yig'indi jamiga teng bo'lmaydi |
| Qoldiqni tasodifiy berish | Takrorlanmaydi, audit imkonsiz |
| Invariantni tekshirmaslik | Xato ishlab chiqarishda topiladi |
| `decimal` da bo'lib, keyin yaxlitlash | 33.33 × 3 = 99.99 ≠ 100 |
| Manfiy summani bo'lish (refund) | Ishora bilan qoldiq noto'g'ri tarqaladi |

```csharp
// ❌ Klassik xato
decimal each = 100m / 3;                 // 33.333333...
decimal rounded = Math.Round(each, 2);   // 33.33
decimal total = rounded * 3;             // 99.99  ← 0.01 yo'qoldi

// ✅ Butun sonda ishlash + qoldiqni taqsimlash
var parts = MoneySplit.Equally(Money.FromMajor(100m, Currency.Uzs), 3);
Assert.Equal(10_000, parts.Sum(p => p.Minor));   // 100.00 aniq
```

## Fintech konteksti

- **Split payment** — bitta to'lov bir necha merchantga bo'linadi. Qoldiq siyosati
  shartnomada yozilgan bo'lishi kerak.
- **Bo'lib to'lash (installment)** — 1 000 000 so'mni 6 oyga: 5 ta 166 667 va bitta
  166 665. Odatda qoldiq **oxirgi to'lovga** beriladi, chunki mijoz uchun tushunarli.
- **Komissiya taqsimoti** — platforma va bank o'rtasida. Qoldiq odatda platformaga.
- **Refund** — qisman qaytarishda ulushlar **qayta hisoblanmaydi**, asl taqsimotdan
  proporsional olinadi, aks holda qoldiq ikki marta harakatlanadi.

## Intervyu savollari

**1. 100 so'mni 3 ga bo'lsangiz nima qilasiz?** ⭐

> 33 / 33 / 34. Butun bo'lishni bajaraman, qoldiqni hisoblayman va **aniq qoidaga ko'ra**
> taqsimlayman.
>
> Va albatta **tekshiruv** qo'shaman: bo'laklar yig'indisi jamiga teng bo'lishi shart.
> Bu invariant testda ham, ishlab chiqarishda ham tekshiriladi.
>
> Qo'shimcha savol beraman: "qoldiq kimga tegishi kerak?" — bu biznes qarori, va uni
> so'rash tajribani ko'rsatadi.

**2. Nisbat bo'yicha bo'lishda (50/30/20) qanday qilasiz?**

> Largest remainder method: har ulushning aniq qiymatini hisoblab, pastga yaxlitlayman,
> keyin qoldiqni **eng katta kasr qismiga** ega ulushlarga birma-bir beraman.
>
> Bu matematik adolatli va **deterministik** — bir xil kirish har doim bir xil natija
> beradi, ya'ni qayta hisoblash va audit mumkin.

**3. Nima uchun `decimal` da bo'lib, keyin yaxlitlash yetarli emas?**

> Chunki 33.33 × 3 = 99.99 ≠ 100. Har ulushni alohida yaxlitlasangiz, yig'indi jamiga
> teng bo'lmaydi va ledger'da Δ ≠ 0 paydo bo'ladi.
>
> To'g'ri yondashuv: **butun sonda** (minor unit) ishlash va qoldiqni ochiq taqsimlash.

**4. Bo'lib to'lashda qoldiqni qayerga qo'yasiz?**

> Odatda **oxirgi to'lovga** — mijoz uchun tushunarli va kutilgan.
>
> Ba'zi tizimlarda birinchisiga qo'shiladi, chunki pul tezroq olinadi. Bu qaror
> mahsulot egasi bilan kelishiladi va shartnomada aks etadi.
>
> Muhimi: qaysi biri bo'lsa ham — **bitta joyda** belgilangan va o'zgarmas bo'lsin.

## Deliverable

```csharp
public class MoneySplitTests
{
    [Theory]
    [InlineData(100,  3, new long[] { 34, 33, 33 })]
    [InlineData(10,   4, new long[] {  3,  3,  2, 2 })]
    [InlineData(1000, 3, new long[] { 334, 333, 333 })]
    [InlineData(9,    3, new long[] {  3,   3,   3 })]   // qoldiq yo'q
    public void Equally_DistributesRemainder(long total, int parts, long[] expected)
    {
        var result = MoneySplit.Equally(Money.FromMinor(total, Currency.Uzs), parts);
        Assert.Equal(expected, result.Select(m => m.Minor));
    }

    [Property]   // FsCheck — property-based
    public void Equally_AlwaysSumsToTotal(PositiveInt total, PositiveInt parts)
    {
        var money  = Money.FromMinor(total.Get, Currency.Uzs);
        var result = MoneySplit.Equally(money, parts.Get);

        Assert.Equal(total.Get, result.Sum(m => m.Minor));            // INVARIANT
        Assert.True(result.Max(m => m.Minor) - result.Min(m => m.Minor) <= 1);
    }

    [Fact]
    public void ByWeights_SumsToTotal_AndRespectsProportions()
    {
        var parts = MoneySplit.ByWeights(
            Money.FromMinor(100_000, Currency.Uzs), 50, 30, 20);

        Assert.Equal(100_000, parts.Sum(p => p.Minor));
        Assert.Equal(new long[] { 50_000, 30_000, 20_000 },
                     parts.Select(p => p.Minor));
    }

    [Fact]
    public void ByWeights_IsDeterministic()
    {
        var a = MoneySplit.ByWeights(Money.FromMinor(1000, Currency.Uzs), 1, 1, 1);
        var b = MoneySplit.ByWeights(Money.FromMinor(1000, Currency.Uzs), 1, 1, 1);
        Assert.Equal(a, b);      // bir xil kirish → bir xil natija
    }
}
```

## Xotira kartasi

```
Muammo      100/3 → 33.33 EMAS · pulda kasr tiyin yo'q
To'g'ri     33 / 33 / 34 · qoldiq ochiq taqsimlanadi
Algoritm    each = total/n · rem = total − each×n · rem tasini +1
Nisbat      largest remainder: floor + eng katta kasrga qoldiq
INVARIANT   sum(ulushlar) == total → har doim assert
Siyosat     deterministik bo'lsin · tasodifiy HECH QACHON
Fintech     installment → oxirgi to'lovga · split → shartnomada
Tuzoq       decimal'da bo'lib yaxlitlash → 33.33×3 = 99.99
```

---

# 4.6 · Ko'p valyuta va kurs

## Nima va nega

Ko'p valyutali tizimda ikkita tub qoida bor:

1. **Har xil valyutadagi summalarni qo'shib bo'lmaydi** — 100 USD + 1 000 000 UZS
   degan son mavjud emas.
2. **Kurs vaqtga bog'liq** — bugungi kurs bilan o'tgan oydagi operatsiyani qayta
   hisoblash **noto'g'ri**.

Ikkinchisi ko'pincha unutiladi va u eng qimmat xatolardan biri.

## Chizma — hisoblar tuzilishi

```
   ❌ Bitta hisob, aralash valyuta
   ┌────────────────────────────┐
   │  Ali · wallet              │
   │  balance = 1 250 000  ???  │  ← qaysi valyuta? qo'shib bo'lmaydi
   └────────────────────────────┘

   ✅ Har valyuta uchun alohida hisob
   ┌────────────────────────────┐  ┌────────────────────────────┐
   │  Ali · wallet · UZS        │  │  Ali · wallet · USD        │
   │  balance = 1 250 000 tiyin │  │  balance = 10 000 cent     │
   └────────────────────────────┘  └────────────────────────────┘
              │                                  │
              └──────── konvertatsiya ───────────┘
                   (alohida tranzaksiya)
```

## Konvertatsiya — 4 ta yozuv, 2 ta emas

Konvertatsiya oddiy o'tkazma emas: valyuta o'zgargani uchun **har valyuta ichida
balans nolga teng bo'lishi** kerak.

```
   Ali 100 USD ni UZS ga o'giradi. Kurs 12 800. Spread 0.5%.
   Mijozga kurs: 12 736

   ┌──────────────────────────────────────────────────────────────┐
   │  USD kitobida                                                │
   │    DR  Ali · USD wallet            10 000 cent               │
   │    CR  Bank · USD nostro           10 000 cent               │
   │                            Δ(USD) = 0  ✓                     │
   ├──────────────────────────────────────────────────────────────┤
   │  UZS kitobida                                                │
   │    DR  Bank · UZS nostro      127 360 000 tiyin              │
   │    CR  Ali · UZS wallet       127 360 000 tiyin              │
   │                            Δ(UZS) = 0  ✓                     │
   └──────────────────────────────────────────────────────────────┘

   Spread daromadi (0.5% = 640 000 tiyin) alohida yozuv bilan
   FX daromad hisobiga o'tkaziladi.
```

> **Qoida:** Δ = 0 tekshiruvi **har valyuta bo'yicha alohida** bajariladi. Butun
> ledger bo'yicha bitta yig'indi ma'nosiz.

## Kurs muzlatish

```sql
CREATE TABLE fx_rates (
    id          bigserial PRIMARY KEY,
    base_ccy    char(3) NOT NULL,
    quote_ccy   char(3) NOT NULL,
    rate        numeric(18,8) NOT NULL CHECK (rate > 0),
    source      text NOT NULL,              -- CBU, provayder, ichki
    valid_from  timestamptz NOT NULL,
    valid_to    timestamptz,                -- NULL = hozirgi
    UNIQUE (base_ccy, quote_ccy, valid_from)
);

-- Tranzaksiyada kurs MUZLATILADI
CREATE TABLE conversions (
    id            uuid PRIMARY KEY,
    from_minor    bigint  NOT NULL,
    from_ccy      char(3) NOT NULL,
    to_minor      bigint  NOT NULL,
    to_ccy        char(3) NOT NULL,
    rate_used     numeric(18,8) NOT NULL,   -- ← nusxa, havola emas
    rate_id       bigint REFERENCES fx_rates(id),
    occurred_at   timestamptz NOT NULL
);
```

**Nega kurs nusxalanadi, havola emas:**

```
   ❌ Faqat rate_id saqlansa:
      fx_rates jadvali tozalansa yoki tuzatilsa →
      o'tgan operatsiyani QAYTA HISOBLAB bo'lmaydi

   ✅ rate_used ustuni:
      operatsiya o'z-o'zini tushuntiradi, tashqi holatga bog'liq emas
      → audit, reconciliation, nizo hal qilish mumkin
```

## Kod

```csharp
public sealed record ExchangeRate(
    Currency From, Currency To, decimal Rate, DateTimeOffset AsOf);

public static class FxConverter
{
    public static (Money Converted, decimal RateUsed) Convert(
        Money source, ExchangeRate rate, Currency target)
    {
        if (source.Currency != rate.From || target != rate.To)
            throw new InvalidOperationException(
                $"Kurs mos emas: {rate.From.Code}/{rate.To.Code}, " +
                $"kerak: {source.Currency.Code}/{target.Code}");

        // Eksponent farqini hisobga olish: JPY(0) ↔ USD(2)
        decimal majorSource = source.ToMajor();
        decimal majorTarget = majorSource * rate.Rate;

        var converted = MoneyRounding.Round(majorTarget, target);
        return (converted, rate.Rate);
    }
}
```

```csharp
// ❌ Kursni hozir olish — o'tgan operatsiya uchun NOTO'G'RI
var rate = await fxService.GetCurrentRateAsync("USD", "UZS");
var recalculated = FxConverter.Convert(oldPayment.Amount, rate, Currency.Uzs);

// ✅ Saqlangan kursdan foydalanish
var frozen = new ExchangeRate(
    Currency.Usd, Currency.Uzs, oldPayment.RateUsed, oldPayment.OccurredAt);
var exact = FxConverter.Convert(oldPayment.Amount, frozen, Currency.Uzs);
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Bitta hisobda aralash valyuta | Balans ma'nosiz |
| Kursni saqlamaslik | O'tgan operatsiyani qayta hisoblab bo'lmaydi |
| Faqat `rate_id` saqlash | Kurs jadvali o'zgarsa tarix buziladi |
| Δ = 0 ni butun ledger bo'yicha tekshirish | Ma'nosiz — har valyuta alohida |
| Eksponent farqini unutish (JPY ↔ USD) | 100 barobar xato |
| Ikki tomonlama kursni bitta son deb bilish | Sotib olish va sotish kursi har xil |
| Spread'ni alohida yozmaslik | Daromad ko'rinmaydi, hisobot noto'g'ri |

## Fintech konteksti

- **Kurs manbai** — Markaziy bank (rasmiy) yoki provayder (bozor). Ikkalasi ham
  saqlanadi, chunki hisobot rasmiy kursda, operatsiya bozor kursida bo'lishi mumkin.
- **Spread** — bu daromad, va u **alohida ledger hisobida** ko'rinishi kerak,
  konvertatsiya ichida yashirilmasin.
- **Kurs yangilanishi** — eski kurs `valid_to` bilan yopiladi, o'chirilmaydi
  (append-only).
- **Yaxlitlash** — konvertatsiyada har doim aniq yo'nalishda: mijozga zarar
  bermaydigan tomonga emas, **belgilangan qoidaga** ko'ra.

## Intervyu savollari

**1. Ko'p valyutali balansni qanday saqlaysiz?**

> Har valyuta uchun **alohida hisob**. Bitta hisobda aralash valyuta saqlamayman —
> ularni qo'shib bo'lmaydi, va har konvertatsiya alohida operatsiya bo'lishi kerak.
>
> Konvertatsiya — ikki yozuv emas, **to'rtta**: manba valyutada chiqim va nostro'ga
> kirim, maqsad valyutada nostro'dan chiqim va mijozga kirim. Shunda Δ = 0 **har valyuta
> ichida** saqlanadi.

**2. Kursni qayerda saqlaysiz?**

> Ikki joyda. `fx_rates` — kurslar tarixi, `valid_from`/`valid_to` bilan, append-only.
>
> Va eng muhimi — **tranzaksiyaning o'zida** `rate_used` ustuni sifatida. Bu nusxa,
> havola emas.
>
> Sabab: kurs jadvali tuzatilsa yoki tozalansa, o'tgan operatsiyani qayta hisoblab
> bo'lmaydi. Tranzaksiya **o'z-o'zini tushuntirishi** kerak — audit va nizo hal qilish
> uchun.

**3. Δ = 0 tekshiruvini ko'p valyutada qanday qilasiz?**

> **Har valyuta bo'yicha alohida.** Butun ledger bo'yicha bitta yig'indi ma'nosiz,
> chunki USD va UZS ni qo'shib bo'lmaydi.
>
> Kunlik reconciliation har valyuta uchun `SUM(DR) = SUM(CR)` ni tekshiradi va farq
> chiqsa alert beradi.

**4. Konvertatsiyada spread'ni qayerga yozasiz?**

> Alohida daromad hisobiga. Agar spread'ni konvertatsiya ichida "yo'qotsangiz" — Δ ≠ 0
> bo'ladi yoki daromad hisobotda ko'rinmaydi.
>
> To'g'ri yondashuv: mijozga berilgan kurs va bozor kursi farqi **aniq yozuv** sifatida
> FX daromad hisobiga o'tkaziladi.

## Deliverable

```csharp
public class FxTests
{
    [Fact]
    public void Convert_UsesFrozenRate_NotCurrent()
    {
        var atTime = new ExchangeRate(Currency.Usd, Currency.Uzs, 12_736m, Jan1);
        var now    = new ExchangeRate(Currency.Usd, Currency.Uzs, 13_100m, Today);

        var (thenValue, _) = FxConverter.Convert(
            Money.FromMajor(100m, Currency.Usd), atTime, Currency.Uzs);

        Assert.Equal(1_273_600_00L, thenValue.Minor);     // eski kurs bilan
        Assert.NotEqual(
            FxConverter.Convert(Money.FromMajor(100m, Currency.Usd), now, Currency.Uzs)
                       .Converted, thenValue);
    }

    [Fact]
    public void Convert_MismatchedCurrencies_Throws()
    {
        var rate = new ExchangeRate(Currency.Usd, Currency.Uzs, 12_736m, Today);
        Assert.Throws<InvalidOperationException>(() =>
            FxConverter.Convert(Money.FromMajor(100m, Currency.Jpy), rate, Currency.Uzs));
    }

    [Fact]
    public async Task Conversion_KeepsDeltaZero_PerCurrency()
    {
        await Convert(user, from: Money.FromMajor(100m, Currency.Usd),
                            to: Currency.Uzs, rate: 12_736m);

        Assert.Equal(0, await LedgerDelta(Currency.Usd));   // har valyuta ALOHIDA
        Assert.Equal(0, await LedgerDelta(Currency.Uzs));
    }
}
```

## Xotira kartasi

```
Qoida 1     har valyuta uchun ALOHIDA hisob · aralashtirish yo'q
Qoida 2     kurs vaqtga bog'liq → tranzaksiyada MUZLATILADI
Konvertatsiya  4 yozuv: manba DR/CR + maqsad DR/CR
Δ = 0       HAR VALYUTA bo'yicha alohida tekshiriladi
rate_used   nusxa saqlanadi, faqat rate_id YETARLI EMAS
Spread      alohida daromad hisobiga — yashirilmasin
Eksponent   JPY=0, USD=2, BHD=3 — konvertatsiyada hisobga oling
fx_rates    append-only · valid_from/valid_to · o'chirilmaydi
```

---

# 4.7 · Vaqt: UTC va kun chegarasi

## Nima va nega

Vaqt pul kabi — noto'g'ri ishlansa jimgina buziladi. Fintech'da vaqt ikki joyda
kritik: **tranzaksiya vaqti** (audit, tartib) va **kun chegarasi** (hisobot,
reconciliation, limit).

## `DateTime` va `DateTimeOffset`

```
   DateTime                          DateTimeOffset
   ┌──────────────────────┐          ┌──────────────────────────────┐
   │ 2026-08-04 14:30:00  │          │ 2026-08-04 14:30:00 +05:00   │
   │ Kind: Local/Utc/Uns.  │          │        └─ offset ANIQ         │
   └──────────────────────┘          └──────────────────────────────┘
            ▲                                      ▲
            │                                      │
   Kind osongina yo'qoladi              Bir ma'noli lahza
   (JSON, DB, marshalling)              → fintech'da SHU ishlatiladi
```

```csharp
// ❌ Server vaqt zonasiga bog'liq
var now = DateTime.Now;              // qaysi zonada? deploy joyiga bog'liq
var utc = DateTime.UtcNow;           // yaxshiroq, lekin Kind yo'qolishi mumkin

// ✅ Bir ma'noli
var now = DateTimeOffset.UtcNow;
```

## Yozgi vaqt — takrorlanadigan soat

```
   Yozgi vaqtdan qishki vaqtga o'tish (mahalliy vaqt bilan yozilsa):

   02:00 ──┐
   02:30   │  birinchi marta
   02:59 ──┘
   02:00 ──┐
   02:30   │  IKKINCHI marta — bir xil mahalliy vaqt!
   02:59 ──┘
   03:00

   Natija: ikki tranzaksiya bir xil "vaqt"ga tushadi.
           Tartib aniqlanmaydi. Hisobot ikki marta hisoblaydi.

   UTC'da bunday muammo YO'Q — UTC sakramaydi.
```

O'zbekiston yozgi vaqtni ishlatmaydi, lekin tizim boshqa mamlakatga chiqsa yoki
tashqi provayder shunday zonada bo'lsa — muammo darhol paydo bo'ladi.

## Kun chegarasi — reconciliation tuzog'i

```
   "4-avgust kunlik hisoboti" — qaysi oraliq?

   Toshkent (UTC+5):
   ┌─────────────────────────────────────────────────────────┐
   │ 2026-08-04 00:00 +05  →  2026-08-03 19:00 UTC           │
   │ 2026-08-05 00:00 +05  →  2026-08-04 19:00 UTC           │
   └─────────────────────────────────────────────────────────┘

   ❌ Agar job UTC kuni bo'yicha ishlasa:
      00:00–24:00 UTC = Toshkentda 05:00 dan 05:00 gacha
      → 5 soatlik siljish → provayder hisoboti bilan MOS KELMAYDI
```

```csharp
// Biznes kunini aniq hisoblash
public static (DateTimeOffset From, DateTimeOffset To) BusinessDay(
    DateOnly day, TimeZoneInfo zone)
{
    var localStart = day.ToDateTime(TimeOnly.MinValue);
    var offset     = zone.GetUtcOffset(localStart);

    var from = new DateTimeOffset(localStart, offset);
    var to   = from.AddDays(1);
    return (from.ToUniversalTime(), to.ToUniversalTime());
}

// Ishlatilishi
var tz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Tashkent");
var (from, to) = BusinessDay(new DateOnly(2026, 8, 4), tz);

var payments = await db.Payments
    .Where(p => p.OccurredAt >= from && p.OccurredAt < to)   // [from, to) — yarim ochiq
    .ToListAsync();
```

> **Yarim ochiq oraliq** `[from, to)` har doim ishlatiladi. `BETWEEN` yoki `<=`
> chegaradagi yozuvni **ikki kunga** qo'shib yuboradi.

## Vaqtni testda boshqarish

```csharp
// ❌ Test'da vaqtni nazorat qilib bo'lmaydi
public class LimitService {
    public bool IsExceeded() => GetTodayTotal(DateTime.UtcNow) > Limit;
}

// ✅ TimeProvider (.NET 8+) — mock qilinadi
public class LimitService(TimeProvider clock) {
    public bool IsExceeded() => GetTodayTotal(clock.GetUtcNow()) > Limit;
}

// Testda
var clock = new FakeTimeProvider(new DateTimeOffset(2026, 8, 4, 23, 59, 0, TimeSpan.Zero));
var svc = new LimitService(clock);

clock.Advance(TimeSpan.FromMinutes(2));    // yangi kunga o'tdik
Assert.False(svc.IsExceeded());            // limit qayta boshlandi
```

## DB va serializatsiya

```sql
-- PostgreSQL — HAR DOIM timestamptz
occurred_at timestamptz NOT NULL DEFAULT now()

-- ❌ timestamp (without time zone) — zona ma'lumoti yo'qoladi
```

```csharp
// EF Core + Npgsql: DateTimeOffset → timestamptz
modelBuilder.Entity<Payment>()
    .Property(p => p.OccurredAt)
    .HasColumnType("timestamptz");

// JSON — ISO 8601, offset bilan
{ "occurredAt": "2026-08-04T09:30:00+00:00" }
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `DateTime.Now` | Server zonasiga bog'liq, deploy joyi natijani o'zgartiradi |
| `DateTime` + `Kind` ga tayanish | JSON/DB orqali o'tganda `Kind` yo'qoladi |
| DB'da `timestamp` (zonasiz) | Zona ma'lumoti yo'q, tiklab bo'lmaydi |
| `BETWEEN` bilan kun oralig'i | Chegaradagi yozuv ikki kunga tushadi |
| Kun chegarasini UTC'da olish | Mahalliy hisobot bilan 5 soat siljish |
| Vaqtni `static` chaqirish | Test yozib bo'lmaydi |
| Mahalliy vaqtda saqlash | Yozgi vaqtda soat takrorlanadi |

## Fintech konteksti

- **Reconciliation** — provayder hisoboti odatda **mahalliy biznes kuni** bo'yicha
  keladi. Job ham shu chegarani ishlatishi shart.
- **Kunlik limit** — "kun" biznes kuni, UTC kuni emas. Aks holda mijoz 05:00 da
  limitini "qayta tiklangan" deb topadi.
- **Tranzaksiya tartibi** — bir xil millisekundda ikki yozuv bo'lishi mumkin.
  Tartib uchun `(occurred_at, id)` juftligi ishlatiladi, faqat vaqt emas.
- **Kechiktirilgan to'lovlar** — rejalashtirilgan vaqt mijoz zonasida, bajarilish
  vaqti UTC'da saqlanadi.

## Intervyu savollari

**1. Nega `DateTime.Now` emas, `UtcNow`?**

> `DateTime.Now` server vaqt zonasiga bog'liq. Server ko'chsa yoki konteyner boshqa
> zonada ishga tushsa — ma'lumot boshqacha talqin qilinadi.
>
> Bundan tashqari yozgi vaqt qaytishida mahalliy soat **takrorlanadi** — ikki tranzaksiya
> bir xil vaqtga tushadi va tartib aniqlanmaydi.
>
> Qoida: **saqlash va hisoblash UTC'da, ko'rsatish mahalliy vaqtda**. Men
> `DateTimeOffset.UtcNow` ishlataman, chunki u offsetni ham saqlaydi.

**2. `DateTime` va `DateTimeOffset` — qaysi birini tanlaysiz?**

> `DateTimeOffset`. U bir ma'noli lahzani ifodalaydi — offset qiymatning ichida.
>
> `DateTime`da `Kind` xususiyati bor, lekin u JSON serializatsiyasi yoki DB orqali
> o'tganda osongina yo'qoladi, va `Unspecified` bo'lib qoladi — keyin uni to'g'ri
> talqin qilib bo'lmaydi.

**3. Kunlik hisobot chegarasini qanday aniqlaysiz?**

> Biznes kuni **mahalliy zonada** boshlanadi, lekin so'rov UTC'da bajariladi.
>
> Toshkent uchun 4-avgust = `2026-08-03 19:00 UTC` dan `2026-08-04 19:00 UTC` gacha.
> Job UTC kunini ishlatsa — 5 soatlik siljish va provayder hisoboti bilan mos kelmaydi.
>
> Va oraliq har doim **yarim ochiq** `[from, to)` — `BETWEEN` chegaradagi yozuvni ikki
> kunga qo'shadi.

**4. Kodda vaqtni qanday test qilasiz?**

> Vaqtni abstraksiya orqali olaman — .NET 8+ da `TimeProvider`, undan oldin `IClock`.
> Testda `FakeTimeProvider` bilan istalgan lahzani o'rnatib, `Advance()` bilan
> siljitaman.
>
> `DateTime.UtcNow` ni to'g'ridan-to'g'ri chaqirish — kod test qilinmaydigan bo'lib
> qoladi, ayniqsa kun chegarasi va limit mantiqi uchun.

## Deliverable

```csharp
public class TimeTests
{
    [Fact]
    public void BusinessDay_TashkentBoundary_IsShiftedFromUtc()
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Tashkent");
        var (from, to) = BusinessDay(new DateOnly(2026, 8, 4), tz);

        Assert.Equal(new DateTimeOffset(2026, 8, 3, 19, 0, 0, TimeSpan.Zero), from);
        Assert.Equal(new DateTimeOffset(2026, 8, 4, 19, 0, 0, TimeSpan.Zero), to);
    }

    [Fact]
    public async Task DailyReport_ExcludesBoundaryRecordOfNextDay()
    {
        await SeedPayment(at: "2026-08-04T18:59:59Z");   // 4-avgust, Toshkent 23:59
        await SeedPayment(at: "2026-08-04T19:00:00Z");   // 5-avgust, Toshkent 00:00

        var report = await DailyReport(new DateOnly(2026, 8, 4));
        Assert.Single(report.Payments);                  // [from, to) — faqat bittasi
    }

    [Fact]
    public void DailyLimit_ResetsAtLocalMidnight_NotUtc()
    {
        var clock = new FakeTimeProvider(
            new DateTimeOffset(2026, 8, 4, 18, 59, 0, TimeSpan.Zero));   // 23:59 local
        var svc = new LimitService(clock);
        svc.Consume(Money.FromMajor(1_000_000m, Currency.Uzs));
        Assert.True(svc.IsExceeded());

        clock.Advance(TimeSpan.FromMinutes(2));          // 00:01 local
        Assert.False(svc.IsExceeded());                  // limit qayta boshlandi
    }
}
```

## Xotira kartasi

```
Saqlash     DateTimeOffset.UtcNow · DB'da timestamptz
Ko'rsatish  faqat UI qatlamida mahalliy zonaga o'giriladi
DateTime    Kind JSON/DB orqali YO'QOLADI → DateTimeOffset afzal
Yozgi vaqt  mahalliy soat TAKRORLANADI → UTC'da bunday muammo yo'q
Kun         biznes kuni mahalliy zonada · Toshkent = UTC−5 soat siljish
Oraliq      har doim [from, to) — BETWEEN chegarani ikki marta oladi
Test        TimeProvider / IClock · static UtcNow chaqirmaslik
Tartib      (occurred_at, id) — faqat vaqt yetarli emas
```

---

# 4.8 · Komissiya, soliq, chegirma hisoblash tartibi

## Nima va nega

"1000 so'mlik to'lovdan 2% komissiya" — bu jumla **ikki xil** tushunilishi mumkin,
va farq real pul:

```
   ┌─ Exclusive (komissiya ustiga qo'shiladi) ─────────────┐
   │  Mijoz to'laydi:  1000 + 20 = 1020                    │
   │  Merchant oladi:  1000                                │
   └───────────────────────────────────────────────────────┘

   ┌─ Inclusive (komissiya ichidan olinadi) ───────────────┐
   │  Mijoz to'laydi:  1000                                │
   │  Merchant oladi:  1000 − 20 = 980                     │
   └───────────────────────────────────────────────────────┘

   Farq: 40 so'm har tranzaksiyada. Kim to'laydi — SHARTNOMA masalasi.
```

Bu savolni **so'rash** — tajribali muhandis belgisi.

## Amallar tartibi

Bir nechta komponent bo'lganda tartib natijani o'zgartiradi:

```
   Buyurtma: 100 000 so'm · chegirma 10% · komissiya 2% · NDS 12%

   ┌─ A tartib: chegirma → komissiya → NDS ───────────────────────┐
   │  100 000 − 10% = 90 000                                       │
   │  90 000 × 2%   =  1 800   (komissiya)                         │
   │  1 800 × 12%   =    216   (komissiya NDS'i)                   │
   │  Mijoz: 90 000 · Platforma: 1 800 · Byudjet: 216              │
   └───────────────────────────────────────────────────────────────┘

   ┌─ B tartib: komissiya → chegirma → NDS ───────────────────────┐
   │  100 000 × 2%  =  2 000   (komissiya)                         │
   │  2 000 − 10%   =  1 800   yoki 2 000 — chegirma komissiyaga   │
   │                            tegadimi?                          │
   └───────────────────────────────────────────────────────────────┘

   Javob kodda emas — SHARTNOMADA bo'lishi kerak.
```

## Kod — hisob-kitob natijasi

Har komponentni **ochiq** qaytarish — yakuniy summani emas. Shunda ledger yozuvlari
to'g'ri quriladi va hisobot tushunarli bo'ladi.

```csharp
public sealed record ChargeBreakdown(
    Money Gross,        // asl summa
    Money Discount,     // chegirma
    Money Net,          // chegirmadan keyin
    Money Fee,          // komissiya
    Money Tax,          // soliq
    Money CustomerPays, // mijoz to'laydi
    Money MerchantGets) // merchant oladi
{
    public void Validate()
    {
        // INVARIANT: pul yo'qolmasligi kerak
        var check = MerchantGets + Fee + Tax;
        if (check != CustomerPays)
            throw new InvalidOperationException(
                $"Balans buzildi: {CustomerPays} != {check}");
    }
}

public static class PricingCalculator
{
    /// <summary>Inclusive: komissiya mijoz to'lagan summadan olinadi.</summary>
    public static ChargeBreakdown CalculateInclusive(
        Money gross, decimal discountPct, decimal feePct, decimal taxPct)
    {
        // Oraliq hisoblar TO'LIQ aniqlikda — yaxlitlash faqat oxirida
        decimal grossMajor = gross.ToMajor();
        decimal discount   = grossMajor * discountPct / 100m;
        decimal net        = grossMajor - discount;
        decimal fee        = net * feePct / 100m;
        decimal tax        = fee * taxPct / 100m;

        var c = gross.Currency;
        var discountM = MoneyRounding.Round(discount, c);
        var netM      = MoneyRounding.Round(net, c);
        var feeM      = MoneyRounding.Round(fee, c);
        var taxM      = MoneyRounding.Round(tax, c);

        // Merchant ulushi QOLDIQ sifatida — shunda yig'indi doim to'g'ri
        var merchantM = netM - feeM - taxM;

        var result = new ChargeBreakdown(
            gross, discountM, netM, feeM, taxM,
            CustomerPays: netM, MerchantGets: merchantM);

        result.Validate();
        return result;
    }
}
```

> **Asosiy hiyla:** komponentlarni alohida yaxlitlab, **eng katta ulushni qoldiq
> sifatida** hisoblash. Shunda yig'indi har doim aniq to'g'ri keladi va Δ = 0 saqlanadi.

```csharp
// ❌ Hammasini alohida yaxlitlash
var fee      = Round(net * 0.02m);
var tax      = Round(fee * 0.12m);
var merchant = Round(net * 0.98m);        // ← mustaqil yaxlitlandi
// fee + tax + merchant  !=  net   (1-2 tiyin farq)

// ✅ Oxirgisini qoldiq sifatida
var merchant = net - fee - tax;           // yig'indi ANIQ
```

## Ledger yozuvlari

```
   Mijoz 90 000 so'm to'ladi · komissiya 1 800 · NDS 216

   ┌────────────────────────────────────────────────────────┐
   │  DR  Mijoz · wallet              90 000                │
   │  CR  Merchant · wallet           87 984                │
   │  CR  Platforma · komissiya        1 800                │
   │  CR  Byudjet · NDS                  216                │
   ├────────────────────────────────────────────────────────┤
   │  DR jami: 90 000   CR jami: 90 000     Δ = 0  ✓         │
   └────────────────────────────────────────────────────────┘
```

Har komponent **o'z hisobiga** yoziladi — "yo'qolgan pul" degan tushuncha yo'q.

## Tipik xatolar

| Xato | Natija |
|---|---|
| Inclusive/exclusive ni aniqlamaslik | Merchant kutgan summani olmaydi |
| Amallar tartibini kodda hal qilish | Shartnoma bilan mos kelmaydi |
| Har komponentni mustaqil yaxlitlash | Yig'indi mos kelmaydi, Δ ≠ 0 |
| Faqat yakuniy summani qaytarish | Ledger yozuvlarini qurib bo'lmaydi |
| Soliqni komissiyadan emas, jamidan hisoblash | Ortiqcha soliq |
| Chegirma bazasini noaniq qoldirish | Chegirma komissiyaga tegadimi? |

## Fintech konteksti

- **Merchant shartnomasi** komissiya turini, foizini va **kim to'lashini** belgilaydi.
  Kod bu shartnomaning aksi bo'lishi kerak.
- **Soliq** — NDS odatda **komissiyadan** olinadi (bu xizmat haqi), butun summadan
  emas. Bu yurisdiksiyaga bog'liq.
- **Refund** — qaytarishda komissiya ham qaytadimi? Odatda **yo'q** (xizmat
  ko'rsatilgan), lekin bu ham shartnomada.
- Har komponent **alohida ledger hisobi** — hisobot va soliq deklaratsiyasi shundan
  quriladi.

## Intervyu savollari

**1. "1000 so'mdan 2% komissiya" — mijoz qancha to'laydi?**

> Bu savol **noaniq**, va men buni aniqlashtiraman: komissiya inclusive'mi yoki
> exclusive?
>
> Exclusive bo'lsa mijoz 1020 to'laydi, merchant 1000 oladi. Inclusive bo'lsa mijoz
> 1000 to'laydi, merchant 980 oladi.
>
> Farq har tranzaksiyada 40 so'm — million tranzaksiyada jiddiy summa. Bu shartnoma
> masalasi, va uni so'ramasdan kod yozish xato.

**2. Komissiya, chegirma va soliqni qanday tartibda hisoblaysiz?**

> Tartib **biznes qoidasi**, kod qarori emas. Men uni mahsulot egasidan aniqlab,
> hujjatlashtiraman va testga aylantiraman.
>
> Amaliy standart: chegirma → sof summa → komissiya → komissiyadan soliq. Ya'ni NDS
> odatda xizmat haqidan olinadi, butun summadan emas.
>
> Va oraliq hisoblarni **to'liq aniqlikda** saqlab, yaxlitlashni faqat oxirida qilaman.

**3. Komponentlar yig'indisi jamiga teng chiqmasa nima qilasiz?**

> Bu **dizayn xatosi** — har komponentni mustaqil yaxlitlaganda 1-2 tiyin farq chiqadi.
>
> Yechim: eng katta ulushni (odatda merchant summasini) **qoldiq sifatida** hisoblash —
> `merchant = net − fee − tax`. Shunda yig'indi har doim aniq.
>
> Va invariant tekshiruvi qo'shaman: `CustomerPays == MerchantGets + Fee + Tax`,
> aks holda exception.

**4. Hisob-kitob natijasini qanday qaytarasiz?**

> Yakuniy summani emas — **to'liq breakdown**: gross, chegirma, sof summa, komissiya,
> soliq, mijoz to'lovi, merchant ulushi.
>
> Ikki sabab: ledger yozuvlari har komponent uchun alohida quriladi, va mijoz/merchant
> hisobotida "bu pul qayerga ketdi?" savoliga javob bo'lishi kerak.

## Deliverable

```csharp
public class PricingTests
{
    [Fact]
    public void Inclusive_MerchantReceivesLess()
    {
        var r = PricingCalculator.CalculateInclusive(
            Money.FromMajor(1000m, Currency.Uzs),
            discountPct: 0, feePct: 2, taxPct: 0);

        Assert.Equal(100_000, r.CustomerPays.Minor);     // 1000.00
        Assert.Equal( 98_000, r.MerchantGets.Minor);     //  980.00
        Assert.Equal(  2_000, r.Fee.Minor);              //   20.00
    }

    [Theory]
    [InlineData(100_00, 10, 2, 12)]
    [InlineData( 33_33,  7, 3, 12)]      // yaxlitlash chegaralari
    [InlineData(      1, 50, 50, 50)]    // eng kichik summa
    [InlineData(999_999_99, 33, 7, 12)]  // katta summa
    public void Breakdown_AlwaysBalances(
        long grossMinor, decimal disc, decimal fee, decimal tax)
    {
        var r = PricingCalculator.CalculateInclusive(
            Money.FromMinor(grossMinor, Currency.Uzs), disc, fee, tax);

        // INVARIANT — hech qanday tiyin yo'qolmaydi
        Assert.Equal(r.CustomerPays, r.MerchantGets + r.Fee + r.Tax);
    }

    [Fact]
    public void LedgerEntries_SumToZero()
    {
        var r = PricingCalculator.CalculateInclusive(
            Money.FromMajor(90_000m, Currency.Uzs), 0, 2, 12);

        var entries = LedgerBuilder.From(r);
        Assert.Equal(entries.Where(e => e.IsDebit).Sum(e => e.Minor),
                     entries.Where(e => !e.IsDebit).Sum(e => e.Minor));
    }
}
```

## Xotira kartasi

```
Birinchi savol  komissiya INCLUSIVE mi, EXCLUSIVE mi?
Tartib          chegirma → net → komissiya → komissiyadan soliq
Qaror           SHARTNOMADA, kodda emas — so'rash tajriba belgisi
Yaxlitlash      oraliq to'liq aniqlikda · oxirida bir marta
Hiyla           eng katta ulush = QOLDIQ (net − fee − tax)
Invariant       CustomerPays == MerchantGets + Fee + Tax
Qaytarish       to'liq breakdown, yakuniy summa emas
Ledger          har komponent o'z hisobiga → Δ = 0
```

---

# 4.9 · Limitlar

## Nima va nega

Kunlik limit, oylik limit, bitta tranzaksiya chegarasi — bularning hammasi
**invariant**: "sarflangan summa chegaradan oshmasin".

Muammo shundaki, limit tekshiruvi va pul yechilishi **ikki alohida amal** — va
ular orasida parallel so'rov kelishi mumkin. Bu 5.2 dagi **write skew**ning aynan
o'zi.

## Chizma — limit poyga holati

```
   Kunlik limit: 1 000 000. Hozircha sarflangan: 0.
   Ikki parallel to'lov, har biri 600 000.

   vaqt    So'rov A                        So'rov B
   ──────────────────────────────────────────────────────────────
   t1      SELECT SUM(bugungi) → 0
           0 + 600 000 <= 1 000 000  ✓
   t2                                      SELECT SUM(bugungi) → 0
                                           0 + 600 000 <= 1 000 000  ✓
   t3      INSERT to'lov 600 000
   t4                                      INSERT to'lov 600 000
   t5      COMMIT                          COMMIT
   ──────────────────────────────────────────────────────────────

   SARFLANGAN: 1 200 000        LIMIT: 1 000 000
   Ikkala tekshiruv ham "to'g'ri" edi — lekin invariant BUZILDI.
```

Diqqat: bu **lost update emas** — hech kim hech kimning yozuvini bosib o'tmadi.
Ikkalasi ham yangi qator qo'shdi. Shuning uchun `rowversion` bu yerda yordam bermaydi.

## Yechim 1 — limit qatorini qulflash (materializing the conflict)

Invariantni ifodalovchi **aniq qator** yaratamiz va uni qulflaymiz.

```sql
CREATE TABLE daily_limits (
    user_id     uuid    NOT NULL,
    business_day date   NOT NULL,
    currency    char(3) NOT NULL,
    spent_minor bigint  NOT NULL DEFAULT 0 CHECK (spent_minor >= 0),
    limit_minor bigint  NOT NULL,
    PRIMARY KEY (user_id, business_day, currency)
);
```

```sql
BEGIN;
  -- Qator yo'q bo'lsa yaratamiz, bor bo'lsa QULFLAYMIZ
  INSERT INTO daily_limits (user_id, business_day, currency, spent_minor, limit_minor)
  VALUES (@user, @day, @ccy, 0, @limit)
  ON CONFLICT (user_id, business_day, currency) DO NOTHING;

  SELECT spent_minor, limit_minor
  FROM   daily_limits
  WHERE  user_id = @user AND business_day = @day AND currency = @ccy
  FOR UPDATE;                          -- ← B shu yerda KUTADI

  -- Endi tekshiruv xavfsiz
  UPDATE daily_limits
  SET    spent_minor = spent_minor + @amount
  WHERE  user_id = @user AND business_day = @day AND currency = @ccy
    AND  spent_minor + @amount <= limit_minor;
  -- 0 qator → limit oshdi

  -- ... to'lov yozuvlari ...
COMMIT;
```

## Yechim 2 — atomik `UPDATE` (qulfsiz)

Aslida `SELECT ... FOR UPDATE` ham shart emas — shartni `UPDATE` ichiga qo'ysak
kifoya (5.3 dagi bir xil g'oya):

```sql
UPDATE daily_limits
SET    spent_minor = spent_minor + @amount
WHERE  user_id = @user AND business_day = @day AND currency = @ccy
  AND  spent_minor + @amount <= limit_minor;

-- affected = 1 → ruxsat berildi
-- affected = 0 → limit oshdi (yoki qator yo'q)
```

```csharp
public async Task<Result> TryConsumeAsync(Guid userId, Money amount, CancellationToken ct)
{
    var day = BusinessDay.Of(clock.GetUtcNow(), tz);

    await EnsureLimitRowAsync(userId, day, amount.Currency, ct);   // ON CONFLICT DO NOTHING

    var affected = await db.Database.ExecuteSqlInterpolatedAsync($@"
        UPDATE daily_limits
        SET    spent_minor = spent_minor + {amount.Minor}
        WHERE  user_id = {userId}
          AND  business_day = {day}
          AND  currency = {amount.Currency.Code}
          AND  spent_minor + {amount.Minor} <= limit_minor", ct);

    return affected == 1
        ? Result.Ok()
        : Result.Fail("Kunlik limit oshdi");
}
```

> **Muhim:** limit rezervlash va to'lov yozuvi **bitta tranzaksiyada** bo'lishi shart.
> Aks holda limit band qilinib, to'lov esa bajarilmay qolishi mumkin.

## Bekor qilish va qaytarish

```csharp
// To'lov muvaffaqiyatsiz bo'lsa — limitni BO'SHATISH kerak
// Lekin: bu ham idempotent bo'lishi shart, aks holda ikki marta bo'shatiladi

UPDATE daily_limits
SET    spent_minor = spent_minor - @amount
WHERE  user_id = @user AND business_day = @day AND currency = @ccy
  AND  spent_minor >= @amount;         -- CHECK (spent >= 0) ni himoya qiladi
```

```
   To'lov holatiga qarab limit:

   pending    → limit BAND qilingan (rezerv)
   completed  → band qolgan
   failed     → limit BO'SHATILADI
   refunded   → limit bo'shatiladimi? — BIZNES QARORI
                (odatda YO'Q: kun ichida qaytarilgan pul limitni tiklamaydi)
```

## Limit turlari

| Tur | Oyna | Saqlash |
|---|---|---|
| Bitta tranzaksiya | — | Statik konfiguratsiya |
| Kunlik | Biznes kuni | `daily_limits` qatori |
| Oylik | Kalendar oy | `monthly_limits` yoki agregat |
| Sirpanuvchi (24 soat) | Oxirgi 24 soat | Yozuvlar bo'yicha `SUM` + indeks |
| Tezlik (velocity) | 5 daqiqada N ta | Redis / token bucket |

> **Sirpanuvchi oyna** qimmatroq: har tekshiruvda agregat hisoblanadi. Kunlik oyna
> esa oldindan hisoblangan qator bilan tez ishlaydi.

## Tipik xatolar

| Xato | Natija |
|---|---|
| `SELECT SUM(...)` keyin `INSERT` | Write skew — limit oshadi |
| Limit va to'lovni alohida tranzaksiyada | Limit band, to'lov yo'q |
| `rowversion` bilan himoya qilishga urinish | Ishlamaydi — yangi qatorlar qo'shilyapti |
| Kun chegarasini UTC'da olish | Limit noto'g'ri vaqtda qayta boshlanadi (4.7) |
| Bekor qilishni idempotent qilmaslik | Limit ikki marta bo'shatiladi |
| `CHECK (spent >= 0)` qo'ymaslik | Manfiy sarf, keyin cheksiz limit |
| Har valyuta uchun umumiy limit | Valyutalarni qo'shib bo'lmaydi (4.6) |

## Fintech konteksti

- **Regulyator talabi** — ko'p mamlakatda kunlik/oylik limit qonun bilan belgilangan.
  Uni buzish jarima demak.
- **Anti-fraud** — velocity limit (5 daqiqada 10 ta to'lov) odatda Redis'da, chunki
  tez va aniq bo'lishi shart emas.
- **Limit rezervi** — to'lov `pending` bo'lganda limit band qilinadi, `failed` bo'lganda
  bo'shatiladi. Bu saga kompensatsiyasining bir qismi.
- **Reconciliation** — kun oxirida `daily_limits.spent_minor` va real tranzaksiyalar
  yig'indisi solishtiriladi. Farq — bug signali.

## Intervyu savollari

**1. Kunlik limitni qanday tekshirasiz?** ⭐

> Sodda yechim — `SELECT SUM(bugungi to'lovlar)` va taqqoslash — **noto'g'ri**. Bu
> write skew: ikki parallel so'rov ikkalasi ham "limit yetarli" deb topadi va invariant
> buziladi.
>
> Diqqat: bu lost update emas — hech kim hech kimni bosib o'tmadi, ikkalasi ham yangi
> qator qo'shdi. Shuning uchun `rowversion` bu yerda **yordam bermaydi**.
>
> To'g'ri yechim: `daily_limits` qatorini yaratib, uni atomik `UPDATE` bilan
> yangilash — shart `UPDATE` ichida:
> `SET spent = spent + @amt WHERE spent + @amt <= limit`. 0 qator → limit oshdi.
>
> Va limit yangilanishi to'lov yozuvi bilan **bitta tranzaksiyada** bo'lishi shart.

**2. Nega `SELECT SUM` yetarli emas?**

> Chunki tekshiruv va yozish orasida boshqa tranzaksiya kirib, o'z yozuvini qo'shishi
> mumkin. Snapshot isolation'da ham bu qoladi — bu klassik write skew.
>
> Yechim ikkita: invariantni ifodalovchi **qatorni yaratib qulflash**
> (materializing the conflict), yoki `SERIALIZABLE` daraja + retry.
>
> Birinchisi amalda tezroq va bashorat qilinadigan.

**3. To'lov bekor qilinsa limit bo'shatiladimi?**

> To'lov `failed` bo'lsa — ha, limit bo'shatilishi kerak, aks holda mijoz haqsiz
> ravishda cheklanadi.
>
> `refunded` bo'lsa — bu **biznes qarori**, va odatda **yo'q**: kun ichida qaytarilgan
> pul limitni tiklamaydi, chunki limitning maqsadi — kun davomidagi **aylanmani**
> cheklash.
>
> Va bo'shatish **idempotent** bo'lishi shart, aks holda ikki marta bo'shatilib
> `spent_minor` manfiy bo'lib qoladi. Shuning uchun `CHECK (spent_minor >= 0)` ham
> qo'yaman.

**4. Sirpanuvchi oyna (oxirgi 24 soat) limitini qanday qilasiz?**

> Bu qimmatroq — har tekshiruvda oxirgi 24 soatlik yig'indi hisoblanadi, ya'ni
> `(user_id, occurred_at)` indeksi majburiy.
>
> Yuqori yuklamada Redis'da sorted set yoki token bucket ishlatiladi — u tez, lekin
> **aniq emas** va DB bilan sinxronlanmaydi.
>
> Shuning uchun men regulyator talab qiladigan limitni **DB'da**, anti-fraud velocity
> limitini esa **Redis'da** saqlagan bo'lardim: birinchisi aniq bo'lishi shart,
> ikkinchisi tez.

## Deliverable

```csharp
public class DailyLimitTests : IAsyncLifetime
{
    [Fact]
    public async Task NaiveSumCheck_AllowsExceedingLimit()
    {
        await SetLimit(user, 1_000_000_00);

        var results = await Task.WhenAll(
            Task.Run(() => ConsumeNaive(user, 600_000_00)),
            Task.Run(() => ConsumeNaive(user, 600_000_00)));

        Assert.Equal(2, results.Count(r => r.IsSuccess));     // ❌ IKKALASI ham o'tdi
        Assert.Equal(1_200_000_00, await SpentToday(user));   // limit BUZILDI
        // ⚠ Bu test bugni isbotlaydi
    }

    [Fact]
    public async Task AtomicUpdate_RejectsSecondPayment()
    {
        await SetLimit(user, 1_000_000_00);

        var results = await Task.WhenAll(
            Task.Run(() => TryConsume(user, 600_000_00)),
            Task.Run(() => TryConsume(user, 600_000_00)));

        Assert.Equal(1, results.Count(r => r.IsSuccess));     // ✅ aynan bittasi
        Assert.Equal(600_000_00, await SpentToday(user));
    }

    [Fact]
    public async Task Release_IsIdempotent()
    {
        await SetLimit(user, 1_000_000_00);
        await TryConsume(user, 500_000_00);

        await Release(user, paymentId, 500_000_00);
        await Release(user, paymentId, 500_000_00);           // takroriy chaqiruv

        Assert.Equal(0, await SpentToday(user));              // manfiy EMAS
    }

    [Fact]
    public async Task Limit_ResetsAtLocalMidnight()
    {
        clock.Set("2026-08-04T18:59:00Z");                    // Toshkent 23:59
        await TryConsume(user, 1_000_000_00);
        Assert.False((await TryConsume(user, 1_00)).IsSuccess);

        clock.Set("2026-08-04T19:01:00Z");                    // Toshkent 00:01
        Assert.True((await TryConsume(user, 1_00)).IsSuccess);
    }
}
```

## Xotira kartasi

```
Muammo      SELECT SUM → tekshirish → INSERT = WRITE SKEW
Nega        yangi qatorlar qo'shilyapti → rowversion YORDAM BERMAYDI
Yechim      daily_limits qatori + atomik UPDATE shart bilan
SQL         SET spent = spent + @a WHERE spent + @a <= limit → 0 qator = rad
Tranzaksiya limit + to'lov yozuvi BITTA tranzaksiyada
Bo'shatish  failed → bo'shatiladi · refund → biznes qarori (odatda yo'q)
Idempotent  bo'shatish takrorlansa manfiy bo'lmasin → CHECK (spent >= 0)
Kun         biznes kuni, UTC kuni EMAS (4.7)
Velocity    Redis (tez, taxminiy) · regulyator limiti DB (aniq)
```

---

## M4 — yakuniy tekshiruv ro'yxati

Kodsiz, og'zaki javob bera olsangiz — modul yopilgan:

- [ ] Nega `double` pulga yaramaydi — IEEE 754 darajasida tushuntirish
- [ ] `decimal` ichida nima bor va narxi qancha
- [ ] Pulni qanday modellashtirasiz va nega minor unit
- [ ] `Math.Round(2.5m)` nima qaytaradi va **nega**
- [ ] Yaxlitlash qaysi bosqichda qilinadi va nega faqat bir marta
- [ ] 100 so'mni 3 ga bo'lish va qoldiq siyosati
- [ ] Kursni nega tranzaksiyada muzlatasiz
- [ ] Kunlik hisobot chegarasi qayerdan boshlanadi
- [ ] "2% komissiya" — birinchi beriladigan savol qaysi
- [ ] Kunlik limitni tekshirish nega `SELECT SUM` bilan bo'lmaydi

**Deliverable'lar:**

- [ ] `Money` value object + `MoneyTests` (valyuta mos kelmasligi, overflow, round-trip)
- [ ] `RoundingTests` — `ToEven` vs `AwayFromZero`, yaxlitlash bosqichi, kesish tuzog'i
- [ ] `MoneySplitTests` — property-based invariant: `sum(parts) == total`
- [ ] `PricingTests` — breakdown balansi har doim to'g'ri
- [ ] `DailyLimitTests` — write skew isboti + atomik yechim
- [ ] `TimeTests` — biznes kuni chegarasi, limit mahalliy yarim tunda tiklanadi
