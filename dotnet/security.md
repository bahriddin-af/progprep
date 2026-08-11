# M8 · Xavfsizlik

Fintech'da xavfsizlik — alohida mavzu emas, **har qarorning bir qismi**. Bu modulda
intervyuda so'raladigan va kundalik ishda kerak bo'ladigan qism yig'ilgan.

| # | Mavzu | P |
|---|---|---|
| [8.1](#81--autentifikatsiya-va-avtorizatsiya-) | Autentifikatsiya va avtorizatsiya ⭐ | P0 |
| [8.2](#82--jwt-) | JWT ⭐ | P0 |
| [8.3](#83--refresh-token-va-sessiya-) | Refresh token va sessiya ⭐ | P0 |
| [8.4](#84--oauth2-va-openid-connect) | OAuth2 va OpenID Connect | P1 |
| [8.5](#85--avtorizatsiya-va-resurs-egaligi-) | Avtorizatsiya, resurs egaligi ⭐ | P0 |
| [8.6](#86--parol-saqlash) | Parol saqlash | P1 |
| [8.7](#87--owasp-top-10-net-kontekstida) | OWASP Top 10 | P1 |
| [8.8](#88--injection-xss-csrf-ssrf) | Injection, XSS, CSRF, SSRF | P1 |
| [8.9](#89--sirlarni-boshqarish) | Sirlarni boshqarish | P1 |
| [8.10](#810--shifrlash-va-tls) | Shifrlash va TLS | P2 |
| [8.11](#811--elektron-imzo-eri-va-x509) | Elektron imzo (ERI) va X.509 | P2 |
| [8.12](#812--pci-dss-tokenizatsiya-pii) | PCI DSS, tokenizatsiya, PII | P1 |
| [8.13](#813--audit-log-) | Audit log ⭐ | P0 |

---

# 8.1 · Autentifikatsiya va avtorizatsiya ⭐

## Nima va nega

Ikki so'z o'xshash, lekin butunlay boshqa savollarga javob beradi. Ularni
chalkashtirish — arxitektura xatosi.

```
   ┌──────────────────────────────┬──────────────────────────────┐
   │  AUTENTIFIKATSIYA (AuthN)    │  AVTORIZATSIYA (AuthZ)       │
   ├──────────────────────────────┼──────────────────────────────┤
   │  "KIM sen?"                  │  "Nima qilishga RUXSATING    │
   │                              │   bor?"                      │
   ├──────────────────────────────┼──────────────────────────────┤
   │  Parol, token, sertifikat    │  Rol, policy, resurs egaligi │
   │  Bir marta — kirishda        │  HAR so'rovda                │
   │  Xato → 401 Unauthorized     │  Xato → 403 Forbidden        │
   └──────────────────────────────┴──────────────────────────────┘

   ⚠ 401 va 403 nomlanishi HTTP standartida chalkash:
     401 aslida "unauthenticated" (kim ekaning noma'lum)
     403 aslida "unauthorized"   (kim ekaning ma'lum, lekin ruxsat yo'q)
```

## Pipeline'dagi o'rni

```csharp
app.UseAuthentication();    // 1. Token o'qiladi → HttpContext.User to'ldiriladi
app.UseAuthorization();     // 2. Ruxsat tekshiriladi
app.MapControllers();
```

> Tartib **majburiy** (M7.2): `UseAuthorization` oldinda bo'lsa, foydalanuvchi hali
> aniqlanmagan bo'ladi va tekshiruv har doim `null` user bilan ishlaydi.

## Claims va identity

```csharp
// Autentifikatsiyadan keyin HttpContext.User to'ldiriladi
var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
var role   = User.FindFirstValue(ClaimTypes.Role);
var tenant = User.FindFirstValue("tenant_id");

User.Identity?.IsAuthenticated;      // autentifikatsiya bo'ldimi
User.IsInRole("operator");           // rol tekshiruvi
```

```
   ClaimsPrincipal
       │
       ├── ClaimsIdentity  (bir necha bo'lishi mumkin — JWT + API key)
       │       │
       │       ├── Claim: sub = "user-42"
       │       ├── Claim: role = "operator"
       │       └── Claim: tenant_id = "bank-1"
       │
       └── AuthenticationType: "Bearer"
```

## Sxemalar (schemes)

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer()                                    // foydalanuvchilar uchun
    .AddScheme<ApiKeyOptions, ApiKeyHandler>("ApiKey", null);   // merchant'lar uchun

// Aniq sxema talab qilish
[Authorize(AuthenticationSchemes = "ApiKey")]
public sealed class MerchantWebhookController : ControllerBase { }
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `UseAuthorization` `UseAuthentication`dan oldin | Tekshiruv har doim `null` user bilan |
| `401` o'rniga `403` (yoki teskarisi) | Client noto'g'ri harakat qiladi |
| Faqat `[Authorize]` qo'yib, egalikni tekshirmaslik | **Boshqa foydalanuvchining ma'lumoti** (8.5) |
| Client'dan kelgan `userId` ga ishonish | Har kim boshqa ID yuborishi mumkin |
| Rolni token'dan emas, DB'dan har so'rovda o'qish | Sekin — lekin ba'zan zarur |

```csharp
// ❌ Client'dan kelgan ID ga ishonish
[HttpGet("accounts/{userId}/balance")]
public async Task<IActionResult> Get(Guid userId) => Ok(await _svc.GetAsync(userId));

// ✅ Token'dagi ID dan foydalanish
[HttpGet("accounts/balance")]
public async Task<IActionResult> Get()
{
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    return Ok(await _svc.GetAsync(userId));
}
```

## Fintech konteksti

- **Ikki xil client**: foydalanuvchilar (JWT) va merchant'lar (API key + imzo).
  Ular alohida sxema va alohida ruxsat modeliga ega.
- **Kuchli autentifikatsiya** (2FA/OTP) — pul o'tkazish va sozlamalarni o'zgartirish
  uchun majburiy bo'lishi mumkin (regulyator talabi).
- **Sessiya** — kritik operatsiyadan oldin **qayta tasdiqlash** (step-up
  authentication) talab qilinishi mumkin.

## Intervyu savollari

**1. Autentifikatsiya va avtorizatsiya farqi nima?** ⭐

> Autentifikatsiya — «**kim** sen?». Avtorizatsiya — «nima qilishga **ruxsating**
> bor?».
>
> Birinchisi bir marta, kirishda bo'ladi va `401` bilan tugaydi; ikkinchisi **har
> so'rovda** tekshiriladi va `403` beradi.
>
> HTTP kodlari nomlanishi chalkash: `401` aslida «unauthenticated», `403` esa
> «unauthorized».

**2. `HttpContext.User` qayerdan to'ladi?**

> `UseAuthentication` middleware'i token yoki cookie'ni o'qib, uni
> `ClaimsPrincipal` ga aylantiradi va `HttpContext.User` ga qo'yadi.
>
> Shuning uchun u `UseAuthorization` dan **oldin** turishi shart — aks holda ruxsat
> tekshiruvi bo'sh `User` bilan ishlaydi.

**3. Foydalanuvchi ID sini qayerdan olasiz?**

> **Faqat token'dagi claim'dan** (`ClaimTypes.NameIdentifier`), hech qachon so'rov
> parametridan yoki tanadan.
>
> Aks holda har kim boshqa foydalanuvchining ID sini yuborib, uning ma'lumotini
> ola oladi. Bu OWASP'ning «Broken Access Control» kategoriyasi va u eng ko'p
> uchraydigan zaiflik.

## Deliverable

```csharp
public class AuthenticationTests
{
    [Fact]
    public async Task NoToken_Returns401_Not403()
        => Assert.Equal(HttpStatusCode.Unauthorized,
                        (await anonymousClient.GetAsync("/api/v1/payments")).StatusCode);

    [Fact]
    public async Task ValidTokenWithoutRole_Returns403()
    {
        var client = CreateClientWithRole("viewer");
        Assert.Equal(HttpStatusCode.Forbidden,
                     (await client.PostAsJsonAsync("/api/v1/payments", request)).StatusCode);
    }

    [Fact]
    public async Task UserIdFromBody_IsIgnored()
    {
        var client = CreateClientForUser(userA);
        var response = await client.GetAsync($"/api/v1/accounts/balance?userId={userB}");
        var balance = await response.Content.ReadFromJsonAsync<BalanceDto>();

        Assert.Equal(userA, balance!.UserId);       // token'dagi ID ishlatildi
    }
}
```

## Xotira kartasi

```
AuthN        "KIM sen?" · parol/token/sertifikat · bir marta · 401
AuthZ        "RUXSATING bormi?" · rol/policy/egalik · HAR so'rovda · 403
Tartib       UseAuthentication → UseAuthorization (aks holda User bo'sh)
User         ClaimsPrincipal → ClaimsIdentity → Claim'lar
Qoida        foydalanuvchi ID FAQAT token claim'idan
             so'rov parametridan HECH QACHON (Broken Access Control)
Sxemalar     JWT (foydalanuvchi) + API key (merchant) — alohida
Fintech      kritik operatsiyaga step-up authentication (2FA/OTP)
```

---

# 8.2 · JWT ⭐

## Nima va nega

JWT — **o'zini o'zi tasdiqlaydigan** token: server uni tekshirish uchun DB'ga
bormaydi, imzoni tekshiradi. Bu tezlik beradi, lekin bir muhim narsani olib qo'yadi
— **bekor qilish imkoni**.

```
   header . payload . signature
   ────────┴────────┴──────────

   {"alg":"RS256","typ":"JWT","kid":"key-1"}     ← header
   {"sub":"user-42","role":"operator",
    "exp":1767225600,"iat":1767224700,
    "iss":"https://auth.example.uz",
    "aud":"payments-api",
    "jti":"a1b2c3"}                              ← payload — OCHIQ!
   <imzo>                                         ← signature
```

```
   ⚠ ⚠ ⚠  PAYLOAD SHIFRLANGAN EMAS  ⚠ ⚠ ⚠

   U shunchaki base64url. Istalgan kishi ochib o'qiy oladi.
   Imzo faqat O'ZGARTIRILMAGANINI kafolatlaydi, SIRNI emas.

   → Parol, karta raqami, shaxsiy ma'lumot QO'YMANG
```

## Imzo algoritmlari

| Algoritm | Kalit | Qachon |
|---|---|---|
| **HS256** | Simmetrik (bitta sir) | Bitta servis o'zi chiqaradi va tekshiradi |
| **RS256** | Asimmetrik (private/public) | **Ko'p servis** — ular faqat public kalitni biladi |
| **ES256** | Asimmetrik (elliptik) | RS256 kabi, lekin kichikroq |

```
   Fintech'da odatda RS256:
   · Auth servis private kalit bilan IMZOLAYDI
   · Boshqa servislar public kalit bilan TEKSHIRADI
   · Sir bir joyda qoladi — kompromis maydoni kichik
```

## Tekshirish

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidIssuer              = "https://auth.example.uz",
            ValidateAudience         = true,
            ValidAudience            = "payments-api",
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys        = publicKeys,

            ClockSkew = TimeSpan.FromSeconds(30)    // ⚠ DEFAULT 5 DAQIQA!
        };
    });
```

```
   ⚠ ClockSkew default 5 daqiqa:
     muddati tugagan token yana 5 daqiqa QABUL QILINADI.
     Fintech'da bu ko'p — 30 soniyaga tushiriladi.

   ⚠ Har tekshiruvni ATAYLAB o'chirmang:
     ValidateAudience = false → boshqa servis uchun chiqarilgan token o'tadi
     ValidateIssuer   = false → boshqa provayder tokeni o'tadi
```

## Kalit rotatsiyasi va JWKS

```csharp
// Auth servis public kalitlarni JWKS endpoint'ida e'lon qiladi
o.MetadataAddress = "https://auth.example.uz/.well-known/openid-configuration";
// → kalitlar avtomatik yuklanadi va davriy yangilanadi

// header'dagi "kid" qaysi kalit ishlatilganini ko'rsatadi
// → rotatsiya paytida eski va yangi kalit BIR VAQTDA amal qiladi
```

## Bekor qilish muammosi

```
   JWT'ni server tomondan BEKOR QILIB BO'LMAYDI —
   u o'zini o'zi tasdiqlaydi, DB tekshiruvi yo'q.

   Foydalanuvchi bloklandi → tokeni MUDDATI TUGAGUNCHA ishlaydi.

   Yechimlar:
   ┌────────────────────────────────────────────────────────────┐
   │ 1. QISQA umr (5–15 daqiqa) + refresh token (8.3)  ← asosiy │
   │ 2. Blacklist (Redis'da jti)  — stateless afzalligini       │
   │                                yo'qotadi                    │
   │ 3. Token versiyasi — user_token_version claim'da,          │
   │    DB'dagi qiymat bilan solishtiriladi (kesh bilan)        │
   └────────────────────────────────────────────────────────────┘
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Payload'ga maxfiy ma'lumot qo'yish | U ochiq o'qiladi |
| `ClockSkew` ni default qoldirish | Eskirgan token 5 daqiqa amal qiladi |
| `ValidateAudience = false` | Boshqa servis tokeni qabul qilinadi |
| Uzoq umrli access token | Bekor qilib bo'lmaydi |
| HS256 ni ko'p servisda ishlatish | Har servis token **chiqara oladi** |
| `alg: none` ni qabul qilish | Imzosiz token o'tadi (eski kutubxonalarda) |
| Token'ni `localStorage` da saqlash | XSS bilan o'g'irlanadi (8.8) |

## Fintech konteksti

- **Access token 5–15 daqiqa** — bu bekor qilish oynasi. Undan uzoq bo'lsa
  bloklangan foydalanuvchi ishlashda davom etadi.
- **`aud` (audience)** har servis uchun alohida: to'lov servisi tokeni bilan
  admin panelga kirib bo'lmasin.
- **Muhim claim'lar**: `sub` (user), `tenant_id` (bank/merchant), `scope` (nima
  qila oladi), `jti` (blacklist uchun).

## Intervyu savollari

**1. JWT qanday ishlaydi va uni qanday bekor qilasiz?** ⭐

> JWT uchta qismdan iborat: header, payload, imzo. Server imzoni tekshiradi va
> DB'ga bormaydi — bu tezlik beradi, lekin **bekor qilish imkonini olib qo'yadi**.
>
> Foydalanuvchi bloklansa, uning tokeni **muddati tugaguncha** ishlashda davom
> etadi.
>
> Yechim: access token'ni qisqa qilish (5–15 daqiqa) va refresh token'ni DB'da
> saqlash — bloklashda refresh token o'chiriladi va keyingi yangilashda kirish
> to'xtaydi.
>
> Darhol bekor qilish kerak bo'lsa — Redis'da blacklist, lekin bu stateless
> afzallikni yo'qotadi.

**2. JWT payload'iga nimalarni qo'yish mumkin?** ⭐

> Faqat **maxfiy bo'lmagan** ma'lumot: `sub`, `role`, `scope`, `tenant_id`, muddat.
>
> Payload **shifrlangan emas** — u shunchaki base64url va istalgan kishi ochib
> o'qiy oladi. Imzo faqat o'zgartirilmaganini kafolatlaydi, sirni emas.
>
> Parol, karta raqami, shaxsiy ma'lumot — hech qachon.

**3. HS256 va RS256 — qaysi birini tanlaysiz?**

> **RS256**, agar tokenni bir necha servis tekshirsa.
>
> HS256 simmetrik: tekshira oladigan har servis token **chiqara ham oladi**. Ya'ni
> bitta servis kompromis bo'lsa, hujumchi istalgan foydalanuvchi nomidan token
> yasay oladi.
>
> RS256 da auth servis private kalit bilan imzolaydi, qolganlar faqat public kalit
> bilan tekshiradi — kompromis maydoni ancha kichik.

**4. `ClockSkew` nima va nega uni o'zgartirasiz?**

> Bu serverlar soati orasidagi farqga beriladigan yon berish. .NET'da default
> **5 daqiqa** — ya'ni muddati tugagan token yana 5 daqiqa qabul qilinadi.
>
> Fintech'da bu ko'p: bloklangan foydalanuvchi qo'shimcha 5 daqiqa ishlaydi. Men
> uni 30 soniyaga tushiraman va serverlarda NTP sinxronizatsiyasi bo'lishini
> ta'minlayman.

## Deliverable

```csharp
public class JwtTests
{
    [Fact]
    public async Task ExpiredToken_IsRejected()
    {
        var token = CreateToken(expires: DateTime.UtcNow.AddMinutes(-2));   // ClockSkew 30s
        Assert.Equal(HttpStatusCode.Unauthorized, (await SendWithToken(token)).StatusCode);
    }

    [Fact]
    public async Task TokenForAnotherAudience_IsRejected()
    {
        var token = CreateToken(audience: "admin-api");
        Assert.Equal(HttpStatusCode.Unauthorized, (await SendWithToken(token)).StatusCode);
    }

    [Fact]
    public async Task TamperedPayload_IsRejected()
    {
        var parts = CreateToken().Split('.');
        parts[1] = Base64Url(@"{""sub"":""user-42"",""role"":""admin""}");
        var tampered = string.Join('.', parts);

        Assert.Equal(HttpStatusCode.Unauthorized, (await SendWithToken(tampered)).StatusCode);
    }

    [Fact]
    public void Payload_ContainsNoSensitiveData()
    {
        var payload = DecodePayload(CreateToken());

        foreach (var forbidden in new[] { "password", "card", "pan", "cvv", "pinfl" })
            Assert.DoesNotContain(forbidden, payload, StringComparison.OrdinalIgnoreCase);
    }
}
```

## Xotira kartasi

```
Tuzilish     header.payload.signature — base64url
PAYLOAD      SHIFRLANGAN EMAS — har kim o'qiy oladi
             imzo faqat O'ZGARTIRILMAGANINI kafolatlaydi
Algoritm     HS256 simmetrik (tekshira olgan CHIQARA ham oladi)
             RS256 asimmetrik — ko'p servis uchun TO'G'RI tanlov
Tekshiruv    issuer · audience · lifetime · signing key
             ClockSkew DEFAULT 5 DAQIQA → 30 soniyaga tushiring
Bekor qilish JWT'ni bekor qilib BO'LMAYDI
             → qisqa umr (5–15 daq) + refresh token
             → yoki blacklist (stateless afzalligini yo'qotadi)
Rotatsiya    kid + JWKS — eski va yangi kalit bir vaqtda amal qiladi
Fintech      aud har servis uchun alohida · maxfiy claim YO'Q
```

---

# 8.3 · Refresh token va sessiya ⭐

## Nima va nega

Access token qisqa, chunki uni bekor qilib bo'lmaydi. Lekin foydalanuvchi har 10
daqiqada parol kiritmasligi kerak — shu joyda refresh token keladi.

```
   ┌──────────────────┬──────────────────┬─────────────────────────┐
   │                  │  Access token    │  Refresh token          │
   ├──────────────────┼──────────────────┼─────────────────────────┤
   │  Umri            │  5–15 daqiqa     │  7–30 kun               │
   │  Qayerda         │  Har so'rovda    │  Faqat yangilashda      │
   │  Saqlanadi       │  Xotirada        │  DB'da (hash bilan)     │
   │  Bekor qilinadi  │  ❌ (muddatgacha)│  ✅ DARHOL              │
   │  Formati         │  JWT             │  Tasodifiy satr yetadi  │
   └──────────────────┴──────────────────┴─────────────────────────┘
```

## Oqim

```
   Login
     │
     ├──► access  (15 daq)  ─────► API so'rovlari
     └──► refresh (30 kun)  ─────► DB'ga yoziladi (HASH bilan)

   15 daqiqadan keyin:
     │
     ├──► POST /auth/refresh  { refreshToken }
     │       │
     │       ├─► DB'da bormi va bekor qilinmaganmi?
     │       ├─► ESKISINI BEKOR QILISH (rotation)
     │       └─► yangi access + yangi refresh
     │
     └──► davom etadi
```

## Refresh token rotation

```csharp
public async Task<Result<TokenPair>> RefreshAsync(string refreshToken, CancellationToken ct)
{
    var hash = Hash(refreshToken);                    // ⚠ DB'da HASH saqlanadi
    var stored = await _db.RefreshTokens
        .FirstOrDefaultAsync(t => t.Hash == hash, ct);

    if (stored is null)
        return Result.Fail<TokenPair>("Token noto'g'ri");

    // ⚠ ALLAQACHON ISHLATILGAN token qayta kelsa — bu O'G'IRLIK belgisi
    if (stored.UsedAt is not null)
    {
        await RevokeEntireFamilyAsync(stored.FamilyId, ct);   // butun zanjirni bekor qilish
        _logger.LogWarning("Refresh token qayta ishlatildi {UserId}", stored.UserId);
        return Result.Fail<TokenPair>("Sessiya bekor qilindi");
    }

    if (stored.ExpiresAt < _clock.GetUtcNow() || stored.RevokedAt is not null)
        return Result.Fail<TokenPair>("Sessiya tugagan");

    stored.UsedAt = _clock.GetUtcNow();                // eskisini belgilash
    var pair = await IssueAsync(stored.UserId, stored.FamilyId, ct);
    await _db.SaveChangesAsync(ct);

    return Result.Ok(pair);
}
```

```
   O'G'IRLIKNI ANIQLASH MEXANIZMI:

   Foydalanuvchi:  R1 ──► R2 ──► R3
   Hujumchi R1 ni o'g'irladi va ishlatdi:
                   R1 ──► R2'  (R1 allaqachon ishlatilgan!)
                        │
                        └──► ANIQLANDI → butun oila bekor qilinadi
                             → hujumchi ham, foydalanuvchi ham chiqariladi
                             → foydalanuvchi qayta login qiladi
```

## Token'ni qayerda saqlash (client tomonda)

```
   ┌──────────────────┬────────────────────────────────────────────┐
   │  localStorage    │  ❌ XSS bilan o'g'irlanadi                 │
   │  sessionStorage  │  ❌ Xuddi shu                              │
   │  Xotirada (JS)   │  ⚠ Sahifa yangilanganda yo'qoladi          │
   │  httpOnly cookie │  ✅ XSS o'qiy olmaydi                       │
   │                  │  ⚠ lekin CSRF himoyasi kerak (8.8)         │
   └──────────────────┴────────────────────────────────────────────┘

   Amaliy yondashuv (SPA uchun):
   · access token  → xotirada (JS o'zgaruvchisi)
   · refresh token → httpOnly + Secure + SameSite=Strict cookie
```

```csharp
Response.Cookies.Append("refresh_token", token, new CookieOptions
{
    HttpOnly = true,                          // JS o'qiy olmaydi
    Secure   = true,                          // faqat HTTPS
    SameSite = SameSiteMode.Strict,           // CSRF himoyasi
    Path     = "/auth/refresh",               // faqat shu endpoint'ga yuboriladi
    Expires  = DateTimeOffset.UtcNow.AddDays(30)
});
```

## Sessiyani boshqarish

```csharp
// Foydalanuvchi barcha qurilmalarini ko'radi va chiqara oladi
public sealed class RefreshToken
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public Guid FamilyId { get; init; }        // rotation zanjiri
    public string Hash { get; init; } = null!;
    public string? DeviceInfo { get; init; }   // "Chrome / Windows"
    public string? IpAddress { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset ExpiresAt { get; init; }
    public DateTimeOffset? UsedAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
}
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Refresh token'ni ochiq saqlash | DB kompromis bo'lsa hamma sessiya o'g'irlanadi |
| Rotation qilmaslik | O'g'irlangan token uzoq ishlaydi |
| Qayta ishlatishni aniqlamaslik | O'g'irlik bilinmaydi |
| Token'ni `localStorage` da saqlash | XSS bilan o'g'irlanadi |
| Chiqishda (logout) token'ni o'chirmaslik | Sessiya davom etadi |
| Parol o'zgarganda sessiyalarni bekor qilmaslik | Eski sessiya ishlaydi |

## Fintech konteksti

- **Parol o'zgarganda** yoki **shubhali faollik** aniqlanganda — barcha refresh
  token'lar bekor qilinadi.
- **Qurilmalar ro'yxati** — foydalanuvchi o'z sessiyalarini ko'rishi va uzoqdan
  chiqarishi kerak (regulyator talabi bo'lishi mumkin).
- **Kritik operatsiya** (yirik o'tkazma, sozlama o'zgarishi) — **step-up
  authentication**: access token bo'lsa ham OTP so'raladi.

## Intervyu savollari

**1. Nega refresh token kerak?** ⭐

> Access token'ni bekor qilib bo'lmaydi, shuning uchun u **qisqa** bo'lishi kerak.
> Lekin foydalanuvchi har 15 daqiqada parol kiritmasligi kerak.
>
> Refresh token bu ikki talabni birlashtiradi: u uzoq umrli, lekin **DB'da
> saqlanadi** — ya'ni istalgan payt bekor qilish mumkin.
>
> Va u faqat yangilash endpoint'iga yuboriladi, ya'ni tarmoqda kamroq ko'rinadi.

**2. Refresh token rotation nima?** ⭐

> Har yangilashda **eski token bekor qilinadi** va yangisi beriladi.
>
> Eng qimmatli tomoni — **o'g'irlikni aniqlash**: agar allaqachon ishlatilgan
> token qayta kelsa, demak kimdir uni o'g'irlagan. Bu holatda men butun **oilani**
> (rotation zanjirini) bekor qilaman va foydalanuvchini qayta login qilishga
> majburlayman.
>
> Rotation'siz o'g'irlangan token muddati tugaguncha ishlaydi va buni hech kim
> bilmaydi.

**3. Token'ni client tomonda qayerda saqlash kerak?**

> `localStorage` — **yo'q**: XSS zaifligida JavaScript uni o'qiy oladi.
>
> Amaliy yondashuv: **access token xotirada** (JS o'zgaruvchisi, sahifa
> yangilanganda yo'qoladi va refresh bilan qayta olinadi), **refresh token
> httpOnly + Secure + SameSite=Strict cookie** da.
>
> Cookie ishlatilsa CSRF himoyasi ham kerak (8.8) — `SameSite=Strict` va alohida
> `Path` buni sezilarli kamaytiradi.

**4. Foydalanuvchi bloklanganda nima bo'ladi?**

> Uning barcha refresh token'lari DB'da bekor qilinadi — keyingi yangilashda kirish
> to'xtaydi.
>
> Access token esa muddati tugaguncha (5–15 daqiqa) ishlashda davom etadi. Agar
> **darhol** to'xtatish kerak bo'lsa — Redis blacklist'ga `jti` qo'shiladi, lekin
> bu har so'rovda qo'shimcha tekshiruv demak.
>
> Fintech'da odatda kelishuv: 15 daqiqalik oyna qabul qilinadi, lekin **pul
> operatsiyalari** uchun qo'shimcha tekshiruv (foydalanuvchi holati) qo'yiladi.

## Deliverable

```csharp
public class RefreshTokenTests
{
    [Fact]
    public async Task Refresh_RotatesToken()
    {
        var pair = await LoginAsync();
        var newPair = await RefreshAsync(pair.RefreshToken);

        Assert.NotEqual(pair.RefreshToken, newPair.RefreshToken);

        var reuse = await RefreshAsync(pair.RefreshToken);      // eskisi
        Assert.False(reuse.IsSuccess);
    }

    [Fact]
    public async Task ReusedToken_RevokesEntireFamily()
    {
        var p1 = await LoginAsync();
        var p2 = await RefreshAsync(p1.RefreshToken);

        await RefreshAsync(p1.RefreshToken);                    // o'g'irlik simulyatsiyasi

        var afterAttack = await RefreshAsync(p2.RefreshToken);  // haqiqiy foydalanuvchi
        Assert.False(afterAttack.IsSuccess);                    // u ham chiqarildi
    }

    [Fact]
    public async Task PasswordChange_RevokesAllSessions()
    {
        var pair = await LoginAsync();
        await ChangePasswordAsync();

        Assert.False((await RefreshAsync(pair.RefreshToken)).IsSuccess);
    }

    [Fact]
    public async Task RefreshToken_IsStoredHashed()
    {
        var pair = await LoginAsync();
        var stored = await db.RefreshTokens.SingleAsync();

        Assert.NotEqual(pair.RefreshToken, stored.Hash);
    }
}
```

## Xotira kartasi

```
Access       5–15 daqiqa · JWT · xotirada · bekor qilib BO'LMAYDI
Refresh      7–30 kun · DB'da HASH bilan · DARHOL bekor qilinadi
             faqat /auth/refresh endpoint'iga yuboriladi
ROTATION     har yangilashda eskisi bekor qilinadi
             ⭐ qayta ishlatilgan token = O'G'IRLIK belgisi
             → butun OILA (zanjir) bekor qilinadi
Client       localStorage ❌ (XSS) · access xotirada
             refresh httpOnly + Secure + SameSite=Strict + Path
Bekor qilish parol o'zgarishi · blok · shubhali faollik → hamma sessiya
Sessiyalar   qurilma ro'yxati · uzoqdan chiqarish
Fintech      kritik operatsiyaga STEP-UP authentication (OTP)
```

---

# 8.4 · OAuth2 va OpenID Connect

## Nima va nega

Ikki standart tez-tez chalkashtiriladi:

```
   ┌────────────────────────────┬────────────────────────────────┐
   │  OAuth 2.0                 │  OpenID Connect (OIDC)         │
   ├────────────────────────────┼────────────────────────────────┤
   │  AVTORIZATSIYA             │  AUTENTIFIKATSIYA              │
   │  "Bu ilovaga mening        │  "Bu foydalanuvchi KIM?"       │
   │   ma'lumotimga kirishga    │                                │
   │   ruxsat beraman"          │                                │
   ├────────────────────────────┼────────────────────────────────┤
   │  access_token beradi       │  id_token beradi (JWT)         │
   │  Resurs uchun              │  Shaxs haqida ma'lumot         │
   └────────────────────────────┴────────────────────────────────┘

   OIDC = OAuth 2.0 ustiga qurilgan qatlam
```

## Rollar

```
   ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐   ┌──────────────┐
   │  Resource   │   │   Client     │   │  Authorization  │   │   Resource   │
   │   Owner     │   │  (ilova)     │   │     Server      │   │    Server    │
   │(foydalanuvchi)│  │              │   │  (auth servis)  │   │   (API)      │
   └─────────────┘   └──────────────┘   └─────────────────┘   └──────────────┘
```

## Authorization Code + PKCE

Zamonaviy va yagona tavsiya etiladigan oqim (SPA va mobil uchun ham).

```
   1. Client:  code_verifier  = tasodifiy satr
               code_challenge = SHA256(code_verifier)

   2. Brauzer → Auth Server
      /authorize?client_id=...&redirect_uri=...&code_challenge=...
                &code_challenge_method=S256&state=...&scope=openid profile

   3. Foydalanuvchi login qiladi va ruxsat beradi

   4. Auth Server → Brauzer
      redirect_uri?code=AUTH_CODE&state=...

   5. Client → Auth Server  (BACKEND orqali)
      POST /token { code, code_verifier, client_id }

   6. Auth Server tekshiradi: SHA256(code_verifier) == code_challenge?
      → access_token + id_token + refresh_token

   ⚠ PKCE nega kerak: agar hujumchi AUTH_CODE ni ushlab qolsa ham,
     code_verifier'siz uni tokenga almashtira olmaydi.
```

```
   ⚠ ESKIRGAN OQIMLAR — ISHLATMANG:
   · Implicit flow      — token to'g'ridan-to'g'ri URL'da keladi (log'ga tushadi)
   · Password grant     — ilova foydalanuvchi parolini ko'radi
   → Ikkalasi ham OAuth 2.1 da olib tashlangan
```

## Boshqa grant turlari

```csharp
// Client credentials — servis-servis (foydalanuvchi yo'q)
POST /token
grant_type=client_credentials&client_id=...&client_secret=...&scope=payments:write

// Refresh token
POST /token
grant_type=refresh_token&refresh_token=...
```

## Scope va claim'lar

```
   scope       — nima QILISHGA ruxsat: payments:read, payments:write
   claim       — foydalanuvchi HAQIDA ma'lumot: sub, email, tenant_id

   ⚠ scope ≠ rol
     scope — ilova nima qila oladi (foydalanuvchi bergan ruxsat)
     rol   — foydalanuvchi tizimda kim
     Ikkalasi ham tekshirilishi kerak.
```

```csharp
builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("payments:write", p => p.RequireClaim("scope", "payments:write"));
});
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Implicit flow ishlatish | Token URL'da — log va tarixda qoladi |
| Password grant ishlatish | Ilova parolni ko'radi |
| PKCE'siz authorization code | Code ushlab qolinsa token olinadi |
| `state` ni tekshirmaslik | CSRF hujumi |
| `redirect_uri` ni aniq ro'yxatga olmaslik | Token boshqa saytga yuboriladi |
| `scope` va rolni chalkashtirish | Ruxsat modeli buziladi |

## Fintech konteksti

- **Open Banking / PSD2** — bank API'lari OAuth2 + OIDC ustiga qurilgan; uchinchi
  tomon ilovalari foydalanuvchi ruxsati bilan hisobga kiradi.
- **Servis-servis** aloqada `client_credentials`, lekin mTLS bilan birga
  (8.10) — bu fintech'da odatiy talab.
- **Consent (ruxsat)** yozib boriladi va auditga tushadi: kim, qachon, qaysi
  ilovaga, qanday scope bergan.

## Intervyu savollari

**1. OAuth2 va OIDC farqi nima?**

> OAuth 2.0 — **avtorizatsiya** protokoli: «bu ilovaga mening ma'lumotimga kirishga
> ruxsat beraman». U `access_token` beradi.
>
> OpenID Connect — uning ustiga qurilgan **autentifikatsiya** qatlami: «bu
> foydalanuvchi kim?». U qo'shimcha `id_token` (JWT) beradi.
>
> Ya'ni «Google bilan kirish» — bu OIDC, oddiy OAuth2 emas.

**2. PKCE nima uchun kerak?**

> Authorization code ni ushlab qolish hujumidan himoya.
>
> Client tasodifiy `code_verifier` yaratadi va uning SHA256 hash'ini
> (`code_challenge`) so'rovga qo'shadi. Token olishda esa asl `code_verifier` ni
> yuboradi.
>
> Hujumchi `code` ni ushlab qolsa ham, `code_verifier` ni bilmaydi va uni tokenga
> almashtira olmaydi.
>
> Ilgari u faqat mobil ilovalar uchun tavsiya etilardi, endi **hamma client** uchun
> majburiy.

**3. Qaysi oqimlarni ishlatmaysiz?**

> **Implicit flow** — token to'g'ridan-to'g'ri redirect URL'da keladi, ya'ni brauzer
> tarixida, proxy loglarida va referrer'da qoladi.
>
> **Password grant** — ilova foydalanuvchi parolini ko'radi, bu OAuth'ning butun
> mazmuniga zid.
>
> Ikkalasi ham OAuth 2.1 loyihasida olib tashlangan. Zamonaviy javob — har doim
> **Authorization Code + PKCE**.

## Deliverable

```csharp
[Fact]
public async Task AuthorizationCode_RequiresPkce()
{
    var response = await auth.PostTokenAsync(code, codeVerifier: null);
    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
}

[Fact]
public async Task WrongCodeVerifier_IsRejected()
{
    var (code, _) = await StartAuthorizationAsync(challenge: Sha256("correct"));
    var response = await auth.PostTokenAsync(code, codeVerifier: "wrong");

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
}

[Fact]
public async Task UnregisteredRedirectUri_IsRejected()
{
    var response = await auth.AuthorizeAsync(redirectUri: "https://evil.example/cb");
    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
}

[Fact]
public async Task TokenWithoutScope_CannotWritePayments()
{
    var token = await GetTokenAsync(scope: "payments:read");
    var response = await PostPaymentAsync(token);

    Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
}
```

## Xotira kartasi

```
OAuth2       AVTORIZATSIYA — access_token · "ruxsat beraman"
OIDC         AUTENTIFIKATSIYA — id_token (JWT) · "bu kim?"
             OIDC = OAuth2 ustiga qurilgan qatlam
Oqim         Authorization Code + PKCE — YAGONA tavsiya
PKCE         code_verifier → SHA256 → code_challenge
             code ushlab qolinsa ham verifier'siz token olinmaydi
ESKIRGAN     implicit (token URL'da) · password grant (ilova parolni ko'radi)
Servis-servis client_credentials (+ mTLS)
scope ≠ rol  scope = ilova nima qila oladi · rol = foydalanuvchi kim
Tekshiruv    state (CSRF) · redirect_uri aniq ro'yxatda
```

---

# 8.5 · Avtorizatsiya va resurs egaligi ⭐

## Nima va nega

`[Authorize]` atributi faqat «kirish mumkin» deydi. U **bu resurs shu
foydalanuvchiniki ekanini tekshirmaydi** — va bu OWASP ro'yxatidagi eng ko'p
uchraydigan zaiflik.

```
   ┌──────────────────────────────────────────────────────────────┐
   │  [Authorize]                                                  │
   │  public IActionResult GetPayment(Guid id)                     │
   │      => Ok(_db.Payments.Find(id));                            │
   │                                                                │
   │  ⚠ Har autentifikatsiya qilingan foydalanuvchi ISTALGAN       │
   │    to'lovni ko'ra oladi — faqat ID sini bilsa yetarli         │
   │                                                                │
   │  Bu — IDOR (Insecure Direct Object Reference)                 │
   │       yoki Broken Object Level Authorization                  │
   └──────────────────────────────────────────────────────────────┘
```

## Uch daraja

```
   1. AUTENTIFIKATSIYA   — kim ekani ma'lummi?          [Authorize]
   2. RUXSAT (rol/scope) — bu turdagi amalni qila oladimi?  [Authorize(Policy)]
   3. EGALIK             — AYNAN BU resurs uniki mi?     ← eng ko'p unutiladi
```

## Amaliy yechimlar

```csharp
// ✅ 1-usul: so'rovga egalikni kiritish — eng ishonchli
public async Task<Payment?> GetAsync(Guid paymentId, Guid userId, CancellationToken ct)
    => await _db.Payments
        .Where(p => p.Id == paymentId && p.UserId == userId)   // ← egalik SHARTDA
        .FirstOrDefaultAsync(ct);

// Controller
var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
var payment = await _service.GetAsync(id, userId, ct);
return payment is null ? NotFound() : Ok(payment);   // ⚠ 404, 403 EMAS
```

```csharp
// ✅ 2-usul: resurs asosidagi avtorizatsiya (murakkab qoidalar uchun)
public sealed class PaymentAuthorizationHandler
    : AuthorizationHandler<OperationAuthorizationRequirement, Payment>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext ctx,
        OperationAuthorizationRequirement requirement,
        Payment resource)
    {
        var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (resource.UserId.ToString() == userId) ctx.Succeed(requirement);
        else if (ctx.User.IsInRole("support") && requirement.Name == "Read")
            ctx.Succeed(requirement);          // qo'llab-quvvatlash o'qiy oladi

        return Task.CompletedTask;
    }
}

// Ishlatilishi
var result = await _authorizationService.AuthorizeAsync(User, payment, "Read");
if (!result.Succeeded) return NotFound();
```

## Nega `404`, `403` emas

```
   Foydalanuvchi boshqa birovning to'loviga murojaat qildi:

   403 Forbidden  →  "bu resurs MAVJUD, lekin sizga ruxsat yo'q"
                     → hujumchi ID'larni sanab, qaysilari mavjudligini biladi

   404 Not Found  →  "bunday resurs yo'q"
                     → hech qanday ma'lumot bermaydi  ✅
```

## Policy'lar

```csharp
builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("payments:write", p => p.RequireClaim("scope", "payments:write"));

    o.AddPolicy("large-payment", p => p.RequireAssertion(ctx =>
        ctx.User.IsInRole("senior-operator") ||
        ctx.User.HasClaim("limit_tier", "high")));

    // Barcha endpoint'lar uchun default — ochiq qolib ketmasin
    o.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser().Build();
});
```

> `FallbackPolicy` — muhim himoya: yangi endpoint yozilganda `[Authorize]` yozish
> unutilsa ham u yopiq qoladi.

## Multi-tenancy

```csharp
// Har so'rovda tenant filtri — GLOBAL query filter bilan
modelBuilder.Entity<Payment>().HasQueryFilter(p => p.TenantId == _tenantProvider.Current);

// ⚠ Lekin bu ham yetarli emas:
//   IgnoreQueryFilters() yozilsa yoki raw SQL ishlatilsa filtr chetlab o'tiladi
//   → test bilan tekshirilishi kerak
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Faqat `[Authorize]` — egalik tekshirilmagan | **IDOR** — boshqa foydalanuvchi ma'lumoti |
| `403` qaytarish | Resurs mavjudligi oshkor bo'ladi |
| Egalikni faqat frontend'da tekshirish | API to'g'ridan-to'g'ri chaqiriladi |
| Ketma-ket ID (`1, 2, 3...`) | Sanab chiqish oson — GUID ishlating |
| `FallbackPolicy` yo'q | Yangi endpoint ochiq qolib ketadi |
| Tenant filtrini raw SQL'da unutish | Ma'lumot boshqa tenant'ga sizadi |

## Fintech konteksti

- **Har so'rovda uch tekshiruv**: autentifikatsiya, ruxsat, **egalik**. Uchinchisi
  eng ko'p unutiladi va eng qimmat zaiflik.
- **Qo'llab-quvvatlash xodimi** — o'qiy oladi, lekin **o'zgartira olmaydi**, va
  uning har murojaati audit log'ga tushadi (8.13).
- **Merchant** faqat o'z tranzaksiyalarini ko'radi — tenant filtri majburiy.

## Intervyu savollari

**1. `[Authorize]` yetarlimi?** ⭐

> Yo'q, va bu eng ko'p uchraydigan zaiflik. `[Authorize]` faqat «kim ekani
> ma'lum» deydi.
>
> Uchta daraja bor: autentifikatsiya, ruxsat (rol/scope), va **egalik** — «aynan
> bu resurs shu foydalanuvchiniki mi?».
>
> Uchinchisisiz har autentifikatsiya qilingan foydalanuvchi istalgan to'lovni ko'ra
> oladi — faqat ID sini bilsa yetarli. Bu IDOR.

**2. Egalikni qanday tekshirasiz?**

> Ikki usul. Eng ishonchli — **egalikni so'rov shartiga kiritish**:
> `Where(p => p.Id == id && p.UserId == currentUserId)`. Shunda «tekshirishni
> unutish» mumkin emas.
>
> Murakkab qoidalar uchun (qo'llab-quvvatlash o'qiy oladi, admin o'zgartira oladi)
> — resurs asosidagi avtorizatsiya: `IAuthorizationService.AuthorizeAsync(User,
> resource, "Read")`.

**3. Nega `404` qaytarasiz, `403` emas?** ⭐

> `403` «bu resurs mavjud, lekin sizga ruxsat yo'q» degani — ya'ni hujumchi ID'larni
> sanab chiqib, qaysilari mavjudligini bilib oladi.
>
> `404` hech qanday ma'lumot bermaydi.
>
> Bu «information disclosure» ni oldini oladi va fintech'da muhim: tranzaksiya
> ID'lari mavjudligini bilish ham foydali ma'lumot.

**4. Yangi endpoint yozganda `[Authorize]` unutilsa?**

> `FallbackPolicy` qo'yaman: `RequireAuthenticatedUser()`. Shunda atribut yozilmagan
> har qanday endpoint avtomatik yopiq bo'ladi.
>
> Ochiq endpoint kerak bo'lsa — `[AllowAnonymous]` **ataylab** yoziladi, ya'ni bu
> ongli qaror bo'ladi va kod ko'rib chiqishda ko'rinadi.

## Deliverable

```csharp
public class AuthorizationTests
{
    [Fact]
    public async Task OtherUsersPayment_Returns404()
    {
        var paymentId = await CreatePaymentForAsync(userB);
        var clientA = CreateClientForUser(userA);

        Assert.Equal(HttpStatusCode.NotFound,
                     (await clientA.GetAsync($"/api/v1/payments/{paymentId}")).StatusCode);
    }

    [Fact]
    public async Task SupportRole_CanReadButNotModify()
    {
        var support = CreateClientWithRole("support");
        var paymentId = await CreatePaymentForAsync(userB);

        Assert.Equal(HttpStatusCode.OK,
                     (await support.GetAsync($"/api/v1/payments/{paymentId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
                     (await support.DeleteAsync($"/api/v1/payments/{paymentId}")).StatusCode);
    }

    [Fact]
    public async Task AllEndpoints_RequireAuthenticationByDefault()
    {
        var endpoints = GetAllApiEndpoints();

        foreach (var endpoint in endpoints)
        {
            var metadata = endpoint.Metadata;
            var allowsAnonymous = metadata.GetMetadata<IAllowAnonymous>() is not null;
            var requiresAuth = metadata.GetMetadata<IAuthorizeData>() is not null;

            Assert.True(allowsAnonymous || requiresAuth,
                        $"{endpoint.DisplayName} himoyalanmagan");
        }
    }

    [Fact]
    public async Task TenantFilter_IsolatesData()
    {
        await SeedPaymentsForTenant("bank-1", count: 5);
        await SeedPaymentsForTenant("bank-2", count: 3);

        var client = CreateClientForTenant("bank-1");
        var payments = await client.GetFromJsonAsync<List<PaymentDto>>("/api/v1/payments");

        Assert.Equal(5, payments!.Count);
    }
}
```

## Xotira kartasi

```
Uch daraja   1. autentifikatsiya  2. ruxsat (rol/scope)  3. EGALIK
             uchinchisi eng ko'p UNUTILADI → IDOR zaifligi
[Authorize]  faqat "kim ekani ma'lum" deydi — EGALIKNI tekshirmaydi
Yechim 1     egalikni SO'ROV SHARTIGA: Where(p => p.Id == id && p.UserId == me)
Yechim 2     resurs asosidagi avtorizatsiya (murakkab qoidalar uchun)
404 vs 403   403 = "resurs MAVJUD" → ID'larni sanab chiqish mumkin
             404 = hech qanday ma'lumot bermaydi ✅
FallbackPolicy  RequireAuthenticatedUser — unutilgan endpoint yopiq qolsin
             ochiq kerak bo'lsa [AllowAnonymous] ATAYLAB yoziladi
Multi-tenant global query filter · lekin raw SQL uni chetlab o'tadi → test
Fintech      support o'qiydi, o'zgartirmaydi · har murojaat AUDIT'ga
```

---

# 8.6 · Parol saqlash

## Nima va nega

Parol **hech qachon** ochiq saqlanmaydi. Va oddiy hash ham yetarli emas — bu
mavzudagi asosiy nuans.

```
   ❌ Ochiq matn              → DB kompromis = hamma parol
   ❌ MD5 / SHA-1 / SHA-256   → JUDA TEZ hisoblanadi
                                GPU sekundiga milliardlab urinish qiladi
   ✅ bcrypt / scrypt / Argon2 → ATAYLAB SEKIN, sozlanadigan narx
```

```
   Nega tezlik yomon:

   SHA-256:   ~10 000 000 000 hash/sekund (GPU)
   bcrypt:    ~10 000 hash/sekund
                    │
                    └─► 1 000 000 barobar farq
                        → brute force amalda imkonsiz bo'ladi
```

## Salt va pepper

```
   SALT   — har parol uchun TASODIFIY qiymat, hash bilan birga saqlanadi
            → bir xil parollar har xil hash beradi
            → rainbow table hujumini yo'q qiladi

   PEPPER — butun tizim uchun BITTA sir, DB'dan TASHQARIDA (Key Vault)
            → DB o'g'irlansa ham hash'lar foydasiz
            ⚠ rotatsiya qiyin — barcha hash'ni qayta hisoblash kerak
```

```csharp
// bcrypt — salt avtomatik generatsiya qilinadi va hash ichida saqlanadi
var hash = BCrypt.Net.BCrypt.EnhancedHashPassword(password, workFactor: 12);
// $2a$12$N9qo8uLOickgx2ZMRZoMye...
//  │   │  └─ salt (22 belgi)  └─ hash
//  │   └─ work factor (2^12 iteratsiya)
//  └─ algoritm versiyasi

var isValid = BCrypt.Net.BCrypt.EnhancedVerify(password, hash);
```

## ASP.NET Core Identity

```csharp
builder.Services.AddIdentity<AppUser, IdentityRole>(o =>
{
    o.Password.RequiredLength = 12;
    o.Password.RequireDigit = true;
    o.Password.RequireNonAlphanumeric = true;

    o.Lockout.MaxFailedAccessAttempts = 5;
    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
.AddEntityFrameworkStores<AppDbContext>();
```

> Identity ichida PBKDF2 ishlatiladi va u yaxshi sozlangan. **O'z
> implementatsiyangizni yozmang** — kriptografiyada o'zingiz yozgan kod deyarli
> har doim zaifroq.

## Parol siyosati — zamonaviy yondashuv

```
   ESKI (eskirgan) qoidalar:              YANGI (NIST 800-63B):
   · majburiy murakkablik qoidalari        · UZUNLIK muhimroq (12+)
   · har 90 kunda majburiy o'zgartirish    · majburiy rotatsiya YO'Q
     → foydalanuvchilar Password1,           (u faqat zaifroq parollarga
        Password2 yozadi                      olib keladi)
                                            · SIZIB CHIQQAN parollarni bloklash
                                              (Have I Been Pwned API)
                                            · parol menejerlarini qo'llab-quvvatlash
                                              (paste'ni bloklamang!)
```

## Brute force himoyasi

```csharp
// 1. Lockout — muvaffaqiyatsiz urinishlar
// 2. Rate limiting login endpoint'ida (M7.11)
// 3. ⚠ TIMING ATTACK dan himoya — javob vaqti bir xil bo'lsin

public async Task<Result> LoginAsync(string email, string password)
{
    var user = await _users.FindByEmailAsync(email);

    // ❌ Foydalanuvchi yo'q bo'lsa DARHOL qaytish — javob vaqti farq qiladi
    //    → hujumchi qaysi email ro'yxatdan o'tganini bilib oladi

    // ✅ Har holatda hash tekshiruvi bajariladi
    var hash = user?.PasswordHash ?? _dummyHash;
    var valid = BCrypt.Net.BCrypt.EnhancedVerify(password, hash);

    if (user is null || !valid)
        return Result.Fail("Email yoki parol noto'g'ri");   // ⚠ BIR XIL xabar

    return Result.Ok();
}
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| MD5/SHA ishlatish | GPU bilan tez buziladi |
| Salt'siz hash | Rainbow table hujumi |
| «Email topilmadi» va «parol noto'g'ri» ni ajratish | Email ro'yxatdan o'tganini oshkor qiladi |
| Timing attack'dan himoyalanmaslik | Xuddi shu ma'lumot sizadi |
| Parolni logga yozish | Log kompromis = parol kompromis |
| Paste'ni bloklash | Parol menejerlari ishlamaydi → zaifroq parollar |
| O'z hash algoritmini yozish | Deyarli har doim zaif |

## Fintech konteksti

- **Parol yagona omil bo'lmasin** — 2FA/OTP kritik operatsiyalar uchun majburiy.
- **Parol o'zgarganda** barcha sessiyalar bekor qilinadi (8.3).
- **Muvaffaqiyatsiz urinishlar** audit log'ga tushadi va anomaliya aniqlanganda
  alert beriladi.

## Intervyu savollari

**1. Parolni qanday saqlaysiz?** ⭐

> Hech qachon ochiq holda va hech qachon oddiy hash (MD5, SHA-256) bilan emas —
> ular **juda tez**, GPU sekundiga milliardlab urinish qiladi.
>
> To'g'risi: **bcrypt, scrypt yoki Argon2** — ular ataylab sekin va narxi
> sozlanadi (work factor). Har parol uchun alohida **salt** avtomatik
> generatsiya qilinadi.
>
> .NET'da `ASP.NET Core Identity` buni o'zi to'g'ri qiladi — o'z implementatsiyamni
> yozmayman.

**2. Salt nima uchun kerak?**

> Salt — har parol uchun tasodifiy qiymat, hash bilan birga saqlanadi.
>
> Usiz bir xil parollar bir xil hash beradi va **rainbow table** (oldindan
> hisoblangan hash'lar jadvali) bilan bir vaqtda ko'p parolni ochish mumkin.
>
> Pepper esa butun tizim uchun bitta sir va u **DB'dan tashqarida** saqlanadi —
> shunda DB o'g'irlansa ham hash'lar foydasiz bo'ladi.

**3. Login javobida nima qaytarasiz?**

> Har holatda **bir xil xabar**: «Email yoki parol noto'g'ri».
>
> «Bunday email topilmadi» deb aytsam — hujumchi qaysi emaillar ro'yxatdan
> o'tganini bilib oladi (user enumeration).
>
> Va **timing attack** dan ham himoyalanish kerak: foydalanuvchi topilmasa ham
> soxta hash bilan tekshiruv bajariladi, shunda javob vaqti bir xil qoladi.

**4. Parolni majburiy o'zgartirish kerakmi?**

> Zamonaviy tavsiya (NIST 800-63B) — **yo'q**. Majburiy rotatsiya foydalanuvchilarni
> `Password1`, `Password2` kabi zaif naqshlarga majbur qiladi.
>
> O'rniga: uzunroq parol (12+), **sizib chiqqan parollarni bloklash** (Have I Been
> Pwned kabi bazalar bilan), va 2FA.
>
> Parol faqat **kompromis alomati** bo'lganda majburiy o'zgartiriladi.

## Deliverable

```csharp
public class PasswordTests
{
    [Fact]
    public void SamePassword_ProducesDifferentHashes()
    {
        var a = BCrypt.Net.BCrypt.EnhancedHashPassword("Parol12345!");
        var b = BCrypt.Net.BCrypt.EnhancedHashPassword("Parol12345!");

        Assert.NotEqual(a, b);                      // salt har xil
        Assert.True(BCrypt.Net.BCrypt.EnhancedVerify("Parol12345!", a));
    }

    [Fact]
    public async Task Login_TakesSimilarTime_ForUnknownAndWrongPassword()
    {
        var unknown = await MeasureAsync(() => LoginAsync("yoq@example.uz", "x"));
        var wrong   = await MeasureAsync(() => LoginAsync(existingEmail, "notaqqoriparol"));

        Assert.True(Math.Abs(unknown - wrong) < unknown * 0.5);   // taxminan teng
    }

    [Fact]
    public async Task Login_ReturnsSameMessage_ForBothCases()
    {
        var a = await LoginAsync("yoq@example.uz", "x");
        var b = await LoginAsync(existingEmail, "wrong");

        Assert.Equal(a.Error, b.Error);
    }

    [Fact]
    public async Task PasswordHash_IsNeverLogged()
    {
        await LoginAsync(existingEmail, "Parol12345!");

        foreach (var entry in logCollector.Entries)
            Assert.DoesNotContain("$2a$", entry.Message);
    }
}
```

## Xotira kartasi

```
Hech qachon  ochiq matn · MD5/SHA-1/SHA-256 (JUDA TEZ → GPU buzadi)
To'g'ri      bcrypt / scrypt / Argon2 — ATAYLAB sekin, narxi sozlanadi
SALT         har parol uchun tasodifiy · hash bilan saqlanadi
             → rainbow table hujumini yo'q qiladi
PEPPER       tizim uchun bitta sir · DB'dan TASHQARIDA (Key Vault)
.NET         ASP.NET Core Identity — o'z implementatsiyangizni YOZMANG
Login javobi HAR HOLATDA bir xil xabar (user enumeration'ni oldini oladi)
             timing attack → foydalanuvchi yo'q bo'lsa ham hash tekshiriladi
Siyosat      uzunlik (12+) muhimroq · majburiy rotatsiya YO'Q (NIST)
             sizib chiqqan parollarni bloklash · paste'ni bloklamang
```

---

# 8.7 · OWASP Top 10 .NET kontekstida

## Nima va nega

OWASP Top 10 — eng ko'p uchraydigan zaifliklar ro'yxati. Intervyuda odatda
2-3 tasini chuqurroq so'rashadi. Quyida .NET va fintech konteksti.

```
   A01  Broken Access Control          ← ENG KO'P (8.5)
   A02  Cryptographic Failures         ← shifrlash, TLS (8.10)
   A03  Injection                      ← SQL, komanda, LDAP (8.8)
   A04  Insecure Design                ← arxitektura darajasidagi zaiflik
   A05  Security Misconfiguration      ← default sozlamalar, ortiqcha ma'lumot
   A06  Vulnerable Components          ← eskirgan NuGet paketlar
   A07  Authentication Failures        ← zaif parol, sessiya (8.2, 8.3, 8.6)
   A08  Data Integrity Failures        ← imzosiz yangilanish, deserializatsiya
   A09  Logging & Monitoring Failures  ← hujumni ko'rmaslik (8.13)
   A10  SSRF                           ← server nomidan so'rov (8.8)
```

## A01 — Broken Access Control

Eng ko'p uchraydigani. Batafsil 8.5 da.

```csharp
// Tez tekshiruv ro'yxati:
// · Har endpoint'da EGALIK tekshiriladimi?
// · FallbackPolicy bormi?
// · 404 qaytariladimi (403 emas)?
// · Tenant filtri raw SQL'da ham qo'llanadimi?
// · Frontend'dagi tekshiruv backend'da TAKRORLANADIMI?
```

## A05 — Security Misconfiguration

```csharp
// ❌ Production'da ortiqcha ma'lumot
app.UseDeveloperExceptionPage();          // stack trace
app.UseSwagger();                          // API tuzilmasi (agar himoyalanmagan bo'lsa)

// ✅ Xavfsizlik header'lari
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
    ctx.Response.Headers["Content-Security-Policy"] = "default-src 'self'";
    ctx.Response.Headers.Remove("Server");           // versiya oshkor bo'lmasin
    await next();
});

app.UseHsts();      // HTTP Strict Transport Security
```

## A06 — Zaif komponentlar

```bash
# Zaif paketlarni topish
dotnet list package --vulnerable --include-transitive

# Eskirgan paketlar
dotnet list package --outdated
```

```xml
<!-- CI'da majburiy tekshiruv -->
<PropertyGroup>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  <NuGetAudit>true</NuGetAudit>
  <NuGetAuditMode>all</NuGetAuditMode>
</PropertyGroup>
```

> **Transitive** bog'liqliklar ham tekshirilishi kerak — zaiflik ko'pincha
> bevosita qo'shmagan paketda bo'ladi.

## A08 — Deserializatsiya

```csharp
// ❌ BinaryFormatter — .NET 5+ da o'chirilgan, HECH QACHON ishlatmang
// ❌ TypeNameHandling.All (Newtonsoft) — ixtiyoriy tur yaratish imkonini beradi

// ✅ System.Text.Json — sukut bo'yicha xavfsiz
JsonSerializer.Deserialize<PaymentDto>(json);

// ⚠ Polimorf deserializatsiya kerak bo'lsa — ANIQ ro'yxat bilan
[JsonPolymorphic(TypeDiscriminatorPropertyName = "$type")]
[JsonDerivedType(typeof(CardPayment), "card")]
[JsonDerivedType(typeof(TransferPayment), "transfer")]
public abstract record Payment;
```

## A09 — Logging va monitoring

```
   Nima log qilinishi SHART:
   · muvaffaqiyatli va muvaffaqiyatsiz login
   · ruxsat rad etilishi (403)
   · rol va huquq o'zgarishi
   · pul harakati (8.13)
   · maxfiy ma'lumotga murojaat

   Nima log qilinmasligi SHART:
   · parol, token, karta raqami, CVV
   · to'liq shaxsiy ma'lumot (PII)
```

## Xavfsizlik tekshiruv ro'yxati

```
   ┌─ Kod ko'rib chiqishda ────────────────────────────────────┐
   │  □ Har endpoint'da egalik tekshiriladimi                  │
   │  □ Raw SQL parametrlanganmi                               │
   │  □ Foydalanuvchi kiritgan URL bilan so'rov yuborilyaptimi │
   │  □ Xato javobida ichki ma'lumot bormi                     │
   │  □ Yangi bog'liqlik qo'shildimi (audit)                   │
   │  □ Maxfiy ma'lumot logga tushmayaptimi                    │
   └───────────────────────────────────────────────────────────┘
```

## Intervyu savollari

**1. OWASP Top 10 dan qaysilari sizga eng ko'p tegishli?**

> Backend va fintech kontekstida uchtasi:
>
> **A01 Broken Access Control** — eng ko'p uchraydigani. `[Authorize]` yetarli
> emas, egalik tekshirilishi kerak (8.5).
>
> **A03 Injection** — parametrlangan so'rovlar bilan hal qilinadi, lekin raw SQL
> va dinamik saralashda ehtiyot kerak.
>
> **A09 Logging failures** — hujumni ko'rmaslik. Fintech'da audit log
> regulyator talabi ham.

**2. Zaif paketlarni qanday nazorat qilasiz?**

> `dotnet list package --vulnerable --include-transitive` — va bu **CI'da
> majburiy qadam** bo'lishi kerak, qo'lda emas.
>
> .NET 8 dan `NuGetAudit` o'rnatilgan: build paytida zaif paketlar ogohlantirish
> beradi, va uni `TreatWarningsAsErrors` bilan xatoga aylantirish mumkin.
>
> **Transitive** bog'liqliklarni ham tekshirish muhim — zaiflik ko'pincha
> bevosita qo'shmagan paketda bo'ladi.

**3. Deserializatsiya nega xavfli?**

> Ba'zi serializatorlar JSON ichidagi tur nomiga qarab **ixtiyoriy obyekt
> yaratishi** mumkin. Bu kod bajarilishiga olib kelishi mumkin.
>
> `BinaryFormatter` shu sababdan .NET 5+ da o'chirilgan. Newtonsoft'da
> `TypeNameHandling.All` xuddi shunday xavfli.
>
> `System.Text.Json` sukut bo'yicha xavfsiz. Polimorf deserializatsiya kerak
> bo'lsa — ruxsat etilgan turlarni **aniq ro'yxat** bilan belgilash.

## Deliverable

```csharp
public class SecurityHeadersTests
{
    [Theory]
    [InlineData("X-Content-Type-Options", "nosniff")]
    [InlineData("X-Frame-Options", "DENY")]
    [InlineData("Referrer-Policy", "no-referrer")]
    public async Task SecurityHeaders_ArePresent(string name, string expected)
    {
        var response = await client.GetAsync("/api/v1/health");
        Assert.Equal(expected, response.Headers.GetValues(name).Single());
    }

    [Fact]
    public async Task ServerHeader_IsRemoved()
        => Assert.False((await client.GetAsync("/")).Headers.Contains("Server"));

    [Fact]
    public async Task DeveloperExceptionPage_IsDisabledInProduction()
    {
        var prod = factory.WithEnvironment("Production").CreateClient();
        var body = await (await prod.GetAsync("/debug/throw")).Content.ReadAsStringAsync();

        Assert.DoesNotContain("Stack", body);
    }
}
```

```bash
# CI qadami
dotnet list package --vulnerable --include-transitive 2>&1 | tee audit.txt
if grep -q "has the following vulnerable packages" audit.txt; then exit 1; fi
```

## Xotira kartasi

```
A01 Access Control  ENG KO'P — egalik tekshirilmaydi → IDOR (8.5)
A02 Cryptographic   zaif algoritm, TLS sozlamasi (8.10)
A03 Injection       parametrlangan so'rov (8.8)
A04 Insecure Design arxitektura darajasida — threat modeling kerak
A05 Misconfiguration  developer page, Server header, xavfsizlik header'lari
A06 Vulnerable Components  dotnet list package --vulnerable → CI'DA MAJBURIY
                    transitive bog'liqliklarni ham tekshiring
A07 Auth Failures   zaif parol, sessiya boshqaruvi (8.2, 8.3, 8.6)
A08 Data Integrity  BinaryFormatter ❌ · TypeNameHandling.All ❌
                    System.Text.Json ✅ · polimorfizm ANIQ ro'yxat bilan
A09 Logging         login, 403, rol o'zgarishi LOG QILINADI
                    parol/token/karta LOG QILINMAYDI
A10 SSRF            foydalanuvchi URL'i bilan so'rov (8.8)
```

---

# 8.8 · Injection, XSS, CSRF, SSRF

## SQL injection

```csharp
// ❌ FALOKAT
var sql = $"SELECT * FROM users WHERE email = '{email}'";
await db.Database.ExecuteSqlRawAsync(sql);
// email = "' OR '1'='1' --"        → hamma qator
// email = "'; DROP TABLE users; --" → jadval yo'q bo'ladi

// ✅ Parametrlangan (M6.8)
await db.Users.FromSqlInterpolated($"SELECT * FROM users WHERE email = {email}")
```

```
   ⚠ Jadval va ustun nomini PARAMETRLAB BO'LMAYDI.
     Dinamik saralash kerak bo'lsa — OQ RO'YXAT:

   var allowed = new HashSet<string> { "created_at", "amount_minor" };
   if (!allowed.Contains(sortColumn)) throw new ArgumentException(...);
```

**Boshqa injection turlari:**

```csharp
// Komanda injection
Process.Start("sh", $"-c \"convert {userFile}\"");     // ❌
Process.Start(new ProcessStartInfo("convert") { ArgumentList = { userFile } });  // ✅

// LDAP injection — filtr belgilarini escape qiling
// Log injection — foydalanuvchi kiritgan matn logga qator uzilishi bilan tushmasin
logger.LogInformation("Login {Email}", email);          // ✅ structured
logger.LogInformation($"Login {email}");                // ❌ formatlangan satr
```

## XSS (Cross-Site Scripting)

```
   Hujum: foydalanuvchi kiritgan matn BOSHQA foydalanuvchi brauzerida
          JavaScript sifatida bajariladi

   Turlari:
   · Stored    — DB'ga saqlanadi (izoh, ism)
   · Reflected — so'rov parametridan javobga tushadi
   · DOM-based — client tomonda innerHTML orqali
```

```csharp
// API uchun asosiy himoya — to'g'ri Content-Type
return Ok(dto);                       // application/json — brauzer bajarmaydi

// ❌ HTML qaytarish va foydalanuvchi matnini qo'yish
return Content($"<div>{userInput}</div>", "text/html");

// Razor sukut bo'yicha ESCAPE qiladi
@Model.UserInput                      // ✅ xavfsiz
@Html.Raw(Model.UserInput)            // ❌ ataylab xavfli
```

```
   ⚠ API'da XSS asosan CLIENT muammosi, lekin biz yordam beramiz:
   · Content-Security-Policy header
   · X-Content-Type-Options: nosniff
   · Token'ni localStorage'da EMAS, httpOnly cookie'da saqlash (8.3)
```

## CSRF (Cross-Site Request Forgery)

```
   Hujum:
   1. Foydalanuvchi bank saytiga kirgan (cookie bor)
   2. Evil.com sahifasiga o'tadi
   3. U sahifada yashirin forma:
      <form action="https://bank.uz/transfer" method="POST">
        <input name="to" value="hujumchi"><input name="amount" value="1000000">
      </form>  → avtomatik yuboriladi
   4. Brauzer COOKIE'ni AVTOMATIK qo'shadi → o'tkazma bajariladi
```

```
   ┌──────────────────────────────────────────────────────────────┐
   │  CSRF qachon XAVF SOLADI:                                     │
   │  · autentifikatsiya COOKIE orqali bo'lsa                      │
   │                                                                │
   │  CSRF qachon XAVF SOLMAYDI:                                   │
   │  · Authorization: Bearer header ishlatilsa                     │
   │    (brauzer uni avtomatik QO'SHMAYDI)                          │
   └──────────────────────────────────────────────────────────────┘
```

```csharp
// Cookie ishlatilsa — himoya
builder.Services.AddAntiforgery(o => o.HeaderName = "X-CSRF-TOKEN");

Response.Cookies.Append("session", token, new CookieOptions
{
    HttpOnly = true,
    Secure = true,
    SameSite = SameSiteMode.Strict       // ⚠ ASOSIY himoya
});
```

## SSRF (Server-Side Request Forgery)

```
   Hujum: foydalanuvchi bergan URL bo'yicha SERVER so'rov yuboradi
          → hujumchi ichki tarmoqqa yetadi

   ┌──────────────────────────────────────────────────────────────┐
   │  Xavfli maqsadlar:                                            │
   │  · http://169.254.169.254/  — bulut metadata (kalitlar!)      │
   │  · http://localhost:5432/   — ichki servislar                 │
   │  · http://10.0.0.5/admin    — ichki tarmoq                    │
   │  · file:///etc/passwd       — lokal fayllar                   │
   └──────────────────────────────────────────────────────────────┘
```

```csharp
// ❌ Foydalanuvchi URL'iga so'rov
var response = await http.GetAsync(request.CallbackUrl);

// ✅ Tekshiruv
public async Task<bool> IsSafeAsync(string url, CancellationToken ct)
{
    if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
    if (uri.Scheme != "https") return false;                       // faqat HTTPS

    // ⚠ DNS'ni O'ZIMIZ hal qilamiz — TOCTOU hujumining oldini olish
    var addresses = await Dns.GetHostAddressesAsync(uri.Host, ct);

    foreach (var ip in addresses)
        if (IsPrivate(ip)) return false;                           // ichki tarmoq

    return _allowedHosts.Contains(uri.Host);                       // OQ RO'YXAT
}

static bool IsPrivate(IPAddress ip)
{
    var b = ip.GetAddressBytes();
    return IPAddress.IsLoopback(ip)
        || b[0] == 10
        || (b[0] == 172 && b[1] >= 16 && b[1] <= 31)
        || (b[0] == 192 && b[1] == 168)
        || (b[0] == 169 && b[1] == 254);          // bulut metadata
}
```

```
   ⚠ Faqat URL tekshiruvi YETARLI EMAS:
   · redirect orqali chetlab o'tish → AllowAutoRedirect = false
   · DNS rebinding → IP ni o'zimiz hal qilamiz va o'shanga ulanadi
   · Eng ishonchli: OQ RO'YXAT (whitelist) + alohida tarmoq segmenti
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Satr yopishtirish bilan SQL | SQL injection |
| Ustun nomini parametrlashga urinish | Ishlamaydi — whitelist kerak |
| Formatlangan satr bilan log | Log injection |
| Cookie auth'da `SameSite` qo'ymaslik | CSRF |
| Token'ni `localStorage` da | XSS bilan o'g'irlanadi |
| Foydalanuvchi URL'ini tekshirmasdan chaqirish | SSRF → bulut kalitlari |
| Redirect'ga ruxsat berish | SSRF himoyasi chetlab o'tiladi |

## Fintech konteksti

- **Webhook URL** — merchant bergan URL bo'yicha so'rov yuboramiz. Bu **klassik
  SSRF vektori**: oq ro'yxat, private IP bloklash, redirect o'chirilgan va
  alohida tarmoq segmentidan chiqish kerak.
- **Fayl yuklash** (hujjat, chek) — MIME tekshiruvi, hajm cheklovi, va fayl
  **ijro etilmaydigan** joyda saqlanishi.
- **Bearer token** ishlatilsa CSRF xavfi yo'q — bu SPA uchun qo'shimcha sabab.

## Intervyu savollari

**1. SQL injection'dan qanday himoyalanasiz?** ⭐

> Har doim **parametrlangan so'rov**: EF Core LINQ o'zi qiladi,
> `FromSqlInterpolated` interpolyatsiyani parametrga aylantiradi.
>
> `FromSqlRaw` bilan satr yopishtirish — bu injection.
>
> Muhim cheklov: **jadval va ustun nomini parametrlab bo'lmaydi**. Dinamik saralash
> kerak bo'lsa — oq ro'yxat bilan tekshiraman, boshqa yo'l yo'q.

**2. CSRF qachon xavf soladi?** ⭐

> Faqat autentifikatsiya **cookie** orqali bo'lganda — brauzer cookie'ni boshqa
> saytdan yuborilgan so'rovga ham **avtomatik qo'shadi**.
>
> `Authorization: Bearer` header ishlatilsa CSRF xavfi **yo'q**: brauzer uni
> avtomatik qo'shmaydi, JavaScript uni ataylab qo'yishi kerak.
>
> Cookie ishlatilsa: `SameSite=Strict` asosiy himoya, plus antiforgery token.

**3. SSRF nima va u fintech'da qayerda uchraydi?** ⭐

> Server foydalanuvchi bergan URL bo'yicha so'rov yuborganda — hujumchi shu orqali
> **ichki tarmoqqa** yetadi.
>
> Eng xavfli maqsad — bulut metadata endpoint'i (`169.254.169.254`): u yerdan
> IAM kalitlarini olish mumkin.
>
> Fintech'da klassik vektor — **merchant webhook URL'i**. Himoya: oq ro'yxat,
> private IP diapazonlarini bloklash, `AllowAutoRedirect = false`, va DNS'ni o'zimiz
> hal qilib aynan o'sha IP'ga ulanish (DNS rebinding'ga qarshi).

**4. API'da XSS xavfi bormi?**

> To'g'ridan-to'g'ri kamroq — JSON qaytaruvchi API brauzerda bajarilmaydi.
>
> Lekin biz yordam beramiz: `X-Content-Type-Options: nosniff` (brauzer
> Content-Type'ni «taxmin qilmasin»), CSP header, va **token'ni `localStorage`da
> saqlamaslik** — XSS bo'lgan holatda ham u o'g'irlanmasin.

## Deliverable

```csharp
public class InjectionTests
{
    [Fact]
    public async Task SqlInjectionAttempt_IsHarmless()
    {
        var evil = "' OR '1'='1' --";
        var result = await repository.FindByEmailAsync(evil, default);

        Assert.Null(result);
        Assert.True(await TableExistsAsync("users"));
    }

    [Fact]
    public async Task DynamicSort_RejectsUnknownColumn()
        => await Assert.ThrowsAsync<ArgumentException>(
               () => repository.ListAsync(sortBy: "amount; DROP TABLE payments", default));

    [Theory]
    [InlineData("http://169.254.169.254/latest/meta-data/")]
    [InlineData("http://localhost:5432/")]
    [InlineData("http://10.0.0.5/admin")]
    [InlineData("file:///etc/passwd")]
    public async Task SsrfTargets_AreBlocked(string url)
        => Assert.False(await validator.IsSafeAsync(url, default));

    [Fact]
    public async Task WebhookUrl_MustBeInAllowList()
    {
        var response = await RegisterWebhookAsync("https://evil.example/cb");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task CookieAuth_UsesSameSiteStrict()
    {
        var response = await LoginAsync();
        var cookie = response.Headers.GetValues("Set-Cookie").First();

        Assert.Contains("SameSite=Strict", cookie);
        Assert.Contains("HttpOnly", cookie);
        Assert.Contains("Secure", cookie);
    }
}
```

## Xotira kartasi

```
SQL injection  parametrlangan so'rov · FromSqlInterpolated
               jadval/ustun nomi → OQ RO'YXAT (parametrlab bo'lmaydi)
Log injection  structured logging ("...{Email}", email), formatlangan satr EMAS
XSS            API'da kamroq · nosniff + CSP · token localStorage'da EMAS
CSRF           faqat COOKIE auth'da xavf · Bearer header'da xavf YO'Q
               SameSite=Strict asosiy himoya + antiforgery token
SSRF           foydalanuvchi URL'i → ichki tarmoq
               ⚠ 169.254.169.254 — bulut metadata (IAM kalitlari!)
               himoya: oq ro'yxat · private IP blok · redirect o'chiq
                       DNS'ni o'zimiz hal qilamiz (DNS rebinding)
Fintech        merchant webhook URL = klassik SSRF vektori
```

---

# 8.9 · Sirlarni boshqarish

## Nima va nega

Sir — parol, API kalit, imzo kaliti, ulanish satri. Ular **kodda va
repozitoriyda bo'lmasligi** kerak, va bu shunchaki gigiyena emas: git tarixidan
sirni olib tashlash tarixni qayta yozishni talab qiladi.

```
   ┌──────────────────┬──────────────────────────────────────────┐
   │  Development     │  User Secrets (M7.4)                     │
   │  CI/CD           │  Pipeline secrets (GitHub/GitLab)        │
   │  Production      │  Key Vault · Secrets Manager · K8s Secret│
   └──────────────────┴──────────────────────────────────────────┘

   ❌ appsettings.json · kod · Dockerfile · git · Slack · email
```

## Ierarxiya

```
   ┌─ Eng yaxshi ────────────────────────────────────────────────┐
   │  Sir UMUMAN yo'q: managed identity / IAM rol                 │
   │  → ilova bulut xizmatiga PAROLSIZ ulanadi                    │
   ├─ Yaxshi ────────────────────────────────────────────────────┤
   │  Key Vault + qisqa muddatli dinamik hisob ma'lumotlari       │
   │  (masalan Vault DB credentials — 1 soatlik)                  │
   ├─ Qabul qilinadi ────────────────────────────────────────────┤
   │  Key Vault / K8s Secret + rotatsiya rejasi                   │
   ├─ Yomon ─────────────────────────────────────────────────────┤
   │  Muhit o'zgaruvchisi, qo'lda o'rnatilgan, rotatsiyasiz       │
   ├─ Falokat ───────────────────────────────────────────────────┤
   │  Repozitoriyda                                               │
   └─────────────────────────────────────────────────────────────┘
```

```csharp
// Managed identity — sir yo'q
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{vaultName}.vault.azure.net/"),
    new DefaultAzureCredential());          // parol yo'q, IAM rol ishlatiladi
```

## Kalit rotatsiyasi

```
   Rotatsiya davomida ESKI va YANGI kalit BIR VAQTDA amal qilishi kerak:

   t0   ┌─ kalit A (aktiv) ─────────────────────┐
   t1   ├─ kalit A (aktiv) ─┬─ kalit B (yangi) ─┤  ← ikkalasi ham qabul qilinadi
   t2   │                   └─ kalit B (aktiv) ─┤  ← imzolash B bilan
   t3   └───────────────────── kalit B ─────────┘  ← A o'chiriladi

   JWT uchun bu `kid` (key ID) bilan hal qilinadi (8.2):
   token header'ida qaysi kalit ishlatilgani yozilgan
```

```csharp
// Bir necha kalitni qabul qilish
o.TokenValidationParameters.IssuerSigningKeys = new[] { currentKey, previousKey };
```

## Sirlarni topish (secret scanning)

```bash
# Repozitoriyda sir qidirish
gitleaks detect --source . --verbose

# Pre-commit hook — sir commit bo'lmasin
# CI'da majburiy qadam
```

```
   ⚠ Sir git'ga tushib ketgan bo'lsa:
   1. Uni DARHOL BEKOR QILING (rotatsiya) — bu birinchi qadam
   2. Keyin tarixdan olib tashlash (git filter-repo)
   3. Kim ko'rgan bo'lishi mumkinligini baholang

   ⚠ Faqat commit'ni qaytarish YETARLI EMAS — sir tarixda qoladi
     va fork'larda ham bo'lishi mumkin
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Sirni `appsettings.json` da | Git tarixida abadiy |
| Dockerfile'da `ENV SECRET=...` | Image layer'ida qoladi |
| Sirni logga yozish | Log kompromis = sir kompromis |
| Rotatsiya rejasi yo'q | Kalit yillar davomida o'zgarmaydi |
| Bitta kalit hamma muhit uchun | Dev kompromis = prod kompromis |
| Sir sizganda faqat commit'ni qaytarish | Sir tarixda qoladi |

## Fintech konteksti

- **Provayder kalitlari, imzo kalitlari, DB paroli** — Key Vault yoki HSM.
- **Imzo kalitlari** (ERI, webhook imzosi) — **HSM** yoki Key Vault'da, ular
  eksport qilinmaydigan bo'lishi kerak: imzolash operatsiyasi u yerda bajariladi.
- **Har muhit uchun alohida kalit** — dev, staging, production hech qachon bir xil
  emas.

## Intervyu savollari

**1. Sirlarni qanday boshqarasiz?** ⭐

> Ierarxiya bo'yicha: eng yaxshisi — **sir umuman bo'lmasligi** (managed identity,
> IAM rol), keyin qisqa muddatli dinamik hisob ma'lumotlari, keyin Key Vault.
>
> Development'da User Secrets, CI'da pipeline secrets, production'da Key Vault yoki
> K8s Secret.
>
> `appsettings.json` da hech qachon — u git tarixida abadiy qoladi.

**2. Kalit rotatsiyasini qanday amalga oshirasiz?**

> Asosiy tamoyil: rotatsiya davomida **eski va yangi kalit bir vaqtda** amal
> qilishi kerak, aks holda uzilish bo'ladi.
>
> JWT uchun bu `kid` (key ID) bilan hal qilinadi: token header'ida qaysi kalit
> ishlatilgani yozilgan, server esa bir necha kalitni qabul qiladi.
>
> Bosqichlar: yangi kalit qo'shiladi → ikkalasi qabul qilinadi → imzolash yangisiga
> o'tadi → eskisi o'chiriladi.

**3. Sir git'ga tushib ketdi. Nima qilasiz?**

> Birinchi qadam — **kalitni darhol bekor qilish** (rotatsiya). Tarixdan olib
> tashlash ikkinchi darajali.
>
> Sabab: sir allaqachon ko'rilgan bo'lishi mumkin — repozitoriy fork qilingan,
> CI log'iga tushgan, yoki kimdir klon qilgan. Faqat commit'ni qaytarish hech
> nima yechmaydi.
>
> Keyin: tarixni tozalash (`git filter-repo`), kim ko'rgan bo'lishi mumkinligini
> baholash, va nima uchun secret scanning uni ushlamaganini tekshirish.

## Deliverable

```csharp
[Fact]
public void ConfigurationFiles_ContainNoSecrets()
{
    var patterns = new[] { "password=", "apikey", "secret", "-----BEGIN" };

    foreach (var file in Directory.GetFiles(".", "appsettings*.json"))
    {
        var content = File.ReadAllText(file);
        foreach (var p in patterns)
            Assert.DoesNotContain(p, content, StringComparison.OrdinalIgnoreCase);
    }
}

[Fact]
public void JwtValidation_AcceptsBothCurrentAndPreviousKey()
{
    var oldToken = CreateToken(signingKey: previousKey);
    var newToken = CreateToken(signingKey: currentKey);

    Assert.True(validator.IsValid(oldToken));      // rotatsiya davomida
    Assert.True(validator.IsValid(newToken));
}
```

```yaml
# CI — secret scanning majburiy qadam
- name: Secret scan
  run: gitleaks detect --source . --exit-code 1
```

## Xotira kartasi

```
Ierarxiya    1. sir YO'Q (managed identity / IAM rol)  ← eng yaxshi
             2. qisqa muddatli dinamik credentials
             3. Key Vault / K8s Secret + rotatsiya
             4. muhit o'zgaruvchisi, rotatsiyasiz     ← yomon
             5. repozitoriyda                          ← falokat
Muhitlar     dev → User Secrets · CI → pipeline secrets · prod → Key Vault
Rotatsiya    eski va yangi kalit BIR VAQTDA amal qilsin
             JWT'da `kid` bilan · server bir necha kalitni qabul qiladi
Sizib chiqsa 1. DARHOL bekor qiling (rotatsiya)
             2. keyin tarixni tozalang
             ⚠ commit'ni qaytarish YETARLI EMAS
Scanning     gitleaks — pre-commit hook + CI'da majburiy
Fintech      imzo kalitlari HSM'da — eksport qilinmaydi, imzolash u yerda
             har muhit uchun ALOHIDA kalit
```

---

# 8.10 · Shifrlash va TLS

## Uch holat

```
   ┌─ IN TRANSIT (uzatishda) ────────────────────────────────────┐
   │  TLS 1.2+ · sertifikat · mTLS (ikki tomonlama)              │
   ├─ AT REST (saqlashda) ───────────────────────────────────────┤
   │  DB shifrlash (TDE) · disk shifrlash · ustun darajasida     │
   ├─ IN USE (ishlatishda) ──────────────────────────────────────┤
   │  Confidential computing — kamdan-kam, ixtisoslashgan         │
   └─────────────────────────────────────────────────────────────┘
```

## Simmetrik va asimmetrik

| | Simmetrik (AES) | Asimmetrik (RSA/ECC) |
|---|---|---|
| Kalit | Bitta (maxfiy) | Juftlik (public/private) |
| Tezlik | **Tez** | Sekin (~1000×) |
| Ishlatilishi | Ma'lumot shifrlash | Kalit almashish, **imzo** |

> TLS ikkalasini birlashtiradi: asimmetrik bilan **seans kaliti** almashiladi,
> keyin ma'lumot simmetrik bilan shifrlanadi.

## Amaliy shifrlash

```csharp
// ✅ AES-GCM — shifrlash + AUTENTIFIKATSIYA (tamper aniqlanadi)
public static byte[] Encrypt(byte[] plaintext, byte[] key, byte[] associatedData)
{
    var nonce = RandomNumberGenerator.GetBytes(AesGcm.NonceByteSizes.MaxSize);
    var ciphertext = new byte[plaintext.Length];
    var tag = new byte[AesGcm.TagByteSizes.MaxSize];

    using var aes = new AesGcm(key, tag.Length);
    aes.Encrypt(nonce, plaintext, ciphertext, tag, associatedData);

    return [.. nonce, .. tag, .. ciphertext];
}
```

```
   ⚠ NONCE hech qachon TAKRORLANMASIN — bir xil kalit + bir xil nonce
     GCM'da xavfsizlikni butunlay buzadi.

   ⚠ AES-CBC (autentifikatsiyasiz) ishlatmang — padding oracle hujumi.
     AES-GCM yoki ChaCha20-Poly1305 tanlang.
```

```csharp
// ASP.NET Core Data Protection — cookie, token, vaqtinchalik ma'lumot uchun
builder.Services.AddDataProtection()
    .PersistKeysToAzureBlobStorage(blobUri, credential)   // ⚠ kalitlar saqlanishi
    .ProtectKeysWithAzureKeyVault(keyUri, credential)
    .SetApplicationName("fintech-api");                   // instance'lar aro umumiy
```

> **Muhim:** Data Protection kalitlari sukut bo'yicha **lokal diskda** saqlanadi.
> Kubernetes'da pod qayta ishga tushsa kalitlar yo'qoladi va barcha cookie'lar
> bekor bo'ladi. Ularni umumiy joyga saqlash **majburiy**.

## TLS sozlamalari

```csharp
builder.WebHost.ConfigureKestrel(o =>
{
    o.ConfigureHttpsDefaults(https =>
    {
        https.SslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13;   // 1.0/1.1 YO'Q

        // mTLS — client sertifikati talab qilinadi
        https.ClientCertificateMode = ClientCertificateMode.RequireCertificate;
        https.ClientCertificateValidation = (cert, chain, errors) =>
            errors == SslPolicyErrors.None && IsTrustedPartner(cert.Thumbprint);
    });
});
```

```
   mTLS (mutual TLS) — ikki tomon ham sertifikat ko'rsatadi:
   · bank va provayder integratsiyasida ODATIY talab
   · servis-servis aloqada (zero trust)
   · API key'dan kuchliroq: kalit o'g'irlansa ham sertifikat kerak
```

## Nima shifrlanadi

```
   ┌──────────────────────────┬──────────────────────────────────┐
   │  SHIFRLANADI             │  Hash qilinadi (qaytarilmaydi)   │
   ├──────────────────────────┼──────────────────────────────────┤
   │  Shaxsiy ma'lumot (PII)  │  Parol (8.6)                     │
   │  Karta tokeni            │  Refresh token (8.3)             │
   │  Hujjat fayllari         │  Idempotency kaliti (ixtiyoriy)  │
   │  Bank rekvizitlari       │                                  │
   └──────────────────────────┴──────────────────────────────────┘

   ⚠ Shifrlangan ustun bo'yicha QIDIRIB BO'LMAYDI.
     Kerak bo'lsa: deterministik shifrlash (zaifroq) yoki
     alohida hash ustuni (blind index).
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Nonce/IV ni takrorlash | Shifrlash butunlay buziladi |
| AES-CBC autentifikatsiyasiz | Padding oracle hujumi |
| O'z kripto algoritmini yozish | Deyarli har doim zaif |
| Data Protection kalitlarini lokal diskda | Pod restart → cookie'lar bekor |
| TLS 1.0/1.1 ni yoqib qoldirish | Eskirgan, zaif |
| Sertifikat muddatini kuzatmaslik | Kutilmagan uzilish |
| Kalitni ma'lumot yonida saqlash | Bitta kompromis = hammasi |

## Intervyu savollari

**1. Simmetrik va asimmetrik shifrlash farqi?**

> Simmetrik (AES) — bitta maxfiy kalit, **tez**, ma'lumot shifrlash uchun.
>
> Asimmetrik (RSA/ECC) — public/private juftlik, ~1000 barobar sekin, **kalit
> almashish va imzo** uchun.
>
> TLS ikkalasini birlashtiradi: qo'l siqishda asimmetrik bilan seans kaliti
> almashiladi, keyin ma'lumot simmetrik bilan shifrlanadi.

**2. AES-GCM nima uchun AES-CBC dan yaxshi?**

> GCM — **authenticated encryption**: u ham shifrlaydi, ham butunlikni tekshiradi.
> Ma'lumot o'zgartirilgan bo'lsa deshifrlash xato beradi.
>
> CBC autentifikatsiyasiz — hujumchi shifrmatnni o'zgartirib, xato javoblari
> orqali matnni ochishi mumkin (padding oracle).
>
> Va GCM'da **nonce hech qachon takrorlanmasligi** shart — bu eng muhim shart.

**3. mTLS qachon ishlatasiz?**

> Bank va provayder integratsiyasida — bu odatda **majburiy talab**.
>
> Ikki tomon ham sertifikat ko'rsatadi: server client'ni, client server'ni
> tekshiradi. API key'dan kuchliroq, chunki kalit o'g'irlansa ham sertifikat va
> uning private kaliti kerak.
>
> Servis-servis aloqada ham ishlatiladi (zero trust arxitekturasi).

**4. Data Protection kalitlarini qayerda saqlaysiz?**

> Sukut bo'yicha ular **lokal diskda** saqlanadi — Kubernetes'da bu muammo: pod
> qayta ishga tushsa kalitlar yo'qoladi va barcha cookie hamda antiforgery token
> bekor bo'ladi.
>
> Ularni umumiy joyga (Blob Storage, Redis) saqlash va Key Vault bilan himoyalash
> kerak, hamda `SetApplicationName` bilan bir xil nom berish — aks holda har
> instance o'z kalitini ishlatadi.

## Deliverable

```csharp
public class EncryptionTests
{
    [Fact]
    public void AesGcm_DetectsTampering()
    {
        var encrypted = Crypto.Encrypt(plaintext, key, aad);
        encrypted[^1] ^= 0xFF;                       // bir bayt o'zgartirildi

        Assert.Throws<AuthenticationTagMismatchException>(
            () => Crypto.Decrypt(encrypted, key, aad));
    }

    [Fact]
    public void Encrypt_UsesUniqueNonce()
    {
        var a = Crypto.Encrypt(plaintext, key, aad);
        var b = Crypto.Encrypt(plaintext, key, aad);

        Assert.NotEqual(a, b);                       // bir xil matn — har xil natija
    }

    [Fact]
    public async Task Tls_RejectsOldProtocols()
    {
        using var handler = new HttpClientHandler { SslProtocols = SslProtocols.Tls11 };
        using var client = new HttpClient(handler);

        await Assert.ThrowsAnyAsync<Exception>(() => client.GetAsync(baseUrl));
    }

    [Fact]
    public async Task DataProtection_SurvivesRestart()
    {
        var token = protector.Protect("payload");
        await RestartApplicationAsync();

        Assert.Equal("payload", newProtector.Unprotect(token));   // kalitlar umumiy
    }
}
```

## Xotira kartasi

```
Uch holat    in transit (TLS) · at rest (TDE/ustun) · in use (confidential)
Simmetrik    AES — bitta kalit, TEZ, ma'lumot uchun
Asimmetrik   RSA/ECC — juftlik, sekin, KALIT ALMASHISH va IMZO uchun
TLS          ikkalasini birlashtiradi (handshake asimmetrik, ma'lumot simmetrik)
AES-GCM      shifrlash + AUTENTIFIKATSIYA · tamper aniqlanadi
             ⚠ NONCE hech qachon takrorlanmasin
AES-CBC      autentifikatsiyasiz → padding oracle → ISHLATMANG
mTLS         ikki tomon sertifikat · bank-provayder integratsiyasida ODATIY
TLS versiya  1.2+ · 1.0/1.1 o'chirilsin
DataProtection  kalitlar LOKAL diskda (default) → K8s'da yo'qoladi
             → Blob/Redis + Key Vault + SetApplicationName
Shifrlangan ustun  bo'yicha QIDIRIB BO'LMAYDI → blind index kerak
```

---

# 8.11 · Elektron imzo (ERI) va X.509

## Nima va nega

Elektron imzo uch narsani kafolatlaydi: **kim imzoladi** (autentiklik), **hujjat
o'zgarmagan** (butunlik), va **imzolaganini rad eta olmaydi**
(non-repudiation).

```
   IMZOLASH                                TEKSHIRISH
   ┌────────────────┐                     ┌────────────────┐
   │  Hujjat        │                     │  Hujjat        │
   │      │         │                     │      │         │
   │      ▼         │                     │      ▼         │
   │  SHA-256 hash  │                     │  SHA-256 hash  │
   │      │         │                     │      │         │
   │      ▼         │                     │      ▼         │
   │  PRIVATE kalit │                     │  PUBLIC kalit  │
   │  bilan shifrlash│                     │  bilan ochish  │
   │      │         │                     │      │         │
   │      ▼         │                     │      ▼         │
   │  IMZO          │  ────────────────►  │  hash'lar teng?│
   └────────────────┘                     └────────────────┘

   ⚠ Shifrlashning TESKARISI: imzoda PRIVATE bilan yopiladi,
     PUBLIC bilan ochiladi.
```

## X.509 sertifikat

```
   Sertifikat — public kalitni SHAXSGA bog'laydigan hujjat,
   uni ishonchli markaz (CA) imzolagan.

   ┌──────────────────────────────────────────────────────┐
   │  Subject      CN=Abdusalomov Bahriddin, ...          │
   │  Issuer       CN=UZ Root CA                          │
   │  Valid        2026-01-01 .. 2027-01-01               │
   │  Public key   RSA 2048                               │
   │  Thumbprint   A1:B2:C3:...                           │
   │  Extensions   KeyUsage: DigitalSignature             │
   │  CA IMZOSI    <...>                                  │
   └──────────────────────────────────────────────────────┘

   Ishonch zanjiri:
   Root CA ──imzolagan──► Intermediate CA ──imzolagan──► Foydalanuvchi sertifikati
```

## .NET'da imzolash va tekshirish

```csharp
// Imzolash
public byte[] Sign(byte[] data, X509Certificate2 certificate)
{
    using var rsa = certificate.GetRSAPrivateKey()
        ?? throw new InvalidOperationException("Private kalit yo'q");

    return rsa.SignData(data, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
}

// Tekshirish
public bool Verify(byte[] data, byte[] signature, X509Certificate2 certificate)
{
    using var rsa = certificate.GetRSAPublicKey()!;
    return rsa.VerifyData(data, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
}
```

## Sertifikatni to'liq tekshirish

Imzoning matematik to'g'riligi **yetarli emas**.

```csharp
public bool IsCertificateValid(X509Certificate2 cert)
{
    using var chain = new X509Chain();

    chain.ChainPolicy.RevocationMode = X509RevocationMode.Online;      // CRL/OCSP
    chain.ChainPolicy.RevocationFlag = X509RevocationFlag.EntireChain;
    chain.ChainPolicy.VerificationFlags = X509VerificationFlags.NoFlag;

    if (!chain.Build(cert)) return false;

    // Ishonchli root'ga bog'lanadimi
    var root = chain.ChainElements[^1].Certificate;
    return _trustedRootThumbprints.Contains(root.Thumbprint);
}
```

```
   TEKSHIRUV RO'YXATI:
   □ Imzo matematik to'g'ri
   □ Sertifikat muddati o'tmagan
   □ Ishonchli CA ga zanjir bilan bog'lanadi
   □ BEKOR QILINMAGAN (CRL yoki OCSP)
   □ KeyUsage imzolashga ruxsat beradi
   □ Subject kutilgan shaxsga mos
   □ ⚠ Imzo VAQTI sertifikat amal qilgan davrga to'g'ri keladi
```

## Timestamp — nega kerak

```
   Muammo: sertifikat muddati tugagach, imzo ham shubhali bo'ladi
           «Bu imzo sertifikat amal qilgan paytda qo'yilganmi?»

   Yechim: TSA (Time Stamping Authority) — ishonchli vaqt belgisi
           imzo ustiga qo'yiladi

   → Uzoq muddat saqlanadigan hujjatlar uchun MAJBURIY
   → Fintech'da shartnomalar va yirik operatsiyalar uchun
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Faqat matematik imzoni tekshirish | Bekor qilingan sertifikat qabul qilinadi |
| Bekor qilinganini tekshirmaslik (CRL/OCSP) | O'g'irlangan kalit ishlaydi |
| Muddat tekshirmaslik | Eskirgan sertifikat |
| Private kalitni fayl sifatida saqlash | O'g'irlanishi mumkin — HSM kerak |
| Timestamp'siz uzoq muddatli imzo | Keyinchalik tekshirib bo'lmaydi |
| Imzo va hujjatni alohida saqlash | Bog'lanish yo'qoladi |

## Fintech konteksti

- **ERI (O'zbekistonda E-IMZO)** — bank tizimlarida kundalik talab: hujjat
  imzolash, so'rovni tasdiqlash.
- **Private kalit HSM'da** — u eksport qilinmaydi, imzolash operatsiyasi HSM
  ichida bajariladi.
- **Imzolangan hujjat va imzo birga arxivlanadi** — audit va nizo hal qilish
  uchun, saqlash muddati regulyator talabiga ko'ra (5–10 yil).

## Intervyu savollari

**1. Elektron imzo qanday ishlaydi?**

> Hujjatning hash'i hisoblanadi, keyin u **private kalit** bilan shifrlanadi — bu
> imzo.
>
> Tekshirishda **public kalit** bilan ochiladi va hujjatning yangi hash'i bilan
> solishtiriladi. Teng bo'lsa: hujjat o'zgarmagan va aynan shu kalit egasi
> imzolagan.
>
> Diqqat: bu shifrlashning **teskarisi** — u yerda public bilan yopiladi, private
> bilan ochiladi.

**2. Imzoni tekshirishda nimalarni ko'rasiz?** ⭐

> Matematik to'g'rilik **yetarli emas**. To'liq ro'yxat:
> - imzo to'g'ri;
> - sertifikat muddati o'tmagan;
> - ishonchli CA ga zanjir bilan bog'lanadi;
> - **bekor qilinmagan** — CRL yoki OCSP orqali;
> - `KeyUsage` imzolashga ruxsat beradi;
> - subject kutilgan shaxsga mos.
>
> Bekor qilinganini tekshirmaslik eng ko'p uchraydigan kamchilik: kalit o'g'irlangan
> va bekor qilingan bo'lsa ham imzo «to'g'ri» ko'rinadi.

**3. Timestamp nega kerak?**

> Sertifikat muddati tugagach «bu imzo amal qilish davrida qo'yilganmi?» degan
> savol paydo bo'ladi.
>
> TSA (Time Stamping Authority) ishonchli vaqt belgisini imzo ustiga qo'yadi va
> shu savolga javob beradi.
>
> Uzoq muddat saqlanadigan hujjatlar — shartnomalar, yirik operatsiyalar — uchun
> majburiy.

## Deliverable

```csharp
public class SignatureTests
{
    [Fact]
    public void ValidSignature_IsVerified()
    {
        var signature = signer.Sign(document, certificate);
        Assert.True(signer.Verify(document, signature, certificate));
    }

    [Fact]
    public void TamperedDocument_FailsVerification()
    {
        var signature = signer.Sign(document, certificate);
        document[0] ^= 0xFF;

        Assert.False(signer.Verify(document, signature, certificate));
    }

    [Fact]
    public void ExpiredCertificate_IsRejected()
        => Assert.False(validator.IsCertificateValid(expiredCertificate));

    [Fact]
    public void RevokedCertificate_IsRejected()
        => Assert.False(validator.IsCertificateValid(revokedCertificate));

    [Fact]
    public void UntrustedRoot_IsRejected()
        => Assert.False(validator.IsCertificateValid(selfSignedCertificate));
}
```

## Xotira kartasi

```
Kafolat      autentiklik + butunlik + non-repudiation
Mexanizm     hash → PRIVATE kalit bilan shifrlash = IMZO
             tekshirish: PUBLIC bilan ochish + hash solishtirish
             ⚠ shifrlashning TESKARISI
X.509        public kalitni shaxsga bog'laydi · CA imzolagan
             zanjir: Root CA → Intermediate → foydalanuvchi
Tekshiruv    imzo · muddat · ZANJIR · BEKOR QILINGANMI (CRL/OCSP)
             KeyUsage · subject · imzo VAQTI
             ⚠ faqat matematik tekshiruv YETARLI EMAS
Timestamp    TSA — sertifikat muddati tugagach ham imzo isbotlanadi
             uzoq muddatli hujjatlar uchun MAJBURIY
Fintech      E-IMZO/ERI — banklarda kundalik
             private kalit HSM'da, EKSPORT QILINMAYDI
             imzo + hujjat birga arxivlanadi (5–10 yil)
```

---

# 8.12 · PCI DSS, tokenizatsiya, PII

## PCI DSS — asosiy g'oya

```
   PCI DSS — karta ma'lumotlari bilan ishlash standarti.

   ┌──────────────────────────────────────────────────────────────┐
   │  ENG MUHIM QOIDA:                                             │
   │  Karta ma'lumotini SAQLAMASLIK — eng arzon va xavfsiz yo'l   │
   │                                                                │
   │  Saqlasangiz → PCI DSS auditi, shifrlash, segmentatsiya,      │
   │                 kirish nazorati, yillik sertifikatsiya         │
   │  Saqlamasangiz → talablar keskin kamayadi (SAQ A)             │
   └──────────────────────────────────────────────────────────────┘
```

```
   Karta ma'lumotlari:

   PAN (karta raqami)     — saqlash mumkin, LEKIN shifrlangan holda
   Karta egasi ismi       — saqlash mumkin
   Amal qilish muddati    — saqlash mumkin
   ─────────────────────────────────────────────────────────
   CVV/CVC                — ❌ HECH QACHON, hatto shifrlangan holda ham
   PIN                    — ❌ HECH QACHON
   Magnit yo'lak / chip   — ❌ HECH QACHON
```

## Tokenizatsiya

```
   Karta raqami o'rniga TOKEN saqlanadi:

   ┌──────────────┐   PAN    ┌──────────────────┐
   │  Bizning     │ ───────► │  To'lov          │
   │  tizim       │          │  provayderi      │
   │              │ ◄─────── │  (PCI-sertifikat)│
   │  tok_1a2b3c  │  TOKEN   │                  │
   └──────────────┘          │  PAN ↔ token     │
        │                    │  bog'lanishi     │
        │ keyingi to'lovlar  │  u yerda         │
        └───────────────────►└──────────────────┘

   ✅ Bizda PAN yo'q → PCI DSS doirasi keskin kichrayadi
   ✅ DB o'g'irlansa ham token foydasiz (faqat bizning provayder bilan ishlaydi)
```

```csharp
public sealed class SavedCard
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }

    public string ProviderToken { get; init; } = null!;   // tok_1a2b3c
    public string MaskedPan { get; init; } = null!;       // 8600 **** **** 1234
    public string Brand { get; init; } = null!;           // UzCard / Humo / Visa
    public int ExpiryMonth { get; init; }
    public int ExpiryYear { get; init; }

    // ⚠ PAN, CVV — MAYDON SIFATIDA HAM YO'Q
}
```

## Maskalash

```csharp
public static string MaskPan(string pan)
{
    if (pan.Length < 10) return new string('*', pan.Length);
    return $"{pan[..6]}{new string('*', pan.Length - 10)}{pan[^4..]}";
    // 860012******1234  — birinchi 6 (BIN) va oxirgi 4 ruxsat etiladi
}
```

```csharp
// Log'da avtomatik maskalash — Serilog destructuring
public sealed class SensitiveDataDestructuringPolicy : IDestructuringPolicy
{
    private static readonly string[] Sensitive =
        ["pan", "cardNumber", "cvv", "password", "token", "pinfl", "passport"];

    public bool TryDestructure(object value, ILogEventPropertyValueFactory factory,
                               out LogEventPropertyValue? result)
    {
        // maxfiy maydonlarni "***" bilan almashtirish
    }
}
```

## PII (shaxsiy ma'lumot)

```
   O'zbekistonda: PINFL, pasport, telefon, manzil, tug'ilgan sana

   ┌──────────────────────────────────────────────────────────────┐
   │  · Minimal yig'ish — kerak bo'lmaganini so'ramang            │
   │  · Shifrlangan holda saqlash (8.10)                          │
   │  · Kirish nazorati va AUDIT (kim ko'rdi — 8.13)              │
   │  · Saqlash muddati va o'chirish siyosati                     │
   │  · Log'da MASKALANGAN                                         │
   │  · Test ma'lumotida HAQIQIY PII bo'lmasin                    │
   └──────────────────────────────────────────────────────────────┘
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| CVV ni saqlash | PCI DSS to'g'ridan-to'g'ri buzilishi |
| PAN ni logga yozish | Log tizimi PCI doirasiga tushadi |
| Maskalashni faqat UI'da qilish | API va log'da ochiq qoladi |
| Production ma'lumotini test muhitida ishlatish | PII sizishi |
| Tokenni PAN kabi himoyalamaslik | Token ham qiymatga ega |
| PII saqlash muddatini belgilamaslik | Regulyator talabini buzish |

## Fintech konteksti

- **Bizning tizim PAN saqlamaydi** — bu asosiy arxitektura qarori va u PCI DSS
  yukini keskin kamaytiradi.
- **Provayder tokenlari** — ular ham maxfiy: shifrlangan holda saqlanadi va kirish
  cheklangan.
- **Test ma'lumoti** — sintetik generatsiya qilinadi, production'dan nusxa
  olinmaydi (yoki anonimlashtiriladi).

## Intervyu savollari

**1. Karta ma'lumotini qanday saqlaysiz?** ⭐

> **Umuman saqlamayman.** Bu eng arzon va xavfsiz yechim.
>
> To'lov provayderi PAN'ni qabul qiladi va bizga **token** qaytaradi. Biz tokenni,
> maskalangan raqamni (`8600 **** **** 1234`) va brendni saqlaymiz.
>
> Natija: DB o'g'irlansa ham token foydasiz, va PCI DSS doirasi keskin kichrayadi —
> to'liq audit o'rniga soddalashtirilgan anketa.
>
> Va **CVV hech qachon saqlanmaydi** — hatto shifrlangan holda ham, bu standartning
> qat'iy taqiqi.

**2. Maskalashni qayerda qilasiz?**

> Barcha qatlamlarda: DB'da faqat maskalangan versiya saqlanadi, API javobida
> maskalangan qaytadi, va **log'da avtomatik maskalanadi**.
>
> Faqat UI'da maskalash noto'g'ri — API to'g'ridan-to'g'ri chaqirilsa yoki log
> ko'rilsa ochiq ma'lumot chiqadi.
>
> Log uchun men destructuring policy yozaman: maxfiy nomdagi maydonlar avtomatik
> `***` bilan almashtiriladi.

**3. Test muhitida haqiqiy ma'lumot ishlatasizmi?**

> Yo'q. Test ma'lumoti **sintetik generatsiya** qilinadi.
>
> Production'dan nusxa olish kerak bo'lsa — anonimlashtirish majburiy: PINFL,
> pasport, telefon, ism o'zgartiriladi, karta tokenlari almashtiriladi.
>
> Sabab: test muhitida kirish nazorati zaifroq va u ko'pincha PCI doirasidan
> tashqarida — u yerdagi PII sizishi real xavf.

## Deliverable

```csharp
public class CardDataTests
{
    [Fact]
    public void SavedCard_HasNoPanOrCvvProperties()
    {
        var properties = typeof(SavedCard).GetProperties().Select(p => p.Name.ToLower());

        foreach (var forbidden in new[] { "pan", "cardnumber", "cvv", "cvc", "pin" })
            Assert.DoesNotContain(forbidden, properties);
    }

    [Theory]
    [InlineData("8600123456781234", "860012******1234")]
    [InlineData("4111111111111111", "411111******1111")]
    public void MaskPan_KeepsOnlyBinAndLast4(string pan, string expected)
        => Assert.Equal(expected, Masking.MaskPan(pan));

    [Fact]
    public async Task Logs_NeverContainPan()
    {
        await ProcessPaymentAsync(pan: "8600123456781234");

        foreach (var entry in logCollector.Entries)
            Assert.DoesNotContain("8600123456781234", entry.Message);
    }

    [Fact]
    public async Task ApiResponse_ReturnsMaskedPanOnly()
    {
        var card = await client.GetFromJsonAsync<CardDto>($"/api/v1/cards/{id}");

        Assert.Matches(@"^\d{6}\*+\d{4}$", card!.MaskedPan);
    }
}
```

## Xotira kartasi

```
ASOSIY QOIDA  karta ma'lumotini SAQLAMASLIK — eng arzon va xavfsiz
Saqlash mumkin  PAN (shifrlangan) · ism · muddat
HECH QACHON     CVV/CVC · PIN · magnit yo'lak — hatto shifrlangan holda ham
Tokenizatsiya   provayder PAN ↔ token bog'lanishini saqlaydi
                bizda faqat token + maskalangan raqam + brend
                → PCI doirasi keskin kichrayadi
Maskalash       birinchi 6 (BIN) + oxirgi 4 · 860012******1234
                BARCHA qatlamda: DB, API, LOG (faqat UI'da EMAS)
PII             PINFL, pasport, telefon, manzil
                minimal yig'ish · shifrlash · audit · saqlash muddati
Test muhiti     SINTETIK ma'lumot · production nusxasi ANONIMLASHTIRILADI
```

---

# 8.13 · Audit log ⭐

## Nima va nega

Audit log — **kim, qachon, nima qilgani**. Fintech'da bu texnik qulaylik emas,
**regulyator talabi** va nizolarni hal qilishning yagona asosi.

```
   ┌──────────────────────────┬──────────────────────────────────┐
   │  Application log         │  Audit log                       │
   ├──────────────────────────┼──────────────────────────────────┤
   │  Debug uchun             │  HUQUQIY dalil                   │
   │  O'chirilishi mumkin     │  O'CHIRILMAYDI (append-only)     │
   │  Saqlash: kunlar/haftalar│  Saqlash: 5–10 yil               │
   │  Format erkin            │  Struktura QAT'IY                │
   │  Dasturchi o'qiydi       │  Auditor, huquqshunos o'qiydi    │
   └──────────────────────────┴──────────────────────────────────┘

   ⚠ Bularni ARALASHTIRMANG — turli talablar, turli saqlash.
```

## Nima yozilishi shart

```
   ┌─ Autentifikatsiya ──────────────────────────────────────────┐
   │  · muvaffaqiyatli va muvaffaqiyatsiz login                   │
   │  · chiqish, sessiya bekor qilinishi                          │
   │  · parol o'zgarishi, 2FA yoqilishi/o'chirilishi              │
   ├─ Avtorizatsiya ─────────────────────────────────────────────┤
   │  · ruxsat rad etilishi (403)                                 │
   │  · rol va huquq o'zgarishi                                   │
   ├─ Pul harakati ──────────────────────────────────────────────┤
   │  · har tranzaksiya (kim, qancha, qayerdan, qayerga)          │
   │  · limit o'zgarishi                                          │
   │  · qo'lda tuzatish (reversal) — MAJBURIY                     │
   ├─ Maxfiy ma'lumot ───────────────────────────────────────────┤
   │  · PII ga murojaat (KIM ko'rdi)                              │
   │  · hisobot eksporti                                          │
   ├─ Konfiguratsiya ────────────────────────────────────────────┤
   │  · komissiya stavkasi, limit, provayder sozlamalari          │
   └─────────────────────────────────────────────────────────────┘
```

## Sxema

```sql
CREATE TABLE audit_log (
    id            bigserial PRIMARY KEY,

    occurred_at   timestamptz NOT NULL DEFAULT now(),
    actor_id      uuid,                       -- kim (NULL = tizim)
    actor_type    text NOT NULL,              -- user | system | support | api
    impersonated_by uuid,                     -- ⚠ support foydalanuvchi nomidan ishlasa

    action        text NOT NULL,              -- payment.created, role.changed
    resource_type text NOT NULL,              -- payment, account, user
    resource_id   text,

    old_value     jsonb,                      -- o'zgarishdan oldin
    new_value     jsonb,                      -- keyin

    ip_address    inet,
    user_agent    text,
    correlation_id text NOT NULL,             -- so'rov bilan bog'lash (M7.2)
    result        text NOT NULL               -- success | denied | failed
);

CREATE INDEX ix_audit_actor    ON audit_log (actor_id, occurred_at DESC);
CREATE INDEX ix_audit_resource ON audit_log (resource_type, resource_id, occurred_at DESC);

-- ⚠ APPEND-ONLY majburlanadi (M5.11)
REVOKE UPDATE, DELETE ON audit_log FROM app_user;
```

## Yozish

```csharp
// EF Core interceptor — avtomatik va unutilmaydi
public sealed class AuditInterceptor(ICurrentUser user, IClock clock) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct)
    {
        var context = eventData.Context!;

        foreach (var entry in context.ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted))
                continue;

            context.Set<AuditEntry>().Add(new AuditEntry
            {
                OccurredAt    = clock.GetUtcNow(),
                ActorId       = user.Id,
                ActorType     = user.Type,
                ImpersonatedBy = user.ImpersonatedBy,
                Action        = $"{entry.Entity.GetType().Name}.{entry.State}".ToLower(),
                ResourceType  = entry.Entity.GetType().Name,
                ResourceId    = entry.Property("Id").CurrentValue?.ToString(),
                OldValue      = Serialize(entry.OriginalValues),
                NewValue      = Serialize(entry.CurrentValues),
                CorrelationId = user.CorrelationId,
                Result        = "success"
            });
        }

        return base.SavingChangesAsync(eventData, result, ct);
    }
}
```

> **Muhim:** audit yozuvi biznes o'zgarishi bilan **bitta tranzaksiyada** yoziladi
> (M6.4). Alohida bo'lsa — biri yozilib, ikkinchisi yozilmasligi mumkin.

## Impersonation

```
   Qo'llab-quvvatlash xodimi foydalanuvchi nomidan ishlasa:

   actor_id        = foydalanuvchi ID
   impersonated_by = xodim ID          ← ⚠ BU MAYDON MAJBURIY

   Aks holda audit log'da «foydalanuvchi o'zi qildi» deb ko'rinadi
   va nizoda haqiqatni aniqlab bo'lmaydi.
```

## Butunlikni himoya qilish

```
   Audit log'ni o'zgartirib bo'lmasligini KAFOLATLASH:

   1. DB darajasida: REVOKE UPDATE, DELETE + trigger (M5.11)
   2. Alohida saqlash: audit uchun alohida DB yoki WORM storage
   3. Zanjirli hash: har yozuv oldingisining hash'ini o'z ichiga oladi
      → o'rtadan yozuv o'chirilsa zanjir uziladi
   4. Tashqi arxiv: davriy eksport, o'zgartirib bo'lmaydigan saqlashga
```

```csharp
// Zanjirli hash — soddalashtirilgan
entry.PreviousHash = lastEntry?.Hash;
entry.Hash = Convert.ToHexString(SHA256.HashData(
    Encoding.UTF8.GetBytes($"{entry.PreviousHash}{entry.OccurredAt:O}{entry.Action}{entry.ResourceId}")));
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Audit va application log'ni aralashtirish | Saqlash muddati va format mos kelmaydi |
| Audit yozuvini alohida tranzaksiyada | Biri yozilib, ikkinchisi yo'q |
| `UPDATE`/`DELETE` ga ruxsat qoldirish | Audit dalil sifatida qiymatini yo'qotadi |
| Impersonation'ni yozmaslik | Kim qilgani noaniq |
| Audit log'ga PII yozish | Maxfiylik buzilishi |
| Qo'lda yozish (interceptor'siz) | Unutiladi |
| Saqlash muddatini belgilamaslik | Regulyator talabini buzish yoki ortiqcha xarajat |

## Fintech konteksti

- **Nizo hal qilish** — «men bu to'lovni qilmadim» degan da'voga javob audit
  log'dan chiqadi: IP, qurilma, vaqt, correlation ID.
- **Regulyator tekshiruvi** — audit log so'raladi va uning **o'zgartirilmaganini
  isbotlash** kerak bo'lishi mumkin.
- **Reversal (teskari yozuv)** — kim va nima sababdan qilgani albatta yoziladi
  (M5.10 dagi append-only ledger bilan birga).

## Intervyu savollari

**1. Audit log va oddiy log farqi nima?** ⭐

> Oddiy log — **debug uchun**: format erkin, kunlar davomida saqlanadi,
> o'chirilishi mumkin.
>
> Audit log — **huquqiy dalil**: qat'iy struktura, append-only, 5–10 yil
> saqlanadi, va uni auditor hamda huquqshunos o'qiydi.
>
> Ularni aralashtirish xato: turli saqlash muddati, turli kirish nazorati, turli
> talablar.

**2. Audit log'ga nima yoziladi?**

> Besh kategoriya: autentifikatsiya (login, parol o'zgarishi), avtorizatsiya (403,
> rol o'zgarishi), **pul harakati**, maxfiy ma'lumotga murojaat, va konfiguratsiya
> o'zgarishi.
>
> Har yozuvda: kim (`actor_id`), qachon, nima qildi, qaysi resurs, eski va yangi
> qiymat, IP, correlation ID va natija.
>
> Va **`impersonated_by`** — qo'llab-quvvatlash xodimi foydalanuvchi nomidan
> ishlaganda. Bu maydonsiz nizoda haqiqatni aniqlab bo'lmaydi.

**3. Audit yozuvini qanday yozasiz?**

> EF Core **interceptor** bilan — avtomatik va unutilmaydi. Qo'lda yozilsa
> ertami-kechmi bir joyda tushib qoladi.
>
> Va u biznes o'zgarishi bilan **bitta tranzaksiyada** yoziladi: alohida bo'lsa
> biri yozilib ikkinchisi yozilmasligi mumkin va audit haqiqatga mos kelmaydi.

**4. Audit log'ning o'zgartirilmaganini qanday kafolatlaysiz?**

> To'rt qatlam:
> 1. DB darajasida `REVOKE UPDATE, DELETE` va trigger bilan bloklash.
> 2. Alohida DB yoki WORM (write-once) saqlash.
> 3. **Zanjirli hash** — har yozuv oldingisining hash'ini o'z ichiga oladi, o'rtadan
>    yozuv o'chirilsa zanjir uziladi.
> 4. Tashqi arxivga davriy eksport.
>
> Regulyator tekshiruvida aynan shu isbot so'ralishi mumkin.

## Deliverable

```csharp
public class AuditLogTests
{
    [Fact]
    public async Task PaymentCreation_WritesAuditEntry()
    {
        var payment = await CreatePaymentAsync();

        var entry = await db.AuditLog.SingleAsync(a => a.ResourceId == payment.Id.ToString());
        Assert.Equal("payment.added", entry.Action);
        Assert.Equal(currentUserId, entry.ActorId);
        Assert.NotNull(entry.CorrelationId);
    }

    [Fact]
    public async Task AuditEntry_IsWrittenInSameTransaction()
    {
        await Assert.ThrowsAsync<DbUpdateException>(() => CreateInvalidPaymentAsync());

        Assert.Empty(await db.AuditLog.ToListAsync());     // rollback bilan birga
    }

    [Fact]
    public async Task AuditLog_CannotBeModified()
    {
        var entry = await CreateAuditEntryAsync();

        await Assert.ThrowsAsync<PostgresException>(() =>
            RawSqlAsync($"UPDATE audit_log SET action = 'x' WHERE id = {entry.Id}"));
        await Assert.ThrowsAsync<PostgresException>(() =>
            RawSqlAsync($"DELETE FROM audit_log WHERE id = {entry.Id}"));
    }

    [Fact]
    public async Task Impersonation_IsRecorded()
    {
        var support = CreateClientForSupportImpersonating(userId);
        await support.PostAsJsonAsync("/api/v1/payments", request);

        var entry = await db.AuditLog.OrderByDescending(a => a.OccurredAt).FirstAsync();
        Assert.Equal(userId, entry.ActorId);
        Assert.Equal(supportUserId, entry.ImpersonatedBy);
    }

    [Fact]
    public async Task HashChain_DetectsDeletedEntry()
    {
        await CreateAuditEntriesAsync(count: 10);
        await ForceDeleteEntryAsync(index: 5);          // administrator huquqi bilan

        Assert.False(await auditVerifier.VerifyChainAsync());
    }
}
```

## Xotira kartasi

```
Farq         app log = debug, kunlar, o'chiriladi
             AUDIT log = HUQUQIY DALIL, 5–10 yil, APPEND-ONLY
Nima yoziladi  auth (login/parol) · authz (403, rol) · PUL HARAKATI
             · PII ga murojaat · konfiguratsiya o'zgarishi
Har yozuvda  kim · qachon · nima · resurs · eski/yangi qiymat
             IP · correlation ID · natija · IMPERSONATED_BY
Yozish       EF interceptor — avtomatik, unutilmaydi
             biznes o'zgarishi bilan BITTA TRANZAKSIYADA
Butunlik     REVOKE UPDATE/DELETE · alohida DB/WORM
             ZANJIRLI HASH · tashqi arxiv
Impersonation  support foydalanuvchi nomidan ishlasa — MAJBURIY maydon
             aks holda nizoda haqiqat aniqlanmaydi
```

---

## M8 — yakuniy tekshiruv ro'yxati

Kodsiz, og'zaki javob bera olsangiz — modul yopilgan:

- [ ] Autentifikatsiya va avtorizatsiya farqi, `401` va `403`
- [ ] Foydalanuvchi ID sini qayerdan olasiz va nega
- [ ] JWT payload'iga nima qo'yish mumkin emas va nega
- [ ] JWT'ni qanday bekor qilasiz
- [ ] HS256 va RS256 — qaysi biri qachon
- [ ] `ClockSkew` nima va nega o'zgartiriladi
- [ ] Refresh token rotation va o'g'irlikni aniqlash
- [ ] Token'ni client tomonda qayerda saqlash kerak
- [ ] PKCE nima uchun kerak
- [ ] `[Authorize]` nega yetarli emas — IDOR
- [ ] Nega `404`, `403` emas
- [ ] Parolni qanday saqlaysiz, salt va pepper
- [ ] Login javobida user enumeration'ni qanday oldini olasiz
- [ ] CSRF qachon xavf soladi
- [ ] SSRF nima va fintech'da qayerda uchraydi
- [ ] Sirlarni boshqarish ierarxiyasi
- [ ] Sir git'ga tushsa birinchi qadam
- [ ] AES-GCM nega AES-CBC dan yaxshi
- [ ] mTLS qachon ishlatiladi
- [ ] Imzoni tekshirishda nimalarni ko'rasiz
- [ ] Karta ma'lumotini qanday saqlaysiz
- [ ] Audit log va oddiy log farqi

**Deliverable'lar:**

- [ ] `AuthenticationTests` — 401 vs 403, token'dagi ID ishlatilishi
- [ ] `JwtTests` — eskirgan/boshqa audience/o'zgartirilgan token, maxfiy claim yo'qligi
- [ ] `RefreshTokenTests` — rotation, qayta ishlatilishda oila bekor qilinishi
- [ ] `AuthorizationTests` — 404, support huquqlari, `FallbackPolicy`, tenant izolyatsiyasi
- [ ] `PasswordTests` — salt, timing, bir xil xabar
- [ ] `SecurityHeadersTests` — header'lar, `Server` olib tashlanishi
- [ ] `InjectionTests` — SQL injection, SSRF maqsadlari, cookie sozlamalari
- [ ] `EncryptionTests` — tamper aniqlash, nonce noyobligi, TLS versiyasi
- [ ] `SignatureTests` — bekor qilingan/eskirgan sertifikat
- [ ] `CardDataTests` — PAN/CVV maydoni yo'qligi, maskalash, log
- [ ] `AuditLogTests` — bitta tranzaksiya, o'zgartirib bo'lmaslik, impersonation
