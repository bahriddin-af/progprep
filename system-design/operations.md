# M13 · DevOps va kuzatuv

Kod yozish yarim ish. Fintech'da qolgan yarmi — uni **ishonchli yetkazish** va
**nima bo'layotganini ko'rish**.

| # | Mavzu | P |
|---|---|---|
| [13.1](#131--git-va-branching) | Git va branching | P1 |
| [13.2](#132--ci-pipeline) | CI pipeline | P1 |
| [13.3](#133--docker) | Docker | P1 |
| [13.4](#134--deploy-strategiyalari-) | Deploy strategiyalari ⭐ | P1 |
| [13.5](#135--structured-logging-) | Structured logging ⭐ | P0 |
| [13.6](#136--metrikalar) | Metrikalar | P1 |
| [13.7](#137--distributed-tracing) | Distributed tracing | P1 |
| [13.8](#138--alerting) | Alerting | P1 |
| [13.9](#139--health-check-) | Health check ⭐ | P1 |
| [13.10](#1310--incident-jarayoni-) | Incident jarayoni ⭐ | P1 |
| [13.11](#1311--feature-flag) | Feature flag | P2 |

---

# 13.1 · Git va branching

## Strategiyalar

```
   ┌─ TRUNK-BASED (tavsiya) ─────────────────────────────────────┐
   │  main ──●──●──●──●──●──●──►                                  │
   │          \  /   \  /                                          │
   │           ●●     ●●        qisqa umrli branch (1–2 kun)      │
   │  ✅ tez integratsiya · kam konflikt · CD uchun mos            │
   │  ⚠ feature flag kerak (13.11) · qattiq CI talab qiladi        │
   ├─ GIT FLOW ─────────────────────────────────────────────────┤
   │  main / develop / feature / release / hotfix                 │
   │  ✅ reliz sikllari aniq                                        │
   │  ❌ murakkab · uzoq branch → katta merge · CD uchun noqulay   │
   └─────────────────────────────────────────────────────────────┘

   → Fintech'da: trunk-based + feature flag, reliz nazorat ostida
```

## Commit va PR

```
   Conventional Commits:
   feat(payments): add idempotency key support
   fix(ledger): correct rounding in fee calculation
   refactor(db): extract account repository
   test(concurrency): add lost update reproduction

   → CHANGELOG avtomatik generatsiya qilinadi
   → semantik versiyalash mumkin bo'ladi
```

```
   PR qoidalari:
   · KICHIK (400 qatordan kam — review sifati keskin tushadi)
   · bitta maqsad
   · tavsifda: nima, NEGA, qanday test qilingan
   · CI yashil bo'lishi shart
```

## Merge strategiyalari

```
   ┌──────────────┬───────────────────────────────────────────────┐
   │  Merge commit│  tarix to'liq · lekin shovqinli               │
   │  Squash      │  bitta commit · TOZA tarix ← ko'p ishlatiladi │
   │  Rebase      │  chiziqli tarix · ⚠ ochiq branch'da xavfli    │
   └──────────────┴───────────────────────────────────────────────┘

   ⚠ Rebase FAQAT lokal/shaxsiy branch'da.
     Boshqalar ishlatayotgan branch'ni rebase qilish tarixni buzadi.
```

## Fintech uchun

```
   □ main branch HIMOYALANGAN (force push taqiqlangan)
   □ PR uchun kamida 1 (yaxshisi 2) tasdiq
   □ CI yashil bo'lmasa merge YO'Q
   □ Migratsiya o'zgarishlari alohida e'tibor (M5.13)
   □ Commit imzolash (signed commits) — kim yozganini isbotlash
   □ Sirlar uchun pre-commit hook (gitleaks — M8.9)
```

## Intervyu savollari

**1. Qaysi branching strategiyasini tanlaysiz?**

> **Trunk-based** — qisqa umrli branch'lar (1–2 kun) va tez-tez integratsiya.
> Katta merge konfliktlari bo'lmaydi va CD uchun tabiiy.
>
> Narxi: tugallanmagan funksiya uchun **feature flag** kerak (13.11) va CI qattiq
> bo'lishi shart.
>
> Git Flow reliz sikllari aniq bo'lgan joyda ishlaydi, lekin uzoq branch'lar katta
> merge va integratsiya og'rig'ini keltiradi.

**2. PR qanchalik katta bo'lishi kerak?**

> Iloji boricha **kichik** — 400 qatordan oshsa review sifati keskin tushadi:
> odam diqqati tarqaladi va u faqat yuzaki qaraydi.
>
> Katta o'zgarish kerak bo'lsa uni bosqichlarga bo'laman: avval refaktoring, keyin
> yangi mantiq, keyin migratsiya.

## Xotira kartasi

```
Trunk-based  qisqa branch (1–2 kun) · tez integratsiya · CD uchun mos
             ⚠ feature flag kerak · qattiq CI
Git Flow     reliz sikllari aniq · murakkab · uzoq branch = katta merge
Commit       Conventional Commits → CHANGELOG avtomatik
PR           KICHIK (<400 qator) · bitta maqsad · nima+NEGA+test
Merge        squash (toza tarix) · rebase FAQAT shaxsiy branch'da
Fintech      main himoyalangan · 2 tasdiq · CI yashil · signed commits
             pre-commit: gitleaks
```

---

# 13.2 · CI pipeline

## Bosqichlar

```
   ┌──────────────────────────────────────────────────────────────┐
   │  1. BUILD           warning'lar XATO sifatida                 │
   │  2. UNIT TESTS      tez (soniyalar) — har commit'da           │
   │  3. STATIC ANALYSIS analyzer, format, murakkablik             │
   │  4. INTEGRATION     Testcontainers (M12.6) — PR'da            │
   │  5. SECURITY SCAN   zaif paketlar (M8.7), sirlar (M8.9)       │
   │  6. ARCH TESTS      NetArchTest (M9.4)                        │
   │  7. PACKAGE         Docker image qurish                       │
   │  8. DEPLOY          faqat main'dan, migratsiya ALOHIDA        │
   └──────────────────────────────────────────────────────────────┘

   ⚠ Tez bosqichlar OLDINDA — tez fail bo'lish (fail fast)
```

```yaml
name: ci
on: [push, pull_request]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '9.0.x' }

      - name: Restore
        run: dotnet restore --locked-mode        # ⚠ lock fayl bilan

      - name: Build
        run: dotnet build --no-restore -c Release -warnaserror

      - name: Unit tests
        run: dotnet test --no-build -c Release --filter Category!=Integration

      - name: Vulnerable packages
        run: |
          dotnet list package --vulnerable --include-transitive 2>&1 | tee audit.txt
          ! grep -q "has the following vulnerable packages" audit.txt

      - name: Secret scan
        run: gitleaks detect --source . --exit-code 1

      - name: Integration tests
        run: dotnet test --no-build -c Release --filter Category=Integration

      - name: Coverage
        run: dotnet test --collect:"XPlat Code Coverage"
```

## Muhim tafsilotlar

```
   □ dotnet restore --locked-mode
     → packages.lock.json bilan takrorlanadigan build
     → "menda ishlaydi" muammosini yo'q qiladi

   □ -warnaserror
     → warning to'planib ketmasin

   □ Testlar PARALLEL job'larda
     → unit va integration alohida, vaqt tejaladi

   □ Kesh: NuGet paketlar, Docker layer'lar
     → pipeline vaqti sezilarli qisqaradi
```

## Migratsiya

```
   ⚠ Migratsiya CI'da AVTOMATIK qo'llanmaydi (M5.13):

   ✅ To'g'ri:
   1. CI migratsiya skriptini generatsiya qiladi (--idempotent)
   2. Skript artefakt sifatida saqlanadi
   3. Deploy paytida ALOHIDA qadam sifatida qo'llanadi
   4. Kerak bo'lsa DBA tasdiqlaydi
```

## Intervyu savollari

**1. CI pipeline'da qanday bosqichlar bo'ladi?**

> Tez bosqichlar oldinda — **fail fast**: build (warning'lar xato sifatida), unit
> testlar, statik tahlil.
>
> Keyin sekinroqlari: integration testlar (Testcontainers), xavfsizlik skanerlari
> (zaif paketlar, sirlar), arxitektura testlari.
>
> Va oxirida package hamda deploy — deploy faqat `main`'dan, migratsiya esa
> **alohida qadam**.

**2. Migratsiyani CI avtomatik qo'llasinmi?**

> Yo'q (M5.13). CI faqat `--idempotent` skript generatsiya qiladi va uni artefakt
> sifatida saqlaydi.
>
> Qo'llash deploy paytida alohida qadam sifatida bajariladi, kerak bo'lsa
> tasdiqlash bilan.
>
> Sabab: migratsiya qaytarish qiyin operatsiya va u ilova deploy'idan mustaqil
> nazorat qilinishi kerak.

## Xotira kartasi

```
Bosqichlar   build (-warnaserror) → unit → static → integration
             → security scan → arch tests → package → deploy
Fail fast    tez bosqichlar OLDINDA
Muhim        --locked-mode (takrorlanadigan build)
             zaif paket va sir skanerlari MAJBURIY
             unit va integration ALOHIDA job (parallel)
Migratsiya   CI AVTOMATIK QO'LLAMAYDI → --idempotent skript artefakt
             deploy paytida alohida qadam
```

---

# 13.3 · Docker

## Multi-stage build

```dockerfile
# ── Build bosqichi ────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# ⚠ Avval faqat proyekt fayllari — layer keshi uchun
COPY ["src/Fintech.Api/Fintech.Api.csproj", "src/Fintech.Api/"]
COPY ["src/Fintech.Domain/Fintech.Domain.csproj", "src/Fintech.Domain/"]
RUN dotnet restore "src/Fintech.Api/Fintech.Api.csproj" --locked-mode

# Keyin qolgan kod — u tez-tez o'zgaradi
COPY . .
RUN dotnet publish "src/Fintech.Api/Fintech.Api.csproj" \
    -c Release -o /app/publish --no-restore

# ── Runtime bosqichi ─────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

# ⚠ Root EMAS foydalanuvchi
RUN adduser -D -u 1000 appuser
USER appuser

COPY --from=build --chown=appuser:appuser /app/publish .

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_gcServer=1

EXPOSE 8080
ENTRYPOINT ["dotnet", "Fintech.Api.dll"]
```

```
   Layer keshi tartibi:
   1. proyekt fayllari + restore   ← kam o'zgaradi, keshdan olinadi
   2. qolgan kod + publish          ← tez-tez o'zgaradi

   → teskari bo'lsa har build'da restore qayta bajariladi (2–3 daqiqa)
```

## Image hajmi

```
   ┌──────────────────────────┬────────────────────────────────────┐
   │  sdk:9.0                 │  ~800 MB   (build uchun)           │
   │  aspnet:9.0              │  ~220 MB                           │
   │  aspnet:9.0-alpine       │  ~110 MB   ← odatiy tanlov         │
   │  Native AOT + chiseled   │  ~30 MB    (M2.1, cheklovlar bor)  │
   └──────────────────────────┴────────────────────────────────────┘
```

## Konteynerda .NET

```
   ⚠ CPU va xotira limitlari MAJBURIY:

   Limit qo'yilmasa:
   · Server GC node'ning BARCHA yadrolarini ko'radi (M2.2)
     → haddan tashqari ko'p heap yaratadi
   · thread pool noto'g'ri hisoblanadi
   · konteyner OOM-kill bo'lishi mumkin
```

```yaml
resources:
  requests: { cpu: "250m", memory: "256Mi" }
  limits:   { cpu: "1000m", memory: "512Mi" }
```

```
   ⚠ .NET konteyner limitlarini o'zi aniqlaydi (cgroups),
     lekin faqat limit QO'YILGAN bo'lsa.
```

## Xavfsizlik

```
   □ Root emas foydalanuvchi (USER appuser)
   □ Read-only fayl tizimi (imkon bo'lsa)
   □ Alpine yoki chiseled — kamroq hujum yuzasi
   □ Image skanerlash (Trivy, Snyk) — CI'da
   □ Sirlar ENV'da EMAS — Key Vault yoki K8s Secret (M8.9)
   □ Image tag'i — SHA, `latest` EMAS
```

## Intervyu savollari

**1. Multi-stage build nima beradi?**

> Build vositalari (SDK, ~800 MB) yakuniy image'ga tushmaydi — faqat runtime va
> publish natijasi qoladi.
>
> Natijada image 800 MB o'rniga ~110 MB (alpine bilan). Bu tez deploy, kam trafik
> va kichikroq hujum yuzasi demak.
>
> Va **layer tartibi** muhim: avval proyekt fayllari va `restore`, keyin qolgan
> kod — shunda kod o'zgarganda `restore` keshdan olinadi.

**2. Konteynerda .NET uchun nima muhim?**

> **CPU va xotira limitlari majburiy**.
>
> Limit qo'yilmasa Server GC node'ning barcha yadrolarini ko'radi va har yadro
> uchun heap yaratadi (M2.2) — 512 MB limitli konteynerda bu OOM-kill'ga olib
> keladi.
>
> .NET cgroups orqali limitlarni o'zi aniqlaydi, lekin faqat ular qo'yilgan bo'lsa.

## Xotira kartasi

```
Multi-stage  SDK build bosqichida qoladi → image 800 MB → ~110 MB
Layer tartibi  1. csproj + restore (kam o'zgaradi)  2. kod + publish
             teskari bo'lsa har build'da restore qayta bajariladi
Base image   aspnet:9.0-alpine (~110 MB) · chiseled + AOT (~30 MB)
Limitlar     CPU va xotira MAJBURIY — aks holda GC barcha yadroni ko'radi
             → haddan tashqari heap → OOM-kill
Xavfsizlik   root EMAS · read-only FS · image skanerlash
             sirlar ENV'da EMAS · tag SHA, latest emas
```

---

# 13.4 · Deploy strategiyalari ⭐

## Turlari

```
   ┌─ ROLLING (default) ─────────────────────────────────────────┐
   │  Pod'lar birin-ketin almashtiriladi                          │
   │  ✅ qo'shimcha resurs kam · sodda                             │
   │  ⚠ ESKI va YANGI versiya BIR VAQTDA ishlaydi (M5.13)         │
   ├─ BLUE-GREEN ───────────────────────────────────────────────┤
   │  Ikki to'liq muhit, trafik bir zumda almashadi               │
   │  ✅ tez rollback · aralashuv yo'q                             │
   │  ❌ 2× resurs · DB umumiy bo'lsa muammo baribir qoladi        │
   ├─ CANARY ───────────────────────────────────────────────────┤
   │  Trafikning 5% → 25% → 50% → 100%                            │
   │  ✅ xato KAM foydalanuvchiga ta'sir qiladi                    │
   │  ✅ metrikalar bilan avtomatik to'xtatish                     │
   │  ❌ murakkab · versiyalar mosligi kerak                       │
   └─────────────────────────────────────────────────────────────┘

   → Fintech'da: rolling + feature flag, kritik o'zgarishlar uchun canary
```

## Rolling deploy — asosiy nuans

```
   ⚠ Deploy davomida ESKI va YANGI kod BIR VAQTDA ishlaydi:

   ┌──────────────┐   ┌──────────────┐
   │  Pod (eski)  │   │  Pod (yangi) │
   └───────┬──────┘   └──────┬───────┘
           └────────┬─────────┘
                    ▼
              ┌──────────┐
              │    DB    │  ← sxema IKKALASINI ham qo'llab-quvvatlashi kerak
              └──────────┘

   → Migratsiya EXPAND → MIGRATE → CONTRACT (M5.13)
   → API o'zgarishi orqaga mos bo'lishi kerak (M7.6)
   → Xabar formati ham (M9.7)
```

## Graceful shutdown

```yaml
spec:
  terminationGracePeriodSeconds: 60        # ⚠ eng uzun operatsiyadan uzunroq
  containers:
    - name: api
      lifecycle:
        preStop:
          exec:
            command: ["sleep", "5"]        # endpoint'dan chiqishga vaqt
      readinessProbe:
        httpGet: { path: /health/ready, port: 8080 }
        periodSeconds: 5
      livenessProbe:
        httpGet: { path: /health/live, port: 8080 }
        periodSeconds: 10
        failureThreshold: 3
```

```
   To'xtatish ketma-ketligi (M7.10):
   1. Pod "Terminating" → Service endpoint'laridan CHIQARILADI
   2. preStop sleep — hali kelayotgan so'rovlar tugasin
   3. SIGTERM → ApplicationStopping → BackgroundService stoppingToken
   4. terminationGracePeriodSeconds kutiladi
   5. SIGKILL
```

## Rollback

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Kod rollback    — oson (oldingi image tag'i)                 │
   │  Migratsiya rollback — QIYIN yoki IMKONSIZ                    │
   │                                                                │
   │  → shuning uchun EXPAND/CONTRACT naqshi (M5.13):               │
   │    migratsiya orqaga mos bo'lsa, kod rollback yetarli          │
   │                                                                │
   │  ⚠ Amalda "forward fix" ko'pincha afzalroq:                    │
   │    yangi tuzatish relizi, rollback emas                        │
   └──────────────────────────────────────────────────────────────┘
```

## Intervyu savollari

**1. Rolling deploy'da qanday tuzoq bor?** ⭐

> Deploy davomida **eski va yangi kod bir vaqtda ishlaydi** — bu bir necha daqiqa
> davom etadi.
>
> Demak DB sxemasi, API shartnomasi va xabar formati **ikkala versiyani ham**
> qo'llab-quvvatlashi kerak.
>
> Shuning uchun migratsiya expand → migrate → contract naqshi bilan uch relizga
> bo'linadi (M5.13), va API o'zgarishlari orqaga mos bo'ladi.

**2. Graceful shutdown'ni qanday sozlaysiz?**

> Kubernetes pod'ni to'xtatishda: avval Service endpoint'laridan chiqaradi, keyin
> `SIGTERM` yuboradi va `terminationGracePeriodSeconds` kutadi.
>
> Muhim: bu muddat **eng uzun operatsiyadan uzunroq** bo'lishi kerak — aks holda
> boshlangan to'lov yarim qoladi.
>
> Va `preStop` bilan qisqa kutish qo'shiladi: endpoint'dan chiqish tarqalishi
> uchun vaqt kerak.
>
> Ilova tomonida: `stoppingToken` — yangi ish olmaslik, boshlangan ish esa
> `CancellationToken.None` bilan tugatiladi (M3.5, M7.10).

**3. Rollback qanday ishlaydi?**

> Kod rollback oson — oldingi image tag'iga qaytish.
>
> Migratsiya rollback esa **qiyin yoki imkonsiz**. Shuning uchun expand/contract
> naqshi kerak: migratsiya orqaga mos bo'lsa, kod rollback yetarli.
>
> Amalda ko'pincha **forward fix** afzalroq: rollback o'rniga tez tuzatish relizi
> chiqariladi, chunki rollback ham o'z xatarlariga ega.

## Xotira kartasi

```
Rolling      pod'lar birin-ketin · ⚠ ESKI va YANGI BIR VAQTDA ishlaydi
             → sxema, API, xabar formati IKKALASINI qo'llab-quvvatlasin
Blue-green   ikki muhit · tez rollback · 2× resurs
Canary       5% → 25% → 100% · metrikalar bilan avtomatik to'xtatish
Shutdown     endpoint'dan chiqarish → preStop → SIGTERM → grace period → SIGKILL
             grace period > ENG UZUN operatsiya
Rollback     kod oson · MIGRATSIYA qiyin → expand/contract (M5.13)
             amalda FORWARD FIX ko'pincha afzalroq
```

---

# 13.5 · Structured logging ⭐

## Nima va nega

```csharp
// ❌ Qidirib bo'lmaydi, filtrlab bo'lmaydi
logger.LogInformation($"To'lov {id} bajarildi, summa {amount}");

// ✅ Maydonlar indekslanadi va filtrlanadi
logger.LogInformation("To'lov bajarildi {PaymentId} {AmountMinor} {Currency}",
                      id, amount.Minor, amount.Currency.Code);
```

```
   Structured log JSON sifatida chiqadi:
   {
     "Timestamp": "2026-08-04T09:30:00Z",
     "Level": "Information",
     "MessageTemplate": "To'lov bajarildi {PaymentId} {AmountMinor} {Currency}",
     "PaymentId": "a1b2...",
     "AmountMinor": 8000000,
     "Currency": "UZS",
     "CorrelationId": "00-4bf92f...",
     "UserId": "u-42"
   }

   → "PaymentId = a1b2..." bo'yicha QIDIRISH mumkin
   → "AmountMinor > 1000000" bo'yicha FILTRLASH mumkin
```

## Scope va correlation ID

```csharp
// Middleware'da (M7.2)
using (logger.BeginScope(new Dictionary<string, object>
{
    ["CorrelationId"] = correlationId,
    ["UserId"] = userId,
    ["TenantId"] = tenantId
}))
{
    await next(ctx);      // ⚠ ichkaridagi HAMMA log shu maydonlarni oladi
}
```

```
   → bitta so'rovning barcha loglarini CorrelationId bo'yicha yig'ish mumkin
   → servislar aro ham (header orqali uzatiladi)
```

## Log darajalari

```
   ┌──────────────┬───────────────────────────────────────────────┐
   │  Trace       │  juda batafsil — production'da O'CHIQ         │
   │  Debug       │  diagnostika — production'da odatda o'chiq    │
   │  Information │  BIZNES hodisalari: to'lov, login, holat      │
   │  Warning     │  kutilgan muammo: 4xx, retry, degradatsiya    │
   │  Error       │  BIZNING bug: 5xx, ishlanmagan exception      │
   │  Critical    │  tizim ishlamayapti                           │
   └──────────────┴───────────────────────────────────────────────┘

   ⚠ Biznes rad javobi (422) — Information yoki Warning, ERROR EMAS (M7.7)
     aks holda "xato foizi" dashboard'i buziladi
```

## Nima log qilinmaydi

```
   ❌ HECH QACHON:
   · parol, token, refresh token
   · to'liq karta raqami, CVV (M8.12)
   · shaxsiy ma'lumot to'liq holda (PINFL, pasport)
   · shifrlash kalitlari

   ✅ O'rniga:
   · maskalangan: 860012******1234
   · identifikator: userId, paymentId
   · hash yoki oxirgi 4 raqam
```

```csharp
// Avtomatik maskalash — Serilog destructuring policy
public sealed class MaskSensitivePolicy : IDestructuringPolicy
{
    private static readonly string[] Sensitive =
        ["password", "token", "pan", "cardNumber", "cvv", "pinfl", "secret"];
    // maxfiy nomdagi maydonlar "***" bilan almashtiriladi
}
```

## Performans

```csharp
// ⚠ String interpolatsiya — log darajasi o'chiq bo'lsa ham HISOBLANADI
logger.LogDebug($"Katta obyekt: {JsonSerializer.Serialize(obj)}");   // ❌

// ✅ Shablon — faqat kerak bo'lganda hisoblanadi
logger.LogDebug("Katta obyekt: {@Object}", obj);

// ✅ Issiq yo'lda — LoggerMessage source generator (M1.11)
[LoggerMessage(Level = LogLevel.Information,
               Message = "To'lov bajarildi {PaymentId} {AmountMinor}")]
private partial void LogPaymentCompleted(Guid paymentId, long amountMinor);
```

## Intervyu savollari

**1. Structured logging nima beradi?** ⭐

> Log **qidirilishi va filtrlanishi** mumkin bo'ladi. Formatlangan satr bilan
> «to'lov 8 000 000 dan katta bo'lganlarni ko'rsat» degan so'rovni bajarib
> bo'lmaydi.
>
> Shablon va parametrlar alohida saqlanadi: `LogInformation("... {PaymentId}",
> id)` — bu JSON'da indekslanadigan maydonga aylanadi.
>
> Va **scope** bilan correlation ID barcha loglarga avtomatik qo'shiladi — bitta
> so'rovning butun yo'lini kuzatish mumkin.

**2. Nimani log qilmaysiz?**

> Parol, token, to'liq karta raqami, CVV, shaxsiy ma'lumot va kalitlar (M8.12).
>
> O'rniga: maskalangan qiymat (`860012******1234`), identifikator, yoki oxirgi 4
> raqam.
>
> Bu qo'lda emas, **avtomatik** bo'lishi kerak: destructuring policy maxfiy nomdagi
> maydonlarni o'zi maskalaydi — aks holda bir joyda unutiladi.

**3. Biznes rad javobini qanday log qilasiz?**

> `Information` yoki `Warning` darajasida — **`Error` emas** (M7.7).
>
> «Mablag' yetarli emas» — bu tizimning to'g'ri ishlashi, bug emas. Uni `Error`
> qilsam, dashboard'dagi xato foizi buziladi va real muammolar shovqin ichida
> yo'qoladi.

## Xotira kartasi

```
Structured   shablon + parametrlar → JSON maydonlari → QIDIRISH va FILTRLASH
             $"..." interpolatsiya ❌ · "...{Field}", value ✅
Scope        BeginScope → correlation ID barcha loglarga avtomatik
             servislar aro header orqali uzatiladi
Darajalar    Information = biznes hodisasi · Warning = kutilgan muammo
             Error = BIZNING bug · biznes rad (422) → Information/Warning
LOG QILINMAYDI  parol · token · to'liq PAN · CVV · PII · kalitlar
             → maskalash AVTOMATIK (destructuring policy)
Performans   shablon lazy hisoblanadi · issiq yo'lda LoggerMessage generator
```

---

# 13.6 · Metrikalar

## Turlari

```
   ┌──────────────┬───────────────────────────────────────────────┐
   │  Counter     │  faqat o'sadi: so'rovlar soni, xatolar        │
   │  Gauge       │  joriy qiymat: navbat uzunligi, ulanishlar    │
   │  Histogram   │  taqsimot: kechikish (p50, p95, p99)          │
   │  Summary     │  histogram'ga o'xshash, client'da hisoblanadi │
   └──────────────┴───────────────────────────────────────────────┘
```

```csharp
// .NET built-in metrics
private static readonly Meter Meter = new("Fintech.Payments", "1.0");

private static readonly Counter<long> PaymentsTotal =
    Meter.CreateCounter<long>("payments.total");

private static readonly Histogram<double> PaymentDuration =
    Meter.CreateHistogram<double>("payments.duration", unit: "ms");

private static readonly UpDownCounter<long> PendingPayments =
    Meter.CreateUpDownCounter<long>("payments.pending");

// Ishlatilishi
PaymentsTotal.Add(1, new KeyValuePair<string, object?>("status", "completed"),
                     new KeyValuePair<string, object?>("provider", "click"));
```

## RED va USE metodikalari

```
   ┌─ RED (servis uchun) ────────────────────────────────────────┐
   │  Rate      — so'rovlar tezligi                               │
   │  Errors    — xatolar foizi                                    │
   │  Duration  — kechikish taqsimoti (p50, p95, p99)              │
   ├─ USE (resurs uchun) ───────────────────────────────────────┤
   │  Utilization — foydalanish foizi (CPU, disk)                 │
   │  Saturation  — navbat, kutish                                 │
   │  Errors      — xatolar                                        │
   └─────────────────────────────────────────────────────────────┘
```

## Fintech metrikalari

```
   ┌─ BIZNES ────────────────────────────────────────────────────┐
   │  · to'lov muvaffaqiyat foizi (provayder bo'yicha)            │
   │  · to'lovlar soni va summasi (valyuta bo'yicha)              │
   │  · o'rtacha to'lov summasi                                    │
   ├─ TEXNIK ───────────────────────────────────────────────────┤
   │  · p95 / p99 kechikish (endpoint bo'yicha)                   │
   │  · DB connection pool foydalanishi (M5.12)                   │
   │  · thread pool queue length (M3.3)                           │
   │  · GC: gen2 chastotasi, % time in GC (M2.2)                  │
   ├─ INTEGRATSIYA ─────────────────────────────────────────────┤
   │  · OUTBOX yuborilmagan xabarlar soni va YOSHI (M10.3)        │
   │  · consumer lag (Kafka — M10.9)                              │
   │  · circuit breaker holati (M10.12)                           │
   │  · provayder javob vaqti                                      │
   ├─ MOLIYAVIY NAZORAT ────────────────────────────────────────┤
   │  · ledger Δ (0 bo'lishi kerak — M11.2)                       │
   │  · unknown holatdagi to'lovlar soni va yoshi (M10.13)        │
   │  · reconciliation farqlari (M10.14)                          │
   │  · suspense hisobi qoldig'i (M11.3)                          │
   └─────────────────────────────────────────────────────────────┘
```

## O'rtacha yolg'on gapiradi

```
   1000 so'rov:
   · 990 tasi 10 ms
   · 10 tasi 5000 ms

   O'rtacha = 59 ms          ← "hammasi yaxshi" ko'rinadi
   p99      = 5000 ms        ← HAQIQAT

   ⚠ Har 100-chi foydalanuvchi 5 soniya kutmoqda

   → Har doim p95 va p99 ga qarang
```

## Cardinality tuzog'i

```
   ⚠ Metrika teglariga YUQORI CARDINALITY qiymat qo'ymang:

   ❌ PaymentsTotal.Add(1, new("user_id", userId));      // millionlab qiymat
   ❌ PaymentsTotal.Add(1, new("payment_id", id));       // har biri noyob

   → metrika bazasi portlaydi (har kombinatsiya alohida qator)

   ✅ status, provider, currency, endpoint — cheklangan to'plam
   → foydalanuvchi darajasidagi tafsilot LOG yoki TRACE'da (13.7)
```

## Intervyu savollari

**1. Qaysi metrikalarni kuzatasiz?**

> **RED** — servis uchun: so'rovlar tezligi, xatolar foizi, kechikish taqsimoti.
>
> Fintech'da qo'shimcha **moliyaviy nazorat** metrikalari: ledger `Δ` (nol
> bo'lishi kerak), `unknown` holatdagi to'lovlar soni va yoshi, reconciliation
> farqlari, outbox'da yuborilmagan xabarlar.
>
> Oxirgilar eng qimmatli: ular **pul holatidagi muammoni** ko'rsatadi, texnik
> muammoni emas.

**2. Nega o'rtacha kechikishga qaramaysiz?** ⭐

> O'rtacha **yolg'on gapiradi**. 990 so'rov 10 ms, 10 so'rov 5000 ms bo'lsa —
> o'rtacha 59 ms va «hammasi yaxshi» ko'rinadi.
>
> Lekin `p99` = 5000 ms: har yuzinchi foydalanuvchi 5 soniya kutmoqda.
>
> Shuning uchun har doim **p95 va p99** kuzatiladi.

**3. Metrika cardinality nima?**

> Teg qiymatlarining noyob kombinatsiyalari soni. `user_id` yoki `payment_id` ni
> tegga qo'ysangiz — millionlab qator paydo bo'ladi va metrika bazasi portlaydi.
>
> Teglar **cheklangan to'plam** bo'lishi kerak: status, provider, currency,
> endpoint.
>
> Foydalanuvchi darajasidagi tafsilot log yoki trace'da bo'ladi (13.7).

## Xotira kartasi

```
Turlari      Counter (o'sadi) · Gauge (joriy) · Histogram (taqsimot)
RED          Rate · Errors · Duration — servis uchun
USE          Utilization · Saturation · Errors — resurs uchun
Fintech      to'lov muvaffaqiyat % · p95/p99 · pool · outbox lag
             ⭐ ledger Δ · unknown to'lovlar · reconciliation farqlari
             suspense qoldig'i
O'RTACHA     YOLG'ON GAPIRADI → p95 va p99 ga qarang
Cardinality  teglarga user_id/payment_id QO'YMANG → baza portlaydi
             teglar CHEKLANGAN to'plam · tafsilot log/trace'da
```

---

# 13.7 · Distributed tracing

## Nima va nega

```
   Bitta so'rov bir necha servisdan o'tadi:

   API ──► Payment Service ──► Ledger ──► DB
                 │
                 └──► Provider (tashqi)

   ⚠ Log'lar alohida — qaysi biri qaysi so'rovga tegishli?
   ⚠ Kechikish qayerda? DB'dami, provayderdami?

   → TRACE bularning hammasini BITTA daraxtga bog'laydi
```

```
   Trace: 4bf92f3577b34da6
   ┌──────────────────────────────────────────────────────────── 340 ms
   │ POST /api/v1/payments
   │  ├─────────────────────────────────────── 12 ms
   │  │ Authentication
   │  ├────────────────────────────────────────────── 45 ms
   │  │ DB: SELECT account FOR UPDATE
   │  ├──────────────────────────────────────────────────── 250 ms  ← BO'G'IZ
   │  │ HTTP: POST provider.click.uz/charge
   │  ├────────────── 18 ms
   │  │ DB: INSERT ledger_entries + outbox
   │  └───── 5 ms
   │    Response serialization
   └────────────────────────────────────────────────────────────
```

## OpenTelemetry

```csharp
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("fintech-api", serviceVersion: "1.2.0"))
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation(o => o.RecordException = true)
        .AddHttpClientInstrumentation()
        .AddNpgsql()
        .AddSource("Fintech.Payments")          // o'z span'larimiz
        .SetSampler(new TraceIdRatioBasedSampler(0.1))   // ⚠ 10% namuna
        .AddOtlpExporter())
    .WithMetrics(m => m
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation()
        .AddMeter("Fintech.Payments")
        .AddOtlpExporter());
```

```csharp
// O'z span'ingiz
private static readonly ActivitySource Source = new("Fintech.Payments");

public async Task<Result> ProcessAsync(PaymentRequest request, CancellationToken ct)
{
    using var activity = Source.StartActivity("payment.process");
    activity?.SetTag("payment.id", request.Id);
    activity?.SetTag("payment.amount_minor", request.AmountMinor);
    activity?.SetTag("payment.provider", request.Provider);

    try
    {
        var result = await ExecuteAsync(request, ct);
        activity?.SetStatus(result.IsSuccess ? ActivityStatusCode.Ok : ActivityStatusCode.Error);
        return result;
    }
    catch (Exception ex)
    {
        activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
        throw;
    }
}
```

## Sampling

```
   ⚠ Har so'rovni trace qilish QIMMAT (saqlash, tarmoq, ishlov)

   Strategiyalar:
   ┌──────────────────────────────────────────────────────────────┐
   │  Head sampling  — boshida qaror (masalan 10%)                 │
   │                   sodda, lekin xatolar tushib qolishi mumkin  │
   │  Tail sampling  — oxirida qaror: XATO va SEKIN so'rovlar      │
   │                   100%, qolganlari 1%                          │
   │                   ✅ eng foydali, ⚠ murakkabroq                │
   └──────────────────────────────────────────────────────────────┘
```

## Log, metrika, trace — birga

```
   ┌──────────────────────────────────────────────────────────────┐
   │  METRIKA  — "muammo BORMI?"     (alert shundan)               │
   │  TRACE    — "muammo QAYERDA?"   (qaysi servis/operatsiya)     │
   │  LOG      — "muammo NIMA?"      (tafsilot, xato matni)        │
   │                                                                │
   │  → ular CORRELATION ID bilan bog'lanadi                       │
   │  → trace ID logda ham, metrika exemplar'ida ham bo'ladi        │
   └──────────────────────────────────────────────────────────────┘
```

## Intervyu savollari

**1. Distributed tracing nima uchun kerak?**

> Bitta so'rov bir necha servis va operatsiyadan o'tadi. Log'lar alohida bo'lsa,
> «kechikish qayerda?» degan savolga javob topib bo'lmaydi.
>
> Trace ularni **bitta daraxtga** bog'laydi va har bosqichning vaqtini ko'rsatadi
> — bo'g'iz darhol ko'rinadi.
>
> .NET'da bu OpenTelemetry bilan: ASP.NET Core, HttpClient va Npgsql avtomatik
> instrumentatsiya qilinadi, o'z span'lar `ActivitySource` bilan qo'shiladi.

**2. Hamma so'rovni trace qilasizmi?**

> Yo'q — qimmat. **Sampling** ishlatiladi.
>
> Eng foydalisi — **tail sampling**: qaror so'rov tugagach qabul qilinadi, xato va
> sekin so'rovlar 100% saqlanadi, normal so'rovlarning 1% i.
>
> Head sampling soddaroq (masalan 10%), lekin aynan kerakli xato tushib qolishi
> mumkin.

**3. Log, metrika va trace qanday birga ishlaydi?**

> **Metrika** — «muammo bormi?», alert shundan keladi. **Trace** — «muammo
> qayerda?», qaysi servis yoki operatsiya. **Log** — «muammo nima?», tafsilot.
>
> Ular **correlation ID** bilan bog'lanadi: trace ID logda ham bo'ladi, shuning
> uchun metrikadan trace'ga, undan logga o'tish mumkin.

## Xotira kartasi

```
Nima uchun   bitta so'rov ko'p servisdan o'tadi → BITTA daraxt
             har bosqich vaqti → bo'g'iz darhol ko'rinadi
OpenTelemetry  ASP.NET Core + HttpClient + Npgsql avtomatik
             o'z span: ActivitySource + Activity tag'lari
Sampling     head (boshida, sodda) · TAIL (oxirida: xato va sekin 100%)
Uchlik       METRIKA "bormi?" · TRACE "qayerda?" · LOG "nima?"
             correlation ID bilan bog'lanadi
```

---

# 13.8 · Alerting

## Nimaga alert qo'yiladi

```
   ┌──────────────────────────────────────────────────────────────┐
   │  ✅ ALERT QO'YILADI — odam ARALASHUVI kerak bo'lsa            │
   │  · xato foizi > 1% (5 daqiqa davomida)                        │
   │  · p99 kechikish > SLO                                         │
   │  · LEDGER Δ ≠ 0                            ← eng kritik       │
   │  · outbox lag > 5 daqiqa                                       │
   │  · unknown to'lovlar soni o'sib bormoqda                      │
   │  · reconciliation farqi topildi                                │
   │  · circuit breaker OPEN                                        │
   │  · disk > 85%                                                  │
   ├──────────────────────────────────────────────────────────────┤
   │  ❌ ALERT QO'YILMAYDI                                          │
   │  · CPU 80% (o'z-o'zidan muammo emas)                          │
   │  · bitta 500 xato                                              │
   │  · pod restart (rejalashtirilgan)                              │
   │  · odam qila oladigan hech narsa yo'q bo'lsa                  │
   └──────────────────────────────────────────────────────────────┘
```

## Alert charchoqi

```
   ⚠ ENG KATTA XAVF: ALERT FATIGUE

   Kuniga 50 alert → jamoa ularni O'QIMAY QO'YADI
   → haqiqiy incident o'tkazib yuboriladi

   Qoidalar:
   · har alert HARAKAT talab qilsin ("nima qilishim kerak?")
   · runbook havolasi bo'lsin
   · noise'ni muntazam tozalash (oyiga bir marta ko'rib chiqish)
   · "flapping" alertlarni to'g'rilash (hysteresis)
```

## Alert darajalari

```
   ┌──────────────┬───────────────────────────────────────────────┐
   │  P1 / Page   │  darhol uyg'otadi — pul yo'qolmoqda,          │
   │              │  tizim ishlamayapti                            │
   │  P2 / Ticket │  ish vaqtida hal qilinadi                     │
   │  P3 / Info   │  dashboard'da ko'rinadi, alert yo'q           │
   └──────────────┴───────────────────────────────────────────────┘

   Fintech P1 misollari:
   · ledger Δ ≠ 0
   · to'lov muvaffaqiyat foizi < 90%
   · DB mavjud emas
   · outbox relay to'xtagan
```

## SLO asosidagi alerting

```
   SLO: 99.9% so'rov 500 ms dan tez javob beradi

   Error budget = 0.1% = oyiga ~43 daqiqa

   ⚠ Alert xato SODIR BO'LGANDA emas,
     ERROR BUDGET TEZ SARFLANAYOTGANDA beriladi:

   · 1 soatda budget'ning 2% sarflandi → P2
   · 1 soatda budget'ning 5% sarflandi → P1

   → "burn rate" alerting: shovqin kam, signal aniq
```

## Runbook

```markdown
## Alert: outbox_lag_high

**Ma'nosi:** Outbox'da 5 daqiqadan eski yuborilmagan xabarlar bor.
**Ta'siri:** Boshqa servislar to'lov haqida bilmayapti (ledger, notification).

**Tekshirish:**
1. Relay ishlayaptimi: `kubectl get pods -l app=outbox-relay`
2. Loglar: `kubectl logs -l app=outbox-relay --tail=100`
3. Broker mavjudmi: RabbitMQ management UI
4. Navbat: `SELECT count(*), min(created_at) FROM outbox WHERE published_at IS NULL`

**Odatiy sabablar:**
- Relay pod yiqilgan → restart
- Broker mavjud emas → infratuzilma jamoasi
- Xabar poison → DLQ'ga ko'chirish (M10.8)

**Eskalatsiya:** 30 daqiqada hal bo'lmasa — payments jamoasi rahbari
```

## Intervyu savollari

**1. Nimaga alert qo'yasiz?**

> Faqat **odam aralashuvi kerak** bo'lgan holatlarga.
>
> CPU 80% — o'z-o'zidan muammo emas, alert kerak emas. Lekin ledger `Δ ≠ 0` — bu
> darhol P1: pul holati noto'g'ri.
>
> Fintech'da eng muhim alertlar **moliyaviy nazorat** metrikalaridan keladi:
> ledger Δ, unknown to'lovlar, reconciliation farqlari, outbox lag.

**2. Alert fatigue nima?** ⭐

> Juda ko'p alert bo'lsa, jamoa ularni o'qimay qo'yadi — va haqiqiy incident
> o'tkazib yuboriladi.
>
> Qoidalar: har alert **harakat talab qilsin**, unga runbook havolasi bo'lsin, va
> alertlar muntazam ko'rib chiqilib shovqin tozalansin.
>
> «Bu alertga javoban nima qilaman?» degan savolga javob yo'q bo'lsa — u alert
> emas, dashboard elementi.

**3. SLO asosidagi alerting nima?**

> Alert xato sodir bo'lganda emas, **error budget tez sarflanayotganda** beriladi.
>
> SLO 99.9% bo'lsa, oyiga 43 daqiqa budget bor. Agar bir soatda budget'ning 5% i
> sarflansa — bu tez sur'at va P1 alert.
>
> Bu shovqinni keskin kamaytiradi: bitta 500 xato alert bermaydi, lekin barqaror
> yomonlashish darhol ko'rinadi.

## Xotira kartasi

```
Alert qo'yiladi  odam ARALASHUVI kerak bo'lsa
             xato % · p99 · LEDGER Δ ≠ 0 · outbox lag · unknown to'lovlar
             reconciliation farqi · circuit breaker OPEN
QO'YILMAYDI  CPU 80% · bitta xato · odam qila oladigan narsa yo'q bo'lsa
Alert fatigue  ko'p alert → o'qilmay qoladi → HAQIQIY incident o'tib ketadi
             har alert HARAKAT talab qilsin + RUNBOOK havolasi
Darajalar    P1 page (pul yo'qolmoqda) · P2 ticket · P3 dashboard
SLO alerting error budget BURN RATE bo'yicha
             1 soatda 5% sarflansa → P1 · shovqin kam, signal aniq
```

---

# 13.9 · Health check ⭐

## Ikki turi — asosiy farq

```
   ┌──────────────────────────────────────────────────────────────┐
   │  LIVENESS  — "jarayon tirikmi?"                               │
   │  Yiqilsa → pod RESTART qilinadi                               │
   │  ⚠ Faqat ILOVA o'zi haqida: deadlock, o'lik holat             │
   ├──────────────────────────────────────────────────────────────┤
   │  READINESS — "trafik qabul qilishga tayyormi?"                │
   │  Yiqilsa → pod ENDPOINT'dan chiqariladi, lekin ISHLAYDI       │
   │  Bog'liqliklarni tekshiradi: DB, broker, kesh                 │
   ├──────────────────────────────────────────────────────────────┤
   │  STARTUP   — "ishga tushish tugadimi?"                        │
   │  Sekin start uchun (warm-up — M2.1)                           │
   └──────────────────────────────────────────────────────────────┘
```

```
   ⚠⚠ ENG MUHIM QOIDA:

   DB yiqilganda LIVENESS'ni YIQITMANG!

   Liveness yiqilsa → pod restart → DB hali yiqilgan → yana restart
   → CrashLoopBackOff → tizim O'ZINI O'ZI YO'Q QILADI

   ✅ To'g'ri: readiness yiqiladi → pod trafik olmaydi
      DB tiklanganda pod o'zi qaytadi
```

## Implementatsiya

```csharp
builder.Services.AddHealthChecks()
    // Readiness — bog'liqliklar
    .AddNpgSql(connectionString, name: "database", tags: ["ready"])
    .AddRabbitMQ(rabbitConnection, name: "broker", tags: ["ready"])
    .AddCheck<OutboxRelayHealthCheck>("outbox-relay", tags: ["ready"])

    // Liveness — faqat ilova
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"]);

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = c => c.Tags.Contains("live")
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = c => c.Tags.Contains("ready"),
    ResponseWriter = WriteDetailedResponse
});
```

## Fon vazifasi tirikligi

```csharp
// ⚠ BackgroundService jimgina o'lishi mumkin (M7.10)
public sealed class OutboxRelayHealthCheck(OutboxRelayState state, TimeProvider clock)
    : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct)
    {
        var age = clock.GetUtcNow() - state.LastSuccessfulIteration;

        return Task.FromResult(age switch
        {
            { TotalMinutes: > 5 } => HealthCheckResult.Unhealthy(
                                        $"Relay {age.TotalMinutes:F0} daqiqadan beri ishlamayapti"),
            { TotalMinutes: > 1 } => HealthCheckResult.Degraded("Relay sekinlashgan"),
            _                     => HealthCheckResult.Healthy()
        });
    }
}
```

## Tuzoqlar

```
   ⚠ Health check O'ZI muammo bo'lmasin:

   · og'ir so'rov qilmang (SELECT count(*) FROM payments ❌)
     → SELECT 1 yetadi
   · timeout qo'ying (2–3 soniya)
   · natijani qisqa muddat KESHLANG (har probe'da DB'ga bormasin)
   · tashqi provayderni readiness'ga QO'SHMANG
     → u yiqilsa butun tizim trafikdan chiqadi
```

```
   Tashqi bog'liqlik uchun DEGRADED holati:
   · DB yiqildi        → Unhealthy (trafik olmaymiz)
   · Provayder yiqildi → Degraded  (to'lov qabul qilmaymiz, lekin
                                    balans ko'rsatish ishlaydi)
```

## Intervyu savollari

**1. Liveness va readiness farqi?** ⭐

> **Liveness** yiqilsa pod **restart** qilinadi. **Readiness** yiqilsa pod
> trafikdan **chiqariladi**, lekin ishlashda davom etadi.
>
> Eng muhim qoida: **DB yiqilganda liveness'ni yiqitmang**. Pod restart muammoni
> yechmaydi — DB hali yiqilgan, pod yana restart bo'ladi va CrashLoopBackOff
> hosil bo'ladi. Tizim o'zini o'zi yo'q qiladi.
>
> To'g'risi: readiness yiqiladi, pod trafik olmaydi va DB tiklanganda o'zi
> qaytadi.

**2. Fon vazifasi tirikligini qanday tekshirasiz?**

> `BackgroundService` **jimgina o'lishi** mumkin (M7.10) — ilova ishlashda davom
> etadi, lekin outbox relay to'xtagan.
>
> Shuning uchun health check yozaman: «oxirgi muvaffaqiyatli iteratsiya qachon
> bo'lgan?». 5 daqiqadan ortiq bo'lsa `Unhealthy`.
>
> Bu readiness'ga kiritiladi va alert bilan bog'lanadi (13.8).

**3. Tashqi provayderni health check'ga qo'shasizmi?**

> Readiness'ga **yo'q** — u yiqilsa butun tizim trafikdan chiqadi, holbuki balans
> ko'rsatish yoki tarix o'qish baribir ishlaydi.
>
> Uni alohida **Degraded** holati sifatida ko'rsataman: tizim qisman ishlayapti,
> to'lov qabul qilinmaydi.
>
> Va health check o'zi og'ir bo'lmasligi kerak: `SELECT 1`, timeout va natijani
> qisqa muddat keshlash.

## Xotira kartasi

```
Liveness     "jarayon tirikmi?" · yiqilsa RESTART · faqat ilova o'zi
Readiness    "trafik olishga tayyormi?" · yiqilsa ENDPOINT'dan chiqadi
             bog'liqliklarni tekshiradi (DB, broker)
Startup      sekin start uchun (warm-up)
⚠⚠ QOIDA     DB yiqilganda LIVENESS'ni YIQITMANG
             → restart → DB hali yiqilgan → CrashLoopBackOff
Fon vazifasi BackgroundService jimgina o'ladi → "oxirgi iteratsiya qachon?"
Tuzoqlar     og'ir so'rov ❌ (SELECT 1) · timeout · natijani keshlang
             tashqi provayder readiness'da EMAS → Degraded holati
```

---

# 13.10 · Incident jarayoni ⭐

## Bosqichlar

```
   ┌─ 1. ANIQLASH ───────────────────────────────────────────────┐
   │  alert · mijoz shikoyati · monitoring                         │
   ├─ 2. BAHOLASH ──────────────────────────────────────────────┤
   │  · ta'sir doirasi: nechta foydalanuvchi, qancha pul?         │
   │  · daraja: P1 / P2                                            │
   │  · ⚠ FINTECH: pul holati buzilganmi?                          │
   ├─ 3. TO'XTATISH (mitigation) ───────────────────────────────┤
   │  ⚠ AVVAL TO'XTATING, keyin sababni qidiring                  │
   │  · rollback · feature flag o'chirish · trafikni kamaytirish   │
   ├─ 4. TIKLASH ───────────────────────────────────────────────┤
   │  · xizmat ishlashini tiklash                                  │
   │  · ma'lumot butunligini tekshirish (ledger Δ, reconciliation) │
   ├─ 5. ALOQA ─────────────────────────────────────────────────┤
   │  · ichki: jamoa, rahbariyat                                   │
   │  · tashqi: mijozlar, merchant'lar                             │
   │  · regulyator (talab bo'lsa)                                  │
   ├─ 6. POSTMORTEM ────────────────────────────────────────────┤
   │  · AYBLASHSIZ (blameless)                                     │
   │  · timeline · sabab · harakatlar                              │
   └─────────────────────────────────────────────────────────────┘
```

## Fintech'ga xos savollar

```
   Har incident'da qo'shimcha tekshiruv:

   □ Pul yo'qolganmi yoki ikki marta yechilganmi?
   □ Ledger Δ = 0 saqlanganmi?
   □ Qancha to'lov `unknown` holatda qoldi? (M10.13)
   □ Outbox'da yuborilmagan xabarlar bormi?
   □ Reconciliation farqlari paydo bo'ldimi?
   □ Mijozlarga noto'g'ri ma'lumot ko'rsatildimi?

   → Bularning javobi TIKLASHDAN KEYIN ham kerak
```

## Rollar

```
   ┌──────────────────┬───────────────────────────────────────────┐
   │  Incident Commander│  qarorlar qabul qiladi, koordinatsiya   │
   │                  │  ⚠ o'zi tuzatmaydi                        │
   │  Ops / Engineer  │  texnik tuzatish                          │
   │  Communications  │  ichki va tashqi aloqa                    │
   │  Scribe          │  timeline yozib boradi                    │
   └──────────────────┴───────────────────────────────────────────┘

   ⚠ Kichik jamoada bir odam bir necha rol bajaradi,
     lekin ROLLAR ANIQ bo'lishi kerak — aks holda xaos
```

## Blameless postmortem

```markdown
# Incident 2026-08-04: To'lovlar 23 daqiqa ishlamadi

## Ta'sir
- 09:12–09:35 (23 daqiqa)
- ~4 200 to'lov rad etildi
- Pul yo'qolmadi, ledger Δ = 0 saqlandi
- 18 to'lov `unknown` holatda qoldi → reconciliation bilan hal qilindi

## Timeline
- 09:10  Deploy v1.4.2 (yangi indeks migratsiyasi)
- 09:12  Alert: p99 kechikish > 5 s
- 09:15  Ops jamoasi jalb qilindi
- 09:22  Sabab aniqlandi: `CREATE INDEX` (CONCURRENTLY'siz) jadvalni qulfladi
- 09:28  Migratsiya to'xtatildi
- 09:35  Xizmat tiklandi
- 10:15  18 ta unknown to'lov reconciliation bilan hal qilindi

## Ildiz sabab
Migratsiyada `CREATE INDEX CONCURRENTLY` o'rniga oddiy `CREATE INDEX`
ishlatilgan (M5.13). 12 mln qatorli jadvalda u yozishni to'liq bloklaydi.

Code review'da bu e'tibordan chetda qoldi.

## Nega ertaroq ushlanmadi
- CI'da migratsiya faqat bo'sh test DB'da bajariladi (millisekundlar)
- Migratsiya uchun avtomatik tekshiruv yo'q edi

## Harakatlar
| # | Harakat | Mas'ul | Muddat |
|---|---|---|---|
| 1 | Migratsiya linter: `CREATE INDEX` CONCURRENTLY'siz → CI xato | ... | 08-11 |
| 2 | Realistik hajmli test DB (1 mln qator) | ... | 08-18 |
| 3 | Migratsiya uchun alohida review checklist | ... | 08-08 |
| 4 | `lock_timeout` barcha migratsiyalarda majburiy | ... | 08-11 |

## Nima yaxshi ishladi
- Alert 2 daqiqada ishladi
- Ledger butunligi buzilmadi
- Reconciliation `unknown` to'lovlarni to'liq hal qildi
```

```
   ⚠ BLAMELESS — "kim aybdor" emas, "TIZIM nega ruxsat berdi":

   ❌ "X noto'g'ri migratsiya yozdi"
   ✅ "CI noto'g'ri migratsiyani o'tkazib yubordi — tekshiruv yo'q edi"

   Sabab: ayblash madaniyati odamlarni xatoni YASHIRISHGA majbur qiladi
```

## Intervyu savollari

**1. Production'da incident bo'ldi. Qadamlaringiz?** ⭐

> 1. **Baholash** — ta'sir doirasi va daraja. Fintech'da qo'shimcha savol: **pul
>    holati buzilganmi?**
> 2. **To'xtatish** — avval ta'sirni to'xtataman, keyin sababni qidiraman.
>    Rollback, feature flag o'chirish yoki trafikni kamaytirish.
> 3. **Tiklash** — xizmat va **ma'lumot butunligi**: ledger Δ, unknown to'lovlar,
>    reconciliation.
> 4. **Aloqa** — jamoa, mijozlar, kerak bo'lsa regulyator.
> 5. **Postmortem** — ayblashsiz, harakatlar ro'yxati bilan.
>
> Eng muhim tartib: **avval to'xtatish, keyin tahlil**. Sababni qidirib turganda
> pul yo'qolishda davom etadi.

**2. Blameless postmortem nima?**

> «Kim aybdor» emas, «**tizim nega ruxsat berdi**» degan savol.
>
> «X noto'g'ri migratsiya yozdi» emas, «CI noto'g'ri migratsiyani o'tkazib
> yubordi — tekshiruv yo'q edi».
>
> Sabab amaliy: ayblash madaniyati odamlarni xatoni **yashirishga** majbur qiladi,
> va keyingi safar muammo kechroq aniqlanadi.
>
> Va postmortem **harakatlar ro'yxati** bilan tugaydi — mas'ul va muddat bilan,
> aks holda u shunchaki hujjat bo'lib qoladi.

**3. Fintech incident'ida qanday qo'shimcha tekshiruv bor?**

> **Pul holati.** Xizmat tiklangandan keyin ham:
> - ledger Δ = 0 saqlanganmi;
> - qancha to'lov `unknown` holatda qoldi;
> - outbox'da yuborilmagan xabarlar bormi;
> - reconciliation farqlari paydo bo'ldimi;
> - mijozlarga noto'g'ri ma'lumot ko'rsatildimi.
>
> Texnik tiklanish — incident'ning yarmi; ikkinchi yarmi **ma'lumot butunligini**
> tasdiqlash.

## Xotira kartasi

```
Bosqichlar   aniqlash → baholash → TO'XTATISH → tiklash → aloqa → postmortem
QOIDA        AVVAL TO'XTATING, keyin sababni qidiring
Fintech      qo'shimcha: pul yo'qoldimi? Δ = 0? unknown to'lovlar?
             outbox? reconciliation farqi? noto'g'ri ma'lumot ko'rsatildimi?
Rollar       Incident Commander (qaror, tuzatmaydi) · Engineer · Comms · Scribe
Postmortem   BLAMELESS — "kim aybdor" emas, "TIZIM nega ruxsat berdi"
             timeline · ildiz sabab · nega ertaroq ushlanmadi
             HARAKATLAR (mas'ul + muddat) · nima yaxshi ishladi
```

---

# 13.11 · Feature flag

## Nima va nega

```
   Kodni deploy qilish ≠ funksiyani YOQISH

   ┌──────────────────────────────────────────────────────────────┐
   │  · tugallanmagan kod main'ga birlashtiriladi (trunk-based)    │
   │  · funksiya OCHIQ, lekin O'CHIRILGAN                          │
   │  · bosqichma-bosqich yoqiladi (5% → 50% → 100%)               │
   │  · muammo bo'lsa DARHOL o'chiriladi — deploy kutmasdan        │
   └──────────────────────────────────────────────────────────────┘
```

## Turlari

```
   ┌──────────────┬───────────────────────────────────────────────┐
   │  Release     │  tugallanmagan funksiyani yashirish            │
   │              │  → funksiya tayyor bo'lgach flag O'CHIRILADI   │
   │  Operational │  yukni boshqarish (og'ir hisobotni o'chirish)  │
   │  Permission  │  faqat ma'lum foydalanuvchilarga               │
   │  Experiment  │  A/B test                                      │
   └──────────────┴───────────────────────────────────────────────┘
```

```csharp
public interface IFeatureManager
{
    Task<bool> IsEnabledAsync(string feature, FeatureContext context, CancellationToken ct);
}

// Ishlatilishi
if (await _features.IsEnabledAsync("new-fee-calculation", ctx, ct))
    return await _newCalculator.CalculateAsync(request, ct);

return await _legacyCalculator.CalculateAsync(request, ct);
```

## Fintech'da ehtiyot choralari

```
   ⚠ Pul mantiqiga ta'sir qiladigan flag ALOHIDA e'tibor talab qiladi:

   □ Flag o'zgarishi AUDIT log'ga tushadi (M8.13) — kim, qachon, nima
   □ Eski va yangi mantiq NATIJASI solishtiriladi (shadow mode)
   □ Flag o'chirilganda ma'lumot NOMUVOFIQ qolmasin
   □ Flag holati metrikada ko'rinadi
```

```csharp
// Shadow mode — yangi mantiq ishlaydi, LEKIN natija ishlatilmaydi
var legacy = await _legacyCalculator.CalculateAsync(request, ct);

if (await _features.IsEnabledAsync("new-fee-shadow", ctx, ct))
{
    try
    {
        var updated = await _newCalculator.CalculateAsync(request, ct);
        if (updated != legacy)
            _logger.LogWarning("Fee farqi {Legacy} vs {New} {RequestId}",
                               legacy, updated, request.Id);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Shadow hisob yiqildi");   // ⚠ asosiy oqimga ta'sir qilmaydi
    }
}

return legacy;      // ⚠ hali eski natija ishlatiladi
```

## Texnik qarz

```
   ⚠ Flag'lar TO'PLANIB QOLADI:

   6 oydan keyin: 40 ta flag, ularning 30 tasi doim yoqilgan
   → kod o'qib bo'lmaydi, kombinatsiyalarni test qilib bo'lmaydi

   Qoidalar:
   · har flag'ga MUDDAT (masalan 90 kun)
   · release flag'lari funksiya barqaror bo'lgach O'CHIRILADI
   · eskirgan flag'lar ro'yxati muntazam ko'rib chiqiladi
   · flag qo'shilganda uni OLIB TASHLASH tiketi ham yaratiladi
```

## Intervyu savollari

**1. Feature flag nima uchun kerak?**

> **Deploy va reliz'ni ajratish**: kod production'da bo'ladi, lekin funksiya
> o'chirilgan.
>
> Bu trunk-based development'ni mumkin qiladi (13.1): tugallanmagan kod ham
> `main`'ga birlashtiriladi va uzoq branch'lar bo'lmaydi.
>
> Va muammo bo'lganda funksiyani **darhol** o'chirish mumkin — deploy kutmasdan.

**2. Fintech'da flag bilan qanday ehtiyot choralari?**

> Pul mantiqiga ta'sir qiladigan flag'lar uchun:
>
> **Shadow mode** — yangi mantiq ishlaydi, natijasi eski bilan solishtiriladi,
> lekin **ishlatilmaydi**. Farq bo'lsa log'ga yoziladi. Bir muddat kuzatib,
> keyin yoqiladi.
>
> **Audit** — flag o'zgarishi kim va qachon qilgani yozib qo'yiladi (M8.13).
>
> Va flag o'chirilganda ma'lumot nomuvofiq qolmasligini tekshirish kerak: yangi
> mantiq bilan yaratilgan yozuvlar eski mantiq bilan to'g'ri talqin qilinsin.

**3. Flag'lar to'planib qolmasligini qanday ta'minlaysiz?**

> Har flag'ga **muddat** beriladi (masalan 90 kun) va uni olib tashlash tiketi
> flag qo'shilishi bilan birga yaratiladi.
>
> Release flag'lari funksiya barqaror bo'lgach o'chiriladi — ular vaqtinchalik.
>
> Aks holda 6 oydan keyin 40 ta flag bo'ladi va ularning kombinatsiyalarini test
> qilib bo'lmaydi.

## Xotira kartasi

```
G'oya        DEPLOY ≠ RELIZ · kod bor, funksiya o'chirilgan
             trunk-based'ni mumkin qiladi · darhol o'chirish (deploy'siz)
Turlari      release · operational · permission · experiment
Fintech      SHADOW MODE — yangi mantiq ishlaydi, natija ISHLATILMAYDI
             farq log'ga · flag o'zgarishi AUDIT'ga
             flag o'chirilganda ma'lumot nomuvofiq qolmasin
Texnik qarz  flag'lar TO'PLANADI → muddat (90 kun) · olib tashlash tiketi
             release flag'lari funksiya barqaror bo'lgach O'CHIRILADI
```

---

## M13 — yakuniy tekshiruv ro'yxati

- [ ] Trunk-based va Git Flow farqi
- [ ] PR qanchalik katta bo'lishi kerak
- [ ] CI pipeline bosqichlari va tartib sababi
- [ ] Migratsiyani CI avtomatik qo'llasinmi
- [ ] Multi-stage build nima beradi, layer tartibi
- [ ] Konteynerda .NET uchun nima muhim
- [ ] Rolling deploy'da qanday tuzoq bor
- [ ] Graceful shutdown ketma-ketligi
- [ ] Structured logging nima beradi
- [ ] Nimani log qilmaysiz
- [ ] Nega o'rtacha kechikishga qaramaysiz
- [ ] Metrika cardinality tuzog'i
- [ ] Distributed tracing va sampling
- [ ] Log, metrika, trace qanday birga ishlaydi
- [ ] Nimaga alert qo'yasiz, alert fatigue nima
- [ ] SLO asosidagi alerting
- [ ] **Liveness va readiness farqi** ⭐
- [ ] DB yiqilganda nima qilinadi
- [ ] Incident bosqichlari — avval nima
- [ ] Blameless postmortem nima
- [ ] Feature flag va shadow mode

**Deliverable'lar:**

- [ ] `Dockerfile` — multi-stage, non-root, alpine
- [ ] `.github/workflows/ci.yml` — to'liq pipeline
- [ ] Health check'lar — liveness, readiness, outbox relay tirikligi
- [ ] `docs/runbooks/` — kamida 3 ta runbook (outbox lag, DB down, ledger delta)
- [ ] Postmortem shabloni
- [ ] Kubernetes manifest — probe'lar, limitlar, grace period
