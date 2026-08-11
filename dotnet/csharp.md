# M1 · C# tili — chuqur

Har qanday .NET intervyusi shu yerdan boshlanadi. Bu savollarga ikkilanmasdan javob
berish kerak — ular «filtr» savollari: noto'g'ri javob keyingi bosqichga o'tkazmaydi.

| # | Mavzu | P |
|---|---|---|
| [1.1](#11--value-vs-reference-type-) | Value vs reference type, stack/heap, boxing ⭐ | P0 |
| [1.2](#12--string-immutability-va-stringbuilder) | `string` immutability, interning, `StringBuilder` | P1 |
| [1.3](#13--struct-record-va-ref-struct) | `struct`, `readonly struct`, `ref struct`, `record` | P1 |
| [1.4](#14--tenglik-equals-va-gethashcode-) | Tenglik: `Equals`, `GetHashCode` shartnomasi ⭐ | P0 |
| [1.5](#15--null-va-nullable-reference-types) | `null` va nullable reference types | P1 |
| [1.6](#16--generics-va-variantlik) | Generics, constraint, variantlik | P1 |
| [1.7](#17--delegate-event-closure) | Delegate, event, closure tuzog'i | P1 |
| [1.8](#18--idisposable-va-resurs-boshqaruvi-) | `IDisposable`, `using`, finalizer ⭐ | P0 |
| [1.9](#19--exceptionlar-) | Exception'lar ⭐ | P0 |
| [1.10](#110--pattern-matching) | Pattern matching, `switch` expression | P2 |
| [1.11](#111--extension-method-static-partial) | Extension method, `static` konstruktor, `partial` | P2 |
| [1.12](#112--operator-overloading-va-value-object) | Operator overloading va value object | P2 |

---

# 1.1 · Value vs reference type ⭐

## Nima va nega

C#dagi har bir tur ikki oiladan biriga tegishli, va bu **nusxalash semantikasini**
belgilaydi — ya'ni obyektni metodga uzatganda nima bo'lishini.

| Value type | Reference type |
|---|---|
| `struct`, `int`, `decimal`, `bool`, `enum`, `DateTime`, `Guid` | `class`, `string`, massiv, `delegate`, `interface`, `record` |
| Qiymatning **o'zini** saqlaydi | Obyektga **havolani** saqlaydi |
| Nusxalanganda butun qiymat ko'chiriladi | Nusxalanganda faqat havola ko'chiriladi |
| `null` bo'la olmaydi (`Nullable<T>` dan tashqari) | `null` bo'la oladi |

```csharp
struct PointS { public int X; }
class  PointC { public int X; }

var a = new PointS { X = 1 };
var b = a;  b.X = 99;
// a.X = 1     ← nusxa ko'chirildi

var c = new PointC { X = 1 };
var d = c;  d.X = 99;
// c.X = 99    ← bir xil obyekt
```

## Ichki mexanika — stack va heap haqiqati

Ko'p manbada "value type stack'da, reference type heap'da" deb yoziladi. Bu
**soddalashtirilgan va noto'g'ri**. Aniqrog'i: value type **o'zi qayerda e'lon
qilingan bo'lsa, o'sha yerda** yashaydi.

```
   ┌─ STACK ──────────────┐         ┌─ HEAP ─────────────────────┐
   │                      │         │                            │
   │  int n = 42          │         │  ┌──────────────────────┐  │
   │  ┌────────┐          │         │  │ PointC obyekti       │  │
   │  │   42   │          │         │  │  ┌────────┐          │  │
   │  └────────┘          │         │  │  │ X: 99  │ ← int    │  │
   │                      │         │  │  └────────┘   HEAP'da│  │
   │  PointC c            │         │  └──────────────────────┘  │
   │  ┌────────┐          │         │            ▲               │
   │  │ 0x7F.. │──────────┼─────────┼────────────┘               │
   │  └────────┘  havola  │         │                            │
   └──────────────────────┘         └────────────────────────────┘
```

| Holat | Qayerda |
|---|---|
| Metod ichidagi lokal `int` | Stack |
| Class maydoni `int` | **Heap** (obyekt ichida) |
| Massiv elementi `int[]` | **Heap** |
| Closure'ga tushgan lokal o'zgaruvchi | **Heap** (compiler class yaratadi) |
| `async` metod ichidagi lokal (await'dan keyin ishlatilsa) | **Heap** (state machine) |

## Boxing — jimgina sekinlashtiruvchi

Value type `object` yoki interfeysga o'tkazilganda heap'da **yangi obyekt** yaratiladi.

```
   int n = 42;              STACK          HEAP
   object o = n;         ┌─────────┐   ┌──────────────┐
        ▲                │  n: 42  │   │ box: [ 42 ]  │  ← YANGI allocation
        │                ├─────────┤   └──────────────┘
     BOXING              │ o: ptr ─┼──────────▲
                         └─────────┘
```

```csharp
int n = 42;
object o = n;        // boxing   — heap'da yangi obyekt
int m = (int)o;      // unboxing — qaytadan nusxa

// Yashirin boxing — eski kod
ArrayList list = new();
list.Add(42);        // har element boxing

// Generic — boxing yo'q
List<int> ok = new();
ok.Add(42);          // allocation yo'q

// Yashirin boxing — interfeys orqali
IComparable c = 42;              // boxing
void Log(object msg) { }
Log(42);                         // boxing

// string.Format / interpolation — boxing bo'lishi mumkin
string s = $"{42}";              // .NET 6+ da optimallashgan, eski versiyada boxing
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Katta `struct` ni tez-tez uzatish | Har uzatishda to'liq nusxa — `class`dan sekinroq |
| Mutable `struct` | Nusxa o'zgartiriladi, asl qiymat qolib ketadi |
| `struct` ni kolleksiyada indeks orqali o'zgartirish | `list[0].X = 5` — kompilyatsiya xatosi yoki nusxaga yozish |
| Issiq yo'lda boxing | GC bosimi, Gen0 tez-tez ishlaydi |
| `readonly` bo'lmagan `struct` maydoni | Har murojaatda yashirin nusxa (defensive copy) |

```csharp
// ❌ Mutable struct tuzog'i
readonly struct Wrapper { public readonly Point P; }
// wrapper.P.X = 5;   ← nusxaga yoziladi, asl o'zgarmaydi

// ✅ readonly struct — kompilyator nusxalashni oldini oladi
readonly struct Money { public readonly long Minor; }
```

## Fintech konteksti

- `Money` — **`readonly record struct`**: kichik, immutable, qiymat semantikasi
  tabiiy (1000 UZS = 1000 UZS), va ledger'da millionlab obyekt uchun heap allocation
  bo'lmaydi.
- Yuqori throughput'li handler'da boxing'dan qochish — `object` o'rniga generic.
- `decimal` — value type, 16 bayt. Massivda ketma-ket yotadi, bu kesh uchun yaxshi.

## Intervyu savollari

**1. Value type va reference type farqi nima?** ⭐

> Value type qiymatni o'zi saqlaydi va uzatilganda **to'liq nusxalanadi**; reference
> type obyektga havolani saqlaydi va uzatilganda havola nusxalanadi — obyekt bitta
> qoladi.
>
> Amaliy oqibat: value type'ni metodga berib ichida o'zgartirsangiz, chaqiruvchi tomonda
> hech nima o'zgarmaydi. Reference type'da o'zgaradi.
>
> Qo'shimcha: `null` faqat reference type va `Nullable<T>` uchun mumkin.

**2. "Value type stack'da yashaydi" — bu to'g'rimi?**

> Soddalashtirilgan. Aniqrog'i: value type **o'zi qayerda e'lon qilingan bo'lsa,
> o'sha yerda** yashaydi.
>
> Class ichidagi `int` maydon **heap'da**, chunki uni o'rab turgan obyekt heap'da.
> Massiv elementlari ham heap'da. Closure'ga tushgan lokal o'zgaruvchi ham heap'ga
> ko'chadi.
>
> Bu farqni aytish tushunish darajasini ko'rsatadi.

**3. Boxing nima va nega undan qochish kerak?**

> Value type `object` yoki interfeysga o'tkazilganda heap'da yangi obyekt yaratiladi.
> Har boxing = allocation = GC yuki.
>
> Issiq yo'lda (loop, high-throughput handler) bu sezilarli. Generic kolleksiyalar
> boxing qilmaydi, eski `ArrayList` esa har elementda qiladi.
>
> Yashirin boxing manbalari: interfeysga cast, `object` parametr, eski string
> formatlash.

**4. Qachon `struct` ishlatasiz?**

> Uch shart birga bo'lganda: kichik (≈16 bayt), mantiqan bitta qiymat, va immutable.
> Masalan koordinata, pul summasi, identifikator.
>
> Katta `struct` — `class`dan **sekinroq**, chunki har uzatishda to'liq ko'chiriladi.
> Va mutable `struct` — xato manbai: nusxa o'zgartiriladi, asl qolib ketadi.

## Deliverable

```csharp
public class ValueVsReferenceTests
{
    [Fact]
    public void Struct_IsCopiedOnAssignment()
    {
        var a = new PointS { X = 1 };
        var b = a; b.X = 99;
        Assert.Equal(1, a.X);
    }

    [Fact]
    public void Class_SharesReference()
    {
        var a = new PointC { X = 1 };
        var b = a; b.X = 99;
        Assert.Equal(99, a.X);
    }

    [Fact]
    public void Boxing_CreatesNewAllocation()
    {
        int n = 42;
        object first = n, second = n;
        Assert.False(ReferenceEquals(first, second));   // ikkita alohida quti
    }

    [Fact]
    public void GenericList_DoesNotBox()
    {
        var before = GC.GetAllocatedBytesForCurrentThread();
        var list = new List<int>(capacity: 100);
        for (int i = 0; i < 100; i++) list.Add(i);
        var allocated = GC.GetAllocatedBytesForCurrentThread() - before;

        Assert.True(allocated < 1000);   // faqat massiv, 100 ta quti emas
    }
}
```

## Xotira kartasi

```
Value       struct/int/decimal/enum/DateTime · qiymat nusxalanadi · null yo'q
Reference   class/string/array/delegate · havola nusxalanadi · null bor
Stack/heap  "value=stack" NOTO'G'RI → e'lon qilingan joyda yashaydi
            class maydoni int → HEAP · closure lokal → HEAP
Boxing      value → object = heap'da yangi obyekt = GC yuki
Yashirin    interfeysga cast · object parametr · ArrayList
struct      kichik (~16 bayt) + immutable + bitta qiymat → readonly struct
Tuzoq       mutable struct → nusxa o'zgaradi, asl qoladi
```

---

# 1.2 · `string` immutability va StringBuilder

## Nima va nega

`string` — **reference type**, lekin value kabi tuyuladi. Sabab: u **immutable**
(o'zgarmas). Har «o'zgartirish» aslida yangi obyekt yaratadi.

```
   s = "Ali";
   s += " Vali";

   HEAP:
   ┌──────────┐        ┌──────────────┐
   │  "Ali"   │        │ "Ali Vali"   │  ← YANGI obyekt
   └──────────┘        └──────────────┘
        ▲                     ▲
     (endi hech               │
      kim ishlatmaydi)     s ─┘
      → GC yig'adi
```

**Nega immutable qilingan:**

1. **Thread-safety** — bir necha thread bir satrni bemalol o'qiydi.
2. **Interning** — bir xil literal satrlar bitta obyektga ishora qiladi.
3. **Hash barqarorligi** — `Dictionary` kaliti sifatida xavfsiz.

## Interning

```csharp
string a = "salom";
string b = "salom";
Console.WriteLine(ReferenceEquals(a, b));        // True — intern pool

string c = new string("salom".ToCharArray());
Console.WriteLine(ReferenceEquals(a, c));        // False
Console.WriteLine(a == c);                       // True  — == qiymat bo'yicha

string d = string.Intern(c);
Console.WriteLine(ReferenceEquals(a, d));        // True
```

> `==` operatori `string` uchun **qiymat bo'yicha** taqqoslash qilib override
> qilingan — bu C#dagi kam uchraydigan istisno.

## Siklda satr yig'ish — O(n²) tuzoq

```
   ❌ s += x   siklda:

   iteratsiya 1:  "a"           → 1 belgi ko'chiriladi
   iteratsiya 2:  "ab"          → 2 belgi
   iteratsiya 3:  "abc"         → 3 belgi
   ...
   iteratsiya n:                → n belgi
                                ─────────────
                          jami:  n(n+1)/2  → O(n²)

   10 000 iteratsiya → ~50 million belgi ko'chirish + 10 000 allocation
```

```csharp
// ❌ O(n²) — 10 000 ta allocation
string s = "";
for (int i = 0; i < 10_000; i++) s += i;

// ✅ O(n) — bitta o'suvchi bufer
var sb = new StringBuilder();
for (int i = 0; i < 10_000; i++) sb.Append(i);
string result = sb.ToString();

// ✅ Ma'lum kolleksiya uchun eng sodda va tez
string joined = string.Join(", ", items);
```

> **Qachon `StringBuilder` kerak emas:** bir necha marta qo'shish (`a + b + c`) —
> kompilyator uni `string.Concat` ga aylantiradi, bu allaqachon optimal.

## Zamonaviy vositalar

```csharp
// Span — allocation'siz kesish
ReadOnlySpan<char> span = "1000.50 UZS".AsSpan();
var amount = span[..7];              // yangi string YARATILMAYDI

// string.Create — bitta allocation bilan qurish
string masked = string.Create(16, cardNumber, (chars, num) => {
    num.AsSpan(0, 4).CopyTo(chars);
    "********".AsSpan().CopyTo(chars[4..]);
    num.AsSpan(12, 4).CopyTo(chars[12..]);
});

// Solishtirish — madaniyatga bog'liqlikni ANIQ ko'rsating
"a".Equals("A", StringComparison.OrdinalIgnoreCase);      // texnik solishtirish
string.Equals(a, b, StringComparison.Ordinal);            // eng tez
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Siklda `+=` | O(n²) vaqt, ko'p allocation |
| `ToUpper()` bilan solishtirish | Ortiqcha allocation + madaniyat muammosi |
| `StringComparison` ko'rsatmaslik | Turk `i` muammosi, kutilmagan natija |
| Katta satrlarni (>85 KB) yig'ish | LOH'ga tushadi, fragmentatsiya |
| Maxfiy ma'lumotni `string`da saqlash | Immutable — xotiradan o'chirib bo'lmaydi |

```csharp
// ❌ Turk madaniyatida "I".ToLower() → "ı" (nuqtasiz), teng chiqmaydi
if (input.ToLower() == "id") { ... }

// ✅
if (input.Equals("id", StringComparison.OrdinalIgnoreCase)) { ... }
```

## Fintech konteksti

- **Karta raqami va CVV** — `string`da saqlamang: immutable bo'lgani uchun xotiradan
  ishonchli o'chirib bo'lmaydi. `char[]` yoki `SecureString` (eskirgan) o'rniga —
  umuman saqlamaslik, tokenizatsiya.
- **Valyuta kodi** — `Ordinal` solishtirish, madaniyatga bog'liq emas.
- **Log yig'ish** — structured logging ishlatiladi, satr yopishtirish emas.

## Intervyu savollari

**1. `string` reference type bo'lsa, nega o'zgartirib bo'lmaydi?**

> Chunki u **immutable** qilib loyihalangan — thread-safety, interning va hash
> barqarorligi uchun. Har «o'zgartirish» yangi obyekt yaratadi, eskisi GC uchun
> qoladi.
>
> Amaliy oqibat: siklda satr yig'sangiz har iteratsiyada yangi allocation — O(n²).
> `StringBuilder` ishlating.

**2. `==` va `Equals` `string` uchun bir xilmi?**

> `string` uchun `==` operatori **qiymat bo'yicha** taqqoslash qilib override
> qilingan, shuning uchun ular bir xil natija beradi. Bu reference type'lar orasida
> kam uchraydigan istisno.
>
> Lekin `object` sifatida taqqoslasangiz — `(object)a == (object)b` — havola bo'yicha
> taqqoslanadi va natija boshqacha bo'lishi mumkin.

**3. `StringBuilder` qachon kerak emas?**

> Bir necha marta qo'shishda: `a + b + c` — kompilyator uni bitta `string.Concat`
> chaqiruviga aylantiradi, bu allaqachon optimal.
>
> `StringBuilder` **siklda** yoki oldindan noma'lum sondagi qo'shishda kerak. Ma'lum
> kolleksiya uchun esa `string.Join` yanada sodda va tez.

**4. Nima uchun parolni `string`da saqlamaslik kerak?**

> `string` immutable — uni xotiradan ishonchli o'chirib bo'lmaydi, GC qachon
> yig'ishini nazorat qila olmaysiz, va memory dump'da qolib ketishi mumkin.
>
> Fintech'da to'g'ri javob: karta ma'lumotini **umuman saqlamaslik** — tokenizatsiya
> ishlatish, PCI DSS talabi.

## Deliverable

```csharp
public class StringTests
{
    [Fact]
    public void Literals_AreInterned()
        => Assert.True(ReferenceEquals("salom", "salom"));

    [Fact]
    public void Concatenation_CreatesNewInstance()
    {
        string a = "Ali", original = a;
        a += " Vali";
        Assert.Equal("Ali", original);          // eski o'zgarmadi
    }

    [Fact]
    public void StringBuilder_AllocatesFarLess()
    {
        var b1 = GC.GetAllocatedBytesForCurrentThread();
        string s = ""; for (int i = 0; i < 1000; i++) s += "x";
        var naive = GC.GetAllocatedBytesForCurrentThread() - b1;

        var b2 = GC.GetAllocatedBytesForCurrentThread();
        var sb = new StringBuilder(); for (int i = 0; i < 1000; i++) sb.Append('x');
        _ = sb.ToString();
        var builder = GC.GetAllocatedBytesForCurrentThread() - b2;

        Assert.True(builder * 10 < naive);
    }

    [Fact]
    public void OrdinalComparison_IsCultureIndependent()
    {
        var tr = new CultureInfo("tr-TR");
        CultureInfo.CurrentCulture = tr;
        Assert.True("ID".Equals("id", StringComparison.OrdinalIgnoreCase));
    }
}
```

## Xotira kartasi

```
string      reference type · IMMUTABLE · == qiymat bo'yicha (istisno)
Nega        thread-safety · interning · hash barqarorligi
Siklda +=   O(n²) — har iteratsiyada yangi obyekt
Yechim      StringBuilder (sikl) · string.Join (kolleksiya) · a+b+c ok
Solishtirish  StringComparison.Ordinal ANIQ ko'rsating (turk i muammosi)
Span        AsSpan() — kesish allocation'siz
Maxfiy      parol/karta string'da SAQLANMAYDI — o'chirib bo'lmaydi
LOH         >85 KB satr → Large Object Heap → fragmentatsiya
```

---

# 1.3 · `struct`, `record` va `ref struct`

## Nima va nega

C#da endi to'rtta «tur e'lon qilish» varianti bor va ular tez-tez chalkashtiriladi.

```
                    ┌──────────────────────────────────────┐
                    │            TUR TANLASH                │
                    └──────────────────────────────────────┘
                                    │
              ┌─────────────────────┴──────────────────────┐
              ▼                                            ▼
        VALUE TYPE                                  REFERENCE TYPE
      (stack/inline)                                    (heap)
              │                                            │
      ┌───────┴────────┐                          ┌────────┴────────┐
      ▼                ▼                          ▼                 ▼
   struct        record struct                 class          record class
                                                              (= record)
   mutable       qiymat tengligi              mutable       qiymat tengligi
   qo'lda        avtomatik                    havola        avtomatik
   Equals        ToString, with               tengligi      ToString, with
```

| E'lon | Turi | Tenglik | Qachon |
|---|---|---|---|
| `class` | reference | Havola bo'yicha | Domen obyektlari, xizmatlar |
| `record` | reference | **Qiymat bo'yicha** | DTO, event, immutable ma'lumot |
| `struct` | value | Qo'lda yozish kerak | Kichik, tez-tez ishlatiladigan |
| `record struct` | value | **Qiymat bo'yicha** | Kichik value object — `Money` |
| `readonly record struct` | value | Qiymat bo'yicha | **Eng ko'p tavsiya etilgani** |
| `ref struct` | value, faqat stack | — | `Span<T>`, yuqori performans |

## `record` nima beradi

```csharp
public record class Customer(string Name, string Phone);

var a = new Customer("Ali", "+998901234567");
var b = new Customer("Ali", "+998901234567");

a == b;                    // True  — qiymat bo'yicha!
a.ToString();              // Customer { Name = Ali, Phone = +998901234567 }
var c = a with { Phone = "+998900000000" };   // nusxa, bitta maydon o'zgargan
var (name, phone) = a;     // deconstruction
```

Kompilyator avtomatik yozadi: `Equals`, `GetHashCode`, `ToString`, `==`/`!=`,
`with` uchun copy-konstruktor, `Deconstruct`.

## `readonly struct` — nega muhim

```csharp
// ❌ Oddiy struct — har murojaatda YASHIRIN NUSXA
struct Point { public int X; public int Y; }

readonly struct Container { public readonly Point P; }
// container.P.X — compiler defensive copy yaratadi, chunki
// Point'ning metodi holatni o'zgartirishi mumkinligini bilmaydi

// ✅ readonly struct — nusxa kerak emas, compiler kafolatni biladi
readonly struct Money
{
    public readonly long Minor;
    public readonly Currency Currency;
}
```

> Amaliy qoida: **struct yozsangiz — `readonly` qiling.** Aks holda kompilyator
> ehtiyot yuzasidan ortiqcha nusxa yaratadi va performans yutug'i yo'qoladi.

## `ref struct` — faqat stack

```csharp
public ref struct Parser
{
    private ReadOnlySpan<char> _input;   // Span ham ref struct
}
```

Cheklovlar (hammasi bitta sababdan — heap'ga tusha olmaydi):

- Maydon sifatida class ichida saqlab bo'lmaydi
- `object` ga cast qilib bo'lmaydi (boxing yo'q)
- Massivda saqlab bo'lmaydi
- `async` metodda `await` orqali o'tkazib bo'lmaydi
- LINQ / iterator'da ishlatib bo'lmaydi

## Tipik xatolar

| Xato | Natija |
|---|---|
| Katta `struct` (>16–24 bayt) | Nusxalash `class`dan qimmatroq |
| Mutable `struct` | Nusxa o'zgaradi, asl qoladi — jimgina bug |
| `record` ni mutable qilish | Qiymat tengligi ma'nosini yo'qotadi |
| `record` da massiv maydon | `Equals` havolani taqqoslaydi, mazmunni emas |
| `struct`da `readonly` yozmaslik | Yashirin defensive copy'lar |

```csharp
// ❌ record ichida massiv — tenglik kutilgandek ishlamaydi
public record Order(string Id, string[] Items);
new Order("1", ["a"]) == new Order("1", ["a"]);   // False! (massiv havolasi)

// ✅ immutable kolleksiya + aniq taqqoslash
public record Order(string Id, ImmutableArray<string> Items)
{
    public virtual bool Equals(Order? o) =>
        o is not null && Id == o.Id && Items.SequenceEqual(o.Items);
}
```

## Fintech konteksti

```csharp
// Pul — kichik, immutable, qiymat semantikasi
public readonly record struct Money(long Minor, Currency Currency);

// Domen hodisasi — immutable, qiymat tengligi qulay
public record PaymentCompleted(Guid PaymentId, Money Amount, DateTimeOffset At);

// Agregat — o'zgaruvchan holat, identifikatsiya ID bo'yicha
public class Account { public Guid Id { get; } /* ... */ }
```

## Intervyu savollari

**1. `record` va `class` farqi nima?**

> `record` — bu `class` (sukut bo'yicha reference type), lekin kompilyator unga
> **qiymat semantikasini** qo'shadi: `Equals`, `GetHashCode`, `ToString`, `==`,
> `with` ifodasi va deconstruction avtomatik yoziladi.
>
> Ishlatiladi: DTO, domen hodisalari, immutable ma'lumot. Xulq-atvorga ega domen
> obyektlari uchun esa oddiy `class` to'g'riroq.

**2. `record struct` qachon kerak?**

> Kichik, immutable, qiymat semantikasi tabiiy bo'lgan turlar uchun — masalan
> `Money`, koordinata, identifikator.
>
> `readonly record struct` — eng yaxshi kombinatsiya: heap allocation yo'q, qiymat
> tengligi bor, va kompilyator defensive copy yaratmaydi.

**3. `ref struct` nega kerak va cheklovlari nima?**

> U **hech qachon heap'ga tushmaydi** — bu `Span<T>` uchun asos. Shuning uchun
> allocation'siz xotira bilan ishlash mumkin.
>
> Cheklovlar hammasi shu sababdan: class maydoni bo'la olmaydi, boxing mumkin emas,
> massivda saqlanmaydi, `async` metodda `await` orqali o'tmaydi, LINQ'da ishlamaydi.

**4. `record` ichida massiv bo'lsa nima bo'ladi?**

> Kompilyator yozgan `Equals` har maydonni `EqualityComparer<T>.Default` bilan
> taqqoslaydi, massiv uchun bu **havola** taqqoslash — mazmuni bir xil ikki massiv
> teng chiqmaydi.
>
> Yechim: `ImmutableArray<T>` ishlatish va `Equals` ni qo'lda yozish, yoki mazmunni
> taqqoslaydigan comparer berish. Bu — `record`ga ishonib qo'yiladigan jimgina bug.

## Deliverable

```csharp
public class TypeKindTests
{
    [Fact]
    public void Record_ComparesByValue()
        => Assert.Equal(new Customer("Ali", "+998"), new Customer("Ali", "+998"));

    [Fact]
    public void Class_ComparesByReference()
        => Assert.NotEqual(new PointC { X = 1 }, new PointC { X = 1 });

    [Fact]
    public void With_CreatesModifiedCopy()
    {
        var a = new Customer("Ali", "+998901111111");
        var b = a with { Phone = "+998902222222" };
        Assert.Equal("Ali", b.Name);
        Assert.NotEqual(a.Phone, b.Phone);
    }

    [Fact]
    public void Record_WithArray_BreaksValueEquality()
    {
        var a = new NaiveOrder("1", new[] { "x" });
        var b = new NaiveOrder("1", new[] { "x" });
        Assert.NotEqual(a, b);      // ⚠ kutilmagan, lekin shunday
    }

    [Fact]
    public void ReadonlyRecordStruct_DoesNotAllocate()
    {
        var before = GC.GetAllocatedBytesForCurrentThread();
        Money total = default;
        for (int i = 0; i < 1000; i++)
            total = new Money(total.Minor + i, Currency.Uzs);
        Assert.Equal(0, GC.GetAllocatedBytesForCurrentThread() - before);
    }
}
```

## Xotira kartasi

```
class          reference · havola tengligi · xulq-atvorli domen obyektlari
record         reference · QIYMAT tengligi · with · DTO, event
struct         value · qo'lda Equals · kichik va tez-tez
record struct  value + qiymat tengligi
readonly rs    ENG TAVSIYA — allocation yo'q, defensive copy yo'q
ref struct     faqat stack · Span<T> asosi · async/LINQ/massivda ishlamaydi
Qoida          struct yozsang → readonly qil
Tuzoq          record ichida massiv → Equals havolani taqqoslaydi
```

---

# 1.4 · Tenglik: `Equals` va `GetHashCode` ⭐

## Nima va nega

C#da «tenglik» to'rt xil yo'l bilan aniqlanadi va ular **bir-biriga mos kelishi**
kerak. Mos kelmasa — `Dictionary` va `HashSet` **jimgina noto'g'ri** ishlaydi.

| Mexanizm | Kim ishlatadi |
|---|---|
| `Object.Equals(object)` | Umumiy, eski API |
| `IEquatable<T>.Equals(T)` | Generic kolleksiyalar — boxing yo'q |
| `GetHashCode()` | `Dictionary`, `HashSet`, `GroupBy`, `Distinct` |
| `==` operatori | Kompilyatsiya vaqtida bog'lanadi |

## Ichki mexanika — `Dictionary` ichida nima bo'ladi

```
   dict[key] = value:

   1. hash = key.GetHashCode()
                │
   2. bucket = hash % bucketCount
                │
                ▼
      ┌──────────────────────────────────┐
      │ bucket 3:  [entry] → [entry] →  │  ← zanjir (kolliziya)
      └──────────────────────────────────┘
                │
   3. zanjirdagi har element uchun:  key.Equals(entry.Key)
                │
                ▼
      topildi → yangilanadi
      topilmadi → qo'shiladi

   ⚠ Agar GetHashCode har xil bo'lsa → BOSHQA bucket'ga tushadi
     → Equals umuman chaqirilmaydi → element "yo'qoladi"
```

## Shartnoma

```
   1. a.Equals(a)                      → true          (refleksivlik)
   2. a.Equals(b) == b.Equals(a)                       (simmetriya)
   3. a.Equals(b) && b.Equals(c) → a.Equals(c)         (tranzitivlik)
   4. a.Equals(b)  ⟹  a.GetHashCode() == b.GetHashCode()   ← ENG MUHIM
   5. Teskarisi shart EMAS: hash teng bo'lsa ham obyektlar har xil bo'lishi mumkin
   6. Obyekt o'zgarmaguncha hash o'zgarmasin
```

## Kod

```csharp
public sealed class AccountNumber : IEquatable<AccountNumber>
{
    public string Value { get; }
    public AccountNumber(string value) => Value = value;

    public bool Equals(AccountNumber? other) =>
        other is not null &&
        string.Equals(Value, other.Value, StringComparison.Ordinal);

    public override bool Equals(object? obj) => Equals(obj as AccountNumber);

    public override int GetHashCode() =>
        StringComparer.Ordinal.GetHashCode(Value);

    public static bool operator ==(AccountNumber? a, AccountNumber? b) =>
        a is null ? b is null : a.Equals(b);

    public static bool operator !=(AccountNumber? a, AccountNumber? b) => !(a == b);
}
```

**Ko'p maydon bo'lsa — `HashCode.Combine`:**

```csharp
public override int GetHashCode() => HashCode.Combine(Bank, Branch, Number);
// ❌ Qo'lda: Bank.GetHashCode() ^ Branch.GetHashCode()
//    XOR — kommutativ, ya'ni (A,B) va (B,A) bir xil hash beradi
```

**`record` bularning hammasini o'zi yozadi** — shuning uchun value object'lar
uchun `record` afzal.

## Tipik xatolar

| Xato | Natija |
|---|---|
| Faqat `Equals` ni override qilish | `Dictionary` elementni topa olmaydi |
| Faqat `GetHashCode` ni override qilish | Kolliziyada noto'g'ri element qaytadi |
| Mutable maydonni hash'ga kiritish | Obyekt o'zgarsa kolleksiyadan «yo'qoladi» |
| XOR bilan hash birlashtirish | `(A,B)` va `(B,A)` bir xil hash |
| Hash sifatida random son | Har chaqiruvda boshqa — kolleksiya buziladi |
| `IEquatable<T>` yozmaslik | Generic kolleksiyalarda boxing |

```csharp
// ❌ Mutable kalit — eng jimgina bug
var dict = new Dictionary<MutableKey, string>();
var key = new MutableKey { Id = 1 };
dict[key] = "qiymat";

key.Id = 2;                        // hash o'zgardi!
dict.TryGetValue(key, out _);      // False — element "yo'qoldi"
dict.Count;                        // 1 — lekin unga yeta olmaysiz
```

## Fintech konteksti

- **`Money`** — `readonly record struct`, tenglik avtomatik va to'g'ri.
- **Idempotency kaliti, hisob raqami, tranzaksiya ID** — value object sifatida
  modellashtirilsa, tasodifan bir-biri bilan almashtirib bo'lmaydi.
- **Kalitni immutable qilish** — DB'dan yuklangan entity'ni `HashSet`ga qo'yib,
  keyin ID sini o'zgartirsangiz — kolleksiya buziladi.

## Intervyu savollari

**1. `GetHashCode` va `Equals` nega birga override qilinadi?** ⭐

> Hash jadval avval hash bo'yicha bucket topadi, keyin `Equals` bilan aniqlaydi.
> Faqat bittasini override qilsangiz shartnoma buziladi.
>
> Aniq stsenariy: `Equals` ni yozdingiz, `GetHashCode` ni yo'q. Ikki teng obyekt
> **har xil hash** beradi → har xil bucket'ga tushadi → `Equals` umuman chaqirilmaydi
> → `dictionary.TryGetValue` topa olmaydi.
>
> Qoida: teng obyektlarning hash'i **albatta** teng bo'lishi kerak; teskarisi shart emas.

**2. Hash kodni qanday hisoblaysiz?**

> `HashCode.Combine(field1, field2, ...)` — .NET o'zi taqdim etadi, tartibni hisobga
> oladi va yaxshi taqsimot beradi.
>
> Qo'lda XOR bilan birlashtirish xato: XOR kommutativ, ya'ni `(A, B)` va `(B, A)`
> bir xil hash beradi va kolliziya ko'payadi.
>
> Va faqat **immutable** maydonlarni kiriting.

**3. Mutable obyektni `Dictionary` kaliti qilsa nima bo'ladi?**

> Kalitning hash'i o'zgarsa, element **eski bucket'da qolib ketadi** va unga yeta
> olmaysiz. `Count` uni ko'rsatadi, lekin `TryGetValue` topmaydi — bu eng jimgina
> buglardan biri.
>
> Shuning uchun kalitlar immutable bo'lishi kerak: `string`, `Guid`, yoki
> `readonly record struct`.

**4. `==` va `Equals` farqi nima?**

> `==` — operator, **kompilyatsiya vaqtida** statik turga qarab bog'lanadi.
> `Equals` — virtual metod, **ishlash vaqtida** haqiqiy turga qarab chaqiriladi.
>
> Amaliy oqibat: obyekt `object` sifatida saqlangan bo'lsa, `==` reference
> taqqoslashga tushadi, `Equals` esa sizning implementatsiyangizni chaqiradi.
>
> Shuning uchun `==` ni override qilsangiz, `Equals` bilan **mos** qiling.

## Deliverable

```csharp
public class EqualityTests
{
    [Fact]
    public void EqualObjects_HaveEqualHashCodes()
    {
        var a = new AccountNumber("UZ12-3456");
        var b = new AccountNumber("UZ12-3456");

        Assert.True(a.Equals(b));
        Assert.Equal(a.GetHashCode(), b.GetHashCode());   // SHARTNOMA
    }

    [Fact]
    public void WorksAsDictionaryKey()
    {
        var dict = new Dictionary<AccountNumber, decimal>
            { [new AccountNumber("UZ12")] = 1000m };

        Assert.True(dict.TryGetValue(new AccountNumber("UZ12"), out var value));
        Assert.Equal(1000m, value);
    }

    [Fact]
    public void HashCombine_IsOrderSensitive()
    {
        Assert.NotEqual(HashCode.Combine("A", "B"), HashCode.Combine("B", "A"));
        Assert.Equal("A".GetHashCode() ^ "B".GetHashCode(),
                     "B".GetHashCode() ^ "A".GetHashCode());   // XOR — muammo
    }

    [Fact]
    public void MutableKey_BreaksDictionary()
    {
        var key = new MutableKey { Id = 1 };
        var dict = new Dictionary<MutableKey, string> { [key] = "v" };

        key.Id = 2;
        Assert.False(dict.TryGetValue(key, out _));   // "yo'qoldi"
        Assert.Single(dict);                          // lekin ichida turibdi
    }
}
```

## Xotira kartasi

```
Shartnoma     teng obyektlar → hash HAM TENG (teskarisi shart emas)
Dictionary    hash → bucket → Equals → topish
Buzilsa       har xil bucket → Equals chaqirilmaydi → element "yo'qoladi"
Combine       HashCode.Combine(...) · XOR ISHLATMANG (kommutativ)
IEquatable<T> generic kolleksiyalarda boxing'ni oldini oladi
Mutable kalit hash o'zgaradi → element yetib bo'lmaydigan bo'ladi
==            kompilyatsiya vaqtida · Equals — ishlash vaqtida virtual
record        hammasini o'zi to'g'ri yozadi → value object uchun afzal
```

---

# 1.5 · `null` va nullable reference types

## Nima va nega

`NullReferenceException` — .NET tarixidagi eng ko'p uchraydigan xato. C# 8 dan beri
kompilyator uni **kompilyatsiya vaqtida** ushlashga yordam beradi.

```csharp
#nullable enable

string  name;      // null BO'LMASLIGI kerak — kompilyator ogohlantiradi
string? phone;     // null bo'lishi MUMKIN — ishlatishdan oldin tekshiring
```

> **Muhim:** bu faqat **kompilyator tekshiruvi**. Ishlash vaqtida hech qanday
> himoya qo'shilmaydi — `string` maydoniga reflection yoki eski kutubxona orqali
> `null` kelib tushishi mumkin.

## Operatorlar

```csharp
// ?.  — null-conditional
int? length = customer?.Name?.Length;          // biri null bo'lsa — null

// ??  — null-coalescing
string display = customer?.Name ?? "Noma'lum";

// ??= — null bo'lsa tayinlash
_cache ??= new Dictionary<string, decimal>();

// !   — null-forgiving: "men bilaman, bu null emas"
var name = customer!.Name;    // ⚠ kompilyatorni SUSTIRASIZ — dalilingiz bo'lsin

// is not null — eng ishonchli tekshiruv
if (customer is not null) { ... }
```

> `!= null` va `is not null` farqi: `!=` operatori override qilingan bo'lishi mumkin,
> `is not null` esa **har doim** haqiqiy null tekshiruvini qiladi.

## Argument tekshiruvi

```csharp
public void Process(Payment payment)
{
    ArgumentNullException.ThrowIfNull(payment);          // .NET 6+
    // ...
}

// Konstruktorda
public PaymentService(IRepository repo) =>
    _repo = repo ?? throw new ArgumentNullException(nameof(repo));
```

## Null obyekt o'rniga alternativalar

```
   Metod natija qaytara olmasa — nima qaytaradi?

   ┌────────────────┬──────────────────────────────────────────┐
   │ null           │ Chaqiruvchi tekshirishni UNUTADI         │
   │ Exception      │ Kutilgan holat uchun QIMMAT              │
   │ Result<T>      │ Xato SABABI bilan — eng ochiq            │
   │ Option/Maybe   │ Yo'qlik turda ko'rinadi                  │
   │ Bo'sh kolleksiya│ Kolleksiya uchun HAR DOIM shu           │
   └────────────────┴──────────────────────────────────────────┘
```

```csharp
// ❌ Kolleksiya uchun null qaytarish
public List<Payment>? GetPayments() => found ? list : null;

// ✅ Bo'sh kolleksiya — chaqiruvchi tekshirmasa ham ishlaydi
public IReadOnlyList<Payment> GetPayments() => list ?? [];

// ✅ Biznes natijasi uchun Result
public Result<Payment> Charge(Money amount) =>
    balance < amount
        ? Result.Fail<Payment>("Mablag' yetarli emas")
        : Result.Ok(new Payment(amount));
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `!` operatorini ko'p ishlatish | Kompilyator himoyasi o'chadi, NRE qaytadi |
| `#nullable` ni yoqmaslik | Butun mexanizm ishlamaydi |
| Kolleksiya uchun `null` qaytarish | Har chaqiruv joyida tekshiruv kerak bo'ladi |
| DTO'da hamma maydonni `?` qilish | Ma'no yo'qoladi — «hammasi bo'lmasligi mumkin» |
| Nullable annotatsiyasiga **ishonch** | Bu compile-time, runtime himoya emas |
| `== null` ni override qilingan operatorda | Kutilmagan xatti-harakat |

## Fintech konteksti

- **Nullable balans yo'q.** Hisob mavjud bo'lsa balansi ham bor — `Money?` emas,
  `Money`. Hisob topilmasa — `Result` yoki exception.
- **Tashqi API javobi** — har doim `?` bilan belgilanadi va tekshiriladi; provayder
  hujjatda va'da qilgan maydonni yubormasligi mumkin.
- **DB'dan kelgan `NULL`** — domen modelda ochiq ifodalansin: `DateTimeOffset?
  CancelledAt` — «bekor qilinmagan» ma'nosini beradi.

## Intervyu savollari

**1. Nullable reference types ishlash vaqtida himoya beradimi?**

> Yo'q. Bu faqat **kompilyator tahlili** — annotatsiyalar metadata sifatida
> saqlanadi, lekin CLR hech qanday tekshiruv qo'shmaydi.
>
> `null` baribir kelib tushishi mumkin: reflection orqali, `#nullable` yoqilmagan
> kutubxonadan, JSON deserializatsiyasidan.
>
> Shuning uchun ommaviy API chegarasida `ArgumentNullException.ThrowIfNull` baribir
> yoziladi.

**2. `!= null` va `is not null` farqi bormi?**

> Ha. `!=` operatori tur uchun override qilingan bo'lishi mumkin va kutilmagan
> mantiqni bajarishi mumkin. `is not null` esa **har doim** haqiqiy null tekshiruvini
> qiladi va uni o'zgartirib bo'lmaydi.
>
> Shuning uchun `is not null` xavfsizroq.

**3. Metod natija topa olmasa nima qaytaradi?**

> Kontekstga qarab:
> - **Kolleksiya** — har doim bo'sh kolleksiya, hech qachon `null`.
> - **Bitta obyekt, yo'qligi normal** — `T?` yoki `TryGet` naqshi.
> - **Biznes qoidasi buzilgan** — `Result<T>` xato sababi bilan.
> - **Kutilmagan holat** — exception.
>
> Fintech'da men `Result<T>` ni afzal ko'raman: «mablag' yetarli emas» — bu kutilgan
> natija, exception emas, va sababi chaqiruvchiga ochiq ko'rinadi.

**4. `!` operatorini qachon ishlatasiz?**

> Kamdan-kam va **dalil bilan**: kompilyator ko'ra olmaydigan, lekin men bilgan
> holatda. Masalan `TryGetValue` dan keyin, yoki tekshiruv boshqa metodga
> chiqarilgan bo'lsa.
>
> Har `!` — kompilyator himoyasini o'chirish. Kodni ko'rib chiqishda ular alohida
> e'tibor talab qiladi.

## Deliverable

```csharp
public class NullabilityTests
{
    [Fact]
    public void GetPayments_ReturnsEmpty_NotNull()
        => Assert.Empty(service.GetPayments(unknownUserId));

    [Fact]
    public void Constructor_RejectsNullDependency()
        => Assert.Throws<ArgumentNullException>(() => new PaymentService(null!));

    [Fact]
    public void InsufficientFunds_ReturnsFailure_NotException()
    {
        var result = account.Charge(Money.FromMajor(1_000_000m, Currency.Uzs));

        Assert.False(result.IsSuccess);
        Assert.Equal("Mablag' yetarli emas", result.Error);
    }
}
```

## Xotira kartasi

```
#nullable     C# 8+ · faqat KOMPILYATOR tahlili, runtime himoya YO'Q
?             null bo'lishi mumkin · ?. ?? ??= operatorlari
!             null-forgiving — himoyani o'chiradi, dalil bilan ishlating
is not null   != null dan xavfsizroq (operator override qilinmagan)
Argument      ArgumentNullException.ThrowIfNull(x)  (.NET 6+)
Kolleksiya    HECH QACHON null — bo'sh kolleksiya qaytaring
Biznes natija Result<T> — "mablag' yetmadi" exception EMAS
Fintech       Money? emas Money · tashqi API javobi har doim ?
```

---

# 1.6 · Generics va variantlik

## Nima va nega

Generics ikki muammoni birdan hal qiladi: **tur xavfsizligi** va **boxing'siz
ishlash**.

```csharp
// ❌ Generics'gacha
ArrayList list = new();
list.Add(42);                    // boxing
int n = (int)list[0];            // unboxing + runtime cast xavfi
list.Add("matn");                // ruxsat beriladi! xato faqat ishlashda chiqadi

// ✅ Generic
List<int> ok = new();
ok.Add(42);                      // boxing yo'q
int m = ok[0];                   // cast kerak emas
// ok.Add("matn");               // KOMPILYATSIYA xatosi
```

## Ichki mexanika — reified generics

.NET'da generic'lar **runtime darajasida** mavjud (Java'dagi «type erasure» emas).

```
   List<int>        →  JIT alohida mashina kodi generatsiya qiladi
                       (value type uchun ixtisoslashgan, boxing yo'q)

   List<string>  ┐
   List<Account> ├─→  bitta umumiy kod (hammasi havola — bir xil o'lcham)
   List<Payment> ┘
```

Shuning uchun `typeof(List<int>) != typeof(List<string>)`, va reflection generic
argumentni ko'ra oladi.

## Constraint'lar

```csharp
where T : class              // reference type
where T : struct             // value type
where T : notnull            // null bo'lmasin
where T : new()              // parametrsiz konstruktor bor
where T : BaseClass          // meros
where T : IComparable<T>     // interfeys
where T : Enum               // enum
where T : IParsable<T>       // static abstract a'zolar (C# 11+)
```

```csharp
// Amaliy misol — repository
public interface IRepository<TEntity, TId>
    where TEntity : class, IEntity<TId>
    where TId : notnull
{
    Task<TEntity?> FindAsync(TId id, CancellationToken ct = default);
}

// C# 11 — generic matematika
public static T Sum<T>(IEnumerable<T> items) where T : INumber<T>
{
    T total = T.Zero;
    foreach (var i in items) total += i;
    return total;
}
```

## Variantlik — `in` va `out`

```
   COVARIANT (out)  — chiqish uchun, "kengroqqa" o'tadi
   ┌──────────────────────────────────────────────────┐
   │  IEnumerable<Dog>  →  IEnumerable<Animal>   ✓     │
   │  Har it — hayvon, demak itlar ro'yxatini          │
   │  hayvonlar ro'yxati sifatida O'QISH xavfsiz       │
   └──────────────────────────────────────────────────┘

   CONTRAVARIANT (in) — kirish uchun, "torroqqa" o'tadi
   ┌──────────────────────────────────────────────────┐
   │  IComparer<Animal>  →  IComparer<Dog>       ✓     │
   │  Hayvonlarni solishtira olsa, itlarni ham         │
   │  solishtira oladi                                 │
   └──────────────────────────────────────────────────┘

   INVARIANT — ikkalasi ham bo'lsa
   ┌──────────────────────────────────────────────────┐
   │  List<Dog>  →  List<Animal>                 ✗     │
   │  Sabab: List'ga YOZISH ham mumkin —               │
   │  hayvonlar ro'yxatiga mushuk qo'shib bo'lardi     │
   └──────────────────────────────────────────────────┘
```

```csharp
public interface IProducer<out T> { T Get(); }        // faqat qaytaradi
public interface IConsumer<in T>  { void Set(T x); }  // faqat qabul qiladi

IEnumerable<string> strings = new List<string>();
IEnumerable<object> objects = strings;                // ✓ covariant

Action<object> logAny = o => Console.WriteLine(o);
Action<string> logStr = logAny;                       // ✓ contravariant
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `List<Derived>` ni `List<Base>` ga berish | Kompilyatsiya xatosi — invariant |
| Massiv kovariantligiga tayanish | `Animal[] a = new Dog[1]; a[0] = new Cat();` → runtime xato |
| Ortiqcha generic parametr | Kod o'qilmaydi, tur inferensiyasi ishlamaydi |
| `where T : new()` bilan qimmat obyekt yaratish | Yashirin allocation |
| Generic metodda `typeof(T)` bo'yicha `switch` | Ko'pincha dizayn muammosi belgisi |

```csharp
// ⚠ Massiv kovariantligi — C#dagi eski xato
Animal[] animals = new Dog[1];    // kompilyator ruxsat beradi
animals[0] = new Cat();           // ArrayTypeMismatchException — ISHLASH vaqtida
```

## Fintech konteksti

```csharp
// Turli valyutalarni turda ajratish
public readonly record struct Money<TCurrency> where TCurrency : ICurrency
{
    public long Minor { get; init; }
}
// Money<Uzs> + Money<Usd> — KOMPILYATSIYA xatosi

// Result — xato sababi bilan
public readonly struct Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
}
```

## Intervyu savollari

**1. Generics nima beradi?**

> Ikki narsa: **tur xavfsizligi** (xato kompilyatsiyada chiqadi, ishlashda emas)
> va **performans** (value type uchun boxing yo'q).
>
> .NET'da generic'lar runtime darajasida saqlanadi — Java'dan farqli o'laroq type
> erasure yo'q. Shuning uchun `List<int>` uchun JIT ixtisoslashgan kod
> generatsiya qiladi.

**2. Kovariantlik va kontravariantlik nima?**

> **Kovariantlik (`out`)** — turni «kengroq»ga o'zgartirish, faqat **chiqish**
> pozitsiyasida xavfsiz: `IEnumerable<Dog>` → `IEnumerable<Animal>`.
>
> **Kontravariantlik (`in`)** — «torroq»ga, faqat **kirish** pozitsiyasida:
> `IComparer<Animal>` → `IComparer<Dog>`.
>
> `List<T>` invariant, chunki unga ham yoziladi, ham o'qiladi — kovariant bo'lsa
> hayvonlar ro'yxatiga mushuk qo'shib bo'lardi.

**3. `where T : new()` qachon kerak?**

> Generic metod ichida `new T()` yozish uchun. Lekin bu yashirin allocation va
> parametrsiz konstruktor talabini keltirib chiqaradi.
>
> Ko'pincha yaxshiroq alternativa — factory delegat (`Func<T>`) uzatish: bu
> moslashuvchan va konstruktorga bog'lanmaydi.

**4. Massiv kovariantligi nega xavfli?**

> C# massivlarga kovariantlikka ruxsat beradi (Java bilan moslik uchun), lekin
> massiv **mutable** — shuning uchun bu tur xavfsizligini buzadi:
> `Animal[] a = new Dog[1]; a[0] = new Cat();` kompilyatsiyadan o'tadi, lekin
> ishlash vaqtida `ArrayTypeMismatchException` beradi.
>
> Shuning uchun zamonaviy kodda `IReadOnlyList<T>` afzal — u to'g'ri kovariant.

## Deliverable

```csharp
public class GenericsTests
{
    [Fact]
    public void Covariance_AllowsWideningOnRead()
    {
        IEnumerable<string> strings = new List<string> { "a" };
        IEnumerable<object> objects = strings;     // covariant
        Assert.Single(objects);
    }

    [Fact]
    public void Contravariance_AllowsNarrowingOnWrite()
    {
        Action<object> any = _ => { };
        Action<string> str = any;                  // contravariant
        str("test");
    }

    [Fact]
    public void ArrayCovariance_FailsAtRuntime()
    {
        Animal[] animals = new Dog[1];
        Assert.Throws<ArrayTypeMismatchException>(() => animals[0] = new Cat());
    }

    [Fact]
    public void TypedCurrency_PreventsMixingAtCompileTime()
    {
        var uzs = new Money<Uzs> { Minor = 100 };
        // var bad = uzs + new Money<Usd> { Minor = 1 };   // kompilyatsiya xatosi
        Assert.Equal(100, uzs.Minor);
    }
}
```

## Xotira kartasi

```
Foyda        tur xavfsizligi + boxing yo'q
.NET         reified generics — runtime'da tur saqlanadi (Java'da erasure)
JIT          value type uchun ixtisoslashgan kod, reference uchun umumiy
Constraint   class · struct · notnull · new() · interfeys · Enum · INumber<T>
out          KOVARIANT — faqat chiqish · IEnumerable<Dog> → <Animal>
in           KONTRAVARIANT — faqat kirish · IComparer<Animal> → <Dog>
List<T>      INVARIANT — o'qish ham, yozish ham bor
Tuzoq        massiv kovariant → ArrayTypeMismatchException ishlash vaqtida
```

---

# 1.7 · Delegate, event, closure

## Nima va nega

Delegate — **metodga havola**. U funksiyani ma'lumot sifatida uzatish imkonini beradi:
callback, strategiya, hodisa.

```csharp
// Delegate turi
public delegate decimal FeeCalculator(Money amount);

// Tayyor generic turlar — amalda deyarli har doim shular
Func<Money, decimal> calc = m => m.ToMajor() * 0.02m;   // qaytaradi
Action<string> log = msg => Console.WriteLine(msg);      // qaytarmaydi
Predicate<Payment> isLarge = p => p.Amount.Minor > 1_000_000;
```

## Multicast va uning tuzog'i

Delegate **zanjir** bo'lishi mumkin — bir necha metod ketma-ket chaqiriladi.

```
   Action a = M1;
   a += M2;
   a += M3;
   a();

   ┌────┐   ┌────┐   ┌────┐
   │ M1 │──►│ M2 │──►│ M3 │
   └────┘   └────┘   └────┘
              ✗ exception
                 │
                 └── M3 CHAQIRILMAYDI, exception yuqoriga ketadi
```

```csharp
// Func zanjirida faqat OXIRGI natija qaytadi — qolganlari yo'qoladi
Func<int> f = () => 1;
f += () => 2;
Console.WriteLine(f());        // 2 — birinchisi bajarildi, natijasi tashlandi
```

## Event — himoyalangan delegate

```csharp
public class PaymentProcessor
{
    public event EventHandler<PaymentCompletedEventArgs>? Completed;

    protected virtual void OnCompleted(Payment p)
    {
        // ✅ Lokal nusxa — race condition'dan himoya
        var handler = Completed;
        handler?.Invoke(this, new PaymentCompletedEventArgs(p));

        // yoki qisqacha:
        Completed?.Invoke(this, new(p));
    }
}
```

`event` kalit so'zi tashqaridan quyidagilarni **taqiqlaydi**:

- `processor.Completed = null;` — butun zanjirni o'chirish
- `processor.Completed.Invoke(...)` — tashqaridan chaqirish

Faqat `+=` va `-=` ruxsat etiladi.

## Closure — eng ko'p uchraydigan tuzoq

Lambda tashqi o'zgaruvchini **qiymat bo'yicha emas, havola bo'yicha** ushlaydi.
Kompilyator yashirin class yaratadi va o'zgaruvchini **heap'ga** ko'chiradi.

```
   for (int i = 0; i < 3; i++)
       actions.Add(() => Console.Write(i));

   Kompilyator quradi:
   ┌────────────────────────────┐
   │ class Closure {            │
   │     public int i;          │  ← BITTA umumiy o'zgaruvchi
   │ }                          │
   └────────────────────────────┘
        ▲        ▲        ▲
        │        │        │
     lambda1  lambda2  lambda3     ← hammasi bir joyga qaraydi

   Sikl tugaganda i = 3  →  natija: "333"  ❌
```

```csharp
// ❌ C# 5 gacha bo'lgan klassik xato (for uchun HALI HAM amal qiladi)
var actions = new List<Action>();
for (int i = 0; i < 3; i++)
    actions.Add(() => Console.Write(i));
actions.ForEach(a => a());        // 333

// ✅ Lokal nusxa
for (int i = 0; i < 3; i++) {
    int copy = i;
    actions.Add(() => Console.Write(copy));   // 012
}

// ✅ foreach — C# 5 dan beri har iteratsiyada yangi o'zgaruvchi
foreach (var x in new[] { 0, 1, 2 })
    actions.Add(() => Console.Write(x));      // 012
```

## Xotira sizishi — event orqali

```
   ┌──────────────────┐             ┌──────────────────┐
   │  Publisher       │             │  Subscriber      │
   │  (uzoq yashaydi) │  event      │  (qisqa umr)     │
   │                  │  havolasi   │                  │
   │  Completed ──────┼────────────►│  OnCompleted     │
   └──────────────────┘             └──────────────────┘
                                             ▲
   Subscriber "o'lishi" kerak edi,           │
   lekin publisher unga havola ushlab turibdi ┘
   → GC uni yig'a olmaydi → XOTIRA SIZISHI
```

```csharp
// ✅ Obuna bekor qilinishi shart
public class Widget : IDisposable
{
    public Widget(PaymentProcessor p) { _p = p; _p.Completed += OnCompleted; }
    public void Dispose() => _p.Completed -= OnCompleted;
}
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `for` siklida lambda'da sikl o'zgaruvchisi | Hamma lambda oxirgi qiymatni ko'radi |
| Event obunasini bekor qilmaslik | Xotira sizishi |
| `event` o'rniga ochiq `delegate` maydon | Tashqaridan `null` qilib yuboriladi |
| Multicast `Func` natijasiga tayanish | Faqat oxirgisi qaytadi |
| Handler'da exception | Zanjirning qolgani bajarilmaydi |
| Uzoq yashovchi closure'da katta obyekt | U ham yashab qoladi |

## Fintech konteksti

- **Domen hodisalari uchun C# `event` ishlatilmaydi.** Sabab: sinxron, jarayon
  ichida, tranzaksiya chegarasidan chiqmaydi, va handler'dagi xato asosiy oqimni
  buzadi. O'rniga — **outbox + broker**.
- `Func<>` — strategiya naqshi uchun qulay: komissiya hisoblash qoidasi, retry
  siyosati.
- `IProgress<T>` — uzoq operatsiya (fayl yuklash, reconciliation) holatini xabar
  qilish.

## Intervyu savollari

**1. `delegate` va `event` farqi nima?**

> `event` — bu delegate maydon ustidagi **himoya qatlami**. Tashqi kod faqat `+=`
> va `-=` qila oladi; butun zanjirni `null` qilib yuborish yoki tashqaridan chaqirish
> mumkin emas.
>
> Ya'ni `event` — inkapsulyatsiya: hodisani **kim e'lon qilishini** sinf o'zi
> nazorat qiladi.

**2. Closure nima va qanday tuzoq beradi?**

> Lambda tashqi o'zgaruvchini **havola bo'yicha** ushlaydi — kompilyator yashirin
> class yaratib, o'zgaruvchini heap'ga ko'chiradi.
>
> Klassik tuzoq: `for` siklida yaratilgan lambda'lar **bitta** o'zgaruvchiga qaraydi,
> shuning uchun hammasi oxirgi qiymatni ko'radi. Yechim — sikl ichida lokal nusxa.
>
> `foreach` da C# 5 dan beri har iteratsiyada yangi o'zgaruvchi yaratiladi, shuning
> uchun u xavfsiz.

**3. Event xotira sizishiga qanday olib keladi?**

> Publisher subscriber'ning metodiga havola ushlab turadi. Subscriber ishlatilmasa
> ham GC uni yig'a olmaydi, chunki uzoq yashovchi publisher'dan havola bor.
>
> Yechim: `-=` bilan obunani bekor qilish (odatda `Dispose` da), yoki weak event
> naqshi.

**4. Domen hodisalari uchun C# `event` ishlatasizmi?**

> Yo'q. `event` — sinxron, jarayon ichida ishlaydi va tranzaksiya chegarasidan
> chiqmaydi. Handler'dagi xato asosiy biznes oqimini buzadi.
>
> Fintech'da men domen hodisalarini **outbox** orqali yuboraman: ular biznes
> o'zgarishi bilan bitta tranzaksiyada yoziladi va alohida relay orqali brokerga
> uzatiladi.

## Deliverable

```csharp
public class DelegateTests
{
    [Fact]
    public void ForLoop_ClosureCapturesSharedVariable()
    {
        var actions = new List<Func<int>>();
        for (int i = 0; i < 3; i++) actions.Add(() => i);
        Assert.Equal(new[] { 3, 3, 3 }, actions.Select(a => a()));
    }

    [Fact]
    public void LocalCopy_FixesClosure()
    {
        var actions = new List<Func<int>>();
        for (int i = 0; i < 3; i++) { int copy = i; actions.Add(() => copy); }
        Assert.Equal(new[] { 0, 1, 2 }, actions.Select(a => a()));
    }

    [Fact]
    public void MulticastFunc_ReturnsOnlyLastResult()
    {
        Func<int> f = () => 1;
        f += () => 2;
        Assert.Equal(2, f());
    }

    [Fact]
    public void Unsubscribing_AllowsCollection()
    {
        var processor = new PaymentProcessor();
        var reference = CreateAndDisposeWidget(processor);

        GC.Collect(); GC.WaitForPendingFinalizers();
        Assert.False(reference.IsAlive);      // Dispose obunani bekor qilgan
    }
}
```

## Xotira kartasi

```
delegate     metodga havola · Func/Action/Predicate — amalda shular
event        delegate ustidan himoya: faqat += va -= tashqaridan
Multicast    zanjir · Func'da FAQAT OXIRGI natija qaytadi
             handler'da exception → qolgani bajarilmaydi
Closure      havola bo'yicha ushlaydi · compiler class yaratadi → HEAP
Tuzoq        for siklida lambda → hammasi oxirgi qiymatni ko'radi
             yechim: lokal nusxa · foreach C# 5+ da xavfsiz
Sizish       publisher subscriber'ni ushlab qoladi → Dispose'da -=
Fintech      domen hodisasi uchun event EMAS → outbox + broker
```

---

# 1.8 · `IDisposable` va resurs boshqaruvi ⭐

## Nima va nega

GC **boshqariladigan xotirani** avtomatik tozalaydi. Lekin u bilmaydigan resurslar
bor: fayl deskriptorlari, tarmoq soketlari, DB ulanishlari, native xotira.

`IDisposable` — bu resurslarni **aniq vaqtda** bo'shatish shartnomasi.

```
   ┌─────────────────────────────────────────────────────┐
   │  GC boshqaradi          │  GC bilmaydi              │
   ├─────────────────────────┼───────────────────────────┤
   │  obyekt xotirasi        │  fayl deskriptori         │
   │  massivlar              │  DB ulanishi              │
   │  satrlar                │  soket                    │
   │                         │  native xotira (malloc)   │
   │                         │  mutex, semafor           │
   └─────────────────────────┴───────────────────────────┘
                                        │
                                        ▼
                                  IDisposable
```

## `using` — kompilyator nima qiladi

```csharp
using var conn = new NpgsqlConnection(cs);
await conn.OpenAsync();

// Kompilyator buni shunday yozadi:
NpgsqlConnection conn = new(cs);
try { await conn.OpenAsync(); /* ... */ }
finally { conn?.Dispose(); }      // exception bo'lsa ham bajariladi
```

```csharp
// Async resurslar uchun
await using var conn = new NpgsqlConnection(cs);       // DisposeAsync
```

## Dispose naqshi

Zamonaviy kodda **finalizer yozilmaydi** — u faqat native resurs to'g'ridan-to'g'ri
ushlangan holatda kerak, va u ham `SafeHandle` bilan yechiladi.

```csharp
// ✅ Oddiy holat — 95% kodda shu yetadi
public sealed class PaymentClient : IDisposable
{
    private readonly HttpClient _http;
    private bool _disposed;

    public void Dispose()
    {
        if (_disposed) return;      // idempotent bo'lishi SHART
        _http.Dispose();
        _disposed = true;
    }
}
```

```csharp
// Meros olinishi mumkin bo'lgan sinf uchun to'liq naqsh
public class Resource : IDisposable
{
    private bool _disposed;

    public void Dispose()
    {
        Dispose(disposing: true);
        GC.SuppressFinalize(this);      // finalizer navbatidan chiqarish
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;
        if (disposing) { /* boshqariladigan resurslar */ }
        /* native resurslar */
        _disposed = true;
    }
}
```

## Finalizer nega qimmat

```
   Finalizer'siz obyekt:
   Gen0 → yig'iladi → tugadi                        (1 sikl)

   Finalizer'li obyekt:
   Gen0 → finalization queue'ga tushadi
        → alohida thread finalizer'ni chaqiradi
        → keyingi GC siklida yig'iladi              (2+ sikl, Gen1'ga ko'tariladi)

   ⚠ Finalizer qachon chaqirilishi KAFOLATLANMAGAN.
     Ilova to'xtaganda umuman chaqirilmasligi mumkin.
```

## Klassik xatolar

```csharp
// ❌ HttpClient ni har so'rovda yaratish va Dispose qilish
using var http = new HttpClient();     // socket exhaustion!
// Dispose qilingan soket TIME_WAIT holatida 4 daqiqagacha qoladi
// → port tugaydi → SocketException

// ✅ IHttpClientFactory
public class PaymentClient(IHttpClientFactory factory)
{
    public async Task SendAsync() {
        var http = factory.CreateClient("provider");   // Dispose KERAK EMAS
    }
}
```

```csharp
// ❌ DbContext ni Dispose qilmaslik yoki noto'g'ri lifetime
// ✅ DI Scoped qilib ro'yxatdan o'tkazadi va o'zi Dispose qiladi
services.AddDbContext<AppDbContext>();   // Scoped, avtomatik
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `Dispose` chaqirmaslik | Ulanish/deskriptor sizib ketadi |
| `HttpClient` ni tez-tez yaratish | Socket exhaustion |
| `Dispose` ni idempotent qilmaslik | Ikkinchi chaqiruvda exception |
| Keraksiz finalizer | Obyekt ikki GC sikli yashaydi |
| `GC.SuppressFinalize` unutilishi | Finalizer bekorga ishlaydi |
| `using` ichida `Task` qaytarish | Metod tugagach obyekt Dispose bo'ladi, task hali ishlayapti |

```csharp
// ❌ Async tuzoq
Task<string> Read() {
    using var reader = new StreamReader(path);
    return reader.ReadToEndAsync();      // reader DARHOL Dispose bo'ladi
}

// ✅
async Task<string> Read() {
    using var reader = new StreamReader(path);
    return await reader.ReadToEndAsync();
}
```

## Fintech konteksti

- **DB ulanishlari** — pool cheklangan (odatda 100). Ulanish qaytarilmasa, tizim
  `Timeout expired` bilan to'xtaydi. `using` yoki DI majburiy.
- **Tranzaksiya** — `IDisposable`. `Commit` chaqirilmasa `Dispose` avtomatik
  `Rollback` qiladi. Bu xavfsiz default.
- **Maxfiy ma'lumot** — `Dispose` da bufer tozalanishi kerak (`CryptographicOperations.ZeroMemory`).

## Intervyu savollari

**1. `IDisposable` nima uchun kerak, GC yetarli emasmi?** ⭐

> GC faqat **boshqariladigan xotirani** biladi. Fayl deskriptori, soket, DB ulanishi,
> native xotira — bular GC uchun ko'rinmas.
>
> Bundan tashqari GC **qachon** ishlashini nazorat qila olmaysiz. DB ulanishi
> «bir necha soniyadan keyin» bo'shatilsa — pool tugaydi.
>
> `IDisposable` resursni **aniq vaqtda** bo'shatish imkonini beradi, `using` esa
> exception bo'lganda ham buni kafolatlaydi.

**2. Finalizer qachon yozasiz?**

> Deyarli hech qachon. Faqat native resurs (`IntPtr`) to'g'ridan-to'g'ri ushlangan
> bo'lsa — va u holatda ham to'g'ri javob `SafeHandle` ishlatish.
>
> Sabab: finalizer'li obyekt kamida **ikki GC sikli** yashaydi va Gen1'ga
> ko'tariladi. Va uning chaqirilishi umuman kafolatlanmagan.
>
> Agar finalizer bo'lsa — `Dispose` da `GC.SuppressFinalize(this)` chaqirish shart.

**3. `HttpClient` ni nega `using` bilan ishlatmaslik kerak?**

> `Dispose` qilingan soket **TIME_WAIT** holatida bir necha daqiqa qoladi. Yuqori
> yuklamada portlar tugaydi va `SocketException` chiqadi — socket exhaustion.
>
> To'g'ri yechim: `IHttpClientFactory` — u handler'larni pool'da saqlaydi va DNS
> o'zgarishini ham to'g'ri boshqaradi. Undan olingan `HttpClient` ni Dispose qilish
> kerak emas.

**4. `Dispose` ikki marta chaqirilsa nima bo'ladi?**

> Shartnoma bo'yicha **hech nima** — `Dispose` idempotent bo'lishi shart. Shuning
> uchun `_disposed` bayrog'i qo'yiladi.
>
> `using` va DI konteyner ikkalasi ham chaqirishi mumkin, shuning uchun bu real
> holat.

## Deliverable

```csharp
public class DisposeTests
{
    [Fact]
    public void Dispose_IsIdempotent()
    {
        var client = new PaymentClient(factory);
        client.Dispose();
        client.Dispose();        // exception BO'LMASLIGI kerak
    }

    [Fact]
    public void Using_DisposesOnException()
    {
        var tracker = new DisposeTracker();
        Assert.Throws<InvalidOperationException>(() => {
            using (tracker) throw new InvalidOperationException();
        });
        Assert.True(tracker.WasDisposed);
    }

    [Fact]
    public async Task Transaction_RollsBackWhenNotCommitted()
    {
        var id = await SeedAccount(100_000);

        using (var tx = await db.Database.BeginTransactionAsync())
        {
            await Withdraw(id, 50_000);
            // Commit YO'Q — Dispose rollback qiladi
        }

        Assert.Equal(100_000, await GetBalance(id));
    }

    [Fact]
    public async Task ConnectionPool_IsNotExhausted()
    {
        await Task.WhenAll(Enumerable.Range(0, 500).Select(async _ => {
            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync();
        }));   // ulanishlar qaytarilmasa Timeout expired chiqadi
    }
}
```

## Xotira kartasi

```
Nega         GC faqat boshqariladigan xotirani biladi
             fayl/soket/DB ulanishi/native xotira — u ko'rmaydi
using        try/finally ga aylanadi → exception'da ham Dispose
await using  IAsyncDisposable uchun
Idempotent   Dispose ikki marta chaqirilishi mumkin → _disposed bayrog'i
Finalizer    DEYARLI HECH QACHON · 2 GC sikli · kafolatlanmagan
             kerak bo'lsa → SafeHandle · Dispose'da SuppressFinalize
HttpClient   using ISHLATMANG → socket exhaustion → IHttpClientFactory
Tranzaksiya  Commit yo'q bo'lsa Dispose avtomatik ROLLBACK
Async tuzoq  using ichida Task qaytarish → obyekt erta Dispose bo'ladi
```

---

# 1.9 · Exception'lar ⭐

## Nima va nega

Exception — **kutilmagan** holat uchun. Kutilgan biznes holati uchun emas.
Bu farq intervyuda tez-tez tekshiriladi va u dizayn madaniyatini ko'rsatadi.

```
   ┌──────────────────────────┬──────────────────────────────┐
   │  KUTILGAN holat          │  KUTILMAGAN holat            │
   ├──────────────────────────┼──────────────────────────────┤
   │  Mablag' yetarli emas    │  DB yiqildi                  │
   │  Hisob bloklangan        │  Tarmoq uzildi               │
   │  Limit oshdi             │  Kod invariantida xato       │
   │  Validatsiya buzildi     │  Konfiguratsiya yo'q         │
   ├──────────────────────────┼──────────────────────────────┤
   │  → Result<T>             │  → Exception                 │
   └──────────────────────────┴──────────────────────────────┘
```

## `throw` va `throw ex`

```csharp
try { Process(); }
catch (Exception ex)
{
    logger.LogError(ex, "To'lov amalga oshmadi {PaymentId}", id);

    throw;              // ✅ stack trace SAQLANADI
    // throw ex;        // ❌ stack trace SHU QATORDAN qayta boshlanadi
    // throw new PaymentException("...", ex);   // ✅ kontekst qo'shish, inner saqlanadi
}
```

```
   throw;                          throw ex;
   ┌────────────────────┐          ┌────────────────────┐
   │ at DbLayer.Save    │          │                    │
   │ at Repo.Insert     │          │  (yo'qoldi)        │
   │ at Service.Charge  │          │                    │
   │ at Controller.Post │          │ at Service.Charge  │  ← faqat shu yerdan
   └────────────────────┘          └────────────────────┘
     xato QAYERDAN kelgani           xato manbai yo'qolgan
     ko'rinadi
```

## Exception filter — `when`

```csharp
try { await provider.ChargeAsync(payment); }
catch (SqlException ex) when (ex.Number == 1205)     // deadlock
{
    await RetryAsync();
}
catch (HttpRequestException ex) when (ex.StatusCode >= HttpStatusCode.InternalServerError)
{
    await ScheduleRetryAsync();
}
```

**Filter'ning muhim afzalligi:** shart `false` bo'lsa, stack **hali yechilmagan** —
ya'ni debugger xato paydo bo'lgan joyni ko'rsatadi. `catch` ichida `if` yozilsa,
stack allaqachon yechilgan bo'ladi.

## Result naqshi — kutilgan holatlar uchun

```csharp
public readonly struct Result<T>
{
    public bool IsSuccess { get; init; }
    public T? Value { get; init; }
    public string? Error { get; init; }

    public static Result<T> Ok(T value) => new() { IsSuccess = true, Value = value };
    public static Result<T> Fail(string error) => new() { Error = error };
}

// Ishlatilishi
public Result<Payment> Charge(Money amount)
{
    if (_balance < amount) return Result<Payment>.Fail("Mablag' yetarli emas");
    if (_isBlocked)        return Result<Payment>.Fail("Hisob bloklangan");

    _balance -= amount;
    return Result<Payment>.Ok(new Payment(amount));
}
```

**Nega:** exception qimmat (stack trace yig'iladi), va kutilgan holat **kodni
o'qiganda ko'rinib turishi** kerak.

## Global handler

```csharp
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> log)
    : IExceptionHandler        // .NET 8+
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var traceId = Activity.Current?.Id ?? ctx.TraceIdentifier;
        log.LogError(ex, "Ishlanmagan xato {TraceId}", traceId);

        var (status, title) = ex switch
        {
            NotFoundException      => (404, "Topilmadi"),
            ValidationException    => (422, "Ma'lumot noto'g'ri"),
            ConcurrencyException   => (409, "Ma'lumot o'zgargan"),
            _                      => (500, "Ichki xato")
        };

        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(new ProblemDetails {
            Status = status, Title = title, Extensions = { ["traceId"] = traceId }
        }, ct);
        return true;
    }
}
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `throw ex;` | Stack trace yo'qoladi |
| Biznes holati uchun exception | Qimmat, va kodda ko'rinmaydi |
| Bo'sh `catch { }` | Xato jimgina yutiladi |
| `catch (Exception)` har qatlamda | Xato yashiriladi, log takrorlanadi |
| Client'ga `ex.Message` qaytarish | Ichki tuzilma sizib chiqadi |
| Issiq yo'lda exception bilan oqim boshqaruvi | Sezilarli sekinlashuv |
| `finally` da exception tashlash | Asl exception yo'qoladi |

```csharp
// ❌ Ma'lumot sizishi
catch (Exception ex) { return BadRequest(ex.Message); }
// "Invalid column name 'card_number' in table 'user_cards'" — tashqariga chiqdi

// ✅
catch (Exception ex) {
    logger.LogError(ex, "So'rov bajarilmadi {TraceId}", traceId);
    return Problem(title: "So'rovni bajarib bo'lmadi", extensions: new() {
        ["traceId"] = traceId
    });
}
```

## Fintech konteksti

- **To'lov xatosi log'ga albatta tranzaksiya ID bilan** yoziladi. «Nimadir xato
  ketdi» degan log — foydasiz.
- **Tranzient xatolar** (deadlock `40P01`, timeout, 5xx) — retry qilinadi.
  **Tranzient bo'lmagan** (422, biznes rad) — hech qachon.
- `unknown` holat: provayder timeout bergani — exception, lekin uni **muvaffaqiyatsizlik
  deb belgilash xato** (M11.5).

## Intervyu savollari

**1. `throw` va `throw ex` farqi nima?** ⭐

> `throw;` mavjud exception'ni **original stack trace bilan** yuqoriga uzatadi.
> `throw ex;` esa stack trace'ni shu qatordan qayta boshlaydi — xato qayerdan
> kelganini yo'qotasiz.
>
> Deyarli har doim `throw;`. Kontekst qo'shmoqchi bo'lsangiz —
> `throw new PaymentException("...", ex)`, bunda inner exception saqlanadi.

**2. Biznes qoidasi buzilganda exception tashlaysizmi?**

> Yo'q, agar bu **kutilgan** holat bo'lsa. «Mablag' yetarli emas» — normal biznes
> natijasi, uni `Result<T>` bilan qaytaraman.
>
> Ikki sabab: exception qimmat (stack trace yig'iladi), va kutilgan holat kodni
> o'qiganda **ko'rinib turishi** kerak — metod imzosida.
>
> Exception — kutilmagan holatlar uchun: DB yiqildi, tarmoq uzildi, kod invariantida
> xato.

**3. Exception filter (`when`) nima beradi?**

> Ikki narsa. Birinchi — shartni ochiq ifodalash: `catch (SqlException ex) when
> (ex.Number == 1205)`.
>
> Ikkinchi va muhimrog'i — shart `false` bo'lsa **stack yechilmaydi**. `catch` ichida
> `if` yozib qayta tashlasangiz, stack allaqachon yechilgan bo'ladi va debugger asl
> joyni ko'rsatmaydi.

**4. Client'ga qanday xato qaytarasiz?**

> `ProblemDetails` (RFC 7807) formatida: status, umumiy sarlavha va **traceId**.
>
> `ex.Message` ni **hech qachon** qaytarmayman — u jadval nomlari, fayl yo'llari,
> ulanish satrlarini oshkor qilishi mumkin.
>
> Batafsil ma'lumot logda qoladi, client esa traceId bilan qo'llab-quvvatlashga
> murojaat qiladi.

## Deliverable

```csharp
public class ExceptionTests
{
    [Fact]
    public void Throw_PreservesStackTrace()
    {
        var rethrown = CaptureRethrow(useThrowEx: false);
        var replaced = CaptureRethrow(useThrowEx: true);

        Assert.Contains("DeepMethod", rethrown.StackTrace);
        Assert.DoesNotContain("DeepMethod", replaced.StackTrace!);
    }

    [Fact]
    public void InsufficientFunds_ReturnsResult_NotException()
    {
        var account = new Account(Money.FromMajor(100m, Currency.Uzs));
        var result = account.Charge(Money.FromMajor(500m, Currency.Uzs));

        Assert.False(result.IsSuccess);
        Assert.Equal("Mablag' yetarli emas", result.Error);
    }

    [Theory]
    [InlineData(1205, true)]    // deadlock — retry
    [InlineData(2627, false)]   // unique violation — retry EMAS
    public void OnlyTransientErrors_AreRetried(int sqlErrorCode, bool shouldRetry)
        => Assert.Equal(shouldRetry, RetryPolicy.IsTransient(sqlErrorCode));

    [Fact]
    public async Task ErrorResponse_DoesNotLeakInternals()
    {
        var response = await client.PostAsync("/payments", BrokenPayload());
        var body = await response.Content.ReadAsStringAsync();

        Assert.DoesNotContain("column", body, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("traceId", body);
    }
}
```

## Xotira kartasi

```
Qachon        exception = KUTILMAGAN · Result<T> = kutilgan biznes holati
throw;        stack trace saqlanadi · throw ex; — YO'QOTADI
Kontekst      throw new XException("...", ex) — inner saqlanadi
when filter   shart false → stack YECHILMAYDI → debugger asl joyni ko'rsatadi
Ushlash       ushlay olmasang — ushlama · catch(Exception) faqat eng yuqorida
Client        ProblemDetails + traceId · ex.Message HECH QACHON
Narxi         stack trace yig'iladi → issiq yo'lda oqim boshqaruvi uchun emas
Fintech       log'da albatta tranzaksiya ID · tranzient ≠ biznes rad
```

---

# 1.10 · Pattern matching

## Nima va nega

Pattern matching kodni **shartlar zanjiridan** deklarativ ifodaga aylantiradi.
Kompilyator to'liqlikni (exhaustiveness) tekshiradi va nusxa-cast'ni yo'q qiladi.

```csharp
// ❌ Eski uslub
if (shape is Circle) {
    var c = (Circle)shape;
    return Math.PI * c.Radius * c.Radius;
}

// ✅ Type pattern
if (shape is Circle c)
    return Math.PI * c.Radius * c.Radius;
```

## Naqsh turlari

```csharp
// switch expression — natija qaytaradi
decimal Fee(Payment p) => p switch
{
    { Amount.Minor: <= 100_000 }              => 0m,                    // property
    { Type: PaymentType.Card, IsForeign: true } => p.Amount.ToMajor() * 0.035m,
    { Type: PaymentType.Card }                => p.Amount.ToMajor() * 0.02m,
    { Type: PaymentType.Transfer }            => 500m,
    _                                          => throw new NotSupportedException()
};

// Relational + logical
string Category(long minor) => minor switch
{
    < 0                       => "noto'g'ri",
    0                         => "nol",
    > 0 and <= 100_000        => "kichik",
    > 100_000 and <= 10_000_000 => "o'rta",
    _                         => "katta"
};

// List pattern (C# 11)
string Describe(int[] xs) => xs switch
{
    []            => "bo'sh",
    [var single]  => $"bitta: {single}",
    [var f, .., var l] => $"{f} dan {l} gacha",
};

// Tuple pattern
string Decide(bool hasBalance, bool isBlocked) => (hasBalance, isBlocked) switch
{
    (true,  false) => "ruxsat",
    (true,  true)  => "hisob bloklangan",
    (false, _)     => "mablag' yetarli emas"
};

// Deconstruction + var pattern
if (money is { Minor: var m, Currency.Code: "UZS" } && m > 0) { ... }
```

## To'liqlik tekshiruvi

```
   switch expression'da barcha holat qamralmasa:

   ⚠ CS8509: The switch expression does not handle all possible values

   → Kompilyator OGOHLANTIRADI
   → Qoldirilgan holat ishlash vaqtida SwitchExpressionException beradi

   Bu enum'ga yangi qiymat qo'shilganda juda foydali:
   barcha switch'lar ogohlantirish beradi.
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `_` (discard) ni har joyda ishlatish | To'liqlik tekshiruvi foydasi yo'qoladi |
| Naqshlar tartibini noto'g'ri qo'yish | Umumiy naqsh xususiyni «yutadi» |
| Murakkab mantiqni switch'ga tiqish | O'qilmaydigan kod |
| `is` bilan `null` tekshiruvini unutish | `is Circle c` — `null` uchun `false`, bu to'g'ri |
| Type pattern bilan polimorfizmni almashtirish | OOP dizayni buziladi |

```csharp
// ❌ Tartib xato — birinchi naqsh hammasini yutadi
p switch {
    { Type: PaymentType.Card } => 0.02m,
    { Type: PaymentType.Card, IsForeign: true } => 0.035m,   // HECH QACHON
    _ => 0m
};
```

## Fintech konteksti

```csharp
// Holatlar mashinasi — o'qish oson va to'liqligi tekshiriladi
PaymentState Next(PaymentState current, PaymentEvent e) => (current, e) switch
{
    (Pending,    Authorized)   => Processing,
    (Processing, Succeeded)    => Completed,
    (Processing, Failed)       => PaymentState.Failed,
    (Processing, TimedOut)     => Unknown,        // ⚠ fail EMAS
    (Unknown,    Reconciled r) => r.WasCharged ? Completed : PaymentState.Failed,
    _ => throw new InvalidTransitionException(current, e)
};
```

## Intervyu savollari

**1. `switch` statement va `switch` expression farqi nima?**

> Expression **qiymat qaytaradi** va uni to'g'ridan-to'g'ri o'zgaruvchiga tayinlash
> mumkin; `break` kerak emas; kompilyator **to'liqlikni tekshiradi**.
>
> Statement esa amallarni bajaradi va to'liqlikni tekshirmaydi.
>
> Amalda: natija hisoblanayotgan bo'lsa expression, yon ta'sir bajarilayotgan bo'lsa
> statement.

**2. Pattern matching polimorfizmni almashtiradimi?**

> Yo'q, va bu muhim farq. Xatti-harakat turga bog'liq bo'lsa va turlar kengayib
> borsa — **polimorfizm** to'g'ri (`IPaymentProvider`).
>
> Pattern matching esa **yopiq** to'plamlarda yaxshi: holatlar mashinasi, natija
> turlari, DTO'ni tahlil qilish. U yerda yangi tur qo'shilishi kam va kompilyator
> to'liqlikni tekshirib beradi.

**3. To'liqlik tekshiruvi qanday foyda beradi?**

> Enum'ga yangi qiymat qo'shsangiz, uni qamramaydigan **barcha** `switch` expression
> ogohlantirish beradi — ya'ni kompilyator sizga tuzatish kerak bo'lgan joylarni
> ko'rsatadi.
>
> Shuning uchun `_` (discard) ni ehtiyotkorlik bilan ishlatish kerak: u to'liqlikni
> «yopib» qo'yadi va bu foydani yo'qotadi.

## Deliverable

```csharp
public class PatternMatchingTests
{
    [Theory]
    [InlineData(PaymentType.Card, false, 0.02)]
    [InlineData(PaymentType.Card, true,  0.035)]
    [InlineData(PaymentType.Transfer, false, 0)]
    public void Fee_MatchesSpecificPatternFirst(
        PaymentType type, bool foreign, decimal expectedRate)
        => Assert.Equal(expectedRate, RateFor(type, foreign));

    [Fact]
    public void StateMachine_TimeoutGoesToUnknown_NotFailed()
        => Assert.Equal(PaymentState.Unknown,
                        Next(PaymentState.Processing, PaymentEvent.TimedOut));

    [Fact]
    public void StateMachine_RejectsInvalidTransition()
        => Assert.Throws<InvalidTransitionException>(
               () => Next(PaymentState.Completed, PaymentEvent.Authorized));
}
```

## Xotira kartasi

```
switch expr   qiymat qaytaradi · break yo'q · TO'LIQLIK tekshiriladi
Naqshlar      type · property · relational · logical (and/or/not) · list · tuple
Tartib        xususiy naqsh UMUMIYDAN oldin — aks holda yutiladi
_ discard     to'liqlik foydasini yo'qotadi → ehtiyot bo'ling
is Circle c   cast + null tekshiruvi bir amalda
Polimorfizm   kengayadigan turlar → interfeys · YOPIQ to'plam → pattern
Fintech       holatlar mashinasi uchun ideal: (state, event) switch
```

---

# 1.11 · Extension method, `static` konstruktor, `partial`

## Extension method

Mavjud turga — jumladan siz o'zgartira olmaydigan turga — metod «qo'shish».

```csharp
public static class MoneyExtensions
{
    public static Money Percent(this Money source, decimal percent) =>
        Money.FromMinor(
            (long)Math.Round(source.Minor * percent / 100m, MidpointRounding.AwayFromZero),
            source.Currency);

    public static bool IsZeroOrNegative(this Money m) => m.Minor <= 0;
}

// Ishlatilishi — o'z metodidek ko'rinadi
var fee = payment.Amount.Percent(2.5m);
```

**Ichki mexanika:** kompilyator buni oddiy statik chaqiruvga aylantiradi —
`MoneyExtensions.Percent(payment.Amount, 2.5m)`. Hech qanday sehr yo'q.

**Muhim xususiyatlar:**

- `null` obyektda ham chaqirish mumkin (`this` tekshirilmaydi) — LINQ'ning
  `IsNullOrEmpty` kabi metodlari shunga tayanadi
- Namespace import qilinmasa **ko'rinmaydi**
- Haqiqiy instance metod har doim **ustun** turadi
- `private` a'zolarga kira olmaydi

```csharp
// ⚠ Null'da chaqirish ishlaydi — ehtiyot bo'ling
public static bool IsEmpty(this string? s) => string.IsNullOrEmpty(s);
string? x = null;
x.IsEmpty();     // true — NullReferenceException YO'Q
```

## `static` konstruktor

```csharp
public class CurrencyRegistry
{
    private static readonly Dictionary<string, Currency> _all;

    static CurrencyRegistry()          // parametrsiz, modifikatorsiz
    {
        _all = LoadFromIso4217();
    }
}
```

```
   Qachon chaqiriladi:
   ┌────────────────────────────────────────────────────┐
   │  Sinfning BIRINCHI ishlatilishidan oldin           │
   │  (static a'zoga murojaat yoki instance yaratish)   │
   │                                                     │
   │  · Aynan BIR MARTA                                  │
   │  · Thread-safe — CLR kafolatlaydi                   │
   │  · Chaqiruv vaqti aniq emas (lazy)                  │
   └────────────────────────────────────────────────────┘
```

> **Xavf:** static konstruktorda exception chiqsa, CLR uni
> `TypeInitializationException` ga o'raydi va **sinf butun ilova umriga
> ishlatilmaydigan** bo'lib qoladi. Konfiguratsiya o'qish yoki DB'ga murojaat kabi
> ishlarni u yerda qilmang.

## `partial`

Bitta turni bir necha faylga bo'lish. Amaliy qiymati — **generatsiya qilingan kod**
bilan qo'lda yozilgan kodni ajratish.

```csharp
// Payment.cs — qo'lda
public partial class Payment
{
    public Result Charge(Money amount) { /* ... */ }
}

// Payment.Generated.cs — vosita yozadi, qo'l tegmaydi
public partial class Payment
{
    public Guid Id { get; set; }
}
```

`partial` metodlar (C# 9+ dan `partial` metod ochiq va qiymat qaytarishi ham mumkin)
source generator'lar uchun asos:

```csharp
// LoggerMessage source generator
public partial class PaymentService
{
    [LoggerMessage(Level = LogLevel.Information,
                   Message = "To'lov bajarildi {PaymentId} {AmountMinor}")]
    private partial void LogCompleted(Guid paymentId, long amountMinor);
    // implementatsiyani generator yozadi — allocation'siz, tez
}
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Extension bilan domen mantiqini yozish | Mantiq turdan ajraladi, topish qiyin |
| `object` uchun extension | Hamma joyda IntelliSense'ni ifloslaydi |
| Static konstruktorda I/O yoki konfiguratsiya | `TypeInitializationException`, tuzatib bo'lmaydi |
| Static holatni mutable qilish | Thread-safety muammosi, testlar bir-biriga ta'sir qiladi |
| `partial` bilan katta sinfni «yashirish» | Sinf haqiqatan katta — bu dizayn muammosi |

## Fintech konteksti

- Extension'lar — **yordamchi** metodlar uchun (`.ToMajor()`, `.Percent()`), domen
  qoidalari uchun emas. Invariant himoyasi turning **ichida** bo'lishi kerak.
- Static mutable holat — fintech'da xavfli: testlar bir-biriga ta'sir qiladi va
  parallel so'rovlar poyga holatiga tushadi.
- `LoggerMessage` source generator — issiq yo'lda log yozishda allocation'ni
  yo'qotadi.

## Intervyu savollari

**1. Extension method qanday ishlaydi?**

> Kompilyator uni oddiy statik metod chaqiruviga aylantiradi — hech qanday runtime
> sehr yo'q. Shuning uchun u `private` a'zolarga kira olmaydi va haqiqiy instance
> metod har doim ustun turadi.
>
> Qiziq nuans: `null` obyektda ham chaqirilishi mumkin, chunki `this` tekshirilmaydi.

**2. Static konstruktor qachon chaqiriladi?**

> Sinfning birinchi ishlatilishidan oldin, aynan bir marta. CLR uning thread-safe
> ekanini kafolatlaydi.
>
> Lekin **qachon** aniq chaqirilishini nazorat qila olmaysiz. Va agar u exception
> tashlasa — sinf butun ilova umriga ishlatilmaydigan bo'lib qoladi. Shuning uchun
> u yerda I/O yoki konfiguratsiya o'qish qilinmaydi.

**3. `partial` qachon foydali?**

> Asosan **generatsiya qilingan kod** bilan qo'lda yozilgan kodni ajratish uchun:
> EF Core, source generator'lar, dizayner fayllar.
>
> Katta sinfni bo'lish uchun ishlatish — muammoni yashirish. Agar sinf bir faylga
> sig'masa, u haqiqatan juda ko'p mas'uliyatga ega.

## Deliverable

```csharp
public class ExtensionTests
{
    [Fact]
    public void Percent_RoundsAwayFromZero()
        => Assert.Equal(2050, Money.FromMinor(100_000, Currency.Uzs)
                                   .Percent(2.05m).Minor);

    [Fact]
    public void Extension_WorksOnNull()
    {
        string? nothing = null;
        Assert.True(nothing.IsEmpty());     // NRE yo'q
    }

    [Fact]
    public void InstanceMethod_WinsOverExtension()
    {
        // Agar turda bir xil imzoli metod bo'lsa — u chaqiriladi
        Assert.Equal("instance", new Sample().Describe());
    }
}
```

## Xotira kartasi

```
Extension    kompilyator → statik chaqiruv · sehr yo'q
             null'da chaqiriladi · private ko'rmaydi · instance metod USTUN
             namespace import qilinmasa ko'rinmaydi
Static ctor  birinchi ishlatishdan oldin · BIR MARTA · thread-safe (CLR)
             ⚠ exception → TypeInitializationException → sinf o'lik
             I/O va konfiguratsiya u yerda QILINMAYDI
partial      generatsiya + qo'lda yozilgan kodni ajratish
             partial metod → source generator asosi (LoggerMessage)
Fintech      extension = yordamchi · domen qoidasi turning ICHIDA
```

---

# 1.12 · Operator overloading va value object

## Nima va nega

Operator overloading kodni domen tiliga yaqinlashtiradi — lekin faqat **matematik
ma'noga ega** turlar uchun.

```csharp
var total = price + tax - discount;          // o'qiladi
var total = price.Add(tax).Subtract(discount);   // shovqinli
```

## To'liq `Money` implementatsiyasi

```csharp
public readonly record struct Money :
    IComparable<Money>,
    IAdditionOperators<Money, Money, Money>,      // C# 11 generic math
    ISubtractionOperators<Money, Money, Money>
{
    public long Minor { get; }
    public Currency Currency { get; }

    private Money(long minor, Currency currency) => (Minor, Currency) = (minor, currency);

    // ── Yaratish ──────────────────────────────────────────────
    public static Money FromMinor(long minor, Currency c) => new(minor, c);

    public static Money FromMajor(decimal major, Currency c)
    {
        var scaled = major * c.MinorFactor;
        if (scaled != decimal.Truncate(scaled))
            throw new ArgumentException(
                $"{major} {c.Code} — {c.Exponent} xonadan ortiq kasr", nameof(major));
        return new((long)scaled, c);
    }

    public static Money Zero(Currency c) => new(0, c);

    // ── Arifmetika ────────────────────────────────────────────
    public static Money operator +(Money a, Money b) =>
        new(checked(a.Minor + b.Minor), Same(a, b));

    public static Money operator -(Money a, Money b) =>
        new(checked(a.Minor - b.Minor), Same(a, b));

    public static Money operator -(Money a) => new(-a.Minor, a.Currency);   // unar

    public static Money operator *(Money a, int factor) =>
        new(checked(a.Minor * factor), a.Currency);

    // ⚠ Bo'lish ATAYLAB yo'q — qoldiq siyosati talab qilinadi (M4.5)
    // MoneySplit.Equally(...) ishlatiladi

    // ── Taqqoslash ────────────────────────────────────────────
    public static bool operator >(Money a, Money b)  => a.Minor >  Same(a, b).Minor;
    public static bool operator <(Money a, Money b)  => a.Minor <  Same(a, b).Minor;
    public static bool operator >=(Money a, Money b) => a.Minor >= Same(a, b).Minor;
    public static bool operator <=(Money a, Money b) => a.Minor <= Same(a, b).Minor;

    public int CompareTo(Money other) => Minor.CompareTo(Same(this, other).Minor);

    // ── Yordamchi ─────────────────────────────────────────────
    private static Currency Same(Money a, Money b) =>
        a.Currency == b.Currency ? a.Currency
        : throw new InvalidOperationException(
              $"Valyuta mos emas: {a.Currency.Code} va {b.Currency.Code}");

    public decimal ToMajor() => (decimal)Minor / Currency.MinorFactor;
    public bool IsZero => Minor == 0;

    public override string ToString() =>
        $"{ToMajor().ToString($"N{Currency.Exponent}")} {Currency.Code}";
}
```

## Nima ataylab qilinmagan

```
   ┌──────────────────────────────────────────────────────────────┐
   │  ✗ operator /        → qoldiq siyosati kerak (M4.5)          │
   │  ✗ Money + decimal   → valyuta noaniq qoladi                 │
   │  ✗ implicit cast     → tasodifiy konvertatsiya xavfli        │
   │  ✗ mutable maydonlar → value object immutable bo'lishi shart │
   └──────────────────────────────────────────────────────────────┘
```

```csharp
// ❌ Implicit konvertatsiya — jimgina xato manbai
public static implicit operator decimal(Money m) => m.ToMajor();
var total = money + 100;         // 100 nima? so'mmi, tiyinmi? — noaniq

// ✅ Explicit va ochiq
var total = money + Money.FromMajor(100m, Currency.Uzs);
```

## Value object qoidalari

| Qoida | Nega |
|---|---|
| **Immutable** | Ulashilgan holat xavfsiz, tasodifiy o'zgarish yo'q |
| **Qiymat bo'yicha tenglik** | 1000 UZS = 1000 UZS, ID kerak emas |
| **O'z-o'zini tekshiradi** | Noto'g'ri holatda yaratib bo'lmaydi |
| **Yon ta'sirsiz** | Har amal yangi obyekt qaytaradi |
| **Kichik** | `readonly record struct` — allocation yo'q |

## Tipik xatolar

| Xato | Natija |
|---|---|
| Ma'nosiz operator (`Customer + Customer`) | Kod chalkashadi |
| `implicit` konvertatsiya | Tasodifiy va noaniq o'zgarishlar |
| `checked` ishlatmaslik | Overflow jimgina o'raladi |
| `==` ni override qilib `Equals` ni unutish | Nomuvofiq tenglik (1.4) |
| Bo'lishni «shunchaki» qo'shish | Qoldiq yo'qoladi (M4.5) |
| Value object'ni mutable qilish | Ledger'da jimgina buzilish |

## Fintech konteksti

Value object sifatida modellashtirish kerak bo'lgan tushunchalar:

```csharp
public readonly record struct Money(long Minor, Currency Currency);
public readonly record struct AccountNumber(string Value);
public readonly record struct IdempotencyKey(Guid Value);
public readonly record struct ExchangeRate(Currency From, Currency To, decimal Rate);
```

Foyda: `Charge(AccountNumber from, AccountNumber to, Money amount)` — argumentlarni
tasodifan almashtirib bo'lmaydi. `Charge(string, string, decimal)` da esa bu oson.

## Intervyu savollari

**1. Operator overloading'ni qachon ishlatasiz?**

> Faqat operator **tabiiy ma'noga** ega bo'lganda: pul, vaqt oralig'i, vektor,
> matritsa. `Money + Money` — tushunarli; `Customer + Customer` — ma'nosiz.
>
> Va operatorlar **izchil** bo'lishi kerak: `+` ni yozsangiz `-` ham kutiladi,
> `==` ni yozsangiz `Equals` va `GetHashCode` ham mos bo'lishi shart.

**2. Nega `Money` uchun bo'lish operatorini yozmadingiz?**

> Chunki pulni bo'lish **qoldiq siyosatini** talab qiladi. `100 / 3` — bu 33.33 emas,
> bu 34/33/33 va oshgan tiyin kimgadir tegishi kerak.
>
> Operator bu qarorni yashirib qo'yadi. Shuning uchun men uni ataylab yozmadim va
> `MoneySplit.Equally(total, parts)` metodini taklif qilaman — u qoldiqni ochiq
> taqsimlaydi va invariantni tekshiradi.

**3. Value object nima va nega kerak?**

> Qiymati bilan aniqlanadigan, immutable, o'z invariantini himoya qiladigan tur.
> ID yo'q — 1000 UZS har doim 1000 UZS.
>
> Fintech'da asosiy foydasi — **tur xavfsizligi**:
> `Charge(AccountNumber from, AccountNumber to, Money amount)` da argumentlarni
> tasodifan almashtirib bo'lmaydi, `Charge(string, string, decimal)` da esa oson.
>
> Va noto'g'ri qiymat umuman yaratilmaydi: `Money.FromMajor(10.123m, uzs)` darhol
> exception beradi.

**4. `implicit` va `explicit` konvertatsiya — qaysi birini tanlaysiz?**

> Deyarli har doim `explicit`, yoki umuman yo'q. `implicit` konvertatsiya kompilyator
> tomonidan **jimgina** qo'llanadi va bu pulda xavfli: `money + 100` — 100 nima,
> so'mmi yoki tiyinmi?
>
> Ochiq metod (`Money.FromMajor`) niyatni ko'rsatadi va valyutani talab qiladi.

## Deliverable

```csharp
public class MoneyOperatorTests
{
    [Fact]
    public void Add_SameCurrency_Sums()
        => Assert.Equal(150_000,
             (Money.FromMajor(1000.50m, Currency.Uzs)
            + Money.FromMajor(499.50m,  Currency.Uzs)).Minor);

    [Fact]
    public void Add_DifferentCurrency_Throws()
        => Assert.Throws<InvalidOperationException>(() =>
             Money.FromMajor(1000m, Currency.Uzs) + Money.FromMajor(10m, Currency.Usd));

    [Fact]
    public void Overflow_Throws_NotWraps()
        => Assert.Throws<OverflowException>(() =>
             Money.FromMinor(long.MaxValue, Currency.Uzs)
           + Money.FromMinor(1, Currency.Uzs));

    [Theory]
    [InlineData(10.123, "UZS")]
    [InlineData(10.1,   "JPY")]
    public void FromMajor_RejectsTooManyDecimals(decimal amount, string code)
        => Assert.Throws<ArgumentException>(
             () => Money.FromMajor(amount, Currency.FromCode(code)));

    [Fact]
    public void Comparison_WorksWithinCurrency()
        => Assert.True(Money.FromMajor(100m, Currency.Uzs)
                     > Money.FromMajor(50m,  Currency.Uzs));

    [Fact]
    public void ValueObject_HasValueEquality()
        => Assert.Equal(Money.FromMinor(1000, Currency.Uzs),
                        Money.FromMinor(1000, Currency.Uzs));
}
```

## Xotira kartasi

```
Qachon       operator TABIIY ma'noga ega bo'lsa: pul, vaqt, vektor
Izchillik    + bo'lsa − ham · == bo'lsa Equals + GetHashCode ham
checked      overflow jimgina o'ralmasin → OverflowException
Bo'lish      Money uchun ATAYLAB yo'q → qoldiq siyosati kerak (M4.5)
implicit     ISHLATMANG — jimgina va noaniq · explicit yoki metod
Value object immutable · qiymat tengligi · o'zini tekshiradi · kichik
Tur xavfsizl.  Charge(AccountNumber, AccountNumber, Money)
             argumentlarni almashtirib bo'lmaydi
Fintech VO   Money · AccountNumber · IdempotencyKey · ExchangeRate
```

---

## M1 — yakuniy tekshiruv ro'yxati

Kodsiz, og'zaki javob bera olsangiz — modul yopilgan:

- [ ] Value va reference type farqi, va «stack/heap» soddalashtirishining xatosi
- [ ] Boxing qayerdan paydo bo'ladi va nega qimmat
- [ ] `string` nega immutable, va siklda `+=` nima qiladi
- [ ] `record`, `struct`, `record struct`, `ref struct` — qaysi biri qachon
- [ ] `Equals` va `GetHashCode` shartnomasi, buzilsa nima bo'ladi
- [ ] Nullable reference types runtime himoya beradimi
- [ ] Kovariantlik va kontravariantlik, `List<T>` nega invariant
- [ ] `for` siklidagi closure tuzog'i
- [ ] `IDisposable` nega kerak, finalizer nega qimmat
- [ ] `throw` va `throw ex` farqi
- [ ] Exception va `Result<T>` — qachon qaysi biri
- [ ] Nega `Money` uchun bo'lish operatori yozilmaydi

**Deliverable'lar:**

- [ ] `ValueVsReferenceTests` — nusxalash, boxing, allocation o'lchash
- [ ] `EqualityTests` — shartnoma, `Dictionary` kaliti, mutable kalit bugi
- [ ] `DelegateTests` — closure tuzog'i va uni tuzatish
- [ ] `DisposeTests` — idempotentlik, tranzaksiya rollback, pool tugamasligi
- [ ] `ExceptionTests` — stack trace saqlanishi, `Result` naqshi, ma'lumot sizmasligi
- [ ] `MoneyOperatorTests` — to'liq value object testi
