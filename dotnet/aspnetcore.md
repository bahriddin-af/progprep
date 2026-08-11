# M7 · ASP.NET Core

Kundalik ish savollari shu yerdan. Bu modul «siz haqiqatan backend yozganmisiz»
degan savolga javob beradi — nazariy emas, amaliy tafsilotlar tekshiriladi.

| # | Mavzu | P |
|---|---|---|
| [7.1](#71--kestrel-hosting-va-sorov-hayot-sikli) | Kestrel, hosting, so'rov hayot sikli | P1 |
| [7.2](#72--middleware-pipeline-) | Middleware pipeline ⭐ | P0 |
| [7.3](#73--di-va-lifetimelar-) | DI va lifetime'lar ⭐ | P0 |
| [7.4](#74--konfiguratsiya-va-sirlar) | Konfiguratsiya, `IOptions`, sirlar | P1 |
| [7.5](#75--model-binding-va-validatsiya) | Model binding va validatsiya | P1 |
| [7.6](#76--rest-dizayni-) | REST dizayni ⭐ | P0 |
| [7.7](#77--xato-formati-va-global-handler-) | Xato formati, global handler ⭐ | P0 |
| [7.8](#78--httpclientfactory-va-polly) | `HttpClientFactory`, Polly | P1 |
| [7.9](#79--minimal-api-va-controller) | Minimal API va Controller | P2 |
| [7.10](#710--background-service-va-graceful-shutdown) | Background service, graceful shutdown | P1 |
| [7.11](#711--rate-limiting-cors-caching) | Rate limiting, CORS, caching | P1 |
| [7.12](#712--grpc-va-webhook) | gRPC va webhook | P2 |

---

# 7.1 · Kestrel, hosting va so'rov hayot sikli

## Nima va nega

So'rov qayerdan kelib, qayerga borishini bilish — debug va performans muammolarini
hal qilishning asosi.

```
   Internet
      │
      ▼
   ┌──────────────────┐
   │  Reverse proxy   │   nginx / IIS / Envoy
   │                  │   · TLS terminatsiya
   │                  │   · yuk taqsimlash
   └────────┬─────────┘   · statik fayllar
            │
            ▼
   ┌──────────────────┐
   │     Kestrel      │   .NET'ning ichki web serveri
   │  (cross-platform)│   · HTTP/1.1, HTTP/2, HTTP/3
   └────────┬─────────┘   · kirish/chiqish bufer'lari
            │
            ▼
   ┌──────────────────┐
   │  Middleware      │   ◄── 7.2
   │  pipeline        │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │  Endpoint        │   Controller / Minimal API
   │  (sizning kod)   │
   └──────────────────┘
```

> **Nega reverse proxy kerak:** Kestrel to'g'ridan-to'g'ri internetga qo'yilishi
> mumkin, lekin proxy TLS, siqish, statik fayllar, DDoS himoyasi va bir necha
> ilovani bitta portda ko'rsatishni yaxshiroq bajaradi.

## Ilova ishga tushishi

```csharp
var builder = WebApplication.CreateBuilder(args);

// 1. Konfiguratsiya yuklanadi (7.4)
// 2. Xizmatlar ro'yxatdan o'tkaziladi (7.3)
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(cs));
builder.Services.AddScoped<IPaymentService, PaymentService>();

var app = builder.Build();     // ◄── DI konteyner QURILADI, o'zgartirib bo'lmaydi

// 3. Middleware pipeline quriladi (7.2)
app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();          // ◄── Kestrel tinglashni boshlaydi
```

## `HttpContext`

```csharp
public async Task<IActionResult> Handle(CancellationToken ct)
{
    HttpContext.Request.Headers["Idempotency-Key"];
    HttpContext.Request.RouteValues["id"];
    HttpContext.User.FindFirst(ClaimTypes.NameIdentifier);
    HttpContext.RequestAborted;              // client uzilsa bekor bo'ladi (M3.5)
    HttpContext.TraceIdentifier;             // so'rov ID — logda ishlatiladi
    HttpContext.Items["tenant"] = tenant;    // middleware'lar orasida ma'lumot
}
```

```
   ⚠ HttpContext SO'ROV TUGAGACH YAROQSIZ bo'ladi.
     Uni fon vazifasiga uzatmang — kerakli qiymatlarni nusxalab oling.

   ❌ _ = Task.Run(() => Log(HttpContext.User.Identity.Name));
   ✅ var user = HttpContext.User.Identity.Name;
      _ = Task.Run(() => Log(user));
```

## Kestrel sozlamalari

```csharp
builder.WebHost.ConfigureKestrel(o =>
{
    o.Limits.MaxRequestBodySize = 10 * 1024 * 1024;          // 10 MB
    o.Limits.MaxConcurrentConnections = 1000;
    o.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);
    o.Limits.MinRequestBodyDataRate =
        new MinDataRate(bytesPerSecond: 100, TimeSpan.FromSeconds(10));  // slowloris himoyasi
});
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `HttpContext` ni fon vazifasiga uzatish | So'rov tugagach yaroqsiz — exception |
| `IHttpContextAccessor` ni singleton'da ishlatish | `null` yoki boshqa so'rovning konteksti |
| `MaxRequestBodySize` ni cheksiz qilish | DoS xavfi |
| Proxy ortida `X-Forwarded-For` ni sozlamaslik | Client IP noto'g'ri — rate limiting buziladi |
| `app.Build()` dan keyin servis qo'shishga urinish | Exception — konteyner qurilgan |

```csharp
// Proxy ortida — HAQIQIY client IP va sxema
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});
// ⚠ Bu eng birinchi middleware bo'lishi kerak
```

## Fintech konteksti

- **Client IP** — anti-fraud va rate limiting uchun kritik. Proxy ortida
  `ForwardedHeaders` sozlanmagan bo'lsa, hamma so'rov proxy IP'sidan kelgan
  ko'rinadi va rate limiting **butun tizimni bloklaydi**.
- **`RequestAborted`** — client uzilganda ishni to'xtatish, lekin pul harakati
  boshlangandan keyin emas (M3.5).
- **`TraceIdentifier`** — har xato javobida qaytariladi va logda qidiriladi (7.7).

## Intervyu savollari

**1. So'rov ilovaga qanday yetib keladi?**

> Internet → reverse proxy (nginx/IIS) → Kestrel → middleware pipeline → endpoint.
>
> Proxy TLS terminatsiya, siqish, statik fayllar va yuk taqsimlashni bajaradi;
> Kestrel — .NET'ning ichki cross-platform web serveri.
>
> Kestrel to'g'ridan-to'g'ri internetga qo'yilishi ham mumkin, lekin production'da
> odatda proxy ortida turadi.

**2. `HttpContext` ni fon vazifasiga uzatsa bo'ladimi?**

> Yo'q. U so'rov tugagach **yaroqsiz** bo'ladi — `ObjectDisposedException` yoki
> kutilmagan `null` beradi.
>
> Kerakli qiymatlarni (user ID, trace ID, tenant) **nusxalab olib**, keyin
> uzataman.
>
> Xuddi shu sabab `IHttpContextAccessor` ni singleton servisda ishlatib bo'lmaydi.

**3. Proxy ortida client IP nega noto'g'ri ko'rinadi?**

> Kestrel `RemoteIpAddress` sifatida **proxy'ning IP'sini** ko'radi. Haqiqiy client
> IP `X-Forwarded-For` header'ida keladi.
>
> `UseForwardedHeaders` bilan sozlanmasa — rate limiting hamma so'rovni bitta IP
> deb hisoblaydi va butun tizimni bloklaydi.
>
> Va bu middleware **eng birinchi** bo'lishi kerak, aks holda undan oldingi
> middleware'lar noto'g'ri IP ko'radi.

## Deliverable

```csharp
[Fact]
public async Task ForwardedHeaders_ExposeRealClientIp()
{
    var client = factory.CreateClient();
    client.DefaultRequestHeaders.Add("X-Forwarded-For", "203.0.113.7");

    var response = await client.GetAsync("/debug/client-ip");
    Assert.Equal("203.0.113.7", await response.Content.ReadAsStringAsync());
}

[Fact]
public async Task LargeBody_IsRejected()
{
    var payload = new byte[11 * 1024 * 1024];
    var response = await client.PostAsync("/payments", new ByteArrayContent(payload));

    Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
}
```

## Xotira kartasi

```
Oqim         internet → reverse proxy → Kestrel → middleware → endpoint
Proxy        TLS · siqish · statik fayl · yuk taqsimlash · DDoS
Kestrel      .NET ichki server · HTTP/1.1, /2, /3 · limitlar sozlanadi
HttpContext  so'rov tugagach YAROQSIZ → fon vazifasiga uzatmang
             kerakli qiymatlarni NUSXALANG
Proxy ortida UseForwardedHeaders — ENG BIRINCHI middleware
             aks holda client IP = proxy IP → rate limiting buziladi
Limitlar     MaxRequestBodySize · MinRequestBodyDataRate (slowloris)
```

---

# 7.2 · Middleware pipeline ⭐

## Nima va nega

Har so'rov middleware'lar zanjiridan o'tadi. Ular **matryoshka** kabi joylashgan:
so'rov ichkariga kiradi, javob teskari tartibda qaytadi.

```
   So'rov ──────────────────────────────────────────────┐
                                                         │
   ┌─ ExceptionHandler ─────────────────────────────┐   │
   │  ┌─ HttpsRedirection ────────────────────────┐ │   │
   │  │  ┌─ Routing ───────────────────────────┐  │ │   │
   │  │  │  ┌─ Authentication ──────────────┐  │  │ │   │
   │  │  │  │  ┌─ Authorization ─────────┐  │  │  │ │   │
   │  │  │  │  │  ┌─ Endpoint ────────┐  │  │  │  │ │   │
   │  │  │  │  │  │   Controller      │◄─┼──┼──┼──┼─┼───┘
   │  │  │  │  │  └───────────────────┘  │  │  │  │ │
   │  │  │  │  └─────────────────────────┘  │  │  │ │
   │  │  │  └───────────────────────────────┘  │  │ │
   │  │  └─────────────────────────────────────┘  │ │
   │  └───────────────────────────────────────────┘ │
   └────────────────────────────────────────────────┘
                                                    │
   Javob ◄──────────────────────────────────────────┘
         (teskari tartibda)
```

## To'g'ri tartib

```csharp
var app = builder.Build();

app.UseForwardedHeaders();      // 1. eng birinchi — haqiqiy IP kerak
app.UseExceptionHandler();      // 2. hamma xatolarni ushlash uchun tashqarida
app.UseHsts();                  // 3.
app.UseHttpsRedirection();      // 4.
app.UseStaticFiles();           // 5. — routing'dan oldin (tezroq)
app.UseRouting();               // 6. — endpoint aniqlanadi
app.UseCors();                  // 7. — routing'dan keyin, auth'dan oldin
app.UseRateLimiter();           // 8.
app.UseAuthentication();        // 9. — KIM?
app.UseAuthorization();         // 10. — RUXSATI BORMI?
app.MapControllers();           // 11. — endpoint bajariladi
```

```
   ⚠ TARTIB XATOLARI VA OQIBATLARI:

   Authorization → Authentication oldida
   └─► foydalanuvchi hali aniqlanmagan → ruxsat tekshiruvi noto'g'ri

   Authentication → Routing oldida
   └─► endpoint metadata'si yo'q → [Authorize] atributi ko'rinmaydi

   ExceptionHandler → ichkarida
   └─► undan tashqaridagi xatolar ushlanmaydi

   CORS → Routing oldida
   └─► preflight so'rovlar noto'g'ri ishlanadi
```

## O'z middleware'ingiz

```csharp
public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    private const string HeaderName = "X-Correlation-Id";

    public async Task InvokeAsync(HttpContext ctx, ILogger<CorrelationIdMiddleware> log)
    {
        var correlationId = ctx.Request.Headers[HeaderName].FirstOrDefault()
                            ?? Guid.NewGuid().ToString();

        ctx.Items["CorrelationId"] = correlationId;
        ctx.Response.Headers[HeaderName] = correlationId;

        using (log.BeginScope(new Dictionary<string, object>
               { ["CorrelationId"] = correlationId }))
        {
            await next(ctx);          // ⚠ CHAQIRILMASA zanjir uziladi
        }
    }
}

app.UseMiddleware<CorrelationIdMiddleware>();
```

```
   ⚠ MUHIM NUANSLAR:

   1. Middleware konstruktori BIR MARTA chaqiriladi → u SINGLETON
      → Scoped bog'liqlikni konstruktorga OLMANG
      → InvokeAsync parametri sifatida oling (u har so'rovda hal qilinadi)

   2. next(ctx) chaqirilmasa — zanjir uziladi (short-circuit)
      Bu ba'zan ATAYLAB qilinadi: kesh hit, rate limit, auth rad

   3. Javob boshlangandan keyin header o'zgartirib bo'lmaydi
      → ctx.Response.HasStarted ni tekshiring
```

## Terminal va shartli middleware

```csharp
// Terminal — next chaqirmaydi
app.Map("/health", b => b.Run(async ctx => await ctx.Response.WriteAsync("OK")));

// Shartli
app.UseWhen(ctx => ctx.Request.Path.StartsWithSegments("/api"),
            b => b.UseMiddleware<ApiKeyMiddleware>());

// Filter (MVC) va middleware farqi:
//   middleware — butun pipeline, endpoint'ni bilmaydi
//   filter     — faqat MVC, model binding'dan keyin, action'ni biladi
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `UseAuthorization` `UseAuthentication`dan oldin | Ruxsat tekshiruvi ishlamaydi |
| `UseRouting` dan oldin auth | Endpoint metadata ko'rinmaydi |
| Middleware konstruktorida Scoped servis | Captive dependency (7.3) |
| `next(ctx)` ni unutish | So'rov osilib qoladi |
| Javob boshlangach header o'zgartirish | `InvalidOperationException` |
| Har so'rovda og'ir ish qiladigan middleware | Butun tizim sekinlashadi |

## Fintech konteksti

- **Correlation ID middleware** — majburiy: har so'rovga ID beriladi, u logda,
  javobda va tashqi chaqiruvlarda ishlatiladi. Incident tahlili shunga tayanadi.
- **Idempotency middleware** — `Idempotency-Key` header'ini tekshirib, takroriy
  so'rovga saqlangan javobni qaytarish (M11.2).
- **Audit middleware** — kim, qaysi endpoint'ga, qachon murojaat qilgani yoziladi.

## Intervyu savollari

**1. Middleware tartibi nega muhim?** ⭐

> Pipeline ketma-ket bajariladi va javob **teskari tartibda** qaytadi — matryoshka
> kabi.
>
> Aniq misollar:
> - `UseAuthorization` `UseAuthentication`dan **oldin** bo'lsa — foydalanuvchi hali
>   aniqlanmagan va ruxsat tekshiruvi noto'g'ri ishlaydi.
> - Auth `UseRouting`dan oldin bo'lsa — endpoint metadata'si mavjud emas, ya'ni
>   `[Authorize]` atributi ko'rinmaydi.
> - `UseExceptionHandler` eng tashqarida bo'lishi kerak, aks holda undan
>   ichkaridagi xatolarni ushlay olmaydi.

**2. O'z middleware'ingizda Scoped servisni qanday olasiz?**

> Konstruktorda **emas** — middleware bir marta yaratiladi va aslida singleton.
> Konstruktorga Scoped servis olsangiz captive dependency bo'ladi.
>
> To'g'ri yo'l: uni `InvokeAsync` metodining parametri sifatida olish — DI uni har
> so'rovda o'sha so'rovning scope'idan hal qiladi.

**3. Middleware va filter farqi nima?**

> **Middleware** — butun pipeline darajasida, har so'rov uchun ishlaydi va
> endpoint haqida hech nima bilmaydi (routing'dan keyin metadata'ni ko'rishi
> mumkin).
>
> **Filter** — faqat MVC/API doirasida, model binding'dan keyin ishlaydi va qaysi
> action chaqirilayotganini, uning parametrlarini biladi.
>
> Cross-cutting infratuzilma (logging, correlation ID) — middleware; action
> darajasidagi mantiq (validatsiya natijasi, resurs egaligi) — filter.

**4. `next()` chaqirilmasa nima bo'ladi?**

> Zanjir uziladi — bu **short-circuit**. Undan keyingi middleware'lar va endpoint
> umuman bajarilmaydi.
>
> Bu ba'zan ataylab qilinadi: kesh hit bo'lganda, rate limit oshganda, autentifikatsiya
> rad etilganda. Tasodifan qilinsa — so'rov javobsiz osilib qoladi.

## Deliverable

```csharp
public class MiddlewareTests
{
    [Fact]
    public async Task CorrelationId_IsReturnedInResponse()
    {
        var response = await client.GetAsync("/payments");
        Assert.True(response.Headers.Contains("X-Correlation-Id"));
    }

    [Fact]
    public async Task ExistingCorrelationId_IsPreserved()
    {
        var id = Guid.NewGuid().ToString();
        client.DefaultRequestHeaders.Add("X-Correlation-Id", id);

        var response = await client.GetAsync("/payments");
        Assert.Equal(id, response.Headers.GetValues("X-Correlation-Id").Single());
    }

    [Fact]
    public async Task Authorization_RunsAfterAuthentication()
    {
        var response = await client.GetAsync("/payments");     // token yo'q
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);   // 403 EMAS
    }

    [Fact]
    public async Task ExceptionHandler_CatchesDownstreamErrors()
    {
        var response = await client.GetAsync("/debug/throw");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Contains("traceId", body);
    }
}
```

## Xotira kartasi

```
Model        matryoshka — so'rov ichkariga, javob TESKARI tartibda
Tartib       ForwardedHeaders → ExceptionHandler → HttpsRedirection
             → StaticFiles → Routing → CORS → RateLimiter
             → Authentication → Authorization → MapControllers
Xatolar      Authz Authn'dan oldin → foydalanuvchi aniqlanmagan
             Auth Routing'dan oldin → endpoint metadata yo'q
             ExceptionHandler ichkarida → xatolar ushlanmaydi
Middleware   konstruktor BIR MARTA → aslida SINGLETON
             Scoped bog'liqlikni InvokeAsync PARAMETRI sifatida oling
next()       chaqirilmasa short-circuit (ataylab: kesh, rate limit, auth rad)
Filter       faqat MVC · model binding'dan keyin · action'ni biladi
Fintech      correlation ID · idempotency · audit middleware
```

---

# 7.3 · DI va lifetime'lar ⭐

## Nima va nega

Dependency Injection — ASP.NET Core'ning o'zagi. Lifetime'ni noto'g'ri tanlash
**jimgina** ishlaydigan, lekin noto'g'ri natija beradigan tizim yaratadi.

```
   ┌─ Transient ────────────────────────────────────────────┐
   │  Har so'raganda YANGI                                   │
   │  Yengil, holatsiz servislar                            │
   └────────────────────────────────────────────────────────┘

   ┌─ Scoped ───────────────────────────────────────────────┐
   │  Har HTTP so'rov uchun BITTA                            │
   │  DbContext, repository, Unit of Work                   │
   └────────────────────────────────────────────────────────┘

   ┌─ Singleton ────────────────────────────────────────────┐
   │  Ilova umriga BITTA                                     │
   │  Kesh, konfiguratsiya, HttpClientFactory               │
   │  ⚠ THREAD-SAFE bo'lishi SHART                           │
   └────────────────────────────────────────────────────────┘
```

## Captive dependency

Eng ko'p uchraydigan va eng jimgina xato: **uzoq yashaydigan servis qisqa umrlisini
asirga oladi**.

```
   ┌────────────────────────────────────────────────────────┐
   │  Singleton CacheService                                │
   │      │                                                  │
   │      └──► AppDbContext (Scoped)                         │
   │              │                                          │
   │              └──► ⚠ BIRINCHI so'rovning context'i       │
   │                     butun ilova umriga qoladi           │
   │                                                          │
   │  Oqibat:                                                │
   │  · eskirgan ma'lumot (change tracker tozalanmaydi)      │
   │  · thread-safety buzilishi (DbContext thread-safe emas) │
   │  · ochiq qolgan DB ulanishi                             │
   └────────────────────────────────────────────────────────┘
```

```csharp
// ❌ Captive dependency
services.AddSingleton<CacheService>();      // ichida AppDbContext bor

// ✅ Kerak bo'lganda scope ochish
public sealed class CacheService(IServiceScopeFactory scopeFactory)
{
    public async Task<Rate> LoadAsync(string pair, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Rates.FirstAsync(r => r.Pair == pair, ct);
    }
}
```

```csharp
// Development'da bu xatoni ERTA ushlash
builder.Host.UseDefaultServiceProvider((ctx, options) =>
{
    options.ValidateScopes = true;        // captive dependency → exception
    options.ValidateOnBuild = true;       // yo'q bog'liqliklar → startup'da xato
});
```

## Ro'yxatdan o'tkazish usullari

```csharp
services.AddScoped<IPaymentService, PaymentService>();

// Factory bilan
services.AddSingleton<IClock>(_ => new SystemClock());

// Bir nechta implementatsiya
services.AddScoped<IPaymentProvider, ClickProvider>();
services.AddScoped<IPaymentProvider, PaymeProvider>();
// → konstruktorda IEnumerable<IPaymentProvider> olinadi

// Faqat yo'q bo'lsa qo'shish
services.TryAddScoped<IPaymentService, PaymentService>();

// Kalit bo'yicha (.NET 8+)
services.AddKeyedScoped<IPaymentProvider, ClickProvider>("click");
public Handler([FromKeyedServices("click")] IPaymentProvider provider) { }

// Dekorator
services.AddScoped<IPaymentService, PaymentService>();
services.Decorate<IPaymentService, LoggingPaymentService>();   // Scrutor paketi
```

## Lifetime tanlash jadvali

| Servis | Lifetime | Sabab |
|---|---|---|
| `DbContext` | **Scoped** | Bir so'rov = bir Unit of Work |
| Repository | **Scoped** | `DbContext` ga bog'liq |
| Application service | **Scoped** | Repository'ga bog'liq |
| `IMemoryCache` | **Singleton** | Ulashilgan holat |
| Konfiguratsiya (`IOptions`) | **Singleton** | O'zgarmas |
| `HttpClient` (factory orqali) | — | Factory boshqaradi |
| Stateless yordamchi | **Transient** yoki Singleton | Holat yo'q |
| Background service | **Singleton** | Hosted service |

## Tipik xatolar

| Xato | Natija |
|---|---|
| Singleton ichida Scoped | Captive dependency |
| Scoped ichida Transient `IDisposable` | Scope oxirigacha to'planadi |
| `ValidateScopes` ni yoqmaslik | Xato faqat production'da ko'rinadi |
| Singleton'da mutable holat | Race condition |
| Service locator (`GetService` har joyda) | Bog'liqliklar yashirin bo'ladi |
| `DbContext` ni Transient qilish | Har inyeksiya yangi context — tranzaksiya buziladi |

```csharp
// ⚠ Yashirin muammo: Scoped ichidagi Transient IDisposable
services.AddTransient<IDisposableHelper, Helper>();
// Scope oxirigacha HAR yaratilgan instance saqlanadi va Dispose kutadi
// → uzoq scope'da xotira o'sadi
```

## Fintech konteksti

- **`DbContext` Scoped** — bu tranzaksiya chegarasini belgilaydi. Transient qilsangiz
  har repository o'z context'ini oladi va **atomiklik yo'qoladi**.
- **Kurs keshi Singleton** — lekin ichida `IServiceScopeFactory` orqali DB'ga
  murojaat qilinadi.
- **Background service** (outbox relay) Singleton — har iteratsiyada o'z scope'ini
  ochadi (7.10).

## Intervyu savollari

**1. Lifetime'lar farqi nima?** ⭐

> **Transient** — har so'raganda yangi instance. **Scoped** — har HTTP so'rov uchun
> bitta. **Singleton** — ilova umriga bitta.
>
> `DbContext` Scoped bo'lishi kerak: bir so'rov bir Unit of Work bo'lishi va
> tranzaksiya chegarasi aniq bo'lishi uchun.
>
> Singleton'ga qo'yilgan har narsa **thread-safe** bo'lishi shart — bir vaqtda
> o'nlab so'rov unga tegadi.

**2. Captive dependency nima?** ⭐

> Uzoq yashaydigan servis qisqa umrlisini «asirga oladi». Klassik holat: Singleton
> ichida Scoped `DbContext`.
>
> Natija: birinchi so'rovning context'i butun ilova umriga qoladi — eskirgan
> ma'lumot, thread-safety buzilishi, ochiq qolgan ulanish.
>
> Yechim: `IServiceScopeFactory` orqali kerak bo'lganda scope ochish. Va
> `ValidateScopes = true` bilan bu xatoni development'da ushlash.

**3. Bir interfeys uchun bir nechta implementatsiya kerak bo'lsa?**

> Ikki variant. Hammasini birga ishlatish kerak bo'lsa — hammasini ro'yxatdan
> o'tkazib, konstruktorda `IEnumerable<IPaymentProvider>` olaman.
>
> Aniq birini tanlash kerak bo'lsa — .NET 8+ da **keyed services**:
> `AddKeyedScoped<IPaymentProvider, ClickProvider>("click")` va
> `[FromKeyedServices("click")]`.
>
> Undan oldin bu factory naqshi bilan hal qilinardi.

**4. Service locator nega anti-naqsh?**

> `serviceProvider.GetService<T>()` ni kod ichida chaqirsangiz, bog'liqliklar
> **yashirin** bo'lib qoladi: konstruktorga qarab sinf nimaga bog'liqligini bilib
> bo'lmaydi.
>
> Bu testni ham qiyinlashtiradi va kompilyatsiya vaqtida xatolarni yashiradi.
>
> Istisno — infratuzilma kodi: middleware, background service, factory'lar. U yerda
> scope'ni qo'lda boshqarish oqlanadi.

## Deliverable

```csharp
public class DependencyInjectionTests
{
    [Fact]
    public void CaptiveDependency_IsDetectedAtStartup()
    {
        var services = new ServiceCollection();
        services.AddSingleton<CacheService>();
        services.AddScoped<AppDbContext>();

        var provider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true, ValidateOnBuild = true });

        Assert.Throws<InvalidOperationException>(() => provider.GetService<CacheService>());
    }

    [Fact]
    public void ScopedService_IsSameWithinScope()
    {
        using var scope = factory.Services.CreateScope();
        var a = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var b = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        Assert.Same(a, b);
    }

    [Fact]
    public void ScopedService_DiffersAcrossScopes()
    {
        using var s1 = factory.Services.CreateScope();
        using var s2 = factory.Services.CreateScope();

        Assert.NotSame(s1.ServiceProvider.GetRequiredService<AppDbContext>(),
                       s2.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    [Fact]
    public void AllRegistrations_CanBeResolved()
    {
        // ValidateOnBuild bilan startup'da tekshiriladi, lekin aniq test ham foydali
        using var scope = factory.Services.CreateScope();
        foreach (var type in CriticalServiceTypes)
            Assert.NotNull(scope.ServiceProvider.GetService(type));
    }
}
```

## Xotira kartasi

```
Transient    har so'raganda yangi · yengil, holatsiz
Scoped       har HTTP so'rov uchun bitta · DbContext, repository
Singleton    ilova umriga bitta · kesh, konfiguratsiya · THREAD-SAFE bo'lsin
Captive      SINGLETON ichida SCOPED → birinchi so'rovning context'i abadiy qoladi
             → eskirgan ma'lumot · thread muammosi · ochiq ulanish
Yechim       IServiceScopeFactory bilan kerak bo'lganda scope ochish
Himoya       ValidateScopes = true · ValidateOnBuild = true (development)
Ko'p impl.   IEnumerable<T> yoki keyed services (.NET 8+)
Anti-naqsh   service locator — bog'liqliklar YASHIRIN bo'ladi
             istisno: middleware, background service, factory
```

---

# 7.4 · Konfiguratsiya va sirlar

## Nima va nega

Konfiguratsiya bir necha manbadan yig'iladi va **oxirgisi ustun** turadi. Sirlar
esa hech qachon repozitoriyga tushmasligi kerak.

```
   Yuklash tartibi (keyingisi oldingisini USTIDAN yozadi):

   1. appsettings.json
   2. appsettings.{Environment}.json          ← Development / Production
   3. User Secrets                            ← faqat Development
   4. Muhit o'zgaruvchilari                   ← konteynerda asosiy usul
   5. Buyruq qatori argumentlari              ← eng yuqori ustunlik
   6. Qo'shimcha provayderlar (Key Vault, Consul)
```

```json
// appsettings.json
{
  "Payments": {
    "Provider": "click",
    "TimeoutSeconds": 30,
    "MaxRetries": 3,
    "Limits": { "DailyMinor": 100000000 }
  }
}
```

```bash
# Muhit o'zgaruvchisi bilan ustidan yozish
# Ierarxiya uchun ikki pastki chiziq: __
export Payments__TimeoutSeconds=60
export Payments__Limits__DailyMinor=200000000
```

## `IOptions` oilasi

```csharp
public sealed class PaymentOptions
{
    public const string SectionName = "Payments";

    [Required] public string Provider { get; init; } = null!;
    [Range(1, 300)] public int TimeoutSeconds { get; init; }
    [Range(0, 10)] public int MaxRetries { get; init; }
}

builder.Services
    .AddOptions<PaymentOptions>()
    .Bind(builder.Configuration.GetSection(PaymentOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();          // ⚠ MUHIM: noto'g'ri konfiguratsiya → STARTUP'DA xato
```

| Interfeys | Lifetime | Qachon |
|---|---|---|
| `IOptions<T>` | Singleton | Qiymat o'zgarmaydi — **eng ko'p ishlatiladigan** |
| `IOptionsSnapshot<T>` | Scoped | Har so'rovda qayta o'qiladi |
| `IOptionsMonitor<T>` | Singleton | O'zgarishni **kuzatadi** — singleton ichida |

```csharp
// Singleton servisda o'zgaruvchi konfiguratsiya kerak bo'lsa
public sealed class RateLimiter(IOptionsMonitor<LimitOptions> options)
{
    public bool IsAllowed() => _count < options.CurrentValue.MaxPerMinute;
}
```

## Sirlarni boshqarish

```
   ┌──────────────────┬─────────────────────────────────────────┐
   │  Muhit           │  Sirlar qayerda                         │
   ├──────────────────┼─────────────────────────────────────────┤
   │  Development     │  User Secrets (repozitoriydan tashqarida)│
   │  CI/CD           │  Pipeline secrets                        │
   │  Production      │  Key Vault / Secrets Manager / K8s Secret│
   └──────────────────┴─────────────────────────────────────────┘

   ❌ HECH QACHON: appsettings.json ichida parol, API kalit, connection string
```

```bash
# Development
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Password=***"
```

```csharp
// Production — Azure Key Vault misoli
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{vaultName}.vault.azure.net/"),
    new DefaultAzureCredential());
```

```
   ⚠ Kalit rotatsiyasi:
   · sirlar muddatli bo'lishi kerak
   · rotatsiya paytida eski va yangi kalit bir vaqtda amal qilsin
   · IOptionsMonitor bilan qayta yuklash (yoki pod restart)
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Sirlarni `appsettings.json` da saqlash | Git tarixida abadiy qoladi |
| `ValidateOnStart` yozmaslik | Noto'g'ri konfiguratsiya faqat birinchi so'rovda ko'rinadi |
| Singleton'da `IOptionsSnapshot` | Exception — u Scoped |
| `IConfiguration` ni har joyda ishlatish | Tur xavfsizligi yo'q, typo topilmaydi |
| Muhit o'zgaruvchisida `:` ishlatish | Linux'da ishlamaydi — `__` kerak |
| Konfiguratsiyani log qilish | Sirlar logga tushadi |

```csharp
// ❌ Tur xavfsizligi yo'q — typo faqat runtime'da
var timeout = configuration["Payments:TimeoutSecnds"];   // null!

// ✅ Kuchli tiplashtirilgan
public Handler(IOptions<PaymentOptions> options)
    => _timeout = TimeSpan.FromSeconds(options.Value.TimeoutSeconds);
```

## Fintech konteksti

- **Provayder kalitlari, DB paroli, imzo kalitlari** — faqat Key Vault yoki K8s
  Secret. Repozitoriyda hech qachon.
- **Limitlar va komissiya stavkalari** — konfiguratsiyada emas, **DB'da** bo'lishi
  kerak: ular audit talab qiladi va deploy'siz o'zgarishi mumkin.
- **`ValidateOnStart`** majburiy: noto'g'ri konfiguratsiya bilan ishga tushgan
  to'lov servisi — bu incident.

## Intervyu savollari

**1. Konfiguratsiya qanday yuklanadi?**

> Bir necha manbadan ketma-ket, va **keyingisi oldingisini ustidan yozadi**:
> `appsettings.json` → `appsettings.{Env}.json` → User Secrets (faqat Development)
> → muhit o'zgaruvchilari → buyruq qatori.
>
> Konteynerda asosiy usul — muhit o'zgaruvchilari, ierarxiya uchun ikki pastki
> chiziq: `Payments__TimeoutSeconds`.

**2. `IOptions`, `IOptionsSnapshot`, `IOptionsMonitor` farqi?**

> `IOptions<T>` — Singleton, qiymat ilova ishga tushganda o'qiladi va o'zgarmaydi.
> Eng ko'p ishlatiladigani.
>
> `IOptionsSnapshot<T>` — Scoped, har so'rovda qayta o'qiladi. Singleton servisda
> ishlatib bo'lmaydi.
>
> `IOptionsMonitor<T>` — Singleton, lekin o'zgarishni kuzatadi va `CurrentValue`
> orqali yangi qiymatni beradi. Singleton ichida o'zgaruvchi konfiguratsiya kerak
> bo'lsa shu.

**3. Sirlarni qayerda saqlaysiz?**

> Development'da **User Secrets** — u repozitoriydan tashqarida, foydalanuvchi
> profilida saqlanadi.
>
> Production'da **Key Vault**, AWS Secrets Manager yoki Kubernetes Secret.
>
> `appsettings.json` da hech qachon — u git tarixida abadiy qoladi va uni o'chirish
> tarixni qayta yozishni talab qiladi.
>
> Va sirlar **muddatli** bo'lishi hamda rotatsiya rejasi bo'lishi kerak.

**4. Limitlarni konfiguratsiyada saqlaysizmi?**

> Fintech'da — **yo'q**. Kunlik limit, komissiya stavkasi kabi biznes parametrlari
> **DB'da** bo'lishi kerak.
>
> Ikki sabab: ular audit talab qiladi (kim, qachon o'zgartirdi), va ularni deploy
> qilmasdan o'zgartirish kerak bo'ladi.
>
> Konfiguratsiyada — texnik parametrlar: timeout, retry soni, ulanish satrlari.

## Deliverable

```csharp
public class ConfigurationTests
{
    [Fact]
    public void InvalidConfiguration_FailsAtStartup()
    {
        var ex = Assert.Throws<OptionsValidationException>(() =>
            CreateHostWith(new Dictionary<string, string?>
            {
                ["Payments:TimeoutSeconds"] = "9999",     // Range(1, 300) buziladi
                ["Payments:Provider"] = "click"
            }).Start());

        Assert.Contains("TimeoutSeconds", ex.Message);
    }

    [Fact]
    public void EnvironmentVariable_OverridesJson()
    {
        Environment.SetEnvironmentVariable("Payments__TimeoutSeconds", "60");
        var options = BuildOptions<PaymentOptions>();

        Assert.Equal(60, options.TimeoutSeconds);
    }

    [Fact]
    public void NoSecretsInAppSettings()
    {
        var json = File.ReadAllText("appsettings.json");
        foreach (var word in new[] { "password", "secret", "apikey", "token" })
            Assert.DoesNotContain(word, json, StringComparison.OrdinalIgnoreCase);
    }
}
```

## Xotira kartasi

```
Tartib       appsettings → appsettings.{Env} → User Secrets
             → muhit o'zgaruvchilari → buyruq qatori (keyingisi USTUN)
Ierarxiya    muhit o'zgaruvchisida `__` (Linux'da `:` ishlamaydi)
IOptions     Singleton · o'zgarmaydi · eng ko'p ishlatiladigan
IOptionsSnapshot  Scoped · har so'rovda qayta o'qiladi
IOptionsMonitor   Singleton + o'zgarishni kuzatadi (CurrentValue)
ValidateOnStart   MAJBURIY — noto'g'ri konfiguratsiya startup'da xato bersin
Sirlar       dev → User Secrets · prod → Key Vault / K8s Secret
             appsettings.json da HECH QACHON (git tarixida qoladi)
Fintech      limit va komissiya → KONFIGURATSIYADA EMAS, DB'da (audit kerak)
```

---

# 7.5 · Model binding va validatsiya

## Nima va nega

Kiruvchi ma'lumot **ishonchsiz**. Uni tur, format va biznes qoidalari bo'yicha
tekshirish — birinchi himoya chizig'i.

```
   HTTP so'rov
        │
        ▼
   ┌─────────────────────────────────────────────┐
   │  MODEL BINDING                              │
   │  · Route:  /payments/{id}                   │
   │  · Query:  ?page=2&size=20                  │
   │  · Body:   JSON → DTO                       │
   │  · Header: Idempotency-Key                  │
   │  · Form:   multipart                        │
   └────────────────┬────────────────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────────────────┐
   │  VALIDATSIYA                                │
   │  1. Tur (binding paytida)   → 400           │
   │  2. Format (DataAnnotations)→ 400           │
   │  3. Biznes qoidasi          → 422           │
   └─────────────────────────────────────────────┘
```

## DTO va atributlar

```csharp
public sealed record CreatePaymentRequest
{
    [Required]
    public Guid FromAccountId { get; init; }

    [Required]
    public Guid ToAccountId { get; init; }

    [Range(1, long.MaxValue, ErrorMessage = "Summa musbat bo'lishi kerak")]
    public long AmountMinor { get; init; }

    [Required, RegularExpression("^[A-Z]{3}$", ErrorMessage = "Valyuta kodi noto'g'ri")]
    public string Currency { get; init; } = null!;

    [StringLength(140)]
    public string? Description { get; init; }
}

[HttpPost]
public async Task<IActionResult> Create(
    [FromBody] CreatePaymentRequest request,
    [FromHeader(Name = "Idempotency-Key")] string idempotencyKey,
    CancellationToken ct)
{
    // ApiController atributi bilan validatsiya AVTOMATIK — 400 qaytadi
}
```

## FluentValidation — murakkab qoidalar uchun

```csharp
public sealed class CreatePaymentValidator : AbstractValidator<CreatePaymentRequest>
{
    public CreatePaymentValidator(ICurrencyRegistry currencies)
    {
        RuleFor(x => x.AmountMinor)
            .GreaterThan(0).WithMessage("Summa musbat bo'lishi kerak");

        RuleFor(x => x.Currency)
            .Must(currencies.IsSupported).WithMessage("Valyuta qo'llab-quvvatlanmaydi");

        RuleFor(x => x.ToAccountId)
            .NotEqual(x => x.FromAccountId)
            .WithMessage("Hisoblar bir xil bo'lishi mumkin emas");
    }
}
```

> **Chegara:** validator **DB'ga murojaat qilmasligi** kerak. «Hisob mavjudmi»,
> «balans yetarlimi» — bu biznes qoidasi, u domen qatlamida tekshiriladi va
> `422` qaytaradi.

## 400 va 422 — aniq farq

```
   ┌──────────────────────────┬──────────────────────────────┐
   │  400 Bad Request         │  422 Unprocessable Entity    │
   ├──────────────────────────┼──────────────────────────────┤
   │  So'rovning O'ZI noto'g'ri│  So'rov to'g'ri, BIZNES      │
   │                          │  qoidasi bajarilmadi         │
   ├──────────────────────────┼──────────────────────────────┤
   │  JSON buzilgan           │  Mablag' yetarli emas        │
   │  Majburiy maydon yo'q    │  Hisob bloklangan            │
   │  Tur mos emas            │  Limit oshdi                 │
   │  Format noto'g'ri        │  Valyuta mos emas            │
   ├──────────────────────────┼──────────────────────────────┤
   │  Client SO'ROVNI tuzatadi│  Foydalanuvchiga XABAR       │
   └──────────────────────────┴──────────────────────────────┘
```

## Binding tuzoqlari

```csharp
// ⚠ Model binding "ustidan yozish" (overposting)
public class Account { public Guid Id; public decimal Balance; public bool IsAdmin; }

[HttpPost] public IActionResult Create([FromBody] Account account) { }
// Client { "isAdmin": true } yuborishi mumkin!

// ✅ Alohida DTO — faqat ruxsat etilgan maydonlar
public sealed record CreateAccountRequest(string Name, string Currency);
```

```csharp
// JSON sozlamalari
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    // ⚠ Noma'lum maydonlarni rad etish — client xatosini erta ko'rsatadi
    o.SerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow;
});
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Entity'ni to'g'ridan-to'g'ri bind qilish | Overposting — ruxsatsiz maydonlar |
| 400 va 422 ni ajratmaslik | Client noto'g'ri harakat qiladi |
| Validatorda DB so'rovi | Sekin, va biznes mantiq tarqaladi |
| Validatsiya xabarlarini lokalizatsiya qilmaslik | Foydalanuvchi tushunmaydi |
| Summani `decimal` sifatida qabul qilish | JS client aniqlikni yo'qotadi (M4.1) |
| Noma'lum maydonlarni jimgina e'tiborsiz qoldirish | Client typo'sini bilmaydi |

## Fintech konteksti

- **Summa har doim `long AmountMinor`** — JSON'da `decimal` emas (M4.3).
- **`Idempotency-Key` header** majburiy va formati tekshiriladi (M11.2).
- **Validatsiya xabarlarida ichki ma'lumot bo'lmasin**: «hisob topilmadi» va
  «hisob boshqa foydalanuvchiniki» — ikkalasi ham `404` bo'lishi kerak, aks holda
  hisoblarni sanab chiqish mumkin bo'ladi.

## Intervyu savollari

**1. 400 va 422 farqi nima?** ⭐

> `400` — so'rovning **o'zi** noto'g'ri: JSON buzilgan, majburiy maydon yo'q, tur
> mos emas.
>
> `422` — so'rov to'g'ri tuzilgan, lekin **biznes qoidasi** bajarilmadi: mablag'
> yetarli emas, hisob bloklangan, limit oshdi.
>
> Farq muhim, chunki client `400` da so'rovni tuzatadi, `422` da esa foydalanuvchiga
> xabar ko'rsatadi.

**2. Entity'ni to'g'ridan-to'g'ri bind qilsa bo'ladimi?**

> Yo'q — bu **overposting** xavfi. Client modelning barcha maydonlarini yuborishi
> mumkin, jumladan `IsAdmin` yoki `Balance` kabi ichki maydonlarni.
>
> Har doim alohida DTO ishlataman: unda faqat client o'zgartirishi mumkin bo'lgan
> maydonlar bo'ladi.
>
> Bu bir vaqtda API'ni DB sxemasidan ham ajratadi.

**3. Validatsiyani qayerda qilasiz?**

> Ikki qatlamda. **Format va tur** — DTO darajasida (DataAnnotations yoki
> FluentValidation), natija `400`.
>
> **Biznes qoidalari** — domen qatlamida, natija `422`. Validator DB'ga murojaat
> qilmasligi kerak: «balans yetarlimi» — bu domen mantiqi, u tranzaksiya ichida va
> qulf bilan tekshirilishi kerak.

**4. Summani qanday qabul qilasiz?**

> **Butun tiyinda**: `"amountMinor": 100050` va alohida `"currency": "UZS"`.
>
> `decimal` sifatida qabul qilsam, JavaScript client uni `double` ga aylantiradi va
> aniqlik yo'qoladi (M4.1). Bu Stripe va boshqa to'lov API'larining yondashuvi.

## Deliverable

```csharp
public class ValidationTests
{
    [Fact]
    public async Task MalformedJson_Returns400()
    {
        var response = await client.PostAsync("/payments",
            new StringContent("{ broken", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task NegativeAmount_Returns400()
    {
        var response = await PostPaymentAsync(amountMinor: -1);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task InsufficientFunds_Returns422_Not400()
    {
        await SeedAccount(balance: 1_000);
        var response = await PostPaymentAsync(amountMinor: 500_000);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task UnknownField_IsRejected()
    {
        var response = await client.PostAsJsonAsync("/payments",
            new { amountMinor = 100, currency = "UZS", isAdmin = true });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task OtherUsersAccount_Returns404_Not403()
    {
        // Hisoblarni sanab chiqishning oldini olish
        var response = await client.GetAsync($"/accounts/{otherUserAccountId}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
```

## Xotira kartasi

```
Binding      Route · Query · Body · Header · Form → DTO
Validatsiya  1. tur (binding) → 400
             2. format (DataAnnotations/FluentValidation) → 400
             3. BIZNES qoidasi (domen qatlami) → 422
400 vs 422   400 = so'rovning O'ZI noto'g'ri (client tuzatadi)
             422 = so'rov to'g'ri, biznes qoidasi buzildi (foydalanuvchiga xabar)
Overposting  entity'ni bind qilmang → alohida DTO
             UnmappedMemberHandling.Disallow — noma'lum maydon rad etilsin
Validator    DB'ga MUROJAAT QILMASIN — bu domen mantiqi
Summa        long AmountMinor + currency · decimal EMAS (JS aniqlikni yo'qotadi)
Xavfsizlik   boshqa foydalanuvchining resursi → 404 (403 EMAS)
             aks holda ID'larni sanab chiqish mumkin
```

---

# 7.6 · REST dizayni ⭐

## Nima va nega

API — bu **shartnoma**. U o'zgarganda client'lar buziladi, shuning uchun dizayn
qarorlari uzoq muddatli.

```
   GET    /api/v1/payments              ro'yxat
   GET    /api/v1/payments/{id}         bitta
   POST   /api/v1/payments              yaratish → 201 + Location
   PUT    /api/v1/payments/{id}         to'liq almashtirish
   PATCH  /api/v1/payments/{id}         qisman
   DELETE /api/v1/payments/{id}         → 204

   ┌────────────────────────────────────────────────────────┐
   │  Resurs — OT (payments), fe'l EMAS (getPayments)       │
   │  Ko'plik shakl (payments, accounts)                    │
   │  Ierarxiya: /accounts/{id}/payments                    │
   │  Chuqurlik 2 darajadan oshmasin                        │
   └────────────────────────────────────────────────────────┘
```

## Status kodlar

| Kod | Ma'nosi | Fintech misoli |
|---|---|---|
| **200** | OK | Ro'yxat, bitta resurs |
| **201** | Yaratildi + `Location` | To'lov yaratildi |
| **202** | Qabul qilindi, ishlanmoqda | Asinxron to'lov |
| **204** | Kontentsiz muvaffaqiyat | O'chirildi |
| **400** | So'rov formati noto'g'ri | JSON buzilgan |
| **401** | Kim ekani noma'lum | Token yo'q yoki eskirgan |
| **403** | Ma'lum, lekin ruxsat yo'q | Rol yetarli emas |
| **404** | Topilmadi | Resurs yo'q **yoki boshqa foydalanuvchiniki** |
| **409** | Konflikt | Concurrency, holat mos emas |
| **422** | Biznes qoidasi buzildi | Mablag' yetarli emas |
| **429** | Rate limit | Juda ko'p so'rov |
| **500** | Server xatosi | Kutilmagan holat |
| **503** | Vaqtincha mavjud emas | Provayder ishlamayapti |

## Idempotentlik

```
   ┌──────────┬───────────────┬──────────────────────────────┐
   │  Metod   │  Idempotent   │  Xavfsiz (o'zgartirmaydi)    │
   ├──────────┼───────────────┼──────────────────────────────┤
   │  GET     │  ✅            │  ✅                           │
   │  HEAD    │  ✅            │  ✅                           │
   │  PUT     │  ✅            │  ❌                           │
   │  DELETE  │  ✅            │  ❌                           │
   │  PATCH   │  ⚠ bog'liq     │  ❌                           │
   │  POST    │  ❌ ← kalit kerak│  ❌                          │
   └──────────┴───────────────┴──────────────────────────────┘
```

```http
POST /api/v1/payments
Idempotency-Key: 6f1c2a54-9b3e-4d21-8f0a-2c7c9c1b1f77
```

> `POST` idempotent emas — shuning uchun to'lov API'sida `Idempotency-Key`
> **majburiy** (M11.2).

## Versiyalash

| Usul | Plus | Minus |
|---|---|---|
| **URL** `/api/v1/...` | Ko'rinadigan, oddiy, keshlanadi | URL «iflos» |
| Header `Accept: ...v2+json` | Toza URL | Kesh murakkab, debug qiyin |
| Query `?api-version=2` | Oddiy | Standart emas |

```csharp
// URL versiyalash — amalda eng ko'p tanlanadi
[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
public sealed class PaymentsController : ControllerBase { }
```

## Sahifalash va filtrlash

```http
GET /api/v1/payments?from=2026-08-01&to=2026-08-31&status=completed&limit=20&cursor=eyJ...

{
  "items": [ ... ],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTA4LTA0..."
}
```

> **Keyset (cursor) pagination** — katta jadvalda `offset` sekin (M6.3) va yangi
> yozuv qo'shilganda sahifalar siljiydi.

## Buzuvchi va buzmaydigan o'zgarishlar

```
   ✅ BUZMAYDIGAN                    ❌ BUZUVCHI
   · yangi ixtiyoriy maydon          · maydonni o'chirish/nomini o'zgartirish
   · yangi endpoint                  · maydon turini o'zgartirish
   · javobga yangi maydon            · majburiy maydon qo'shish
   · yangi enum qiymati*             · status kodni o'zgartirish
                                      · validatsiyani qattiqlashtirish

   * client noma'lum enum qiymatini to'g'ri ishlashi kerak
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| URL'da fe'l (`/getPayments`) | REST emas, chalkash |
| Hamma xato uchun `200 OK` + `{"error": ...}` | Client'lar HTTP semantikasidan foydalana olmaydi |
| `POST` da idempotentlik yo'q | Ikki marta to'lov |
| Entity'ni javobda qaytarish | Ichki maydonlar sizadi, DB o'zgarsa API buziladi |
| Versiyalashsiz API | Har o'zgarish client'ni buzadi |
| `404` o'rniga `403` | Resurs mavjudligi oshkor bo'ladi |
| Katta ro'yxatni sahifalashsiz qaytarish | Timeout, xotira |

## Fintech konteksti

- **`Idempotency-Key` majburiy** — bu texnik detal emas, **xavfsizlik talabi**.
- **Summa `amountMinor` + `currency`** — hech qachon `decimal` (M4.3).
- **Asinxron to'lov** — `202 Accepted` + status endpoint'i; client polling qiladi
  yoki webhook oladi.
- **Xato javobida ichki ma'lumot bo'lmasin** — faqat `traceId` (7.7).

## Intervyu savollari

**1. `PUT` va `PATCH` farqi?**

> `PUT` resursni **to'liq almashtiradi** — yuborilmagan maydonlar o'chadi yoki
> default'ga qaytadi. Idempotent.
>
> `PATCH` faqat ko'rsatilgan maydonlarni o'zgartiradi.
>
> Amalda ko'pchilik `PUT` deb nomlab `PATCH` mantiqini yozadi — bu chalkashlik
> manbai va client'lar uchun kutilmagan xatti-harakat beradi.

**2. Qaysi metodlar idempotent?**

> `GET`, `HEAD`, `PUT`, `DELETE` — idempotent. `POST` — **emas**.
>
> Shuning uchun to'lov yaratishda `Idempotency-Key` header'i majburiy: tarmoq
> uzilib client qayta yuborsa, server o'sha kalit bo'yicha saqlangan javobni
> qaytaradi va yangi pul yechmaydi.
>
> `PATCH` idempotentligi mazmuniga bog'liq: `{"status": "cancelled"}` idempotent,
> `{"balance": "+100"}` esa emas.

**3. API versiyalashni qanday qilasiz?**

> **URL'da** — `/api/v1/...`. U ko'rinadigan, keshlanadi va debug qilish oson.
>
> Header versiyalash toza URL beradi, lekin kesh va monitoring murakkablashadi.
>
> Va eng muhimi: **buzmaydigan o'zgarishlar uchun yangi versiya kerak emas**.
> Yangi ixtiyoriy maydon qo'shish, yangi endpoint — bular v1 ichida qoladi.

**4. Xatoni `200 OK` bilan qaytarsa bo'ladimi?**

> Yo'q. HTTP status kodlari — standart shartnoma. `200` qaytarsangiz:
> - proxy va CDN xatoni muvaffaqiyat deb keshlaydi;
> - monitoring xato foizini ko'ra olmaydi;
> - client kutubxonalari avtomatik retry qila olmaydi.
>
> To'g'ri status + `ProblemDetails` formatida tafsilot (7.7).

## Deliverable

```csharp
public class RestApiTests
{
    [Fact]
    public async Task Create_Returns201WithLocation()
    {
        var response = await PostPaymentAsync();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);

        var followUp = await client.GetAsync(response.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, followUp.StatusCode);
    }

    [Theory]
    [InlineData("{ broken",        HttpStatusCode.BadRequest)]
    [InlineData(null,              HttpStatusCode.Unauthorized)]     // token yo'q
    public async Task Errors_UseCorrectStatusCodes(string? body, HttpStatusCode expected)
        => Assert.Equal(expected, (await SendAsync(body)).StatusCode);

    [Fact]
    public async Task Delete_IsIdempotent()
    {
        var id = await CreatePaymentAsync();

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/v1/payments/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/v1/payments/{id}")).StatusCode);
    }

    [Fact]
    public async Task List_UsesCursorPagination()
    {
        await SeedPayments(100);

        var first = await GetPageAsync(cursor: null, limit: 20);
        Assert.Equal(20, first.Items.Count);
        Assert.NotNull(first.NextCursor);

        var second = await GetPageAsync(cursor: first.NextCursor, limit: 20);
        Assert.Empty(first.Items.Select(i => i.Id).Intersect(second.Items.Select(i => i.Id)));
    }
}
```

## Xotira kartasi

```
Resurs       OT, ko'plik (payments) · fe'l EMAS · chuqurlik ≤ 2
Kodlar       201+Location (yaratish) · 202 (asinxron) · 204 (o'chirish)
             400 format · 401 kim? · 403 ruxsat · 404 topilmadi
             409 konflikt · 422 biznes qoidasi · 429 rate limit
Idempotent   GET HEAD PUT DELETE ✅ · POST ❌ → Idempotency-Key MAJBURIY
PUT vs PATCH PUT to'liq almashtiradi · PATCH qisman
Versiyalash  URL /api/v1 — ko'rinadigan, keshlanadi
             buzmaydigan o'zgarish → yangi versiya KERAK EMAS
Sahifalash   keyset/cursor — katta jadvalda offset sekin va siljiydi
Xato         200 OK + {"error"} ❌ → to'g'ri status + ProblemDetails
Fintech      amountMinor + currency · Idempotency-Key · 404 (403 emas)
```

---

# 7.7 · Xato formati va global handler ⭐

## Nima va nega

Xato javobi ham **API shartnomasining qismi**. U izchil, mashina o'qiy oladigan va
**ichki ma'lumotni oshkor qilmaydigan** bo'lishi kerak.

```
   ┌──────────────────────────────────────────────────────────┐
   │  YOMON javob                                              │
   │  500 Internal Server Error                                │
   │  "Invalid column name 'card_number' in table 'user_cards'"│
   │                                                            │
   │  → DB sxemasi oshkor bo'ldi                               │
   │  → hujum uchun ma'lumot berildi                           │
   │  → client hech nima qila olmaydi                          │
   └──────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────┐
   │  YAXSHI javob (RFC 7807 ProblemDetails)                  │
   │  422 Unprocessable Entity                                 │
   │  {                                                         │
   │    "type": "https://api.example.uz/errors/insufficient",  │
   │    "title": "Mablag' yetarli emas",                       │
   │    "status": 422,                                          │
   │    "detail": "Hisobda 45 000 so'm bor, 80 000 talab qilindi",│
   │    "traceId": "00-4bf92f3577b34da6-01"                    │
   │  }                                                         │
   └──────────────────────────────────────────────────────────┘
```

## Global handler (.NET 8+)

```csharp
public sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger,
    IHostEnvironment env) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var traceId = Activity.Current?.Id ?? ctx.TraceIdentifier;

        var (status, title) = ex switch
        {
            NotFoundException          => (404, "Topilmadi"),
            ValidationException        => (422, "Ma'lumot qabul qilinmadi"),
            InsufficientFundsException => (422, "Mablag' yetarli emas"),
            ConcurrencyException       => (409, "Ma'lumot o'zgargan, qayta urining"),
            RateLimitException         => (429, "Juda ko'p so'rov"),
            ProviderUnavailableException => (503, "Vaqtincha mavjud emas"),
            OperationCanceledException => (499, "So'rov bekor qilindi"),
            _                          => (500, "Ichki xato")
        };

        // 5xx — Error, 4xx — Warning/Information
        if (status >= 500) logger.LogError(ex, "Ishlanmagan xato {TraceId}", traceId);
        else               logger.LogWarning("Biznes xatosi {Title} {TraceId}", title, traceId);

        var problem = new ProblemDetails
        {
            Status = status,
            Title  = title,
            Type   = $"https://api.example.uz/errors/{status}",
            Detail = status < 500 ? ex.Message : null,   // ⚠ 5xx da tafsilot YO'Q
            Extensions = { ["traceId"] = traceId }
        };

        if (env.IsDevelopment())
            problem.Extensions["stackTrace"] = ex.StackTrace;   // FAQAT development

        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(problem, ct);
        return true;
    }
}

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
app.UseExceptionHandler();
```

## Log darajalari

```
   ┌────────────┬──────────────────────────────────────────────┐
   │  5xx       │  LogError   — bizning bug, tuzatish kerak    │
   │  4xx       │  LogWarning — client xatosi, kutilgan        │
   │  422       │  LogInformation — biznes rad javobi, NORMAL  │
   │  499       │  LogInformation — client uzildi, XATO EMAS   │
   └────────────┴──────────────────────────────────────────────┘

   ⚠ Biznes rad javoblarini Error sifatida log qilmang —
     "xato foizi" dashboard'i buziladi va real muammolar yo'qoladi.
```

## Validatsiya xatolari

```csharp
// ApiController avtomatik ValidationProblemDetails qaytaradi
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "AmountMinor": ["Summa musbat bo'lishi kerak"],
    "Currency": ["Valyuta kodi noto'g'ri"]
  },
  "traceId": "00-4bf92f..."
}

// Formatni o'zgartirish
builder.Services.Configure<ApiBehaviorOptions>(o =>
{
    o.InvalidModelStateResponseFactory = ctx =>
    {
        var problem = new ValidationProblemDetails(ctx.ModelState) { Status = 400 };
        problem.Extensions["traceId"] = Activity.Current?.Id;
        return new BadRequestObjectResult(problem);
    };
});
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `ex.Message` ni client'ga qaytarish | DB sxemasi, fayl yo'llari oshkor |
| Stack trace'ni production'da ko'rsatish | Kod tuzilishi oshkor |
| Hamma xato uchun `500` | Client to'g'ri harakat qila olmaydi |
| Biznes rad javobini `Error` log qilish | Alert shovqini |
| `traceId` bermaslik | Qo'llab-quvvatlash muammoni topa olmaydi |
| Har controller'da `try/catch` | Kod takrorlanadi, izchillik yo'qoladi |

## Fintech konteksti

- **To'lov xatosi log'ida albatta:** `traceId`, `paymentId`, `accountId`, summa va
  valyuta. «Nimadir xato ketdi» degan log incident paytida foydasiz.
- **Karta raqami, token, parol logga tushmasin** — structured logging'da maydonlar
  filtrlanadi.
- **`499` (client uzildi)** alohida ajratiladi: u bizning xato emas, lekin ko'p
  bo'lsa — timeout muammosi belgisi.

## Intervyu savollari

**1. Client'ga qanday xato qaytarasiz?** ⭐

> `ProblemDetails` (RFC 7807) formatida: to'g'ri status kod, umumiy sarlavha va
> **`traceId`**.
>
> `ex.Message` ni **hech qachon** qaytarmayman — u jadval nomlari, fayl yo'llari,
> ulanish satrlarini oshkor qilishi mumkin.
>
> Batafsil ma'lumot logda qoladi; foydalanuvchi `traceId` bilan qo'llab-quvvatlashga
> murojaat qiladi va biz uni logdan darhol topamiz.

**2. Har controller'da `try/catch` yozasizmi?**

> Yo'q — bu kod takrorlanishi va izchillikning yo'qolishi.
>
> Bitta **global handler** (`IExceptionHandler`) yozaman va u exception turini
> status kodga xaritalaydi. Controller'lar faqat domen exception'larini tashlaydi.
>
> Lokal `try/catch` faqat aniq maqsad bo'lganda: retry, fallback, resurs tozalash.

**3. Biznes rad javobini qanday log qilasiz?**

> `Information` yoki `Warning` darajasida, **`Error` emas**.
>
> «Mablag' yetarli emas» — bu tizimning to'g'ri ishlashi, bug emas. Uni `Error`
> sifatida log qilsam, dashboard'dagi xato foizi buziladi va real muammolar shovqin
> ichida yo'qoladi.
>
> Qoida: `5xx` → `Error` (bizning bug), `4xx` → `Warning`/`Information` (kutilgan).

**4. Development va production farqi bo'lishi kerakmi?**

> Ha, lekin faqat **tafsilot darajasida**. Development'da `stackTrace` va inner
> exception qo'shiladi, production'da esa faqat `traceId`.
>
> Status kodlar va javob **strukturasi** bir xil bo'lishi kerak — aks holda
> client'lar development'da ishlab, production'da buziladi.

## Deliverable

```csharp
public class ErrorHandlingTests
{
    [Fact]
    public async Task UnhandledException_ReturnsProblemDetailsWithTraceId()
    {
        var response = await client.GetAsync("/debug/throw");
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.True(problem!.Extensions.ContainsKey("traceId"));
        Assert.Null(problem.Detail);                       // 5xx da tafsilot yo'q
    }

    [Fact]
    public async Task ErrorResponse_DoesNotLeakInternals()
    {
        var response = await client.PostAsync("/payments", BrokenPayload());
        var body = await response.Content.ReadAsStringAsync();

        foreach (var leak in new[] { "column", "table", "Npgsql", "at Payment" })
            Assert.DoesNotContain(leak, body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task BusinessRejection_IsNotLoggedAsError()
    {
        await SeedAccount(balance: 100);
        await PostPaymentAsync(amountMinor: 500_000);

        Assert.Empty(logCollector.Entries.Where(e => e.Level == LogLevel.Error));
        Assert.Single(logCollector.Entries.Where(e => e.Level <= LogLevel.Warning));
    }

    [Theory]
    [InlineData(typeof(NotFoundException),           404)]
    [InlineData(typeof(InsufficientFundsException),  422)]
    [InlineData(typeof(ConcurrencyException),        409)]
    public async Task Exceptions_MapToCorrectStatusCodes(Type ex, int expected)
        => Assert.Equal(expected, (int)(await TriggerAsync(ex)).StatusCode);
}
```

## Xotira kartasi

```
Format       ProblemDetails (RFC 7807): type · title · status · detail · traceId
Qoida        ex.Message ni HECH QACHON client'ga qaytarmang
             5xx da detail YO'Q · stackTrace faqat Development'da
Handler      IExceptionHandler (.NET 8+) — BITTA joyda xaritalash
             controller'larda try/catch YOZILMAYDI
Log darajasi 5xx → Error (bizning bug) · 4xx → Warning
             422 va 499 → Information (kutilgan, xato emas)
traceId      HAR javobda — qo'llab-quvvatlash shu bilan topadi
Validatsiya  ValidationProblemDetails — maydon bo'yicha xatolar
Fintech      log'da traceId + paymentId + accountId + summa
             karta/token/parol logga TUSHMASIN
```

---

# 7.8 · `HttpClientFactory` va Polly

## Nima va nega

Tashqi provayder bilan ishlash — fintech'dagi eng nozik qism. `HttpClient` ni
noto'g'ri ishlatish ikki qarama-qarshi muammo beradi.

```
   ❌ Har so'rovda new HttpClient()
   └─► Dispose qilingan soket TIME_WAIT'da bir necha daqiqa qoladi
       → portlar tugaydi → SOCKET EXHAUSTION

   ❌ Bitta static HttpClient abadiy
   └─► DNS o'zgarishini KO'RMAYDI
       → provayder IP'sini o'zgartirsa, ilova eski IP'ga urib turadi

   ✅ IHttpClientFactory
   └─► handler'lar pool'da, DNS muddat bilan yangilanadi
```

## Sozlash

```csharp
builder.Services.AddHttpClient<IPaymentProvider, ClickProvider>(client =>
{
    client.BaseAddress = new Uri(options.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("User-Agent", "fintech-api/1.0");
})
.SetHandlerLifetime(TimeSpan.FromMinutes(5))        // DNS yangilanishi
.AddStandardResilienceHandler();                    // .NET 8+ — retry + CB + timeout
```

```csharp
// Yoki qo'lda sozlash (Polly v8)
.AddResilienceHandler("provider", builder =>
{
    builder.AddRetry(new HttpRetryStrategyOptions
    {
        MaxRetryAttempts = 3,
        BackoffType = DelayBackoffType.Exponential,
        UseJitter = true,                            // ⚠ thundering herd'dan himoya
        ShouldHandle = args => ValueTask.FromResult(
            args.Outcome.Result?.StatusCode is HttpStatusCode.ServiceUnavailable
                                            or HttpStatusCode.TooManyRequests
            || args.Outcome.Exception is HttpRequestException)
    });

    builder.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
    {
        FailureRatio = 0.5,
        SamplingDuration = TimeSpan.FromSeconds(30),
        MinimumThroughput = 10,
        BreakDuration = TimeSpan.FromSeconds(15)
    });

    builder.AddTimeout(TimeSpan.FromSeconds(10));
});
```

## Circuit breaker holatlari

```
                  xatolar chegaradan oshdi
   ┌─ CLOSED ──────────────────────────► OPEN ─┐
   │  so'rovlar                          so'rovlar│
   │  o'tadi                             DARHOL   │
   │     ▲                               rad      │
   │     │                               etiladi  │
   │     │  sinov muvaffaqiyatli               │  │
   │     │                                     │  │ BreakDuration
   │     │                                     ▼  │ tugadi
   │  ┌──┴──────────┐                             │
   │  │  HALF-OPEN  │◄────────────────────────────┘
   │  │  bir necha  │
   │  │  sinov so'rov│──── xato ──────────► OPEN
   │  └─────────────┘
   └────────────────────────────────────────────

   Foyda: yiqilgan provayderga urib turmaslik
          → resurslar tejaladi, tiklanishga imkon beriladi
```

## Nima retry qilinadi va nima yo'q

```
   ✅ RETRY QILINADI (tranzient)
   · 408 Request Timeout
   · 429 Too Many Requests   (Retry-After hurmat qilinadi)
   · 500, 502, 503, 504
   · Tarmoq xatolari (HttpRequestException)
   · Timeout

   ❌ RETRY QILINMAYDI
   · 400 Bad Request         — so'rov noto'g'ri, takrorlash foydasiz
   · 401 / 403               — huquq muammosi
   · 404                     — resurs yo'q
   · 422                     — biznes rad javobi
```

```
   ⚠ FINTECH'DAGI ENG MUHIM NUANS:

   TIMEOUT ≠ MUVAFFAQIYATSIZLIK

   So'rov timeout bo'ldi → provayder uni bajargan bo'lishi MUMKIN
   → oddiy retry IKKI MARTA PUL YECHISHI mumkin
   → retry FAQAT Idempotency-Key bilan xavfsiz
   → aks holda holat "unknown" va status so'rovi kerak (M11.5)
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `new HttpClient()` har so'rovda | Socket exhaustion |
| Static `HttpClient` abadiy | DNS o'zgarishi ko'rinmaydi |
| Timeout qo'ymaslik | So'rov abadiy osiladi |
| Idempotentliksiz retry | **Ikki marta pul yechish** |
| Jitter'siz backoff | Thundering herd |
| Circuit breaker'siz | Yiqilgan provayderga bosim |
| `429` da `Retry-After` ni e'tiborsiz qoldirish | Bloklanish |

## Fintech konteksti

- **Har provayder uchun alohida client va policy** — biri yiqilsa boshqasi
  ishlashda davom etadi.
- **Circuit breaker holati monitoringda** bo'lishi kerak: u `OPEN` bo'lsa — bu
  incident.
- **Timeout qiymati** provayder SLA'sidan kelib chiqadi, va u **unknown** holatga
  olib keladi — bu holat state machine'da bo'lishi shart (M11.5).

## Intervyu savollari

**1. `HttpClient` ni qanday to'g'ri ishlatasiz?** ⭐

> `IHttpClientFactory` orqali. U ikki qarama-qarshi muammoni birdan hal qiladi:
>
> Har so'rovda `new HttpClient()` — dispose qilingan soket TIME_WAIT'da qoladi va
> portlar tugaydi (**socket exhaustion**).
>
> Static `HttpClient` abadiy — **DNS o'zgarishini ko'rmaydi**, provayder IP'sini
> almashtirsa ilova eski IP'ga urib turadi.
>
> Factory handler'larni pool'da saqlaydi va `SetHandlerLifetime` bilan ularni
> davriy yangilaydi.

**2. Retry'ni qanday to'g'ri qilasiz?**

> Uch shart:
> 1. Operatsiya **idempotent** bo'lsin — aks holda retry ikki marta pul yechadi.
> 2. **Exponential backoff + jitter** — jitter'siz barcha client'lar bir vaqtda
>    qayta uradi (thundering herd).
> 3. **Circuit breaker** — provayder yiqilgan bo'lsa uni urib yotish foydasiz.
>
> Va faqat **tranzient** xatolarni: `408`, `429`, `5xx`, tarmoq xatolari. `400`,
> `422`, biznes rad javobini retry qilish faqat zarar.

**3. Timeout bo'lsa retry qilasizmi?** ⭐

> Bu eng nozik savol. Timeout **muvaffaqiyatsizlik emas** — provayder so'rovni
> bajargan bo'lishi mumkin, javob esa yo'qolgan.
>
> Shuning uchun oddiy retry xavfli: ikki marta pul yechilishi mumkin.
>
> Xavfsiz variant faqat `Idempotency-Key` bilan. Aks holda men holatni `unknown`
> deb belgilayman va provayderdan **status so'rovi** bilan aniqlayman.

**4. Circuit breaker nima beradi?**

> Provayder yiqilganda unga urib turmaslik. `OPEN` holatida so'rovlar **darhol**
> rad etiladi — bu bizning thread'larimiz va ulanishlarimizni tejaydi va
> provayderga tiklanish imkonini beradi.
>
> `HALF-OPEN` holatida bir necha sinov so'rov yuboriladi; muvaffaqiyatli bo'lsa
> `CLOSED` ga qaytadi.
>
> Uning holati monitoringda bo'lishi kerak — `OPEN` bo'lishi incident belgisi.

## Deliverable

```csharp
public class HttpResilienceTests
{
    [Fact]
    public async Task TransientError_IsRetried()
    {
        fakeProvider.EnqueueResponses(
            HttpStatusCode.ServiceUnavailable,
            HttpStatusCode.ServiceUnavailable,
            HttpStatusCode.OK);

        var result = await provider.ChargeAsync(payment, default);

        Assert.True(result.IsSuccess);
        Assert.Equal(3, fakeProvider.RequestCount);
    }

    [Fact]
    public async Task BusinessRejection_IsNotRetried()
    {
        fakeProvider.EnqueueResponses(HttpStatusCode.UnprocessableEntity);

        await Assert.ThrowsAsync<ProviderRejectedException>(
            () => provider.ChargeAsync(payment, default));

        Assert.Equal(1, fakeProvider.RequestCount);       // retry BO'LMADI
    }

    [Fact]
    public async Task CircuitBreaker_OpensAfterFailures()
    {
        fakeProvider.AlwaysFail();

        for (int i = 0; i < 15; i++)
            await Record.ExceptionAsync(() => provider.ChargeAsync(payment, default));

        var countBefore = fakeProvider.RequestCount;
        await Record.ExceptionAsync(() => provider.ChargeAsync(payment, default));

        Assert.Equal(countBefore, fakeProvider.RequestCount);   // so'rov YUBORILMADI
    }

    [Fact]
    public async Task Retry_SendsSameIdempotencyKey()
    {
        fakeProvider.EnqueueResponses(HttpStatusCode.ServiceUnavailable, HttpStatusCode.OK);

        await provider.ChargeAsync(payment, default);

        var keys = fakeProvider.ReceivedRequests
            .Select(r => r.Headers.GetValues("Idempotency-Key").Single()).Distinct();
        Assert.Single(keys);                              // BIR XIL kalit
    }
}
```

## Xotira kartasi

```
HttpClient   new har so'rovda → SOCKET EXHAUSTION (TIME_WAIT)
             static abadiy → DNS o'zgarishini KO'RMAYDI
             ✅ IHttpClientFactory + SetHandlerLifetime
Retry        3 shart: IDEMPOTENT · backoff + JITTER · circuit breaker
             tranzient: 408, 429, 5xx, tarmoq
             retry YO'Q: 400, 401, 403, 404, 422
Circuit      CLOSED → (xatolar) → OPEN → (muddat) → HALF-OPEN → CLOSED
             OPEN holatida so'rov DARHOL rad etiladi
FINTECH ⭐    TIMEOUT ≠ MUVAFFAQIYATSIZLIK
             provayder bajargan bo'lishi mumkin → retry faqat Idempotency-Key bilan
             aks holda holat "unknown" + status so'rovi
Monitoring   circuit breaker OPEN → INCIDENT
```

---

# 7.9 · Minimal API va Controller

## Nima va nega

.NET 6 dan beri ikki yondashuv mavjud. Tanlov — loyihaning hajmi va murakkabligiga
bog'liq.

```csharp
// Minimal API
app.MapPost("/api/v1/payments", async (
    CreatePaymentRequest request,
    IPaymentService service,
    [FromHeader(Name = "Idempotency-Key")] string key,
    CancellationToken ct) =>
{
    var result = await service.CreateAsync(request, key, ct);
    return result.IsSuccess
        ? Results.Created($"/api/v1/payments/{result.Value.Id}", result.Value)
        : Results.UnprocessableEntity(result.Error);
})
.RequireAuthorization()
.WithName("CreatePayment")
.Produces<PaymentDto>(StatusCodes.Status201Created);
```

```csharp
// Controller
[ApiController]
[Route("api/v1/[controller]")]
public sealed class PaymentsController(IPaymentService service) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType<PaymentDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(
        CreatePaymentRequest request,
        [FromHeader(Name = "Idempotency-Key")] string key,
        CancellationToken ct)
    {
        var result = await service.CreateAsync(request, key, ct);
        return result.IsSuccess
            ? CreatedAtAction(nameof(Get), new { id = result.Value.Id }, result.Value)
            : UnprocessableEntity(result.Error);
    }
}
```

## Solishtirish

| | Minimal API | Controller |
|---|---|---|
| Ishga tushish | Biroz tezroq | — |
| Kod hajmi | Kamroq | Ko'proq boilerplate |
| Filter'lar | Endpoint filter (cheklangan) | To'liq filter pipeline |
| Model validatsiya | **Qo'lda** yoki kutubxona | `[ApiController]` avtomatik |
| Guruhlash | `MapGroup` | Controller o'zi guruh |
| Katta loyihada | Tashkil qilish qiyinlashadi | Tabiiy tuzilma |
| AOT-friendly | ✅ | ⚠ |

## Minimal API'ni tashkil qilish

```csharp
// Endpoint'larni modullarga bo'lish
public static class PaymentEndpoints
{
    public static void MapPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/payments")
                       .RequireAuthorization()
                       .WithTags("Payments")
                       .AddEndpointFilter<IdempotencyFilter>();

        group.MapGet("/{id:guid}", GetAsync);
        group.MapPost("/", CreateAsync);
    }

    private static async Task<IResult> GetAsync(...) { }
}

// Program.cs
app.MapPaymentEndpoints();
app.MapAccountEndpoints();
```

```csharp
// Endpoint filter — Minimal API'da cross-cutting mantiq
public sealed class IdempotencyFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var key = ctx.HttpContext.Request.Headers["Idempotency-Key"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(key))
            return Results.BadRequest("Idempotency-Key majburiy");

        return await next(ctx);
    }
}
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Minimal API'da hamma endpoint bitta faylda | `Program.cs` 2000 qator |
| Minimal API'da validatsiyani unutish | `[ApiController]` avtomatik ishlamaydi |
| Controller'da biznes mantiq | Test qilish qiyin, qayta ishlatilmaydi |
| Ikkalasini bir loyihada aralashtirish | Izchillik yo'qoladi |
| OpenAPI metadata yozmaslik | Client generatsiya qilib bo'lmaydi |

## Fintech konteksti

- **Controller** — asosiy API uchun: filter'lar (idempotentlik, audit, avtorizatsiya)
  tabiiyroq joylashadi va katta jamoada tuzilma aniqroq.
- **Minimal API** — health check, webhook qabul qilish, ichki endpoint'lar uchun.
- Qaysi biri bo'lsa ham — **biznes mantiq application service'da**, endpoint faqat
  orkestratsiya qiladi.

## Intervyu savollari

**1. Minimal API va Controller — qaysi birini tanlaysiz?**

> Loyiha hajmiga qarab. Kichik servis, health check, webhook — **Minimal API**:
> kam kod, tez.
>
> Katta API — **Controller**: filter pipeline to'liq, `[ApiController]` avtomatik
> validatsiya beradi, va katta jamoada tuzilma tabiiyroq.
>
> Muhimi — bir loyihada ikkalasini aralashtirmaslik: izchillik yo'qoladi.

**2. Minimal API'da validatsiya qanday qilinadi?**

> Avtomatik emas — `[ApiController]` atributining sehri Minimal API'da yo'q.
>
> Uch variant: endpoint ichida qo'lda tekshirish, `IEndpointFilter` yozish, yoki
> `FluentValidation` integratsiyasi.
>
> Men filter yondashuvini afzal ko'raman — u guruhga bir marta qo'llanadi va kod
> takrorlanmaydi.

**3. Endpoint'larni qanday tashkil qilasiz?**

> `MapGroup` bilan guruhlarga bo'lib, har guruhni alohida statik klassda —
> `PaymentEndpoints.MapPaymentEndpoints()`.
>
> Guruh darajasida umumiy narsalar qo'llanadi: avtorizatsiya, teglar, filter'lar.
>
> Aks holda `Program.cs` boshqarib bo'lmaydigan darajada o'sadi.

## Deliverable

```csharp
[Fact]
public async Task MinimalApi_ValidatesIdempotencyKey()
{
    var response = await client.PostAsJsonAsync("/api/v1/payments", validRequest);
    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);   // header yo'q
}

[Fact]
public async Task EndpointGroup_RequiresAuthorization()
{
    var anonymous = factory.CreateClient();
    var response = await anonymous.GetAsync("/api/v1/payments");

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
}

[Fact]
public void AllEndpoints_HaveOpenApiMetadata()
{
    var endpoints = factory.Services.GetRequiredService<EndpointDataSource>().Endpoints;

    foreach (var endpoint in endpoints.OfType<RouteEndpoint>()
                                      .Where(e => e.RoutePattern.RawText!.StartsWith("/api")))
        Assert.NotNull(endpoint.Metadata.GetMetadata<IProducesResponseTypeMetadata>());
}
```

## Xotira kartasi

```
Minimal API  kam kod · tez start · AOT-friendly · filter CHEKLANGAN
             validatsiya QO'LDA (ApiController sehri yo'q)
Controller   to'liq filter pipeline · [ApiController] avtomatik validatsiya
             katta loyihada tabiiy tuzilma
Tashkil      MapGroup + alohida statik klasslar (PaymentEndpoints)
             guruh darajasida: auth, teglar, filter'lar
Qoida        bir loyihada ARALASHTIRMANG — izchillik yo'qoladi
Fintech      asosiy API → Controller · health/webhook → Minimal API
             biznes mantiq HAR DOIM application service'da
```

---

# 7.10 · Background service va graceful shutdown

## Nima va nega

Fon vazifalari — outbox relay, reconciliation, tozalash job'lari. Ular so'rov
kontekstidan tashqarida ishlaydi va **o'z scope'ini** boshqarishi kerak.

```csharp
public sealed class OutboxRelay(
    IServiceScopeFactory scopeFactory,
    ILogger<OutboxRelay> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // ⚠ HAR ITERATSIYADA yangi scope — DbContext Scoped (7.3)
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var bus = scope.ServiceProvider.GetRequiredService<IMessageBus>();

                var batch = await db.Outbox
                    .Where(m => m.PublishedAt == null)
                    .OrderBy(m => m.CreatedAt)
                    .Take(100)
                    .ToListAsync(stoppingToken);

                foreach (var msg in batch)
                {
                    // Boshlangan xabarni TUGATAMIZ — None bilan (M3.5)
                    await bus.PublishAsync(msg.Type, msg.Payload, CancellationToken.None);
                    msg.PublishedAt = DateTimeOffset.UtcNow;
                }

                await db.SaveChangesAsync(CancellationToken.None);

                await Task.Delay(batch.Count == 0 ? 1000 : 50, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;                                  // normal to'xtash
            }
            catch (Exception ex)
            {
                // ⚠ SIKL TO'XTAMASLIGI kerak — aks holda relay o'ladi
                logger.LogError(ex, "Outbox relay iteratsiyasi yiqildi");
                await Task.Delay(5000, stoppingToken);
            }
        }
    }
}

builder.Services.AddHostedService<OutboxRelay>();
```

```
   ⚠ ENG KO'P UCHRAYDIGAN XATO:
     ExecuteAsync ichida ushlanmagan exception → BackgroundService JIMGINA O'LADI
     Ilova ishlashda davom etadi, lekin relay to'xtagan.
     → Har iteratsiya try/catch bilan o'ralishi SHART
     → Va relay «tirikligi» monitoring qilinishi kerak
```

## Graceful shutdown

```
   Kubernetes pod'ni to'xtatishi:

   1. Pod "Terminating" holatiga o'tadi
      → Service endpoint'laridan CHIQARILADI (yangi so'rov kelmaydi)
   2. SIGTERM yuboriladi
      → IHostApplicationLifetime.ApplicationStopping ishga tushadi
      → BackgroundService'ga stoppingToken beriladi
   3. terminationGracePeriodSeconds kutiladi (default 30s)
   4. SIGKILL — majburiy o'ldirish

   ⚠ 3-qadamdagi muddat eng uzun operatsiyadan UZUNROQ bo'lishi kerak
```

```csharp
builder.Services.Configure<HostOptions>(o =>
{
    o.ShutdownTimeout = TimeSpan.FromSeconds(30);
    o.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});
```

```yaml
# Kubernetes
spec:
  terminationGracePeriodSeconds: 60      # ShutdownTimeout'dan uzunroq
  containers:
    - lifecycle:
        preStop:
          exec: { command: ["sleep", "5"] }   # endpoint'dan chiqishga vaqt
```

## Health check

```csharp
builder.Services.AddHealthChecks()
    .AddNpgSql(connectionString, name: "database", tags: ["ready"])
    .AddCheck<OutboxRelayHealthCheck>("outbox-relay", tags: ["ready"]);

// Liveness  — jarayon tirikmi (yiqilsa restart)
app.MapHealthChecks("/health/live", new() { Predicate = _ => false });

// Readiness — trafik qabul qilishga tayyormi (yiqilsa endpoint'dan chiqariladi)
app.MapHealthChecks("/health/ready", new() { Predicate = c => c.Tags.Contains("ready") });
```

```
   ⚠ Farqni ajratish MUHIM:

   Liveness  yiqilsa → pod RESTART qilinadi
             → DB yiqilganda liveness'ni yiqitmang! Pod restart yordam bermaydi,
               faqat qayta-qayta o'chib-yonadi

   Readiness yiqilsa → pod trafikdan CHIQARILADI, lekin ishlashda davom etadi
             → DB yiqilganda AYNAN SHU kerak
```

## Rejalashtirilgan vazifalar

```csharp
// PeriodicTimer — .NET 6+, Timer'dan aniqroq
using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
while (await timer.WaitForNextTickAsync(stoppingToken))
    await ReconcileAsync(stoppingToken);

// ⚠ Bir necha instance bo'lsa — HAMMASI bajaradi!
//   Yechim: DB advisory lock / distributed lock / leader election
```

```csharp
// PostgreSQL advisory lock — faqat bitta instance bajaradi
var acquired = await db.Database.SqlQuery<bool>(
    $"SELECT pg_try_advisory_lock({JobLockId}) AS \"Value\"").SingleAsync(ct);

if (!acquired) return;      // boshqa instance bajarmoqda
try { await ReconcileAsync(ct); }
finally { await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_unlock({JobLockId})", ct); }
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `ExecuteAsync` da ushlanmagan exception | Service jimgina o'ladi |
| Har iteratsiyada scope ochmaslik | Captive dependency, eskirgan ma'lumot |
| `stoppingToken` ni hurmat qilmaslik | Graceful shutdown ishlamaydi |
| Boshlangan ishni yarim qoldirish | Nomuvofiq holat |
| Bir necha instance uchun lock qo'ymaslik | Job takrorlanadi |
| DB yiqilganda liveness'ni yiqitish | Pod cheksiz restart |

## Fintech konteksti

- **Outbox relay** — eng muhim fon vazifasi. U to'xtasa hodisalar yuborilmaydi va
  tizim jimgina nomuvofiq bo'ladi. Uning «tirikligi» **alert** bilan kuzatiladi.
- **Reconciliation job** — kuniga bir marta, faqat bitta instance'da (advisory lock).
- **Graceful shutdown** — boshlangan to'lov tugatilishi shart; `terminationGracePeriodSeconds`
  eng uzun provayder timeout'idan uzunroq.

## Intervyu savollari

**1. `BackgroundService` da `DbContext` ni qanday olasiz?** ⭐

> `IServiceScopeFactory` orqali — **har iteratsiyada yangi scope** ochaman.
>
> `BackgroundService` singleton, `DbContext` esa Scoped. Uni to'g'ridan-to'g'ri
> konstruktorga olsam captive dependency bo'ladi: change tracker to'ladi, ma'lumot
> eskiradi, ulanish ochiq qoladi.

**2. Fon vazifasi yiqilsa nima bo'ladi?**

> Sukut bo'yicha `BackgroundService` **jimgina to'xtaydi**, ilova esa ishlashda
> davom etadi. Bu eng xavfli holat: outbox relay o'lgan, lekin hech kim bilmaydi.
>
> Shuning uchun: har iteratsiyani `try/catch` bilan o'rayman va sikl davom etadi;
> va relay «tirikligi» health check hamda alert bilan kuzatiladi (masalan
> «oxirgi muvaffaqiyatli iteratsiya 5 daqiqadan oldin»).

**3. Graceful shutdown'ni qanday amalga oshirasiz?**

> `stoppingToken` ni **yangi ish olmaslik** uchun ishlataman, lekin **boshlangan
> ishni tugataman** — buning uchun ichkarida `CancellationToken.None` (M3.5).
>
> Kubernetes tomonida `terminationGracePeriodSeconds` eng uzun operatsiyadan
> uzunroq bo'lishi kerak, va `preStop` bilan endpoint'dan chiqishga vaqt beriladi.

**4. Liveness va readiness farqi?** ⭐

> **Liveness** yiqilsa pod **restart** qilinadi. **Readiness** yiqilsa pod
> trafikdan **chiqariladi**, lekin ishlashda davom etadi.
>
> Muhim qoida: DB yiqilganda **liveness'ni yiqitmang**. Pod restart muammoni
> yechmaydi — u faqat qayta-qayta o'chib-yonadi. To'g'risi — readiness'ni yiqitish:
> pod trafik olmaydi, DB tiklanganda o'zi qaytadi.

**5. Bir necha instance'da rejalashtirilgan job qanday ishlaydi?**

> Sukut bo'yicha **hammasi bajaradi** — bu reconciliation uchun falokat.
>
> Yechim: PostgreSQL advisory lock, distributed lock (Redis) yoki leader election.
> Men advisory lock'ni afzal ko'raman — qo'shimcha infratuzilma kerak emas va DB
> allaqachon bor.

## Deliverable

```csharp
public class BackgroundServiceTests
{
    [Fact]
    public async Task Relay_SurvivesIterationFailure()
    {
        bus.FailNextPublish();
        var relay = new OutboxRelay(scopeFactory, logger);

        await relay.StartAsync(CancellationToken.None);
        await Task.Delay(300);

        Assert.False(relay.ExecuteTask!.IsCompleted);      // hali ishlayapti
        await relay.StopAsync(CancellationToken.None);
    }

    [Fact]
    public async Task Shutdown_CompletesCurrentBatch()
    {
        await SeedOutbox(10);
        var relay = new OutboxRelay(scopeFactory, logger);

        await relay.StartAsync(CancellationToken.None);
        await Task.Delay(50);
        await relay.StopAsync(CancellationToken.None);

        Assert.Equal(0, await CountPartiallyPublishedAsync());
    }

    [Fact]
    public async Task ScheduledJob_RunsOnSingleInstanceOnly()
    {
        var results = await Task.WhenAll(
            RunReconciliationAsync(NewScope()),
            RunReconciliationAsync(NewScope()),
            RunReconciliationAsync(NewScope()));

        Assert.Equal(1, results.Count(r => r.Executed));    // advisory lock
    }

    [Fact]
    public async Task Readiness_FailsWhenDatabaseDown()
    {
        await postgres.StopAsync();

        Assert.Equal(HttpStatusCode.ServiceUnavailable,
                     (await client.GetAsync("/health/ready")).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
                     (await client.GetAsync("/health/live")).StatusCode);   // TIRIK
    }
}
```

## Xotira kartasi

```
Scope        BackgroundService SINGLETON · DbContext SCOPED
             → HAR ITERATSIYADA IServiceScopeFactory.CreateScope()
Xato         ushlanmagan exception → service JIMGINA O'LADI
             → har iteratsiya try/catch · tiriklik ALERT bilan kuzatiladi
Shutdown     stoppingToken = yangi ish olmaslik
             boshlangan ish CancellationToken.None bilan tugatiladi
             terminationGracePeriodSeconds > eng uzun operatsiya
Health       LIVENESS yiqilsa → RESTART · READINESS yiqilsa → trafikdan chiqadi
             ⚠ DB yiqilganda LIVENESS'NI YIQITMANG (cheksiz restart)
Bir necha instance
             rejalashtirilgan job HAMMASIDA bajariladi
             → pg_try_advisory_lock / distributed lock / leader election
```

---

# 7.11 · Rate limiting, CORS, caching

## Rate limiting (.NET 7+)

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Umumiy — foydalanuvchi bo'yicha
    options.AddPolicy("per-user", ctx => RateLimitPartition.GetTokenBucketLimiter(
        partitionKey: ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? ctx.Connection.RemoteIpAddress?.ToString()
                      ?? "anonymous",
        factory: _ => new TokenBucketRateLimiterOptions
        {
            TokenLimit = 100,
            TokensPerPeriod = 100,
            ReplenishmentPeriod = TimeSpan.FromMinutes(1),
            QueueLimit = 0                       // navbat yo'q — darhol rad
        }));

    // To'lov endpoint'i — qattiqroq
    options.AddPolicy("payments", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));

    options.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.Headers.RetryAfter = "60";
        await ctx.HttpContext.Response.WriteAsJsonAsync(
            new ProblemDetails { Status = 429, Title = "Juda ko'p so'rov" }, ct);
    };
});

app.UseRateLimiter();
app.MapPost("/payments", ...).RequireRateLimiting("payments");
```

| Algoritm | Xatti-harakat | Qachon |
|---|---|---|
| **Fixed window** | Sobit oynada N ta | Sodda, lekin chegara oralig'ida 2N mumkin |
| **Sliding window** | Silliq oyna | Adolatliroq, qimmatroq |
| **Token bucket** | Portlash (burst) ruxsat etiladi | **Amalda eng ko'p ishlatiladi** |
| **Concurrency** | Bir vaqtdagi so'rovlar soni | Og'ir operatsiyalar uchun |

```
   ⚠ Bir necha instance bo'lsa — har biri O'Z hisobini yuritadi!
     10 pod × 100 so'rov = 1000 so'rov o'tadi.
     → Aniq chegara kerak bo'lsa: Redis asosidagi distributed rate limiter
     → yoki chegarani instance soniga bo'ling
```

## CORS

```csharp
builder.Services.AddCors(o => o.AddPolicy("web", policy =>
    policy.WithOrigins("https://app.example.uz")     // ⚠ AniQ origin
          .WithMethods("GET", "POST", "PATCH")
          .WithHeaders("Authorization", "Content-Type", "Idempotency-Key")
          .AllowCredentials()
          .SetPreflightMaxAge(TimeSpan.FromMinutes(10))));

app.UseCors("web");        // ⚠ UseRouting'dan KEYIN, UseAuthorization'dan OLDIN
```

```
   ❌ AllowAnyOrigin() + AllowCredentials() — brauzer RAD ETADI
      (va bu to'g'ri: har kim cookie bilan so'rov yubora olardi)

   ⚠ CORS — BRAUZER himoyasi, server himoyasi EMAS.
     curl yoki server-to-server so'rovga u ta'sir qilmaydi.
     Haqiqiy himoya — autentifikatsiya va avtorizatsiya.
```

## Caching

```csharp
// Output caching (.NET 7+) — server tomonda javob keshi
builder.Services.AddOutputCache(o =>
{
    o.AddPolicy("rates", b => b.Expire(TimeSpan.FromMinutes(5)).Tag("rates"));
});

app.MapGet("/api/v1/rates", GetRatesAsync).CacheOutput("rates");

// Invalidatsiya
await outputCacheStore.EvictByTagAsync("rates", ct);
```

```csharp
// Distributed cache — bir necha instance uchun
builder.Services.AddStackExchangeRedisCache(o => o.Configuration = redisConnection);

// Hybrid cache (.NET 9) — L1 (xotira) + L2 (Redis), stampede himoyasi bilan
var rate = await hybridCache.GetOrCreateAsync(
    $"rate:{pair}",
    async token => await LoadRateAsync(pair, token),
    new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(5) },
    cancellationToken: ct);
```

```
   ┌──────────────────────────────┬────────────────────────────┐
   │  KESHLASH MUMKIN             │  KESHLASH MUMKIN EMAS      │
   ├──────────────────────────────┼────────────────────────────┤
   │  Valyuta kurslari            │  BALANS                    │
   │  Ma'lumotnomalar             │  Limit qoldig'i            │
   │  Merchant ro'yxati           │  Tranzaksiya holati        │
   │  Statik konfiguratsiya       │  Idempotency kaliti        │
   └──────────────────────────────┴────────────────────────────┘

   Qoida: kesh — TEZLIK uchun, HAQIQAT uchun emas.
          Pulga tegishli qaror har doim manbadan.
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Rate limit'ni instance soniga bo'lmaslik | Chegara N barobar oshadi |
| Proxy ortida IP bo'yicha limit (7.1 sozlanmagan) | Hamma bitta IP — tizim bloklanadi |
| `AllowAnyOrigin` production'da | Har qanday sayt API'ni chaqira oladi |
| CORS'ni xavfsizlik deb bilish | U faqat brauzer himoyasi |
| Balansni keshlash | Eskirgan ma'lumot bo'yicha qaror |
| Kesh invalidatsiyasi yo'q | Foydalanuvchi eski ma'lumot ko'radi |
| Kesh stampede | Kesh eskirganda barcha so'rov DB'ga uradi |

## Fintech konteksti

- **Login va to'lov endpoint'lari** — eng qattiq rate limit. Bu brute force va
  fraud'ga qarshi birinchi chiziq.
- **`429` javobida `Retry-After`** — client kutubxonalari uni hurmat qiladi.
- **Kurs keshi** — 5 daqiqa TTL odatiy; lekin to'lov paytida **muzlatilgan kurs**
  ishlatiladi (M4.6), kesh emas.

## Intervyu savollari

**1. Rate limiting'ni qanday amalga oshirasiz?**

> .NET 7+ da o'rnatilgan `AddRateLimiter` bilan, odatda **token bucket** —
> u qisqa portlashlarga (burst) ruxsat beradi va o'rtacha tezlikni cheklaydi.
>
> Bo'linish kaliti — foydalanuvchi ID, anonim bo'lsa IP.
>
> ⚠ Muhim nuans: bir necha instance bo'lsa **har biri o'z hisobini yuritadi**.
> Aniq chegara kerak bo'lsa Redis asosidagi distributed limiter, aks holda
> chegarani instance soniga bo'lish kerak.

**2. CORS xavfsizlik mexanizmimi?**

> Yo'q, va bu keng tarqalgan tushunmovchilik. CORS — **brauzer** himoyasi: u
> boshqa saytdagi JavaScript'ning sizning API'ingizga so'rov yuborishini cheklaydi.
>
> `curl`, Postman yoki server-to-server so'rovga u umuman ta'sir qilmaydi.
>
> Haqiqiy himoya — autentifikatsiya va avtorizatsiya. CORS ularni almashtirmaydi.

**3. Nimani keshlash mumkin, nimani mumkin emas?** ⭐

> Keshlash mumkin: valyuta kurslari, ma'lumotnomalar, merchant ro'yxati, kam
> o'zgaradigan konfiguratsiya.
>
> **Mumkin emas**: hisob balansi, limit qoldig'i, tranzaksiya holati, idempotency
> kaliti — ular bo'yicha qaror qabul qilinadi.
>
> Qoida: kesh — **tezlik uchun, haqiqat uchun emas**. Pulga tegishli qaror har
> doim manbadan o'qiladi.

**4. Kesh stampede nima?**

> Kesh yozuvi eskirgan lahzada **barcha** so'rovlar bir vaqtda manbaga uradi va uni
> yiqitadi.
>
> Yechimlar: bitta kalit uchun bitta yuklovchi (`Lazy<T>` yoki `SemaphoreSlim`),
> yoki tasodifiy jitter bilan muddat, yoki `HybridCache` — u stampede himoyasini
> o'zi beradi.

## Deliverable

```csharp
public class RateLimitAndCacheTests
{
    [Fact]
    public async Task ExceedingLimit_Returns429WithRetryAfter()
    {
        for (int i = 0; i < 10; i++) await PostPaymentAsync();

        var response = await PostPaymentAsync();

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.True(response.Headers.Contains("Retry-After"));
    }

    [Fact]
    public async Task RateLimit_IsPerUser()
    {
        for (int i = 0; i < 10; i++) await PostPaymentAsync(asUser: "user-a");

        var response = await PostPaymentAsync(asUser: "user-b");
        Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
    }

    [Fact]
    public async Task Balance_IsNeverCached()
    {
        var first = await GetBalanceAsync();
        await MakePaymentDirectlyInDatabase(amount: 50_000);
        var second = await GetBalanceAsync();

        Assert.NotEqual(first, second);         // kesh bo'lsa TENG bo'lardi
    }

    [Fact]
    public async Task Rates_AreCached()
    {
        await GetRatesAsync();
        var queriesBefore = interceptor.QueryCount;
        await GetRatesAsync();

        Assert.Equal(queriesBefore, interceptor.QueryCount);
    }

    [Fact]
    public async Task CorsPreflight_RejectsUnknownOrigin()
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/v1/payments");
        request.Headers.Add("Origin", "https://evil.example");
        request.Headers.Add("Access-Control-Request-Method", "POST");

        var response = await client.SendAsync(request);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
```

## Xotira kartasi

```
Rate limit   token bucket (burst ruxsat) · fixed/sliding window · concurrency
             kalit: user ID, anonim bo'lsa IP
             ⚠ har instance O'Z hisobini yuritadi → Redis yoki chegarani bo'ling
             429 + Retry-After header
CORS         BRAUZER himoyasi, server himoyasi EMAS (curl'ga ta'sir qilmaydi)
             AllowAnyOrigin + AllowCredentials → brauzer RAD ETADI
             UseRouting'dan keyin, UseAuthorization'dan oldin
Caching      OutputCache · Redis (distributed) · HybridCache (L1+L2, .NET 9)
Mumkin       kurslar · ma'lumotnomalar · merchant ro'yxati
MUMKIN EMAS  BALANS · limit qoldig'i · tranzaksiya holati · idempotency kaliti
Qoida        kesh TEZLIK uchun, HAQIQAT uchun emas
Stampede     kesh eskirganda hamma DB'ga uradi → Lazy/Semaphore yoki HybridCache
```

---

# 7.12 · gRPC va webhook

## gRPC

```protobuf
syntax = "proto3";
package fintech.payments.v1;

service PaymentService {
  rpc GetPayment (GetPaymentRequest) returns (PaymentReply);
  rpc StreamPayments (StreamRequest) returns (stream PaymentReply);
}

message GetPaymentRequest { string id = 1; }

message PaymentReply {
  string id = 1;
  int64  amount_minor = 2;      // ⚠ decimal YO'Q — minor unit (M4.3)
  string currency = 3;
  string status = 4;
}
```

| | REST + JSON | gRPC |
|---|---|---|
| Format | Matn (JSON) | Binary (protobuf) |
| Tezlik | — | 2–5× tezroq, kichikroq |
| Shartnoma | OpenAPI (ixtiyoriy) | `.proto` — **majburiy** |
| Brauzer | ✅ | ⚠ gRPC-Web kerak |
| Streaming | Cheklangan | ✅ ikki tomonlama |
| Debug | Oson (curl) | Maxsus vosita kerak |
| **Qachon** | Ommaviy API | **Ichki servislar aro** |

```
   ⚠ protobuf'da decimal turi YO'Q.
     Pul uchun: int64 minor unit + currency satri (M4.3)
     yoki satr sifatida uzatish.
```

## Webhook qabul qilish

Provayder to'lov holati o'zgarganda bizga xabar yuboradi. Bu — **ishonchsiz
kanal**, uni to'g'ri ishlash muhim.

```csharp
[HttpPost("webhooks/provider")]
[AllowAnonymous]                          // ⚠ token yo'q — IMZO tekshiriladi
public async Task<IActionResult> Receive(CancellationToken ct)
{
    // 1. Xom tanani o'qish — imzo AYNAN shu bayt ketma-ketligidan hisoblanadi
    using var reader = new StreamReader(Request.Body);
    var rawBody = await reader.ReadToEndAsync(ct);

    // 2. Imzoni tekshirish
    var signature = Request.Headers["X-Signature"].FirstOrDefault();
    if (!_verifier.IsValid(rawBody, signature))
        return Unauthorized();

    // 3. Vaqt belgisini tekshirish — replay hujumidan himoya
    var timestamp = Request.Headers["X-Timestamp"].FirstOrDefault();
    if (!IsFresh(timestamp, maxAge: TimeSpan.FromMinutes(5)))
        return BadRequest();

    // 4. Idempotentlik — provayder bir xil hodisani QAYTA yuborishi mumkin
    var eventId = Request.Headers["X-Event-Id"].FirstOrDefault()!;
    if (!await _store.TryMarkProcessedAsync(eventId, ct))
        return Ok();                      // allaqachon ishlangan

    // 5. TEZ javob berish, ishni NAVBATGA qo'yish
    await _inbox.EnqueueAsync(rawBody, ct);
    return Ok();
}
```

```
   ⚠ WEBHOOK QOIDALARI:

   1. IMZONI tekshiring — aks holda har kim soxta hodisa yuborishi mumkin
   2. XOM tanani ishlating — JSON qayta serializatsiya imzoni buzadi
   3. Vaqt belgisi — eski so'rovni qayta yuborish (replay) oldini oladi
   4. IDEMPOTENT bo'ling — provayder qayta yuborishi NORMAL holat
   5. TEZ javob bering (< 5s) — aks holda provayder retry qiladi
      → og'ir ishni navbatga qo'ying
   6. 2xx qaytaring — aks holda provayder qayta yuboradi
```

```csharp
// Imzo tekshiruvi — TIMING-SAFE taqqoslash
public bool IsValid(string body, string? signature)
{
    if (signature is null) return false;

    var computed = Convert.ToHexString(
        HMACSHA256.HashData(_secret, Encoding.UTF8.GetBytes(body)));

    // ⚠ Oddiy == taqqoslash timing attack beradi
    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(computed),
        Encoding.UTF8.GetBytes(signature));
}
```

## Webhook yuborish

```
   Biz ham webhook yuboramiz (merchant'larga):

   · Outbox orqali (M10.3) — yo'qolmasligi uchun
   · Retry: exponential backoff, masalan 1m, 5m, 30m, 2h, 6h
   · Imzo qo'shish — merchant tekshira olsin
   · Muvaffaqiyatsiz urinishlar dead letter'ga
   · Merchant uchun "qayta yuborish" tugmasi
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Webhook imzosini tekshirmaslik | Soxta hodisalar qabul qilinadi |
| Deserializatsiya qilingan JSON'dan imzo hisoblash | Imzo mos kelmaydi |
| Webhook'ni idempotent qilmaslik | Bir hodisa ikki marta ishlanadi |
| Webhook ichida og'ir ish | Provayder timeout → retry → yana yuk |
| Oddiy `==` bilan imzo taqqoslash | Timing attack |
| gRPC'da `decimal` ishlatishga urinish | Turi mavjud emas |

## Fintech konteksti

- **Provayder webhook'i** — to'lov holati haqidagi asosiy signal. U yo'qolsa yoki
  ikki marta ishlansa — pul holati noto'g'ri bo'ladi.
- **Webhook ishonchsiz** — u kelmasligi ham mumkin. Shuning uchun **polling** yoki
  **reconciliation** ham bo'lishi shart (M11.5): webhook — tezlik uchun,
  reconciliation — to'g'rilik uchun.
- **gRPC** ichki servislar aro (payment ↔ ledger ↔ notification), ommaviy API esa
  REST.

## Intervyu savollari

**1. gRPC ni qachon tanlaysiz?**

> **Ichki servislar aro** aloqada: binary protobuf tezroq va kichikroq, `.proto`
> qat'iy shartnoma beradi va client kodi avtomatik generatsiya qilinadi.
>
> Ommaviy API uchun REST qoldiraman: brauzerdan to'g'ridan-to'g'ri ishlaydi, debug
> oson, va integratsiya qiluvchilar uchun tanish.
>
> Fintech nuansi: protobuf'da `decimal` turi yo'q — pul `int64` minor unit va
> valyuta satri sifatida uzatiladi.

**2. Webhook'ni qanday xavfsiz qabul qilasiz?** ⭐

> Besh qadam:
> 1. **Imzoni tekshirish** — HMAC, va **xom tana** ustidan (deserializatsiya
>    qilingan JSON'dan qayta hisoblasa imzo mos kelmaydi).
> 2. **Timing-safe taqqoslash** — `FixedTimeEquals`, oddiy `==` timing attack beradi.
> 3. **Vaqt belgisi** — eski so'rovni qayta yuborishning oldini oladi.
> 4. **Idempotentlik** — provayder bir hodisani qayta yuborishi normal holat.
> 5. **Tez javob** (< 5s) va og'ir ishni navbatga qo'yish.

**3. Webhook kelmasa nima qilasiz?**

> Webhook — **ishonchsiz kanal**. U yo'qolishi, kechikishi yoki umuman kelmasligi
> mumkin.
>
> Shuning uchun u yagona manba bo'la olmaydi: `unknown` holatdagi to'lovlar uchun
> **status so'rovi** (polling) va kunlik **reconciliation** bo'lishi shart (M11.5).
>
> Formula: webhook — tezlik uchun, reconciliation — to'g'rilik uchun.

## Deliverable

```csharp
public class WebhookTests
{
    [Fact]
    public async Task InvalidSignature_IsRejected()
    {
        var response = await PostWebhookAsync(body, signature: "soxta");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DuplicateEvent_IsProcessedOnce()
    {
        var body = ValidWebhookBody(eventId: "evt-1");

        await PostWebhookAsync(body, ValidSignature(body));
        await PostWebhookAsync(body, ValidSignature(body));

        Assert.Equal(1, await CountProcessedEventsAsync("evt-1"));
    }

    [Fact]
    public async Task StaleTimestamp_IsRejected()
    {
        var body = ValidWebhookBody(timestamp: DateTimeOffset.UtcNow.AddHours(-2));
        var response = await PostWebhookAsync(body, ValidSignature(body));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Webhook_RespondsQuickly()
    {
        var sw = Stopwatch.StartNew();
        await PostWebhookAsync(ValidBody(), ValidSignature());
        sw.Stop();

        Assert.True(sw.ElapsedMilliseconds < 500);      // og'ir ish navbatda
    }
}
```

## Xotira kartasi

```
gRPC         binary protobuf · .proto MAJBURIY shartnoma · streaming
             ICHKI servislar aro · ommaviy API → REST
             ⚠ protobuf'da decimal YO'Q → int64 minor + currency
Webhook qabul qilish (5 qadam):
             1. IMZO — HMAC, XOM tana ustidan
             2. FixedTimeEquals (oddiy == → timing attack)
             3. vaqt belgisi — replay himoyasi
             4. IDEMPOTENT — qayta yuborish NORMAL
             5. tez javob (<5s), og'ir ish NAVBATGA
Webhook yuborish  outbox orqali · backoff retry · imzo · dead letter
Ishonchsizlik  webhook kelmasligi MUMKIN
             → polling + kunlik reconciliation SHART
             webhook = tezlik · reconciliation = to'g'rilik
```

---

## M7 — yakuniy tekshiruv ro'yxati

Kodsiz, og'zaki javob bera olsangiz — modul yopilgan:

- [ ] So'rov ilovaga qanday yetib keladi va proxy nima uchun kerak
- [ ] `HttpContext` ni fon vazifasiga nega uzatib bo'lmaydi
- [ ] Middleware tartibi nega muhim — uchta aniq misol
- [ ] Middleware'da Scoped servisni qanday olasiz
- [ ] Captive dependency nima va qanday ushlanadi
- [ ] `IOptions`, `IOptionsSnapshot`, `IOptionsMonitor` farqi
- [ ] Sirlarni qayerda saqlaysiz
- [ ] `400` va `422` farqi
- [ ] Overposting nima va qanday oldi olinadi
- [ ] Qaysi HTTP metodlar idempotent va `POST` uchun nima qilinadi
- [ ] Xato javobida nima bo'lishi va nima bo'lmasligi kerak
- [ ] `HttpClient` ni qanday to'g'ri ishlatasiz — ikki qarama-qarshi muammo
- [ ] Timeout bo'lsa retry qilasizmi
- [ ] Circuit breaker holatlari
- [ ] `BackgroundService` da `DbContext` ni qanday olasiz
- [ ] Liveness va readiness farqi
- [ ] Bir necha instance'da rejalashtirilgan job
- [ ] CORS xavfsizlik mexanizmimi
- [ ] Nimani keshlash mumkin emas
- [ ] Webhook'ni xavfsiz qabul qilishning besh qadami

**Deliverable'lar:**

- [ ] `MiddlewareTests` — correlation ID, tartib, exception handler
- [ ] `DependencyInjectionTests` — captive dependency startup'da ushlanishi
- [ ] `ConfigurationTests` — `ValidateOnStart`, sirlar `appsettings`da yo'qligi
- [ ] `ValidationTests` — 400 vs 422, overposting, boshqa foydalanuvchi resursi
- [ ] `RestApiTests` — 201+Location, idempotent DELETE, cursor pagination
- [ ] `ErrorHandlingTests` — ma'lumot sizmasligi, log darajalari
- [ ] `HttpResilienceTests` — retry, circuit breaker, bir xil idempotency key
- [ ] `BackgroundServiceTests` — xatodan omon qolish, graceful shutdown, advisory lock
- [ ] `RateLimitAndCacheTests` — 429, per-user limit, balans keshlanmasligi
- [ ] `WebhookTests` — imzo, dublikat, eski vaqt belgisi, tez javob
