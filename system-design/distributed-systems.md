# M10 · Tarqoq tizimlar va integratsiya

Bu modul sizning **eng kuchli hikoyangiz** bilan bevosita bog'liq: «DB tranzaksiyasi
tashqi API'ni rollback qila olmasligi muammosiga duch keldim». Bu yerda o'sha
muammoning to'liq yechimi yig'ilgan.

| # | Mavzu | P |
|---|---|---|
| [10.1](#101--cap-pacelc-va-eventual-consistency) | CAP, PACELC, eventual consistency | P1 |
| [10.2](#102--dual-write-muammosi-) | Dual write muammosi ⭐ | P0 |
| [10.3](#103--transactional-outbox-) | Transactional Outbox ⭐ | P0 |
| [10.4](#104--inbox-va-idempotent-consumer-) | Inbox va idempotent consumer ⭐ | P0 |
| [10.5](#105--yetkazish-semantikasi-) | Yetkazish semantikasi ⭐ | P0 |
| [10.6](#106--saga-) | Saga ⭐ | P0 |
| [10.7](#107--compensating-transaction) | Compensating transaction | P0 |
| [10.8](#108--rabbitmq) | RabbitMQ | P1 |
| [10.9](#109--kafka) | Kafka | P1 |
| [10.10](#1010--xabar-tartibi-va-dublikat) | Xabar tartibi va dublikat | P1 |
| [10.11](#1011--retry-backoff-jitter) | Retry, backoff, jitter | P0 |
| [10.12](#1012--circuit-breaker-bulkhead-timeout) | Circuit breaker, bulkhead, timeout | P1 |
| [10.13](#1013--timeout--unknown-) | Timeout = unknown ⭐ | P0 |
| [10.14](#1014--reconciliation-) | Reconciliation ⭐ | P0 |
| [10.15](#1015--distributed-lock) | Distributed lock | P1 |
| [10.16](#1016--idempotency-key-api-darajasida-) | Idempotency-Key API darajasida ⭐ | P0 |

---

# 10.1 · CAP, PACELC va eventual consistency

## CAP teoremasi

```
   Tarmoq bo'linishi (Partition) sodir bo'lganda TANLASH kerak:

                    ┌─────────────┐
                    │      C      │  Consistency
                    │  (hamma bir │
                    │  xil ko'radi)│
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────▼──────┐          ┌───────▼─────┐
       │      A      │          │      P      │
       │Availability │          │  Partition  │
       │ (javob bor) │          │  tolerance  │
       └─────────────┘          └─────────────┘

   ⚠ P — TANLOV EMAS. Tarmoq bo'linishi HAR DOIM bo'ladi.
     Haqiqiy tanlov: bo'linish paytida C yoki A.
```

```
   CP  — bo'linishda javob BERMAYDI, lekin noto'g'ri ma'lumot ham bermaydi
         PostgreSQL (sinxron replika), etcd, ZooKeeper

   AP  — bo'linishda javob BERADI, lekin ma'lumot eskirgan bo'lishi mumkin
         Cassandra, DynamoDB (sozlanadi), DNS
```

> **Fintech'da odatda CP**: balans noto'g'ri bo'lgandan ko'ra, javob bermagan
> yaxshiroq.

## PACELC — to'liqroq model

```
   if (Partition)  →  choose (Availability | Consistency)
   Else            →  choose (Latency     | Consistency)
                       ▲
                       └── CAP bu qismni HISOBGA OLMAYDI

   Amalda tizim vaqtining 99.9% da bo'linish YO'Q,
   lekin kechikish va muvofiqlik orasidagi tanlov HAR DOIM bor.

   Misol: sinxron replikatsiya (M5.15)
   · C ni tanlaydi → har commit replikani kutadi → L oshadi
   · L ni tanlaydi → asinxron → failover'da ma'lumot yo'qolishi mumkin
```

## Muvofiqlik modellari

```
   ┌─ Strong consistency ────────────────────────────────────────┐
   │  Yozgandan keyin HAMMA darhol yangi qiymatni ko'radi        │
   │  → bitta DB, sinxron replika                                 │
   ├─ Read-your-writes ──────────────────────────────────────────┤
   │  O'ZINGIZ yozganingizni darhol ko'rasiz, boshqalar kechroq   │
   │  → sticky session yoki primary'dan o'qish (M5.15)            │
   ├─ Monotonic reads ───────────────────────────────────────────┤
   │  Ma'lumot ORQAGA ketmaydi                                    │
   ├─ Eventual consistency ──────────────────────────────────────┤
   │  Vaqt o'tishi bilan hamma bir xil ko'radi                    │
   │  → replika, kesh, proyeksiya                                 │
   └──────────────────────────────────────────────────────────────┘
```

## Fintech'da qayerda nima

```
   ┌──────────────────────────┬──────────────────────────────────┐
   │  STRONG consistency      │  EVENTUAL consistency mumkin     │
   ├──────────────────────────┼──────────────────────────────────┤
   │  Balans                  │  Tranzaksiyalar tarixi           │
   │  Limit tekshiruvi        │  Hisobotlar, analitika           │
   │  Idempotency kaliti      │  Notification                    │
   │  Ledger yozuvlari        │  Qidiruv indeksi                 │
   └──────────────────────────┴──────────────────────────────────┘

   Qoida: PUL HARAKATI — strong · KO'RSATISH — eventual mumkin
```

## Intervyu savollari

**1. CAP teoremasini tushuntiring.**

> Tarmoq bo'linishi sodir bo'lganda muvofiqlik va mavjudlik orasida tanlash kerak.
>
> Muhim nuans: **P tanlov emas** — tarmoq bo'linishi har doim bo'ladi. Haqiqiy
> tanlov bo'linish paytida C yoki A.
>
> Fintech'da odatda **CP**: balans noto'g'ri bo'lgandan ko'ra, javob bermagan
> yaxshiroq. Foydalanuvchi qayta urinishi mumkin, noto'g'ri pul yechish esa
> tuzatib bo'lmaydigan muammo.

**2. PACELC nima qo'shadi?**

> CAP faqat bo'linish paytini ko'radi. Lekin tizim vaqtining 99.9% da bo'linish
> yo'q — va o'sha paytda ham **kechikish va muvofiqlik** orasida tanlov bor.
>
> Amaliy misol: sinxron replikatsiya muvofiqlikni tanlaydi va kechikishni oshiradi;
> asinxron teskarisini qiladi va failover'da ma'lumot yo'qolishi mumkin.
>
> PACELC bu tanlovni ochiq qiladi.

**3. Qayerda eventual consistency qabul qilinadi?**

> **Ko'rsatish** uchun: tranzaksiyalar tarixi, hisobotlar, notification, qidiruv
> indeksi — bir necha soniyalik kechikish zarar qilmaydi.
>
> **Pul harakati** uchun — hech qachon: balans, limit tekshiruvi, idempotency
> kaliti, ledger yozuvlari **strong consistency** talab qiladi.
>
> Chegara sodda: shu ma'lumot bo'yicha **qaror qabul qilinadimi**? Ha bo'lsa —
> strong.

## Xotira kartasi

```
CAP          bo'linishda C yoki A tanlanadi
             ⚠ P TANLOV EMAS — bo'linish har doim bo'ladi
CP           javob bermaydi, lekin noto'g'ri ma'lumot ham bermaydi (fintech)
AP           javob beradi, ma'lumot eskirgan bo'lishi mumkin
PACELC       bo'linish YO'Q paytda ham: Latency vs Consistency
             CAP bu qismni hisobga olmaydi
Modellar     strong · read-your-writes · monotonic reads · eventual
Fintech      PUL HARAKATI → strong · KO'RSATISH → eventual mumkin
Chegara      "shu ma'lumot bo'yicha QAROR qabul qilinadimi?"
```

---

# 10.2 · Dual write muammosi ⭐

## Nima va nega

Ikki alohida tizimga yozish — DB va broker — **umumiy tranzaksiyasiz**. Ular
orasida nima bo'lsa ham, natija nomuvofiq.

```
   ❌ DUAL WRITE — to'rt xil buzilish yo'li

   Variant 1: avval DB, keyin broker
   ┌────────────────────────────────────────────────────────┐
   │  1. db.SaveChangesAsync()     ✓ COMMIT                 │
   │  2. ⚠ process crash / broker yiqildi                   │
   │  3. bus.PublishAsync()        ✗ BAJARILMADI            │
   │                                                          │
   │  → To'lov DB'da bor, boshqa servislar BILMAYDI          │
   │  → Hech qanday xato yo'q, tizim JIMGINA nomuvofiq       │
   └────────────────────────────────────────────────────────┘

   Variant 2: avval broker, keyin DB
   ┌────────────────────────────────────────────────────────┐
   │  1. bus.PublishAsync()        ✓                        │
   │  2. ⚠ DB constraint xatosi / crash                     │
   │  3. db.SaveChangesAsync()     ✗ ROLLBACK               │
   │                                                          │
   │  → Servislar bo'lmagan to'lov haqida xabar oldi         │
   │  → Ledger yozuvi yo'q, lekin notification ketdi         │
   └────────────────────────────────────────────────────────┘
```

```
   Variant 3: publish muvaffaqiyatli, lekin ack yo'qoldi
   → publish qayta chaqiriladi → DUBLIKAT

   Variant 4: tranzaksiya ichida publish
   → rollback bo'lsa xabar QAYTMAYDI (broker rollback bilmaydi)
```

## Nega bu jimgina xavfli

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Bu xato TEST MUHITIDA deyarli ko'rinmaydi:                   │
   │  · broker doim ishlaydi                                       │
   │  · crash bo'lmaydi                                            │
   │  · yuk past                                                   │
   │                                                                │
   │  Production'da esa u KUNIGA bir necha marta sodir bo'ladi     │
   │  va nomuvofiqlik ASTA-SEKIN to'planadi                        │
   └──────────────────────────────────────────────────────────────┘
```

## Nima yordam bermaydi

```csharp
// ❌ try/catch — xabar yuborilmaganini bilamiz, lekin DB commit bo'lgan
try { await bus.PublishAsync(evt); }
catch { logger.LogError("Xabar yuborilmadi"); }   // va nima qilamiz?

// ❌ Tranzaksiya ichida publish — broker rollback'ni bilmaydi
using var tx = await db.Database.BeginTransactionAsync();
await db.SaveChangesAsync();
await bus.PublishAsync(evt);        // yuborildi
await tx.CommitAsync();             // agar bu yerda xato bo'lsa — kech

// ❌ Distributed transaction (2PC) — amalda ishlatilmaydi
//    koordinator yiqilsa qulflar osilib qoladi,
//    ko'p broker uni qo'llab-quvvatlamaydi
```

## Yechimlar

```
   ┌─ 1. TRANSACTIONAL OUTBOX (10.3) ────────────────── ✅ standart │
   │  xabar DB'ga, biznes o'zgarishi bilan BITTA tranzaksiyada      │
   ├─ 2. Change Data Capture (CDC) ─────────────────────────────────┤
   │  Debezium WAL'ni o'qib, o'zgarishlarni brokerga uzatadi        │
   │  ✅ ilova kodiga tegmaydi                                       │
   │  ⚠ DB sxemasi = shartnoma bo'lib qoladi                        │
   ├─ 3. Event sourcing (M9.9) ─────────────────────────────────────┤
   │  hodisa yagona haqiqat manbai → dual write yo'q                │
   │  ⚠ butun arxitekturani o'zgartiradi                            │
   └────────────────────────────────────────────────────────────────┘
```

## Intervyu savollari

**1. Dual write muammosi nima?** ⭐

> Ikki alohida tizimga yozish — DB va broker — umumiy tranzaksiyasiz. Ular orasida
> crash bo'lsa tizim **jimgina nomuvofiq** holatga tushadi.
>
> To'rt xil buzilish yo'li bor: DB commit bo'lib publish bajarilmasligi; publish
> bo'lib DB rollback bo'lishi; ack yo'qolib dublikat yuborilishi; va tranzaksiya
> ichida publish qilinganda rollback xabarni qaytara olmasligi.
>
> Eng xavflisi — **hech qanday xato ko'rinmaydi** va bu test muhitida deyarli
> takrorlanmaydi.

**2. `try/catch` yordam beradimi?**

> Yo'q. U faqat «xabar yuborilmadi» degan faktni bildiradi, lekin DB commit
> allaqachon bo'lgan va uni qaytarib bo'lmaydi.
>
> Nima qilish kerak? Retry qilsak — jarayon yiqilsa u ham yo'qoladi. Rollback
> qilsak — commit bo'lib bo'lgan.
>
> Muammo tuzilishda, xato ishlashda emas.

**3. 2PC (ikki fazali commit) ishlatasizmi?**

> Amalda yo'q. Koordinator yiqilsa qulflar osilib qoladi, ko'p broker (Kafka,
> RabbitMQ) uni to'liq qo'llab-quvvatlamaydi, va u tizimni sezilarli
> sekinlashtiradi.
>
> Sanoat standarti — **outbox pattern**: muammoni bitta DB tranzaksiyasiga
> qaytarish.

## Xotira kartasi

```
Muammo       DB va broker — ikki alohida tizim, umumiy tranzaksiya YO'Q
4 buzilish   DB commit + publish yo'q → servislar bilmaydi
             publish + DB rollback → bo'lmagan hodisa yuborildi
             ack yo'qoldi → dublikat
             tranzaksiya ichida publish → rollback xabarni qaytarmaydi
Xavfi        HECH QANDAY XATO KO'RINMAYDI · test muhitida takrorlanmaydi
             production'da asta-sekin to'planadi
Yordam bermaydi  try/catch · tranzaksiya ichida publish · 2PC
Yechim       1. OUTBOX (standart)  2. CDC/Debezium  3. event sourcing
```

---

# 10.3 · Transactional Outbox ⭐

## Nima va nega

Muammoni **bitta DB tranzaksiyasiga qaytarish**: xabar ham o'sha DB'ga, o'sha
tranzaksiyada yoziladi. Atomiklik DB'ning o'z kafolati bilan ta'minlanadi.

```
   ┌─────────────── BITTA TRANZAKSIYA ────────────────┐
   │                                                    │
   │   INSERT INTO payments      (biznes o'zgarishi)   │
   │   INSERT INTO outbox        (xabar)               │
   │                                                    │
   │   COMMIT  →  ikkalasi ham, yoki HECH BIRI          │
   └────────────────────┬───────────────────────────────┘
                        │
                        │  (alohida jarayon)
                        ▼
              ┌──────────────────┐
              │  Outbox Relay    │  published_at IS NULL bo'lganlarni o'qiydi
              └────────┬─────────┘
                       │
                       ▼
                 ┌──────────┐
                 │  Broker  │  → at-least-once
                 └──────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  Consumer        │  ⚠ IDEMPOTENT bo'lishi SHART (10.4)
              └──────────────────┘
```

## Sxema

```sql
CREATE TABLE outbox (
    id             uuid PRIMARY KEY,
    aggregate_type text NOT NULL,              -- payment, account
    aggregate_id   text NOT NULL,
    event_type     text NOT NULL,              -- payment.completed
    payload        jsonb NOT NULL,
    headers        jsonb,                      -- correlation_id, tenant
    created_at     timestamptz NOT NULL DEFAULT now(),
    published_at   timestamptz,
    attempts       int NOT NULL DEFAULT 0,
    last_error     text
);

-- ⚠ Partial indeks — faqat yuborilmaganlar (M5.8)
CREATE INDEX ix_outbox_pending ON outbox (created_at)
WHERE published_at IS NULL;
```

## Yozish

```csharp
// SaveChanges override'da — avtomatik va unutilmaydi (M6.4, M9.7)
public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
{
    var events = ChangeTracker.Entries<IHasDomainEvents>()
        .SelectMany(e => e.Entity.PopEvents())
        .Select(IntegrationEventMapper.Map)
        .ToList();

    Outbox.AddRange(events);          // ⚠ o'sha tranzaksiyada
    return await base.SaveChangesAsync(ct);
}
```

## Relay

```csharp
public sealed class OutboxRelay(IServiceScopeFactory factory, ILogger<OutboxRelay> log)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var published = await PublishBatchAsync(stoppingToken);
                await Task.Delay(published == 0 ? 1000 : 50, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                log.LogError(ex, "Outbox relay iteratsiyasi yiqildi");   // ⚠ sikl davom etsin (M7.10)
                await Task.Delay(5000, stoppingToken);
            }
        }
    }

    private async Task<int> PublishBatchAsync(CancellationToken ct)
    {
        using var scope = factory.CreateScope();           // ⚠ har iteratsiyada
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var bus = scope.ServiceProvider.GetRequiredService<IMessageBus>();

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // ⚠ SKIP LOCKED — bir necha instance parallel ishlaydi (M5.4)
        var batch = await db.Outbox
            .FromSql($"""
                SELECT * FROM outbox
                WHERE published_at IS NULL
                ORDER BY created_at
                LIMIT 100
                FOR UPDATE SKIP LOCKED
                """)
            .ToListAsync(ct);

        foreach (var msg in batch)
        {
            // Boshlangan xabarni tugatamiz — None bilan (M3.5)
            await bus.PublishAsync(msg.EventType, msg.Payload, msg.Headers, CancellationToken.None);
            msg.PublishedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(CancellationToken.None);
        await tx.CommitAsync(CancellationToken.None);
        return batch.Count;
    }
}
```

## Nima uchun at-least-once

```
   Relay publish qildi → PublishedAt yozishdan OLDIN yiqildi
        │
        └──► keyingi iteratsiyada xabar YANA yuboriladi

   ⚠ Buni yo'q qilib bo'lmaydi — bu tuzilmaviy xususiyat.
     → CONSUMER IDEMPOTENT bo'lishi SHART (10.4)
```

## Operatsion masalalar

```
   ┌─ MONITORING (majburiy) ─────────────────────────────────────┐
   │  · yuborilmagan xabarlar SONI (o'ssa — relay to'xtagan)      │
   │  · eng eski yuborilmagan xabar YOSHI (lag)                   │
   │  · attempts > N bo'lgan xabarlar (dead letter nomzodlari)    │
   ├─ TOZALASH ──────────────────────────────────────────────────┤
   │  published_at IS NOT NULL AND created_at < now() - 7 days    │
   │  → o'chiriladi yoki arxivga ko'chiriladi                     │
   │  ⚠ jadval cheksiz o'sishi mumkin emas                        │
   ├─ TARTIB ────────────────────────────────────────────────────┤
   │  created_at bo'yicha ORDER BY — lekin SKIP LOCKED bilan      │
   │  tartib KAFOLATLANMAYDI                                       │
   │  → tartib muhim bo'lsa: aggregate_id bo'yicha partition      │
   └──────────────────────────────────────────────────────────────┘
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Outbox'ni alohida tranzaksiyada yozish | Dual write muammosi qaytadi |
| `SKIP LOCKED` ishlatmaslik | Instance'lar bir-birini kutadi |
| Relay xatosida siklni to'xtatish | Xabarlar yuborilmay qoladi |
| Monitoring qo'ymaslik | Relay o'lgani bilinmaydi |
| Jadvalni tozalamaslik | Cheksiz o'sish, so'rovlar sekinlashadi |
| Consumer'ni idempotent qilmaslik | Dublikat ishlanadi |

## Intervyu savollari

**1. Outbox pattern qanday ishlaydi?** ⭐

> Xabar biznes o'zgarishi bilan **bitta DB tranzaksiyasida** `outbox` jadvaliga
> yoziladi. Shunda atomiklik DB'ning o'z kafolati bilan ta'minlanadi — ikkalasi
> ham yoziladi yoki hech biri.
>
> Alohida **relay** jarayoni yuborilmagan xabarlarni o'qib brokerga uzatadi va
> `published_at` ni belgilaydi.
>
> Narxi: kechikish (relay intervali) va **at-least-once** semantikasi — relay
> publish qilib, belgilashdan oldin yiqilsa xabar takrorlanadi.

**2. Bir necha instance bo'lsa relay qanday ishlaydi?**

> `FOR UPDATE SKIP LOCKED` bilan (M5.4): har instance band bo'lmagan qatorlarni
> oladi va hech kim kutmaydi.
>
> Usiz instance'lar bir-birini kutadi va parallellik yo'qoladi.
>
> Muhim oqibat: `SKIP LOCKED` bilan **tartib kafolatlanmaydi**. Tartib kerak bo'lsa
> `aggregate_id` bo'yicha bo'lish kerak.

**3. Outbox jadvalini qanday boshqarasiz?**

> Uch narsa majburiy:
> - **Partial indeks** `WHERE published_at IS NULL` — jadval katta bo'lsa ham
>   yuborilmaganlarni topish tez qoladi.
> - **Tozalash job'i** — yuborilgan xabarlar 7 kundan keyin o'chiriladi yoki
>   arxivga ko'chiriladi.
> - **Monitoring** — yuborilmagan xabarlar soni va eng eskisining yoshi. Bu
>   o'sayotgan bo'lsa relay to'xtagan degani, va bu alert bo'lishi kerak.

## Deliverable

```csharp
[Fact]
public async Task Payment_And_OutboxMessage_AreAtomic()
{
    await Assert.ThrowsAsync<DbUpdateException>(() => CreateInvalidPaymentAsync());

    Assert.Equal(0, await db.Payments.CountAsync());
    Assert.Equal(0, await db.Outbox.CountAsync());        // ikkalasi ham yo'q
}

[Fact]
public async Task Relay_PublishesPendingMessages()
{
    await SeedOutbox(count: 10);
    await relay.PublishBatchAsync(default);

    Assert.Equal(10, bus.PublishedMessages.Count);
    Assert.Equal(0, await db.Outbox.CountAsync(m => m.PublishedAt == null));
}

[Fact]
public async Task ParallelRelays_DoNotDuplicateWork()
{
    await SeedOutbox(count: 300);

    await Task.WhenAll(
        RelayInstance().PublishBatchAsync(default),
        RelayInstance().PublishBatchAsync(default),
        RelayInstance().PublishBatchAsync(default));

    var ids = bus.PublishedMessages.Select(m => m.Id).ToList();
    Assert.Equal(ids.Count, ids.Distinct().Count());      // dublikat yo'q
}

[Fact]
public async Task CrashAfterPublish_ResendsMessage()
{
    await SeedOutbox(count: 1);
    bus.PublishThenCrash();                               // publish bo'ldi, belgilanmadi

    await Record.ExceptionAsync(() => relay.PublishBatchAsync(default));
    await relay.PublishBatchAsync(default);               // qayta urinish

    Assert.Equal(2, bus.PublishedMessages.Count);         // ⚠ at-least-once
}
```

## Xotira kartasi

```
G'oya        xabarni O'SHA DB'ga, O'SHA tranzaksiyada yozish
             → atomiklik DB kafolati bilan
Sxema        outbox(id, event_type, payload, created_at, published_at, attempts)
             PARTIAL indeks: WHERE published_at IS NULL
Yozish       SaveChanges override — avtomatik, unutilmaydi
Relay        BackgroundService · har iteratsiyada yangi scope
             FOR UPDATE SKIP LOCKED — instance'lar parallel
             xatoda sikl TO'XTAMASIN
Semantika    AT-LEAST-ONCE — publish bo'lib belgilanmasa takrorlanadi
             → consumer IDEMPOTENT bo'lishi SHART (10.4)
Operatsion   monitoring: yuborilmagan SONI + eng eski YOSHI → ALERT
             tozalash job'i · SKIP LOCKED bilan TARTIB kafolatlanmaydi
```

---

# 10.4 · Inbox va idempotent consumer ⭐

## Nima va nega

Outbox at-least-once beradi — ya'ni **dublikat normal holat**. Consumer uni
to'g'ri ishlashi kerak.

```
   Dublikat qayerdan keladi:

   1. Relay publish qildi, belgilashdan oldin yiqildi        (10.3)
   2. Broker ack'ni olmadi va qayta yubordi
   3. Consumer ishladi, ack yuborishdan oldin yiqildi
   4. Consumer group rebalance (Kafka)

   → Ularning hech birini YO'Q QILIB BO'LMAYDI
```

## Inbox pattern

```
   ┌──────────────────── BITTA TRANZAKSIYA ─────────────────────┐
   │                                                              │
   │  1. INSERT INTO inbox (message_id)                          │
   │     ON CONFLICT DO NOTHING                                   │
   │        │                                                     │
   │        ├─ 0 qator → ALLAQACHON ishlangan → chiqamiz         │
   │        └─ 1 qator → davom etamiz                            │
   │                                                              │
   │  2. Biznes o'zgarishi (UPDATE accounts SET ...)             │
   │                                                              │
   │  COMMIT  →  ikkalasi ham, yoki hech biri                    │
   └──────────────────────────────────────────────────────────────┘

   ⚠ Tekshiruv va biznes o'zgarishi BIR TRANZAKSIYADA bo'lishi SHART.
     Alohida bo'lsa — ular orasida crash bo'lganda xabar yana ishlanadi.
```

```sql
CREATE TABLE inbox (
    message_id  uuid PRIMARY KEY,           -- ⚠ UNIQUE — poyga DB darajasida hal qilinadi
    consumer    text NOT NULL,              -- bir xabar bir necha consumer'ga borishi mumkin
    handled_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, consumer)
);
```

```csharp
public async Task HandleAsync(IntegrationEvent message, CancellationToken ct)
{
    await using var tx = await _db.Database.BeginTransactionAsync(ct);

    var inserted = await _db.Database.ExecuteSqlInterpolatedAsync($"""
        INSERT INTO inbox (message_id, consumer)
        VALUES ({message.Id}, {ConsumerName})
        ON CONFLICT DO NOTHING
        """, ct);

    if (inserted == 0)
    {
        _logger.LogDebug("Xabar allaqachon ishlangan {MessageId}", message.Id);
        return;                                    // ⚠ ack beriladi, qayta yuborilmasin
    }

    await ApplyBusinessChangeAsync(message, ct);   // o'sha tranzaksiyada
    await tx.CommitAsync(ct);
}
```

## Tabiiy idempotentlik

Ba'zi operatsiyalar **o'z-o'zidan** idempotent — u holda inbox kerak emas.

```
   ✅ Tabiiy idempotent:
   · SET status = 'completed'           (holatni o'rnatish)
   · INSERT ... ON CONFLICT DO NOTHING  (unique kalit bilan)
   · UPSERT

   ❌ Idempotent EMAS:
   · balance = balance - 100            (har chaqiruvda yana yechadi)
   · INSERT INTO ledger_entries         (har safar yangi yozuv)
   · counter++
```

```csharp
// ✅ Tabiiy idempotent — inbox kerak emas
await db.Payments
    .Where(p => p.Id == evt.PaymentId && p.Status == PaymentStatus.Processing)
    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, PaymentStatus.Completed), ct);

// ❌ Idempotent emas — inbox yoki unique constraint SHART
db.LedgerEntries.Add(new LedgerEntry(...));
```

## Inbox tozalash

```
   ⚠ Inbox jadvali cheksiz o'sadi.

   Tozalash muddati > broker'ning MAKSIMAL retry oynasidan
   (odatda 7–30 kun)

   DELETE FROM inbox WHERE handled_at < now() - interval '30 days';
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Tekshiruv va biznes o'zgarishi alohida tranzaksiyada | Xabar qayta ishlanadi |
| Dublikatda exception tashlash | Broker qayta yuboradi — cheksiz sikl |
| `message_id` ni consumer'siz saqlash | Bir xabar boshqa consumer'ga bormaydi |
| Inbox'ni tozalamaslik | Cheksiz o'sish |
| Tabiiy idempotentlikni tekshirmaslik | Ortiqcha inbox yozuvi |
| Tozalash muddatini retry oynasidan qisqa qilish | Eski dublikat qayta ishlanadi |

## Intervyu savollari

**1. Idempotent consumer'ni qanday quriladi?** ⭐

> Har xabarga barqaror `message_id` beriladi. Consumer uni `inbox` jadvaliga
> `INSERT ... ON CONFLICT DO NOTHING` bilan yozadi.
>
> 0 qator qaytsa — xabar allaqachon ishlangan, chiqib ketamiz va **ack beramiz**
> (aks holda broker qayta yuboradi).
>
> Eng muhim shart: bu tekshiruv va biznes o'zgarishi **bitta tranzaksiyada**
> bo'lishi kerak. Alohida bo'lsa, ular orasida crash bo'lganda butun mexanizm
> ma'nosiz bo'ladi.

**2. Har doim inbox kerakmi?**

> Yo'q. Ba'zi operatsiyalar **tabiiy idempotent**: `SET status = 'completed'`,
> `INSERT ... ON CONFLICT DO NOTHING`, upsert.
>
> Inbox kerak bo'ladigan holat: operatsiya idempotent bo'lmasa — `balance =
> balance - 100`, ledger yozuvi qo'shish, hisoblagich.
>
> Amalda men avval operatsiyani **idempotent qilib qayta yozishga** harakat
> qilaman — u soddaroq va tezroq.

**3. Dublikat kelganda exception tashlaysizmi?**

> Yo'q — bu xato **emas**, bu kutilgan holat. Exception tashlasam broker uni
> muvaffaqiyatsiz deb hisoblab qayta yuboradi va cheksiz sikl paydo bo'ladi.
>
> To'g'risi: jimgina chiqib ketish va **ack berish**. Kerak bo'lsa `Debug`
> darajasida log qilish.

## Deliverable

```csharp
[Fact]
public async Task DuplicateMessage_IsProcessedOnce()
{
    var message = CreateEvent(id: Guid.NewGuid());

    await handler.HandleAsync(message, default);
    await handler.HandleAsync(message, default);

    Assert.Equal(1, await db.LedgerEntries.CountAsync());
}

[Fact]
public async Task ParallelDuplicates_OnlyOneSucceeds()
{
    var message = CreateEvent(id: Guid.NewGuid());

    await Task.WhenAll(
        NewHandler().HandleAsync(message, default),
        NewHandler().HandleAsync(message, default),
        NewHandler().HandleAsync(message, default));

    Assert.Equal(1, await db.LedgerEntries.CountAsync());
}

[Fact]
public async Task FailedBusinessChange_RollsBackInboxEntry()
{
    var message = CreateEventThatViolatesConstraint();

    await Record.ExceptionAsync(() => handler.HandleAsync(message, default));

    Assert.Equal(0, await db.Inbox.CountAsync());     // qayta urinish mumkin
}

[Fact]
public async Task SameMessage_ReachesDifferentConsumers()
{
    var message = CreateEvent(id: Guid.NewGuid());

    await ledgerHandler.HandleAsync(message, default);
    await notificationHandler.HandleAsync(message, default);

    Assert.Equal(2, await db.Inbox.CountAsync());     // consumer bo'yicha ajratilgan
}
```

## Xotira kartasi

```
Sabab        outbox AT-LEAST-ONCE → dublikat NORMAL holat
Manbalar     relay crash · ack yo'qolishi · consumer crash · rebalance
Inbox        INSERT ... ON CONFLICT DO NOTHING → 0 qator = allaqachon ishlangan
             ⚠ tekshiruv + biznes o'zgarishi BITTA TRANZAKSIYADA
Kalit        PRIMARY KEY (message_id, CONSUMER) — bir xabar ko'p consumer'ga
Dublikatda   exception TASHLAMANG → jimgina chiqing va ACK bering
Tabiiy idem. SET status · ON CONFLICT DO NOTHING · upsert → inbox kerak emas
Idempotent emas  balance -= · ledger INSERT · counter++
Tozalash     muddat > broker maksimal retry oynasi (7–30 kun)
```

---

# 10.5 · Yetkazish semantikasi ⭐

## Uch variant

```
   ┌─ AT-MOST-ONCE ──────────────────────────────────────────────┐
   │  Yuborildi, ack kutilmaydi                                   │
   │  ✅ tez, dublikat yo'q                                        │
   │  ❌ xabar YO'QOLISHI mumkin                                   │
   │  → metrika, log — yo'qolsa mayli                             │
   ├─ AT-LEAST-ONCE ─────────────────────────────────────────────┤
   │  Ack olinmasa QAYTA yuboriladi                               │
   │  ✅ yo'qolmaydi                                               │
   │  ❌ DUBLIKAT bo'lishi mumkin                                  │
   │  → deyarli hamma tizim shu · fintech uchun TO'G'RI            │
   ├─ EXACTLY-ONCE ──────────────────────────────────────────────┤
   │  ⚠ YETKAZISH darajasida MAVJUD EMAS                          │
   └──────────────────────────────────────────────────────────────┘
```

## Nega exactly-once mavjud emas

```
   Yuboruvchi                            Qabul qiluvchi
       │                                       │
       │──────── xabar ───────────────────────►│
       │                                       │  ishlandi ✓
       │◄─────── ack ─────────X yo'qoldi       │
       │                                       │
   Yuboruvchi BILMAYDI:
   · xabar yetdimi va ishlandimi?
   · yoki umuman yetmadimi?

   Ikki tanlov, uchinchisi YO'Q:
   · qayta yubormaslik  → at-most-once  (yo'qolishi mumkin)
   · qayta yuborish     → at-least-once (dublikat bo'lishi mumkin)
```

```
   ┌──────────────────────────────────────────────────────────────┐
   │  AMALDA ERISHILADIGAN NARSA:                                  │
   │                                                                │
   │  at-least-once yetkazish  +  IDEMPOTENT consumer              │
   │            =  exactly-once EFFEKT                             │
   │                                                                │
   │  ⚠ "Effekt" so'zi muhim — yetkazish baribir at-least-once     │
   └──────────────────────────────────────────────────────────────┘
```

## Kafka'ning "exactly-once semantics"

```
   Kafka EOS mavjud, LEKIN u faqat KAFKA ICHIDA ishlaydi:
   · Kafka'dan o'qish → ishlash → Kafka'ga yozish
   · tranzaksion producer + consumer offset bir tranzaksiyada

   ⚠ Tashqi tizim (DB, HTTP API) aralashsa — EOS BUZILADI.
     Fintech'da consumer deyarli har doim DB'ga yozadi
     → idempotentlik baribir KERAK
```

## Ack strategiyalari

```csharp
// RabbitMQ — qo'lda ack
consumer.Received += async (_, ea) =>
{
    try
    {
        await HandleAsync(ea.Body, ct);
        channel.BasicAck(ea.DeliveryTag, multiple: false);       // ✅ ishlangach
    }
    catch (TransientException)
    {
        channel.BasicNack(ea.DeliveryTag, multiple: false, requeue: true);   // qayta
    }
    catch (Exception)
    {
        channel.BasicNack(ea.DeliveryTag, multiple: false, requeue: false);  // DLQ ga
    }
};
```

```
   ⚠ AutoAck = true — xabar yetkazilgach DARHOL ack beriladi
     → ishlash paytida crash bo'lsa xabar YO'QOLADI
     → fintech'da HECH QACHON
```

## Intervyu savollari

**1. At-least-once va exactly-once farqi nima?** ⭐

> **Exactly-once yetkazish tarmoqda mavjud emas.** Ack yo'qolishi mumkin va
> yuboruvchi xabar yetganini bilmaydi.
>
> Ikki tanlov bor: qayta yubormaslik (at-most-once — yo'qolishi mumkin) yoki qayta
> yuborish (at-least-once — dublikat bo'lishi mumkin). Uchinchisi yo'q.
>
> Amalda erishiladigan narsa: **at-least-once yetkazish + idempotent consumer =
> exactly-once effekt**. «Effekt» so'zi muhim — yetkazish baribir at-least-once
> qoladi.

**2. Kafka «exactly-once» deydi-ku?**

> Kafka EOS mavjud, lekin u faqat **Kafka ichida** ishlaydi: Kafka'dan o'qib,
> ishlab, Kafka'ga yozish — bularning hammasi bitta tranzaksiyada.
>
> Tashqi tizim aralashsa — DB'ga yozish yoki HTTP chaqiruv — kafolat buziladi.
>
> Fintech'da consumer deyarli har doim DB'ga yozadi, shuning uchun idempotentlik
> baribir kerak bo'ladi.

**3. Qaysi semantikani tanlaysiz?**

> **At-least-once + idempotent consumer** — fintech uchun yagona to'g'ri javob.
>
> At-most-once faqat yo'qolishi zarar qilmaydigan ma'lumot uchun: metrika, debug
> log.
>
> Va ack **ishlangandan keyin** beriladi. `AutoAck` ishlatilmaydi — u xabar
> yetkazilgach darhol ack beradi va ishlash paytidagi crash xabarni yo'qotadi.

## Xotira kartasi

```
At-most-once   ack kutilmaydi · tez · YO'QOLISHI mumkin · metrika/log uchun
At-least-once  ack yo'q → qayta yuboriladi · DUBLIKAT mumkin · FINTECH uchun
Exactly-once   YETKAZISH darajasida MAVJUD EMAS
Sabab          ack yo'qolsa yuboruvchi bilmaydi — ikki tanlov, uchinchisi yo'q
Amalda         at-least-once + IDEMPOTENT consumer = exactly-once EFFEKT
Kafka EOS      faqat KAFKA ICHIDA (read→process→write)
               tashqi DB/HTTP aralashsa BUZILADI
Ack            ishlangandan KEYIN · AutoAck HECH QACHON
```

---

# 10.6 · Saga ⭐

## Nima va nega

Bir necha servisga tegadigan operatsiya uchun **umumiy tranzaksiya yo'q**. Saga —
lokal tranzaksiyalar ketma-ketligi, va har biri uchun **teskari harakat**
aniqlangan.

```
   To'lov sagasi:

   ┌──────────────────┬──────────────────────────────────────┐
   │  QADAM           │  COMPENSATING (teskari harakat)      │
   ├──────────────────┼──────────────────────────────────────┤
   │  1. Limit rezerv │  limitni bo'shatish                  │
   │  2. Mablag' hold │  hold'ni bekor qilish                │
   │  3. Provayderga  │  bekor qilish so'rovi                │
   │  4. Ledger yozuv │  teskari yozuv (reversal)            │
   │  5. Notification │  — (qaytarib bo'lmaydi)              │
   └──────────────────┴──────────────────────────────────────┘

   3-qadamda xato → 2 va 1 ning kompensatsiyasi teskari tartibda
```

## Choreography

```
   Har servis event'ga reaksiya qiladi, markaziy koordinator YO'Q

   Payments ──payment.initiated──► Limits
                                     │
                                     └──limit.reserved──► Ledger
                                                            │
                                     ◄──ledger.recorded─────┘
   Payments ◄──────────────────────────────────────────────┘

   ✅ Kam bog'liqlik · servislar bir-birini bilmaydi
   ❌ Oqimni KUZATISH qiyin — u hech qayerda YOZILMAGAN
   ❌ Tsikl xavfi · debug murakkab
```

## Orchestration

```
   Markaziy koordinator qadamlarni boshqaradi

              ┌──────────────────────┐
              │  PaymentSaga         │  ← holat DB'da saqlanadi
              │  (orchestrator)      │
              └───┬────┬────┬────┬───┘
                  │    │    │    │
        ┌─────────┘    │    │    └─────────┐
        ▼              ▼    ▼              ▼
    Limits        Accounts  Provider    Ledger

   ✅ Oqim KO'RINADI va bitta joyda
   ✅ Holat saqlanadi → "bu to'lov qaysi bosqichda?" savoliga javob bor
   ✅ Debug va qo'lda aralashish mumkin
   ❌ Markaziy nuqta · koordinator murakkablashadi
```

> **Fintech'da odatda orchestration** — chunki «bu pul hozir qayerda?» degan
> savolga javob bera olish talab qilinadi.

## Saga holati

```sql
CREATE TABLE payment_sagas (
    id             uuid PRIMARY KEY,
    payment_id     uuid NOT NULL,
    current_step   text NOT NULL,        -- limit_reserved, provider_called, ...
    status         text NOT NULL,        -- running, completed, compensating, failed
    payload        jsonb NOT NULL,
    completed_steps jsonb NOT NULL DEFAULT '[]',   -- kompensatsiya uchun
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL,
    version        int NOT NULL DEFAULT 0          -- optimistic lock (M5.5)
);
```

```csharp
public sealed class PaymentSaga(ISagaRepository repo, IStepExecutor executor)
{
    private static readonly SagaStep[] Steps =
    [
        new("reserve_limit",  ReserveLimitAsync,  ReleaseLimitAsync),
        new("hold_funds",     HoldFundsAsync,     ReleaseHoldAsync),
        new("call_provider",  CallProviderAsync,  CancelProviderAsync),
        new("record_ledger",  RecordLedgerAsync,  ReverseLedgerAsync)
    ];

    public async Task<Result> ExecuteAsync(Guid sagaId, CancellationToken ct)
    {
        var saga = await repo.GetAsync(sagaId, ct);

        foreach (var step in Steps.Skip(saga.CompletedSteps.Count))
        {
            var result = await executor.RunAsync(step.Forward, saga, ct);

            if (!result.IsSuccess)
            {
                await CompensateAsync(saga, ct);        // teskari tartibda
                return Result.Fail(result.Error!);
            }

            saga.MarkCompleted(step.Name);
            await repo.SaveAsync(saga, ct);             // ⚠ har qadamdan keyin
        }

        saga.Complete();
        await repo.SaveAsync(saga, ct);
        return Result.Ok();
    }

    private async Task CompensateAsync(PaymentSagaState saga, CancellationToken ct)
    {
        saga.StartCompensating();

        foreach (var step in saga.CompletedSteps.AsEnumerable().Reverse())   // ⚠ TESKARI
        {
            await executor.RunAsync(Steps.First(s => s.Name == step).Backward, saga, ct);
            saga.MarkCompensated(step);
            await repo.SaveAsync(saga, ct);
        }
    }
}
```

## Muhim xususiyatlar

```
   ┌──────────────────────────────────────────────────────────────┐
   │  1. Har qadam IDEMPOTENT bo'lishi shart                       │
   │     (saga qayta ishga tushishi mumkin)                        │
   │  2. Holat HAR QADAMDAN KEYIN saqlanadi                        │
   │     (crash bo'lsa qayerdan davom etishni bilish uchun)        │
   │  3. Kompensatsiya TESKARI tartibda                            │
   │  4. Kompensatsiyaning O'ZI ham xato berishi mumkin            │
   │     → retry + oxirida QO'LDA ARALASHUV navbati                │
   │  5. Qaytarib bo'lmaydigan qadamlar OXIRIDA                    │
   │     (SMS yuborilgan — uni qaytarib bo'lmaydi)                 │
   └──────────────────────────────────────────────────────────────┘
```

## Saga ≠ tranzaksiya

```
   ⚠ Saga ACID EMAS:

   · Atomicity   — qismli (kompensatsiya bilan)
   · Consistency — EVENTUAL
   · Isolation   — YO'Q ← eng muhim farq
   · Durability  — bor

   Isolation yo'qligining oqibati:
   saga o'rtasida boshqa operatsiya oraliq holatni KO'RADI

   Misol: hold qo'yilgan, lekin ledger yozuvi hali yo'q
          → balans hisobotida farq ko'rinadi

   Yechim: oraliq holatni MODELLASHTIRISH (pending, on_hold)
           va UI'da ochiq ko'rsatish
```

## Intervyu savollari

**1. Saga nima va qachon kerak?** ⭐

> Bir necha servis yoki aggregate'ga tegadigan operatsiya uchun umumiy tranzaksiya
> yo'q. Saga — **lokal tranzaksiyalar ketma-ketligi**, va har biri uchun teskari
> harakat (compensating transaction) aniqlangan.
>
> Rollback yo'q — uning o'rniga «pulni qaytar», «bronni bekor qil» kabi **yangi
> harakatlar** bajariladi.
>
> Kerak bo'ladigan holat: mikroservislar, yoki bitta tizimda tashqi provayder
> aralashganda.

**2. Choreography va orchestration — qaysi birini?** ⭐

> **Choreography** — servislar event'larga reaksiya qiladi, markaz yo'q. Kam
> bog'liqlik, lekin oqim hech qayerda yozilmagan va uni kuzatish qiyin.
>
> **Orchestration** — markaziy koordinator, holati DB'da saqlanadi.
>
> Fintech'da men **orchestration** tanlayman: «bu pul hozir qaysi bosqichda?»
> degan savolga javob bera olish kerak, va qo'lda aralashish imkoni bo'lishi shart.
> Choreography'da bu deyarli imkonsiz.

**3. Saga tranzaksiyani almashtiradimi?**

> Yo'q va bu muhim farq. Saga ACID emas — ayniqsa **isolation yo'q**.
>
> Bu shuni anglatadiki, saga o'rtasida boshqa operatsiya **oraliq holatni ko'radi**:
> hold qo'yilgan, lekin ledger yozuvi hali yo'q.
>
> Shuning uchun oraliq holatlar ochiq **modellashtiriladi** (`pending`, `on_hold`)
> va UI'da ko'rsatiladi. Ularni yashirish — nomuvofiqlik illyuziyasini yaratadi.

**4. Kompensatsiya xato bersa nima qilasiz?**

> Retry qilaman, lekin cheklangan marta. Muvaffaqiyatsiz bo'lsa saga `failed`
> holatiga o'tadi va **qo'lda aralashuv navbatiga** tushadi.
>
> Fintech'da bu normal jarayon: har kuni bir necha operatsiya operator tomonidan
> qo'lda hal qilinadi. Muhimi — ular **ko'rinadigan** bo'lishi va yo'qolib
> ketmasligi.

## Deliverable

```csharp
[Fact]
public async Task FailedStep_CompensatesInReverseOrder()
{
    provider.FailNextCall();
    var result = await saga.ExecuteAsync(sagaId, default);

    Assert.False(result.IsSuccess);
    Assert.Equal(["release_hold", "release_limit"], compensationLog);   // teskari
}

[Fact]
public async Task Saga_ResumesAfterCrash()
{
    await saga.ExecuteStepsAsync(sagaId, upTo: "hold_funds", default);
    // crash simulyatsiyasi — yangi instance

    await NewSagaInstance().ExecuteAsync(sagaId, default);

    Assert.Equal(1, provider.CallCount);         // oldingi qadamlar takrorlanmadi
}

[Fact]
public async Task EachStep_IsIdempotent()
{
    await saga.ExecuteAsync(sagaId, default);
    await saga.ExecuteAsync(sagaId, default);    // qayta ishga tushirish

    Assert.Equal(1, await db.LedgerEntries.CountAsync(e => e.SagaId == sagaId));
}

[Fact]
public async Task IntermediateState_IsVisible()
{
    var task = saga.ExecuteAsync(sagaId, default);
    await provider.WaitForCallAsync();

    var state = await repo.GetAsync(sagaId, default);
    Assert.Equal("provider_called", state.CurrentStep);   // holat ko'rinadi

    provider.Complete();
    await task;
}
```

## Xotira kartasi

```
Saga         lokal tranzaksiyalar ketma-ketligi + TESKARI harakatlar
             rollback YO'Q → compensating transaction (yangi harakat)
Choreography event'lar · markaz yo'q · kam bog'liqlik
             ❌ oqim KUZATILMAYDI, hech qayerda yozilmagan
Orchestration markaziy koordinator · holat DB'da
             ✅ oqim ko'rinadi · qo'lda aralashish mumkin → FINTECH
Shartlar     har qadam IDEMPOTENT · holat HAR QADAMDAN KEYIN saqlanadi
             kompensatsiya TESKARI tartibda
             qaytarib bo'lmaydigan qadamlar OXIRIDA
Saga ≠ ACID  ISOLATION YO'Q → oraliq holat ko'rinadi
             → oraliq holatlarni MODELLASHTIRING (pending, on_hold)
Kompensatsiya  o'zi ham xato berishi mumkin → retry + QO'LDA ARALASHUV navbati
```

---

# 10.7 · Compensating transaction

## Nima va nega

Kompensatsiya — **rollback emas**. Bu yangi biznes harakati, va u tarixda qoladi.

```
   ROLLBACK (DB)                    COMPENSATION (saga)
   ┌────────────────────┐          ┌────────────────────┐
   │ o'zgarish YO'Q     │          │ ikkala harakat ham │
   │ qilingandek bo'ladi│          │ TARIXDA qoladi     │
   │                    │          │                    │
   │ hech kim ko'rmagan │          │ oraliqda BOSHQALAR │
   │                    │          │ ko'rgan bo'lishi   │
   │                    │          │ mumkin             │
   └────────────────────┘          └────────────────────┘
```

## Ledger'da kompensatsiya

```
   ❌ Yozuvni o'chirish yoki o'zgartirish — TAQIQLANGAN (M5.11)

   ✅ REVERSAL — teskari yozuv qo'shiladi:

   ┌──────────┬──────────────┬────────┬────────┬─────────────────┐
   │ entry    │ tx           │ hisob  │ DR/CR  │ izoh            │
   ├──────────┼──────────────┼────────┼────────┼─────────────────┤
   │ e-9001   │ tx-4471      │ Ali    │ DR 800 │ asl operatsiya  │
   │ e-9002   │ tx-4471      │ Vali   │ CR 800 │                 │
   │ e-9003   │ tx-4471-rev  │ Ali    │ CR 800 │ REVERSAL        │
   │ e-9004   │ tx-4471-rev  │ Vali   │ DR 800 │ (asl: tx-4471)  │
   └──────────┴──────────────┴────────┴────────┴─────────────────┘

   → balans tiklandi, LEKIN tarix to'liq ko'rinadi
   → auditor "nima bo'lganini" ko'ra oladi
```

```csharp
public async Task<Result> ReverseAsync(Guid transactionId, string reason, CancellationToken ct)
{
    var original = await _ledger.GetEntriesAsync(transactionId, ct);
    if (original.Count == 0) return Result.Fail("Tranzaksiya topilmadi");

    // ⚠ Idempotentlik: allaqachon reversal qilinganmi?
    if (await _ledger.HasReversalAsync(transactionId, ct))
        return Result.Ok();

    var reversalId = Guid.NewGuid();
    foreach (var entry in original)
        _ledger.Add(entry.Reverse(reversalId, reason));    // DR ↔ CR almashadi

    await _uow.SaveChangesAsync(ct);
    return Result.Ok();
}
```

## Kompensatsiya qilib bo'lmaydigan harakatlar

```
   ┌──────────────────────────┬──────────────────────────────────┐
   │  Qaytarish MUMKIN        │  Qaytarish MUMKIN EMAS           │
   ├──────────────────────────┼──────────────────────────────────┤
   │  Ledger yozuvi (reversal)│  Yuborilgan SMS / email          │
   │  Limit rezervi           │  Ko'rsatilgan ma'lumot           │
   │  Hold (mablag' bandligi) │  Tashqi tizimga yuborilgan fayl  │
   │  Provayder tranzaksiyasi │  Uchinchi tomonga oshkor qilingan│
   │  (bekor qilish API'si)   │  ma'lumot                        │
   └──────────────────────────┴──────────────────────────────────┘

   ⚠ QOIDA: qaytarib bo'lmaydigan qadamlar sagada OXIRIDA turadi.
     Aks holda kompensatsiya to'liq bo'lmaydi.
```

## Semantik kompensatsiya

```
   Ba'zan aniq teskari harakat yo'q — biznes qaroriga aylanadi:

   · Buyurtma bekor qilindi, lekin tovar yuborilgan
     → qaytarish jarayoni boshlanadi (yangi biznes oqimi)

   · Pul o'tkazildi, lekin qabul qiluvchi hisobi yopilgan
     → mablag' "kutish" hisobiga o'tadi, operator hal qiladi

   · Komissiya olindi, keyin operatsiya bekor qilindi
     → komissiya qaytariladimi? BIZNES QARORI (shartnomada)
```

## Kompensatsiya xato berganda

```
   ┌──────────────────────────────────────────────────────────────┐
   │  1. Retry (backoff bilan, cheklangan marta)                   │
   │  2. Muvaffaqiyatsiz bo'lsa → saga "failed" holatiga            │
   │  3. QO'LDA ARALASHUV navbatiga tushadi                        │
   │  4. Operator hal qiladi va harakati AUDIT'ga yoziladi (M8.13) │
   │                                                                │
   │  ⚠ Bu NORMAL jarayon — har kuni bir necha operatsiya          │
   │    qo'lda hal qilinadi. Muhimi: ular KO'RINADIGAN bo'lsin.    │
   └──────────────────────────────────────────────────────────────┘
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Ledger yozuvini o'chirish | Audit buziladi, tarix yo'qoladi |
| Kompensatsiyani idempotent qilmaslik | Ikki marta qaytariladi |
| Qaytarib bo'lmaydigan qadamni oldinga qo'yish | Kompensatsiya to'liq bo'lmaydi |
| Kompensatsiya xatosini e'tiborsiz qoldirish | Pul «osilib» qoladi |
| Qo'lda aralashuv navbati yo'q | Muammo ko'rinmaydi |
| Komissiya siyosatini aniqlamaslik | Nizolar |

## Intervyu savollari

**1. Compensating transaction rollback bilan bir xilmi?** ⭐

> Yo'q. Rollback'dan keyin o'zgarish **umuman bo'lmagandek** bo'ladi — hech kim
> uni ko'rmagan.
>
> Kompensatsiya — **yangi biznes harakati**: ikkala harakat ham tarixda qoladi, va
> oraliqda boshqalar asl holatni ko'rgan bo'lishi mumkin.
>
> Fintech'da bu aynan kerakli xatti-harakat: ledger append-only, xato bo'lsa
> **reversal** yozuvi qo'shiladi va auditor nima bo'lganini ko'radi.

**2. Qaytarib bo'lmaydigan harakat bo'lsa nima qilasiz?**

> Ikki qoida.
>
> Birinchi — ularni sagada **oxiriga** qo'yish: SMS yuborish, fayl uzatish
> muvaffaqiyatli bo'lganidan keyin bajariladi.
>
> Ikkinchi — agar baribir kerak bo'lsa, **semantik kompensatsiya** yoziladi: tovar
> yuborilgan bo'lsa qaytarish jarayoni boshlanadi, bu yangi biznes oqimi.
>
> Ba'zi holatlarda javob — qo'lda aralashuv, va bu ham to'g'ri javob.

**3. Kompensatsiyaning o'zi xato bersa?**

> Retry qilaman, cheklangan marta va backoff bilan. Muvaffaqiyatsiz bo'lsa saga
> `failed` holatiga o'tadi va **qo'lda aralashuv navbatiga** tushadi.
>
> Fintech'da bu normal jarayon: har kuni bir necha operatsiya operator tomonidan
> hal qilinadi. Muhimi — ular **ko'rinadigan** bo'lishi, alert berishi va
> operatorning harakati audit log'ga tushishi.

## Deliverable

```csharp
[Fact]
public async Task Reversal_RestoresBalanceButKeepsHistory()
{
    var txId = await TransferAsync(from, to, Money.FromMajor(800m, Currency.Uzs));
    var balanceAfter = await GetBalanceAsync(from);

    await ledger.ReverseAsync(txId, "operator tuzatishi", default);

    Assert.Equal(initialBalance, await GetBalanceAsync(from));      // tiklandi
    Assert.Equal(4, await db.LedgerEntries.CountAsync());          // 2 asl + 2 reversal
    Assert.Equal(0, await LedgerDeltaAsync());                     // Δ = 0
}

[Fact]
public async Task Reversal_IsIdempotent()
{
    var txId = await TransferAsync(from, to, amount);

    await ledger.ReverseAsync(txId, "reason", default);
    await ledger.ReverseAsync(txId, "reason", default);

    Assert.Equal(4, await db.LedgerEntries.CountAsync());          // 6 emas
}

[Fact]
public async Task LedgerEntries_CannotBeDeleted()
    => await Assert.ThrowsAsync<PostgresException>(
           () => RawSqlAsync("DELETE FROM ledger_entries"));

[Fact]
public async Task FailedCompensation_GoesToManualQueue()
{
    provider.FailCancellation();
    await saga.ExecuteAsync(sagaId, default);

    var state = await repo.GetAsync(sagaId, default);
    Assert.Equal(SagaStatus.Failed, state.Status);
    Assert.Single(await db.ManualInterventionQueue.ToListAsync());
}
```

## Xotira kartasi

```
Kompensatsiya  ROLLBACK EMAS — yangi biznes harakati
               ikkala harakat TARIXDA qoladi
Ledger         yozuv o'chirilmaydi → REVERSAL (DR ↔ CR almashadi)
               balans tiklanadi, tarix to'liq ko'rinadi
Idempotent     "allaqachon reversal qilinganmi?" tekshiruvi SHART
Qaytarib bo'lmaydigan  SMS · ko'rsatilgan ma'lumot · yuborilgan fayl
               → sagada OXIRIDA turadi
Semantik komp. aniq teskari harakat yo'q → yangi biznes oqimi
               (tovar qaytarish, kutish hisobiga o'tkazish)
Xato berganda  retry → saga failed → QO'LDA ARALASHUV navbati
               bu NORMAL jarayon · ko'rinadigan va audit'ga yoziladigan bo'lsin
```

---

# 10.8 · RabbitMQ

## Model

```
   Producer ──► EXCHANGE ──routing──► QUEUE ──► Consumer
                   │
                   ├─ direct   — aniq routing key mos kelishi
                   ├─ topic    — naqsh: payment.*.completed
                   ├─ fanout   — hamma navbatga
                   └─ headers  — header bo'yicha

   ⚠ Producer QUEUE'ni bilmaydi — u faqat EXCHANGE'ga yozadi.
     Bog'lanish (binding) alohida sozlanadi.
```

```
   Kafka'dan asosiy farq:
   · RabbitMQ'da xabar ISHLANGACH O'CHADI (smart broker, dumb consumer)
   · Kafka'da xabar LOG'da QOLADI (dumb broker, smart consumer)
```

## Ishonchlilik sozlamalari

```csharp
// 1. Durable exchange va queue — broker restart'da yo'qolmasin
await channel.ExchangeDeclareAsync("payments", ExchangeType.Topic, durable: true);
await channel.QueueDeclareAsync("ledger.payments", durable: true, exclusive: false,
    autoDelete: false, arguments: new Dictionary<string, object?>
    {
        ["x-dead-letter-exchange"] = "payments.dlx",       // DLQ
        ["x-message-ttl"] = 86_400_000,                    // 24 soat
        ["x-max-length"] = 1_000_000                       // navbat cheklovi
    });

// 2. Persistent xabar — diskka yoziladi
var props = new BasicProperties { Persistent = true, MessageId = messageId.ToString() };

// 3. Publisher confirms — broker qabul qilganini tasdiqlaydi
await channel.ConfirmSelectAsync();
await channel.BasicPublishAsync(exchange, routingKey, mandatory: true, props, body);
await channel.WaitForConfirmsOrDieAsync();

// 4. Prefetch — consumer bir vaqtda nechta xabar oladi
await channel.BasicQosAsync(prefetchSize: 0, prefetchCount: 10, global: false);
```

```
   ⚠ Uchalasi ham kerak: durable queue + persistent message + confirms.
     Bittasi yetishmasa xabar yo'qolishi mumkin.
```

## Dead letter queue

```
   ┌──────────────┐   nack(requeue: false)   ┌──────────────┐
   │  Main queue  │ ───────────────────────► │     DLX      │
   └──────────────┘   yoki TTL tugadi        └──────┬───────┘
                      yoki max-length              │
                                                   ▼
                                            ┌──────────────┐
                                            │  DLQ         │  ← qo'lda ko'rib chiqiladi
                                            └──────────────┘

   ⚠ requeue: true bilan cheksiz sikl xavfi:
     xabar xato beradi → requeue → yana xato → ...
     → retry sonini HISOBLANG (header'da) yoki delayed exchange ishlating
```

```csharp
// Retry sonini kuzatish
var retryCount = ea.BasicProperties.Headers?.TryGetValue("x-retry-count", out var v) == true
    ? Convert.ToInt32(v) : 0;

if (retryCount >= MaxRetries)
{
    await channel.BasicNackAsync(ea.DeliveryTag, false, requeue: false);   // DLQ ga
    return;
}
```

## Consumer

```csharp
var consumer = new AsyncEventingBasicConsumer(channel);
consumer.ReceivedAsync += async (_, ea) =>
{
    try
    {
        await handler.HandleAsync(ea.Body.ToArray(), ct);      // idempotent (10.4)
        await channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
    }
    catch (TransientException)
    {
        await channel.BasicNackAsync(ea.DeliveryTag, false, requeue: true);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Xabar ishlanmadi {MessageId}", ea.BasicProperties.MessageId);
        await channel.BasicNackAsync(ea.DeliveryTag, false, requeue: false);   // DLQ
    }
};

await channel.BasicConsumeAsync("ledger.payments", autoAck: false, consumer);
// ⚠ autoAck: false — MAJBURIY (10.5)
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `autoAck: true` | Ishlash paytida crash → xabar yo'qoladi |
| Durable/persistent qo'ymaslik | Broker restart'da xabarlar yo'qoladi |
| Publisher confirms ishlatmaslik | Xabar brokerga yetmagani bilinmaydi |
| `requeue: true` cheksiz | Poison message sikli |
| DLQ sozlamaslik | Xato xabarlar yo'qoladi yoki navbatni to'sadi |
| Prefetch juda katta | Bir consumer hamma xabarni oladi |
| Navbat uzunligini kuzatmaslik | Muammo kech bilinadi |

## Intervyu savollari

**1. RabbitMQ'da xabar yo'qolmasligini qanday kafolatlaysiz?**

> Uchta sozlama birga kerak:
> 1. **Durable** exchange va queue — broker restart'da tuzilma saqlanadi.
> 2. **Persistent** xabar — u diskka yoziladi.
> 3. **Publisher confirms** — broker qabul qilganini tasdiqlaydi.
>
> Consumer tomonida: **`autoAck: false`** va ack faqat ishlangandan keyin.
>
> Bittasi yetishmasa zanjir uziladi va xabar yo'qolishi mumkin.

**2. Poison message muammosi nima?**

> Xabar doim xato beradi (masalan buzilgan JSON). `requeue: true` bilan u navbatga
> qaytadi, yana ishlanadi, yana xato beradi — **cheksiz sikl** va u navbatni
> to'sadi.
>
> Yechim: retry sonini header'da hisoblash va chegaradan oshsa
> `requeue: false` bilan **DLQ**ga yuborish.
>
> DLQ'dagi xabarlar qo'lda ko'rib chiqiladi — bu monitoring metrikasi bo'lishi
> kerak.

**3. Prefetch nima uchun kerak?**

> U consumer bir vaqtda nechta tasdiqlanmagan xabar olishini cheklaydi.
>
> Chegara qo'yilmasa, birinchi consumer butun navbatni o'ziga tortadi va boshqa
> instance'lar bo'sh turadi — yuk taqsimlanmaydi.
>
> Odatiy qiymat 10–50; og'ir ishlov uchun kamroq.

## Xotira kartasi

```
Model        Producer → EXCHANGE → (binding) → QUEUE → Consumer
             direct · topic · fanout · headers
Farq         xabar ishlangach O'CHADI (Kafka'da log'da qoladi)
Ishonchlilik durable queue + persistent message + publisher confirms
             ⚠ uchalasi ham kerak
Consumer     autoAck: FALSE · ack ishlangandan KEYIN
             prefetch — yukni taqsimlash uchun
DLQ          x-dead-letter-exchange · TTL · max-length
Poison msg   requeue: true → cheksiz sikl
             → retry sonini header'da hisoblang → DLQ
Monitoring   navbat uzunligi · DLQ hajmi · consumer lag
```

---

# 10.9 · Kafka

## Model

```
   TOPIC "payments"
   ┌─────────────────────────────────────────────────────────┐
   │  Partition 0:  [0][1][2][3][4]...        ← tartib SHU YERDA │
   │  Partition 1:  [0][1][2][3]...                           │
   │  Partition 2:  [0][1][2][3][4][5]...                     │
   └─────────────────────────────────────────────────────────┘
              │            │            │
              ▼            ▼            ▼
        Consumer A   Consumer B   Consumer C     ← bitta consumer group

   ⚠ Bir partition — BIR consumer (group ichida)
     → consumer soni partition sonidan OSHMASLIGI kerak
```

```
   Kafka — bu LOG, navbat emas:
   · xabar ishlangach O'CHMAYDI (retention bo'yicha saqlanadi)
   · consumer o'z OFFSET'ini yuritadi
   · tarixni QAYTA O'QISH mumkin (offset'ni orqaga surish)
```

## Partition kaliti — tartib

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Tartib FAQAT bitta partition ichida kafolatlanadi            │
   │                                                                │
   │  key = account_id  →  bitta hisobning hamma hodisasi           │
   │                       BITTA partition'da                       │
   │                       → ular tartib bilan ishlanadi ✅         │
   │                                                                │
   │  key = null        →  round-robin → tartib YO'Q ❌             │
   └──────────────────────────────────────────────────────────────┘
```

```csharp
await producer.ProduceAsync("payments", new Message<string, string>
{
    Key = payment.AccountId.ToString(),        // ⚠ tartib kaliti
    Value = JsonSerializer.Serialize(evt),
    Headers = [new Header("correlation-id", correlationId)]
});
```

## Offset boshqaruvi

```csharp
var config = new ConsumerConfig
{
    GroupId = "ledger-service",
    EnableAutoCommit = false,                  // ⚠ QO'LDA commit
    AutoOffsetReset = AutoOffsetReset.Earliest,
    MaxPollIntervalMs = 300_000
};

while (!ct.IsCancellationRequested)
{
    var result = consumer.Consume(ct);

    await handler.HandleAsync(result.Message.Value, ct);   // idempotent (10.4)
    consumer.Commit(result);                                // ✅ ishlangandan KEYIN
}
```

```
   ⚠ EnableAutoCommit = true bo'lsa:
     offset vaqt bo'yicha avtomatik commit qilinadi
     → xabar ishlanmasdan turib "ishlangan" deb belgilanadi
     → crash bo'lsa xabar YO'QOLADI
```

## Consumer group va rebalance

```
   Consumer qo'shildi/o'chdi → REBALANCE
   ┌──────────────────────────────────────────────────────────────┐
   │  · partition'lar qayta taqsimlanadi                           │
   │  · rebalance davomida ISHLOV TO'XTAYDI                        │
   │  · ishlanayotgan xabar boshqa consumer'ga o'tishi mumkin      │
   │    → DUBLIKAT (yana idempotentlik kerak)                      │
   └──────────────────────────────────────────────────────────────┘

   Kamaytirish: session.timeout.ms va max.poll.interval.ms to'g'ri sozlash
                og'ir ishlovni alohida thread'ga chiqarish
```

## Consumer lag

```
   Lag = eng oxirgi offset − consumer offset

   ┌──────────────────────────────────────────────────────────────┐
   │  Bu Kafka'dagi ENG MUHIM metrika:                             │
   │  · lag o'sib borsa → consumer yetishmayapti                   │
   │  · lag barqaror → muvozanat                                    │
   │  · lag nolga yaqin → yaxshi                                    │
   │                                                                │
   │  → ALERT: lag > N yoki lag o'sish tendensiyasi                │
   └──────────────────────────────────────────────────────────────┘
```

## RabbitMQ vs Kafka

| | RabbitMQ | Kafka |
|---|---|---|
| Model | Navbat (xabar o'chadi) | **Log** (saqlanadi) |
| Marshrutlash | Boy (exchange turlari) | Oddiy (topic + partition) |
| Tartib | Navbat ichida | **Partition ichida** |
| Throughput | Yuqori | **Juda yuqori** |
| Qayta o'qish | Yo'q | **Ha** (offset) |
| Fan-out | Exchange bilan | Har consumer group o'z offset'i |
| Qachon | Ish navbati, RPC, murakkab marshrutlash | Event streaming, audit, analitika |

## Intervyu savollari

**1. Kafka va RabbitMQ farqi?** ⭐

> **RabbitMQ** — navbat: xabar ishlangach o'chadi. Marshrutlash boy (exchange
> turlari), ish navbati uchun ideal.
>
> **Kafka** — o'zgarmas log: xabar retention davomida saqlanadi, consumer o'z
> offset'ini yuritadi va tarixni **qayta o'qishi** mumkin.
>
> Fintech'da: to'lov hodisalarini qayta o'ynatish yoki bir necha servis mustaqil
> o'qishi kerak bo'lsa — Kafka. Oddiy ish navbati (email yuborish, hisobot
> generatsiyasi) — RabbitMQ.

**2. Kafka'da tartib qanday kafolatlanadi?** ⭐

> Tartib **faqat bitta partition ichida** kafolatlanadi.
>
> Shuning uchun partition kaliti to'g'ri tanlanishi kerak: `account_id` bo'lsa,
> bitta hisobning hamma hodisasi bitta partition'ga tushadi va tartib bilan
> ishlanadi.
>
> Kalit `null` bo'lsa — round-robin va tartib yo'q.
>
> Va muhim cheklov: **bir partition — bir consumer** (group ichida), ya'ni
> parallellik partition soni bilan cheklangan.

**3. Consumer lag nima va nega muhim?**

> Lag — eng oxirgi offset va consumer offset'i orasidagi farq, ya'ni «qancha xabar
> kutmoqda».
>
> Bu Kafka'dagi **eng muhim metrika**: lag o'sib borsa consumer yetishmayapti va
> ma'lumot eskirmoqda.
>
> Fintech'da bu ledger yozuvlari kechikayotganini bildiradi — alert bo'lishi kerak.

**4. Offset'ni qachon commit qilasiz?**

> **Ishlangandan keyin**, va `EnableAutoCommit = false` bilan.
>
> Avtomatik commit vaqt bo'yicha ishlaydi: xabar hali ishlanmagan bo'lsa ham
> «ishlangan» deb belgilanishi mumkin, va crash bo'lganda u yo'qoladi.
>
> Qo'lda commit bilan eng yomon holat — dublikat, va u idempotentlik bilan hal
> qilinadi.

## Xotira kartasi

```
Kafka        LOG, navbat emas · xabar o'chmaydi (retention)
             consumer o'z OFFSET'ini yuritadi · qayta o'qish mumkin
Partition    tartib FAQAT partition ichida
             key = account_id → bitta hisob bitta partition'da ✅
             key = null → round-robin → tartib YO'Q
Cheklov      bir partition = BIR consumer (group ichida)
             → parallellik partition soni bilan cheklangan
Offset       EnableAutoCommit = FALSE · commit ISHLANGANDAN KEYIN
Rebalance    consumer qo'shilsa/o'chsa → ishlov to'xtaydi + DUBLIKAT
Lag          eng muhim metrika — o'sib borsa consumer yetishmayapti → ALERT
Tanlov       RabbitMQ: ish navbati, murakkab marshrutlash
             Kafka: event streaming, qayta o'ynatish, audit, ko'p consumer
```

---

# 10.10 · Xabar tartibi va dublikat

## Tartib nima uchun buziladi

```
   1. PARALLEL consumer'lar
      msg-1 → Consumer A (sekin)
      msg-2 → Consumer B (tez)   → msg-2 BIRINCHI ishlanadi

   2. RETRY
      msg-1 xato → qayta navbatga → msg-2 dan KEYIN ishlanadi

   3. Bir necha partition/navbat
      tartib faqat bittasi ichida

   4. Tarmoq
      xabarlar boshqa tartibda yetib kelishi mumkin
```

## Yechim 1 — tartibga tayanmaslik (afzal)

```csharp
// ❌ Tartibga bog'liq
// "MoneyWithdrawn" kelsa balansdan ayiramiz
public async Task Handle(MoneyWithdrawn e) => await Subtract(e.AccountId, e.Amount);

// ✅ Tartibdan mustaqil — YAKUNIY HOLAT yuboriladi
public sealed record BalanceChanged(Guid AccountId, long NewBalanceMinor, long Version);

public async Task Handle(BalanceChanged e)
{
    // ⚠ Eski versiyani e'tiborsiz qoldiramiz
    await db.Accounts
        .Where(a => a.Id == e.AccountId && a.Version < e.Version)
        .ExecuteUpdateAsync(s => s
            .SetProperty(a => a.BalanceMinor, e.NewBalanceMinor)
            .SetProperty(a => a.Version, e.Version));
}
```

```
   ⚠ Bu eng ishonchli yondashuv:
     · tartib buzilsa ham natija to'g'ri
     · dublikat ham zarar qilmaydi
     · retry xavfsiz
```

## Yechim 2 — partition kaliti

```
   Bir aggregate'ning hamma hodisasi BIR partition'da:

   Kafka:     key = account_id
   RabbitMQ:  consistent hashing exchange yoki aggregate bo'yicha alohida navbat

   ✅ Aggregate ichida tartib kafolatlanadi
   ⚠ Aggregate'lar aro tartib baribir YO'Q
```

## Yechim 3 — versiya bilan tekshirish

```csharp
// Har hodisada aggregate versiyasi bo'ladi
public async Task HandleAsync(PaymentEvent e, CancellationToken ct)
{
    var current = await db.Projections.FindAsync([e.AggregateId], ct);

    if (current is not null && current.Version >= e.Version)
        return;                                    // eski yoki takroriy — o'tkazamiz

    if (current is not null && current.Version + 1 < e.Version)
    {
        // ⚠ TESHIK — oraliq hodisa yetib kelmagan
        await bufferedEvents.EnqueueAsync(e, ct);  // kutamiz
        return;
    }

    Apply(current, e);
}
```

## Dublikatni aniqlash

```
   Qaysi kalit bo'yicha:

   ┌──────────────────────────────────────────────────────────────┐
   │  message_id       — broker darajasidagi dublikat (10.4)       │
   │  aggregate+version— mantiqiy dublikat                          │
   │  business key     — idempotency key, tranzaksiya raqami        │
   └──────────────────────────────────────────────────────────────┘

   ⚠ message_id har publish'da YANGI bo'lsa — u dublikatni aniqlamaydi.
     Outbox'da u BIR MARTA generatsiya qilinib saqlanadi (10.3).
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Tartibga tayanish | Parallel consumer'da buziladi |
| Delta (`-100`) yuborish | Dublikat ikki marta qo'llanadi |
| Retry'da yangi `message_id` | Dublikat aniqlanmaydi |
| Versiya tekshiruvisiz proyeksiya | Eski hodisa yangisini bosib o'tadi |
| Teshikni e'tiborsiz qoldirish | Proyeksiya noto'g'ri |
| Bitta consumer bilan tartib «kafolatlash» | Miqyoslanmaydi |

## Intervyu savollari

**1. Xabar tartibi kafolatlanadimi?** ⭐

> Umumiy holatda **yo'q**. Parallel consumer'lar, retry, bir necha partition —
> bularning har biri tartibni buzadi.
>
> Kafka'da tartib faqat **bitta partition ichida** kafolatlanadi, RabbitMQ'da —
> bitta navbat va bitta consumer bo'lsa.
>
> Eng ishonchli yondashuv — **tartibga tayanmaslik**: delta o'rniga **yakuniy
> holat** va **versiya** yuborish. Shunda tartib buzilsa ham natija to'g'ri
> bo'ladi.

**2. Delta va yakuniy holat — qaysi birini yuborasiz?**

> **Yakuniy holat + versiya**.
>
> Delta (`-100`) dublikatga chidamli emas: xabar ikki marta kelsa ikki marta
> qo'llanadi.
>
> Yakuniy holat esa idempotent: `SET balance = 20000 WHERE version < 15` — necha
> marta kelsa ham natija bir xil, va eski versiya avtomatik e'tiborsiz qoladi.

**3. Proyeksiyada «teshik» bo'lsa nima qilasiz?**

> Ya'ni versiya 5 kelgan, lekin oxirgi ishlangani 3 — 4 yo'qolgan yoki kechikkan.
>
> Uch variant: hodisani **buferga** qo'yib kutish; yetishmagan hodisani manbadan
> **so'rash**; yoki proyeksiyani **noldan qayta qurish**.
>
> Fintech'da men birinchi ikkisini birga ishlataman va teshik uzoq davom etsa
> alert beraman — bu ma'lumot yo'qolgani belgisi bo'lishi mumkin.

## Xotira kartasi

```
Tartib buziladi  parallel consumer · retry · bir necha partition · tarmoq
Yechim 1 (afzal) TARTIBGA TAYANMASLIK
                 delta ❌ → YAKUNIY HOLAT + VERSIYA ✅
                 SET balance = X WHERE version < N → idempotent
Yechim 2         partition kaliti = aggregate_id → aggregate ichida tartib
                 ⚠ aggregate'lar aro tartib baribir yo'q
Yechim 3         versiya tekshiruvi · teshik bo'lsa buferga yoki so'rash
Dublikat kaliti  message_id (broker) · aggregate+version (mantiqiy)
                 business key (idempotency key)
                 ⚠ message_id outbox'da BIR MARTA generatsiya qilinadi
```

---

# 10.11 · Retry, backoff, jitter

## Uch shart

```
   ┌──────────────────────────────────────────────────────────────┐
   │  1. Operatsiya IDEMPOTENT bo'lsin                             │
   │     aks holda retry ikki marta pul yechadi                    │
   │  2. Exponential backoff + JITTER                              │
   │     jitter'siz hamma bir vaqtda qayta uradi                   │
   │  3. Circuit breaker (10.12)                                   │
   │     yiqilgan tizimni urib yotish foydasiz                     │
   └──────────────────────────────────────────────────────────────┘
```

## Thundering herd

```
   Jitter'SIZ:
   Provayder 30 soniya yiqildi → 1000 client xato oldi
        │
        └─► hammasi 1s, 2s, 4s, 8s da QAYTA URADI
            │
            └─► provayder tiklandi va DARHOL 1000 so'rov keldi
                → yana yiqildi → sikl

   Jitter BILAN:
   har client tasodifiy vaqtda uradi → yuk TEKIS taqsimlanadi
```

```csharp
// Full jitter — eng ko'p tavsiya etiladigan
static TimeSpan Backoff(int attempt, TimeSpan baseDelay, TimeSpan maxDelay)
{
    var exponential = Math.Min(
        baseDelay.TotalMilliseconds * Math.Pow(2, attempt - 1),
        maxDelay.TotalMilliseconds);

    return TimeSpan.FromMilliseconds(Random.Shared.NextDouble() * exponential);
}

// attempt 1: 0..1000 ms
// attempt 2: 0..2000 ms
// attempt 3: 0..4000 ms
```

## Nima retry qilinadi

```
   ✅ TRANZIENT (vaqtinchalik)
   · timeout · tarmoq xatosi
   · 408, 429, 500, 502, 503, 504
   · DB deadlock (40P01 / 1205)
   · serialization failure (40001)

   ❌ TRANZIENT EMAS
   · 400 — so'rov noto'g'ri, takrorlash foydasiz
   · 401 / 403 — huquq muammosi
   · 404 — resurs yo'q
   · 422 — biznes rad javobi
   · unique constraint violation (biznes qoidasi)
```

```csharp
public static bool IsTransient(Exception ex) => ex switch
{
    HttpRequestException => true,
    TimeoutException => true,
    PostgresException { SqlState: "40P01" or "40001" } => true,     // deadlock, serialization
    _ => false
};

public static bool IsTransient(HttpStatusCode code) => (int)code switch
{
    408 or 429 or >= 500 and <= 599 => true,
    _ => false
};
```

## `Retry-After` ni hurmat qilish

```csharp
// 429 javobida server qachon urinishni aytadi
if (response.StatusCode == HttpStatusCode.TooManyRequests)
{
    var delay = response.Headers.RetryAfter?.Delta
                ?? TimeSpan.FromSeconds(60);
    await Task.Delay(delay, ct);       // ⚠ o'z backoff'imizdan USTUN
}
```

## Retry byudjeti

```
   ⚠ Retry yukni OSHIRADI. Nazoratsiz retry tizimni yiqitadi.

   Retry budget: umumiy so'rovlarning maks N% retry bo'lsin (masalan 10%)
   → chegaradan oshsa retry TO'XTATILADI

   Bu Google SRE amaliyotidan — retry storm'ning oldini oladi.
```

## Qayerda retry qilinadi

```
   ┌──────────────────────────────────────────────────────────────┐
   │  ⚠ Har qatlamda retry qilmang — ular KO'PAYADI                │
   │                                                                │
   │  HTTP client retry (3) × servis retry (3) × broker retry (3)  │
   │  = 27 urinish                                                  │
   │                                                                │
   │  → Retry BITTA qatlamda bo'lsin (odatda eng pastda)           │
   │  → yoki umumiy byudjet bilan cheklansin                        │
   └──────────────────────────────────────────────────────────────┘
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Idempotentliksiz retry | **Ikki marta pul yechish** |
| Jitter'siz backoff | Thundering herd |
| Biznes rad javobini retry qilish | Foydasiz yuk |
| Har qatlamda retry | Urinishlar ko'payadi (3×3×3) |
| `Retry-After` ni e'tiborsiz qoldirish | Bloklanish |
| Cheksiz retry | Resurs tugaydi |
| Timeout'da idempotency key'siz retry | Dublikat to'lov (10.13) |

## Intervyu savollari

**1. Retry'ni qanday to'g'ri qilasiz?** ⭐

> Uch shart: operatsiya **idempotent** bo'lsin; **exponential backoff + jitter**;
> va **circuit breaker**.
>
> Jitter eng ko'p unutiladigan qism: usiz barcha client'lar bir vaqtda qayta uradi
> va tiklanayotgan tizimni yana yiqitadi (thundering herd).
>
> Va faqat **tranzient** xatolarni: timeout, tarmoq, `408`, `429`, `5xx`, DB
> deadlock. `400`, `422`, biznes rad javobini retry qilish faqat zarar.

**2. Retry qayerda qilinishi kerak?**

> **Bitta qatlamda**, odatda eng pastda (HTTP client yoki DB qatlami).
>
> Har qatlamda retry bo'lsa ular ko'payadi: 3 × 3 × 3 = 27 urinish, va bu
> yiqilayotgan tizimga qo'shimcha bosim.
>
> Yuqori qatlamlarda retry kerak bo'lsa — umumiy **retry byudjeti** bilan
> cheklanadi: umumiy so'rovlarning masalan 10% dan ko'pi retry bo'lmasin.

**3. Timeout'da retry qilasizmi?**

> Faqat **idempotency key bilan**. Timeout muvaffaqiyatsizlik emas — server
> so'rovni bajargan bo'lishi mumkin (10.13).
>
> Kalitsiz retry ikki marta pul yechishga olib keladi.
>
> Kalit bo'lmasa — holatni `unknown` deb belgilab, provayderdan **status so'rovi**
> bilan aniqlayman.

## Deliverable

```csharp
[Fact]
public async Task TransientErrors_AreRetried()
{
    provider.EnqueueResponses(HttpStatusCode.ServiceUnavailable, HttpStatusCode.OK);
    var result = await client.ChargeAsync(payment, default);

    Assert.True(result.IsSuccess);
    Assert.Equal(2, provider.RequestCount);
}

[Theory]
[InlineData(HttpStatusCode.BadRequest)]
[InlineData(HttpStatusCode.UnprocessableEntity)]
public async Task NonTransientErrors_AreNotRetried(HttpStatusCode code)
{
    provider.EnqueueResponses(code);
    await Record.ExceptionAsync(() => client.ChargeAsync(payment, default));

    Assert.Equal(1, provider.RequestCount);
}

[Fact]
public void Backoff_HasJitter()
{
    var delays = Enumerable.Range(0, 100).Select(_ => Backoff(attempt: 3, Base, Max)).ToList();
    Assert.True(delays.Distinct().Count() > 50);      // tasodifiylik bor
}

[Fact]
public async Task Retry_UsesSameIdempotencyKey()
{
    provider.EnqueueResponses(HttpStatusCode.ServiceUnavailable, HttpStatusCode.OK);
    await client.ChargeAsync(payment, default);

    var keys = provider.ReceivedRequests
        .Select(r => r.Headers.GetValues("Idempotency-Key").Single()).Distinct();
    Assert.Single(keys);
}

[Fact]
public async Task RetryAfterHeader_IsRespected()
{
    provider.EnqueueRateLimited(retryAfterSeconds: 2);
    var sw = Stopwatch.StartNew();
    await client.ChargeAsync(payment, default);

    Assert.True(sw.Elapsed >= TimeSpan.FromSeconds(2));
}
```

## Xotira kartasi

```
3 shart      IDEMPOTENT · exponential backoff + JITTER · circuit breaker
Jitter       usiz thundering herd — hamma bir vaqtda qayta uradi
             full jitter: Random × min(base × 2^n, max)
Tranzient    timeout · tarmoq · 408 · 429 · 5xx · deadlock 40P01 · 40001
EMAS         400 · 401 · 403 · 404 · 422 · unique violation
Retry-After  429 da server aytgan muddat — o'z backoff'dan USTUN
Byudjet      umumiy so'rovlarning maks ~10% retry bo'lsin (retry storm)
Qatlam       retry BITTA qatlamda · aks holda 3×3×3 = 27 urinish
Timeout      retry faqat IDEMPOTENCY KEY bilan (10.13)
```

---

# 10.12 · Circuit breaker, bulkhead, timeout

## Circuit breaker

```
                    xatolar chegaradan oshdi
   ┌─ CLOSED ──────────────────────────────► OPEN ─────┐
   │  so'rovlar                              so'rovlar  │
   │  o'tadi                                 DARHOL rad │
   │  xatolar sanaladi                       etiladi    │
   │     ▲                                   (chaqiruv  │
   │     │                                    YO'Q)     │
   │     │ sinov muvaffaqiyatli                    │    │
   │     │                                         │    │ BreakDuration
   │  ┌──┴──────────────┐                          ▼    │ tugadi
   │  │   HALF-OPEN     │◄──────────────────────────────┘
   │  │  bir necha sinov│
   │  │  so'rov         │──── xato ──────────► OPEN
   │  └─────────────────┘
   └───────────────────────────────────────────────────

   Foyda: yiqilgan tizimga urib yotmaslik
          → bizning thread va ulanishlarimiz tejaladi
          → provayderga tiklanish imkoni beriladi
```

```csharp
builder.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
{
    FailureRatio = 0.5,                              // 50% xato
    SamplingDuration = TimeSpan.FromSeconds(30),     // shu oynada
    MinimumThroughput = 10,                          // kamida 10 so'rov bo'lsa
    BreakDuration = TimeSpan.FromSeconds(15),
    OnOpened = args =>
    {
        logger.LogError("Circuit OPEN {Provider}", providerName);   // ⚠ ALERT
        metrics.CircuitOpened(providerName);
        return default;
    }
});
```

> **Circuit breaker holati monitoringda bo'lishi shart.** `OPEN` bo'lishi — bu
> incident, jimgina o'tib ketmasligi kerak.

## Bulkhead

```
   Kema bo'limlari kabi: bir bo'lim suv bilan to'lsa, boshqalari saqlanib qoladi

   ❌ Bulkhead'SIZ — umumiy thread pool
   ┌────────────────────────────────────────────────────────┐
   │  Provayder A sekinlashdi (30s timeout)                 │
   │  → hamma thread A ni kutadi                            │
   │  → B va C ham javob bermaydi                           │
   │  → BUTUN TIZIM yiqildi                                 │
   └────────────────────────────────────────────────────────┘

   ✅ Bulkhead BILAN — har provayderga alohida limit
   ┌──────────────┬──────────────┬──────────────┐
   │ Provayder A  │ Provayder B  │ Provayder C  │
   │ max 10       │ max 10       │ max 10       │
   │ ⚠ to'lgan    │ ✅ ishlayapti│ ✅ ishlayapti│
   └──────────────┴──────────────┴──────────────┘
```

```csharp
// Har provayder uchun alohida semafor (M3.7)
private readonly Dictionary<string, SemaphoreSlim> _bulkheads = new()
{
    ["click"] = new SemaphoreSlim(10, 10),
    ["payme"] = new SemaphoreSlim(10, 10)
};

// Yoki Polly bilan
builder.AddConcurrencyLimiter(permitLimit: 10, queueLimit: 0);
```

## Timeout ierarxiyasi

```
   ⚠ Timeout'lar ICHKARIDAN TASHQARIGA o'sishi kerak:

   ┌─ Client timeout             30 s ──────────────────────────┐
   │  ┌─ Bizning API timeout     25 s ─────────────────────────┐│
   │  │  ┌─ Provayder chaqiruvi  10 s ────────────────────────┐││
   │  │  │  ┌─ DB so'rovi         5 s ──────────────────────┐ │││
   │  │  │  └────────────────────────────────────────────────┘ │││
   │  │  └─────────────────────────────────────────────────────┘││
   │  └──────────────────────────────────────────────────────────┘│
   └───────────────────────────────────────────────────────────────┘

   Teskari bo'lsa: client kutishni to'xtatadi, biz esa hali ishlayapmiz
   → resurs behuda sarflanadi va natija hech kimga kerak emas
```

```csharp
// Retry bilan birga hisoblash
// 3 urinish × 10 s = 30 s → tashqi timeout 25 s bo'lsa YETMAYDI
// → yoki urinishlar sonini kamaytirish, yoki timeout'ni oshirish
```

## Fallback va degradatsiya

```csharp
// Provayder ishlamasa — qisman funksionallik
public async Task<Rate> GetRateAsync(string pair, CancellationToken ct)
{
    try
    {
        return await _provider.GetRateAsync(pair, ct);
    }
    catch (BrokenCircuitException)
    {
        var cached = await _cache.GetLastKnownAsync(pair, ct);
        if (cached is not null && cached.Age < TimeSpan.FromHours(1))
            return cached with { IsStale = true };      // ⚠ ochiq belgilanadi

        throw new ServiceUnavailableException("Kurs mavjud emas");
    }
}
```

```
   ⚠ Fintech'da fallback EHTIYOT bilan:
   · kurs uchun eskirgan qiymat — MUMKIN (belgilangan holda)
   · balans uchun eskirgan qiymat — MUMKIN EMAS
   · to'lovni "muvaffaqiyatli" deb belgilash — HECH QACHON
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Circuit breaker'siz retry | Yiqilgan tizimga bosim |
| Circuit holati monitoringda yo'q | Incident ko'rinmaydi |
| Umumiy thread pool | Bitta sekin provayder butun tizimni yiqitadi |
| Timeout ierarxiyasi teskari | Resurs behuda sarflanadi |
| Timeout umuman yo'q | So'rov abadiy osiladi |
| Balans uchun fallback | Noto'g'ri qaror |

## Intervyu savollari

**1. Circuit breaker nima beradi?** ⭐

> Provayder yiqilganda unga urib turmaslik. `OPEN` holatida so'rovlar **darhol**
> rad etiladi — bizning thread va ulanishlarimiz tejaladi, provayderga esa
> tiklanish imkoni beriladi.
>
> `HALF-OPEN` holatida bir necha sinov so'rov yuboriladi; muvaffaqiyatli bo'lsa
> `CLOSED` ga qaytadi.
>
> Va uning holati **monitoringda** bo'lishi shart: `OPEN` bo'lishi incident belgisi.

**2. Bulkhead nima?**

> Resurslarni ajratish — kema bo'limlari kabi.
>
> Umumiy thread pool bo'lsa, bitta sekin provayder hamma thread'ni band qiladi va
> boshqa provayderlar ham javob bermaydi — butun tizim yiqiladi.
>
> Har provayderga alohida limit (semafor yoki concurrency limiter) qo'yilsa,
> biri to'lganda qolganlari ishlashda davom etadi.

**3. Timeout'larni qanday sozlaysiz?** ⭐

> **Ichkaridan tashqariga o'sib borishi** kerak: DB 5 s → provayder 10 s → bizning
> API 25 s → client 30 s.
>
> Teskari bo'lsa client kutishni to'xtatadi, biz esa hali ishlayapmiz va resurs
> behuda sarflanadi.
>
> Va retry bilan birga hisoblash kerak: 3 urinish × 10 soniya = 30 soniya, agar
> tashqi timeout 25 soniya bo'lsa u yetmaydi.

## Xotira kartasi

```
Circuit      CLOSED → (xato %) → OPEN → (muddat) → HALF-OPEN → CLOSED
             OPEN'da so'rov DARHOL rad etiladi (chaqiruv yo'q)
             ⚠ holati MONITORINGDA — OPEN = incident
Bulkhead     resurslarni AJRATISH · har provayderga alohida limit
             usiz: bitta sekin provayder butun tizimni yiqitadi
Timeout      ICHKARIDAN TASHQARIGA o'sadi
             DB 5s → provayder 10s → API 25s → client 30s
             retry bilan birga hisoblang (3 × 10s = 30s)
Fallback     kurs → eskirgan qiymat MUMKIN (belgilangan holda)
             balans → MUMKIN EMAS
             to'lovni "muvaffaqiyatli" deb belgilash → HECH QACHON
```

---

# 10.13 · Timeout = unknown ⭐

## Nima va nega

Bu modulning **eng muhim g'oyasi** va fintech intervyusida farqlovchi javob.

```
   So'rov yuborildi → TIMEOUT

   ┌──────────────────────────────────────────────────────────────┐
   │  Nima bo'lganini BILMAYMIZ:                                   │
   │                                                                │
   │  Variant A: so'rov yetmadi        → pul yechilmagan            │
   │  Variant B: so'rov yetdi,          → PUL YECHILGAN             │
   │             javob yo'qoldi                                     │
   │  Variant C: so'rov yetdi,          → pul yechilgan, keyin      │
   │             ishlov o'rtasida crash    holat noaniq             │
   └──────────────────────────────────────────────────────────────┘

   ⚠ TIMEOUT ≠ MUVAFFAQIYATSIZLIK
     Uni "failed" deb belgilash — KLASSIK FINTECH INCIDENT'i
```

## Nima bo'ladi agar noto'g'ri belgilansa

```
   ❌ Timeout → "failed" deb belgilandi
        │
        ├─► foydalanuvchiga "to'lov amalga oshmadi" ko'rsatildi
        │
        ├─► foydalanuvchi QAYTA to'ladi
        │
        └─► natija: IKKI MARTA pul yechildi
            · mijoz shikoyat qiladi
            · qo'lda qaytarish kerak
            · reputatsiya zarari
```

## To'g'ri holatlar mashinasi

```
   ┌─────────┐
   │ pending │
   └────┬────┘
        │ provayderga yuborildi
        ▼
   ┌────────────┐
   │ processing │
   └──┬───┬───┬─┘
      │   │   │
      │   │   └─── TIMEOUT ──────► ┌─────────┐
      │   │                        │ unknown │ ◄── ⚠ ALOHIDA HOLAT
      │   │                        └────┬────┘
      │   │                             │ status so'rovi / webhook /
      │   │                             │ reconciliation
      │   │                             ▼
      │   │                    ┌────────────────┐
      │   └── aniq rad ───────►│ failed         │
      │                        └────────────────┘
      └────── muvaffaqiyat ───►┌────────────────┐
                               │ completed      │
                               └────────────────┘
```

## Unknown holatni hal qilish

```csharp
public async Task ResolveUnknownAsync(Guid paymentId, CancellationToken ct)
{
    var payment = await _repo.GetAsync(paymentId, ct);
    if (payment.Status != PaymentStatus.Unknown) return;

    // 1. Provayderdan STATUS SO'RASH (idempotency key bo'yicha)
    var status = await _provider.GetStatusAsync(payment.IdempotencyKey, ct);

    var resolved = status switch
    {
        ProviderStatus.Succeeded => PaymentStatus.Completed,
        ProviderStatus.Failed    => PaymentStatus.Failed,
        ProviderStatus.NotFound  => PaymentStatus.Failed,     // yetib bormagan
        ProviderStatus.Pending   => PaymentStatus.Unknown,    // ⚠ hali noaniq
        _ => PaymentStatus.Unknown
    };

    if (resolved == PaymentStatus.Unknown)
    {
        // 2. Hali aniqlanmadi → keyinroq qayta urinish
        await _scheduler.ScheduleRetryAsync(paymentId, delay: TimeSpan.FromMinutes(5), ct);

        // 3. Uzoq unknown → qo'lda aralashuv
        if (payment.UnknownSince < _clock.GetUtcNow().AddHours(2))
            await _manualQueue.EnqueueAsync(paymentId, ct);
        return;
    }

    payment.Resolve(resolved);
    await _uow.SaveChangesAsync(ct);
}
```

## Uch qatlamli aniqlash

```
   ┌─ 1. STATUS SO'ROVI (polling) ───────────────────────────────┐
   │  Timeout'dan keyin darhol + backoff bilan qayta              │
   │  → tez, lekin provayderga yuk                                │
   ├─ 2. WEBHOOK ────────────────────────────────────────────────┤
   │  Provayder holat o'zgarganda xabar beradi (M7.12)            │
   │  → tez, lekin ISHONCHSIZ (kelmasligi mumkin)                 │
   ├─ 3. RECONCILIATION (10.14) ─────────────────────────────────┤
   │  Kunlik solishtirish — YAKUNIY haqiqat manbai                │
   │  → sekin, lekin ISHONCHLI                                     │
   └──────────────────────────────────────────────────────────────┘

   Uchalasi ham kerak: 1 va 2 tezlik uchun, 3 to'g'rilik uchun
```

## Foydalanuvchiga nima ko'rsatiladi

```
   ❌ "To'lov amalga oshmadi"      → qayta to'laydi → dublikat
   ❌ "To'lov muvaffaqiyatli"      → yolg'on bo'lishi mumkin

   ✅ "To'lov qayta ishlanmoqda. Natija bir necha daqiqada ma'lum bo'ladi."
      + status endpoint yoki push xabar
      + ⚠ "Qayta to'lamang" ogohlantirishi
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Timeout'ni `failed` deb belgilash | **Dublikat to'lov** |
| `unknown` holati mashinada yo'q | Holatni ifodalab bo'lmaydi |
| Faqat webhook'ga tayanish | Webhook kelmasa holat abadiy unknown |
| Idempotency key'siz status so'rash | Qaysi tranzaksiya ekani noma'lum |
| Uzoq unknown'ni kuzatmaslik | Pul «osilib» qoladi |
| Foydalanuvchiga noaniq xabar | U qayta to'laydi |

## Intervyu savollari

**1. Provayderga so'rov timeout bo'ldi. To'lov o'tdimi?** ⭐

> **Noma'lum** — va bu eng muhim javob.
>
> Timeout muvaffaqiyatsizlik **emas**: so'rov yetib borib, javob yo'qolgan bo'lishi
> mumkin. Ya'ni pul allaqachon yechilgan bo'lishi mumkin.
>
> Shuning uchun men holatlar mashinasiga **alohida `unknown` holati** qo'shaman.
> Uni `failed` deb belgilash — klassik fintech incident: foydalanuvchi qayta
> to'laydi va pul ikki marta yechiladi.

**2. `unknown` holatini qanday hal qilasiz?**

> Uch qatlam:
> 1. **Status so'rovi** — idempotency key bo'yicha provayderdan holatni so'rash,
>    backoff bilan qayta urinish.
> 2. **Webhook** — provayder holat o'zgarganda xabar beradi. Tez, lekin ishonchsiz.
> 3. **Reconciliation** — kunlik solishtirish, yakuniy haqiqat manbai.
>
> Uzoq vaqt (masalan 2 soat) `unknown` qolsa — **qo'lda aralashuv navbatiga**
> tushadi.

**3. Foydalanuvchiga nima ko'rsatasiz?**

> Na «muvaffaqiyatli», na «amalga oshmadi» — ikkalasi ham yolg'on bo'lishi mumkin.
>
> «To'lov qayta ishlanmoqda, natija bir necha daqiqada ma'lum bo'ladi» + status
> kuzatish imkoni + **«qayta to'lamang»** ogohlantirishi.
>
> Bu foydalanuvchi uchun noqulay, lekin dublikat to'lovdan ancha yaxshi.

## Deliverable

```csharp
[Fact]
public async Task Timeout_SetsUnknownNotFailed()
{
    provider.SimulateTimeout();
    await service.ProcessAsync(payment, default);

    var stored = await db.Payments.FindAsync(payment.Id);
    Assert.Equal(PaymentStatus.Unknown, stored!.Status);      // Failed EMAS
}

[Fact]
public async Task UnknownPayment_IsResolvedByStatusQuery()
{
    await SeedPayment(status: PaymentStatus.Unknown);
    provider.SetStatus(idempotencyKey, ProviderStatus.Succeeded);

    await resolver.ResolveUnknownAsync(paymentId, default);

    Assert.Equal(PaymentStatus.Completed, await GetStatusAsync(paymentId));
}

[Fact]
public async Task LongUnknown_GoesToManualQueue()
{
    await SeedPayment(status: PaymentStatus.Unknown, unknownSince: Now.AddHours(-3));
    provider.SetStatus(idempotencyKey, ProviderStatus.Pending);

    await resolver.ResolveUnknownAsync(paymentId, default);

    Assert.Single(await db.ManualInterventionQueue.ToListAsync());
}

[Fact]
public async Task UserFacingStatus_IsNotMisleading()
{
    await SeedPayment(status: PaymentStatus.Unknown);
    var dto = await client.GetFromJsonAsync<PaymentDto>($"/api/v1/payments/{paymentId}");

    Assert.Equal("processing", dto!.Status);        // "failed" ham, "completed" ham emas
    Assert.Contains("qayta to'lamang", dto.Message, StringComparison.OrdinalIgnoreCase);
}
```

## Xotira kartasi

```
ASOSIY       TIMEOUT ≠ MUVAFFAQIYATSIZLIK
             so'rov yetib borib javob yo'qolgan bo'lishi mumkin
Xato         timeout → "failed" → foydalanuvchi QAYTA to'laydi → DUBLIKAT
Yechim       holatlar mashinasida ALOHIDA `unknown` holati
Hal qilish   1. status so'rovi (idempotency key bo'yicha) — tez
             2. webhook — tez, lekin ISHONCHSIZ
             3. RECONCILIATION — sekin, lekin ISHONCHLI (10.14)
Uzoq unknown 2 soatdan ortiq → QO'LDA ARALASHUV navbati
Foydalanuvchiga  "qayta ishlanmoqda" + status kuzatish + "QAYTA TO'LAMANG"
                 "muvaffaqiyatli" ham, "amalga oshmadi" ham — YOLG'ON bo'lishi mumkin
```

---

# 10.14 · Reconciliation ⭐

## Nima va nega

Reconciliation — **bizning yozuvlarimiz va tashqi manba** solishtirilishi. Bu
fintech'da **majburiy** jarayon, «yaxshi bo'lardi» emas.

```
   Nega kerak — hodisalar yo'qolishi MUQARRAR:

   · webhook kelmadi
   · status so'rovi noto'g'ri javob berdi
   · bizda bug bor edi
   · provayderda bug bor edi
   · tarmoq uzilishi paytida holat aniqlanmadi

   → Reconciliation bularning HAMMASINI topadi
```

## Uch daraja

```
   ┌─ 1. ICHKI (o'z ma'lumotimiz ichida) ────────────────────────┐
   │  · ledger Δ = 0 tekshiruvi                                   │
   │  · keshlangan balans == SUM(ledger_entries)                  │
   │  · outbox'da yuborilmagan eski xabarlar                      │
   │  → HAR SOAT yoki tez-tez                                     │
   ├─ 2. TASHQI (provayder bilan) ──────────────────────────────┤
   │  · provayder hisoboti (fayl yoki API) yuklanadi              │
   │  · bizning tranzaksiyalar bilan solishtiriladi               │
   │  → KUNIGA bir marta (odatda kechasi)                         │
   ├─ 3. BANK (settlement) ─────────────────────────────────────┤
   │  · bank hisobiga tushgan pul bizning hisobga mos keladimi    │
   │  → kuniga yoki haftasiga                                     │
   └──────────────────────────────────────────────────────────────┘
```

## Farq turlari

```
   ┌──────────────────────────┬───────────────────────────────────┐
   │  Bizda BOR, ularda YO'Q  │  · timeout'da yetib bormagan       │
   │                          │  · bizda soxta yozuv (bug)         │
   ├──────────────────────────┼───────────────────────────────────┤
   │  Ularda BOR, bizda YO'Q  │  · webhook kelmagan                │
   │                          │  · bizda yozuv yo'qolgan           │
   ├──────────────────────────┼───────────────────────────────────┤
   │  Ikkalasida bor,         │  · komissiya farqi                 │
   │  SUMMA farq qiladi       │  · valyuta konvertatsiyasi         │
   │                          │  · yaxlitlash (M4.4)               │
   ├──────────────────────────┼───────────────────────────────────┤
   │  HOLAT farq qiladi       │  · bizda unknown, ularda completed │
   └──────────────────────────┴───────────────────────────────────┘
```

## Jarayon

```csharp
public async Task<ReconciliationReport> ReconcileAsync(DateOnly day, CancellationToken ct)
{
    // ⚠ Biznes kuni chegarasi — mahalliy zonada (M4.7)
    var (from, to) = BusinessDay.Range(day, _timeZone);

    var ours = await _payments.GetSettledAsync(from, to, ct);
    var theirs = await _provider.DownloadStatementAsync(day, ct);

    var ourById = ours.ToDictionary(p => p.ExternalReference);
    var theirById = theirs.ToDictionary(t => t.Reference);

    var report = new ReconciliationReport(day);

    foreach (var (reference, ourTx) in ourById)
    {
        if (!theirById.TryGetValue(reference, out var theirTx))
        {
            report.MissingOnProvider.Add(ourTx);           // bizda bor, ularda yo'q
            continue;
        }

        if (ourTx.AmountMinor != theirTx.AmountMinor)
            report.AmountMismatch.Add((ourTx, theirTx));

        if (!StatusMatches(ourTx.Status, theirTx.Status))
            report.StatusMismatch.Add((ourTx, theirTx));
    }

    foreach (var (reference, theirTx) in theirById)
        if (!ourById.ContainsKey(reference))
            report.MissingOnOurSide.Add(theirTx);          // ularda bor, bizda yo'q

    await _reports.SaveAsync(report, ct);

    if (report.HasDifferences)
        await _alerts.RaiseAsync(report, ct);              // ⚠ ALERT

    return report;
}
```

## Farq topilganda

```
   ┌──────────────────────────────────────────────────────────────┐
   │  ⚠ AVTOMATIK TUZATMANG                                        │
   │                                                                │
   │  1. Farq yozib olinadi (reconciliation_differences jadvali)   │
   │  2. ALERT beriladi                                             │
   │  3. Operator ko'rib chiqadi                                    │
   │  4. Tuzatish QO'LDA va AUDIT bilan (M8.13)                    │
   │     → ledger'da REVERSAL yoki qo'shimcha yozuv (10.7)         │
   │                                                                │
   │  Sabab: avtomatik tuzatish bug bo'lsa vaziyatni YOMONLASHTIRADI│
   └──────────────────────────────────────────────────────────────┘

   Istisno: aniq va xavfsiz holatlar (masalan unknown → completed
            provayder tasdig'i bilan) avtomatik hal qilinishi mumkin
```

## Metrikalar

```
   ┌──────────────────────────────────────────────────────────────┐
   │  · farqlar SONI (kunlik trend)                                │
   │  · farqlar SUMMASI                                             │
   │  · hal qilinmagan farqlar YOSHI                                │
   │  · reconciliation bajarilgan vaqti (o'tkazib yuborilmadimi?)  │
   │                                                                │
   │  ⚠ "Farq YO'Q" ham metrika — reconciliation ishlaganini        │
   │    tasdiqlaydi. Job umuman ishlamasa ham "farq yo'q" ko'rinadi.│
   └──────────────────────────────────────────────────────────────┘
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Reconciliation umuman yo'q | Nomuvofiqlik to'planadi va bilinmaydi |
| Farqni avtomatik tuzatish | Bug bo'lsa vaziyat yomonlashadi |
| Kun chegarasini UTC'da olish | Provayder hisoboti bilan mos kelmaydi (M4.7) |
| Faqat summa solishtirish | Holat farqi topilmaydi |
| Job bajarilganini kuzatmaslik | Ishlamayotgani bilinmaydi |
| Farqlarni yozib qo'ymaslik | Tarix yo'q, tendensiya ko'rinmaydi |

## Intervyu savollari

**1. Reconciliation nima va nega kerak?** ⭐

> Bizning yozuvlarimiz va tashqi manba (provayder, bank) solishtirilishi.
>
> Kerak, chunki **hodisalar yo'qolishi muqarrar**: webhook kelmaydi, timeout'da
> holat aniqlanmaydi, bizda yoki ularda bug bo'ladi.
>
> Reconciliation — yakuniy **haqiqat manbai** va u fintech'da majburiy jarayon,
> regulyator ham talab qilishi mumkin.

**2. Farq topilsa nima qilasiz?**

> **Avtomatik tuzatmayman.** Farq yozib olinadi, alert beriladi va operator ko'rib
> chiqadi.
>
> Sabab: agar farq bizning bug'imizdan kelib chiqqan bo'lsa, avtomatik tuzatish
> vaziyatni yomonlashtiradi — masalan noto'g'ri yozuvni «to'g'rilab» ko'proq pul
> harakatlantiradi.
>
> Tuzatish qo'lda va **audit bilan** bajariladi: ledger'da reversal yoki qo'shimcha
> yozuv, kim va nima sababdan qilgani yozib qo'yiladi.

**3. Uch daraja reconciliation nima?**

> **Ichki** — o'z ma'lumotimiz ichida: ledger Δ = 0, keshlangan balans va yig'indi
> mosligi. Har soat bajariladi.
>
> **Tashqi** — provayder hisoboti bilan solishtirish, kuniga bir marta.
>
> **Bank (settlement)** — bank hisobiga tushgan pul bizning yozuvlarga mos
> keladimi.
>
> Uchalasi turli xato turlarini topadi va bir-birini almashtirmaydi.

**4. Reconciliation ishlaganini qanday bilasiz?**

> «Farq yo'q» degan natija **ham metrika** bo'lishi kerak.
>
> Agar job umuman ishlamasa, dashboard baribir «farq yo'q» ko'rsatadi va muammo
> bilinmaydi.
>
> Shuning uchun men **bajarilish vaqtini** ham kuzataman: kutilgan vaqtda
> bajarilmagan bo'lsa — alert.

## Deliverable

```csharp
[Fact]
public async Task Reconciliation_DetectsMissingOnProviderSide()
{
    await SeedOurPayment(reference: "tx-1", amount: 100_000);
    provider.SetStatement(day, []);                    // ularda yo'q

    var report = await reconciler.ReconcileAsync(day, default);

    Assert.Single(report.MissingOnProvider);
    Assert.True(report.HasDifferences);
}

[Fact]
public async Task Reconciliation_DetectsAmountMismatch()
{
    await SeedOurPayment(reference: "tx-1", amount: 100_000);
    provider.SetStatement(day, [new(reference: "tx-1", amount: 99_000)]);

    var report = await reconciler.ReconcileAsync(day, default);
    Assert.Single(report.AmountMismatch);
}

[Fact]
public async Task Reconciliation_UsesBusinessDayBoundary()
{
    await SeedOurPayment(occurredAt: "2026-08-04T18:59:00Z");   // Toshkent 23:59
    await SeedOurPayment(occurredAt: "2026-08-04T19:01:00Z");   // Toshkent 00:01

    var report = await reconciler.ReconcileAsync(new DateOnly(2026, 8, 4), default);
    Assert.Single(report.OurTransactions);
}

[Fact]
public async Task Differences_AreNotAutoCorrected()
{
    await SeedMismatch();
    await reconciler.ReconcileAsync(day, default);

    Assert.Equal(0, await LedgerChangesCountAsync());     // hech nima o'zgarmadi
    Assert.Single(await db.ReconciliationDifferences.ToListAsync());
    Assert.Single(alerts.Raised);
}

[Fact]
public async Task InternalReconciliation_DetectsLedgerImbalance()
{
    await ForceLedgerImbalanceAsync();
    var result = await internalReconciler.CheckAsync(default);

    Assert.False(result.IsBalanced);
    Assert.NotEqual(0, result.Delta);
}
```

## Xotira kartasi

```
Nima         bizning yozuvlar ↔ tashqi manba solishtirilishi
Nega         hodisalar yo'qolishi MUQARRAR (webhook, timeout, bug)
             → yakuniy HAQIQAT MANBAI · fintech'da MAJBURIY
3 daraja     ICHKI (Δ=0, kesh vs yig'indi) — har soat
             TASHQI (provayder hisoboti) — kuniga
             BANK (settlement) — kuniga/haftasiga
Farq turlari bizda bor/ularda yo'q · ularda bor/bizda yo'q
             summa farqi · holat farqi
Farq topilsa ⚠ AVTOMATIK TUZATMANG
             yozib oling → ALERT → operator → qo'lda + AUDIT
Kun chegarasi  BIZNES kuni, mahalliy zonada (M4.7)
Metrika      farqlar soni/summasi · hal qilinmagan farq yoshi
             ⚠ "farq yo'q" HAM metrika — job ishlaganini tasdiqlaydi
```

---

# 10.15 · Distributed lock

## Nima va nega

Bir necha instance bir vaqtda bitta ishni bajarmasligi kerak. Xotiradagi `lock`
bu yerda **ishlamaydi** (M3.9).

```
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │  Pod 1   │  │  Pod 2   │  │  Pod 3   │
   │  lock(_) │  │  lock(_) │  │  lock(_) │  ← har biri O'Z lock'ini oladi
   └────┬─────┘  └────┬─────┘  └────┬─────┘
        └─────────────┴─────────────┘
                      │
                      ▼
             HAMMASI bir vaqtda bajaradi ❌
```

## PostgreSQL advisory lock

```csharp
public async Task<bool> TryRunExclusivelyAsync(
    long lockId, Func<CancellationToken, Task> work, CancellationToken ct)
{
    await using var conn = await _dataSource.OpenConnectionAsync(ct);

    var acquired = await conn.ExecuteScalarAsync<bool>(
        "SELECT pg_try_advisory_lock(@lockId)", new { lockId });

    if (!acquired) return false;              // boshqa instance bajarmoqda

    try { await work(ct); }
    finally
    {
        await conn.ExecuteAsync("SELECT pg_advisory_unlock(@lockId)", new { lockId });
    }

    return true;
}
```

```
   ✅ Afzalliklari:
   · qo'shimcha infratuzilma kerak emas (DB allaqachon bor)
   · ULANISH uzilsa qulf AVTOMATIK bo'shaydi
   · ishonchli (PostgreSQL kafolati)

   ⚠ Cheklovlari:
   · ulanish ochiq turishi kerak (pool bilan ehtiyot — M5.12)
   · PgBouncer transaction rejimida ISHLAMAYDI
```

## Redis lock

```csharp
// Oddiy variant — SET NX PX
var token = Guid.NewGuid().ToString();
var acquired = await _redis.StringSetAsync(
    key: $"lock:{resource}",
    value: token,                              // ⚠ egalik tokeni
    expiry: TimeSpan.FromSeconds(30),          // ⚠ TTL majburiy
    when: When.NotExists);

// Bo'shatish — FAQAT o'z tokeningiz bilan (Lua skript atomik)
const string releaseScript = """
    if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
    else
        return 0
    end
    """;
await _redis.ScriptEvaluateAsync(releaseScript, [key], [token]);
```

```
   ⚠ TOKEN nima uchun kerak:

   Pod 1 qulf oldi (TTL 30s)
   → ish 35 soniya davom etdi
   → TTL tugadi, qulf bo'shadi
   → Pod 2 qulfni oldi
   → Pod 1 tugadi va qulfni BO'SHATDI  ← ⚠ Pod 2 ning qulfini!

   Token bilan: Pod 1 faqat O'Z tokenini o'chira oladi
```

## Redlock va uning tanqidi

```
   Redlock — bir necha Redis instance'da qulf olish algoritmi.

   ⚠ Martin Kleppmann tanqidi:
     · soat siljishi (clock drift) kafolatlarni buzadi
     · GC pauzasi (M2.2) qulf muddatidan uzun bo'lishi mumkin
     · tarmoq kechikishi hisobga olinmagan

   → Redlock "best effort" · qat'iy kafolat uchun YARAMAYDI
```

## Fencing token

```
   ⚠ Hech qanday distributed lock 100% kafolat bermaydi.
     GC pauzasi yoki tarmoq uzilishi paytida ikki egasi bo'lishi mumkin.

   Yechim: FENCING TOKEN — monoton o'suvchi raqam

   Pod 1: qulf oldi, token = 33
          → GC pauza (10 soniya)
   Pod 2: qulf oldi, token = 34
          → yozdi (token 34)
   Pod 1: uyg'ondi, yozmoqchi (token 33)
          → RESURS RAD ETADI: 33 < 34  ✅

   → Resurs tomonida tekshiruv bo'lishi kerak
```

## Distributed lock'dan qochish

```
   ⚠ Eng yaxshi yechim — lock'ni UMUMAN ISHLATMASLIK:

   ┌──────────────────────────────────────────────────────────────┐
   │  · Atomik UPDATE (M5.3) — DB o'zi qulflaydi                   │
   │  · UNIQUE constraint (M5.11) — poyga DB darajasida hal        │
   │  · SKIP LOCKED (M5.4) — ish taqsimlanadi, qulf kerak emas     │
   │  · Idempotentlik (10.4) — takrorlash zarar qilmaydi           │
   │  · Partition kaliti — bir aggregate bir consumer'da (10.9)    │
   └──────────────────────────────────────────────────────────────┘

   Distributed lock — OXIRGI chora
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Xotiradagi `lock` bilan | Bir necha instance'da ishlamaydi |
| TTL qo'ymaslik | Pod yiqilsa qulf abadiy band |
| Tokensiz bo'shatish | Boshqa egasining qulfini o'chirish |
| Fencing token yo'q | Ikki egasi bir vaqtda yozadi |
| Redlock'ga qat'iy kafolat deb ishonish | Noto'g'ri taxmin |
| Lock'ni ortiqcha ishlatish | Sodda yechim borligini o'ylamaslik |

## Intervyu savollari

**1. Bir necha instance'da rejalashtirilgan job qanday ishlaydi?** ⭐

> Sukut bo'yicha **hammasi bajaradi** — reconciliation uchun bu falokat.
>
> Yechim: **PostgreSQL advisory lock** (`pg_try_advisory_lock`). Qo'shimcha
> infratuzilma kerak emas, va ulanish uzilsa qulf avtomatik bo'shaydi.
>
> Muqobil — Redis lock yoki leader election, lekin DB allaqachon borligi uchun
> advisory lock soddaroq.

**2. Redis lock'da qanday tuzoqlar bor?**

> Ikkitasi asosiy.
>
> **TTL majburiy** — aks holda pod yiqilsa qulf abadiy band qoladi.
>
> **Egalik tokeni** — TTL tugab, boshqa pod qulfni olgandan keyin birinchisi uni
> bo'shatib yuborishi mumkin. Shuning uchun bo'shatish Lua skript bilan atomik
> qilinadi va faqat o'z tokeni bilan.
>
> Va Redlock qat'iy kafolat bermaydi: soat siljishi va GC pauzasi uni buzadi.

**3. Distributed lock kerakmi?**

> Ko'pincha **yo'q**. Avval soddaroq yo'llarni qidiraman:
> - **atomik `UPDATE`** — DB o'zi qulflaydi (M5.3);
> - **`UNIQUE` constraint** — poyga DB darajasida hal bo'ladi (M5.11);
> - **`SKIP LOCKED`** — ish taqsimlanadi, qulf kerak emas (M5.4);
> - **idempotentlik** — takrorlash zarar qilmaydi.
>
> Distributed lock — oxirgi chora, chunki u hech qachon 100% kafolat bermaydi.

## Xotira kartasi

```
Muammo       xotiradagi lock bir necha instance'da ISHLAMAYDI
Postgres     pg_try_advisory_lock — qo'shimcha infratuzilma kerak emas
             ulanish uzilsa AVTOMATIK bo'shaydi
             ⚠ PgBouncer transaction rejimida ishlamaydi
Redis        SET NX PX + EGALIK TOKENI + Lua bilan atomik bo'shatish
             TTL MAJBURIY · tokensiz bo'shatish — boshqaning qulfini o'chiradi
Redlock      "best effort" · soat siljishi va GC pauzasi kafolatni buzadi
Fencing      monoton o'suvchi token → resurs eski token'ni RAD ETADI
             hech qanday lock 100% kafolat bermaydi
QOCHING      atomik UPDATE · UNIQUE · SKIP LOCKED · idempotentlik
             distributed lock — OXIRGI chora
```

---

# 10.16 · Idempotency-Key API darajasida ⭐

## Nima va nega

`POST` idempotent emas (M7.6). Tarmoq uzildi, client qayta yubordi — kalitsiz ikki
marta pul yechiladi.

```
   Client                              Server
      │                                   │
      │──── POST /payments ──────────────►│  pul yechildi ✓
      │                                   │
      │◄──────── javob ────X yo'qoldi     │
      │                                   │
      │  "javob kelmadi, qayta yuboraman" │
      │                                   │
      │──── POST /payments ──────────────►│  ⚠ YANA pul yechiladi
```

## Protokol

```
   POST /api/v1/payments
   Idempotency-Key: 6f1c2a54-9b3e-4d21-8f0a-2c7c9c1b1f77

   ┌──────────────────────────────────────────────────────────────┐
   │  1. Kalit bo'yicha yozuv bormi?                               │
   │     ├─ status = completed  → SAQLANGAN javobni qaytar         │
   │     │                        (yangi pul YECHILMAYDI)          │
   │     ├─ status = in_progress → 409 yoki qisqa kutish           │
   │     └─ yo'q → 2-qadam                                          │
   │                                                                │
   │  2. Kalitni UNIQUE constraint bilan yoz (in_progress)         │
   │     └─ 23505 xatosi → parallel so'rov bor → 1-qadamga qayt    │
   │                                                                │
   │  3. request_hash ni solishtir                                  │
   │     └─ farq qilsa → 422 (bir xil kalit, boshqa so'rov)        │
   │                                                                │
   │  4. Biznes operatsiyani bajar                                  │
   │                                                                │
   │  5. Javobni saqla, status = completed                          │
   └──────────────────────────────────────────────────────────────┘
```

## Sxema

```sql
CREATE TABLE idempotency_keys (
    key            text PRIMARY KEY,           -- ⚠ UNIQUE — poyga DB'da hal qilinadi
    user_id        uuid NOT NULL,              -- kalit foydalanuvchiga bog'langan
    endpoint       text NOT NULL,              -- bir kalit turli endpoint uchun emas
    request_hash   text NOT NULL,              -- ⚠ so'rov tanasi hash'i
    status         text NOT NULL CHECK (status IN ('in_progress','completed')),
    response_code  int,
    response_body  jsonb,
    created_at     timestamptz NOT NULL DEFAULT now(),
    completed_at   timestamptz
);

CREATE INDEX ix_idem_cleanup ON idempotency_keys (created_at);
```

## Implementatsiya

```csharp
public sealed class IdempotencyFilter(AppDbContext db, IClock clock) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var http = ctx.HttpContext;
        var key = http.Request.Headers["Idempotency-Key"].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(key))
            return Results.BadRequest("Idempotency-Key majburiy");

        var userId = http.User.GetUserId();
        var bodyHash = await ComputeBodyHashAsync(http.Request);

        var existing = await db.IdempotencyKeys
            .FirstOrDefaultAsync(k => k.Key == key && k.UserId == userId);

        if (existing is not null)
        {
            if (existing.RequestHash != bodyHash)
                return Results.UnprocessableEntity(
                    "Bu kalit boshqa so'rov uchun ishlatilgan");    // ⚠ MUHIM

            if (existing.Status == "in_progress")
                return Results.Conflict("So'rov qayta ishlanmoqda");

            http.Response.StatusCode = existing.ResponseCode!.Value;
            return Results.Content(existing.ResponseBody!, "application/json");
        }

        try
        {
            db.IdempotencyKeys.Add(new IdempotencyKey(key, userId, endpoint, bodyHash));
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: "23505" })
        {
            return Results.Conflict("So'rov qayta ishlanmoqda");    // parallel so'rov
        }

        var result = await next(ctx);
        await StoreResponseAsync(key, result);
        return result;
    }
}
```

## `request_hash` nega kerak

```
   ⚠ Bir xil kalit, BOSHQA so'rov — bu client BUG'i:

   POST /payments  Idempotency-Key: abc  { "amount": 100 }   → 201
   POST /payments  Idempotency-Key: abc  { "amount": 500 }   → ?

   ❌ Jimgina birinchi javobni qaytarish:
      client 500 to'ladi deb o'ylaydi, aslida 100 to'langan

   ✅ 422 qaytarish: "bu kalit boshqa so'rov uchun ishlatilgan"
      → client bug'i darhol ko'rinadi
```

## Kalitni kim yaratadi

```
   ⚠ CLIENT yaratadi, server emas.

   Sabab: aynan client qayta yuborayotganini biladi.
          Server yaratsa — har so'rov yangi kalit oladi va himoya yo'q.

   Format: UUID v4 (yoki client tomonidagi barqaror ID)
   Muddat: 24 soat – bir necha kun (client retry oynasidan uzun)
```

## Tozalash

```sql
-- Muddat > client'ning maksimal retry oynasi
DELETE FROM idempotency_keys
WHERE created_at < now() - interval '7 days';
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Kalitni ilovada tekshirish (`SELECT` keyin `INSERT`) | Write skew — parallel so'rov o'tadi |
| `request_hash` tekshirmaslik | Client bug'i yashiriladi |
| Javobni saqlamaslik | Takroriy so'rov qayta bajariladi |
| Kalitni foydalanuvchiga bog'lamaslik | Boshqa foydalanuvchi kalitini «o'g'irlashi» mumkin |
| Server kalit yaratishi | Himoya ishlamaydi |
| Tozalash muddatini qisqa qilish | Eski retry qayta bajariladi |

## Intervyu savollari

**1. `Idempotency-Key` qanday ishlaydi?** ⭐

> Client har operatsiya uchun unikal kalit yaratadi va **qayta yuborishda o'sha
> kalitni** ishlatadi.
>
> Server kalitni ko'rgan bo'lsa — saqlangan javobni qaytaradi va yangi operatsiya
> bajarmaydi.
>
> Kalit `UNIQUE` constraint bilan yoziladi — bu **parallel kelgan ikki bir xil
> so'rovni ham** to'g'ri hal qiladi (M5.11). Ilovada `SELECT` qilib tekshirish
> yetarli emas: bu write skew.

**2. Bir xil kalit, boshqa summa kelsa?**

> `422` qaytaraman.
>
> Bu client **bug'i**: jimgina eski javobni qaytarsam, client 500 to'ladi deb
> o'ylaydi, aslida 100 to'langan bo'ladi.
>
> Shuning uchun so'rov tanasining hash'i saqlanadi va solishtiriladi.

**3. Kalitni kim yaratadi?**

> **Client**. Aynan u qayta yuborayotganini biladi.
>
> Server yaratsa — har so'rov yangi kalit oladi va himoya umuman ishlamaydi.
>
> Bu Stripe'ning yondashuvi va sanoat standarti.

**4. Kalit qancha vaqt saqlanadi?**

> Client'ning **maksimal retry oynasidan uzunroq** — odatda 24 soatdan bir necha
> kungacha.
>
> Qisqa bo'lsa, kech kelgan retry qayta bajariladi va dublikat bo'ladi.
>
> Va kalit **foydalanuvchiga bog'langan** bo'lishi kerak, aks holda bir foydalanuvchi
> boshqasining kalitini ishlatib javobini olishi mumkin.

## Deliverable

```csharp
[Fact]
public async Task SameKey_ReturnsStoredResponse()
{
    var key = Guid.NewGuid().ToString();

    var first  = await PostPaymentAsync(key, amountMinor: 80_000);
    var second = await PostPaymentAsync(key, amountMinor: 80_000);

    Assert.Equal(HttpStatusCode.Created, first.StatusCode);
    Assert.Equal(HttpStatusCode.Created, second.StatusCode);
    Assert.Equal(await first.Content.ReadAsStringAsync(),
                 await second.Content.ReadAsStringAsync());
    Assert.Equal(1, await db.Payments.CountAsync());          // BITTA to'lov
}

[Fact]
public async Task SameKeyDifferentBody_Returns422()
{
    var key = Guid.NewGuid().ToString();
    await PostPaymentAsync(key, amountMinor: 80_000);

    var response = await PostPaymentAsync(key, amountMinor: 500_000);
    Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
}

[Fact]
public async Task ParallelSameKey_OnlyOnePaymentCreated()
{
    var key = Guid.NewGuid().ToString();

    var responses = await Task.WhenAll(
        PostPaymentAsync(key, 80_000),
        PostPaymentAsync(key, 80_000),
        PostPaymentAsync(key, 80_000));

    Assert.Equal(1, await db.Payments.CountAsync());
    Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
}

[Fact]
public async Task MissingKey_Returns400()
    => Assert.Equal(HttpStatusCode.BadRequest,
                    (await client.PostAsJsonAsync("/api/v1/payments", request)).StatusCode);

[Fact]
public async Task KeyIsScopedToUser()
{
    var key = Guid.NewGuid().ToString();
    await PostPaymentAsync(key, 80_000, asUser: userA);

    var response = await PostPaymentAsync(key, 80_000, asUser: userB);
    Assert.Equal(HttpStatusCode.Created, response.StatusCode);   // alohida kalit
}
```

## Xotira kartasi

```
Sabab        POST idempotent EMAS · tarmoq uzilsa client qayta yuboradi
Protokol     kalit bor? → saqlangan javob · yo'q? → UNIQUE bilan yoz → bajar → saqla
UNIQUE       poyga DB darajasida hal qilinadi (23505)
             ⚠ SELECT keyin INSERT — write skew, YETARLI EMAS
request_hash bir xil kalit + boshqa body → 422 (client BUG'i)
             jimgina eski javob qaytarish — XAVFLI
Kalitni      CLIENT yaratadi (u qayta yuborayotganini biladi)
Bog'lash     kalit FOYDALANUVCHIGA bog'langan bo'lsin
Saqlash      client retry oynasidan uzunroq (24 soat – 7 kun)
Holatlar     in_progress → 409 · completed → saqlangan javob
```

---

## M10 — yakuniy tekshiruv ro'yxati

Kodsiz, og'zaki javob bera olsangiz — modul yopilgan:

- [ ] CAP'da P nega tanlov emas, PACELC nima qo'shadi
- [ ] Dual write muammosi va uning to'rt buzilish yo'li
- [ ] `try/catch` nega yordam bermaydi
- [ ] Outbox pattern qanday ishlaydi va narxi
- [ ] Bir necha relay instance qanday ishlaydi
- [ ] Idempotent consumer'ni qanday quriladi
- [ ] Inbox har doim kerakmi
- [ ] Nega exactly-once yetkazish mavjud emas
- [ ] Kafka EOS nima uchun yetarli emas
- [ ] Saga: choreography va orchestration
- [ ] Saga nega ACID emas — isolation
- [ ] Compensating transaction rollback bilan bir xilmi
- [ ] RabbitMQ'da xabar yo'qolmasligini qanday kafolatlaysiz
- [ ] Poison message muammosi
- [ ] Kafka'da tartib qanday kafolatlanadi
- [ ] Consumer lag nima
- [ ] Delta va yakuniy holat — qaysi biri
- [ ] Retry'ning uch sharti, jitter nega kerak
- [ ] Retry qayerda qilinishi kerak
- [ ] Circuit breaker va bulkhead
- [ ] Timeout ierarxiyasi
- [ ] **Timeout bo'lsa to'lov o'tdimi** ⭐
- [ ] Reconciliation nega majburiy, farq topilsa nima qilasiz
- [ ] Distributed lock tuzoqlari va undan qochish yo'llari
- [ ] `Idempotency-Key` protokoli, `request_hash` nega kerak

**Deliverable'lar:**

- [ ] `OutboxTests` — atomiklik, parallel relay, at-least-once isboti
- [ ] `InboxTests` — dublikat, parallel dublikat, rollback
- [ ] `SagaTests` — teskari tartibda kompensatsiya, crash'dan keyin davom etish
- [ ] `ReversalTests` — balans tiklanishi, tarix saqlanishi, idempotentlik
- [ ] `RetryTests` — tranzient/tranzient emas, jitter, bir xil kalit
- [ ] `UnknownStateTests` — timeout `unknown` beradi, status so'rovi hal qiladi
- [ ] `ReconciliationTests` — farq turlari, avtomatik tuzatmaslik, biznes kuni
- [ ] `IdempotencyKeyTests` — takroriy so'rov, boshqa body, parallel so'rov
