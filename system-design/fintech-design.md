# M11 · System design — fintech

Doskada chiziladigan qism. Bu yerda **javob strukturasi** ham, tarkib ham muhim:
intervyu qiluvchi sizning fikrlash tartibingizni ko'radi.

| # | Mavzu | P |
|---|---|---|
| [11.1](#111--design-intervyusining-tuzilishi-) | Design intervyusining tuzilishi ⭐ | P0 |
| [11.2](#112--double-entry-ledger-) | Double-entry ledger ⭐ | P0 |
| [11.3](#113--hisoblar-rejasi-chart-of-accounts) | Hisoblar rejasi | P1 |
| [11.4](#114--wallet-va-balans-) | Wallet va balans ⭐ | P0 |
| [11.5](#115--tolov-oqimi-va-holatlar-mashinasi-) | To'lov oqimi va holatlar mashinasi ⭐ | P0 |
| [11.6](#116--karta-tolovlari) | Karta to'lovlari | P1 |
| [11.7](#117--p2p-otkazma-) | P2P o'tkazma ⭐ | P0 |
| [11.8](#118--rejalashtirilgan-tolovlar-va-obuna) | Rejalashtirilgan to'lovlar, obuna | P2 |
| [11.9](#119--limit-va-anti-fraud) | Limit va anti-fraud | P1 |
| [11.10](#1110--kyc-oqimi) | KYC oqimi | P1 |
| [11.11](#1111--hisobot-va-statement) | Hisobot va statement | P2 |
| [11.12](#1112--kesh-strategiyasi) | Kesh strategiyasi | P1 |
| [11.13](#1113--masshtablash-tartibi-) | Masshtablash tartibi ⭐ | P1 |
| [11.14](#1114--rate-limiting-algoritmlari) | Rate limiting algoritmlari | P1 |
| [11.15](#1115--multi-tenancy) | Multi-tenancy | P2 |
| [11.16](#1116--notification) | Notification | P2 |

---

# 11.1 · Design intervyusining tuzilishi ⭐

## Nima va nega

45 daqiqada butun tizimni loyihalab bo'lmaydi. Baholanadigan narsa — **tartib va
trade-off'lar**, tafsilotlar emas.

```
   ┌─ 1. TALABLARNI ANIQLASH (5–8 daqiqa) ──────────────────────┐
   │  ⚠ Darhol chizishga tushmang — bu eng ko'p uchraydigan xato │
   │  · Funksional: nima qiladi?                                  │
   │  · Nofunksional: hajm, kechikish, mavjudlik                  │
   │  · Chegara: nima KIRMAYDI (scope)                            │
   ├─ 2. HAJMNI BAHOLASH (3–5 daqiqa) ──────────────────────────┤
   │  · RPS, ma'lumot hajmi, o'sish                               │
   │  · o'qish/yozish nisbati                                     │
   ├─ 3. API SHARTNOMASI (5 daqiqa) ────────────────────────────┤
   │  · asosiy endpoint'lar, so'rov/javob                         │
   ├─ 4. MA'LUMOT MODELI (8–10 daqiqa) ─────────────────────────┤
   │  · jadvallar, kalitlar, indekslar                            │
   │  · ⚠ fintech'da ENG MUHIM qism                               │
   ├─ 5. YUQORI DARAJADAGI SXEMA (5–8 daqiqa) ──────────────────┤
   │  · komponentlar va ular orasidagi oqim                       │
   ├─ 6. CHUQURLASHISH (10 daqiqa) ─────────────────────────────┤
   │  · intervyu qiluvchi tanlagan qism                           │
   ├─ 7. TRADE-OFF VA MUAMMOLAR (5 daqiqa) ─────────────────────┤
   │  · bo'g'izlar, nosozliklar, monitoring                       │
   └─────────────────────────────────────────────────────────────┘
```

## So'raladigan savollar

```
   FUNKSIONAL:
   · Kim foydalanadi? (mijoz, merchant, operator)
   · Qaysi valyutalar? Ko'p valyutalimi?
   · Tashqi provayderlar bormi?
   · Refund/reversal kerakmi?

   NOFUNKSIONAL:
   · Kuniga necha tranzaksiya? Cho'qqi qachon?
   · Kechikish talabi? (p95, p99)
   · Mavjudlik? (99.9% = oyiga 43 daqiqa uzilish)
   · Ma'lumot saqlash muddati? (regulyator)

   CHEGARA:
   · KYC bu tizimda bormi yoki alohida servismi?
   · Anti-fraud kirdimi?
   · Hisobot va analitika kirdimi?
```

## Hajm baholash namunasi

```
   Kuniga 1 million to'lov

   RPS (o'rtacha)  = 1_000_000 / 86_400 ≈ 12 RPS
   RPS (cho'qqi)   = 12 × 5 ≈ 60 RPS        (cho'qqi koeffitsienti 3–10)

   Yozish:
   · har to'lov ≈ 2 ledger yozuvi + 1 payment + 1 outbox = 4 qator
   · 4 million qator/kun

   Ma'lumot hajmi:
   · ledger yozuvi ≈ 100 bayt
   · 2 mln × 100 B = 200 MB/kun ≈ 73 GB/yil
   · 7 yil saqlash → ~500 GB (indekslar bilan ~1 TB)

   O'qish:
   · balans so'rovi ≈ 10× ko'p → 600 RPS
   · o'qish/yozish nisbati 10:1

   ⚠ XULOSA: 60 RPS — bu BITTA PostgreSQL uchun juda kam yuk.
     Sharding kerak emas (M5.14). Buni aytish YETUKLIK belgisi.
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Darhol chizishga tushish | Noto'g'ri masalani yechasiz |
| Talablarni so'ramaslik | Taxminlar noto'g'ri chiqadi |
| Hajmni baholamaslik | Ortiqcha murakkab yechim |
| Darhol mikroservis taklif qilish | Tajribasizlik belgisi |
| Trade-off aytmaslik | «Bu yechimning kamchiligi nima?» savolida qoqilasiz |
| Ma'lumot modelini o'tkazib yuborish | Fintech'da bu eng muhim qism |

## Trade-off'larni aytish

```
   Har qaror uchun:  "X ni tanladim, chunki Y. Narxi — Z."

   ✅ "Balansni ledger'dan hisoblayman, chunki bu audit'ga chidamli.
       Narxi — o'qish sekinroq, shuning uchun snapshot qo'shaman."

   ❌ "Balansni jadvalda saqlayman."   (nega? narxi?)
```

## Intervyu savollari

**1. Design intervyusini qanday boshlaysiz?** ⭐

> **Talablarni aniqlashdan** — hech qachon darhol chizishga tushmayman.
>
> Funksional: kim foydalanadi, qaysi valyutalar, tashqi provayderlar bormi, refund
> kerakmi. Nofunksional: kuniga necha tranzaksiya, cho'qqi, kechikish va mavjudlik
> talabi, saqlash muddati.
>
> Va **chegara**: nima bu tizimga kirmaydi. Bu 45 daqiqada nima ulgurishni
> belgilaydi.
>
> Keyin hajmni baholayman — u yechim darajasini belgilaydi.

**2. Hajmni baholash nima beradi?**

> U **ortiqcha murakkablikning oldini oladi**.
>
> Masalan: kuniga 1 million to'lov — bu cho'qqida ~60 RPS. Bu bitta yaxshi
> sozlangan PostgreSQL uchun juda kam yuk. Sharding, alohida read DB, murakkab
> keshlash — bularning hech biri kerak emas.
>
> Buni ayta olish yetuklik belgisi: ko'pchilik darhol Kafka va mikroservis taklif
> qiladi.

## Xotira kartasi

```
Tartib       1. TALABLAR (5–8 daq) — darhol chizmang
             2. hajm baholash · 3. API · 4. MA'LUMOT MODELI (fintech'da eng muhim)
             5. yuqori sxema · 6. chuqurlashish · 7. trade-off
So'rang      kim · valyutalar · provayderlar · refund
             RPS · cho'qqi · p95/p99 · mavjudlik · saqlash muddati
             CHEGARA: nima kirmaydi
Baholash     1 mln/kun → ~12 RPS o'rtacha, ~60 cho'qqi
             → BITTA PostgreSQL uchun KAM yuk → sharding KERAK EMAS
Trade-off    "X ni tanladim, chunki Y. Narxi — Z."
Xato         darhol chizish · darhol mikroservis · trade-off aytmaslik
```

---

# 11.2 · Double-entry ledger ⭐

## Nima va nega

Fintech system design'ning **markazi**. Balans saqlanmaydi — u yozuvlardan hosil
bo'ladi.

```
   Asosiy tamoyil: HAR HARAKAT UCHUN IKKI YOZUV
                   qayerdan (debit) va qayerga (credit)
                   yig'indi DOIM NOL

   ┌──────┬──────────┬──────────────────┬─────────┬─────────┐
   │entry │ tx       │ hisob            │  DEBIT  │ CREDIT  │
   ├──────┼──────────┼──────────────────┼─────────┼─────────┤
   │e-9001│ tx-4471  │ Ali · wallet     │  80 000 │    —    │
   │e-9002│ tx-4471  │ Vali · wallet    │    —    │  80 000 │
   │e-9003│ tx-4472  │ Vali · wallet    │   1 200 │    —    │
   │e-9004│ tx-4472  │ Komissiya daromad│    —    │   1 200 │
   ├──────┴──────────┴──────────────────┼─────────┼─────────┤
   │  YIG'INDI                          │  81 200 │  81 200 │
   │                                     │      Δ = 0  ✓     │
   └─────────────────────────────────────┴───────────────────┘

   → Komissiya ham HISOB. "Yo'qolgan pul" degan tushuncha YO'Q.
   → Har so'm qayerdandir kelib, qayergadir ketadi.
```

## Sxema

```sql
CREATE TABLE ledger_entries (
    id             bigserial PRIMARY KEY,
    transaction_id uuid    NOT NULL,
    account_id     uuid    NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    direction      char(2) NOT NULL CHECK (direction IN ('DR','CR')),
    amount_minor   bigint  NOT NULL CHECK (amount_minor > 0),   -- ⚠ musbat
    currency       char(3) NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),

    -- Kontekst
    entry_type     text NOT NULL,        -- transfer, fee, reversal, settlement
    reference      text,                 -- tashqi tranzaksiya ID
    reversal_of    uuid,                 -- reversal bo'lsa (M10.7)

    UNIQUE (transaction_id, account_id, direction)   -- dublikat yozuv yo'q
);

CREATE INDEX ix_entries_account ON ledger_entries (account_id, created_at DESC);
CREATE INDEX ix_entries_tx      ON ledger_entries (transaction_id);

-- ⚠ APPEND-ONLY (M5.11)
REVOKE UPDATE, DELETE ON ledger_entries FROM app_user;
```

```
   ⚠ amount_minor HAR DOIM MUSBAT.
     Yo'nalish `direction` bilan ifodalanadi.
     Manfiy summa ruxsat etilsa — DR/CR mantiqi buziladi va
     xatolarni topish qiyinlashadi.
```

## Balansni hisoblash

```sql
-- Oddiy variant (kichik hajm)
SELECT SUM(CASE direction WHEN 'CR' THEN amount_minor ELSE -amount_minor END)
FROM   ledger_entries
WHERE  account_id = @id AND currency = @ccy;
```

```
   Millionlab yozuvda bu sekin → SNAPSHOT:

   ┌──────────────────────────────────────────────────────────────┐
   │  account_balances (snapshot)                                  │
   │  account_id · currency · balance_minor · last_entry_id        │
   │                                                                │
   │  Joriy balans = snapshot.balance                              │
   │               + SUM(entries WHERE id > snapshot.last_entry_id)│
   │                                                                │
   │  Snapshot davriy yangilanadi (job yoki har N yozuvda)         │
   └──────────────────────────────────────────────────────────────┘
```

```csharp
// Amalda: keshlangan balans + yozuvlar bilan BITTA tranzaksiyada yangilanadi
await using var tx = await db.Database.BeginTransactionAsync(ct);

db.LedgerEntries.AddRange(debit, credit);

await db.Database.ExecuteSqlInterpolatedAsync($"""
    UPDATE account_balances
    SET balance_minor = balance_minor - {amount.Minor}, version = version + 1
    WHERE account_id = {fromId} AND currency = {currency}
      AND balance_minor >= {amount.Minor}
    """, ct);      // ⚠ atomik shart (M5.3)

await db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);
```

## Invariantlar

```
   ┌──────────────────────────────────────────────────────────────┐
   │  1. SUM(DR) = SUM(CR)  — har tranzaksiya ichida                │
   │  2. SUM(DR) = SUM(CR)  — butun ledger bo'yicha (har valyuta)   │
   │  3. keshlangan balans == SUM(entries)                          │
   │  4. amount_minor > 0                                            │
   │  5. yozuv o'chirilmaydi va o'zgartirilmaydi                     │
   └──────────────────────────────────────────────────────────────┘

   → 1 va 4: DB constraint bilan
   → 2 va 3: reconciliation job bilan (M10.14), soatlik
```

```sql
-- Har tranzaksiya balansliligini majburlash (deferred constraint)
CREATE OR REPLACE FUNCTION check_transaction_balanced() RETURNS trigger AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM ledger_entries
        WHERE transaction_id = NEW.transaction_id
        GROUP BY transaction_id, currency
        HAVING SUM(CASE direction WHEN 'DR' THEN amount_minor ELSE -amount_minor END) <> 0
    ) THEN
        RAISE EXCEPTION 'Tranzaksiya balanslanmagan: %', NEW.transaction_id;
    END IF;
    RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_balanced
    AFTER INSERT ON ledger_entries
    DEFERRABLE INITIALLY DEFERRED       -- ⚠ COMMIT paytida tekshiriladi
    FOR EACH ROW EXECUTE FUNCTION check_transaction_balanced();
```

## Xatoni tuzatish

```
   ❌ UPDATE yoki DELETE — taqiqlangan

   ✅ REVERSAL (M10.7): teskari yozuv qo'shiladi
      → balans tiklanadi, tarix to'liq ko'rinadi
      → auditor "nima bo'lganini" ko'radi
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Faqat `UPDATE balance` | «Bu pul qayerdan?» savoliga javob yo'q |
| Manfiy `amount_minor` | DR/CR mantiqi buziladi |
| Yozuvni o'chirish/o'zgartirish | Audit buziladi |
| Komissiyani hisobga olmaslik | Δ ≠ 0 |
| Ko'p valyutada umumiy Δ tekshirish | Ma'nosiz — har valyuta alohida (M4.6) |
| Δ = 0 ni tekshirmaslik | Xato jimgina to'planadi |

## Intervyu savollari

**1. Ledger jadvalini qanday loyihalaysiz?** ⭐

> **Append-only `ledger_entries`**: har tranzaksiya kamida ikki yozuv beradi —
> debit va credit, ularning yig'indisi nol.
>
> `amount_minor` har doim **musbat**, yo'nalish `direction` ustuni bilan.
>
> Balans — yozuvlardan **hosila**. Katta hajmda snapshot qo'shiladi, lekin haqiqat
> manbai baribir yozuvlar bo'lib qoladi.
>
> Xato bo'lsa `UPDATE` emas, **reversal** yozuvi. Va `Δ = 0` tekshiruvi kunlik
> reconciliation bilan.

**2. Komissiyani qayerga yozasiz?**

> Alohida **hisobga** — «komissiya daromadi». Bu ham to'liq huquqli hisob.
>
> Agar komissiyani shunchaki summadan ayirib qo'ysam, `Δ ≠ 0` bo'ladi va pul
> «yo'qolgan» ko'rinadi.
>
> Double-entry'da «yo'qolgan pul» degan tushuncha yo'q: har so'm qayerdandir kelib,
> qayergadir ketadi.

**3. Balansni qanday hisoblaysiz?**

> Kichik hajmda — yozuvlar yig'indisi bilan.
>
> Katta hajmda — **snapshot**: `account_balances` jadvalida keshlangan qiymat, u
> yozuvlar bilan **bitta tranzaksiyada** yangilanadi va atomik shart bilan
> himoyalanadi (`WHERE balance >= @amount`).
>
> Va davriy job snapshot'ni yozuvlar yig'indisi bilan solishtiradi — farq bo'lsa
> bu **alert**, chunki u bug yoki race belgisi.

## Deliverable

```csharp
[Fact]
public async Task Transfer_CreatesBalancedEntries()
{
    await service.TransferAsync(from, to, Money.FromMajor(800m, Currency.Uzs), key, default);

    var entries = await db.LedgerEntries.Where(e => e.TransactionId == txId).ToListAsync();
    Assert.Equal(2, entries.Count);
    Assert.Equal(0, Delta(entries));
}

[Fact]
public async Task UnbalancedTransaction_IsRejected()
{
    await Assert.ThrowsAsync<PostgresException>(async () =>
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        db.LedgerEntries.Add(Debit(account, 800));       // credit YO'Q
        await db.SaveChangesAsync();
        await tx.CommitAsync();                           // ⚠ deferred trigger
    });
}

[Fact]
public async Task LedgerDelta_IsZeroPerCurrency()
{
    await MakeRandomTransactionsAsync(count: 1000);

    foreach (var currency in new[] { "UZS", "USD" })
        Assert.Equal(0, await LedgerDeltaAsync(currency));
}

[Fact]
public async Task CachedBalance_MatchesEntrySum()
{
    await MakeRandomTransactionsAsync(count: 500);

    Assert.Equal(await SumEntriesAsync(accountId), await GetCachedBalanceAsync(accountId));
}
```

## Xotira kartasi

```
Tamoyil      har harakat = IKKI yozuv (DR + CR) · yig'indi DOIM NOL
Sxema        append-only · amount_minor HAR DOIM MUSBAT · direction DR/CR
             UNIQUE (tx_id, account_id, direction) · REVOKE UPDATE/DELETE
Komissiya    ham HISOB — "yo'qolgan pul" tushunchasi YO'Q
Balans       yozuvlardan HOSILA · katta hajmda SNAPSHOT
             kesh yozuvlar bilan BITTA tranzaksiyada + atomik shart
Invariantlar tx ichida Δ=0 (deferred trigger) · butun ledger Δ=0 (har valyuta)
             kesh == SUM(entries) · amount > 0 · o'chirilmaydi
Xato         UPDATE emas → REVERSAL yozuvi
Tekshiruv    reconciliation soatlik/kunlik → farq bo'lsa ALERT
```

---

# 11.3 · Hisoblar rejasi (chart of accounts)

## Nima va nega

Ledger'da **kimning hisobi** bor? Faqat mijozlar emas — tizimning ichki hisoblari
ham kerak, aks holda Δ = 0 saqlanmaydi.

```
   HISOB TURLARI (buxgalteriya tasnifi):

   ┌──────────────┬─────────────┬────────────────────────────────┐
   │  Tur         │ Normal      │  Fintech misoli                │
   │              │ balans      │                                │
   ├──────────────┼─────────────┼────────────────────────────────┤
   │  ASSET       │  DEBIT      │  Bank hisobi (nostro), naqd    │
   │  LIABILITY   │  CREDIT     │  Mijoz walleti (biz qarzdormiz)│
   │  REVENUE     │  CREDIT     │  Komissiya daromadi            │
   │  EXPENSE     │  DEBIT      │  Provayder to'lovi             │
   │  EQUITY      │  CREDIT     │  Kapital                       │
   └──────────────┴─────────────┴────────────────────────────────┘

   ⚠ Mijoz walleti — bu bizning LIABILITY (majburiyat).
     Mijoz pulini biz saqlaymiz, ya'ni unga qarzdormiz.
```

## Ichki hisoblar

```
   Har oqim uchun ikki tomon kerak:

   ┌──────────────────────────────────────────────────────────────┐
   │  Mijoz pul to'ldirdi (provayder orqali):                      │
   │                                                                │
   │  DR  Bank nostro (ASSET)          100 000   ← pul bizga keldi │
   │  CR  Ali wallet (LIABILITY)       100 000   ← unga qarzdormiz │
   ├──────────────────────────────────────────────────────────────┤
   │  Mijoz o'tkazma qildi (komissiya bilan):                      │
   │                                                                │
   │  DR  Ali wallet                    81 200                     │
   │  CR  Vali wallet                   80 000                     │
   │  CR  Komissiya daromadi (REVENUE)   1 200                     │
   ├──────────────────────────────────────────────────────────────┤
   │  Provayderga komissiya to'ladik:                              │
   │                                                                │
   │  DR  Provayder xarajati (EXPENSE)     500                     │
   │  CR  Bank nostro (ASSET)              500                     │
   └──────────────────────────────────────────────────────────────┘
```

## Maxsus hisoblar

```
   ┌─ SUSPENSE (kutish hisobi) ──────────────────────────────────┐
   │  Holati noaniq pul: unknown to'lovlar (M10.13),              │
   │  identifikatsiya qilinmagan tushumlar                        │
   │  ⚠ Bu hisob DOIM kuzatiladi — undagi pul "osilib" qolgan     │
   ├─ CLEARING (hisob-kitob) ───────────────────────────────────┤
   │  Provayder bilan settlement'gacha oraliq hisob               │
   ├─ FX GAIN/LOSS ─────────────────────────────────────────────┤
   │  Valyuta konvertatsiyasidagi farq (M4.6)                     │
   ├─ ROUNDING ─────────────────────────────────────────────────┤
   │  Yaxlitlash qoldig'i (M4.5)                                  │
   └─────────────────────────────────────────────────────────────┘
```

## Sxema

```sql
CREATE TABLE accounts (
    id            uuid PRIMARY KEY,
    account_type  text NOT NULL CHECK (account_type IN
                    ('asset','liability','revenue','expense','equity')),
    owner_type    text NOT NULL,        -- customer, merchant, system
    owner_id      uuid,                 -- system bo'lsa NULL
    currency      char(3) NOT NULL,
    code          text NOT NULL,        -- 'customer.wallet', 'system.fee_revenue'
    status        text NOT NULL DEFAULT 'active',
    created_at    timestamptz NOT NULL DEFAULT now(),

    UNIQUE (owner_type, owner_id, currency, code)
);

-- Tizim hisoblari — oldindan yaratiladi
INSERT INTO accounts (id, account_type, owner_type, currency, code) VALUES
  (gen_random_uuid(), 'asset',     'system', 'UZS', 'system.bank_nostro'),
  (gen_random_uuid(), 'revenue',   'system', 'UZS', 'system.fee_revenue'),
  (gen_random_uuid(), 'expense',   'system', 'UZS', 'system.provider_cost'),
  (gen_random_uuid(), 'liability', 'system', 'UZS', 'system.suspense');
```

## Intervyu savollari

**1. Mijoz walleti qanday hisob turi?**

> **Liability** — majburiyat. Mijoz pulini biz saqlaymiz, ya'ni unga qarzdormiz.
>
> Bu buxgalteriya nuqtai nazaridan muhim: bizning aktivimiz emas, majburiyatimiz.
> Bank hisobidagi pul esa **asset**.
>
> Bu farq hisobot va audit uchun kritik.

**2. Komissiya qanday yoziladi?**

> Alohida **revenue** hisobiga credit sifatida.
>
> Mijoz o'tkazmasida: mijoz walletidan 81 200 debit, qabul qiluvchiga 80 000
> credit, komissiya daromadiga 1 200 credit. Yig'indi nol.
>
> Va provayderga to'lanadigan komissiya alohida **expense** hisobiga yoziladi —
> daromad va xarajat aralashtirilmaydi.

**3. Suspense hisobi nima uchun kerak?**

> Holati noaniq pul uchun: `unknown` to'lovlar (M10.13), identifikatsiya qilinmagan
> tushumlar, xato bilan kelgan mablag'.
>
> Usiz bunday pul «hech qayerda» qoladi va `Δ = 0` buziladi.
>
> Va bu hisob **doim kuzatiladi**: undagi qoldiq o'sib borsa yoki uzoq turib
> qolsa — bu muammo belgisi va qo'lda hal qilinishi kerak.

## Xotira kartasi

```
Turlar       ASSET (DR) · LIABILITY (CR) · REVENUE (CR) · EXPENSE (DR) · EQUITY
Mijoz wallet LIABILITY — biz unga qarzdormiz (asset EMAS)
Bank nostro  ASSET
Har oqim     ikki tomon kerak, aks holda Δ ≠ 0
Maxsus       SUSPENSE (noaniq pul) · CLEARING (settlement'gacha)
             FX gain/loss · ROUNDING
Suspense     DOIM kuzatiladi — qoldiq o'ssa muammo belgisi
Sxema        account_type · owner_type · code · currency
             tizim hisoblari OLDINDAN yaratiladi
```

---

# 11.4 · Wallet va balans ⭐

## Balans turlari

```
   ┌──────────────────────────────────────────────────────────────┐
   │  MAVJUD BALANS (available)                                    │
   │  = umumiy balans − bloklangan (hold)                          │
   │  → foydalanuvchi SHU miqdorda operatsiya qila oladi           │
   ├──────────────────────────────────────────────────────────────┤
   │  UMUMIY BALANS (ledger)                                       │
   │  = SUM(ledger_entries)                                        │
   ├──────────────────────────────────────────────────────────────┤
   │  BLOKLANGAN (hold / pending)                                  │
   │  = tasdiqlanmagan operatsiyalar uchun rezerv                  │
   └──────────────────────────────────────────────────────────────┘

   Misol:
   umumiy   = 100 000
   hold     =  30 000   (karta to'lovi tasdiqlanmagan)
   mavjud   =  70 000   ← foydalanuvchi shuni ko'radi
```

## Hold mexanizmi

```
   ┌─ 1. HOLD qo'yiladi ─────────────────────────────────────────┐
   │  DR  Ali wallet             30 000                           │
   │  CR  Ali hold hisobi        30 000                           │
   │  → available kamayadi, umumiy o'zgarmaydi                    │
   ├─ 2a. CAPTURE (tasdiqlandi) ────────────────────────────────┤
   │  DR  Ali hold hisobi        30 000                           │
   │  CR  Merchant wallet        30 000                           │
   ├─ 2b. RELEASE (bekor qilindi) ──────────────────────────────┤
   │  DR  Ali hold hisobi        30 000                           │
   │  CR  Ali wallet             30 000                           │
   └─────────────────────────────────────────────────────────────┘

   ⚠ Hold ham LEDGER yozuvlari bilan ifodalanadi — alohida jadval emas.
     Shunda Δ = 0 saqlanadi va tarix to'liq bo'ladi.
```

## Sxema

```sql
CREATE TABLE account_balances (
    account_id      uuid NOT NULL,
    currency        char(3) NOT NULL,
    balance_minor   bigint NOT NULL DEFAULT 0,
    held_minor      bigint NOT NULL DEFAULT 0 CHECK (held_minor >= 0),
    version         bigint NOT NULL DEFAULT 0,
    last_entry_id   bigint,
    updated_at      timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (account_id, currency),
    CHECK (balance_minor >= held_minor)        -- ⚠ hold balansdan oshmasin
);
```

```csharp
// Available balans — hisoblanadi, saqlanmaydi
public Money Available => Money.FromMinor(BalanceMinor - HeldMinor, Currency);
```

## Yechish — atomik

```csharp
// ⚠ available bo'yicha tekshiruv SQL ICHIDA (M5.3)
var affected = await db.Database.ExecuteSqlInterpolatedAsync($"""
    UPDATE account_balances
    SET    balance_minor = balance_minor - {amount.Minor},
           version = version + 1,
           updated_at = now()
    WHERE  account_id = {accountId}
      AND  currency = {amount.Currency.Code}
      AND  balance_minor - held_minor >= {amount.Minor}
    """, ct);

if (affected == 0)
    return Result.Fail("Mablag' yetarli emas");
```

## Overdraft (manfiy balans)

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Ruxsat etiladimi?  → BIZNES QARORI                           │
   │                                                                │
   │  Ruxsat etilmasa:  CHECK (balance_minor >= 0)                 │
   │  Ruxsat etilsa:    overdraft_limit_minor ustuni                │
   │                    CHECK (balance_minor >= -overdraft_limit)  │
   │                                                                │
   │  ⚠ Ba'zi holatlarda manfiy balans MUQARRAR:                   │
   │    · chargeback (M11.6) — pul allaqachon sarflangan            │
   │    · reversal — mijoz mablag'ni yechib olgan                   │
   │    → tizim bunga TAYYOR bo'lishi kerak                         │
   └──────────────────────────────────────────────────────────────┘
```

## Ko'p valyuta

```
   Har valyuta uchun ALOHIDA balans qatori (M4.6):

   account_balances:
   ┌────────────┬──────────┬───────────────┐
   │ account_id │ currency │ balance_minor │
   ├────────────┼──────────┼───────────────┤
   │ ali-wallet │ UZS      │   125_000_00  │
   │ ali-wallet │ USD      │        10_00  │
   └────────────┴──────────┴───────────────┘

   ⚠ "Umumiy balans" degan tushuncha YO'Q — ularni qo'shib bo'lmaydi.
     UI'da ko'rsatish uchun konvertatsiya qilinsa — bu FAQAT KO'RSATISH,
     va kurs sanasi belgilanadi.
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Available'ni saqlash | Ikki manba, nomuvofiqlik |
| Hold'ni alohida jadvalda | Δ = 0 buziladi, tarix to'liq emas |
| Balansni keshlash (Redis) | Eskirgan qiymat bo'yicha qaror (M7.11) |
| Manfiy balans imkoniyatini hisobga olmaslik | Chargeback'da tizim yiqiladi |
| Ko'p valyutani qo'shish | Ma'nosiz natija |
| Available tekshiruvini ilovada | Race condition (M5.3) |

## Intervyu savollari

**1. Available va umumiy balans farqi?** ⭐

> **Umumiy** — ledger yozuvlari yig'indisi. **Bloklangan (hold)** — tasdiqlanmagan
> operatsiyalar uchun rezerv. **Available** = umumiy − hold, va foydalanuvchi
> aynan shuni ko'radi.
>
> Available **saqlanmaydi**, u hisoblanadi — aks holda ikki manba paydo bo'ladi va
> ular nomuvofiq bo'lib qoladi.
>
> Va tekshiruv `WHERE balance - held >= @amount` shaklida **SQL ichida** bo'ladi.

**2. Hold'ni qanday ifodalaysiz?**

> **Ledger yozuvlari bilan**: mijoz walletidan hold hisobiga o'tkaziladi.
>
> Alohida jadvalda saqlamayman — u holda `Δ = 0` buziladi va pul «yo'qolgan»
> ko'rinadi.
>
> Capture bo'lganda hold hisobidan merchant'ga, bekor qilinganda esa mijozga
> qaytariladi. Har uch holat ham tarixda ko'rinadi.

**3. Balans manfiy bo'lishi mumkinmi?**

> Odatda yo'q, va bu `CHECK` constraint bilan majburlanadi.
>
> Lekin ba'zi holatlarda **muqarrar**: chargeback bo'lganda pul allaqachon
> sarflangan bo'lishi mumkin, yoki reversal'dan oldin mijoz mablag'ni yechib
> olgan bo'lishi mumkin.
>
> Shuning uchun tizim bunga **tayyor** bo'lishi kerak: manfiy balans ruxsat
> etilgan hisoblar turi, uni qoplash jarayoni va monitoring.

**4. Balansni keshlaysizmi?**

> **Yo'q** (M7.11). Balans — qaror qabul qilinadigan ma'lumot: to'lov ruxsati
> shunga qarab beriladi.
>
> Eskirgan qiymat ortiqcha pul yechilishiga olib keladi, va bu tuzatib bo'lmaydigan
> muammo.
>
> `account_balances` jadvalidagi qiymat kesh emas — u ledger bilan **bitta
> tranzaksiyada** yangilanadi va davriy tekshiriladi.

## Deliverable

```csharp
[Fact]
public async Task Hold_ReducesAvailableButNotTotal()
{
    await SeedBalance(100_000_00);
    await service.PlaceHoldAsync(accountId, Money.FromMajor(300m, Currency.Uzs), default);

    var balance = await queries.GetBalanceAsync(accountId, default);
    Assert.Equal(100_000_00, balance.TotalMinor);
    Assert.Equal( 70_000_00, balance.AvailableMinor);
}

[Fact]
public async Task Withdraw_RespectsHold()
{
    await SeedBalance(100_000_00);
    await service.PlaceHoldAsync(accountId, Money.FromMajor(300m, Currency.Uzs), default);

    var result = await service.WithdrawAsync(accountId, Money.FromMajor(800m, Currency.Uzs), default);
    Assert.False(result.IsSuccess);       // available 700 < 800
}

[Fact]
public async Task ParallelWithdrawals_RespectAvailable()
{
    await SeedBalance(100_000_00);

    var results = await Task.WhenAll(
        Enumerable.Range(0, 10).Select(_ => WithdrawAsync(accountId, 20_000_00)));

    Assert.Equal(5, results.Count(r => r.IsSuccess));
    Assert.Equal(0, await GetBalanceAsync(accountId));
}

[Fact]
public async Task HoldEntries_KeepLedgerBalanced()
{
    await service.PlaceHoldAsync(accountId, amount, default);
    Assert.Equal(0, await LedgerDeltaAsync("UZS"));
}
```

## Xotira kartasi

```
Turlar       UMUMIY (ledger yig'indisi) · HOLD (rezerv) · AVAILABLE = umumiy − hold
Available    SAQLANMAYDI — hisoblanadi (ikki manba bo'lmasin)
Tekshiruv    WHERE balance - held >= @amount — SQL ICHIDA (M5.3)
Hold         LEDGER YOZUVLARI bilan (alohida jadval emas) → Δ = 0 saqlanadi
             capture: hold → merchant · release: hold → mijoz
Manfiy       odatda CHECK bilan taqiqlanadi
             LEKIN chargeback/reversal'da MUQARRAR → tizim tayyor bo'lsin
Ko'p valyuta har valyuta ALOHIDA qator · "umumiy balans" tushunchasi YO'Q
Keshlash     BALANS KESHLANMAYDI — qaror qabul qilinadigan ma'lumot
```

---

# 11.5 · To'lov oqimi va holatlar mashinasi ⭐

## To'liq oqim

```
   Client
     │  POST /payments + Idempotency-Key (M10.16)
     ▼
   ┌─────────────────────────────────────────────────────────┐
   │  API qatlami                                             │
   │  · autentifikatsiya + egalik (M8.5)                      │
   │  · validatsiya (M7.5)                                    │
   │  · rate limit (M11.14)                                   │
   └────────────────────┬────────────────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────────────────┐
   │  Payment Service — BITTA TRANZAKSIYA                     │
   │    · idempotency kalitini yoz                            │
   │    · limit tekshiruvi (atomik, M4.9)                     │
   │    · hisobni qulflash (FOR UPDATE / atomik UPDATE)       │
   │    · HOLD qo'yish (ledger yozuvlari)                     │
   │    · payment yozuvi (status = pending)                   │
   │    · outbox: "payment.initiated"        (M10.3)          │
   │  COMMIT                                                   │
   └────────────────────┬────────────────────────────────────┘
                        │
                        ▼
   ┌─────────────────────────────────────────────────────────┐
   │  Outbox Relay → Broker → Provider Adapter                │
   │    · retry + circuit breaker (M10.11, M10.12)            │
   │    · Idempotency-Key provayderga ham uzatiladi           │
   └────────────────────┬────────────────────────────────────┘
                        ▼
              ┌──────────────────────┐
              │  Tashqi provayder    │
              └──────────┬───────────┘
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
    success           failure           TIMEOUT
       │                 │                 │
       ▼                 ▼                 ▼
   completed          failed           UNKNOWN  ← ⚠ (M10.13)
                                          │
                                          ▼
                            status so'rovi / webhook / reconciliation
```

## Holatlar mashinasi

```
   ┌─────────┐
   │ pending │  hold qo'yilgan, provayderga hali yuborilmagan
   └────┬────┘
        │ provayderga yuborildi
        ▼
   ┌────────────┐
   │ processing │
   └─┬───┬────┬─┘
     │   │    │
     │   │    └── TIMEOUT ────► ┌─────────┐
     │   │                      │ unknown │ ─── status so'rovi ──┐
     │   │                      └────┬────┘                      │
     │   │                           │ 2 soatdan ortiq           │
     │   │                           ▼                            │
     │   │                    ┌──────────────┐                   │
     │   │                    │ manual_review│                   │
     │   │                    └──────────────┘                   │
     │   │                                                        │
     │   └── aniq rad ────────► ┌────────┐ ◄────────────────────┘
     │                          │ failed │  (hold RELEASE qilinadi)
     │                          └────────┘
     │
     └────── muvaffaqiyat ────► ┌───────────┐
                                │ completed │  (hold CAPTURE qilinadi)
                                └─────┬─────┘
                                      │ refund so'rovi
                                      ▼
                                ┌──────────┐
                                │ refunded │
                                └──────────┘
```

```csharp
public static PaymentStatus Next(PaymentStatus current, PaymentEvent e) => (current, e) switch
{
    (Pending,    Sent)          => Processing,
    (Processing, Succeeded)     => Completed,
    (Processing, Rejected)      => Failed,
    (Processing, TimedOut)      => Unknown,           // ⚠ Failed EMAS
    (Unknown,    Reconciled r)  => r.WasCharged ? Completed : Failed,
    (Unknown,    Expired)       => ManualReview,
    (Completed,  RefundRequested) => Refunded,
    _ => throw new InvalidTransitionException(current, e)
};
```

## Holat o'zgarishini yozib borish

```sql
CREATE TABLE payment_status_history (
    id           bigserial PRIMARY KEY,
    payment_id   uuid NOT NULL,
    from_status  text,
    to_status    text NOT NULL,
    reason       text,
    actor        text NOT NULL,          -- system, operator:<id>, provider
    occurred_at  timestamptz NOT NULL DEFAULT now()
);
```

> Bu audit uchun **majburiy** (M8.13): nizoda «bu to'lov qanday bu holatga
> keldi?» savoliga javob shu yerdan chiqadi.

## Nima qachon bajariladi

```
   ┌──────────────────────────────────────────────────────────────┐
   │  BITTA TRANZAKSIYADA:                                         │
   │  · idempotency kaliti · limit · hold · payment · outbox       │
   │                                                                │
   │  TRANZAKSIYADAN TASHQARIDA:                                   │
   │  · provayderga chaqiruv (M5.1 — qulflarni ushlamaslik)        │
   │  · notification                                                │
   │  · analitika                                                   │
   └──────────────────────────────────────────────────────────────┘
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `unknown` holati yo'q | Timeout `failed` deb belgilanadi → dublikat |
| Provayder chaqiruvi tranzaksiya ichida | Qulflar ushlanadi, deadlock |
| Holat tarixini yozmaslik | Nizoda javob yo'q |
| Hold qo'ymay to'g'ridan-to'g'ri yechish | Rad bo'lsa qaytarish kerak |
| Noto'g'ri o'tishga ruxsat berish | Ma'lumot buziladi |
| Idempotency kalitini keyinroq yozish | Parallel so'rov o'tadi |

## Intervyu savollari

**1. To'lov tizimini qanday loyihalaysiz?** ⭐

> To'rt qatlamda:
>
> **API** — `Idempotency-Key` majburiy, summa minor unit'da, autentifikatsiya va
> egalik tekshiruvi.
>
> **Ma'lumot** — double-entry ledger, append-only; balans yozuvlardan hosil bo'ladi.
>
> **Integratsiya** — provayderga chaqiruv outbox orqali, tranzaksiyadan tashqarida;
> timeout'da holat `unknown`, keyin status so'rovi.
>
> **Nazorat** — kunlik reconciliation, `Δ = 0` tekshiruvi, alert.
>
> Eng ko'p unutiladigan qism — uchinchisi: **timeout muvaffaqiyatsizlik emas**.

**2. Holatlar mashinasini qanday quriladi?**

> Aniq holatlar va ruxsat etilgan o'tishlar, `switch` expression bilan — noto'g'ri
> o'tish exception beradi (M1.10).
>
> Muhim: `unknown` **alohida holat** bo'lishi shart, va `manual_review` ham — uzoq
> vaqt aniqlanmagan to'lovlar shu yerga tushadi.
>
> Har o'tish `payment_status_history` ga yoziladi: kim, qachon, nima sababdan.

**3. Nima bitta tranzaksiyada bo'ladi?**

> Idempotency kaliti, limit tekshiruvi, hold yozuvlari, payment yozuvi va outbox
> xabari — **hammasi bitta tranzaksiyada**.
>
> Provayderga chaqiruv esa **tashqarida**: aks holda qulflar tashqi tizim tezligiga
> bog'lanadi va deadlock ehtimoli oshadi (M5.1).
>
> Bu aynan outbox pattern hal qiladigan muammo.

## Deliverable

```csharp
[Fact]
public async Task Timeout_ResultsInUnknownNotFailed()
{
    provider.SimulateTimeout();
    await service.ProcessAsync(request, default);

    Assert.Equal(PaymentStatus.Unknown, await GetStatusAsync(paymentId));
}

[Fact]
public async Task FailedPayment_ReleasesHold()
{
    provider.Reject();
    await service.ProcessAsync(request, default);

    var balance = await queries.GetBalanceAsync(accountId, default);
    Assert.Equal(balance.TotalMinor, balance.AvailableMinor);    // hold yo'q
}

[Fact]
public async Task InvalidTransition_IsRejected()
    => Assert.Throws<InvalidTransitionException>(
           () => PaymentStateMachine.Next(PaymentStatus.Completed, PaymentEvent.Sent));

[Fact]
public async Task ProviderCall_HappensOutsideTransaction()
{
    provider.OnCall = () => Assert.Equal(0, ActiveTransactionCount());
    await service.ProcessAsync(request, default);
}

[Fact]
public async Task StatusHistory_RecordsEveryTransition()
{
    await service.ProcessAsync(request, default);

    var history = await db.PaymentStatusHistory
        .Where(h => h.PaymentId == paymentId).OrderBy(h => h.OccurredAt).ToListAsync();

    Assert.Equal(["pending", "processing", "completed"], history.Select(h => h.ToStatus));
}
```

## Xotira kartasi

```
4 qatlam     API (idempotency, validatsiya, rate limit)
             MA'LUMOT (double-entry ledger, balans hosila)
             INTEGRATSIYA (outbox, timeout = unknown)
             NAZORAT (reconciliation, Δ = 0, alert)
Holatlar     pending → processing → completed / failed / UNKNOWN
             unknown → (status so'rovi) → completed/failed
             unknown 2 soat+ → MANUAL_REVIEW
             completed → refunded
Bitta tx     idempotency kaliti · limit · hold · payment · outbox
Tashqarida   provayder chaqiruvi · notification · analitika
Tarix        payment_status_history — kim, qachon, nima sababdan (audit)
Eng ko'p unutiladigan  TIMEOUT ≠ MUVAFFAQIYATSIZLIK
```

---

# 11.6 · Karta to'lovlari

## Hayot sikli

```
   ┌─ AUTHORIZATION ─────────────────────────────────────────────┐
   │  Mablag' REZERVLANADI (bankda hold)                          │
   │  Pul hali ko'chmagan · odatda 7 kungacha amal qiladi         │
   ├─ CAPTURE ──────────────────────────────────────────────────┤
   │  Rezervlangan mablag' HAQIQATAN yechiladi                    │
   │  · to'liq yoki QISMAN (masalan buyurtma qisman bajarildi)    │
   ├─ VOID ─────────────────────────────────────────────────────┤
   │  Rezervni bekor qilish — capture'GACHA                       │
   ├─ REFUND ───────────────────────────────────────────────────┤
   │  Pulni qaytarish — capture'DAN KEYIN                         │
   │  · to'liq yoki qisman                                        │
   ├─ CHARGEBACK ───────────────────────────────────────────────┤
   │  Mijoz BANKKA da'vo qildi → majburiy qaytarish               │
   │  ⚠ Bizning ruxsatimizsiz sodir bo'ladi                       │
   └─────────────────────────────────────────────────────────────┘
```

```
   Vaqt o'qi:

   auth ──────► capture ──────► refund
     │             │
     └─► void      └─────────► chargeback (30–120 kun ichida)
```

## Ledger'da ifodalash

```
   AUTHORIZATION (hold):
     DR  Mijoz karta hisobi        50 000
     CR  Auth hold hisobi          50 000

   CAPTURE (qisman: 30 000):
     DR  Auth hold hisobi          30 000
     CR  Merchant wallet           30 000
     DR  Auth hold hisobi          20 000     ← qolgani release
     CR  Mijoz karta hisobi        20 000

   REFUND:
     DR  Merchant wallet           30 000
     CR  Mijoz karta hisobi        30 000

   CHARGEBACK:
     DR  Merchant wallet           30 000
     CR  Mijoz karta hisobi        30 000
     DR  Merchant wallet            5 000     ← chargeback jarima
     CR  Chargeback fee daromadi    5 000
```

> Har amal **yangi yozuvlar** qo'shadi, eskisi o'zgartirilmaydi (M11.2).

## Chargeback — eng murakkab qism

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Chargeback BIZNING RUXSATIMIZSIZ sodir bo'ladi:              │
   │  · mijoz bankka da'vo qiladi                                  │
   │  · bank pulni MAJBURAN qaytaradi                              │
   │  · biz faqat XABAR olamiz                                     │
   │                                                                │
   │  Oqibatlar:                                                    │
   │  · merchant balansi MANFIY bo'lishi mumkin (11.4)             │
   │  · chargeback jarimasi olinadi                                 │
   │  · chargeback darajasi yuqori bo'lsa — merchant bloklanadi    │
   │                                                                │
   │  Bizning javobimiz:                                            │
   │  · dalillarni taqdim etish (representment)                     │
   │  · yoki qabul qilish                                           │
   └──────────────────────────────────────────────────────────────┘
```

## 3-D Secure

```
   Mijoz bankiga qayta yo'naltiriladi (SMS/push tasdiqlash)

   ✅ Foyda: firibgarlik javobgarligi BANKKA o'tadi (liability shift)
   ⚠ Narxi: konversiya pasayadi (mijoz jarayonni tashlab ketishi mumkin)

   → Fintech'da odatda risk darajasiga qarab QO'LLANADI:
     past risk → 3DS'siz · yuqori risk → 3DS majburiy
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Auth va capture'ni chalkashtirish | Pul rezervda qoladi yoki ikki marta yechiladi |
| Qisman capture'ni qo'llab-quvvatlamaslik | Ortiqcha pul yechiladi |
| Auth muddatini kuzatmaslik | Rezerv o'z-o'zidan tugaydi, holat noaniq |
| Chargeback'ga tayyor bo'lmaslik | Manfiy balans tizimni buzadi |
| Chargeback darajasini kuzatmaslik | Kartochka tizimidan chiqarilish |
| Refund'ni chargeback bilan chalkashtirish | Ikki marta qaytariladi |

## Intervyu savollari

**1. Authorization va capture farqi?**

> **Authorization** — mablag'ni rezervlash: pul mijoz hisobida bloklanadi, lekin
> hali ko'chmagan. Odatda 7 kungacha amal qiladi.
>
> **Capture** — rezervlangan mablag'ni haqiqatan yechish. U to'liq yoki **qisman**
> bo'lishi mumkin.
>
> Klassik stsenariy: buyurtma berilganda auth, tovar yuborilganda capture. Agar
> buyurtma qisman bajarilsa — qisman capture va qolgani release.

**2. Chargeback nima va u refund'dan qanday farq qiladi?** ⭐

> **Refund** — biz o'z tashabbusimiz bilan pulni qaytaramiz.
>
> **Chargeback** — mijoz **bankka** da'vo qiladi va bank pulni **majburan**
> qaytaradi. Bizning ruxsatimiz so'ralmaydi, biz faqat xabar olamiz.
>
> Oqibatlari jiddiy: merchant balansi manfiy bo'lishi mumkin, chargeback jarimasi
> olinadi, va chargeback darajasi yuqori bo'lsa merchant kartochka tizimidan
> chiqariladi.
>
> Shuning uchun tizim manfiy balansga **tayyor** bo'lishi va chargeback darajasini
> kuzatishi kerak.

**3. 3-D Secure nima beradi?**

> Mijoz o'z bankida tasdiqlaydi (SMS yoki push). Asosiy foyda — **liability
> shift**: firibgarlik bo'lsa javobgarlik bankka o'tadi.
>
> Narxi — konversiya pasayadi, chunki qo'shimcha qadam qo'shiladi va ba'zi
> mijozlar tashlab ketadi.
>
> Amalda risk darajasiga qarab qo'llanadi: past risk uchun 3DS'siz, yuqori risk
> yoki katta summa uchun majburiy.

## Xotira kartasi

```
Auth         mablag' REZERVLANADI (hold) · ~7 kun · pul ko'chmagan
Capture      rezervni haqiqatan yechish · TO'LIQ yoki QISMAN
Void         rezervni bekor qilish — capture'GACHA
Refund       pulni qaytarish — capture'DAN KEYIN · biz tashabbus qilamiz
Chargeback   mijoz BANKKA da'vo → MAJBURIY qaytarish
             ⚠ bizning ruxsatimizsiz · merchant balansi MANFIY bo'lishi mumkin
             + jarima · daraja yuqori bo'lsa merchant BLOKLANADI
3DS          mijoz bankida tasdiqlash → LIABILITY SHIFT
             narxi: konversiya pasayadi → risk darajasiga qarab qo'llanadi
Ledger       har amal YANGI yozuvlar · eskisi o'zgartirilmaydi
```

---

# 11.7 · P2P o'tkazma ⭐

## Nima va nega

Eng ko'p so'raladigan amaliy masala: ikki hisob, bitta operatsiya, ikkita
concurrency muammosi birdan.

```
   Ali (100 000)  ──── 80 000 ────►  Vali (20 000)

   IKKI MUAMMO:
   1. Lost update — Ali balansi (M5.3)
   2. DEADLOCK — Ali→Vali va Vali→Ali bir vaqtda (M5.6)
```

## Deadlock muammosi

```
   T1: "Ali → Vali"                T2: "Vali → Ali"

   t1  LOCK Ali          ✓
   t2                              LOCK Vali          ✓
   t3  LOCK Vali → ⏳ kutadi
   t4                              LOCK Ali → ⏳ kutadi
                                              │
                    ┌─────────────────────────┘
                    ▼
              DEADLOCK (40P01)

   ✅ YECHIM: qulflarni HAR DOIM BIR XIL TARTIBDA olish
```

## Yechim 1 — tartibli qulflash

```sql
BEGIN;
  -- ⚠ ORDER BY id — tsikl hosil bo'lishi MATEMATIK JIHATDAN mumkin emas
  SELECT * FROM account_balances
  WHERE  (account_id, currency) IN ((@from, @ccy), (@to, @ccy))
  ORDER  BY account_id
  FOR UPDATE;

  UPDATE account_balances SET balance_minor = balance_minor - @amount
  WHERE  account_id = @from AND currency = @ccy
    AND  balance_minor - held_minor >= @amount;
  -- 0 qator → mablag' yetmadi → ROLLBACK

  UPDATE account_balances SET balance_minor = balance_minor + @amount
  WHERE  account_id = @to AND currency = @ccy;

  INSERT INTO ledger_entries (...) VALUES (debit), (credit);
COMMIT;
```

## Yechim 2 — qulfsiz (atomik UPDATE)

```csharp
await using var tx = await db.Database.BeginTransactionAsync(ct);

// 1. Yechish — atomik shart bilan
var debited = await db.Database.ExecuteSqlInterpolatedAsync($"""
    UPDATE account_balances
    SET balance_minor = balance_minor - {amount.Minor}, version = version + 1
    WHERE account_id = {fromId} AND currency = {ccy}
      AND balance_minor - held_minor >= {amount.Minor}
    """, ct);

if (debited == 0)
{
    await tx.RollbackAsync(ct);
    return Result.Fail("Mablag' yetarli emas");
}

// 2. Qo'shish — shartsiz
await db.Database.ExecuteSqlInterpolatedAsync($"""
    UPDATE account_balances
    SET balance_minor = balance_minor + {amount.Minor}, version = version + 1
    WHERE account_id = {toId} AND currency = {ccy}
    """, ct);

// 3. Ledger yozuvlari
db.LedgerEntries.AddRange(
    LedgerEntry.Debit(fromId, amount, txId),
    LedgerEntry.Credit(toId, amount, txId));

await db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);
```

```
   ⚠ Bu yerda ham DEADLOCK mumkin — ikki UPDATE ikki qatorni qulflaydi.
     Kamaytirish: UPDATE'larni ham ID tartibida bajarish,
                  yoki deadlock'ni retry qilish (M10.11)
```

## Valyuta va bir xil hisob

```csharp
// Tekshiruvlar — biznes qoidalari
if (fromId == toId)
    return Result.Fail("Hisoblar bir xil bo'lishi mumkin emas");

if (from.Currency != to.Currency)
    return Result.Fail("Valyuta mos emas");     // konvertatsiya alohida oqim (M4.6)

if (!amount.IsPositive)
    return Result.Fail("Summa musbat bo'lishi kerak");
```

## Komissiya bilan

```
   Ali 80 000 yubordi, komissiya 1 200 (yuboruvchidan):

   DR  Ali wallet            81 200
   CR  Vali wallet           80 000
   CR  Komissiya daromadi     1 200
                        Δ = 0  ✓

   ⚠ Kim to'laydi — BIZNES QARORI (M4.8):
     · yuboruvchi (inclusive/exclusive?)
     · qabul qiluvchi
     · bo'linadi
```

## Idempotentlik

```csharp
// ⚠ Bir xil kalit bilan takroriy so'rov ikki marta o'tkazmasin (M10.16)
[HttpPost("transfers")]
public async Task<IActionResult> Transfer(
    TransferRequest request,
    [FromHeader(Name = "Idempotency-Key")] string key,
    CancellationToken ct)
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Qulflarni tartibsiz olish | Deadlock |
| Balans tekshiruvini ilovada | Lost update (M5.3) |
| Idempotency kaliti yo'q | Takroriy o'tkazma |
| Bir xil hisobni tekshirmaslik | Ledger'da ma'nosiz yozuv |
| Valyutani tekshirmaslik | Aralash valyuta |
| Ikkala UPDATE ni alohida tranzaksiyada | Pul yo'qoladi |
| Deadlock'ni retry qilmaslik | Tasodifiy xatolar |

## Intervyu savollari

**1. P2P o'tkazmani qanday amalga oshirasiz?** ⭐

> **Bitta tranzaksiyada**, va ikkita muammoni birdan hal qilish kerak.
>
> **Lost update** — balans tekshiruvi SQL ichida:
> `WHERE balance - held >= @amount`, 0 qator qaytsa mablag' yetmadi (M5.3).
>
> **Deadlock** — ikkala hisobni **bir xil tartibda** qulflash:
> `ORDER BY account_id FOR UPDATE`. Aks holda A→B va B→A o'tkazmalari tsikl
> hosil qiladi (M5.6).
>
> Va `Idempotency-Key` majburiy — tarmoq uzilsa takroriy o'tkazma bo'lmasin.

**2. Nega tartibli qulflash deadlock'ni yo'q qiladi?**

> Deadlock tsiklik kutishdan kelib chiqadi: T1 A ni olib B ni kutadi, T2 B ni olib
> A ni kutadi.
>
> Agar **barcha** tranzaksiyalar resurslarni bir xil tartibda (masalan `id`
> o'sishi bo'yicha) qulflasa — tsikl hosil bo'lishi **matematik jihatdan mumkin
> emas**.
>
> Bu eng ishonchli yechim, va u retry'dan afzalroq.

**3. Komissiyani qanday yozasiz?**

> Uchinchi yozuv sifatida: yuboruvchidan 81 200 debit, qabul qiluvchiga 80 000
> credit, komissiya daromadiga 1 200 credit. Yig'indi nol (M11.2).
>
> Kim to'lashi — **biznes qarori** va u shartnomada belgilanadi (M4.8): yuboruvchi,
> qabul qiluvchi yoki bo'linadi. Va inclusive/exclusive farqini aniqlash kerak.

## Deliverable

```csharp
[Fact]
public async Task Transfer_MovesMoneyAtomically()
{
    await SeedAccounts(from: 100_000_00, to: 20_000_00);
    await service.TransferAsync(from, to, Money.FromMajor(800m, Currency.Uzs), key, default);

    Assert.Equal(20_000_00, await GetBalanceAsync(from));
    Assert.Equal(100_000_00, await GetBalanceAsync(to));
    Assert.Equal(0, await LedgerDeltaAsync("UZS"));
}

[Fact]
public async Task InsufficientFunds_RollsBackCompletely()
{
    await SeedAccounts(from: 1_000_00, to: 0);

    var result = await service.TransferAsync(from, to, TooMuch, key, default);

    Assert.False(result.IsSuccess);
    Assert.Equal(1_000_00, await GetBalanceAsync(from));
    Assert.Equal(0, await db.LedgerEntries.CountAsync());
}

[Fact]
public async Task OppositeTransfers_DoNotDeadlock()
{
    await SeedAccounts(a: 100_000_00, b: 100_000_00);

    var tasks = Enumerable.Range(0, 50).SelectMany(_ => new[]
    {
        service.TransferAsync(a, b, Money.FromMajor(10m, Currency.Uzs), NewKey(), default),
        service.TransferAsync(b, a, Money.FromMajor(10m, Currency.Uzs), NewKey(), default)
    });

    await Task.WhenAll(tasks);                              // exception YO'Q
    Assert.Equal(200_000_00, await TotalBalanceAsync(a, b)); // pul yo'qolmagan
}

[Fact]
public async Task DuplicateKey_TransfersOnce()
{
    await SeedAccounts(from: 100_000_00, to: 0);
    var key = Guid.NewGuid().ToString();

    await service.TransferAsync(from, to, Money.FromMajor(800m, Currency.Uzs), key, default);
    await service.TransferAsync(from, to, Money.FromMajor(800m, Currency.Uzs), key, default);

    Assert.Equal(20_000_00, await GetBalanceAsync(from));   // BIR marta
}
```

## Xotira kartasi

```
Ikki muammo  LOST UPDATE (balans) + DEADLOCK (ikki hisob)
Lost update  tekshiruv SQL ICHIDA: WHERE balance - held >= @amount
             0 qator → mablag' yetmadi
Deadlock     qulflarni HAR DOIM BIR XIL TARTIBDA: ORDER BY account_id FOR UPDATE
             → tsikl MATEMATIK JIHATDAN mumkin emas
Bitta tx     debit + credit + ledger yozuvlari
Tekshiruvlar bir xil hisob? · valyuta mos? · summa musbat?
Komissiya    uchinchi yozuv → Δ = 0 · kim to'laydi = BIZNES QARORI
Idempotency  MAJBURIY — takroriy o'tkazma bo'lmasin
Qo'shimcha   deadlock'ni retry qilish (tranzient xato)
```

---

# 11.8 · Rejalashtirilgan to'lovlar va obuna

## Nima va nega

Avtomatik to'lovlar: kommunal, obuna, bo'lib to'lash. Asosiy qiyinchilik — **vaqt
bo'yicha ishga tushirish** va **muvaffaqiyatsizlikni boshqarish**.

```sql
CREATE TABLE scheduled_payments (
    id              uuid PRIMARY KEY,
    user_id         uuid NOT NULL,
    amount_minor    bigint NOT NULL,
    currency        char(3) NOT NULL,

    schedule_type   text NOT NULL,        -- once, daily, weekly, monthly
    next_run_at     timestamptz NOT NULL, -- ⚠ indeks shu ustunda
    last_run_at     timestamptz,

    status          text NOT NULL,        -- active, paused, cancelled, exhausted
    failure_count   int NOT NULL DEFAULT 0,
    max_failures    int NOT NULL DEFAULT 3
);

-- ⚠ Faqat bajarilishi kerak bo'lganlarni tez topish
CREATE INDEX ix_scheduled_due ON scheduled_payments (next_run_at)
WHERE status = 'active';
```

## Ishga tushirish

```csharp
// ⚠ SKIP LOCKED — bir necha instance parallel ishlaydi (M5.4)
var due = await db.ScheduledPayments
    .FromSql($"""
        SELECT * FROM scheduled_payments
        WHERE status = 'active' AND next_run_at <= now()
        ORDER BY next_run_at
        LIMIT 100
        FOR UPDATE SKIP LOCKED
        """)
    .ToListAsync(ct);

foreach (var schedule in due)
{
    // ⚠ Idempotency key — vaqt bo'yicha barqaror
    var key = $"scheduled:{schedule.Id}:{schedule.NextRunAt:yyyy-MM-ddTHH:mm}";

    var result = await _payments.ExecuteAsync(schedule.ToRequest(key), ct);
    ApplyResult(schedule, result);

    schedule.NextRunAt = CalculateNext(schedule);
    schedule.LastRunAt = _clock.GetUtcNow();
}

await db.SaveChangesAsync(ct);
```

```
   ⚠ Idempotency kaliti VAQTGA bog'langan bo'lishi kerak:
     "scheduled:{id}:{runTime}"

     Shunda job ikki marta ishga tushsa ham (crash, rebalance)
     bitta to'lov bajariladi.
```

## Muvaffaqiyatsizlik siyosati

```
   1-urinish muvaffaqiyatsiz (mablag' yetmadi)
        │
        ├─► retry: +1 kun
        ├─► retry: +3 kun
        ├─► retry: +7 kun
        └─► 3 marta muvaffaqiyatsiz → status = 'exhausted'
                                     → foydalanuvchiga xabar
                                     → obuna to'xtatiladi

   ⚠ Farq qilish MUHIM:
     · TRANZIENT xato (provayder yiqilgan)  → tez retry
     · BIZNES rad (mablag' yetmadi)          → sekin retry, keyin to'xtatish
```

## Sana muammolari

```
   ┌──────────────────────────────────────────────────────────────┐
   │  "Har oyning 31-sanasida" → fevralda nima bo'ladi?           │
   │  → oyning OXIRGI kuniga o'tkaziladi (28/29)                   │
   │                                                                │
   │  "Har oyning 1-sanasida" → dam olish kuni bo'lsa?            │
   │  → biznes qoidasi: oldingi/keyingi ish kuni yoki o'sha kun    │
   │                                                                │
   │  Vaqt zonasi (M4.7):                                          │
   │  → foydalanuvchi zonasida 09:00 = UTC'da 04:00                │
   │  → next_run_at UTC'da saqlanadi, hisoblash zona bilan          │
   └──────────────────────────────────────────────────────────────┘
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Vaqtga bog'lanmagan idempotency key | Ikki marta to'lov |
| `SKIP LOCKED` ishlatmaslik | Instance'lar bir xil ishni bajaradi |
| Tranzient va biznes xatoni ajratmaslik | Noto'g'ri retry siyosati |
| Muvaffaqiyatsizlikni cheksiz retry | Foydalanuvchi bezovta qilinadi |
| Sana chegara holatlarini hisobga olmaslik | 31-fevral xatosi |
| Foydalanuvchiga xabar bermaslik | Obuna jimgina to'xtaydi |

## Intervyu savollari

**1. Rejalashtirilgan to'lovni qanday ishga tushirasiz?**

> `next_run_at` ustuni va **partial indeks** (`WHERE status = 'active'`) — bu
> bajarilishi kerak bo'lganlarni tez topadi.
>
> Job `FOR UPDATE SKIP LOCKED` bilan partiya oladi — bir necha instance parallel
> ishlaydi va bir xil ishni takrorlamaydi (M5.4).
>
> Va idempotency kaliti **vaqtga bog'langan**: `scheduled:{id}:{runTime}`. Shunda
> job ikki marta ishga tushsa ham bitta to'lov bajariladi.

**2. To'lov muvaffaqiyatsiz bo'lsa nima qilasiz?**

> Xato turini ajrataman.
>
> **Tranzient** (provayder yiqilgan, timeout) — tez retry, backoff bilan.
>
> **Biznes rad** (mablag' yetmadi) — sekin retry: +1 kun, +3 kun, +7 kun. Uch marta
> muvaffaqiyatsiz bo'lsa obuna `exhausted` holatiga o'tadi va foydalanuvchiga
> xabar beriladi.
>
> Cheksiz retry qilmayman — bu foydalanuvchini bezovta qiladi va provayderga
> keraksiz yuk.

## Xotira kartasi

```
Sxema        next_run_at + PARTIAL indeks (WHERE status = 'active')
Ishga tushirish  FOR UPDATE SKIP LOCKED — instance'lar parallel
Idempotency  VAQTGA bog'langan: "scheduled:{id}:{runTime}"
             → job ikki marta ishga tushsa ham bitta to'lov
Xato turi    TRANZIENT → tez retry · BIZNES rad → sekin retry (+1, +3, +7 kun)
             3 marta → exhausted + foydalanuvchiga XABAR
Sana         31-fevral → oyning oxirgi kuni
             dam olish kuni → biznes qoidasi
             vaqt zonasi: next_run_at UTC'da, hisoblash zona bilan (M4.7)
```

---

# 11.9 · Limit va anti-fraud

## Limit turlari

```
   ┌──────────────────┬──────────┬─────────────────────────────────┐
   │  Tur             │  Oyna    │  Saqlash                        │
   ├──────────────────┼──────────┼─────────────────────────────────┤
   │  Bitta tranzaksiya│  —       │  Statik konfiguratsiya          │
   │  Kunlik summa    │  Biznes kuni│ daily_limits qatori (M4.9)   │
   │  Oylik summa     │  Kalendar oy│ monthly_limits              │
   │  Kunlik son      │  Biznes kuni│ hisoblagich                 │
   │  Velocity        │  5 daqiqa│  Redis (tez, taxminiy)          │
   └──────────────────┴──────────┴─────────────────────────────────┘

   ⚠ REGULYATOR limiti → DB'da (aniq bo'lishi shart)
     ANTI-FRAUD velocity → Redis (tez bo'lishi shart)
```

## Limit tekshiruvi — write skew

```
   ⚠ Bu M4.9 dagi masala:

   SELECT SUM(bugungi) → tekshirish → INSERT
   → ikki parallel so'rov ikkalasi ham "limit yetarli" deb topadi
   → bu LOST UPDATE emas, WRITE SKEW (M5.2)
   → rowversion YORDAM BERMAYDI

   ✅ Yechim: daily_limits qatori + ATOMIK UPDATE
```

```sql
UPDATE daily_limits
SET    spent_minor = spent_minor + @amount,
       tx_count = tx_count + 1
WHERE  user_id = @user AND business_day = @day AND currency = @ccy
  AND  spent_minor + @amount <= limit_minor
  AND  tx_count + 1 <= max_count;

-- 0 qator → limit oshdi
```

## Anti-fraud qoidalari

```
   ┌─ TEZLIK (velocity) ─────────────────────────────────────────┐
   │  · 5 daqiqada 10 dan ortiq to'lov                            │
   │  · 1 soatda 3 dan ortiq muvaffaqiyatsiz urinish              │
   ├─ SUMMA ANOMALIYASI ────────────────────────────────────────┤
   │  · odatdagi summadan 10× katta                               │
   │  · yumaloq summa (1 000 000 — test urinishi belgisi)         │
   ├─ GEOGRAFIYA ───────────────────────────────────────────────┤
   │  · IP mamlakati o'zgardi                                     │
   │  · "imkonsiz sayohat" (2 soatda Toshkent → Dubay)            │
   ├─ QURILMA ──────────────────────────────────────────────────┤
   │  · yangi qurilma + yirik summa                               │
   │  · bir qurilmada ko'p hisob                                  │
   ├─ NAQSH ────────────────────────────────────────────────────┤
   │  · yangi qabul qiluvchi + darhol maksimal summa              │
   │  · kechasi odatdan tashqari faollik                          │
   └─────────────────────────────────────────────────────────────┘
```

## Qaror

```
   Risk bali hisoblanadi → qaror:

   ┌──────────────┬────────────────────────────────────────────┐
   │  0–30        │  ALLOW — o'tkaziladi                        │
   │  31–70       │  CHALLENGE — qo'shimcha tasdiqlash (OTP/3DS)│
   │  71–100      │  BLOCK — rad etiladi + ko'rib chiqish       │
   └──────────────┴────────────────────────────────────────────┘

   ⚠ Har qaror SABABI bilan yozib qo'yiladi (audit + model o'rgatish)
```

```csharp
public sealed record FraudDecision(
    RiskAction Action, int Score, IReadOnlyList<string> TriggeredRules);

// ⚠ Anti-fraud tekshiruvi SINXRON, lekin TIMEOUT bilan
using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
cts.CancelAfter(TimeSpan.FromMilliseconds(300));

FraudDecision decision;
try { decision = await _fraud.EvaluateAsync(request, cts.Token); }
catch (OperationCanceledException)
{
    // ⚠ Fail-open yoki fail-closed — BIZNES QARORI
    decision = _options.FailOpen
        ? FraudDecision.Allow("timeout")      // to'lov o'tadi, keyin ko'rib chiqiladi
        : FraudDecision.Challenge("timeout"); // qo'shimcha tasdiqlash
}
```

## Fail-open va fail-closed

```
   ┌──────────────────────────────────────────────────────────────┐
   │  FAIL-OPEN   — anti-fraud ishlamasa to'lov O'TADI            │
   │  ✅ konversiya saqlanadi                                      │
   │  ❌ firibgarlik o'tib ketishi mumkin                          │
   ├──────────────────────────────────────────────────────────────┤
   │  FAIL-CLOSED — anti-fraud ishlamasa to'lov RAD ETILADI       │
   │  ✅ xavfsiz                                                    │
   │  ❌ anti-fraud yiqilsa BUTUN tizim to'xtaydi                  │
   ├──────────────────────────────────────────────────────────────┤
   │  ⚠ Amaliy yechim: summaga qarab                               │
   │    kichik summa → fail-open · yirik summa → fail-closed       │
   └──────────────────────────────────────────────────────────────┘
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `SELECT SUM` bilan limit tekshiruvi | Write skew (M4.9) |
| Anti-fraud timeout'siz | To'lov oqimi bloklanadi |
| Fail-open/closed qarorini o'ylamaslik | Kutilmagan xatti-harakat |
| Qaror sababini yozmaslik | Model yaxshilanmaydi, audit yo'q |
| Faqat qoidalar (ML'siz) | Yangi naqshlarni ko'rmaydi |
| False positive'ni kuzatmaslik | Haqiqiy mijozlar bloklanadi |

## Intervyu savollari

**1. Kunlik limitni qanday tekshirasiz?** ⭐

> `SELECT SUM` bilan **emas** — bu write skew: ikki parallel so'rov ikkalasi ham
> «limit yetarli» deb topadi (M4.9).
>
> To'g'ri yechim: `daily_limits` qatori va **atomik `UPDATE`** shart bilan:
> `SET spent = spent + @amt WHERE spent + @amt <= limit`. 0 qator → limit oshdi.
>
> Va limit yangilanishi to'lov yozuvi bilan **bitta tranzaksiyada**.

**2. Anti-fraud ishlamasa nima qilasiz?**

> Bu **fail-open va fail-closed** tanlovi, va u biznes qarori.
>
> Fail-open — to'lov o'tadi, konversiya saqlanadi, lekin firibgarlik o'tishi
> mumkin. Fail-closed — xavfsiz, lekin anti-fraud yiqilsa butun tizim to'xtaydi.
>
> Amalda men **summaga qarab** ajratgan bo'lardim: kichik summa fail-open, yirik
> summa fail-closed yoki qo'shimcha tasdiqlash.
>
> Va anti-fraud chaqiruvi qat'iy **timeout** bilan — 300 ms, aks holda u to'lov
> oqimini bloklaydi.

**3. Regulyator limiti va anti-fraud limiti farqi?**

> **Regulyator limiti** — aniq bo'lishi shart va u **DB'da** saqlanadi, atomik
> tekshiriladi. Uni buzish jarima demak.
>
> **Anti-fraud velocity** — tez bo'lishi shart, aniqlik ikkinchi darajali. U
> **Redis'da** saqlanishi mumkin: bir necha soniya kechikish yoki kichik
> nomuvofiqlik qabul qilinadi.
>
> Bu ikkalasini bir xil mexanizm bilan hal qilish — keng tarqalgan xato.

## Xotira kartasi

```
Limitlar     bitta tx · kunlik summa/son · oylik · velocity
             REGULYATOR → DB (aniq) · ANTI-FRAUD → Redis (tez)
Tekshiruv    SELECT SUM ❌ write skew
             atomik UPDATE ✅: SET spent = spent + @a WHERE spent + @a <= limit
Qoidalar     velocity · summa anomaliyasi · geografiya · qurilma · naqsh
Qaror        risk ball → ALLOW / CHALLENGE (OTP, 3DS) / BLOCK
             har qaror SABABI bilan yoziladi
Timeout      anti-fraud chaqiruvi qat'iy timeout bilan (~300 ms)
Fail-open    to'lov o'tadi · konversiya saqlanadi · firibgarlik o'tishi mumkin
Fail-closed  xavfsiz · anti-fraud yiqilsa tizim TO'XTAYDI
             → amalda SUMMAGA QARAB ajratiladi
```

---

# 11.10 · KYC oqimi

## Nima va nega

KYC (Know Your Customer) — mijozni identifikatsiya qilish. Bu **regulyator
talabi** va uning holati to'lov imkoniyatlarini belgilaydi.

```
   ┌─ DARAJALAR ─────────────────────────────────────────────────┐
   │  Level 0 — ro'yxatdan o'tgan, tasdiqlanmagan                 │
   │            → faqat ko'rish, operatsiya YO'Q                  │
   │  Level 1 — telefon + shaxsiy ma'lumot                        │
   │            → cheklangan limit (masalan kuniga 1 mln)         │
   │  Level 2 — pasport/ID tasdiqlangan (davlat bazasi)           │
   │            → to'liq limit                                     │
   │  Level 3 — qo'shimcha hujjatlar (daromad manbai)             │
   │            → yirik operatsiyalar                              │
   └─────────────────────────────────────────────────────────────┘
```

## Oqim

```
   Foydalanuvchi hujjat yubordi
        │
        ▼
   ┌────────────────────────────────────────┐
   │  1. Fayl saqlanadi (shifrlangan, M8.10)│
   │  2. Avtomatik tekshiruv:                │
   │     · OCR — ma'lumot o'qish              │
   │     · liveness — jonli odam ekanligi     │
   │     · davlat bazasiga so'rov (MVD/GCP)   │
   └────────────────┬───────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    approved    rejected    manual_review
        │           │           │
        │           │           ▼
        │           │      operator ko'rib chiqadi
        │           │           │
        │           │      ┌────┴────┐
        │           │      ▼         ▼
        │           │  approved  rejected
        ▼           ▼      ▼         ▼
   ┌──────────────────────────────────────┐
   │  Limitlar yangilanadi                 │
   │  Foydalanuvchiga xabar                │
   │  AUDIT log (M8.13)                    │
   └──────────────────────────────────────┘
```

## Davlat bazasiga integratsiya

```
   ⚠ Bu sizning tajribangiz: MVD/GCP integratsiyasi = KYC

   Xususiyatlari:
   · SEKIN javob (soniyalar, ba'zan daqiqalar)
   · ISHONCHSIZ (xizmat ishlamasligi mumkin)
   · Rate limit bor
   · Javob formati o'zgarishi mumkin

   → ASINXRON qilish SHART: so'rov navbatga qo'yiladi,
     natija webhook yoki polling bilan olinadi
   → Anti-corruption layer (M9.6) — ularning modeli bizga kirmasin
   → Retry + circuit breaker (M10.12)
```

```csharp
public sealed class GovernmentKycAdapter(IGovApi api) : IIdentityVerifier
{
    public async Task<VerificationResult> VerifyAsync(
        PassportData data, CancellationToken ct)
    {
        try
        {
            var response = await api.CheckPersonAsync(new GovRequest
            {
                Pinfl = data.Pinfl,
                DocumentSeries = data.Series
            }, ct);

            // ⚠ Ularning modeli BIZNING domenga kirmaydi
            return response.Status switch
            {
                "MATCH"      => VerificationResult.Approved(),
                "NO_MATCH"   => VerificationResult.Rejected("Ma'lumot mos kelmadi"),
                "NOT_FOUND"  => VerificationResult.ManualReview("Bazada topilmadi"),
                _            => VerificationResult.ManualReview("Noma'lum javob")
            };
        }
        catch (BrokenCircuitException)
        {
            return VerificationResult.ManualReview("Xizmat mavjud emas");   // fail-safe
        }
    }
}
```

## Ma'lumotni saqlash

```
   ┌──────────────────────────────────────────────────────────────┐
   │  · Hujjat fayllari — SHIFRLANGAN saqlash (M8.10)             │
   │  · PINFL, pasport raqami — shifrlangan ustun                 │
   │  · Kirish CHEKLANGAN + har murojaat AUDIT'ga (M8.13)         │
   │  · Saqlash muddati — regulyator talabi (odatda 5 yil)        │
   │  · Test muhitida HAQIQIY PII bo'lmasin (M8.12)               │
   └──────────────────────────────────────────────────────────────┘
```

## Intervyu savollari

**1. KYC oqimini qanday loyihalaysiz?**

> Darajalar bilan: har daraja o'z limitlariga ega, va daraja oshgani sari
> imkoniyatlar kengayadi.
>
> Oqim asinxron: hujjat yuklanadi, avtomatik tekshiruvlar (OCR, liveness, davlat
> bazasi) navbatda bajariladi, natija `approved` / `rejected` / `manual_review`
> bo'ladi.
>
> `manual_review` — **majburiy holat**: avtomatik tizim har doim ham aniq javob
> bera olmaydi.

**2. Davlat bazasi ishlamasa nima qilasiz?**

> Bu men duch kelgan holat. Uch chora:
>
> **Asinxron** qilish — so'rov to'lov oqimini bloklamaydi, u navbatga qo'yiladi.
>
> **Circuit breaker** — xizmat yiqilganda unga urib turmaslik (M10.12).
>
> **Fail-safe** — xizmat mavjud bo'lmasa `manual_review` ga o'tkazish, ya'ni odam
> ko'rib chiqadi. Avtomatik `approved` ham, `rejected` ham qilmaslik.
>
> Va **anti-corruption layer** — ularning javob formati o'zgarsa bizning domen
> tegilmaydi (M9.6).

**3. KYC ma'lumotini qanday saqlaysiz?**

> Hujjat fayllari va shaxsiy ma'lumot (PINFL, pasport) — **shifrlangan** (M8.10).
>
> Kirish qat'iy cheklangan va har murojaat **audit log'ga** tushadi: kim, qachon,
> kimning ma'lumotini ko'rdi (M8.13).
>
> Saqlash muddati regulyator talabiga ko'ra belgilanadi, va test muhitida haqiqiy
> ma'lumot ishlatilmaydi.

## Xotira kartasi

```
Darajalar    L0 ko'rish · L1 telefon+ma'lumot (cheklangan limit)
             L2 hujjat tasdiqlangan (to'liq) · L3 qo'shimcha (yirik)
Oqim         hujjat → OCR + liveness + DAVLAT BAZASI
             → approved / rejected / MANUAL_REVIEW (majburiy holat)
Davlat bazasi  SEKIN · ISHONCHSIZ · rate limit
             → ASINXRON · circuit breaker · anti-corruption layer
             → xizmat yo'q bo'lsa MANUAL_REVIEW (fail-safe)
Saqlash      hujjat va PII SHIFRLANGAN · kirish cheklangan
             har murojaat AUDIT'ga · muddat regulyator bo'yicha
             test muhitida haqiqiy PII YO'Q
```

---

# 11.11 · Hisobot va statement

## Turlari

```
   ┌─ STATEMENT (mijoz uchun) ───────────────────────────────────┐
   │  Hisob harakati: sana, summa, qoldiq, kontragent             │
   │  · PDF yoki CSV                                               │
   │  · huquqiy ahamiyatga ega — MUZLATILGAN ma'lumot             │
   ├─ OPERATSION HISOBOT (ichki) ───────────────────────────────┤
   │  Kunlik aylanma, komissiya daromadi, muvaffaqiyat foizi      │
   ├─ REGULYATOR HISOBOTI ──────────────────────────────────────┤
   │  Belgilangan formatda, belgilangan muddatda                  │
   │  ⚠ Format o'zgarishi mumkin — moslashuvchan bo'lsin          │
   ├─ ANALITIKA ────────────────────────────────────────────────┤
   │  Dashboard, tendensiyalar — eventual consistency mumkin      │
   └─────────────────────────────────────────────────────────────┘
```

## Generatsiya

```csharp
// ⚠ Katta hisobot — STREAMING (M3.6), butun natija xotiraga yuklanmaydi
public async IAsyncEnumerable<StatementRow> GenerateAsync(
    Guid accountId, DateOnly from, DateOnly to,
    [EnumeratorCancellation] CancellationToken ct = default)
{
    var (utcFrom, utcTo) = BusinessDay.Range(from, to, _timeZone);   // M4.7

    await using var conn = await _dataSource.OpenConnectionAsync(ct);
    await using var cmd = new NpgsqlCommand(Sql, conn);
    cmd.Parameters.AddWithValue("account", accountId);

    await using var reader = await cmd.ExecuteReaderAsync(ct);
    while (await reader.ReadAsync(ct))
        yield return Map(reader);
}
```

```
   ⚠ Uzoq streaming davomida TRANZAKSIYA OCHIQ QOLMASIN (M5.7)
     → qulflar ushlanadi va bloat paydo bo'ladi
     → read replica'dan o'qish afzal (M5.15)
```

## Asinxron generatsiya

```
   Katta hisobot (millionlab qator) — HTTP so'rovda bajarilmaydi:

   1. POST /reports  →  202 Accepted + report_id
   2. Fon vazifasi generatsiya qiladi
   3. Fayl obyekt saqlashga yuklanadi (S3/Blob)
   4. Foydalanuvchiga xabar + vaqtinchalik yuklab olish havolasi

   ⚠ Havola MUDDATLI va IMZOLANGAN bo'lsin (presigned URL)
     → boshqa foydalanuvchi uni ochib qo'ymasin
```

## Muzlatilgan ma'lumot

```
   ⚠ Statement HUQUQIY hujjat:

   · bir marta generatsiya qilingandan keyin O'ZGARMASLIGI kerak
   · keyinchalik reversal bo'lsa — u YANGI statement'da ko'rinadi
   · eski statement saqlanadi (hash bilan butunlik tekshiruvi)

   → generatsiya paytidagi holat MUZLATILADI va saqlanadi
```

## Intervyu savollari

**1. Katta hisobotni qanday generatsiya qilasiz?**

> **Asinxron**: `POST /reports` → `202 Accepted` + `report_id`. Fon vazifasi
> generatsiya qiladi, fayl obyekt saqlashga yuklanadi, foydalanuvchiga xabar
> beriladi.
>
> Generatsiya paytida **streaming** (M3.6) — millionlab qator xotiraga
> yuklanmaydi va LOH to'lmaydi (M2.2).
>
> Va **read replica**dan o'qiladi (M5.15): hisobot primary DB'ni yuklamasligi
> kerak.

**2. Statement o'zgarishi mumkinmi?**

> Yo'q. Statement — **huquqiy hujjat** va u bir marta generatsiya qilingandan
> keyin o'zgarmasligi kerak.
>
> Agar keyinchalik reversal bo'lsa — u **yangi** statement'da ko'rinadi, eskisi
> o'zgartirilmaydi.
>
> Generatsiya paytidagi holat muzlatiladi va saqlanadi; butunlik uchun hash
> hisoblanadi.

**3. Yuklab olish havolasini qanday himoyalaysiz?**

> **Presigned URL** — muddatli va imzolangan havola (masalan 15 daqiqa).
>
> Fayl to'g'ridan-to'g'ri ochiq bo'lmasligi kerak: URL topib olingan har kim
> boshqa foydalanuvchining hisobotini ko'ra olmasin.
>
> Va yuklab olish fakti **audit log'ga** tushadi (M8.13).

## Xotira kartasi

```
Turlari      STATEMENT (mijoz, huquqiy) · operatsion · REGULYATOR · analitika
Generatsiya  katta hisobot → ASINXRON (202 + report_id)
             STREAMING (M3.6) · READ REPLICA'dan (M5.15)
             ⚠ uzoq streaming + ochiq tranzaksiya → bloat (M5.7)
Yuklab olish PRESIGNED URL — muddatli va imzolangan · audit'ga yoziladi
Muzlatish    statement bir marta generatsiya → O'ZGARMAYDI
             reversal → YANGI statement'da · eskisi hash bilan saqlanadi
Kun chegarasi  biznes kuni, mahalliy zonada (M4.7)
```

---

# 11.12 · Kesh strategiyasi

## Nima keshlanadi

```
   ┌──────────────────────────────┬──────────────────────────────┐
   │  KESHLASH MUMKIN             │  KESHLASH MUMKIN EMAS        │
   ├──────────────────────────────┼──────────────────────────────┤
   │  Valyuta kurslari (TTL 5 daq)│  BALANS                      │
   │  Merchant ma'lumotlari       │  Limit qoldig'i              │
   │  Ma'lumotnomalar (valyuta,   │  Tranzaksiya holati          │
   │   bank kodlari)              │  Idempotency kaliti          │
   │  Foydalanuvchi profili       │  KYC holati (qaror uchun)    │
   │  Komissiya stavkalari        │                              │
   └──────────────────────────────┴──────────────────────────────┘

   ⚠ QOIDA: kesh — TEZLIK uchun, HAQIQAT uchun emas.
     Shu ma'lumot bo'yicha QAROR qabul qilinadimi? Ha → keshlanmaydi.
```

## Naqshlar

```
   ┌─ CACHE-ASIDE (eng ko'p) ────────────────────────────────────┐
   │  o'qish: keshdan → yo'q bo'lsa DB → keshga yozish            │
   │  yozish: DB → keshni INVALIDATSIYA                            │
   │  ✅ sodda · ⚠ birinchi so'rov sekin                           │
   ├─ WRITE-THROUGH ────────────────────────────────────────────┤
   │  yozish: kesh va DB birga                                     │
   │  ⚠ nomuvofiqlik xavfi (biri yozildi, ikkinchisi yo'q)         │
   ├─ READ-THROUGH ─────────────────────────────────────────────┤
   │  kesh o'zi DB'dan yuklaydi                                    │
   └─────────────────────────────────────────────────────────────┘
```

## Kesh stampede

```
   Kesh yozuvi eskirgan LAHZADA:

   ┌──────────────────────────────────────────────────────────────┐
   │  1000 so'rov bir vaqtda keshga murojaat qildi                 │
   │  → hammasi "yo'q" javobini oldi                               │
   │  → hammasi DB'ga urdi                                          │
   │  → DB yiqildi                                                  │
   └──────────────────────────────────────────────────────────────┘

   Yechimlar:
   · bitta yuklovchi (Lazy<T> yoki SemaphoreSlim — M3.8)
   · TTL ga JITTER qo'shish (hammasi bir vaqtda eskirmasin)
   · HybridCache (.NET 9) — stampede himoyasi o'rnatilgan
```

```csharp
// HybridCache — L1 (xotira) + L2 (Redis) + stampede himoyasi
var rate = await _hybridCache.GetOrCreateAsync(
    $"rate:{pair}",
    async token => await LoadRateAsync(pair, token),
    new HybridCacheEntryOptions
    {
        Expiration = TimeSpan.FromMinutes(5),
        LocalCacheExpiration = TimeSpan.FromSeconds(30)
    },
    cancellationToken: ct);
```

## Invalidatsiya

```
   ⚠ "Informatikadagi ikki qiyin masala: kesh invalidatsiyasi va nom berish"

   Strategiyalar:
   ┌──────────────────────────────────────────────────────────────┐
   │  TTL          — sodda, lekin eskirgan ma'lumot oynasi bor    │
   │  Event-based  — o'zgarish hodisasida invalidatsiya (M10.3)   │
   │  Tag-based    — bog'liq kalitlarni birga tozalash            │
   │  Versiya      — kalitda versiya: rate:v2:{pair}              │
   └──────────────────────────────────────────────────────────────┘
```

```csharp
// Merchant ma'lumoti o'zgarganda — event orqali
public async Task Handle(MerchantUpdated e, CancellationToken ct)
{
    await _cache.RemoveAsync($"merchant:{e.MerchantId}", ct);
    await _outputCache.EvictByTagAsync($"merchant-{e.MerchantId}", ct);
}
```

## Ko'p instance

```
   ⚠ IMemoryCache har instance'da ALOHIDA:

   Pod 1: kesh yangilandi
   Pod 2: eski qiymat qoladi
   → foydalanuvchi so'rov qaysi pod'ga tushishiga qarab har xil natija ko'radi

   Yechim:
   · Redis (distributed) — bitta manba
   · yoki HybridCache — L1 lokal, L2 Redis, invalidatsiya tarqatiladi
   · yoki qisqa TTL bilan chidash (agar nomuvofiqlik zarar qilmasa)
```

## Intervyu savollari

**1. Nimani keshlash mumkin emas?** ⭐

> **Balans, limit qoldig'i, tranzaksiya holati, idempotency kaliti** — ular
> bo'yicha **qaror qabul qilinadi**.
>
> Eskirgan balans ortiqcha pul yechilishiga olib keladi, va bu tuzatib bo'lmaydigan
> muammo.
>
> Keshlash mumkin: valyuta kurslari, ma'lumotnomalar, merchant ma'lumotlari,
> komissiya stavkalari.
>
> Qoida sodda: kesh — **tezlik uchun, haqiqat uchun emas**.

**2. Kesh stampede nima?**

> Kesh yozuvi eskirgan lahzada **barcha** so'rovlar bir vaqtda manbaga uradi va uni
> yiqitadi.
>
> Yechimlar: bitta kalit uchun bitta yuklovchi (`Lazy<T>` yoki `SemaphoreSlim`),
> TTL ga jitter qo'shish, yoki `HybridCache` — u stampede himoyasini o'zi beradi.

**3. Ko'p instance'da kesh qanday ishlaydi?**

> `IMemoryCache` har instance'da **alohida** — bitta pod'da yangilangan qiymat
> boshqasida eski qoladi va foydalanuvchi har xil natija ko'radi.
>
> Yechim: Redis (bitta manba) yoki `HybridCache` — L1 lokal, L2 Redis, va
> invalidatsiya instance'lar orasida tarqatiladi.
>
> Yoki nomuvofiqlik zarar qilmasa — qisqa TTL bilan chidash, lekin bu **ongli
> qaror** bo'lishi kerak.

## Xotira kartasi

```
Mumkin       kurslar · ma'lumotnomalar · merchant · komissiya stavkalari
MUMKIN EMAS  BALANS · limit qoldig'i · tranzaksiya holati · idempotency kaliti
Qoida        kesh TEZLIK uchun, HAQIQAT uchun emas
             "shu ma'lumot bo'yicha QAROR qabul qilinadimi?"
Naqshlar     cache-aside (eng ko'p) · write-through · read-through
Stampede     kesh eskirganda hamma DB'ga uradi
             → bitta yuklovchi · TTL jitter · HybridCache
Invalidatsiya  TTL · event-based · tag-based · versiyalangan kalit
Ko'p instance  IMemoryCache ALOHIDA → Redis yoki HybridCache (L1+L2)
```

---

# 11.13 · Masshtablash tartibi ⭐

## Tartib — eng muhim qism

```
   ┌──────────────────────────────────────────────────────────────┐
   │  1. O'LCHASH                    ← har doim birinchi           │
   │     "qayerda sekin?" — taxmin qilmang (M2.7, M5.9)            │
   ├──────────────────────────────────────────────────────────────┤
   │  2. SO'ROV VA INDEKS optimallashtirish                        │
   │     odatda ENG KATTA foyda shu yerda (M5.8, M6.2)            │
   ├──────────────────────────────────────────────────────────────┤
   │  3. KESH                                                       │
   │     nimani mumkin, nimani mumkin emas (11.12)                 │
   ├──────────────────────────────────────────────────────────────┤
   │  4. READ REPLICA                                              │
   │     o'qish yukini ajratish (M5.15)                            │
   ├──────────────────────────────────────────────────────────────┤
   │  5. VERTIKAL masshtab                                         │
   │     kuchliroq server — arzon va sodda                         │
   ├──────────────────────────────────────────────────────────────┤
   │  6. GORIZONTAL (stateless servislar)                          │
   │     ilova instance'larini ko'paytirish                         │
   ├──────────────────────────────────────────────────────────────┤
   │  7. PARTITIONING (M5.14)                                      │
   ├──────────────────────────────────────────────────────────────┤
   │  8. SHARDING                    ← ENG OXIRGI chora            │
   │     tranzaksion kafolatlarni buzadi                           │
   └──────────────────────────────────────────────────────────────┘
```

> **Bu tartibni aytish — yetuklik belgisi.** Ko'pchilik darhol 8-bandga sakraydi.

## Bo'g'izni topish

```
   ┌──────────────────┬───────────────────────────────────────────┐
   │  Simptom         │  Ehtimoliy sabab                          │
   ├──────────────────┼───────────────────────────────────────────┤
   │  DB CPU yuqori   │  indeks yo'q · N+1 · noto'g'ri so'rov      │
   │  DB CPU past,    │  qulflar · uzoq tranzaksiya · connection   │
   │  kechikish yuqori│  pool tugagan (M5.12)                     │
   │  Ilova CPU yuqori│  serializatsiya · allocation (M2.5)       │
   │  Ilova CPU past, │  thread pool starvation (M3.3) ·          │
   │  kechikish yuqori│  tashqi API kutish                        │
   │  Xotira o'sadi   │  sizish (M2.3) · kesh cheklanmagan        │
   └──────────────────┴───────────────────────────────────────────┘
```

## Fintech'da nima ishlaydi

```
   Kuniga 1 mln to'lov = ~60 RPS cho'qqida (11.1)

   ┌──────────────────────────────────────────────────────────────┐
   │  Bitta yaxshi sozlangan PostgreSQL:                           │
   │  · to'g'ri indekslar bilan minglab RPS ko'taradi              │
   │  · 60 RPS — bu JUDA KAM yuk                                   │
   │                                                                │
   │  → sharding KERAK EMAS                                        │
   │  → alohida read DB KERAK EMAS                                 │
   │  → Kafka KERAK EMAS (RabbitMQ yoki hatto outbox+polling)      │
   └──────────────────────────────────────────────────────────────┘

   Amalda kerak bo'ladigan narsalar:
   · to'g'ri indekslar (M5.8)
   · connection pool sozlash (M5.12)
   · ledger uchun partitioning (vaqt bo'yicha, M5.14)
   · hisobotlar uchun read replica (M5.15)
```

## Nimani masshtablab bo'lmaydi

```
   ⚠ Ba'zi narsalar tabiiy cheklangan:

   · BITTA HISOB balansi — u ketma-ket o'zgaradi
     (issiq merchant hisobi bo'g'iz bo'lishi mumkin)
     → yechim: yozuvlarni append qilib, balansni agregatsiya bilan
              hisoblash (qulfni olib tashlash)

   · Global UNIQUE (idempotency key) — sharding'da murakkab

   · Tranzaksion kafolat — sharding'da yo'qoladi
```

## Intervyu savollari

**1. Tizim sekinlashdi. Qanday masshtablaysiz?** ⭐

> Birinchi javob — **o'lchayman**. Bo'g'iz qayerda ekanini bilmasdan
> optimallashtirish — vaqt behuda.
>
> Keyin tartib bo'yicha: so'rov va indeks optimallashtirish (odatda eng katta
> foyda) → kesh → read replica → vertikal masshtab → gorizontal → partitioning →
> **sharding oxirgi**.
>
> Sharding tranzaksion kafolatlarni buzadi va fintech'da bu juda qimmat.

**2. Fintech hajmida sharding kerakmi?**

> Deyarli **hech qachon**. Kuniga 1 million to'lov — bu cho'qqida ~60 RPS, va bitta
> yaxshi sozlangan PostgreSQL uni bemalol ko'taradi.
>
> Amalda kerak bo'ladigan narsalar boshqacha: to'g'ri indekslar, connection pool
> sozlamalari, ledger uchun vaqt bo'yicha partitioning, hisobotlar uchun read
> replica.
>
> Sharding kerak bo'lgan hajm — bu kuniga o'nlab million tranzaksiya, va u
> darajaga chiqqanda ham avval boshqa choralar sinaladi.

**3. Nimani masshtablab bo'lmaydi?**

> **Bitta hisob balansi** — u ketma-ket o'zgaradi va issiq hisob (yirik merchant)
> bo'g'iz bo'lishi mumkin.
>
> Yechim: qulfni olib tashlash — yozuvlarni append qilib, balansni agregatsiya
> bilan hisoblash. Shunda parallel yozuvlar bir-birini kutmaydi.
>
> Va **global UNIQUE** (idempotency key) sharding'da murakkab bo'lib qoladi — bu
> sharding'ning yana bir yashirin narxi.

## Xotira kartasi

```
TARTIB       1. O'LCHASH ← har doim birinchi
             2. so'rov + indeks (ENG KATTA foyda)
             3. kesh · 4. read replica · 5. vertikal
             6. gorizontal · 7. partitioning · 8. SHARDING (oxirgi)
Bo'g'iz      DB CPU yuqori → indeks/N+1
             DB CPU past + sekin → qulf/pool
             ilova CPU past + sekin → thread starvation/tashqi API
Fintech      60 RPS = bitta PostgreSQL uchun KAM yuk
             sharding KERAK EMAS · Kafka KERAK EMAS
             kerak: indeks · pool · ledger partitioning · read replica
Masshtablanmaydigan  bitta hisob balansi (ketma-ket)
             → yozuvni append + agregatsiya (qulfni olib tashlash)
             global UNIQUE sharding'da murakkab
```

---

# 11.14 · Rate limiting algoritmlari

## To'rt algoritm

```
   ┌─ FIXED WINDOW ──────────────────────────────────────────────┐
   │  Har oynada N ta so'rov (masalan daqiqada 100)               │
   │  ✅ sodda, kam xotira                                         │
   │  ❌ CHEGARA MUAMMOSI: 12:00:59 da 100 + 12:01:00 da 100      │
   │     → bir soniyada 200 so'rov o'tadi                          │
   ├─ SLIDING WINDOW LOG ───────────────────────────────────────┤
   │  Har so'rov vaqti saqlanadi, oyna siljiydi                   │
   │  ✅ aniq                                                       │
   │  ❌ ko'p xotira (har so'rov uchun yozuv)                      │
   ├─ SLIDING WINDOW COUNTER ───────────────────────────────────┤
   │  Oldingi va joriy oyna vaznlangan hisoblanadi                │
   │  ✅ muvozanat — aniqlik va xotira                             │
   ├─ TOKEN BUCKET ─────────────────────────────────────────────┤
   │  Chelakka doimiy tezlikda token qo'shiladi                   │
   │  ✅ PORTLASH (burst) ruxsat etiladi                           │
   │  ✅ o'rtacha tezlik cheklanadi                                 │
   │  → AMALDA ENG KO'P ISHLATILADIGANI                            │
   └─────────────────────────────────────────────────────────────┘
```

```
   Token bucket:

   ┌─────────────┐
   │  ●●●●●●●●●● │  ← 10 token (limit)
   │             │  ← daqiqada 100 token qo'shiladi
   └──────┬──────┘
          │ har so'rov 1 token oladi
          ▼
   token bor → o'tadi · token yo'q → 429

   → 10 ta so'rov DARHOL o'tadi (burst)
   → keyin daqiqada 100 tezlikda
```

## .NET implementatsiyasi

```csharp
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Umumiy — foydalanuvchi bo'yicha
    o.AddPolicy("per-user", ctx => RateLimitPartition.GetTokenBucketLimiter(
        partitionKey: ctx.User.GetUserId()?.ToString()
                      ?? ctx.Connection.RemoteIpAddress?.ToString()
                      ?? "anonymous",
        factory: _ => new TokenBucketRateLimiterOptions
        {
            TokenLimit = 100,
            TokensPerPeriod = 100,
            ReplenishmentPeriod = TimeSpan.FromMinutes(1),
            QueueLimit = 0                     // ⚠ navbat yo'q — darhol rad
        }));

    // To'lov — qattiqroq
    o.AddPolicy("payments", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.User.GetUserId()?.ToString() ?? "anonymous",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));

    o.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.Headers.RetryAfter = "60";
        await ctx.HttpContext.Response.WriteAsJsonAsync(
            new ProblemDetails { Status = 429, Title = "Juda ko'p so'rov" }, ct);
    };
});
```

## Ko'p instance muammosi

```
   ⚠ Har instance O'Z hisobini yuritadi:

   10 pod × 100 so'rov/daqiqa = 1000 so'rov o'tadi
   (kutilgan: 100)

   Yechimlar:
   ┌──────────────────────────────────────────────────────────────┐
   │  1. Chegarani instance soniga BO'LISH (100/10 = 10)          │
   │     ⚠ instance soni o'zgarsa qayta sozlash kerak              │
   │  2. REDIS asosidagi distributed rate limiter                  │
   │     ✅ aniq · ⚠ har so'rovda Redis chaqiruvi                  │
   │  3. Gateway darajasida (nginx, Envoy, API Gateway)            │
   │     ✅ ilovaga yetib bormaydi                                 │
   └──────────────────────────────────────────────────────────────┘
```

## Nimani cheklash

```
   ┌──────────────────────────┬──────────────────────────────────┐
   │  Endpoint                │  Chegara (misol)                 │
   ├──────────────────────────┼──────────────────────────────────┤
   │  Login                   │  5 / daqiqa / IP  ← brute force  │
   │  To'lov yaratish         │  10 / daqiqa / user              │
   │  Balans o'qish           │  100 / daqiqa / user             │
   │  Hisobot generatsiyasi   │  5 / soat / user  ← qimmat       │
   │  Webhook qabul qilish    │  merchant bo'yicha               │
   └──────────────────────────┴──────────────────────────────────┘

   ⚠ Proxy ortida IP bo'yicha cheklash — ForwardedHeaders SHART (M7.1)
     aks holda hamma so'rov bitta IP dan ko'rinadi va TIZIM BLOKLANADI
```

## Intervyu savollari

**1. Qaysi algoritmni tanlaysiz?**

> Amalda **token bucket** — u qisqa portlashlarga (burst) ruxsat beradi va
> o'rtacha tezlikni cheklaydi. Bu real foydalanuvchi xatti-harakatiga mos.
>
> Fixed window sodda, lekin **chegara muammosi** bor: oyna oxirida va boshida
> to'liq limit ishlatilib, bir soniyada ikki barobar so'rov o'tishi mumkin.
>
> Sliding window aniqroq, lekin qimmatroq.

**2. Ko'p instance'da rate limiting qanday ishlaydi?** ⭐

> Sukut bo'yicha **har instance o'z hisobini yuritadi**: 10 pod × 100 = 1000 so'rov
> o'tadi, kutilgan 100 o'rniga.
>
> Uch yechim: chegarani instance soniga bo'lish (lekin scaling'da qayta sozlash
> kerak), Redis asosidagi distributed limiter (aniq, lekin har so'rovda Redis
> chaqiruvi), yoki **gateway darajasida** cheklash — bu eng toza, chunki so'rov
> ilovaga umuman yetib bormaydi.

**3. Proxy ortida qanday tuzoq bor?**

> `ForwardedHeaders` sozlanmagan bo'lsa (M7.1), Kestrel client IP sifatida
> **proxy IP'sini** ko'radi.
>
> Natijada IP bo'yicha rate limiting hamma so'rovni bitta manbadan deb hisoblaydi
> va **butun tizimni bloklaydi**.
>
> Bu production'da tez-tez uchraydigan va tashxis qo'yish qiyin bo'lgan xato.

## Xotira kartasi

```
Fixed window   sodda · ❌ CHEGARA muammosi (oyna chegarasida 2×)
Sliding log    aniq · ❌ ko'p xotira
Sliding counter  muvozanat
TOKEN BUCKET   BURST ruxsat + o'rtacha tezlik → AMALDA eng ko'p
.NET           AddRateLimiter · partition = user ID yoki IP
               QueueLimit = 0 (darhol rad) · 429 + Retry-After
Ko'p instance  har biri O'Z hisobini yuritadi → 10 pod = 10× limit
               → chegarani bo'lish · Redis · GATEWAY darajasida
Chegaralar     login 5/daq (brute force) · to'lov 10/daq · hisobot 5/soat
Tuzoq          proxy ortida ForwardedHeaders SHART (M7.1)
               aks holda hamma bitta IP → TIZIM BLOKLANADI
```

---

# 11.15 · Multi-tenancy

## Uch model

```
   ┌─ 1. ALOHIDA DB har tenant uchun ────────────────────────────┐
   │  ✅ to'liq izolyatsiya · oson zaxira/tiklash                  │
   │  ✅ regulyator talabi bo'lsa qulay                            │
   │  ❌ migratsiya har DB'da · ko'p ulanish · qimmat              │
   │  → kam sonli yirik tenant uchun (banklar)                    │
   ├─ 2. ALOHIDA SXEMA (bitta DB) ──────────────────────────────┤
   │  ✅ yaxshi izolyatsiya · bitta DB                             │
   │  ⚠ sxemalar soni o'sib ketadi                                 │
   ├─ 3. UMUMIY JADVAL + tenant_id ─────────────────────────────┤
   │  ✅ sodda · arzon · oson masshtab                             │
   │  ❌ IZOLYATSIYA KODGA bog'liq → xato qimmat                   │
   │  → ko'p sonli kichik tenant uchun                             │
   └─────────────────────────────────────────────────────────────┘
```

## Umumiy jadval — himoya qatlamlari

```csharp
// 1. Global query filter (M6.1)
modelBuilder.Entity<Payment>()
    .HasQueryFilter(p => p.TenantId == _tenantProvider.Current);
```

```
   ⚠ Bu YETARLI EMAS:
   · IgnoreQueryFilters() yozilsa chetlab o'tiladi
   · raw SQL filtrni bilmaydi (M6.8)
   · yangi jadval qo'shilganda filtr unutilishi mumkin
```

```sql
-- 2. Row-Level Security (RLS) — DB darajasida
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON payments
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Ilova har ulanishda o'rnatadi
SET LOCAL app.tenant_id = '...';
```

```csharp
// 3. Arxitektura testi — har jadval tenant_id ga ega
[Fact]
public void AllTenantScopedEntities_HaveTenantId()
{
    foreach (var entityType in db.Model.GetEntityTypes())
    {
        if (TenantScopedTables.Contains(entityType.GetTableName()))
            Assert.NotNull(entityType.FindProperty("TenantId"));
    }
}
```

## Tenant aniqlash

```csharp
// Manba: JWT claim (eng ishonchli) yoki subdomain yoki header
public sealed class TenantMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx, ITenantProvider provider)
    {
        var tenantId = ctx.User.FindFirstValue("tenant_id");    // ⚠ token'dan

        if (tenantId is null)
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        provider.Set(Guid.Parse(tenantId));
        await next(ctx);
    }
}
```

```
   ⚠ Tenant ID ni HEADER yoki QUERY dan olmang —
     foydalanuvchi uni o'zgartirib boshqa tenant ma'lumotini olishi mumkin.
     Faqat TOKEN claim'idan (M8.1).
```

## Umumiy resurslar

```
   ┌──────────────────────────────────────────────────────────────┐
   │  "Shovqinli qo'shni" muammosi:                                │
   │  bir tenant butun resursni yeb qo'yadi                        │
   │                                                                │
   │  · rate limit — TENANT bo'yicha (11.14)                       │
   │  · connection pool — tenant bo'yicha bo'lish yoki cheklash    │
   │  · fon vazifalari — tenant bo'yicha navbat                    │
   │  · monitoring — tenant bo'yicha metrikalar                    │
   └──────────────────────────────────────────────────────────────┘
```

## Intervyu savollari

**1. Multi-tenancy modelini qanday tanlaysiz?**

> Tenant soni va izolyatsiya talabiga qarab.
>
> **Kam sonli yirik tenant** (banklar) — alohida DB: to'liq izolyatsiya, zaxira
> va tiklash oson, regulyator talabiga mos.
>
> **Ko'p sonli kichik tenant** — umumiy jadval + `tenant_id`: sodda va arzon.
>
> Fintech'da regulyator talabi ko'pincha hal qiladi: ba'zi hollarda ma'lumotni
> fizik ajratish talab qilinadi.

**2. Umumiy jadvalda izolyatsiyani qanday kafolatlaysiz?** ⭐

> **Bir qatlam yetarli emas** — uch qatlam kerak:
>
> 1. **Global query filter** — EF Core darajasida, lekin `IgnoreQueryFilters` yoki
>    raw SQL uni chetlab o'tadi.
> 2. **Row-Level Security** — DB darajasida, va uni chetlab o'tib bo'lmaydi.
> 3. **Arxitektura testi** — har tenant-scoped jadvalda `tenant_id` borligini
>    tekshiradi.
>
> Va tenant ID **faqat token claim'idan** olinadi, hech qachon header yoki
> query'dan.

**3. Shovqinli qo'shni muammosi nima?**

> Bir tenant umumiy resursni yeb qo'yishi: barcha DB ulanishlarini band qilish,
> fon vazifalari navbatini to'ldirish, rate limit'ni to'liq ishlatish.
>
> Yechim: har resursni **tenant bo'yicha cheklash** — rate limit tenant bo'yicha,
> connection pool bo'lingan, fon vazifalari alohida navbatda.
>
> Va monitoring ham tenant bo'yicha bo'lishi kerak, aks holda muammoni topib
> bo'lmaydi.

## Xotira kartasi

```
Modellar     alohida DB (kam yirik tenant) · alohida sxema
             umumiy jadval + tenant_id (ko'p kichik tenant)
Izolyatsiya  3 QATLAM:
             1. global query filter (EF) — IgnoreQueryFilters chetlab o'tadi
             2. ROW-LEVEL SECURITY (DB) — chetlab bo'lmaydi
             3. arxitektura testi — har jadvalda tenant_id
Tenant ID    FAQAT token claim'idan · header/query'dan HECH QACHON
Shovqinli qo'shni  bir tenant resursni yeb qo'yadi
             → rate limit, pool, fon navbati, monitoring TENANT bo'yicha
```

---

# 11.16 · Notification

## Kanallar

```
   ┌──────────┬─────────────┬────────────────────────────────────┐
   │  Kanal   │  Kechikish  │  Xususiyat                         │
   ├──────────┼─────────────┼────────────────────────────────────┤
   │  Push    │  Soniyalar  │  Arzon · qurilma bo'lishi kerak    │
   │  SMS     │  Soniyalar  │  QIMMAT · deyarli har doim yetadi  │
   │  Email   │  Daqiqalar  │  Arzon · spam'ga tushishi mumkin   │
   │  In-app  │  Darhol     │  Bepul · ilova ochilishi kerak     │
   └──────────┴─────────────┴────────────────────────────────────┘

   Fintech'da odatda: push → yetmasa SMS (fallback)
   ⚠ SMS narxi sezilarli — kerak bo'lmasa yuborilmaydi
```

## Arxitektura

```
   Payment Service
        │  outbox: payment.completed (M10.3)
        ▼
   ┌─────────────────────────────────────────────────────┐
   │  Notification Service                                │
   │    1. Foydalanuvchi sozlamalari (qaysi kanal?)       │
   │    2. Shablon tanlash (til, kanal)                   │
   │    3. Kanal tanlash (push bor? → push, yo'q → SMS)   │
   │    4. Yuborish + retry                                │
   │    5. Holat yozib borish                              │
   └─────────────────────────────────────────────────────┘
```

```sql
CREATE TABLE notifications (
    id             uuid PRIMARY KEY,
    user_id        uuid NOT NULL,
    event_id       uuid NOT NULL,             -- ⚠ idempotentlik uchun
    channel        text NOT NULL,
    template_code  text NOT NULL,
    payload        jsonb NOT NULL,
    status         text NOT NULL,             -- pending, sent, delivered, failed
    attempts       int NOT NULL DEFAULT 0,
    sent_at        timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),

    UNIQUE (event_id, channel)                -- ⚠ bir hodisa bir kanalga BIR marta
);
```

## Idempotentlik

```
   ⚠ Xabar ikki marta yuborilmasligi kerak:
     "Hisobingizdan 80 000 so'm yechildi" ikki marta kelsa
     → foydalanuvchi ikki marta yechilgan deb o'ylaydi
     → qo'llab-quvvatlashga murojaat

   Yechim: UNIQUE (event_id, channel) — DB darajasida (M5.11)
```

## Shablonlar va lokalizatsiya

```csharp
public sealed record NotificationTemplate(
    string Code, string Language, string Channel, string Subject, string Body);

// "payment.completed" + "uz" + "sms"
// → "Hisobingizdan {Amount} {Currency} yechildi. Qoldiq: {Balance}"

// ⚠ Shablonlar DB'da — deploy'siz o'zgartirish uchun
// ⚠ Har o'zgarish AUDIT'ga (M8.13) — huquqiy ahamiyati bor
```

## Maxfiylik

```
   ⚠ Notification'da NIMA BO'LMASLIGI kerak:
   · to'liq karta raqami (faqat oxirgi 4 raqam — M8.12)
   · balans (agar sozlamada o'chirilgan bo'lsa)
   · kontragent to'liq ismi (qisqartirilgan)
   · OTP va to'lov tafsiloti BIR XABARDA

   → SMS shifrlanmagan kanal, u operator tomonidan ko'rinishi mumkin
```

## Yetkazish holati

```
   pending → sent → delivered → read
                 ↘ failed → retry → exhausted

   ⚠ "sent" ≠ "delivered":
     · SMS gateway qabul qildi ≠ telefonga yetdi
     · push yuborildi ≠ ko'rsatildi

   → Kritik xabarlar uchun DELIVERED holatini kuzatish
   → Yetmasa boshqa kanalga o'tish (fallback)
```

## Intervyu savollari

**1. Notification'ni qanday loyihalaysiz?**

> Alohida servis, **outbox orqali** hodisa oladi (M10.3) — to'lov oqimini
> bloklamaydi va hodisa yo'qolmaydi.
>
> Ichida: foydalanuvchi sozlamalari, shablon tanlash (til va kanal bo'yicha),
> kanal tanlash fallback bilan (push yo'q bo'lsa SMS), yuborish va holat kuzatish.
>
> **Idempotentlik majburiy**: `UNIQUE (event_id, channel)` — bir hodisa bir
> kanalga bir marta.

**2. Xabar ikki marta yuborilishi nima uchun xavfli?**

> «Hisobingizdan 80 000 so'm yechildi» xabari ikki marta kelsa, foydalanuvchi
> **ikki marta yechilgan** deb o'ylaydi va qo'llab-quvvatlashga murojaat qiladi.
>
> Bu texnik muammo emas, lekin ishonch va qo'llab-quvvatlash yuki masalasi.
>
> Yechim DB darajasida: `UNIQUE (event_id, channel)`, chunki broker at-least-once
> beradi (M10.5).

**3. SMS'da nima yozilmasligi kerak?**

> To'liq karta raqami (faqat oxirgi 4 raqam), va OTP bilan to'lov tafsiloti bir
> xabarda bo'lmasligi kerak.
>
> Sabab: SMS **shifrlanmagan** kanal — u operator tarmog'ida ko'rinishi mumkin, va
> telefon qulflangan ekranda ham o'qiladi.
>
> Va balans ko'rsatilishi foydalanuvchi sozlamasiga bog'liq bo'lishi kerak.

## Xotira kartasi

```
Kanallar     push (arzon) → SMS (qimmat, fallback) · email · in-app
Arxitektura  OUTBOX orqali hodisa (to'lov oqimini bloklamaydi)
             sozlama → shablon → kanal → yuborish → holat
Idempotentlik  UNIQUE (event_id, channel) — DB darajasida
             ⚠ ikki marta xabar → foydalanuvchi ikki marta yechilgan deb o'ylaydi
Shablonlar   DB'da (deploy'siz o'zgartirish) · til + kanal bo'yicha
             o'zgarish AUDIT'ga
Maxfiylik    to'liq karta raqami YO'Q · OTP va tafsilot bir xabarda YO'Q
             SMS shifrlanmagan kanal
Holat        sent ≠ DELIVERED · kritik xabarlar uchun delivered kuzatiladi
             yetmasa boshqa kanalga fallback
```

---

## M11 — yakuniy tekshiruv ro'yxati

Kodsiz, og'zaki javob bera olsangiz — modul yopilgan:

- [ ] Design intervyusini qanday boshlaysiz, qanday savollar so'raysiz
- [ ] Hajmni baholash nima beradi
- [ ] Ledger jadvalini qanday loyihalaysiz, `Δ = 0` nima
- [ ] Komissiyani qayerga yozasiz
- [ ] Mijoz walleti qanday hisob turi
- [ ] Suspense hisobi nima uchun kerak
- [ ] Available va umumiy balans farqi
- [ ] Hold'ni qanday ifodalaysiz
- [ ] Balansni keshlaysizmi
- [ ] To'lov tizimini to'rt qatlamda tasvirlab bering
- [ ] `unknown` holati nega kerak
- [ ] Authorization, capture, void, refund, chargeback farqi
- [ ] 3-D Secure nima beradi
- [ ] P2P o'tkazmada ikki muammo va ularning yechimi
- [ ] Rejalashtirilgan to'lovda idempotency kaliti qanday quriladi
- [ ] Kunlik limitni qanday tekshirasiz
- [ ] Anti-fraud ishlamasa nima qilasiz
- [ ] Davlat bazasi ishlamasa KYC nima qiladi
- [ ] Statement o'zgarishi mumkinmi
- [ ] Nimani keshlash mumkin emas
- [ ] Masshtablash tartibi — sakkiz qadam
- [ ] Fintech hajmida sharding kerakmi
- [ ] Ko'p instance'da rate limiting
- [ ] Multi-tenancy izolyatsiyasining uch qatlami
- [ ] Notification idempotentligi nega muhim

**Deliverable'lar:**

- [ ] `LedgerTests` — balanslangan yozuvlar, `Δ = 0`, kesh mosligi
- [ ] `BalanceTests` — hold, available, parallel yechish
- [ ] `PaymentFlowTests` — timeout `unknown`, hold release, holat tarixi
- [ ] `TransferTests` — atomiklik, deadlock yo'qligi, idempotentlik
- [ ] `LimitTests` — write skew isboti va atomik yechim
- [ ] `system-design/designs/` — kamida 3 ta design hujjati:
      `payment-system.md`, `ledger.md`, `wallet-balance.md`
