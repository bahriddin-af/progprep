# M6 · EF Core va data access

EF Core intervyusining mazmuni: **ORM sizni SQL'dan xalos qilmaydi.** U kodni
qisqartiradi, lekin nima generatsiya qilinayotganini bilmasangiz — jimgina sekin
va noto'g'ri tizim quriladi.

| # | Mavzu | P |
|---|---|---|
| [6.1](#61--dbcontext-va-change-tracker-) | `DbContext` hayoti, change tracker ⭐ | P0 |
| [6.2](#62--n1-muammosi-) | N+1 muammosi ⭐ | P0 |
| [6.3](#63--iqueryable-va-ienumerable-) | `IQueryable` vs `IEnumerable` ⭐ | P0 |
| [6.4](#64--tranzaksiyalar-va-savechanges) | Tranzaksiyalar, `SaveChanges`, `ExecuteUpdate` | P1 |
| [6.5](#65--concurrency-token-) | Concurrency token ⭐ | P0 |
| [6.6](#66--migratsiyalar-va-konfiguratsiya) | Migratsiyalar, `decimal` precision | P1 |
| [6.7](#67--repository-va-unit-of-work) | Repository va Unit of Work — kerakmi | P1 |
| [6.8](#68--dapper-va-raw-sql) | Dapper va raw SQL | P2 |
| [6.9](#69--testcontainers-bilan-test-) | Testcontainers bilan test ⭐ | P0 |

---

# 6.1 · `DbContext` va change tracker ⭐

## Nima va nega

`DbContext` — bu **Unit of Work + Identity Map**. U yuklangan obyektlarni eslab
qoladi, ularning o'zgarishini kuzatadi va `SaveChanges` da barchasini bitta
tranzaksiyada yozadi.

```
   ┌──────────────── DbContext ────────────────────────────────┐
   │                                                            │
   │  Change Tracker                                            │
   │  ┌──────────────────────────────────────────────────────┐ │
   │  │ Entity          Original qiymat    Joriy    Holat     │ │
   │  ├──────────────────────────────────────────────────────┤ │
   │  │ Account #42     balance=100000     20000    Modified  │ │
   │  │ Payment  #7     —                  {...}    Added     │ │
   │  │ User     #3     name="Ali"         "Ali"    Unchanged │ │
   │  └──────────────────────────────────────────────────────┘ │
   │                          │                                 │
   │            SaveChanges() │  farqni topib SQL generatsiya   │
   │                          ▼                                 │
   │             UPDATE accounts SET balance=20000 WHERE id=42  │
   │             INSERT INTO payments ...                       │
   └────────────────────────────────────────────────────────────┘
```

> **Identity Map:** bir xil kalitli entity ikki marta yuklanmaydi — ikkinchi
> so'rov o'sha obyektni qaytaradi.

## Entity holatlari

```
   Detached ──Add()──► Added ──SaveChanges──► Unchanged
                                                  │
                                          maydon o'zgardi
                                                  ▼
                                              Modified ──SaveChanges──► Unchanged
                                                  │
                                             Remove()
                                                  ▼
                                               Deleted ──SaveChanges──► Detached
```

```csharp
var account = await db.Accounts.FindAsync(id);   // Unchanged
account.Balance -= 80_000;                        // Modified — AVTOMATIK
await db.SaveChangesAsync();                      // UPDATE generatsiya qilinadi

db.Entry(account).State;                          // holatni ko'rish
db.ChangeTracker.Entries().Count();               // kuzatilayotganlar soni
```

## `AsNoTracking` — o'qish uchun

```csharp
// ❌ Faqat ko'rsatish uchun, lekin tracker to'ldiriladi
var payments = await db.Payments.Where(p => p.UserId == id).ToListAsync();

// ✅ Tracking yo'q — tezroq va kam xotira
var payments = await db.Payments.AsNoTracking()
                                .Where(p => p.UserId == id)
                                .ToListAsync();

// Butun context uchun default qilish mumkin
options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
```

```
   Tracking narxi:
   · har entity uchun original qiymatlar NUSXASI saqlanadi
   · SaveChanges da hammasi taqqoslanadi
   · 10 000 qator o'qilsa — 10 000 nusxa + taqqoslash

   AsNoTracking bilan read-heavy endpoint'da 20–40% tezlashish odatiy.
```

## Lifetime — Scoped

```csharp
services.AddDbContext<AppDbContext>(o => o.UseNpgsql(cs));   // Scoped (default)
```

| Lifetime | To'g'rimi | Sabab |
|---|---|---|
| **Scoped** | ✅ | Bir HTTP so'rov = bir Unit of Work |
| Transient | ❌ | Har inyeksiya yangi context — tranzaksiya buziladi |
| Singleton | ❌ | **Thread-safe emas** + captive dependency (M7.3) |

```csharp
// ❌ DbContext THREAD-SAFE EMAS
await Task.WhenAll(
    db.Users.CountAsync(),
    db.Payments.CountAsync());        // InvalidOperationException

// ✅ Fon vazifasida — o'z scope'i
using var scope = _scopeFactory.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Read-only so'rovda tracking | Ortiqcha xotira va vaqt |
| Bitta `DbContext` bilan parallel so'rov | `InvalidOperationException` |
| `DbContext` ni singleton qilish | Eskirgan ma'lumot, thread muammosi |
| Uzoq yashaydigan context | Tracker to'ladi, sekinlashadi |
| `Find` o'rniga har safar `FirstOrDefault` | Identity map'dan foydalanilmaydi |
| Ko'p entity yuklab, keyin `SaveChanges` | Taqqoslash sekin |

```csharp
// Find — avval TRACKER dan qidiradi, keyin DB'ga boradi
var a = await db.Accounts.FindAsync(id);      // DB so'rovi
var b = await db.Accounts.FindAsync(id);      // ✅ DB so'rovi YO'Q — tracker'dan

// FirstOrDefault — HAR DOIM DB'ga boradi
var c = await db.Accounts.FirstOrDefaultAsync(x => x.Id == id);   // so'rov
```

## Fintech konteksti

- **Bir so'rov = bir tranzaksiya** — `Scoped` lifetime aynan buni beradi.
- **Hisobot endpoint'lari** — har doim `AsNoTracking`, ular hech nima yozmaydi.
- **Balans o'zgarishi** — tracker'ga tayanmang: atomik `UPDATE` yoki
  concurrency token (6.5).

## Intervyu savollari

**1. `DbContext` nima va qanday ishlaydi?** ⭐

> Bu **Unit of Work + Identity Map**. U yuklangan entity'larni change tracker'da
> saqlaydi, original qiymatlar nusxasini eslab qoladi va `SaveChanges` da farqni
> topib SQL generatsiya qiladi.
>
> Identity map tufayli bir xil kalitli entity ikki marta yuklanmaydi.
>
> Lifetime — **Scoped**: bir HTTP so'rov bir Unit of Work bo'lishi kerak.

**2. `AsNoTracking` qachon ishlatasiz?**

> Faqat o'qish uchun olingan ma'lumotda — hisobotlar, ro'yxatlar, ko'rsatish.
>
> Tracking har entity uchun original qiymatlar nusxasini saqlaydi va `SaveChanges`
> da hammasini taqqoslaydi. O'zgartirmasangiz bu sof ortiqcha ish.
>
> Read-heavy endpoint'da odatda 20–40% tezlashish beradi.

**3. `DbContext` ni singleton qilsa nima bo'ladi?**

> Ikki muammo. Birinchi — u **thread-safe emas**: parallel so'rovlar
> `InvalidOperationException` beradi.
>
> Ikkinchi — change tracker hech qachon tozalanmaydi, xotira o'sadi va ma'lumot
> eskiradi: birinchi so'rovda yuklangan entity keyingi so'rovlarda ham qaytariladi.
>
> Va bu captive dependency muammosining klassik holati (M7.3).

**4. `Find` va `FirstOrDefault` farqi?**

> `Find` avval **change tracker**dan qidiradi va faqat topilmasa DB'ga boradi.
> `FirstOrDefault` har doim DB so'rovi yuboradi.
>
> Ya'ni bir xil entity ikki marta kerak bo'lsa, `Find` ikkinchi so'rovni tejaydi.
> Lekin `Find` faqat **birlamchi kalit** bo'yicha ishlaydi.

## Deliverable

```csharp
public class DbContextTests
{
    [Fact]
    public async Task ChangeTracker_DetectsModification()
    {
        var account = await db.Accounts.FindAsync(id);
        account.Balance -= 1000;

        Assert.Equal(EntityState.Modified, db.Entry(account).State);
        Assert.Equal(1, db.ChangeTracker.Entries()
                          .Count(e => e.State == EntityState.Modified));
    }

    [Fact]
    public async Task Find_UsesIdentityMap()
    {
        var first = await db.Accounts.FindAsync(id);
        var queriesBefore = interceptor.QueryCount;

        var second = await db.Accounts.FindAsync(id);

        Assert.Same(first, second);                         // AYNAN o'sha obyekt
        Assert.Equal(queriesBefore, interceptor.QueryCount); // DB so'rovi yo'q
    }

    [Fact]
    public async Task AsNoTracking_DoesNotFillTracker()
    {
        await db.Payments.AsNoTracking().Take(100).ToListAsync();
        Assert.Empty(db.ChangeTracker.Entries());
    }

    [Fact]
    public async Task ParallelQueries_OnSameContext_Throw()
        => await Assert.ThrowsAsync<InvalidOperationException>(() =>
               Task.WhenAll(db.Users.CountAsync(), db.Payments.CountAsync()));
}
```

## Xotira kartasi

```
DbContext    Unit of Work + Identity Map
Change tracker  original qiymat NUSXASI + joriy qiymat → farq → SQL
Holatlar     Detached · Added · Unchanged · Modified · Deleted
AsNoTracking read-only so'rovlarda → 20–40% tezroq, kam xotira
Lifetime     SCOPED (bir so'rov = bir UoW)
             Transient ❌ tranzaksiya buziladi · Singleton ❌ thread-safe emas
Parallel     bitta context bilan WhenAll → InvalidOperationException
             fon vazifasida → IServiceScopeFactory bilan o'z scope'i
Find         avval TRACKER dan · FirstOrDefault har doim DB'ga boradi
```

---

# 6.2 · N+1 muammosi ⭐

## Nima va nega

Eng ko'p uchraydigan ORM performans xatosi. Kod chiroyli ko'rinadi, so'rovlar esa
yuzlab.

```
   var orders = await db.Orders.ToListAsync();        // 1 so'rov
   foreach (var o in orders)
       Console.WriteLine(o.Customer.Name);            // har biri uchun +1

   ┌────────────────────────────────────────────────────────┐
   │  SELECT * FROM orders                        ← 1        │
   │  SELECT * FROM customers WHERE id = 1        ← +1       │
   │  SELECT * FROM customers WHERE id = 2        ← +1       │
   │  SELECT * FROM customers WHERE id = 3        ← +1       │
   │  ...                                                    │
   │  SELECT * FROM customers WHERE id = 100      ← +1       │
   ├────────────────────────────────────────────────────────┤
   │  JAMI: 101 so'rov                                       │
   │  Har biri: tarmoq round-trip ~1 ms → 100 ms bekorga    │
   └────────────────────────────────────────────────────────┘
```

## Yechimlar

```csharp
// ✅ 1. Include — JOIN bilan bitta so'rov
var orders = await db.Orders
    .Include(o => o.Customer)
    .ToListAsync();

// ✅ 2. Proyeksiya — eng yaxshisi, faqat kerakli ustunlar
var rows = await db.Orders
    .Select(o => new OrderDto(o.Id, o.Total, o.Customer.Name))
    .ToListAsync();

// ✅ 3. Split query — ko'p to'plam bo'lsa
var orders = await db.Orders
    .Include(o => o.Items)
    .Include(o => o.Payments)
    .AsSplitQuery()             // dekart ko'paytmasidan qutulish
    .ToListAsync();
```

## Dekart portlashi — `Include` ning teskari tomoni

```
   Order (1) ──► Items (10)  ──► JOIN natijasi: 10 qator
             └─► Payments (5)

   Ikkalasini birga Include qilsangiz:
   ┌──────────────────────────────────────────────┐
   │  10 × 5 = 50 QATOR                           │
   │  Order maydonlari 50 marta takrorlanadi      │
   │  → tarmoqdan ortiqcha ma'lumot               │
   └──────────────────────────────────────────────┘

   AsSplitQuery() → 3 ta alohida so'rov, takrorlanish yo'q
   ⚠ lekin ular BITTA tranzaksiyada emas → nomuvofiqlik mumkin
```

## Aniqlash

```csharp
// Development'da so'rov loglarini yoqish
options.UseNpgsql(cs)
       .LogTo(Console.WriteLine, LogLevel.Information)
       .EnableSensitiveDataLogging();        // ⚠ FAQAT development

// Yashirin lazy loading'ni XATOGA aylantirish
options.ConfigureWarnings(w =>
    w.Throw(CoreEventId.LazyLoadOnDisposedContextWarning)
     .Throw(RelationalEventId.MultipleCollectionIncludeWarning));
```

```
   Production'da aniqlash:
   · APM'da bitta endpoint uchun DB so'rovlari soni
   · slow query log'da bir xil so'rovning ko'p takrorlanishi
   · p95 kechikish yuqori, lekin har so'rov tez
```

## Lazy loading — nega yoqilmaydi

```csharp
// ⚠ Lazy loading N+1 ni KO'RINMAS qiladi
options.UseLazyLoadingProxies();

public virtual Customer Customer { get; set; }   // virtual = proxy

// Kod chiroyli, so'rovlar yuzlab — va buni kodga qarab bilib bo'lmaydi
```

> Fintech loyihada lazy loading'ni **o'chirib qo'yish** xavfsizroq: shunda
> `Include` yozishni unutgan joy `NullReferenceException` bilan darhol ko'rinadi.

## Tipik xatolar

| Xato | Natija |
|---|---|
| Sikl ichida navigatsiya xususiyatiga murojaat | N+1 |
| Lazy loading yoqilgan | N+1 ko'rinmas bo'ladi |
| Ko'p `Include` bir vaqtda | Dekart portlashi |
| Butun entity yuklash (proyeksiya o'rniga) | Ortiqcha ustunlar, xotira |
| `Include` dan keyin `Where` (client-side) | Butun to'plam yuklanadi |
| Development'da so'rov loglarini o'chirish | N+1 topilmaydi |

## Fintech konteksti

- **Tranzaksiyalar ro'yxati** — merchant nomi, valyuta, holat: bularning hammasi
  proyeksiya bilan bitta so'rovda olinishi kerak.
- **Reconciliation** — millionlab qator; u yerda `Include` emas, streaming va
  proyeksiya (M3.6).
- N+1 kichik hajmda sezilmaydi va **production'da portlaydi** — shuning uchun
  test ma'lumoti realistik bo'lishi kerak.

## Intervyu savollari

**1. N+1 nima va qanday aniqlaysiz?** ⭐

> Bitta so'rov ro'yxatni oladi, keyin har element uchun bog'liq ma'lumot alohida
> so'rov bilan yuklanadi — 100 element uchun 101 so'rov.
>
> Aniqlash: development'da SQL loglarini yoqaman (`LogTo`), production'da esa
> APM'da bitta endpoint uchun DB so'rovlari sonini kuzataman.
>
> Xarakterli belgi: har so'rov tez, lekin endpoint sekin.

**2. Qanday tuzatasiz?**

> Uch variant:
> - `Include` — JOIN bilan bitta so'rov.
> - **Proyeksiya** (`Select` bilan DTO) — eng yaxshisi, chunki faqat kerakli
>   ustunlar olinadi.
> - Ko'p to'plam bo'lsa `AsSplitQuery` — dekart portlashidan qutulish.
>
> Odatda men proyeksiyani tanlayman: u ham N+1 ni, ham `SELECT *` muammosini
> birdan hal qiladi.

**3. `Include` har doim yaxshimi?**

> Yo'q. Bir nechta to'plamni birga `Include` qilsangiz **dekart portlashi** bo'ladi:
> 10 element × 5 element = 50 qator, va asosiy entity maydonlari 50 marta
> takrorlanadi.
>
> `AsSplitQuery` buni hal qiladi — alohida so'rovlar yuboriladi. Lekin ular bitta
> snapshot'da emas, shuning uchun nazariy jihatdan nomuvofiqlik mumkin.

**4. Lazy loading'ni yoqasizmi?**

> Fintech loyihada **yo'q**. U N+1 ni ko'rinmas qiladi: kod chiroyli bo'ladi,
> so'rovlar esa yuzlab — va buni kodga qarab bilib bo'lmaydi.
>
> O'chirilgan bo'lsa, `Include` yozishni unutgan joy `NullReferenceException`
> bilan darhol ko'rinadi — bu yaxshiroq, chunki xato erta topiladi.

## Deliverable

```csharp
public class NPlusOneTests
{
    [Fact]
    public async Task NaiveLoop_CausesNPlusOne()
    {
        await SeedOrders(count: 50, withCustomers: true);
        interceptor.Reset();

        var orders = await db.Orders.ToListAsync();
        foreach (var o in orders) _ = o.Customer.Name;

        Assert.True(interceptor.QueryCount > 50);     // ⚠ bug isbotlandi
    }

    [Fact]
    public async Task Include_UsesSingleQuery()
    {
        await SeedOrders(count: 50, withCustomers: true);
        interceptor.Reset();

        var orders = await db.Orders.Include(o => o.Customer).ToListAsync();
        foreach (var o in orders) _ = o.Customer.Name;

        Assert.Equal(1, interceptor.QueryCount);
    }

    [Fact]
    public async Task Projection_SelectsOnlyNeededColumns()
    {
        interceptor.Reset();
        await db.Orders.Select(o => new { o.Id, Customer = o.Customer.Name })
                       .ToListAsync();

        Assert.Equal(1, interceptor.QueryCount);
        Assert.DoesNotContain("o.\"InternalNotes\"", interceptor.LastSql);
    }

    [Fact]
    public async Task MultipleIncludes_CauseCartesianExplosion()
    {
        await SeedOrder(items: 10, payments: 5);
        interceptor.Reset();

        await db.Orders.Include(o => o.Items).Include(o => o.Payments).ToListAsync();

        Assert.Contains("JOIN", interceptor.LastSql);
        Assert.True(interceptor.LastRowCount >= 50);   // 10 × 5
    }
}
```

## Xotira kartasi

```
N+1          1 so'rov ro'yxat + har element uchun +1 → 101 so'rov
Belgisi      har so'rov TEZ, lekin endpoint SEKIN
Aniqlash     LogTo (dev) · APM'da endpoint uchun so'rovlar soni (prod)
Yechim 1     Include — JOIN, bitta so'rov
Yechim 2     PROYEKSIYA (Select → DTO) — eng yaxshisi, faqat kerakli ustunlar
Yechim 3     AsSplitQuery — ko'p to'plam bo'lsa
Dekart       ikki Include → 10 × 5 = 50 qator, maydonlar takrorlanadi
Lazy loading N+1 ni KO'RINMAS qiladi → fintech'da O'CHIRILADI
             o'chiq bo'lsa unutilgan Include NullReference bilan darhol ko'rinadi
```

---

# 6.3 · `IQueryable` va `IEnumerable` ⭐

## Nima va nega

Bu farqni bilmaslik butun jadvalni xotiraga tortib olishga olib keladi — va kod
tashqi ko'rinishidan bir xil bo'ladi.

```
   IQueryable<T>                      IEnumerable<T>
   ┌──────────────────────┐          ┌──────────────────────┐
   │ Expression daraxti   │          │ Delegat (kompilyat-  │
   │ quriladi             │          │ siya qilingan kod)   │
   │        │             │          │        │             │
   │        ▼             │          │        ▼             │
   │ Provider (EF Core)   │          │ XOTIRADA bajariladi  │
   │ uni SQL'ga tarjima   │          │                      │
   │ qiladi               │          │ ⚠ ma'lumot allaqachon│
   │        │             │          │   yuklangan bo'lishi │
   │        ▼             │          │   kerak              │
   │ DB'da bajariladi ✅   │          │                      │
   └──────────────────────┘          └──────────────────────┘
```

```csharp
// ❌ AsEnumerable — butun jadval xotiraga, keyin filtr
var bad = db.Payments
            .AsEnumerable()                      // ← SQL shu yerda tugaydi
            .Where(p => p.AmountMinor > 100_000)  // C#da, xotirada
            .ToList();
// SQL: SELECT * FROM payments        (10 million qator!)

// ✅ WHERE SQL'ga tushadi
var good = await db.Payments
            .Where(p => p.AmountMinor > 100_000)
            .ToListAsync();
// SQL: SELECT * FROM payments WHERE amount_minor > 100000
```

## Client-side evaluation

```
   EF Core 3.0 gacha: tarjima qilinmaydigan ifoda JIMGINA
                      client tomonda bajarilardi → yashirin falokat

   EF Core 3.0 dan:   EXCEPTION tashlanadi ✅
                      "could not be translated"
```

```csharp
// ❌ Tarjima qilinmaydi — exception
await db.Payments
    .Where(p => MyCustomCheck(p.Amount))       // C# metodi
    .ToListAsync();

// ❌ Ba'zi metodlar tarjima qilinmaydi
.Where(p => p.CreatedAt.ToString("yyyy-MM") == "2026-08")

// ✅ SQL'ga tarjima qilinadigan shakl
.Where(p => p.CreatedAt >= start && p.CreatedAt < end)
```

## Deferred execution

```csharp
var query = db.Payments.Where(p => p.UserId == id);   // hali hech nima bo'lmadi

var list  = await query.ToListAsync();                 // ← so'rov 1
var count = await query.CountAsync();                  // ← so'rov 2 (yana!)

// ✅ Bir necha marta kerak bo'lsa — materiallashtiring
var payments = await query.ToListAsync();
var total = payments.Count;                            // xotirada, so'rovsiz
```

## Repository'dan nima qaytarish

```csharp
// ❌ IQueryable qaytarish — xavfli
public IQueryable<Payment> GetAll() => _db.Payments;
// Yuqori qatlam bexosdan tarjima qilinmaydigan ifoda yozadi
// yoki DbContext yopilgandan keyin enumerate qiladi

// ✅ Materiallashgan natija
public async Task<IReadOnlyList<Payment>> GetByUserAsync(Guid id, CancellationToken ct)
    => await _db.Payments.AsNoTracking()
                         .Where(p => p.UserId == id)
                         .ToListAsync(ct);

// ✅ Yoki spetsifikatsiya obyekti bilan — moslashuvchan, lekin nazorat ostida
public async Task<IReadOnlyList<Payment>> FindAsync(
    PaymentSpec spec, CancellationToken ct) { ... }
```

## Sahifalash

```csharp
// ✅ Skip/Take SQL'ga tushadi (LIMIT/OFFSET)
var page = await db.Payments
    .OrderBy(p => p.CreatedAt).ThenBy(p => p.Id)    // ⚠ BARQAROR tartib SHART
    .Skip(pageSize * pageIndex)
    .Take(pageSize)
    .ToListAsync();
```

```
   ⚠ OFFSET katta bo'lganda sekinlashadi (DB baribir hammasini skanerlaydi).
     Katta sahifalash uchun keyset pagination:

   WHERE (created_at, id) > (@lastCreatedAt, @lastId)
   ORDER BY created_at, id LIMIT 20
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `AsEnumerable()` / `ToList()` erta chaqirish | Butun jadval xotiraga |
| `IQueryable` ni repository'dan qaytarish | Nazoratsiz so'rovlar |
| Bir so'rovni bir necha marta enumerate qilish | Takroriy DB so'rovlari |
| `OrderBy` siz `Skip/Take` | Tartib kafolatlanmaydi |
| Katta `OFFSET` | Sekin sahifalash |
| C# metodini `Where` ichida ishlatish | Tarjima xatosi |

## Fintech konteksti

- **Tranzaksiyalar tarixi** — sahifalash keyset bilan, chunki foydalanuvchida
  millionlab yozuv bo'lishi mumkin.
- **Reconciliation** — `IQueryable` bilan filtrni DB'ga tushirish majburiy; xotiraga
  tortish mumkin emas.
- Repository'dan `IQueryable` qaytarmaslik — bu **arxitektura qoidasi**, chunki u
  yuqori qatlamga DB'ni nazoratsiz yuklash imkonini beradi.

## Intervyu savollari

**1. `IQueryable` va `IEnumerable` farqi nima?** ⭐

> `IQueryable` **ifoda daraxtini** quradi va uni provider (EF Core) SQL'ga tarjima
> qiladi — filtr, saralash va sahifalash **DB'da** bajariladi.
>
> `IEnumerable` esa delegat bilan **xotirada** ishlaydi — ma'lumot allaqachon
> yuklangan bo'lishi kerak.
>
> Amaliy oqibat: `AsEnumerable()` ni erta chaqirsangiz, `WHERE` C#ga tushadi va
> butun jadval xotiraga tortiladi.

**2. Client-side evaluation nima?**

> EF Core 3.0 gacha tarjima qilinmaydigan ifoda **jimgina** client tomonda
> bajarilardi — ya'ni ma'lumot yuklanib, keyin filtrlanardi. Bu yashirin falokat
> edi.
>
> 3.0 dan boshlab EF Core bunday holatda **exception** tashlaydi. Bu yaxshi
> o'zgarish: muammo development'da ko'rinadi.

**3. Repository'dan `IQueryable` qaytarasizmi?**

> Yo'q. Bu yuqori qatlamga DB ustidan nazoratsiz kirish beradi: u tarjima
> qilinmaydigan ifoda yozishi, `Include` unutishi yoki `DbContext` yopilgandan
> keyin enumerate qilishi mumkin.
>
> Men materiallashgan `IReadOnlyList<T>` qaytaraman, moslashuvchanlik kerak bo'lsa
> — spetsifikatsiya obyekti orqali.

**4. Katta jadvalda sahifalashni qanday qilasiz?**

> `Skip/Take` SQL'da `OFFSET/LIMIT` ga aylanadi, lekin katta `OFFSET` sekin: DB
> baribir o'sha qatorlarni skanerlaydi.
>
> Katta hajm uchun **keyset pagination**: `WHERE (created_at, id) > (@last...)`.
> U indeksdan to'g'ridan-to'g'ri foydalanadi va sahifa raqamidan qat'i nazar bir xil
> tez ishlaydi.
>
> Va `Skip/Take` bilan **barqaror tartib** majburiy — aks holda sahifalar orasida
> qatorlar takrorlanadi yoki tushib qoladi.

## Deliverable

```csharp
public class QueryableTests
{
    [Fact]
    public async Task AsEnumerable_LoadsEntireTable()
    {
        await SeedPayments(10_000);
        interceptor.Reset();

        _ = db.Payments.AsEnumerable().Where(p => p.AmountMinor > 100).ToList();

        Assert.DoesNotContain("WHERE", interceptor.LastSql);   // ⚠ filtr SQL'da yo'q
    }

    [Fact]
    public async Task Queryable_TranslatesWhereToSql()
    {
        interceptor.Reset();
        await db.Payments.Where(p => p.AmountMinor > 100).ToListAsync();

        Assert.Contains("WHERE", interceptor.LastSql);
    }

    [Fact]
    public async Task UntranslatableExpression_Throws()
        => await Assert.ThrowsAsync<InvalidOperationException>(() =>
               db.Payments.Where(p => CustomCheck(p.AmountMinor)).ToListAsync());

    [Fact]
    public async Task DeferredQuery_ExecutesTwice()
    {
        var query = db.Payments.Where(p => p.UserId == id);
        interceptor.Reset();

        await query.ToListAsync();
        await query.CountAsync();

        Assert.Equal(2, interceptor.QueryCount);
    }

    [Fact]
    public async Task KeysetPagination_IsStable()
    {
        var first = await GetPageAsync(after: null, size: 20);
        await InsertPaymentAtTop();                       // yangi yozuv qo'shildi
        var second = await GetPageAsync(after: first[^1], size: 20);

        Assert.Empty(first.Select(f => f.Id).Intersect(second.Select(s => s.Id)));
    }
}
```

## Xotira kartasi

```
IQueryable   ifoda daraxti → provider SQL'ga tarjima → DB'da bajariladi
IEnumerable  delegat → XOTIRADA bajariladi
Tuzoq        AsEnumerable()/ToList() erta → butun jadval xotiraga
Client-side  EF Core 3.0+ da EXCEPTION (avval jimgina bajarilardi)
Deferred     bir so'rovni ikki marta enumerate → ikki DB so'rovi
Repository   IQueryable QAYTARMANG → IReadOnlyList yoki spetsifikatsiya
Sahifalash   Skip/Take → OFFSET/LIMIT · BARQAROR tartib SHART
             katta hajm → KEYSET pagination (WHERE (col,id) > (...))
```

---

# 6.4 · Tranzaksiyalar va `SaveChanges`

## Nima va nega

`SaveChanges` **o'zi tranzaksiya ochadi** — bu ko'pchilik bilmaydigan fakt.

```
   await db.SaveChangesAsync();

   ┌────────────────────────────────────────────────┐
   │  BEGIN                                          │
   │    INSERT INTO payments ...                     │
   │    UPDATE accounts SET balance = ...            │
   │    INSERT INTO outbox ...                       │
   │  COMMIT                                          │
   └────────────────────────────────────────────────┘
        ↑
   Barcha kuzatilayotgan o'zgarishlar — BITTA tranzaksiyada
```

> Ya'ni bir `SaveChanges` ichidagi hamma narsa allaqachon atomik. Aniq tranzaksiya
> faqat **bir necha `SaveChanges`** yoki **raw SQL** bilan birlashtirish kerak
> bo'lganda ochiladi.

## Aniq tranzaksiya

```csharp
await using var tx = await db.Database.BeginTransactionAsync(ct);
try
{
    db.Payments.Add(payment);
    await db.SaveChangesAsync(ct);                    // 1-yozuv

    await db.Database.ExecuteSqlInterpolatedAsync($@"
        UPDATE accounts SET balance_minor = balance_minor - {amount}
        WHERE id = {accountId} AND balance_minor >= {amount}", ct);   // raw SQL

    db.Outbox.Add(new OutboxMessage("payment.completed", payment.Id));
    await db.SaveChangesAsync(ct);                    // 2-yozuv

    await tx.CommitAsync(ct);
}
catch
{
    await tx.RollbackAsync(ct);                       // (Dispose ham qiladi)
    throw;
}
```

> `Commit` chaqirilmasa, `Dispose` avtomatik `Rollback` qiladi — bu xavfsiz
> default (M1.8).

## Bulk operatsiyalar — EF Core 7+

```csharp
// ❌ Eski usul: 10 000 qatorni yuklab, o'zgartirib, saqlash
var stale = await db.Sessions.Where(s => s.LastSeen < cutoff).ToListAsync();
foreach (var s in stale) s.IsActive = false;
await db.SaveChangesAsync();
// → 10 000 entity tracker'da + 10 000 UPDATE

// ✅ ExecuteUpdate — bitta SQL
await db.Sessions
    .Where(s => s.LastSeen < cutoff)
    .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsActive, false), ct);
// → UPDATE sessions SET is_active = false WHERE last_seen < @cutoff

await db.Sessions.Where(s => s.ExpiredAt < cutoff).ExecuteDeleteAsync(ct);
```

```
   ⚠ ExecuteUpdate/ExecuteDelete change tracker'ni CHETLAB O'TADI:
     · tracker'dagi entity'lar eskirib qoladi
     · SaveChanges interceptor'lari ishlamaydi
     · audit/soft-delete mantiqi qo'llanmaydi

   → ular DARHOL bajariladi (SaveChanges kutmaydi)
   → aniq tranzaksiya ichida ishlatilishi mumkin
```

## Interceptor va `SaveChanges` override

```csharp
public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
{
    // Audit maydonlarini avtomatik to'ldirish
    foreach (var e in ChangeTracker.Entries<IAuditable>())
    {
        if (e.State == EntityState.Added)    e.Entity.CreatedAt = _clock.GetUtcNow();
        if (e.State == EntityState.Modified) e.Entity.UpdatedAt = _clock.GetUtcNow();
    }

    // Domen hodisalarini outbox'ga yozish — BIR TRANZAKSIYADA (M10.3)
    var events = ChangeTracker.Entries<IHasDomainEvents>()
        .SelectMany(e => e.Entity.PopEvents()).ToList();
    Outbox.AddRange(events.Select(OutboxMessage.From));

    return await base.SaveChangesAsync(ct);
}
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Har o'zgarish uchun alohida `SaveChanges` | Atomiklik yo'qoladi, sekin |
| `SaveChanges` uchun ortiqcha aniq tranzaksiya | Keraksiz kod |
| Tranzaksiya ichida tashqi API chaqiruvi | Qulflar ushlanadi (M5.1) |
| `ExecuteUpdate` dan keyin tracker'ga ishonish | Eskirgan ma'lumot |
| `Commit` ni unutish | `Dispose` rollback qiladi — ma'lumot yo'qoladi |
| Uzoq tranzaksiyada ko'p ish | Bloat va deadlock (M5.6, M5.7) |

## Fintech konteksti

- **Ledger + outbox bitta `SaveChanges` da** — bu outbox naqshining asosi
  (M10.3). Ikki alohida `SaveChanges` bo'lsa atomiklik buziladi.
- **Balans yangilanishi** — `ExecuteUpdate` bilan atomik shart qo'yish mumkin
  (M5.3), lekin natijani tekshirish shart: `affected == 0` → mablag' yetmadi.
- **Audit maydonlari** — `SaveChanges` override'da markazlashtirilgan holda
  to'ldiriladi, har joyda qo'lda emas.

## Intervyu savollari

**1. `SaveChanges` tranzaksiya ochadimi?**

> Ha — barcha kuzatilayotgan o'zgarishlarni **bitta tranzaksiyada** yozadi. Ya'ni
> bir `SaveChanges` ichidagi hamma narsa allaqachon atomik.
>
> Aniq tranzaksiya faqat bir necha `SaveChanges` ni yoki raw SQL bilan birlashtirish
> kerak bo'lganda ochiladi.

**2. `ExecuteUpdate` ni qachon ishlatasiz va tuzog'i nima?**

> Ko'p qatorni bir xil o'zgartirish kerak bo'lganda — u bitta SQL `UPDATE`
> generatsiya qiladi, entity'larni yuklamaydi.
>
> Tuzog'i: u **change tracker'ni chetlab o'tadi**. Tracker'dagi entity'lar eskirib
> qoladi, `SaveChanges` override'idagi audit mantiqi va interceptor'lar ishlamaydi.
>
> Shuning uchun soft-delete yoki audit talab qilinadigan joyda ehtiyot bo'lish kerak.

**3. Tranzaksiyani qanday to'g'ri yopasiz?**

> `await using` bilan — `Commit` chaqirilmasa `Dispose` avtomatik `Rollback`
> qiladi. Bu xavfsiz default: xato bo'lganda ma'lumot yozilmay qoladi.
>
> Va tranzaksiya **qisqa** bo'lishi kerak: ichida tashqi API chaqiruvi yoki uzoq
> hisob bo'lmasin, aks holda qulflar ushlanadi va deadlock ehtimoli oshadi.

**4. Domen hodisalarini qayerda yuborasiz?**

> `SaveChanges` override'ida ularni **outbox jadvaliga yozaman** — biznes
> o'zgarishi bilan bitta tranzaksiyada.
>
> Bu dual write muammosini hal qiladi (M10.2): agar hodisani broker'ga to'g'ridan-
> to'g'ri yuborsam, DB commit bo'lib broker yiqilishi mumkin va tizim nomuvofiq
> qoladi.

## Deliverable

```csharp
public class TransactionTests
{
    [Fact]
    public async Task SaveChanges_IsAtomicByItself()
    {
        db.Payments.Add(new Payment { AmountMinor = 1000 });
        db.Payments.Add(new Payment { AmountMinor = -1 });   // CHECK buziladi

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal(0, await db.Payments.CountAsync());     // BIRINCHISI HAM yo'q
    }

    [Fact]
    public async Task Transaction_RollsBackWithoutCommit()
    {
        var id = await SeedAccount(100_000);

        await using (var tx = await db.Database.BeginTransactionAsync())
        {
            await Withdraw(id, 50_000);
            // Commit YO'Q
        }

        Assert.Equal(100_000, await GetBalance(id));
    }

    [Fact]
    public async Task ExecuteUpdate_BypassesChangeTracker()
    {
        var account = await db.Accounts.FindAsync(id);       // tracker'da, balance=100000

        await db.Accounts.Where(a => a.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.BalanceMinor, 5000));

        Assert.Equal(100_000, account.BalanceMinor);         // ⚠ ESKIRGAN
        db.ChangeTracker.Clear();
        Assert.Equal(5000, (await db.Accounts.FindAsync(id))!.BalanceMinor);
    }

    [Fact]
    public async Task DomainEvents_AreWrittenToOutboxInSameTransaction()
    {
        var payment = Payment.Create(Money.FromMajor(1000m, Currency.Uzs));
        db.Payments.Add(payment);
        await db.SaveChangesAsync();

        Assert.Equal(1, await db.Outbox.CountAsync(o => o.Type == "payment.created"));
    }
}
```

## Xotira kartasi

```
SaveChanges  O'ZI tranzaksiya ochadi — ichidagi hamma narsa ATOMIK
Aniq tx      faqat bir necha SaveChanges yoki raw SQL birlashtirilganda
await using  Commit yo'q bo'lsa Dispose ROLLBACK qiladi (xavfsiz default)
ExecuteUpdate/Delete
             bitta SQL · entity yuklanmaydi · DARHOL bajariladi
             ⚠ change tracker'ni CHETLAB O'TADI → tracker eskiradi
             ⚠ interceptor va audit mantiqi ishlamaydi
Override     audit maydonlari + domen hodisalarini OUTBOX'ga (bir tranzaksiyada)
Qoida        tranzaksiya QISQA · ichida tashqi API YO'Q
```

---

# 6.5 · Concurrency token ⭐

## Nima va nega

Bu M5.5 (optimistic locking) ning EF Core'dagi amaliy tomoni. Ikki foydalanuvchi
bir yozuvni tahrirlasa — ikkinchisi birinchisining ishini bosib o'tmasligi kerak.

```
   Concurrency token'siz:

   A: SELECT balance=100000  →  UPDATE balance=90000   ✓
   B: SELECT balance=100000  →  UPDATE balance=80000   ✓ (A ning ishi YO'QOLDI)

   Concurrency token bilan:

   A: SELECT balance=100000, ver=7  →  UPDATE ... WHERE ver=7  →  1 qator ✓
   B: SELECT balance=100000, ver=7  →  UPDATE ... WHERE ver=7  →  0 QATOR ✗
                                        → DbUpdateConcurrencyException
```

## Sozlash

```csharp
// SQL Server — rowversion
public class Account
{
    public Guid Id { get; set; }
    public long BalanceMinor { get; set; }
    [Timestamp] public byte[] Version { get; set; } = null!;
}

// PostgreSQL — xmin tizim ustuni, qo'shimcha ustun KERAK EMAS
modelBuilder.Entity<Account>().UseXminAsConcurrencyToken();

// Universal — qo'lda
modelBuilder.Entity<Account>().Property(a => a.Version).IsConcurrencyToken();

// Yoki aniq maydonni token qilish (faqat u o'zgarganda konflikt)
modelBuilder.Entity<Account>().Property(a => a.BalanceMinor).IsConcurrencyToken();
```

## Konfliktni hal qilish

```csharp
public async Task<Result> WithdrawAsync(Guid id, long amount, CancellationToken ct)
{
    const int maxAttempts = 3;

    for (int attempt = 1; attempt <= maxAttempts; attempt++)
    {
        var account = await _db.Accounts.FindAsync([id], ct);
        if (account is null) return Result.Fail("Hisob topilmadi");

        if (account.BalanceMinor < amount)
            return Result.Fail("Mablag' yetarli emas");     // biznes rad — retry YO'Q

        account.BalanceMinor -= amount;

        try
        {
            await _db.SaveChangesAsync(ct);
            return Result.Ok();
        }
        catch (DbUpdateConcurrencyException)
        {
            _db.ChangeTracker.Clear();                       // ⚠ MAJBURIY
            if (attempt == maxAttempts) break;
            await Task.Delay(Backoff(attempt), ct);
        }
    }

    return Result.Fail("Tizim band — keyinroq urinib ko'ring");
}
```

## Uch strategiya

```csharp
catch (DbUpdateConcurrencyException ex)
{
    var entry = ex.Entries.Single();
    var dbValues = await entry.GetDatabaseValuesAsync(ct);

    if (dbValues is null) return Result.Fail("Yozuv o'chirilgan");

    // 1. DATABASE WINS — foydalanuvchiga yangi qiymat ko'rsatiladi
    entry.CurrentValues.SetValues(dbValues);
    entry.OriginalValues.SetValues(dbValues);

    // 2. CLIENT WINS — bizning qiymat ustun (ehtiyot bilan!)
    entry.OriginalValues.SetValues(dbValues);

    // 3. MERGE — maydon-maydon birlashtirish
    foreach (var prop in entry.Metadata.GetProperties()) { /* qoidaga ko'ra */ }
}
```

| Strategiya | Qachon |
|---|---|
| **Retry** | Pul operatsiyasi — lekin **idempotent** bo'lsa (M5.5) |
| **Database wins** | Forma tahriri — «ma'lumot o'zgardi, yangilang» |
| **Client wins** | ⚠ Kamdan-kam, ma'lumot yo'qotish xavfi |
| **Merge** | Turli maydonlar o'zgargan bo'lsa |

## Fintech'da nima ishlatiladi

```
   ┌──────────────────────────┬──────────────────────────────────┐
   │  Balans yechish          │  ❌ Concurrency token EMAS       │
   │                          │  ✅ Atomik UPDATE / FOR UPDATE   │
   │                          │     (M5.3) — konflikt tez-tez    │
   ├──────────────────────────┼──────────────────────────────────┤
   │  Profil, sozlamalar      │  ✅ Concurrency token            │
   │  Merchant konfiguratsiya │     konflikt kam                 │
   │  Hujjat tahriri          │     foydalanuvchi formada uzoq   │
   └──────────────────────────┴──────────────────────────────────┘
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `ChangeTracker.Clear()` qilmaslik | Retry eskirgan qiymat bilan qaytadi |
| Cheksiz retry | Konflikt ko'p bo'lsa tizim qotadi |
| Biznes rad javobini retry qilish | Ma'nosiz sikl |
| Retry'ni idempotent qilmaslik | **Ikki marta pul yechiladi** |
| Issiq balans uchun optimistic | Doimiy konflikt |
| Konfliktni foydalanuvchiga ko'rsatmaslik | U o'z ishini yo'qotadi |

## Intervyu savollari

**1. EF Core'da optimistic concurrency qanday ishlaydi?**

> Entity'da concurrency token bo'ladi — SQL Server'da `[Timestamp] rowversion`,
> PostgreSQL'da `xmin` tizim ustuni yoki qo'lda `int Version`.
>
> `SaveChanges` generatsiya qiladigan `UPDATE` ga `AND version = @original` sharti
> qo'shiladi. 0 qator ta'sirlangan bo'lsa — EF Core
> `DbUpdateConcurrencyException` tashlaydi.

**2. Konflikt bo'lganda nima qilasiz?**

> Tanlov **biznesga** bog'liq:
> - **Retry** — pul operatsiyasida, lekin faqat operatsiya idempotent bo'lsa.
> - **Database wins** — forma tahririda: foydalanuvchiga yangi qiymatni ko'rsatib,
>   qayta kiritishni so'rayman.
> - **Merge** — turli maydonlar o'zgargan bo'lsa.
>
> Va retry'da `ChangeTracker.Clear()` **majburiy**, aks holda EF eskirgan obyektni
> qayta yuboradi va sikl cheksiz aylanadi.

**3. Balans uchun concurrency token ishlatasizmi?** ⭐

> Yo'q. Issiq hisobda konflikt **tez-tez** bo'ladi va optimistic retry sikliga
> tushadi — throughput qulaydi.
>
> Balans uchun atomik `UPDATE ... WHERE balance >= @amt` yoki
> `SELECT ... FOR UPDATE` ishlataman (M5.3).
>
> Concurrency token esa konflikt kam bo'lgan joylarda to'g'ri: profil, sozlamalar,
> merchant konfiguratsiyasi.

**4. PostgreSQL'da `rowversion` yo'q. Nima qilasiz?**

> Ikki variant. `UseXminAsConcurrencyToken()` — PostgreSQL'ning `xmin` tizim
> ustunidan foydalanadi, qo'shimcha ustun kerak emas.
>
> Yoki oddiy `int Version` ustuni va uni `IsConcurrencyToken()` bilan belgilash —
> bu ochiqroq va DB'ga bog'liq emas.

## Deliverable

```csharp
public class ConcurrencyTokenTests
{
    [Fact]
    public async Task ConcurrentUpdate_ThrowsConcurrencyException()
    {
        var id = await SeedAccount(100_000);

        var a = await db1.Accounts.FindAsync(id);
        var b = await db2.Accounts.FindAsync(id);      // ikkalasi ham ver=N

        a!.BalanceMinor -= 30_000;
        await db1.SaveChangesAsync();                  // ✓

        b!.BalanceMinor -= 30_000;
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(
            () => db2.SaveChangesAsync());             // ✗

        Assert.Equal(70_000, await GetBalance(id));    // faqat BITTA yechish
    }

    [Fact]
    public async Task RetryLoop_NeverDoubleWithdraws()
    {
        var id = await SeedAccount(100_000);

        var results = await Task.WhenAll(
            Enumerable.Range(0, 5).Select(_ => WithdrawWithRetry(id, 10_000)));

        Assert.Equal(5, results.Count(r => r.IsSuccess));
        Assert.Equal(50_000, await GetBalance(id));    // aynan 5 × 10 000
    }

    [Fact]
    public async Task BusinessRejection_IsNotRetried()
    {
        var id = await SeedAccount(1_000);
        interceptor.Reset();

        var result = await WithdrawWithRetry(id, 50_000);

        Assert.False(result.IsSuccess);
        Assert.Equal(1, interceptor.SaveAttempts);     // retry BO'LMADI
    }

    [Fact]
    public async Task DatabaseWins_ShowsCurrentValue()
    {
        var (entry, dbValues) = await ProvokeConflictAsync();
        entry.CurrentValues.SetValues(dbValues);

        Assert.Equal(await GetBalance(id), entry.Entity.BalanceMinor);
    }
}
```

## Xotira kartasi

```
Mexanizm     UPDATE ... WHERE version = @original → 0 qator = konflikt
             → DbUpdateConcurrencyException
SQL Server   [Timestamp] byte[] Version (rowversion)
PostgreSQL   UseXminAsConcurrencyToken() — qo'shimcha ustun kerak emas
Universal    int Version + IsConcurrencyToken()
Strategiya   retry (idempotent bo'lsa) · database wins (forma) · merge
MAJBURIY     retry'dan oldin ChangeTracker.Clear()
             biznes rad javobini RETRY QILMANG
FINTECH ⭐    balans → concurrency token EMAS → atomik UPDATE/FOR UPDATE (M5.3)
             profil/sozlama/merchant konfiguratsiya → token TO'G'RI
```

---

# 6.6 · Migratsiyalar va konfiguratsiya

## Nima va nega

M5.13 zero-downtime migratsiyaning **DB tomonini** ko'rsatdi. Bu yerda —
EF Core tomoni: konfiguratsiya qanday yoziladi va migratsiya qanday boshqariladi.

## Konfiguratsiya — `IEntityTypeConfiguration`

```csharp
public sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> b)
    {
        b.ToTable("payments");
        b.HasKey(p => p.Id);

        // ⚠ decimal uchun precision ANIQ ko'rsatilishi SHART (M4.2)
        b.Property(p => p.Amount).HasPrecision(19, 4).IsRequired();

        // Money value object — ikki ustunga yoyish
        b.OwnsOne(p => p.Total, m => {
            m.Property(x => x.Minor).HasColumnName("amount_minor").IsRequired();
            m.Property(x => x.Currency)
             .HasConversion(c => c.Code, code => Currency.FromCode(code))
             .HasColumnName("currency").HasMaxLength(3).IsRequired();
        });

        // Enum → satr (int emas: DB'da o'qilishi oson va tartib o'zgarmaydi)
        b.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);

        // Vaqt — timestamptz (M4.7)
        b.Property(p => p.OccurredAt).HasColumnType("timestamptz");

        b.HasIndex(p => new { p.UserId, p.OccurredAt });
        b.HasIndex(p => p.IdempotencyKey).IsUnique();

        b.ToTable(t => t.HasCheckConstraint("chk_amount_positive", "amount_minor > 0"));
    }
}

// Ro'yxatdan o'tkazish
protected override void OnModelCreating(ModelBuilder mb)
    => mb.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
```

> Atributlar (`[Precision]`, `[Required]`) o'rniga **Fluent API** afzal: domen
> modeli infratuzilma detallaridan toza qoladi.

## Migratsiya ish oqimi

```bash
# Yaratish
dotnet ef migrations add AddIdempotencyKey

# ⚠ HAR DOIM generatsiya qilingan kodni O'QING
# EF ba'zan ustunni DROP+ADD qiladi — bu ma'lumot yo'qotish

# SQL skriptini olish (production uchun)
dotnet ef migrations script --idempotent -o migration.sql

# Bekor qilish (hali qo'llanmagan bo'lsa)
dotnet ef migrations remove
```

```
   ⚠ Production'da NIMA QILINMAYDI:

   ❌ app.Migrate() ni Program.cs da chaqirish
      · bir necha instance parallel migratsiya qiladi
      · migratsiya sekin bo'lsa health check yiqiladi
      · rollback imkoni yo'q

   ✅ Migratsiya = ALOHIDA deploy qadami
      · init container / deploy job
      · yoki --idempotent skript, DBA tomonidan qo'llanadi
```

## `Down` migratsiyasi

```csharp
protected override void Down(MigrationBuilder mb)
    => mb.DropColumn("idempotency_key", "payments");
```

> `Down` **har doim yozilsin** — u rollback rejasining bir qismi. Lekin amalda
> ma'lumot yo'qotmaslik uchun ko'pincha «forward fix» (yangi migratsiya) afzal.

## Seed ma'lumoti

```csharp
// ✅ Ma'lumotnomalar uchun — HasData (migratsiyaga tushadi)
mb.Entity<Currency>().HasData(
    new { Code = "UZS", Exponent = 2 },
    new { Code = "USD", Exponent = 2 },
    new { Code = "JPY", Exponent = 0 });

// ❌ Test ma'lumoti uchun HasData ISHLATMANG — u migratsiyaga tushadi
//    va production'ga ham boradi
```

## Konfiguratsiyani tekshirish

```csharp
// Model va DB sxemasi mos kelmasa — build'da ushlanadi
[Fact]
public void Model_HasNoPendingModelChanges()
{
    var differences = db.Database.GetService<IMigrationsModelDiffer>()
        .GetDifferences(lastMigrationModel, db.Model);

    Assert.Empty(differences);      // "migratsiya yaratishni unutdingiz"
}
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `decimal` uchun precision ko'rsatmaslik | Qiymat jimgina kesiladi |
| Migratsiya kodini o'qimaslik | DROP+ADD → ma'lumot yo'qoladi |
| `app.Migrate()` production'da | Parallel migratsiya, health check muammosi |
| Enum'ni `int` sifatida saqlash | Tartib o'zgarsa ma'lumot buziladi |
| `Down` yozmaslik | Rollback imkonsiz |
| Test ma'lumotini `HasData` bilan | Production'ga tushadi |
| `timestamp` (zonasiz) ishlatish | Vaqt zonasi yo'qoladi (M4.7) |

## Fintech konteksti

- **`decimal` precision** — `HasPrecision(19, 4)` yozilmasa summa kesiladi. Bu
  M4.2 dagi eng jimgina xato.
- **Enum satr sifatida** — `PaymentStatus.Completed` DB'da `"Completed"` bo'lib
  yozilsa, hisobot va debug osonlashadi va enum tartibi o'zgarsa ma'lumot
  buzilmaydi.
- **Migratsiya audit** — kim, qachon qo'llagani yozib boriladi
  (`__EFMigrationsHistory` yetarli emas, alohida audit kerak).

## Intervyu savollari

**1. `decimal` uchun precision nega muhim?**

> Ko'rsatilmasa ba'zi provayderlarda default `decimal(18,2)` bo'ladi va qiymat
> **ogohlantirishsiz kesiladi**.
>
> Fintech'da bu jimgina pul yo'qotish: `1234.5678` saqlab, `1234.57` qaytadi.
>
> Shuning uchun `HasPrecision(19, 4)` har doim aniq yoziladi va bu test bilan
> tekshiriladi (round-trip testi).

**2. Migratsiyani production'da qanday qo'llaysiz?**

> **Alohida deploy qadami** sifatida — init container, deploy job yoki
> `--idempotent` skript.
>
> `app.Migrate()` ni `Program.cs` da chaqirmayman: bir necha instance parallel
> migratsiya qilishga urinadi, migratsiya sekin bo'lsa health check yiqiladi va
> pod o'ldiriladi.
>
> Va generatsiya qilingan migratsiya kodini **albatta o'qiyman** — EF ba'zan
> ustunni `DROP` + `ADD` qiladi, bu ma'lumot yo'qotish demak.

**3. Enum'ni qanday saqlaysiz?**

> **Satr sifatida** — `HasConversion<string>()`.
>
> `int` bo'lsa: DB'ni qo'lda o'qish qiyin, hisobotlarda raqam ko'rinadi, va eng
> xavflisi — enum a'zolari tartibi o'zgarsa mavjud ma'lumot **jimgina noto'g'ri**
> talqin qilinadi.
>
> Narxi: bir oz ko'proq joy va indeks — moliyaviy tizimda bu masala emas.

**4. Model va DB sxemasi mos kelmasa qanday bilasiz?**

> Test yozaman: `IMigrationsModelDiffer` bilan oxirgi migratsiya modeli va joriy
> modelni solishtiraman. Farq bo'lsa — «migratsiya yaratishni unutdingiz» degani.
>
> Bu CI'da ishlaydi va odatiy xatoni erta ushlaydi.

## Deliverable

```csharp
public class ConfigurationTests
{
    [Fact]
    public async Task Decimal_PreservesFullPrecision()
    {
        var payment = new Payment { Amount = 1234.5678m };
        db.Add(payment); await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var loaded = await db.Payments.FindAsync(payment.Id);
        Assert.Equal(1234.5678m, loaded!.Amount);    // HasPrecision yo'q bo'lsa SINADI
    }

    [Fact]
    public async Task Enum_IsStoredAsString()
    {
        db.Add(new Payment { Status = PaymentStatus.Completed });
        await db.SaveChangesAsync();

        var raw = await RawSqlScalarAsync<string>("SELECT status FROM payments LIMIT 1");
        Assert.Equal("Completed", raw);
    }

    [Fact]
    public async Task Money_MapsToTwoColumns()
    {
        db.Add(new Payment { Total = Money.FromMajor(1000.50m, Currency.Uzs) });
        await db.SaveChangesAsync();

        var minor = await RawSqlScalarAsync<long>("SELECT amount_minor FROM payments LIMIT 1");
        var ccy   = await RawSqlScalarAsync<string>("SELECT currency FROM payments LIMIT 1");

        Assert.Equal(100_050, minor);
        Assert.Equal("UZS", ccy);
    }

    [Fact]
    public void NoPendingModelChanges()
        => Assert.False(db.Database.HasPendingModelChanges());   // EF Core 8+
}
```

## Xotira kartasi

```
Fluent API   IEntityTypeConfiguration<T> — domen modeli toza qoladi
decimal      HasPrecision(19, 4) ANIQ yozilsin — aks holda JIMGINA kesiladi
Money        OwnsOne → amount_minor + currency ikki ustun
Enum         HasConversion<string>() — int EMAS (tartib o'zgarsa buziladi)
Vaqt         HasColumnType("timestamptz") (M4.7)
Migratsiya   generatsiya qilingan kodni O'QING (DROP+ADD → ma'lumot yo'qoladi)
             --idempotent skript · Down HAR DOIM yozilsin
Production   app.Migrate() ISHLATMANG → ALOHIDA deploy qadami
HasData      faqat ma'lumotnomalar · test ma'lumoti UCHUN EMAS
Tekshiruv    HasPendingModelChanges() testi CI'da
```

---

# 6.7 · Repository va Unit of Work

## Nima va nega

Klassik savol: «EF Core allaqachon Repository va Unit of Work — ustiga yana
qo'shish kerakmi?»

```
   ┌──────────────────────────────────────────────────────────┐
   │  DbSet<T>      ≈  Repository                             │
   │  DbContext     ≈  Unit of Work                           │
   └──────────────────────────────────────────────────────────┘

   Ya'ni ularni takrorlash — ko'pincha ORTIQCHA QATLAM.
```

## Anti-naqsh — generic repository

```csharp
// ❌ Bu deyarli har doim zarar
public interface IRepository<T> where T : class
{
    IQueryable<T> Query();                    // ← IQueryable qaytaryapti (6.3)
    Task<T?> GetByIdAsync(object id);
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    Task SaveAsync();                         // ← UoW ni buzadi
}
```

Muammolari:

```
   1. IQueryable qaytaradi → abstraksiya ma'nosiz (EF baribir ochiq)
   2. Har repository o'z SaveAsync qiladi → ATOMIKLIK YO'QOLADI
   3. Include, AsSplitQuery, proyeksiya — hech biri sig'maydi
   4. Test uchun ham foydasi kam (Testcontainers yaxshiroq — 6.9)
   5. Kod ikki barobar, ma'no qo'shilmaydi
```

## Qachon repository **oqlanadi**

```csharp
// ✅ Aggregate-specific repository — DDD ma'nosida
public interface IAccountRepository
{
    Task<Account?> GetForUpdateAsync(Guid id, CancellationToken ct);   // FOR UPDATE
    Task<Account?> GetByNumberAsync(AccountNumber number, CancellationToken ct);
    void Add(Account account);
}

public sealed class AccountRepository(AppDbContext db) : IAccountRepository
{
    public async Task<Account?> GetForUpdateAsync(Guid id, CancellationToken ct)
        => await db.Accounts
            .FromSqlInterpolated($"SELECT * FROM accounts WHERE id = {id} FOR UPDATE")
            .Include(a => a.Entries)
            .FirstOrDefaultAsync(ct);

    public void Add(Account account) => db.Accounts.Add(account);
    // ⚠ SaveChanges YO'Q — u UoW ning ishi
}
```

```
   Farq nimada:

   ❌ Generic:  IRepository<Payment>, IRepository<Account>, IRepository<User>
                → CRUD o'rami, ma'no yo'q

   ✅ Aggregate: IAccountRepository
                → DOMEN tilida: GetForUpdate, GetByNumber
                → agregat chegarasini himoya qiladi (M9.5)
                → qulflash strategiyasi ichida yashiringan
```

## Unit of Work

```csharp
// ✅ SaveChanges'ni bitta joyga chiqarish
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task<IDisposable> BeginTransactionAsync(CancellationToken ct = default);
}

// Ishlatilishi — bitta tranzaksiya, bir necha repository
public async Task<Result> TransferAsync(Guid from, Guid to, Money amount, CancellationToken ct)
{
    var source = await _accounts.GetForUpdateAsync(from, ct);
    var target = await _accounts.GetForUpdateAsync(to, ct);

    var result = source.Withdraw(amount);
    if (!result.IsSuccess) return result;
    target.Deposit(amount);

    await _uow.SaveChangesAsync(ct);        // ← BITTA tranzaksiya
    return Result.Ok();
}
```

## Qaror jadvali

| Holat | Tavsiya |
|---|---|
| Oddiy CRUD ilova | ❌ Repository kerak emas — `DbContext` to'g'ridan-to'g'ri |
| DDD, agregatlar bor | ✅ Aggregate-specific repository |
| Bir necha ma'lumot manbai (DB + Dapper + API) | ✅ Repository — abstraksiya real |
| Unit test uchun mock kerak | ⚠ Testcontainers yaxshiroq (6.9) |
| Generic `IRepository<T>` | ❌ Deyarli har doim anti-naqsh |

## Tipik xatolar

| Xato | Natija |
|---|---|
| Generic repository | Ortiqcha qatlam, foyda yo'q |
| Repository'dan `IQueryable` | Abstraksiya ma'nosiz (6.3) |
| Har repository'da `SaveChanges` | Atomiklik yo'qoladi |
| Repository'ni faqat mock uchun qo'shish | Testlar mock'ni tekshiradi, kodni emas |
| `DbContext` ni to'g'ridan-to'g'ri controller'da | Biznes mantiq tarqaladi |

## Fintech konteksti

- **`IAccountRepository`** oqlanadi: u `FOR UPDATE` bilan qulflash strategiyasini
  ichiga yashiradi. Chaqiruvchi «hisobni o'zgartirish uchun oldim» deydi, qanday
  qulflanganini bilishi shart emas.
- **Domen mantiqi** entity ichida bo'lsin: `account.Withdraw(amount)` invariantni
  himoya qiladi, servis esa faqat orkestratsiya qiladi.
- `SaveChanges` **application service** darajasida — bu tranzaksiya chegarasi.

## Intervyu savollari

**1. EF Core ustiga Repository qo'shasizmi?** ⭐

> **Generic `IRepository<T>` — yo'q.** `DbSet<T>` allaqachon repository,
> `DbContext` esa Unit of Work. Uni takrorlash ortiqcha qatlam beradi va
> `Include`, proyeksiya, `AsSplitQuery` kabi imkoniyatlarni yo'qotadi.
>
> **Aggregate-specific repository — ha**, agar DDD ishlatilayotgan bo'lsa.
> `IAccountRepository.GetForUpdateAsync` domen tilida gapiradi va qulflash
> strategiyasini ichiga yashiradi.
>
> Farq: birinchisi CRUD o'rami, ikkinchisi domen chegarasi.

**2. Repository'dan nima qaytarasiz?**

> Materiallashgan natija — `IReadOnlyList<T>` yoki agregat obyekti. **`IQueryable`
> emas** (6.3), chunki u abstraksiyani ma'nosiz qiladi: yuqori qatlam baribir EF
> semantikasiga bog'lanadi va nazoratsiz so'rov yozishi mumkin.

**3. `SaveChanges` ni qayerda chaqirasiz?**

> **Application service** darajasida, repository ichida emas. Repository faqat
> entity'larni qo'shadi/o'zgartiradi, tranzaksiya chegarasini esa servis
> belgilaydi.
>
> Aks holda bir necha repository har biri o'z `SaveChanges` ini chaqiradi va
> atomiklik yo'qoladi — pul bir hisobdan chiqib, ikkinchisiga kirmasligi mumkin.

**4. Repository'ni test uchun qo'shish oqlanadimi?**

> Kamdan-kam. Repository'ni mock qilgan test **mock'ning xatti-harakatini**
> tekshiradi, haqiqiy SQL'ni emas — ya'ni N+1, tarjima xatosi, constraint buzilishi
> ko'rinmaydi.
>
> Fintech'da men Testcontainers bilan **real PostgreSQL**da test qilaman (6.9) —
> u concurrency va constraint'larni ham tekshiradi.

## Deliverable

```csharp
public class RepositoryTests
{
    [Fact]
    public async Task GetForUpdate_LocksRow()
    {
        var id = await SeedAccount(100_000);

        await using var tx1 = await db1.Database.BeginTransactionAsync();
        await repo1.GetForUpdateAsync(id, default);          // qulf olindi

        var sw = Stopwatch.StartNew();
        var blocked = Task.Run(async () => {
            await using var tx2 = await db2.Database.BeginTransactionAsync();
            await repo2.GetForUpdateAsync(id, default);      // kutadi
            return sw.ElapsedMilliseconds;
        });

        await Task.Delay(300);
        await tx1.CommitAsync();

        Assert.True(await blocked >= 300);
    }

    [Fact]
    public async Task Transfer_IsAtomic()
    {
        var (from, to) = await SeedAccounts(100_000, 0);

        await Assert.ThrowsAsync<DbUpdateException>(
            () => service.TransferAsync(from, to, TooMuch, default));

        Assert.Equal(100_000, await GetBalance(from));   // ikkalasi ham
        Assert.Equal(0,       await GetBalance(to));     // o'zgarmagan
    }

    [Fact]
    public async Task Repository_DoesNotExposeQueryable()
    {
        var method = typeof(IAccountRepository).GetMethods()
            .FirstOrDefault(m => m.ReturnType.Name.Contains("IQueryable"));

        Assert.Null(method);        // arxitektura qoidasi testda
    }
}
```

## Xotira kartasi

```
Fakt         DbSet<T> ≈ Repository · DbContext ≈ Unit of Work
Generic repo ❌ ANTI-NAQSH — CRUD o'rami, Include/proyeksiya yo'qoladi
             IQueryable qaytarsa abstraksiya MA'NOSIZ
Aggregate repo ✅ DDD'da — IAccountRepository.GetForUpdateAsync
             domen tilida gapiradi · qulflash strategiyasini yashiradi
SaveChanges  APPLICATION SERVICE darajasida, repository ichida EMAS
             aks holda atomiklik yo'qoladi
Test uchun   mock ❌ (mock'ni tekshiradi) → Testcontainers ✅ (6.9)
Fintech      account.Withdraw() invariantni himoya qiladi
             servis faqat orkestratsiya qiladi
```

---

# 6.8 · Dapper va raw SQL

## Nima va nega

EF Core hamma narsa uchun mos emas. Ba'zi joylarda **SQL to'g'ridan-to'g'ri
yozilgani yaxshiroq** — va buni tan olish yetuklik belgisi.

```
   ┌─────────────────────────┬──────────────────────────────────┐
   │  EF Core                │  Dapper / raw SQL                │
   ├─────────────────────────┼──────────────────────────────────┤
   │  CRUD, agregatlar       │  Murakkab hisobot so'rovlari     │
   │  Change tracking        │  Window function, CTE, recursive │
   │  Migratsiyalar          │  Bulk operatsiyalar              │
   │  Domen modeli           │  Aniq nazorat kerak bo'lgan joy  │
   │  Concurrency token      │  Ishlash tezligi kritik          │
   └─────────────────────────┴──────────────────────────────────┘
```

## EF Core ichida raw SQL

```csharp
// ✅ Parametrlangan — SQL injection'dan himoyalangan
var payments = await db.Payments
    .FromSqlInterpolated($@"
        SELECT * FROM payments
        WHERE user_id = {userId} AND amount_minor > {threshold}")
    .AsNoTracking()
    .ToListAsync(ct);

// Natija entity emas bo'lsa
var summary = await db.Database
    .SqlQuery<DailySummary>($@"
        SELECT date_trunc('day', occurred_at) AS day,
               count(*) AS count,
               sum(amount_minor) AS total_minor
        FROM   payments
        WHERE  occurred_at >= {from}
        GROUP  BY 1 ORDER BY 1")
    .ToListAsync(ct);

// Qaytarmaydigan amal
var affected = await db.Database.ExecuteSqlInterpolatedAsync($@"
    UPDATE accounts SET balance_minor = balance_minor - {amount}
    WHERE id = {id} AND balance_minor >= {amount}", ct);
```

> `FromSqlInterpolated` va `ExecuteSqlInterpolated` interpolyatsiyani
> **parametrlarga** aylantiradi. `FromSqlRaw` bilan satr yopishtirish esa
> **SQL injection** beradi.

## Dapper

```csharp
public sealed class ReportQueries(NpgsqlDataSource dataSource)
{
    public async Task<IReadOnlyList<MerchantReport>> GetTopMerchantsAsync(
        DateOnly day, int limit, CancellationToken ct)
    {
        const string sql = """
            SELECT m.name                       AS MerchantName,
                   count(*)                     AS TransactionCount,
                   sum(p.amount_minor)          AS TotalMinor,
                   rank() OVER (ORDER BY sum(p.amount_minor) DESC) AS Rank
            FROM   payments p
            JOIN   merchants m ON m.id = p.merchant_id
            WHERE  p.occurred_at >= @From AND p.occurred_at < @To
            GROUP  BY m.name
            ORDER  BY TotalMinor DESC
            LIMIT  @Limit
            """;

        await using var conn = await dataSource.OpenConnectionAsync(ct);
        var rows = await conn.QueryAsync<MerchantReport>(
            new CommandDefinition(sql,
                new { From = day.ToDateTime(TimeOnly.MinValue), To = ..., Limit = limit },
                cancellationToken: ct));

        return rows.ToList();
    }
}
```

## Ikkalasini birga ishlatish

```
   ┌──────────────────────────────────────────────────────────┐
   │  YOZISH tomoni  →  EF Core                               │
   │  · domen modeli, invariantlar, tranzaksiyalar            │
   │  · concurrency token, migratsiyalar                      │
   ├──────────────────────────────────────────────────────────┤
   │  O'QISH tomoni  →  Dapper                                │
   │  · hisobotlar, ro'yxatlar, agregatsiyalar                │
   │  · aniq SQL nazorati                                      │
   └──────────────────────────────────────────────────────────┘

   Bu — CQRS ning yengil shakli (M9.8), alohida DB kerak emas.
```

```csharp
// Bir tranzaksiyada ikkalasini ishlatish
await using var tx = await db.Database.BeginTransactionAsync(ct);
var conn = db.Database.GetDbConnection();
var dbTx = db.Database.CurrentTransaction!.GetDbTransaction();

await conn.ExecuteAsync("UPDATE ... ", param, dbTx);   // Dapper o'sha tranzaksiyada
db.Payments.Add(payment);
await db.SaveChangesAsync(ct);

await tx.CommitAsync(ct);
```

## SQL injection

```csharp
// ❌ FALOKAT
var sql = $"SELECT * FROM users WHERE name = '{name}'";
await db.Database.ExecuteSqlRawAsync(sql);
// name = "'; DROP TABLE users; --"

// ✅ Parametrlangan
await db.Database.ExecuteSqlRawAsync(
    "SELECT * FROM users WHERE name = {0}", name);

// ✅ Interpolated (avtomatik parametrlanadi)
await db.Database.ExecuteSqlInterpolatedAsync($"SELECT * FROM users WHERE name = {name}");

// ⚠ Jadval/ustun nomini parametrlab bo'lmaydi
// → oq ro'yxat (whitelist) bilan tekshiring
var allowed = new[] { "created_at", "amount_minor" };
if (!allowed.Contains(sortColumn)) throw new ArgumentException(nameof(sortColumn));
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `FromSqlRaw` bilan satr yopishtirish | **SQL injection** |
| Hamma joyda Dapper («tezroq») | Domen modeli va invariantlar yo'qoladi |
| Hamma joyda EF («abstraksiya») | Murakkab hisobotlar sekin va o'qilmaydi |
| Raw SQL'da tranzaksiyani uzatmaslik | Alohida tranzaksiyada bajariladi |
| Ustun nomlarini parametrlashga urinish | Ishlamaydi — whitelist kerak |
| Raw SQL uchun test yozmaslik | Sxema o'zgarganda jimgina sinadi |

## Fintech konteksti

- **Ledger yozuvlari** — EF Core: invariant va tranzaksiya muhim.
- **Kunlik hisobot, reconciliation** — Dapper: window function, CTE, aniq nazorat.
- **Balans yechish** — `ExecuteSqlInterpolated` bilan atomik `UPDATE` (M5.3);
  EF ning change tracker'i bu yerda kerak emas.

## Intervyu savollari

**1. EF Core va Dapper — qaysi birini tanlaysiz?**

> Ikkalasini, turli maqsadlar uchun.
>
> **Yozish tomoni** — EF Core: domen modeli, invariantlar, tranzaksiyalar,
> concurrency token, migratsiyalar.
>
> **O'qish tomoni** — Dapper: hisobotlar, agregatsiyalar, window function'lar.
> U yerda EF ning LINQ tarjimasi ham sekin, ham o'qilmaydigan SQL beradi.
>
> Bu CQRS ning yengil shakli — alohida DB yoki infratuzilma kerak emas.

**2. Raw SQL'ni xavfsiz qanday yozasiz?**

> Har doim **parametrlangan**: `FromSqlInterpolated` yoki
> `ExecuteSqlInterpolated` — ular interpolyatsiyani avtomatik parametrga
> aylantiradi.
>
> `FromSqlRaw` bilan satr yopishtirish — SQL injection.
>
> Va muhim cheklov: **jadval yoki ustun nomini parametrlab bo'lmaydi**. Dinamik
> saralash kerak bo'lsa — oq ro'yxat bilan tekshiraman.

**3. Dapper va EF'ni bir tranzaksiyada ishlatib bo'ladimi?**

> Ha. `db.Database.GetDbConnection()` va `CurrentTransaction.GetDbTransaction()`
> orqali Dapper'ga o'sha ulanish va tranzaksiyani uzataman.
>
> Uzatilmasa Dapper alohida ulanish oladi va **boshqa tranzaksiyada** ishlaydi —
> bu atomiklikni buzadi va jimgina noto'g'ri natija beradi.

## Deliverable

```csharp
public class RawSqlTests
{
    [Fact]
    public async Task InterpolatedSql_IsParameterized()
    {
        var name = "'; DROP TABLE payments; --";
        var result = await db.Users
            .FromSqlInterpolated($"SELECT * FROM users WHERE name = {name}")
            .ToListAsync();

        Assert.Empty(result);
        Assert.True(await TableExistsAsync("payments"));    // jadval joyida
    }

    [Fact]
    public async Task AtomicUpdate_ReturnsAffectedRows()
    {
        var id = await SeedAccount(100_000);

        var ok = await db.Database.ExecuteSqlInterpolatedAsync($@"
            UPDATE accounts SET balance_minor = balance_minor - {80_000}
            WHERE id = {id} AND balance_minor >= {80_000}");
        Assert.Equal(1, ok);

        var fail = await db.Database.ExecuteSqlInterpolatedAsync($@"
            UPDATE accounts SET balance_minor = balance_minor - {80_000}
            WHERE id = {id} AND balance_minor >= {80_000}");
        Assert.Equal(0, fail);                              // mablag' yetmadi
    }

    [Fact]
    public async Task Dapper_ParticipatesInEfTransaction()
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var conn = db.Database.GetDbConnection();
        var dbTx = db.Database.CurrentTransaction!.GetDbTransaction();

        await conn.ExecuteAsync("INSERT INTO audit_log (message) VALUES (@m)",
                                new { m = "test" }, dbTx);
        await tx.RollbackAsync();

        Assert.Equal(0, await db.Database.SqlQuery<int>(
            $"SELECT count(*)::int AS Value FROM audit_log").SingleAsync());
    }

    [Fact]
    public async Task ReportQuery_MatchesEfResult()
    {
        await SeedRandomPayments(1000);

        var viaDapper = await reportQueries.GetTotalAsync(day, default);
        var viaEf = await db.Payments.Where(p => p.OccurredAt.Date == day)
                                     .SumAsync(p => p.AmountMinor);

        Assert.Equal(viaEf, viaDapper);          // ikki yo'l bir xil natija
    }
}
```

## Xotira kartasi

```
Bo'linish    YOZISH → EF Core (domen, invariant, tranzaksiya, migratsiya)
             O'QISH → Dapper (hisobot, agregatsiya, window function)
             = CQRS ning yengil shakli, alohida DB kerak emas
Xavfsizlik   FromSqlInterpolated / ExecuteSqlInterpolated → avtomatik parametr
             FromSqlRaw + satr yopishtirish = SQL INJECTION
Cheklov      jadval/ustun nomini parametrlab BO'LMAYDI → whitelist
Birgalikda   GetDbConnection() + CurrentTransaction.GetDbTransaction()
             uzatilmasa Dapper BOSHQA tranzaksiyada ishlaydi
Fintech      ledger → EF · reconciliation/hisobot → Dapper
             balans yechish → ExecuteSqlInterpolated atomik UPDATE
```

---

# 6.9 · Testcontainers bilan test ⭐

## Nima va nega

`InMemory` provider **haqiqiy DB emas**. U tranzaksiyalarni, constraint'larni,
qulflarni va SQL tarjimasini tekshirmaydi — ya'ni fintech'da eng muhim narsalarni.

```
   ┌──────────────────────┬──────────────────────────────────────┐
   │  Nimani tekshiradi   │  InMemory   SQLite    Testcontainers │
   ├──────────────────────┼──────────────────────────────────────┤
   │  LINQ tarjimasi      │     ❌         ⚠            ✅        │
   │  Constraint (CHECK)  │     ❌         ⚠            ✅        │
   │  Tranzaksiya         │     ❌         ✅            ✅        │
   │  Qulflar, FOR UPDATE │     ❌         ❌            ✅        │
   │  Isolation levels    │     ❌         ❌            ✅        │
   │  Lost update testi   │     ❌         ❌            ✅        │
   │  Postgres tiplari    │     ❌         ❌            ✅        │
   │  Tezlik              │     ✅         ✅            ⚠        │
   └──────────────────────┴──────────────────────────────────────┘
```

> Fintech'da **Testcontainers** — yagona to'g'ri tanlov. Concurrency testi
> (M5.3) faqat real DB'da yoziladi.

## Sozlash

```csharp
public sealed class PostgresFixture : IAsyncLifetime
{
    public PostgreSqlContainer Container { get; } = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("fintech_test")
        .WithCleanUp(true)
        .Build();

    public string ConnectionString => Container.GetConnectionString();

    public async Task InitializeAsync()
    {
        await Container.StartAsync();

        await using var db = CreateContext();
        await db.Database.MigrateAsync();       // ⚠ EnsureCreated EMAS
    }

    public AppDbContext CreateContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
                   .UseNpgsql(ConnectionString).Options);

    public Task DisposeAsync() => Container.DisposeAsync().AsTask();
}

[CollectionDefinition("postgres")]
public sealed class PostgresCollection : ICollectionFixture<PostgresFixture>;
```

> `MigrateAsync` ishlatiladi — `EnsureCreatedAsync` migratsiyalarni chetlab o'tadi
> va sxema production'dagidan farq qilishi mumkin.

## Izolyatsiya strategiyalari

```
   ┌─ 1. Har test → tranzaksiya + rollback ────────────────────┐
   │  ✅ Eng tez                                                │
   │  ❌ Tranzaksiya xatti-harakatini test qilib bo'lmaydi     │
   ├─ 2. Har test → TRUNCATE ─────────────────────────────────┤
   │  ✅ Toza holat, tranzaksiya testlari ishlaydi             │
   │  ⚠ Biroz sekinroq                                         │
   ├─ 3. Har test → yangi konteyner ──────────────────────────┤
   │  ✅ To'liq izolyatsiya                                     │
   │  ❌ Juda sekin                                             │
   └───────────────────────────────────────────────────────────┘

   Fintech uchun: 2-variant (concurrency testlari kerak)
```

```csharp
[Collection("postgres")]
public abstract class DatabaseTestBase(PostgresFixture fixture) : IAsyncLifetime
{
    protected AppDbContext Db { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        Db = fixture.CreateContext();
        await ResetAsync();
    }

    private async Task ResetAsync()
        => await Db.Database.ExecuteSqlRawAsync("""
            TRUNCATE ledger_entries, payments, accounts,
                     idempotency_keys, outbox RESTART IDENTITY CASCADE;
            """);

    public async Task DisposeAsync() => await Db.DisposeAsync();
}
```

## Concurrency testi — asosiy qiymat

```csharp
[Collection("postgres")]
public class LostUpdateTests(PostgresFixture fixture) : DatabaseTestBase(fixture)
{
    [Fact]
    public async Task NaiveWithdraw_LosesUpdate()
    {
        var id = await SeedAccountAsync(100_000);

        // ⚠ HAR VAZIFA UCHUN ALOHIDA CONTEXT — bu shart
        var results = await Task.WhenAll(
            WithdrawNaiveAsync(fixture.CreateContext(), id, 80_000),
            WithdrawNaiveAsync(fixture.CreateContext(), id, 80_000));

        Assert.Equal(2, results.Count(r => r));           // ikkalasi ham "muvaffaqiyatli"
        Assert.Equal(20_000, await GetBalanceAsync(id));  // lekin 160 000 yechilgan
        // ⚠ Bu test BUGNI ISBOTLAYDI
    }

    [Fact]
    public async Task AtomicWithdraw_RejectsSecond()
    {
        var id = await SeedAccountAsync(100_000);

        var results = await Task.WhenAll(
            WithdrawAtomicAsync(fixture.CreateContext(), id, 80_000),
            WithdrawAtomicAsync(fixture.CreateContext(), id, 80_000));

        Assert.Equal(1, results.Count(r => r));
        Assert.Equal(20_000, await GetBalanceAsync(id));
    }
}
```

## `WebApplicationFactory` bilan

```csharp
public sealed class ApiFactory(PostgresFixture fixture) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
        => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(o => o.UseNpgsql(fixture.ConnectionString));

            // Tashqi provayder — mock (u haqiqiy pul harakati qiladi)
            services.RemoveAll<IPaymentProvider>();
            services.AddSingleton<IPaymentProvider, FakePaymentProvider>();
        });
}

[Fact]
public async Task Payment_IsIdempotent()
{
    var client = factory.CreateClient();
    var key = Guid.NewGuid().ToString();

    var first  = await PostPaymentAsync(client, key, amount: 80_000);
    var second = await PostPaymentAsync(client, key, amount: 80_000);

    Assert.Equal(HttpStatusCode.Created, first.StatusCode);
    Assert.Equal(HttpStatusCode.OK, second.StatusCode);
    Assert.Equal(1, await CountPaymentsAsync());          // BITTA to'lov
}
```

## CI'da

```yaml
# GitHub Actions — Docker mavjud, qo'shimcha service kerak emas
- name: Integration tests
  run: dotnet test --filter Category=Integration
  env:
    TESTCONTAINERS_RYUK_DISABLED: false     # avtomatik tozalash
```

```
   Tezlik uchun:
   · konteyner CollectionFixture'da BIR MARTA ko'tariladi
   · postgres:16-ALPINE — kichikroq image
   · testlar parallel bo'lsa har collection uchun alohida DB
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `InMemory` provider ishlatish | Constraint, tranzaksiya, qulf tekshirilmaydi |
| `EnsureCreated` ishlatish | Migratsiyalar tekshirilmaydi |
| Har test uchun yangi konteyner | Testlar juda sekin |
| Concurrency testida bitta context | Race hosil bo'lmaydi |
| Tashqi provayderni mock qilmaslik | Test haqiqiy API'ga boradi |
| Testlar orasida tozalamaslik | Bir-biriga ta'sir qiladi |

## Fintech konteksti

Testcontainers'siz **yozib bo'lmaydigan** testlar:

```
   · Lost update (M5.3)                    · Deadlock (M5.6)
   · Isolation level xatti-harakati (M5.2) · FOR UPDATE qulflash (M5.4)
   · CHECK constraint (M5.11)              · UNIQUE → idempotentlik (M5.11)
   · Limit write skew (M4.9)               · decimal precision (M4.2)
```

> Bu ro'yxat — «kodingiz to'g'riligini qanday kafolatlaysiz?» savoliga tayyor
> javob.

## Intervyu savollari

**1. EF Core kodini qanday test qilasiz?** ⭐

> **Testcontainers bilan real PostgreSQL**da. `InMemory` provider ishlatmayman.
>
> Sabab: `InMemory` haqiqiy DB emas — u constraint'larni, tranzaksiyalarni,
> qulflarni va SQL tarjimasini tekshirmaydi. Ya'ni fintech'da eng muhim narsalar
> testdan chetda qoladi.
>
> Aniq misol: lost update testini `InMemory` bilan yozib **bo'lmaydi**, chunki u
> yerda concurrency umuman yo'q.

**2. Testlar orasida izolyatsiyani qanday ta'minlaysiz?**

> Har testdan oldin `TRUNCATE ... RESTART IDENTITY CASCADE`.
>
> Tranzaksiya + rollback tezroq, lekin tranzaksiya xatti-harakatining o'zini test
> qilib bo'lmaydi — fintech'da esa bu asosiy test turi.
>
> Konteyner `CollectionFixture` da bir marta ko'tariladi, aks holda testlar juda
> sekin bo'ladi.

**3. Concurrency testini qanday yozasiz?**

> Har parallel vazifa uchun **alohida `DbContext`** yarataman — bitta context bilan
> race hosil bo'lmaydi, chunki u thread-safe emas va exception beradi.
>
> Keyin `Task.WhenAll` bilan bir vaqtda bajaraman va **invariantni** tekshiraman:
> balans manfiy bo'lmasin, aynan bitta operatsiya o'tsin.
>
> Va men **bug'ni isbotlaydigan** testni ham yozaman — himoyasiz variant lost
> update berishini ko'rsatadi. Bu tuzatishning haqiqatan ishlashiga ishonch beradi.

**4. `EnsureCreated` va `Migrate` farqi?**

> `EnsureCreated` sxemani modeldan to'g'ridan-to'g'ri yaratadi va **migratsiyalarni
> chetlab o'tadi** — ya'ni test sxemasi production sxemasidan farq qilishi mumkin.
>
> `MigrateAsync` esa haqiqiy migratsiyalarni qo'llaydi. Shunda migratsiyaning
> o'zi ham test qilinadi: agar u sinsa, CI darhol ko'rsatadi.

## Deliverable

```csharp
[Collection("postgres")]
public class DataAccessIntegrationTests(PostgresFixture fixture)
    : DatabaseTestBase(fixture)
{
    [Fact]
    public async Task Migrations_ApplyCleanly()
        => Assert.Empty(await Db.Database.GetPendingMigrationsAsync());

    [Fact]
    public async Task CheckConstraint_RejectsNegativeAmount()
    {
        Db.LedgerEntries.Add(new LedgerEntry { AmountMinor = -1 });
        var ex = await Assert.ThrowsAsync<DbUpdateException>(() => Db.SaveChangesAsync());
        Assert.Contains("chk_amount_positive", ex.InnerException!.Message);
    }

    [Fact]
    public async Task UniqueIdempotencyKey_PreventsDoubleProcessing()
    {
        var key = Guid.NewGuid().ToString();
        var results = await Task.WhenAll(
            TryInsertKeyAsync(fixture.CreateContext(), key),
            TryInsertKeyAsync(fixture.CreateContext(), key),
            TryInsertKeyAsync(fixture.CreateContext(), key));

        Assert.Equal(1, results.Count(r => r));     // aynan bittasi
    }

    [Fact]
    public async Task DecimalPrecision_SurvivesRoundTrip()
    {
        Db.Payments.Add(new Payment { Amount = 1234.5678m });
        await Db.SaveChangesAsync();
        Db.ChangeTracker.Clear();

        Assert.Equal(1234.5678m, (await Db.Payments.SingleAsync()).Amount);
    }

    [Fact]
    public async Task ForUpdate_BlocksSecondReader()
    {
        var id = await SeedAccountAsync(100_000);
        await using var tx = await Db.Database.BeginTransactionAsync();
        await LockAccountAsync(Db, id);

        var second = LockAccountAsync(fixture.CreateContext(), id);
        var finished = await Task.WhenAny(second, Task.Delay(500));

        Assert.NotSame(second, finished);           // ikkinchisi KUTYAPTI
        await tx.CommitAsync();
        await second;
    }
}
```

## Xotira kartasi

```
InMemory     ❌ HAQIQIY DB EMAS — constraint/tranzaksiya/qulf/tarjima yo'q
Testcontainers ✅ real PostgreSQL · fintech'da yagona to'g'ri tanlov
Setup        PostgreSqlBuilder + CollectionFixture (konteyner BIR MARTA)
             MigrateAsync (EnsureCreated EMAS — migratsiya ham test qilinsin)
Izolyatsiya  TRUNCATE ... RESTART IDENTITY CASCADE har testdan oldin
             tranzaksiya+rollback tezroq, lekin tranzaksiya testlari yozilmaydi
Concurrency  HAR VAZIFA UCHUN ALOHIDA DbContext — aks holda race hosil bo'lmaydi
             bug'ni ISBOTLAYDIGAN test ham yozing
API testi    WebApplicationFactory + tashqi provayder MOCK
Faqat shu bilan  lost update · deadlock · isolation · FOR UPDATE
                 CHECK/UNIQUE · write skew · decimal precision
```

---

## M6 — yakuniy tekshiruv ro'yxati

Kodsiz, og'zaki javob bera olsangiz — modul yopilgan:

- [ ] `DbContext` nima va nega Scoped bo'lishi kerak
- [ ] `AsNoTracking` qachon va nega
- [ ] `Find` va `FirstOrDefault` farqi
- [ ] N+1 nima, qanday aniqlanadi va uch xil yechimi
- [ ] Dekart portlashi qanday paydo bo'ladi
- [ ] Lazy loading nega o'chiriladi
- [ ] `IQueryable` va `IEnumerable` farqi
- [ ] Repository'dan nega `IQueryable` qaytarilmaydi
- [ ] `SaveChanges` tranzaksiya ochadimi
- [ ] `ExecuteUpdate` ning tuzog'i nima
- [ ] Balans uchun concurrency token nega ishlatilmaydi
- [ ] `decimal` precision nega aniq yoziladi
- [ ] Generic repository nega anti-naqsh
- [ ] Raw SQL'ni xavfsiz qanday yoziladi
- [ ] Nega `InMemory` provider ishlatilmaydi

**Deliverable'lar:**

- [ ] `DbContextTests` — identity map, tracker holati, parallel so'rov xatosi
- [ ] `NPlusOneTests` — bugni isbotlash va uch yechim
- [ ] `QueryableTests` — `AsEnumerable` tuzog'i, keyset pagination
- [ ] `TransactionTests` — atomiklik, `ExecuteUpdate` tracker'ni chetlab o'tishi
- [ ] `ConcurrencyTokenTests` — konflikt, retry, biznes rad javobi
- [ ] `ConfigurationTests` — `decimal` precision, enum satr, `Money` ikki ustun
- [ ] `RepositoryTests` — `FOR UPDATE` qulflashi, o'tkazma atomikligi
- [ ] `RawSqlTests` — SQL injection himoyasi, Dapper EF tranzaksiyasida
- [ ] `DataAccessIntegrationTests` — Testcontainers bilan to'liq to'plam
