# Syllabus — .NET Backend / Fintech (Middle+ → Senior)

To'liq o'quv skeleti. Har bo'lim alohida buyurtma qilinadi: **"M5.3 ni to'liq yoz"**.

- **15 modul · 96 mavzu**
- Ustuvorlik: `P0` = intervyuda albatta so'raladi · `P1` = katta ehtimol · `P2` = farqlovchi
- Holat: `[ ]` yozilmagan · `[~]` qisman · `[x]` tayyor

---

## Har mavzu uchun standart tuzilma

Buyurtma qilinganda har bir mavzu **shu shaklda** yoziladi:

| # | Blok | Nima bo'ladi |
|---|---|---|
| 1 | **Nima va nega** | Muammo qaysi ehtiyojdan kelib chiqqan. Ta'rifdan emas, muammodan boshlanadi |
| 2 | **Ichki mexanika** | Qopqoq ostida nima sodir bo'ladi (CLR, DB planner, TCP…) |
| 3 | **Kod yoki chizma** | Holatga qarab — pastdagi tanlov qoidasi. Kod bo'lsa: ❌ noto'g'ri va ✅ to'g'ri variant yonma-yon |
| 4 | **Solishtirma jadval** | Variantlar, narxi, qachon qaysi biri |
| 5 | **Tipik xatolar** | Amalda uchraydigan tuzoqlar va ular qanday ko'rinadi |
| 6 | **Fintech konteksti** | Bu mavzu pulga qanday tegadi |
| 7 | **Intervyu savollari** | 3–6 savol + javob **strukturasi** (muammoni nomlash → variantlar → tanlov va sabab) |
| 8 | **Deliverable** | Yoziladigan kod yoki test — mavzuni yopadigan aniq artefakt |
| 9 | **Xotira kartasi** | 5–7 qatorli qisqa takrorlash bloki |

### Kod yoki chizma — tanlov qoidasi

Mavzuning **tabiati** hal qiladi, bezak uchun emas. Ko'p mavzuda ikkalasi ham bo'ladi.

| Mavzu qanday | Nima beriladi | Misol |
|---|---|---|
| Til/API xatti-harakati | **Kod** — ❌/✅ yonma-yon | `decimal` vs `double`, `throw` vs `throw ex` |
| Vaqt bo'yicha poyga | **Timeline chizma** — ustunlar: vaqt / A / B | Lost update, deadlock, dual write |
| Holat o'zgarishi | **Holatlar mashinasi** | To'lov: pending → processing → unknown |
| Komponentlar oqimi | **Oqim sxemasi** — qutilar va strelkalar | Outbox → relay → broker → consumer |
| Ma'lumot tuzilishi | **Jadval namunasi** — real qatorlar bilan | Double-entry ledger, idempotency_keys |
| Variantlarni solishtirish | **Solishtirma jadval** | Optimistic vs pessimistic, Kafka vs RabbitMQ |
| Iyerarxiya/qatlamlar | **Daraxt yoki qatlam sxemasi** | Test piramidasi, Clean architecture |
| Algoritm | **Kod + murakkablik izohi** | Sliding window, binary search |
| Sxema (DB) | **DDL kodi** — `CREATE TABLE` to'liq | Ledger, outbox, processed_messages |

**Chizmalar qanday chiziladi:**

- **Saytda (artifact)** — HTML/CSS bilan: ustunli timeline, ranglangan bloklar, jadval. Mermaid **ishlatilmaydi**.
- **Markdown fayllarda** — monospace ASCII blok ichida, `<pre>` uslubida. O'qilishi aniq bo'lsin.
- Rang ma'no tashisin: qizil = xato/debit, yashil = to'g'ri/credit, kulrang = neytral.
- Chizma **matnni almashtirsin**, takrorlamasin. Yonida bir jumla izoh yetadi.

**Minimal talab:** har mavzuda kamida bitta kod bloki **yoki** bitta chizma bo'lishi shart. Ikkalasi ham yo'q bo'lsa — mavzu yopilgan hisoblanmaydi.

---

# M1 · C# tili — chuqur

| # | Mavzu | P | Holat |
|---|---|---|---|
| 1.1 | Value vs reference type, stack/heap haqiqati, boxing | P0 | [x] |
| 1.2 | `string` immutability, interning, `StringBuilder`, `Span<char>` | P1 | [x] |
| 1.3 | `struct`, `readonly struct`, `ref struct`, `record` oilasi | P1 | [x] |
| 1.4 | Tenglik: `==`, `Equals`, `GetHashCode`, `IEquatable<T>` shartnomasi | P0 | [x] |
| 1.5 | Nullable reference types, `null` bilan ishlash strategiyasi | P1 | [x] |
| 1.6 | Generics, constraint'lar, kovariantlik/kontravariantlik | P1 | [x] |
| 1.7 | Delegate, `Func`/`Action`, event, closure va uning tuzog'i | P1 | [x] |
| 1.8 | `IDisposable`, `using`, `IAsyncDisposable`, finalizer | P0 | [x] |
| 1.9 | Exception'lar: qachon tashlash, `throw` vs `throw ex`, filter | P0 | [x] |
| 1.10 | Pattern matching, `switch` expression, deconstruction | P2 | [x] |
| 1.11 | Extension method, `static` konstruktor, `partial` | P2 | [x] |
| 1.12 | Operator overloading va `Money` value object yozish | P2 | [x] |

---

# M2 · .NET runtime va performans

| # | Mavzu | P | Holat |
|---|---|---|---|
| 2.1 | CLR, JIT, AOT, assembly yuklanishi | P2 | [x] |
| 2.2 | GC generatsiyalari, LOH, `GC.Collect` nega chaqirilmaydi | P0 | [x] |
| 2.3 | Xotira sizishi .NET'da: event, static, `HttpClient`, closure | P1 | [x] |
| 2.4 | `Span<T>`, `Memory<T>`, `ArrayPool<T>`, `stackalloc` | P1 | [x] |
| 2.5 | Allocation'ni kamaytirish: `struct` enumerator, `ValueTask` | P2 | [x] |
| 2.6 | BenchmarkDotNet bilan o'lchash, mikro-optimallashtirish tuzog'i | P2 | [x] |
| 2.7 | Profiling: dotnet-counters, dotnet-trace, dump tahlili | P2 | [x] |

---

# M3 · Asinxron va parallel dasturlash

| # | Mavzu | P | Holat |
|---|---|---|---|
| 3.1 | `async`/`await` mexanikasi, state machine, "there is no thread" | P0 | [x] |
| 3.2 | `SynchronizationContext`, `ConfigureAwait`, deadlock | P0 | [x] |
| 3.3 | Thread pool, starvation, `Task.Run` qachon zarar | P0 | [x] |
| 3.4 | `Task.WhenAll`/`WhenAny`, parallel chaqiruvlar, xato yig'ish | P1 | [x] |
| 3.5 | `CancellationToken` — uzatish, tekshirish, timeout | P0 | [x] |
| 3.6 | `IAsyncEnumerable`, streaming natijalar | P2 | [x] |
| 3.7 | Thread-safety: `lock`, `SemaphoreSlim`, `Interlocked`, `volatile` | P1 | [x] |
| 3.8 | `ConcurrentDictionary`, `Channel<T>`, producer/consumer | P1 | [x] |
| 3.9 | Race condition va deadlock'ni kodda topish | P1 | [x] |

---

# M4 · Pul va aniqlik ⭐

| # | Mavzu | P | Holat |
|---|---|---|---|
| 4.1 | IEEE 754, nega `double` pulga yaramaydi | P0 | [x] |
| 4.2 | `decimal` ichki tuzilishi, chegaralari, narxi | P0 | [x] |
| 4.3 | Minor units (tiyin), `Money` value object dizayni | P0 | [x] |
| 4.4 | Yaxlitlash: `MidpointRounding` variantlari, biznes qarori | P0 | [x] |
| 4.5 | Bo'lish va qoldiqni taqsimlash algoritmi | P0 | [x] |
| 4.6 | Ko'p valyuta, kurs muzlatish, konvertatsiya yozuvlari | P1 | [x] |
| 4.7 | Vaqt: UTC, `DateTimeOffset`, `TimeProvider`, kun chegarasi | P1 | [x] |
| 4.8 | Komissiya, soliq, chegirma hisoblash tartibi | P1 | [x] |
| 4.9 | Limitlar: kunlik/oylik, atomik tekshirish | P1 | [x] |

---

# M5 · Ma'lumotlar bazasi ⭐⭐

| # | Mavzu | P | Holat |
|---|---|---|---|
| 5.1 | ACID, tranzaksiya hayot sikli, WAL | P0 | [x] |
| 5.2 | Isolation levels va to'rt anomaliya | P0 | [x] |
| 5.3 | Lost update — reproduce va uchta yechim | P0 | [x] |
| 5.4 | Pessimistic locking: `FOR UPDATE`, `SKIP LOCKED`, `NOWAIT` | P0 | [x] |
| 5.5 | Optimistic locking: `rowversion`, `xmin`, retry siyosati | P0 | [x] |
| 5.6 | Deadlock: sabab, qulf tartibi, aniqlash, retry | P0 | [x] |
| 5.7 | MVCC, snapshot, PostgreSQL'da vacuum | P1 | [x] |
| 5.8 | Indekslar: B-tree, composite tartibi, partial, covering | P0 | [x] |
| 5.9 | `EXPLAIN ANALYZE` o'qish, planner qarorlari | P1 | [x] |
| 5.10 | Normalizatsiya va ataylab denormalizatsiya | P1 | [x] |
| 5.11 | Constraint'lar: `CHECK`, `UNIQUE`, FK, exclusion | P1 | [x] |
| 5.12 | Connection pool, `max_connections`, pgbouncer | P1 | [x] |
| 5.13 | Migratsiya: orqaga moslik, zero-downtime, katta jadval | P1 | [x] |
| 5.14 | Partitioning va sharding — qachon va narxi | P2 | [x] |
| 5.15 | Replikatsiya, read replica, replication lag tuzog'i | P1 | [x] |
| 5.16 | Zaxira va tiklash, PITR | P2 | [x] |

---

# M6 · EF Core va data access

| # | Mavzu | P | Holat |
|---|---|---|---|
| 6.1 | `DbContext` hayoti, change tracker, `AsNoTracking` | P0 | [x] |
| 6.2 | N+1: sabab, aniqlash, `Include` va proyeksiya | P0 | [x] |
| 6.3 | `IQueryable` vs `IEnumerable`, tarjima chegaralari | P0 | [x] |
| 6.4 | Tranzaksiyalar, `SaveChanges` semantikasi, `ExecuteUpdate` | P1 | [x] |
| 6.5 | Concurrency token va konfliktni hal qilish | P0 | [x] |
| 6.6 | Migratsiyalar, seed, `decimal` precision konfiguratsiyasi | P1 | [x] |
| 6.7 | Repository va Unit of Work — kerakmi yoki ortiqchami | P1 | [x] |
| 6.8 | Dapper qachon, raw SQL bilan xavfsiz ishlash | P2 | [x] |
| 6.9 | Testcontainers bilan real DB'da test | P0 | [x] |

---

# M7 · ASP.NET Core

| # | Mavzu | P | Holat |
|---|---|---|---|
| 7.1 | Kestrel, hosting, so'rov hayot sikli | P1 | [x] |
| 7.2 | Middleware pipeline, tartib, o'z middleware'ingiz | P0 | [x] |
| 7.3 | DI konteyner, lifetime'lar, captive dependency | P0 | [x] |
| 7.4 | Konfiguratsiya, `IOptions`, muhitlar, sirlar | P1 | [x] |
| 7.5 | Model binding, validatsiya, FluentValidation | P1 | [x] |
| 7.6 | REST dizayni: resurs, status kodlar, versiyalash | P0 | [x] |
| 7.7 | Xato formati: ProblemDetails, global handler | P0 | [x] |
| 7.8 | `HttpClientFactory`, socket exhaustion, Polly | P1 | [x] |
| 7.9 | Minimal API va Controller — qaysi biri qachon | P2 | [x] |
| 7.10 | Background service, hosted service, graceful shutdown | P1 | [x] |
| 7.11 | Rate limiting, CORS, response caching | P1 | [x] |
| 7.12 | gRPC va webhook qabul qilish | P2 | [x] |

---

# M8 · Xavfsizlik

| # | Mavzu | P | Holat |
|---|---|---|---|
| 8.1 | Autentifikatsiya va avtorizatsiya farqi | P0 | [x] |
| 8.2 | JWT: tuzilishi, imzo, nima saqlanmaydi | P0 | [x] |
| 8.3 | Refresh token, bekor qilish, sessiya boshqaruvi | P0 | [x] |
| 8.4 | OAuth2 / OpenID Connect oqimlari | P1 | [x] |
| 8.5 | Rol va policy asosidagi avtorizatsiya, resurs egaligi | P0 | [x] |
| 8.6 | Parol saqlash: bcrypt/Argon2, salt | P1 | [x] |
| 8.7 | OWASP Top 10 — .NET kontekstida | P1 | [x] |
| 8.8 | SQL injection, XSS, CSRF, SSRF | P1 | [x] |
| 8.9 | Sirlarni boshqarish, kalit rotatsiyasi | P1 | [x] |
| 8.10 | Shifrlash: at rest, in transit, TLS, sertifikat | P2 | [x] |
| 8.11 | ERI / elektron imzo, X.509 bilan ishlash | P2 | [x] |
| 8.12 | PCI DSS asoslari, tokenizatsiya, PII va maskalash | P1 | [x] |
| 8.13 | Audit log: nima yoziladi, qanday himoyalanadi | P0 | [x] |

---

# M9 · Arxitektura va dizayn

| # | Mavzu | P | Holat |
|---|---|---|---|
| 9.1 | SOLID — har biriga o'z kodingizdan misol | P0 | [x] |
| 9.2 | Meros vs kompozitsiya, DRY/KISS/YAGNI chegaralari | P1 | [x] |
| 9.3 | GoF pattern'lari: Strategy, Factory, Decorator, Adapter | P1 | [x] |
| 9.4 | Layered, Clean, Hexagonal arxitektura | P1 | [x] |
| 9.5 | DDD: entity, value object, aggregate chegarasi | P1 | [x] |
| 9.6 | Bounded context, ubiquitous language, context map | P1 | [x] |
| 9.7 | Domain event va integration event farqi | P1 | [x] |
| 9.8 | CQRS: qachon kerak, qachon ortiqcha | P1 | [x] |
| 9.9 | Event sourcing, snapshot, event versiyalash | P2 | [x] |
| 9.10 | Monolit vs mikroservis — real trade-off | P1 | [x] |
| 9.11 | Modular monolith — ko'pincha to'g'ri javob | P1 | [x] |
| 9.12 | ADR yozish — qaror hujjatlashtirish | P2 | [x] |

---

# M10 · Tarqoq tizimlar va integratsiya ⭐

| # | Mavzu | P | Holat |
|---|---|---|---|
| 10.1 | CAP, PACELC, eventual consistency amalda | P1 | [x] |
| 10.2 | Dual write muammosi | P0 | [x] |
| 10.3 | Transactional Outbox — sxema, relay, monitoring | P0 | [x] |
| 10.4 | Inbox pattern va idempotent consumer | P0 | [x] |
| 10.5 | At-most / at-least / exactly-once semantikasi | P0 | [x] |
| 10.6 | Saga: choreography vs orchestration | P0 | [x] |
| 10.7 | Compensating transaction dizayni | P0 | [x] |
| 10.8 | RabbitMQ: exchange, queue, ack, DLQ, prefetch | P1 | [x] |
| 10.9 | Kafka: partition, offset, consumer group, tartib kafolati | P1 | [x] |
| 10.10 | Xabar tartibi va dublikat — real kafolatlar | P1 | [x] |
| 10.11 | Retry, exponential backoff, jitter | P0 | [x] |
| 10.12 | Circuit breaker, bulkhead, timeout (Polly) | P1 | [x] |
| 10.13 | Tashqi provayder bilan: timeout = unknown holati | P0 | [x] |
| 10.14 | Reconciliation — kunlik solishtirish jarayoni | P0 | [x] |
| 10.15 | Distributed lock (Redis, DB) va uning xavflari | P1 | [x] |
| 10.16 | Idempotency-Key API darajasida | P0 | [x] |

---

# M11 · System design — fintech ⭐

| # | Mavzu | P | Holat |
|---|---|---|---|
| 11.1 | Design intervyusining tuzilishi: talab → chegara → sxema → trade-off | P0 | [x] |
| 11.2 | Double-entry ledger — to'liq dizayn | P0 | [x] |
| 11.3 | Hisoblar rejasi (chart of accounts), hisob turlari | P1 | [x] |
| 11.4 | Wallet va balans: hisoblash, snapshot, keshlash taqiqlari | P0 | [x] |
| 11.5 | To'lov oqimi: holatlar mashinasi, `unknown` holati | P0 | [x] |
| 11.6 | Karta to'lovlari: authorization, capture, refund, chargeback | P1 | [x] |
| 11.7 | P2P o'tkazma va ikki hisobni qulflash | P0 | [x] |
| 11.8 | Rejalashtirilgan to'lovlar, obuna, retry jadvali | P2 | [x] |
| 11.9 | Anti-fraud va limit tekshiruvi (real vaqtda) | P1 | [x] |
| 11.10 | KYC oqimi va davlat bazalariga integratsiya | P1 | [x] |
| 11.11 | Hisobot va statement generatsiyasi | P2 | [x] |
| 11.12 | Kesh strategiyasi: nima mumkin, nima taqiqlangan | P1 | [x] |
| 11.13 | Masshtablash tartibi: o'lchash → indeks → kesh → replica → shard | P1 | [x] |
| 11.14 | Rate limiting algoritmlari (token bucket, sliding window) | P1 | [x] |
| 11.15 | Multi-tenancy va ma'lumot izolyatsiyasi | P2 | [x] |
| 11.16 | Notification: SMS/push, idempotentlik, narx | P2 | [x] |

---

# M12 · Testing va sifat ⭐

| # | Mavzu | P | Holat |
|---|---|---|---|
| 12.1 | Test piramidasi, nima qayerda tekshiriladi | P0 | [x] |
| 12.2 | xUnit: `Fact`, `Theory`, fixture, parallel bajarish | P0 | [x] |
| 12.3 | Yaxshi test anatomiyasi: AAA, nomlash, bitta sabab | P0 | [x] |
| 12.4 | Mock: nimani mock qilinadi, nimani yo'q (Moq/NSubstitute) | P0 | [x] |
| 12.5 | Integration test: `WebApplicationFactory` | P0 | [x] |
| 12.6 | Testcontainers: real Postgres, izolyatsiya, tozalash | P0 | [x] |
| 12.7 | **Concurrency testi — lost update'ni isbotlash** | P0 | [x] |
| 12.8 | Pul arifmetikasi testlari: chegara, qoldiq, yaxlitlash | P0 | [x] |
| 12.9 | Property-based testing (FsCheck) — ledger invarianti | P2 | [x] |
| 12.10 | Test ma'lumoti: builder, `AutoFixture`, fixture tuzog'i | P1 | [x] |
| 12.11 | Flaky testlar: sabablari va tuzatish | P1 | [x] |
| 12.12 | Coverage nimani o'lchaydi va nimani o'lchamaydi | P1 | [x] |
| 12.13 | Code review: nimaga qarayman | P1 | [x] |

---

# M13 · DevOps va kuzatuv

| # | Mavzu | P | Holat |
|---|---|---|---|
| 13.1 | Git: branching, rebase vs merge, konflikt, revert | P1 | [x] |
| 13.2 | CI pipeline bosqichlari | P1 | [x] |
| 13.3 | Docker: image, layer, multi-stage, .NET uchun optimallash | P1 | [x] |
| 13.4 | Deploy strategiyalari: rolling, blue-green, canary | P1 | [x] |
| 13.5 | Structured logging, correlation ID | P0 | [x] |
| 13.6 | Metrikalar: nimani o'lchash, p95/p99 | P1 | [x] |
| 13.7 | Distributed tracing (OpenTelemetry) | P1 | [x] |
| 13.8 | Alerting: nimaga alert qo'yiladi, nimaga yo'q | P1 | [x] |
| 13.9 | Health check, readiness/liveness, graceful shutdown | P1 | [x] |
| 13.10 | Incident: aniqlash → lokalizatsiya → rollback → postmortem | P1 | [x] |
| 13.11 | Feature flag va xavfsiz reliz | P2 | [x] |

---

# M14 · DSA

| # | Mavzu | P | Holat |
|---|---|---|---|
| 14.1 | Big-O, amortizatsiya, space-time trade-off | P1 | [x] |
| 14.2 | Arrays & Hashing — shablon va 4 masala | P1 | [x] |
| 14.3 | Two Pointers | P1 | [x] |
| 14.4 | Sliding Window | P1 | [x] |
| 14.5 | Stack va monotonic stack | P1 | [x] |
| 14.6 | Binary Search (shu jumladan javob bo'yicha) | P1 | [x] |
| 14.7 | Linked List | P1 | [x] |
| 14.8 | Trees: DFS/BFS, BST | P1 | [x] |
| 14.9 | Heap va top-K | P1 | [x] |
| 14.10 | Backtracking | P1 | [x] |
| 14.11 | Graphs: BFS/DFS, topologik, union-find | P1 | [x] |
| 14.12 | Dynamic Programming | P1 | [x] |
| 14.13 | Intervals | P1 | [x] |
| 14.14 | **65 mavjud yechimni qayta ko'rish: optimal patternmi?** | P0 | [x] |

---

# M15 · Intervyu ko'nikmalari

| # | Mavzu | P | Holat |
|---|---|---|---|
| 15.1 | STAR formati va 8 ta hikoyaning skeleti | P0 | [x] |
| 15.2 | Tajribani ularning tilida aytish (davlat tizimi → fintech) | P0 | [x] |
| 15.3 | "Eng qiyin bug" hikoyasi | P0 | [x] |
| 15.4 | "Xato qildim" hikoyasi — nima o'rgandim | P0 | [x] |
| 15.5 | "Kelishmovchilik bo'ldi" hikoyasi | P1 | [x] |
| 15.6 | Live coding: ovoz chiqarib o'ylash texnikasi | P1 | [x] |
| 15.7 | Design intervyuda savol berish ro'yxati | P1 | [x] |
| 15.8 | Bilmagan savolga to'g'ri javob berish | P0 | [x] |
| 15.9 | Kompaniyaga beriladigan savollar | P1 | [x] |
| 15.10 | Maosh muzokarasi | P1 | [x] |
| 15.11 | Mock intervyu ssenariylari va o'z-o'zini baholash | P1 | [x] |

---

## Ustuvorlik bo'yicha yozish tartibi

Agar tartib tanlashda ikkilansangiz — shu ketma-ketlik eng ko'p foyda beradi:

| Navbat | Bloklar | Nega |
|---|---|---|
| 1 | M5 (5.1–5.9), M4, M12 (12.6–12.8) | Reject sababi shu yerdan chiqadi |
| 2 | M3, M1 (1.1–1.9), M6 | Asosiy texnik round |
| 3 | M10, M11 | Senior farqlovchi |
| 4 | M7, M8 | Kundalik ish savollari |
| 5 | M9, M13, M15 | Yakuniy sayqal |
| 6 | M14 | Fon rejimida, butun davomida |

## Buyurtma shakli

- `M5.3 ni to'liq yoz` — bitta mavzu, 9 blokli standart tuzilma bilan
- `M4 ni to'liq yoz` — butun modul
- `M12.7 ni kod bilan yoz` — faqat deliverable qismiga urg'u
- `M5 (P0 larni) yoz` — moduldagi faqat P0 mavzular
