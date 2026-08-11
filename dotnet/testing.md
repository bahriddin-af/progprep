# M12 · Testing va sifat

Bu modul sizning **e'tirof etgan asosiy zaifligingiz** va bir vaqtda eng katta
imkoniyatingiz: «Kodingiz to'g'riligini qanday kafolatlaysiz?» savoliga tayyor
javob shu yerda.

| # | Mavzu | P |
|---|---|---|
| [12.1](#121--test-piramidasi-) | Test piramidasi ⭐ | P0 |
| [12.2](#122--xunit-asoslari) | xUnit asoslari | P0 |
| [12.3](#123--yaxshi-test-anatomiyasi-) | Yaxshi test anatomiyasi ⭐ | P0 |
| [12.4](#124--mock--nimani-va-nimani-yoq-) | Mock — nimani va nimani yo'q ⭐ | P0 |
| [12.5](#125--integration-test-webapplicationfactory) | Integration test | P0 |
| [12.6](#126--testcontainers-) | Testcontainers ⭐ | P0 |
| [12.7](#127--concurrency-testi-) | Concurrency testi ⭐⭐ | P0 |
| [12.8](#128--pul-arifmetikasi-testlari) | Pul arifmetikasi testlari | P0 |
| [12.9](#129--property-based-testing) | Property-based testing | P2 |
| [12.10](#1210--test-malumoti) | Test ma'lumoti | P1 |
| [12.11](#1211--flaky-testlar) | Flaky testlar | P1 |
| [12.12](#1212--coverage-nimani-olchaydi) | Coverage nimani o'lchaydi | P1 |
| [12.13](#1213--code-review) | Code review | P1 |

---

# 12.1 · Test piramidasi ⭐

## Nima va nega

```
          /\        E2E — KAM
         /  \       butun oqim, real muhit
        /____\      sekin (daqiqalar), mo'rt, qimmat
       /      \
      /  INT   \    Integration — O'RTACHA
     /__________\   DB, HTTP, real bog'liqliklar
    /            \  sekinroq (soniyalar)
   /     UNIT     \ Unit — KO'P
  /________________\ bitta sinf mantiqi
                     tez (millisekundlar), barqaror

   Nisbat (taxminiy): 70% unit · 20% integration · 10% E2E
```

```
   ⚠ FINTECH'DA NISBAT BOSHQACHA:

   Concurrency, constraint, tranzaksiya — bularni unit test
   TEKSHIRA OLMAYDI (M6.9). Shuning uchun integration testlar
   ulushi ancha yuqori: ~50% unit · 40% integration · 10% E2E
```

## Har daraja nimani tekshiradi

```
   ┌─ UNIT ──────────────────────────────────────────────────────┐
   │  · domen mantiqi: Withdraw invariantlari                     │
   │  · pul arifmetikasi: yaxlitlash, bo'lish qoldig'i            │
   │  · holatlar mashinasi o'tishlari                             │
   │  · validatsiya qoidalari                                     │
   ├─ INTEGRATION ──────────────────────────────────────────────┤
   │  · SQL tarjimasi, N+1, constraint                            │
   │  · TRANZAKSIYA va QULFLAR                                    │
   │  · lost update, deadlock, write skew                         │
   │  · idempotentlik (UNIQUE constraint)                         │
   │  · API shartnomasi (status kodlar, format)                   │
   ├─ E2E ──────────────────────────────────────────────────────┤
   │  · to'lovning to'liq yo'li: API → DB → outbox → consumer     │
   │  · kritik biznes stsenariylar (3–5 ta, ko'p emas)            │
   └─────────────────────────────────────────────────────────────┘
```

## Teskari piramida — anti-pattern

```
   ⚠ "Ice cream cone" — ko'p E2E, kam unit:

   · testlar sekin (har run 30 daqiqa)
   · mo'rt — kichik o'zgarish 20 testni buzadi
   · xato QAYERDA ekani noaniq
   · jamoa testlarni o'chirib qo'yishni boshlaydi

   → Sabab odatda: unit test yozish uchun kod TEST QILINADIGAN emas
     (bog'liqliklar hardcode, static, katta sinflar — M9.1)
```

## Intervyu savollari

**1. Test piramidasi nima va fintech'da qanday o'zgaradi?** ⭐

> Klassik nisbat: ko'p unit, o'rtacha integration, kam E2E. Sabab — unit test tez
> va barqaror, E2E sekin va mo'rt.
>
> Fintech'da nisbat **o'zgaradi**: concurrency, tranzaksiya, constraint va
> qulflarni unit test tekshira olmaydi. Lost update testini `InMemory` provider
> bilan yozib bo'lmaydi (M6.9).
>
> Shuning uchun integration testlar ulushi ancha yuqori — taxminan 40%.

**2. Ko'p E2E test yomonmi?**

> Ha, agar ular unit va integration o'rnini egallasa. Bu «ice cream cone»
> anti-patterni: testlar sekin, mo'rt, va xato qayerda ekani noaniq.
>
> Sabab odatda kodda: bog'liqliklar hardcode qilingan, sinflar katta, static
> holat bor — ya'ni unit test yozib bo'lmaydi (M9.1).
>
> Yechim testda emas, **dizaynda**.

## Xotira kartasi

```
Piramida     UNIT (ko'p, tez) → INTEGRATION → E2E (kam, sekin)
Klassik      70 / 20 / 10
FINTECH      ~50 / 40 / 10 — concurrency va constraint unit'da tekshirilmaydi
Unit         domen mantiqi · pul arifmetikasi · holatlar mashinasi
Integration  SQL · TRANZAKSIYA · QULF · lost update · idempotentlik · API
E2E          to'liq oqim · 3–5 kritik stsenariy
Anti-pattern ice cream cone (ko'p E2E) → sabab: kod TEST QILINADIGAN emas
```

---

# 12.2 · xUnit asoslari

## Asosiy atributlar

```csharp
[Fact]                          // parametrsiz test
public void Withdraw_InsufficientFunds_Fails() { }

[Theory]                        // bir necha holat, bitta test
[InlineData(100, 3, 34, 33, 33)]
[InlineData(10,  4,  3,  3,  2)]
public void Split_DistributesRemainder(long total, int parts, params long[] expected) { }

[Theory]
[MemberData(nameof(RoundingCases))]     // murakkab ma'lumot
public void Round_UsesPolicy(decimal input, decimal expected) { }

public static TheoryData<decimal, decimal> RoundingCases => new()
{
    { 2.5m, 2m }, { 3.5m, 4m }, { -2.5m, -2m }
};
```

## Hayot sikli

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Konstruktor      — HAR test uchun yangi instance yaratiladi │
   │  IDisposable      — har testdan keyin                         │
   │  IAsyncLifetime   — async setup/teardown                      │
   │  IClassFixture<T> — SINF ichidagi testlar uchun bir marta     │
   │  ICollectionFixture<T> — COLLECTION uchun bir marta           │
   └──────────────────────────────────────────────────────────────┘

   ⚠ xUnit har test uchun YANGI sinf instance yaratadi
     → testlar orasida holat ulashilmaydi (bu yaxshi)
     → qimmat resurs (DB konteyner) fixture'da bo'lishi kerak
```

```csharp
public sealed class PaymentTests : IAsyncLifetime
{
    private AppDbContext _db = null!;

    public async Task InitializeAsync() => _db = await CreateContextAsync();
    public async Task DisposeAsync() => await _db.DisposeAsync();
}
```

## Parallel bajarish

```csharp
// Sukut bo'yicha turli COLLECTION'lar parallel bajariladi
[Collection("postgres")]        // bir xil collection — KETMA-KET
public class LedgerTests { }

// Butun assembly uchun sozlash
[assembly: CollectionBehavior(MaxParallelThreads = 4)]
```

```
   ⚠ Umumiy resurs (DB) ishlatadigan testlar bir COLLECTION'da bo'lishi kerak,
     aks holda ular bir-birining ma'lumotini buzadi (12.11)
```

## Assertion'lar

```csharp
Assert.Equal(expected, actual);
Assert.Equal(expected, actual, precision: 2);          // decimal uchun
Assert.Throws<InvalidOperationException>(() => Act());
await Assert.ThrowsAsync<DbUpdateException>(() => ActAsync());
Assert.Contains("mablag'", result.Error);
Assert.Empty(collection);
Assert.Single(collection);
Assert.All(items, i => Assert.True(i.AmountMinor > 0));

// FluentAssertions — o'qilishi yaxshiroq
result.Should().BeFailure().And.HaveError("Mablag' yetarli emas");
balance.Should().Be(Money.FromMajor(20_000m, Currency.Uzs));
entries.Should().HaveCount(2).And.OnlyContain(e => e.AmountMinor > 0);
```

## Intervyu savollari

**1. `Fact` va `Theory` farqi?**

> `Fact` — parametrsiz, bitta holat. `Theory` — bir necha kirish qiymati bilan
> bitta test.
>
> `Theory` chegara holatlarini tekshirishda juda foydali: yaxlitlash, bo'lish
> qoldig'i, valyuta eksponentlari — bularning har biri uchun alohida test yozish
> o'rniga `InlineData` ro'yxati.

**2. xUnit testlar orasida holatni qanday ulashadi?**

> Sukut bo'yicha **ulashmaydi** — har test uchun yangi sinf instance yaratiladi.
> Bu yaxshi: testlar bir-biriga bog'liq bo'lmaydi.
>
> Qimmat resurs (DB konteyner) uchun `IClassFixture` yoki `ICollectionFixture`
> ishlatiladi — u bir marta yaratiladi va testlar orasida ulashiladi.

## Xotira kartasi

```
Atributlar   [Fact] · [Theory] + InlineData/MemberData/TheoryData
Hayot sikli  konstruktor HAR test uchun · IAsyncLifetime (async setup)
             IClassFixture (sinf uchun bir marta) · ICollectionFixture
Parallel     turli collection'lar PARALLEL · bir xil collection KETMA-KET
             umumiy resurs → bitta collection
Assertion    Assert.* yoki FluentAssertions (o'qilishi yaxshiroq)
```

---

# 12.3 · Yaxshi test anatomiyasi ⭐

## AAA tuzilishi

```csharp
[Fact]
public void Withdraw_WhenInsufficientFunds_ReturnsFailureAndKeepsBalance()
{
    // Arrange — boshlang'ich holat
    var account = Account.Open(Money.FromMajor(50_000m, Currency.Uzs));

    // Act — bitta harakat
    var result = account.Withdraw(Money.FromMajor(80_000m, Currency.Uzs), key);

    // Assert — natija va yon ta'sirlar
    Assert.False(result.IsSuccess);
    Assert.Equal("Mablag' yetarli emas", result.Error);
    Assert.Equal(50_000_00, account.Balance.Minor);      // ⚠ o'zgarmagan
}
```

## Nomlash

```
   Shablon:  Metod_Shart_KutilganNatija

   ✅ Withdraw_WhenInsufficientFunds_ReturnsFailure
   ✅ Split_When100DividedBy3_DistributesRemainderToFirst
   ✅ Transfer_WhenCurrenciesDiffer_Throws

   ❌ Test1 · TestWithdraw · WithdrawTest · ItWorks

   → Test nomi XATO XABARI bo'lib xizmat qiladi:
     CI'da "Withdraw_WhenInsufficientFunds_ReturnsFailure FAILED"
     ko'rilganda nima buzilgani darhol tushunarli
```

## Bitta test — bitta sabab

```csharp
// ❌ Bir necha narsani tekshiradi — qaysi biri buzildi?
[Fact]
public void PaymentWorks()
{
    var result = service.Process(request);
    Assert.True(result.IsSuccess);
    Assert.Equal(2, db.LedgerEntries.Count());
    Assert.Single(db.Outbox);
    Assert.Equal(20_000, GetBalance());
    Assert.Equal("completed", result.Status);
}

// ✅ Har jihat alohida
[Fact] public void Process_CreatesTwoLedgerEntries() { }
[Fact] public void Process_WritesOutboxMessage() { }
[Fact] public void Process_DecreasesBalance() { }
```

```
   ⚠ Nuans: bog'liq assertion'larni ajratish SHART EMAS.
     "Natija muvaffaqiyatsiz VA balans o'zgarmagan" — bu bitta invariant,
     ikkalasi birga tekshirilishi mantiqiy.
```

## Testni o'qish oson bo'lsin

```csharp
// ❌ Tayyorgarlik testni ko'mib yuboradi
[Fact]
public async Task Transfer_Works()
{
    var user1 = new User { Id = Guid.NewGuid(), Name = "Ali", Phone = "+998...", ... };
    var user2 = new User { Id = Guid.NewGuid(), Name = "Vali", ... };
    var acc1 = new Account { Id = ..., UserId = user1.Id, Currency = "UZS", ... };
    // 20 qator tayyorgarlik...
}

// ✅ Builder yoki yordamchi metodlar
[Fact]
public async Task Transfer_MovesMoneyBetweenAccounts()
{
    var from = await GivenAccountWith(100_000_00);
    var to   = await GivenAccountWith(0);

    await service.TransferAsync(from, to, Money.FromMajor(800m, Currency.Uzs), key, default);

    Assert.Equal(20_000_00, await BalanceOf(from));
    Assert.Equal(100_000_00, await BalanceOf(to));
}
```

## Nimani test qilmaslik kerak

```
   ❌ TEST QILINMAYDI:
   · getter/setter (kompilyator ishi)
   · framework kodi (EF Core o'zi ishlashini)
   · mock'ning o'zi (mock.Verify hamma joyda)
   · implementatsiya detali (private metodlar)

   ✅ TEST QILINADI:
   · biznes qoidalari va invariantlar
   · chegara holatlari (nol, manfiy, maksimum, qoldiq)
   · xato yo'llari
   · concurrency va tranzaksiya xatti-harakati
```

## Intervyu savollari

**1. Yaxshi test qanday bo'ladi?**

> **AAA** tuzilishi: Arrange, Act, Assert — va Act bo'limida **bitta** harakat.
>
> Nomi shablon bo'yicha: `Metod_Shart_KutilganNatija`. Test nomi CI'dagi xato
> xabari bo'lib xizmat qiladi — u o'qilganda nima buzilgani darhol tushunarli
> bo'lishi kerak.
>
> Va tayyorgarlik testni ko'mib yubormasligi kerak — builder yoki yordamchi
> metodlar ishlatiladi.

**2. Bitta testda nechta assert bo'lishi kerak?**

> Qat'iy qoida yo'q, lekin **bitta buzilish sababi** bo'lishi kerak.
>
> Bog'liq assertion'lar birga bo'lishi normal: «natija muvaffaqiyatsiz **va**
> balans o'zgarmagan» — bu bitta invariant.
>
> Lekin bog'liq bo'lmagan narsalarni (ledger yozuvlari soni, outbox, holat) alohida
> testlarga bo'lish kerak — aks holda birinchi assert yiqilganda qolganlari
> tekshirilmaydi.

**3. Nimani test qilmaysiz?**

> Getter/setter, framework kodi, private metodlar va mock'ning o'zi.
>
> Ayniqsa oxirgisi: `mock.Verify(...)` bilan to'lgan test **mock'ning xatti-
> harakatini** tekshiradi, kodni emas. Bunday test refaktoringda buziladi, lekin
> haqiqiy bug'ni topmaydi.

## Xotira kartasi

```
AAA          Arrange · Act (BITTA harakat) · Assert
Nomlash      Metod_Shart_KutilganNatija
             → test nomi CI'dagi XATO XABARI
Bitta sabab  bog'liq assertion'lar birga · bog'liq bo'lmaganlar alohida
O'qilishi    tayyorgarlik testni ko'mmasin → builder / yordamchi metodlar
Test QILINMAYDI  getter/setter · framework · private metod · mock'ning o'zi
Test QILINADI    biznes qoidalari · CHEGARA holatlari · xato yo'llari
                 concurrency va tranzaksiya
```

---

# 12.4 · Mock — nimani va nimani yo'q ⭐

## Test double turlari

```
   ┌──────────┬───────────────────────────────────────────────────┐
   │  Dummy   │  Faqat imzo uchun, ishlatilmaydi                  │
   │  Stub    │  Tayyor javob qaytaradi                           │
   │  Fake    │  Ishlaydigan soddalashtirilgan implementatsiya    │
   │  Spy     │  Chaqiruvlarni yozib boradi                       │
   │  Mock    │  Kutilgan chaqiruvlarni TEKSHIRADI                │
   └──────────┴───────────────────────────────────────────────────┘

   ⚠ Amalda "mock" so'zi hammasiga nisbatan ishlatiladi
```

## Nimani mock qilish kerak

```
   ✅ MOCK QILINADI — nazoratimizdan tashqaridagi narsalar:
   · tashqi API (to'lov provayderi, davlat bazasi)
   · VAQT (TimeProvider — M4.7)
   · tasodifiylik (Random, Guid.NewGuid)
   · email/SMS yuborish
   · fayl tizimi (ba'zan)

   ❌ MOCK QILINMAYDI:
   · DB → Testcontainers (12.6)
   · o'z domen mantiqingiz
   · value object'lar (Money — u shunchaki qiymat)
   · framework (DbContext, HttpContext)
```

```csharp
// ✅ Tashqi provayder — mock
var provider = Substitute.For<IPaymentProvider>();
provider.ChargeAsync(Arg.Any<Money>(), Arg.Any<IdempotencyKey>(), Arg.Any<CancellationToken>())
        .Returns(ProviderResult.Success("ext-123"));

// ✅ Vaqt — FakeTimeProvider
var clock = new FakeTimeProvider(new DateTimeOffset(2026, 8, 4, 12, 0, 0, TimeSpan.Zero));
clock.Advance(TimeSpan.FromMinutes(5));

// ✅ Fake — ishlaydigan soddalashtirilgan versiya (mock'dan afzalroq)
public sealed class FakePaymentProvider : IPaymentProvider
{
    private readonly Queue<ProviderResult> _responses = new();
    public List<ChargeRequest> ReceivedRequests { get; } = [];

    public void EnqueueSuccess() => _responses.Enqueue(ProviderResult.Success("ext"));
    public void SimulateTimeout() => _responses.Enqueue(ProviderResult.Timeout());

    public Task<ProviderResult> ChargeAsync(Money amount, IdempotencyKey key, CancellationToken ct)
    {
        ReceivedRequests.Add(new(amount, key));
        return Task.FromResult(_responses.Count > 0 ? _responses.Dequeue() : ProviderResult.Success("ext"));
    }
}
```

> **Fake mock'dan afzalroq:** u qayta ishlatiladi, testni o'qish oson qiladi va
> real xatti-harakatni yaxshiroq modellashtiradi (timeout, retry, dublikat).

## Ko'p mock — dizayn signali

```
   ⚠ Testda 5 ta mock bo'lsa — bu sinf JUDA KO'P narsani biladi (M9.1 S)

   ❌ var service = new PaymentService(
          mockRepo, mockProvider, mockNotifier, mockLimits,
          mockFraud, mockAudit, mockClock, mockCache);

   → Sinfni bo'lish kerak, test emas
```

## Verify — ehtiyot bilan

```csharp
// ❌ Implementatsiya detalini tekshiradi — refaktoringda buziladi
mock.Received(1).SaveAsync(Arg.Any<Payment>());
mock.Received(1).LogAsync(Arg.Any<string>());
mock.DidNotReceive().SendEmailAsync(Arg.Any<string>());

// ✅ NATIJANI tekshirish
Assert.Equal(PaymentStatus.Completed, result.Status);
Assert.Equal(20_000_00, await BalanceOf(accountId));
```

```
   Verify oqlanadigan holat: yon ta'sir NATIJADA ko'rinmaydi
   · "provayderga BIR XIL idempotency key yuborilganmi?" (M10.11)
   · "notification YUBORILDIMI?"
```

## Intervyu savollari

**1. Nimani mock qilasiz, nimani yo'q?** ⭐

> Mock qilaman: tashqi API, vaqt, tasodifiylik, email/SMS — ya'ni **nazoratimdan
> tashqaridagi** narsalar.
>
> Mock **qilmayman**: DB (Testcontainers bilan real PostgreSQL — 12.6) va o'z
> domen mantiqim. DB'ni mock qilsam constraint, tranzaksiya va qulflar
> tekshirilmaydi — fintech'da eng muhim narsalar.
>
> Va imkon bo'lsa mock o'rniga **fake** yozaman: u qayta ishlatiladi va real
> xatti-harakatni yaxshiroq modellashtiradi.

**2. Testda ko'p mock bo'lsa nima demak?**

> Bu **dizayn signali**: sinf juda ko'p bog'liqlikka ega, ya'ni Single
> Responsibility buzilgan (M9.1).
>
> Yechim testda emas — sinfni bo'lish kerak.
>
> Amaliy chegara: 3 tadan ko'p mock bo'lsa men dizaynni qayta ko'rib chiqaman.

**3. `Verify` ni qachon ishlatasiz?**

> Kamdan-kam. `mock.Received(...)` bilan to'lgan test **implementatsiya detalini**
> tekshiradi va refaktoringda buziladi, lekin haqiqiy bug'ni topmaydi.
>
> Afzal yo'l — **natijani** tekshirish: balans, holat, DB'dagi yozuvlar.
>
> `Verify` oqlanadigan holat: yon ta'sir natijada ko'rinmasa — masalan «provayderga
> bir xil idempotency key yuborilganmi?» yoki «notification yuborildimi?».

## Xotira kartasi

```
Turlar       dummy · stub · FAKE · spy · mock
MOCK QILINADI  tashqi API · VAQT (TimeProvider) · tasodifiylik · email/SMS
MOCK QILINMAYDI  DB (→ Testcontainers) · o'z domen mantiqi · value object
Fake         mock'dan AFZAL — qayta ishlatiladi, real xatti-harakat
Ko'p mock    DIZAYN SIGNALI — sinf juda ko'p narsani biladi (SRP)
             3 tadan ko'p → dizaynni qayta ko'rib chiqing
Verify       implementatsiya detalini tekshiradi → refaktoringda buziladi
             afzal: NATIJANI tekshirish
             oqlanadi: yon ta'sir natijada ko'rinmasa
```

---

# 12.5 · Integration test: `WebApplicationFactory`

## Sozlash

```csharp
public sealed class ApiFactory(PostgresFixture postgres) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureTestServices(services =>
        {
            // DB — real, lekin test konteynerida (12.6)
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(o => o.UseNpgsql(postgres.ConnectionString));

            // ⚠ Tashqi provayder — MOCK (u haqiqiy pul harakatlantiradi)
            services.RemoveAll<IPaymentProvider>();
            services.AddSingleton<IPaymentProvider, FakePaymentProvider>();

            // Vaqt — nazorat ostida
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(new FakeTimeProvider());

            // Autentifikatsiya — test sxemasi
            services.AddAuthentication("Test")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", null);
        });
    }
}
```

## Autentifikatsiya

```csharp
public sealed class TestAuthHandler(...) : AuthenticationHandler<AuthenticationSchemeOptions>
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Test-User", out var userId))
            return Task.FromResult(AuthenticateResult.NoResult());

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId!),
            new Claim(ClaimTypes.Role, Request.Headers["X-Test-Role"].FirstOrDefault() ?? "user"),
            new Claim("tenant_id", Request.Headers["X-Test-Tenant"].FirstOrDefault() ?? DefaultTenant)
        };

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, "Test")));
    }
}
```

## Nimani tekshiradi

```
   ┌──────────────────────────────────────────────────────────────┐
   │  · MIDDLEWARE pipeline (tartib, correlation ID — M7.2)        │
   │  · autentifikatsiya va AVTORIZATSIYA (M8.5)                   │
   │  · model binding va validatsiya (M7.5)                        │
   │  · STATUS KODLAR va javob formati (M7.6, M7.7)                │
   │  · DI konfiguratsiyasi (captive dependency — M7.3)            │
   │  · idempotentlik (M10.16)                                     │
   │  · to'liq oqim: API → domen → DB → outbox                     │
   └──────────────────────────────────────────────────────────────┘
```

```csharp
[Fact]
public async Task Payment_ReturnsProblemDetailsWithTraceId_OnFailure()
{
    var response = await _client.PostAsJsonAsync("/api/v1/payments", InvalidRequest);
    var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();

    Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    Assert.True(problem!.Extensions.ContainsKey("traceId"));
    Assert.DoesNotContain("Npgsql", problem.Detail ?? "");   // ma'lumot sizmaydi (M8.7)
}

[Fact]
public async Task OtherUsersPayment_Returns404()
{
    var paymentId = await CreatePaymentForAsync(userB);
    var client = CreateClientForUser(userA);

    Assert.Equal(HttpStatusCode.NotFound,
                 (await client.GetAsync($"/api/v1/payments/{paymentId}")).StatusCode);
}
```

## Intervyu savollari

**1. API'ni qanday test qilasiz?**

> `WebApplicationFactory` bilan — u butun ilovani xotirada ko'taradi va real HTTP
> so'rov yuboradi (tarmoqsiz).
>
> Bu middleware pipeline, autentifikatsiya, avtorizatsiya, validatsiya, status
> kodlar va DI konfiguratsiyasini birga tekshiradi — ularni unit test bilan
> tekshirib bo'lmaydi.
>
> DB **real** (Testcontainers), tashqi provayder esa **mock** — u haqiqiy pul
> harakatlantiradi.

**2. Autentifikatsiyani qanday hal qilasiz?**

> Test autentifikatsiya sxemasi yozaman: header orqali foydalanuvchi ID, rol va
> tenant beriladi.
>
> Real JWT generatsiya qilish ham mumkin, lekin test sxemasi soddaroq va
> tezroq — va u autentifikatsiya mexanizmini emas, **avtorizatsiya mantiqini**
> tekshirishga imkon beradi.

## Xotira kartasi

```
Vosita       WebApplicationFactory — ilovani xotirada ko'taradi
DB           REAL (Testcontainers) · tashqi provayder MOCK
             vaqt FakeTimeProvider · auth test sxemasi
Tekshiradi   middleware tartibi · authn/authz · validatsiya
             STATUS KODLAR · javob formati · DI konfiguratsiyasi
             idempotentlik · to'liq oqim
Auth         header orqali user/rol/tenant → avtorizatsiya mantiqi tekshiriladi
```

---

# 12.6 · Testcontainers ⭐

## Nima uchun `InMemory` yaramaydi

```
   ┌──────────────────────┬──────────────────────────────────────┐
   │  Nimani tekshiradi   │  InMemory  SQLite  Testcontainers    │
   ├──────────────────────┼──────────────────────────────────────┤
   │  LINQ tarjimasi      │     ❌        ⚠          ✅           │
   │  CHECK constraint    │     ❌        ⚠          ✅           │
   │  UNIQUE constraint   │     ⚠        ✅          ✅           │
   │  Tranzaksiya         │     ❌        ✅          ✅           │
   │  FOR UPDATE, qulflar │     ❌        ❌          ✅           │
   │  Isolation levels    │     ❌        ❌          ✅           │
   │  LOST UPDATE testi   │     ❌        ❌          ✅           │
   │  Postgres tiplari    │     ❌        ❌          ✅           │
   │  Tezlik              │     ✅        ✅          ⚠           │
   └──────────────────────┴──────────────────────────────────────┘

   → Fintech'da Testcontainers YAGONA to'g'ri tanlov
```

## Sozlash

```csharp
public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")        // kichikroq image
        .WithDatabase("fintech_test")
        .WithCleanUp(true)
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        await using var db = CreateContext();
        await db.Database.MigrateAsync();       // ⚠ EnsureCreated EMAS
    }

    public AppDbContext CreateContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
                   .UseNpgsql(ConnectionString).Options);

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();
}

[CollectionDefinition("postgres")]
public sealed class PostgresCollection : ICollectionFixture<PostgresFixture>;
```

```
   ⚠ MigrateAsync ishlatiladi:
   · migratsiyalarning O'ZI ham test qilinadi
   · test sxemasi production sxemasidan farq qilmaydi
   EnsureCreated migratsiyalarni chetlab o'tadi
```

## Izolyatsiya

```csharp
[Collection("postgres")]
public abstract class DatabaseTestBase(PostgresFixture fixture) : IAsyncLifetime
{
    protected PostgresFixture Fixture { get; } = fixture;
    protected AppDbContext Db { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        Db = Fixture.CreateContext();
        await ResetAsync();
    }

    private async Task ResetAsync()
        => await Db.Database.ExecuteSqlRawAsync("""
            TRUNCATE ledger_entries, payments, accounts, account_balances,
                     idempotency_keys, outbox, inbox, daily_limits
            RESTART IDENTITY CASCADE;
            """);

    public async Task DisposeAsync() => await Db.DisposeAsync();
}
```

```
   Uch strategiya:
   ┌──────────────────────────────────────────────────────────────┐
   │  1. Tranzaksiya + rollback  — eng tez                        │
   │     ❌ tranzaksiya xatti-harakatini test qilib bo'lmaydi      │
   │  2. TRUNCATE                — biroz sekinroq                 │
   │     ✅ concurrency testlari ishlaydi → FINTECH uchun          │
   │  3. Yangi konteyner         — juda sekin                     │
   └──────────────────────────────────────────────────────────────┘
```

## Tezlik

```
   Konteyner CollectionFixture'da BIR MARTA ko'tariladi (~3–5 soniya)
   Har test TRUNCATE (~5 ms)

   ⚠ Har test uchun yangi konteyner = 200 test × 4 s = 13 daqiqa
     CollectionFixture bilan = 5 s + 200 × 5 ms = 6 soniya
```

## CI'da

```yaml
- name: Integration tests
  run: dotnet test --filter Category=Integration
  env:
    TESTCONTAINERS_RYUK_DISABLED: false     # avtomatik tozalash
```

## Intervyu savollari

**1. Nega `InMemory` provider ishlatmaysiz?** ⭐

> Chunki u **haqiqiy DB emas**: constraint'larni, tranzaksiyalarni, qulflarni va
> SQL tarjimasini tekshirmaydi.
>
> Aniq misol: lost update testini `InMemory` bilan yozib **bo'lmaydi** — u yerda
> concurrency umuman yo'q, `FOR UPDATE` ham yo'q, `CHECK` constraint ham
> ishlamaydi.
>
> Fintech'da aynan shu narsalar eng muhim, shuning uchun **Testcontainers** yagona
> to'g'ri tanlov.

**2. Testlar orasida izolyatsiyani qanday ta'minlaysiz?**

> Har testdan oldin `TRUNCATE ... RESTART IDENTITY CASCADE`.
>
> Tranzaksiya + rollback tezroq, lekin unda **tranzaksiya xatti-harakatining
> o'zini** test qilib bo'lmaydi — fintech'da esa bu asosiy test turi.
>
> Konteyner `CollectionFixture` da bir marta ko'tariladi: 200 test uchun 13
> daqiqa o'rniga 6 soniya.

## Xotira kartasi

```
InMemory     HAQIQIY DB EMAS — constraint/tranzaksiya/qulf/tarjima yo'q
             lost update testini YOZIB BO'LMAYDI
Testcontainers  real PostgreSQL · fintech'da YAGONA to'g'ri tanlov
Setup        PostgreSqlBuilder + CollectionFixture (BIR MARTA)
             MigrateAsync (EnsureCreated EMAS — migratsiya ham test qilinsin)
Izolyatsiya  TRUNCATE ... RESTART IDENTITY CASCADE
             tranzaksiya+rollback tezroq, lekin tranzaksiya testlari yozilmaydi
Tezlik       konteyner bir marta (~4 s) + TRUNCATE (~5 ms)
```

---

# 12.7 · Concurrency testi ⭐⭐

## Nima va nega

Bu **eng qimmatli test turi** va sizning eng kuchli deliverable'ingiz. U M5.3,
M4.9 va M11.7 dagi bilimni **isbotlaydi**.

```
   ⚠ ASOSIY QOIDA: har parallel vazifa uchun ALOHIDA DbContext

     Bitta context bilan race hosil BO'LMAYDI —
     u thread-safe emas va exception beradi (M6.1)
```

## Lost update — bugni isbotlash

```csharp
[Collection("postgres")]
public sealed class LostUpdateTests(PostgresFixture fixture) : DatabaseTestBase(fixture)
{
    [Fact]
    public async Task NaiveReadThenWrite_LosesUpdate()
    {
        var id = await SeedAccountAsync(balance: 100_000_00);

        // ⚠ Har vazifa uchun ALOHIDA context
        var results = await Task.WhenAll(
            WithdrawNaiveAsync(Fixture.CreateContext(), id, 80_000_00),
            WithdrawNaiveAsync(Fixture.CreateContext(), id, 80_000_00));

        Assert.Equal(2, results.Count(r => r));                   // ikkalasi "muvaffaqiyatli"
        Assert.Equal(20_000_00, await GetBalanceAsync(id));       // lekin 160 000 yechilgan
        // ⚠ BU TEST BUGNI ISBOTLAYDI — u ataylab yashil
    }

    [Fact]
    public async Task AtomicUpdate_RejectsSecondWithdrawal()
    {
        var id = await SeedAccountAsync(balance: 100_000_00);

        var results = await Task.WhenAll(
            WithdrawAtomicAsync(Fixture.CreateContext(), id, 80_000_00),
            WithdrawAtomicAsync(Fixture.CreateContext(), id, 80_000_00));

        Assert.Equal(1, results.Count(r => r));                   // AYNAN bittasi
        Assert.Equal(20_000_00, await GetBalanceAsync(id));
    }
}
```

> **«Bugni isbotlaydigan test»** — bu muhim naqsh: u himoyasiz variant haqiqatan
> buzilishini ko'rsatadi, va tuzatish ishlaganiga ishonch beradi.

## Deadlock testi

```csharp
[Fact]
public async Task UnorderedLocking_CausesDeadlock()
{
    var (a, b) = await SeedTwoAccountsAsync();

    var ex = await Record.ExceptionAsync(() => Task.WhenAll(
        TransferUnorderedAsync(Fixture.CreateContext(), a, b, 50_000_00),
        TransferUnorderedAsync(Fixture.CreateContext(), b, a, 30_000_00)));

    var pg = FindException<PostgresException>(ex);
    Assert.Equal("40P01", pg?.SqlState);          // deadlock detected
}

[Fact]
public async Task OrderedLocking_NeverDeadlocks()
{
    var (a, b) = await SeedTwoAccountsAsync(each: 100_000_00);

    var tasks = Enumerable.Range(0, 50).SelectMany(_ => new[]
    {
        TransferOrderedAsync(Fixture.CreateContext(), a, b, 1_000_00),
        TransferOrderedAsync(Fixture.CreateContext(), b, a, 1_000_00)
    });

    await Task.WhenAll(tasks);                              // exception YO'Q
    Assert.Equal(200_000_00, await TotalBalanceAsync(a, b)); // pul yo'qolmagan
}
```

## Write skew (limit) testi

```csharp
[Fact]
public async Task NaiveLimitCheck_AllowsExceedingLimit()
{
    await SetDailyLimitAsync(user, 1_000_000_00);

    var results = await Task.WhenAll(
        ConsumeNaiveAsync(Fixture.CreateContext(), user, 600_000_00),
        ConsumeNaiveAsync(Fixture.CreateContext(), user, 600_000_00));

    Assert.Equal(2, results.Count(r => r.IsSuccess));       // ⚠ ikkalasi o'tdi
    Assert.Equal(1_200_000_00, await SpentTodayAsync(user)); // limit BUZILDI
}

[Fact]
public async Task AtomicLimitCheck_RejectsSecond()
{
    await SetDailyLimitAsync(user, 1_000_000_00);

    var results = await Task.WhenAll(
        TryConsumeAsync(Fixture.CreateContext(), user, 600_000_00),
        TryConsumeAsync(Fixture.CreateContext(), user, 600_000_00));

    Assert.Equal(1, results.Count(r => r.IsSuccess));
}
```

## Stress test + invariant

```csharp
[Fact]
public async Task RandomOperations_PreserveInvariants()
{
    var accounts = await SeedAccountsAsync(count: 10, each: 100_000_00);
    var initialTotal = 10 * 100_000_00L;

    await Task.WhenAll(Enumerable.Range(0, 500).Select(async i =>
    {
        var from = accounts[Random.Shared.Next(accounts.Count)];
        var to   = accounts[Random.Shared.Next(accounts.Count)];
        if (from == to) return;

        await Record.ExceptionAsync(() =>
            TransferAsync(Fixture.CreateContext(), from, to, 1_000_00, NewKey()));
    }));

    // ⚠ INVARIANTLAR
    Assert.Equal(initialTotal, await TotalBalanceAsync(accounts));   // pul yo'qolmagan
    Assert.Equal(0, await LedgerDeltaAsync("UZS"));                  // Δ = 0
    Assert.All(accounts, async a => Assert.True(await GetBalanceAsync(a) >= 0));
}
```

## Ehtimolni oshirish

```csharp
// ⚠ FAQAT testda: oynani kengaytirib race ehtimolini oshirish
public async Task<bool> WithdrawNaiveWithDelayAsync(AppDbContext db, Guid id, long amount)
{
    var balance = await GetBalanceAsync(db, id);
    await Task.Delay(50);                        // ⚠ race oynasini kengaytirish
    if (balance < amount) return false;
    await SetBalanceAsync(db, id, balance - amount);
    return true;
}
```

## Intervyu savollari

**1. Concurrency testini qanday yozasiz?** ⭐

> Har parallel vazifa uchun **alohida `DbContext`** — bitta context bilan race
> hosil bo'lmaydi, u thread-safe emas.
>
> `Task.WhenAll` bilan bir vaqtda bajaraman va **invariantni** tekshiraman: balans
> manfiy bo'lmasin, aynan bitta operatsiya o'tsin, `Δ = 0` saqlansin.
>
> Va men **bug'ni isbotlaydigan** testni ham yozaman: himoyasiz variant lost update
> berishini ko'rsatadi. Bu tuzatish haqiqatan ishlaganiga ishonch beradi.

**2. Race tasodifiy — test ishonchli bo'ladimi?**

> To'liq ishonchli emas, shuning uchun uch chora:
> - **ehtimolni oshirish**: test kodida `Task.Delay` bilan oynani kengaytirish;
> - **ko'p marta ishga tushirish** (CI'da 10–50 marta);
> - **stress test + invariant**: 500 tasodifiy operatsiya, keyin «pul yo'qolmagan»
>   va «Δ = 0» tekshiruvi.
>
> Oxirgisi eng qimmatli: u aniq stsenariyni emas, **tizim xossasini** tekshiradi.

**3. Bu testlar sekin emasmi?**

> Sekinroq, ha — Testcontainers va parallel vazifalar tufayli. Lekin ular
> **eng qimmatli** testlar: aynan shu bug'lar production'da pul yo'qotishga olib
> keladi.
>
> Amalda: unit testlar har commit'da, concurrency testlar PR'da va nightly'da.

## Xotira kartasi

```
QOIDA        har parallel vazifa uchun ALOHIDA DbContext
             bitta context → race hosil bo'lmaydi (thread-safe emas)
Naqsh        BUG'NI ISBOTLAYDIGAN test + tuzatilgan variant testi
Testlar      lost update · deadlock (tartibli/tartibsiz) · write skew (limit)
             stress + INVARIANT (pul yo'qolmagan, Δ = 0, balans ≥ 0)
Ishonchlilik ehtimolni oshirish (Task.Delay) · ko'p marta ishga tushirish
             stress test — aniq stsenariy emas, TIZIM XOSSASI
Qiymat       eng qimmatli test turi — production'da pul yo'qotadigan bug'lar
```

---

# 12.8 · Pul arifmetikasi testlari

## Nimani tekshirish kerak

```
   ┌──────────────────────────────────────────────────────────────┐
   │  · yaxlitlash rejimi (ToEven vs AwayFromZero — M4.4)          │
   │  · yaxlitlash BOSQICHI (natijani o'zgartiradi)                │
   │  · bo'lish QOLDIG'I (sum(parts) == total — M4.5)              │
   │  · valyuta mos kelmasligi                                     │
   │  · overflow                                                    │
   │  · minor unit round-trip (DB orqali — M4.2)                   │
   │  · chegara qiymatlar: 0, 1, MaxValue, manfiy                  │
   └──────────────────────────────────────────────────────────────┘
```

## Theory bilan chegara holatlari

```csharp
public sealed class MoneyArithmeticTests
{
    [Theory]
    [InlineData(2.5,  2)]      // ToEven — juftga
    [InlineData(3.5,  4)]
    [InlineData(4.5,  4)]
    [InlineData(-2.5, -2)]
    public void Round_DefaultIsBankersRounding(decimal input, decimal expected)
        => Assert.Equal(expected, Math.Round(input));

    [Theory]
    [InlineData(100,  3, new long[] { 34, 33, 33 })]
    [InlineData(10,   4, new long[] {  3,  3,  2, 2 })]
    [InlineData(1000, 3, new long[] { 334, 333, 333 })]
    [InlineData(9,    3, new long[] {  3,  3,  3 })]      // qoldiq yo'q
    [InlineData(1,    3, new long[] {  1,  0,  0 })]      // ⚠ chegara
    [InlineData(0,    3, new long[] {  0,  0,  0 })]      // ⚠ nol
    public void Split_DistributesRemainder(long total, int parts, long[] expected)
    {
        var result = MoneySplit.Equally(Money.FromMinor(total, Currency.Uzs), parts);
        Assert.Equal(expected, result.Select(m => m.Minor));
    }

    [Fact]
    public void RoundingStage_ChangesResult()
    {
        decimal each = 1000m * 0.0275m;                               // 27.50

        var perItem = Math.Round(each, 0, MidpointRounding.AwayFromZero) * 3;   // 84
        var atEnd   = Math.Round(each * 3, 0, MidpointRounding.AwayFromZero);   // 82

        Assert.NotEqual(perItem, atEnd);      // farq REAL — qoida kerak
    }

    [Fact]
    public void Truncation_LosesMoney()
    {
        Assert.Equal(2999, (long)(29.999m * 100));                    // ❌ kesildi
        Assert.Equal(3000, (long)Math.Round(29.999m * 100, 0,
                                 MidpointRounding.AwayFromZero));     // ✅
    }
}
```

## Invariant testlari

```csharp
[Fact]
public void Split_AlwaysSumsToTotal()
{
    for (long total = 0; total < 1000; total++)
        for (int parts = 1; parts <= 10; parts++)
        {
            var result = MoneySplit.Equally(Money.FromMinor(total, Currency.Uzs), parts);

            Assert.Equal(total, result.Sum(m => m.Minor));                  // INVARIANT
            Assert.True(result.Max(m => m.Minor) - result.Min(m => m.Minor) <= 1);
        }
}

[Fact]
public void PricingBreakdown_AlwaysBalances()
{
    foreach (var (gross, disc, fee, tax) in PricingCases())
    {
        var r = PricingCalculator.CalculateInclusive(gross, disc, fee, tax);
        Assert.Equal(r.CustomerPays, r.MerchantGets + r.Fee + r.Tax);       // INVARIANT
    }
}
```

## DB round-trip

```csharp
[Fact]
public async Task Decimal_PreservesFullPrecision()
{
    var payment = new Payment { Amount = 1234.5678m };
    Db.Add(payment);
    await Db.SaveChangesAsync();
    Db.ChangeTracker.Clear();

    var loaded = await Db.Payments.FindAsync(payment.Id);
    Assert.Equal(1234.5678m, loaded!.Amount);   // ⚠ HasPrecision yo'q bo'lsa SINADI
}

[Fact]
public async Task Money_RoundTripsThroughDatabase()
{
    var money = Money.FromMajor(1234.56m, Currency.Uzs);
    Db.Add(new Payment { Total = money });
    await Db.SaveChangesAsync();
    Db.ChangeTracker.Clear();

    Assert.Equal(money, (await Db.Payments.SingleAsync()).Total);
}
```

## Intervyu savollari

**1. Pul arifmetikasini qanday test qilasiz?**

> `Theory` bilan chegara holatlarini: yaxlitlash rejimlari, bo'lish qoldig'i, nol,
> bir, maksimum.
>
> Va **invariant testlari**: `sum(parts) == total` har qanday kirish uchun;
> breakdown balansi har doim to'g'ri (`CustomerPays == MerchantGets + Fee + Tax`).
>
> Plus **DB round-trip**: `decimal` precision to'g'ri saqlanishi (M4.2) — bu test
> `HasPrecision` yozilmagan bo'lsa sinadi va jimgina xatoni erta ushlaydi.

**2. Qaysi chegara holatlarini albatta tekshirasiz?**

> Nol, bir, manfiy, maksimum. Bo'lishda: qoldiq bor va yo'q holatlar, jami
> qismlar sonidan kichik bo'lgan holat (`1 / 3`).
>
> Yaxlitlashda: `x.5` holatlari (`2.5`, `3.5`, `-2.5`) — aynan shu yerda `ToEven`
> va `AwayFromZero` farq qiladi.

## Xotira kartasi

```
Tekshiriladi  yaxlitlash rejimi · yaxlitlash BOSQICHI · bo'lish QOLDIG'I
              valyuta mos kelmasligi · overflow · DB round-trip
Chegara       0 · 1 · manfiy · MaxValue · qoldiq bor/yo'q · total < parts
x.5 holatlar  2.5, 3.5, -2.5 — ToEven va AwayFromZero farq qiladi
Invariantlar  sum(parts) == total
              CustomerPays == MerchantGets + Fee + Tax
DB round-trip decimal precision — HasPrecision yo'q bo'lsa SINADI
```

---

# 12.9 · Property-based testing

## Nima va nega

Aniq misollar o'rniga **xossalarni** tekshirish: kutubxona yuzlab tasodifiy kirish
generatsiya qiladi va xossani buzadigan **eng kichik misolni** topadi.

```csharp
using FsCheck.Xunit;

[Property]
public Property Split_AlwaysSumsToTotal()
    => Prop.ForAll(
        Arb.From<PositiveInt>(),
        Arb.From<PositiveInt>().Filter(p => p.Get <= 100),
        (total, parts) =>
        {
            var money = Money.FromMinor(total.Get, Currency.Uzs);
            var result = MoneySplit.Equally(money, parts.Get);
            return result.Sum(m => m.Minor) == total.Get;
        });

[Property]
public Property Reversal_RestoresBalance(PositiveInt amount)
{
    var account = Account.Open(Money.FromMinor(1_000_000, Currency.Uzs));
    var before = account.Balance;

    var tx = account.Withdraw(Money.FromMinor(amount.Get, Currency.Uzs), key);
    if (!tx.IsSuccess) return true.ToProperty();

    account.Reverse(tx.Value.TransactionId);
    return (account.Balance == before).ToProperty();
}
```

## Fintech uchun mos xossalar

```
   ┌──────────────────────────────────────────────────────────────┐
   │  · sum(split(total, n)) == total          — har doim          │
   │  · reverse(apply(x)) == identity          — reversal          │
   │  · Δ = 0 har tranzaksiyadan keyin          — ledger           │
   │  · balance >= 0 (overdraft yo'q bo'lsa)                       │
   │  · fee(a) + fee(b) <= fee(a+b) + 1        — yaxlitlash        │
   │  · idempotent: f(f(x)) == f(x)            — consumer          │
   └──────────────────────────────────────────────────────────────┘
```

## Shrinking

```
   FsCheck xossani buzgan misolni topgach, uni SODDALASHTIRADI:

   Topildi:   total = 8_374_921, parts = 47   → sinadi
   Shrink:    total = 3, parts = 2            → hali ham sinadi
   Natija:    ENG KICHIK misol ko'rsatiladi

   → debug qilish ancha oson
```

## Chegarasi

```
   ⚠ Property-based test aniq misol testini ALMASHTIRMAYDI:

   · aniq biznes qoidasi ("2.5 → 2") — InlineData bilan
   · umumiy xossa ("yig'indi saqlanadi") — property bilan

   Ular BIRGA ishlatiladi.
```

## Intervyu savollari

**1. Property-based testing nima?**

> Aniq misollar o'rniga **xossalarni** tekshirish: kutubxona yuzlab tasodifiy
> kirish generatsiya qiladi.
>
> Fintech'da tabiiy xossalar bor: `sum(split(total, n)) == total`,
> `reverse(apply(x)) == identity`, `Δ = 0`, idempotentlik.
>
> Eng qimmatli xususiyati — **shrinking**: xossani buzgan misol topilgach, u eng
> kichik holatga soddalashtiriladi va debug qilish oson bo'ladi.

**2. U oddiy testni almashtiradimi?**

> Yo'q, ular birga ishlatiladi.
>
> Aniq biznes qoidasi (`Math.Round(2.5m) == 2`) — `InlineData` bilan, chunki u
> **belgilangan** xatti-harakat.
>
> Umumiy xossa (`yig'indi saqlanadi`) — property bilan, chunki u **har qanday**
> kirish uchun to'g'ri bo'lishi kerak.

## Xotira kartasi

```
G'oya        aniq misol emas — XOSSA · yuzlab tasodifiy kirish
Shrinking    buzilgan misolni ENG KICHIK holatga soddalashtiradi
Fintech xossalari  sum(split) == total · reverse∘apply == identity
             Δ = 0 · balance >= 0 · idempotentlik f(f(x)) == f(x)
Chegara      aniq qoida → InlineData · umumiy xossa → property
             ular BIRGA ishlatiladi
Vosita       FsCheck (.NET)
```

---

# 12.10 · Test ma'lumoti

## Builder naqshi

```csharp
public sealed class AccountBuilder
{
    private Money _balance = Money.Zero(Currency.Uzs);
    private bool _isBlocked;
    private Guid _ownerId = Guid.NewGuid();

    public AccountBuilder WithBalance(decimal major)
    {
        _balance = Money.FromMajor(major, Currency.Uzs);
        return this;
    }

    public AccountBuilder Blocked() { _isBlocked = true; return this; }

    public Account Build() => Account.Restore(_ownerId, _balance, _isBlocked);

    public static implicit operator Account(AccountBuilder b) => b.Build();
}

// Ishlatilishi — o'qish oson
Account account = new AccountBuilder().WithBalance(100_000m).Blocked();
```

## Object Mother

```csharp
public static class Accounts
{
    public static Account Rich()    => new AccountBuilder().WithBalance(1_000_000m);
    public static Account Empty()   => new AccountBuilder().WithBalance(0m);
    public static Account Blocked() => new AccountBuilder().WithBalance(100_000m).Blocked();
}

// Test o'qilishi
var account = Accounts.Blocked();
```

## Realistik ma'lumot

```
   ⚠ Test ma'lumoti REALISTIK bo'lishi kerak:

   · 10 ta yozuv bilan N+1 sezilmaydi → 1000 ta kerak (M6.2)
   · kichik summalar bilan overflow topilmaydi
   · bitta valyuta bilan valyuta bug'lari topilmaydi
   · qisqa satrlar bilan uzunlik cheklovi topilmaydi
```

```csharp
// Katta hajm generatsiyasi — Bogus
var faker = new Faker<Payment>()
    .RuleFor(p => p.Id, f => f.Random.Guid())
    .RuleFor(p => p.AmountMinor, f => f.Random.Long(100, 100_000_000))
    .RuleFor(p => p.Currency, f => f.PickRandom("UZS", "USD"))
    .RuleFor(p => p.OccurredAt, f => f.Date.RecentOffset(days: 30));

await Db.Payments.AddRangeAsync(faker.Generate(10_000));
```

## Production ma'lumoti

```
   ⚠ HAQIQIY ma'lumot test muhitida ISHLATILMAYDI (M8.12):

   · test muhitida kirish nazorati zaifroq
   · u ko'pincha PCI/PII doirasidan tashqarida
   · loglar va dump'lar himoyalanmagan

   ✅ Sintetik generatsiya
   ✅ Yoki anonimlashtirish: PINFL, pasport, telefon, ism, karta tokeni
      — hammasi almashtiriladi
```

## Intervyu savollari

**1. Test ma'lumotini qanday tayyorlaysiz?**

> **Builder** naqshi bilan: `new AccountBuilder().WithBalance(100_000m).Blocked()`.
> Bu testni o'qishni osonlashtiradi va tayyorgarlik testni ko'mmaydi.
>
> Tez-tez uchraydigan holatlar uchun **Object Mother**: `Accounts.Blocked()`.
>
> Katta hajm kerak bo'lsa — Bogus bilan generatsiya.

**2. Production ma'lumotini test muhitida ishlatasizmi?**

> Yo'q. Test muhitida kirish nazorati zaifroq va u ko'pincha PCI/PII doirasidan
> tashqarida (M8.12).
>
> Sintetik generatsiya qilaman. Agar production nusxasi zarur bo'lsa —
> **anonimlashtirish majburiy**: PINFL, pasport, telefon, ism, karta tokenlari
> almashtiriladi.

## Xotira kartasi

```
Builder      new AccountBuilder().WithBalance(100_000m).Blocked()
             → testni o'qish oson, tayyorgarlik ko'mmaydi
Object Mother  Accounts.Rich() · Accounts.Blocked()
Realistik    10 yozuv bilan N+1 sezilmaydi → 1000 kerak
             kichik summa bilan overflow topilmaydi
Generatsiya  Bogus — katta hajm uchun
Production   test muhitida HAQIQIY ma'lumot YO'Q
             kerak bo'lsa ANONIMLASHTIRISH majburiy
```

---

# 12.11 · Flaky testlar

## Sabablar

```
   ┌──────────────────────────────────────────────────────────────┐
   │  1. VAQT                                                       │
   │     DateTime.Now ishlatilgan · Task.Delay bilan kutish         │
   │     → TimeProvider (M4.7) · polling o'rniga signal             │
   ├──────────────────────────────────────────────────────────────┤
   │  2. TARTIB                                                     │
   │     testlar bir-birining ma'lumotiga bog'liq                   │
   │     → har testdan oldin TRUNCATE (12.6)                        │
   ├──────────────────────────────────────────────────────────────┤
   │  3. PARALLEL BAJARILISH                                        │
   │     umumiy resurs (DB, fayl, port)                             │
   │     → collection bilan ketma-ketlashtirish                     │
   ├──────────────────────────────────────────────────────────────┤
   │  4. TASODIFIYLIK                                               │
   │     Random seed'siz · Guid tartibi                             │
   │     → seed belgilangan Random                                  │
   ├──────────────────────────────────────────────────────────────┤
   │  5. TASHQI BOG'LIQLIK                                          │
   │     real API, tarmoq, DNS                                      │
   │     → fake/mock (12.4)                                         │
   ├──────────────────────────────────────────────────────────────┤
   │  6. CONCURRENCY                                                │
   │     race testlari tabiatan ehtimoliy (12.7)                    │
   │     → invariant tekshiruvi, ko'p marta ishga tushirish         │
   └──────────────────────────────────────────────────────────────┘
```

## Vaqt bilan ishlash

```csharp
// ❌ Flaky — sekin mashinada sinadi
await service.StartAsync();
await Task.Delay(100);                       // ⚠ "yetarli bo'lar"
Assert.True(service.IsReady);

// ✅ Signal bilan
await service.StartAsync();
await service.ReadySignal.WaitAsync(TimeSpan.FromSeconds(5));
Assert.True(service.IsReady);

// ✅ Yoki polling + timeout
await WaitUntilAsync(() => service.IsReady, timeout: TimeSpan.FromSeconds(5));
```

## Flaky testni topish

```bash
# Bir necha marta ishga tushirish
for i in {1..20}; do dotnet test --filter Category=Integration || break; done

# Tartibni tasodifiy qilish (testlar bir-biriga bog'liqligini topish)
dotnet test -- xUnit.MethodDisplayOptions=all xUnit.ParallelizeTestCollections=true
```

## Nima QILMASLIK kerak

```
   ❌ Flaky testni [Fact(Skip = "flaky")] qilish
      → muammo qoladi, ishonch yo'qoladi

   ❌ Retry qo'shish (dotnet-retry)
      → haqiqiy bug'ni yashiradi

   ✅ SABABNI topish va tuzatish
      Flaky test ko'pincha REAL bug'ni ko'rsatadi:
      race condition, noto'g'ri taxmin, yashirin bog'liqlik
```

## Intervyu savollari

**1. Flaky test bilan nima qilasiz?**

> **Sabab topaman** — o'chirib qo'ymayman va retry qo'shmayman.
>
> Flaky test ko'pincha **real bug'ni** ko'rsatadi: race condition, vaqt haqidagi
> noto'g'ri taxmin, testlar orasidagi yashirin bog'liqlik.
>
> Uni skip qilish yoki retry bilan yashirish — muammoni saqlab qolish va jamoaning
> testlarga ishonchini yo'qotish.

**2. Eng ko'p uchraydigan flaky sabablari?**

> **Vaqt** — `Task.Delay` bilan «yetarli bo'lar» deb kutish; sekin mashinada
> sinadi. Yechim: signal yoki polling + timeout.
>
> **Testlar orasidagi bog'liqlik** — biri qoldirgan ma'lumot boshqasiga ta'sir
> qiladi. Yechim: har testdan oldin `TRUNCATE`.
>
> **Parallel bajarilishda umumiy resurs** — collection bilan ketma-ketlashtirish.

## Xotira kartasi

```
Sabablar     VAQT (Task.Delay) · TARTIB · parallel · tasodifiylik
             tashqi bog'liqlik · concurrency (tabiatan ehtimoliy)
Vaqt         Task.Delay ❌ → signal yoki polling + timeout
             DateTime.Now ❌ → TimeProvider
Tartib       har testdan oldin TRUNCATE
Topish       ko'p marta ishga tushirish · tartibni tasodifiy qilish
QILMANG      Skip qo'yish · retry qo'shish → bug YASHIRINADI
             flaky test ko'pincha REAL bug'ni ko'rsatadi
```

---

# 12.12 · Coverage nimani o'lchaydi

## Nima va nega

```
   Coverage = bajarilgan kod qatorlari / jami qatorlar

   ⚠ Bu SIFAT emas, QAMROV o'lchovi:

   · 100% coverage — hech qanday bug yo'qligini ANGLATMAYDI
   · getter'larni tekshirib 90% olish mumkin
   · lost update testi bo'lmasa tizim baribir buziladi
```

```csharp
// ⚠ Bu test 100% coverage beradi, LEKIN hech nima tekshirmaydi
[Fact]
public void CoverageTheater()
{
    var account = Account.Open(Money.FromMajor(100m, Currency.Uzs));
    account.Withdraw(Money.FromMajor(50m, Currency.Uzs), key);
    // assert YO'Q — kod bajarildi, xatti-harakat tekshirilmadi
}
```

## Turlari

```
   ┌──────────────────┬───────────────────────────────────────────┐
   │  Line            │  bajarilgan qatorlar — eng sodda          │
   │  Branch          │  har if/else tarmog'i — foydaliroq       │
   │  Condition       │  murakkab shartning har qismi             │
   │  MUTATION        │  ⭐ kodni ataylab buzib, test ushlaydimi? │
   └──────────────────┴───────────────────────────────────────────┘
```

## Mutation testing

```
   Stryker.NET kodni ataylab buzadi:

   if (amount > balance)   →   if (amount >= balance)
   return true             →   return false
   x + y                   →   x - y

   → test SINSA: mutant "o'ldirildi" ✅ (test yaxshi)
   → test o'tsa: mutant "omon qoldi" ❌ (test bu holatni tekshirmaydi)

   Mutation score = o'ldirilgan / jami mutantlar

   ⚠ Bu coverage'dan ANCHA ishonchli sifat o'lchovi
```

```bash
dotnet tool install -g dotnet-stryker
dotnet stryker --threshold-high 80 --threshold-low 60
```

## Amaliy yondashuv

```
   ┌──────────────────────────────────────────────────────────────┐
   │  ✅ Coverage'ni MAQSAD emas, SIGNAL sifatida ishlating        │
   │     · keskin tushish → nimadir test qilinmay qoldi            │
   │     · 0% qamrovli fayl → e'tibor kerak                        │
   │                                                                │
   │  ⚠ Chegara qo'yilsa: kritik yo'llar uchun (domen, pul)        │
   │     emas, butun loyiha uchun umumiy raqam                     │
   │                                                                │
   │  ✅ Muhimroq savol: KRITIK YO'LLAR qamrab olinganmi?          │
   │     · lost update · limit · idempotentlik · yaxlitlash        │
   └──────────────────────────────────────────────────────────────┘
```

## Intervyu savollari

**1. Coverage maqsad bo'lishi kerakmi?** ⭐

> Yo'q. Coverage — **qamrov** o'lchovi, sifat emas. Getter'larni tekshirib 90%
> olish mumkin, lekin lost update testi bo'lmasa tizim baribir buziladi.
>
> Va assert'siz test ham coverage beradi — kod bajariladi, xatti-harakat
> tekshirilmaydi.
>
> Men uni **signal** sifatida ishlataman: keskin tushish yoki 0% qamrovli fayl
> e'tibor talab qiladi.

**2. Sifatni qanday o'lchaysiz?**

> **Mutation testing** — Stryker.NET kodni ataylab buzadi (`>` ni `>=` ga
> o'zgartiradi, `return true` ni `false` qiladi) va test buni ushlaydimi deb
> tekshiradi.
>
> Bu coverage'dan ancha ishonchli: u testning **haqiqatan nimadir tekshirayotganini**
> ko'rsatadi.
>
> Va eng muhim savol raqamlarda emas: **kritik yo'llar** — lost update, limit,
> idempotentlik, yaxlitlash — qamrab olinganmi?

## Xotira kartasi

```
Coverage     bajarilgan qatorlar / jami — QAMROV, sifat EMAS
             100% ≠ bug yo'q · assert'siz test ham coverage beradi
Turlari      line · branch (foydaliroq) · condition · MUTATION ⭐
Mutation     kodni ataylab buzadi (> → >=) · test ushlaydimi?
             mutation score — coverage'dan ANCHA ishonchli
Amaliy       coverage — MAQSAD emas, SIGNAL (keskin tushish, 0% fayl)
             muhim savol: KRITIK YO'LLAR qamralganmi?
             lost update · limit · idempotentlik · yaxlitlash
```

---

# 12.13 · Code review

## Nimaga qaraladi — tartib bilan

```
   ┌─ 1. TO'G'RILIK ─────────────────────────────────────────────┐
   │  · biznes qoidasi to'g'ri bajarilganmi                       │
   │  · chegara holatlari (0, manfiy, maksimum)                   │
   │  · xato yo'llari ishlanganmi                                 │
   ├─ 2. XAVFSIZLIK ────────────────────────────────────────────┤
   │  · EGALIK tekshiruvi bormi (M8.5)                            │
   │  · raw SQL parametrlanganmi (M8.8)                           │
   │  · maxfiy ma'lumot logga tushmaydimi                         │
   ├─ 3. CONCURRENCY ───────────────────────────────────────────┤
   │  · check-then-act naqshi bormi (M3.9)                        │
   │  · tranzaksiya chegarasi to'g'rimi                           │
   │  · idempotentlik ta'minlanganmi                              │
   ├─ 4. MA'LUMOT ──────────────────────────────────────────────┤
   │  · migratsiya orqaga mosmi (M5.13)                           │
   │  · indeks kerakmi                                             │
   │  · N+1 bormi (M6.2)                                          │
   ├─ 5. TEST ──────────────────────────────────────────────────┤
   │  · yangi mantiq test bilan qoplanganmi                       │
   │  · bug tuzatilgan bo'lsa — uni ISBOTLAYDIGAN test bormi      │
   ├─ 6. O'QILISHI ─────────────────────────────────────────────┤
   │  · nomlar aniqmi · murakkablik oqlanganmi                    │
   └─────────────────────────────────────────────────────────────┘
```

## Fintech uchun qo'shimcha ro'yxat

```
   □ Pul `decimal` yoki `long` minor unit'da (M4.1)
   □ Valyuta har joyda birga yuradi
   □ Yaxlitlash markazlashtirilgan qoidadan foydalanadi (M4.4)
   □ `DateTime.Now` yo'q — `DateTimeOffset.UtcNow` (M4.7)
   □ Tranzaksiya ichida tashqi chaqiruv yo'q (M5.1)
   □ Yangi endpoint'da `Idempotency-Key` bormi (M10.16)
   □ Audit log yoziladimi (M8.13)
   □ Timeout `failed` deb belgilanmaydimi (M10.13)
```

## Qanday sharh yozish

```
   ✅ Konstruktiv:
   "Bu yerda check-then-act bor: `SELECT` va `UPDATE` orasida boshqa
    tranzaksiya kirishi mumkin (M5.3). Shartni `UPDATE` ichiga
    ko'chirsak race yo'qoladi. Misol: ..."

   ❌ Foydasiz:
   "Bu noto'g'ri"
   "Nega bunday qildingiz?"
   "Men boshqacha yozgan bo'lardim"

   → SABAB + TAKLIF + iloji bo'lsa MISOL
```

```
   Sharh darajalari:
   · BLOCKER   — birlashtirib bo'lmaydi (bug, xavfsizlik)
   · MAJOR     — tuzatilishi kerak
   · MINOR     — yaxshi bo'lardi
   · NIT       — did masalasi, ixtiyoriy
```

## Avtomatlashtiriladigan narsalar

```
   ⚠ Odam qilmasligi kerak bo'lgan ishlar:

   · formatlash        → dotnet format / .editorconfig
   · nomlash qoidalari → analyzer
   · murakkablik       → analyzer (cyclomatic complexity)
   · zaif paketlar     → dotnet list package --vulnerable (M8.7)
   · arxitektura       → NetArchTest (M9.4)
   · sirlar            → gitleaks (M8.9)

   → Odam faqat MANTIQ va DIZAYNGA e'tibor bersin
```

## Intervyu savollari

**1. Code review'da nimaga qaraysiz?** ⭐

> Tartib bilan: **to'g'rilik** (biznes qoidasi, chegara holatlari), **xavfsizlik**
> (egalik tekshiruvi, parametrlangan SQL, maxfiy ma'lumot), **concurrency**
> (check-then-act, tranzaksiya chegarasi), **ma'lumot** (migratsiya, indeks, N+1),
> **test**, va oxirida **o'qilishi**.
>
> Fintech'da qo'shimcha ro'yxat bor: pul turi, valyuta, yaxlitlash, `DateTime.Now`
> yo'qligi, tranzaksiya ichida tashqi chaqiruv yo'qligi, idempotentlik.
>
> Formatlash va nomlash — bu **avtomatlashtiriladi**, odam vaqti mantiqqa
> sarflanishi kerak.

**2. Sharhni qanday yozasiz?**

> **Sabab + taklif + misol**. «Bu noto'g'ri» degan sharh foydasiz.
>
> Va darajani ko'rsataman: blocker, major, minor yoki nit. Shunda muallif nimani
> albatta tuzatish kerakligini va nima ixtiyoriy ekanini biladi.

## Xotira kartasi

```
Tartib       1. TO'G'RILIK · 2. XAVFSIZLIK · 3. CONCURRENCY
             4. MA'LUMOT · 5. TEST · 6. o'qilishi
Fintech ro'yxati  pul turi · valyuta · yaxlitlash · DateTime.Now yo'q
             tranzaksiyada tashqi chaqiruv yo'q · Idempotency-Key
             audit log · timeout failed emas
Sharh        SABAB + TAKLIF + MISOL · "bu noto'g'ri" ❌
Darajalar    BLOCKER · MAJOR · MINOR · NIT
Avtomatlashtiring  format · nomlash · murakkablik · zaif paket
             arxitektura (NetArchTest) · sirlar (gitleaks)
             → odam faqat MANTIQ va DIZAYNGA
```

---

## M12 — yakuniy tekshiruv ro'yxati

- [ ] Test piramidasi va fintech'da nisbatning o'zgarishi
- [ ] `Fact` va `Theory` farqi
- [ ] Yaxshi test anatomiyasi va nomlash
- [ ] Nimani test qilmaysiz
- [ ] Nimani mock qilasiz, nimani yo'q
- [ ] Ko'p mock nima demak
- [ ] `Verify` ni qachon ishlatasiz
- [ ] `WebApplicationFactory` nimani tekshiradi
- [ ] Nega `InMemory` provider ishlatilmaydi
- [ ] Testlar orasida izolyatsiya
- [ ] **Concurrency testini qanday yozasiz** ⭐
- [ ] «Bug'ni isbotlaydigan test» nima
- [ ] Pul arifmetikasida qaysi chegara holatlari
- [ ] Property-based testing nima va nimani almashtirmaydi
- [ ] Production ma'lumotini test muhitida ishlatasizmi
- [ ] Flaky test bilan nima qilasiz
- [ ] Coverage maqsad bo'lishi kerakmi
- [ ] Mutation testing nima
- [ ] Code review'da nimaga qaraysiz

**«Kodingiz to'g'riligini qanday kafolatlaysiz?» — tayyor javob:**

> To'rt qatlamda.
>
> **Domen mantiqi** — unit test, ayniqsa chegara holatlari: nol, manfiy, maksimum,
> bo'lish qoldig'i.
>
> **Concurrency va DB** — Testcontainers bilan **real PostgreSQL**da integration
> test. Ikki parallel yechish testi: birov rad etilishi shart. Va men **bug'ni
> isbotlaydigan** testni ham yozaman — himoyasiz variant lost update berishini
> ko'rsatadi.
>
> **Pul arifmetikasi** — `Theory` bilan ko'p holat va **invariant** testlari:
> `sum(parts) == total`, breakdown balansi.
>
> **Kritik oqim** — to'lovning to'liq yo'li uchun E2E.
>
> Va tan olaman: test yozmaslik mening zaifligim edi. Shuning uchun endi har PR'da
> test talab qiladigan qoida qo'ydim va coverage emas, **kritik yo'llar qamrovi**
> ni kuzataman.

**Deliverable'lar:**

- [ ] `LostUpdateTests` — 4 test (naive/atomik/pessimistic/optimistic)
- [ ] `DeadlockTests` — tartibsiz vs tartibli qulflash
- [ ] `LimitWriteSkewTests` — bug isboti va atomik yechim
- [ ] `StressInvariantTests` — 500 tasodifiy operatsiya + invariantlar
- [ ] `MoneyArithmeticTests` — yaxlitlash, bo'lish, chegara holatlari
- [ ] `ApiIntegrationTests` — status kodlar, egalik, idempotentlik
- [ ] `PostgresFixture` + `DatabaseTestBase` — qayta ishlatiladigan asos
