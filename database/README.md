# M5 · Ma'lumotlar bazasi — to'liq

**EF Core bilish ≠ SQL bilish.** Interviewer toza SQL savolini beradi va EF sizni
himoya qilmaydi. Bu — reject sababi eng ko'p chiqadigan bo'lim.

| # | Mavzu | P |
|---|---|---|
| [5.1](#51--acid-tranzaksiya-hayot-sikli-wal) | ACID, tranzaksiya hayot sikli, WAL | P0 |
| [5.2](#52--isolation-levels-va-tort-anomaliya) | Isolation levels va to'rt anomaliya | P0 |
| [5.3](#53--lost-update-) | Lost update — reproduce va uchta yechim ⭐ | P0 |
| [5.4](#54--pessimistic-locking) | Pessimistic locking | P0 |
| [5.5](#55--optimistic-locking) | Optimistic locking | P0 |
| [5.6](#56--deadlock) | Deadlock | P0 |
| [5.7](#57--mvcc-snapshot-va-vacuum) | MVCC, snapshot va VACUUM | P1 |
| [5.8](#58--indekslar) | Indekslar | P0 |
| [5.9](#59--explain-analyze-va-planner) | `EXPLAIN ANALYZE` va planner | P1 |
| [5.10](#510--normalizatsiya-va-denormalizatsiya) | Normalizatsiya va denormalizatsiya | P1 |
| [5.11](#511--constraintlar) | Constraint'lar | P1 |
| [5.12](#512--connection-pool) | Connection pool | P1 |
| [5.13](#513--migratsiya-va-zero-downtime) | Migratsiya va zero-downtime | P1 |
| [5.14](#514--partitioning-va-sharding) | Partitioning va sharding | P2 |
| [5.15](#515--replikatsiya-va-read-replica) | Replikatsiya va read replica | P1 |
| [5.16](#516--zaxira-va-tiklash-pitr) | Zaxira va tiklash (PITR) | P2 |

Misollar **PostgreSQL 16** uchun; SQL Server farqlari alohida belgilangan.

---

# 5.1 · ACID, tranzaksiya hayot sikli, WAL

## Nima va nega

Bitta pul o'tkazmasi kamida ikkita yozuvdan iborat: birovdan yechish, birovga qo'shish.
Ular orasida tizim yiqilsa — pul yo'qoladi. Tranzaksiya aynan shu muammoni hal qilish
uchun mavjud: **bir nechta amalni bitta bo'linmas birlikka aylantirish**.

ACID — to'rtta **alohida** kafolat nomi. Intervyuda ko'pincha "qaysi biri sizga eng
muhim?" deb so'raladi, ya'ni ta'rifni emas, tushunishni tekshiradi.

| Harf | Kafolat | Buzilsa nima bo'ladi |
|---|---|---|
| **A** — Atomicity | Hammasi, yoki hech biri | Pul bir hisobdan chiqadi, ikkinchisiga kirmaydi |
| **C** — Consistency | Constraint'lar buzilmaydi | Manfiy balans, mavjud bo'lmagan hisobga havola |
| **I** — Isolation | Parallel tranzaksiyalar xalaqit bermaydi | Lost update, dirty read |
| **D** — Durability | Commit bo'lgan narsa yo'qolmaydi | Elektr o'chdi — commit qilingan to'lov g'oyib bo'ldi |

> **Nuans:** bu yerdagi Consistency — **DB constraint'lari** haqida (`CHECK`, FK, `UNIQUE`),
> CAP teoremasidagi Consistency emas. Bir xil so'z, boshqa ma'no. Buni ajratib aytish
> intervyuda yaxshi signal.

## Ichki mexanika — WAL

Savol: DB commit'ni qanday **darhol ishonchli** qiladi, lekin sekinlashmaydi?
Javob: **Write-Ahead Log** (WAL; SQL Server'da transaction log).

Qoida: **ma'lumot faylini o'zgartirishdan oldin, o'zgarish logga yoziladi.**

```
COMMIT bosilganda:

  1. O'zgarish WAL buferiga yoziladi          (xotira — tez)
  2. WAL diskka fsync qilinadi                ← COMMIT SHU YERDA TUGAYDI
  3. Ma'lumot sahifalari xotirada o'zgaradi   (dirty pages)
  4. Checkpoint keyinroq ularni diskka yozadi

                     ┌───────────────┐
   COMMIT ──────────►│  WAL  (disk)  │   ketma-ket yozuv → TEZ
                     └───────┬───────┘
                             │ keyinroq, fon rejimida
                             ▼
                     ┌───────────────┐
                     │  Data files   │   tasodifiy yozuv → SEKIN
                     └───────────────┘
```

**Nega tez:** WAL'ga yozish ketma-ket (sequential), ma'lumot fayliga yozish tasodifiy
(random). Ketma-ket yozuv diskda ancha tez.

**Nega ishonchli:** 3-qadamdan keyin crash bo'lsa, DB ishga tushganda WAL'ni o'qib
tugallanmagan ishni qayta bajaradi (redo) yoki bekor qiladi (undo).

## Kod — tranzaksiya hayot sikli

```sql
BEGIN;                                  -- snapshot olinadi (darajaga qarab)

  UPDATE accounts SET balance = balance - 80000 WHERE id = 1;
  -- ⚠ shu paytdan 1-qator QULFLANGAN, boshqalar kutadi

  UPDATE accounts SET balance = balance + 80000 WHERE id = 2;

  SAVEPOINT after_transfer;             -- oraliq nuqta
  INSERT INTO notifications (...) VALUES (...);
  ROLLBACK TO after_transfer;           -- faqat INSERT bekor qilindi

COMMIT;                                 -- fsync(WAL) → qulflar bo'shatiladi
```

```csharp
// ❌ Tranzaksiya ichida tashqi chaqiruv
using var tx = await db.Database.BeginTransactionAsync();
db.Payments.Add(payment);
await db.SaveChangesAsync();
await providerApi.ChargeAsync(payment);   // 30 soniya kutishi mumkin —
await tx.CommitAsync();                   // qulflar shuncha vaqt ushlanadi

// ✅ Tranzaksiya qisqa, tashqi chaqiruv tashqarida
using var tx = await db.Database.BeginTransactionAsync();
db.Payments.Add(payment);
db.Outbox.Add(new OutboxMessage("payment.initiated", payment.Id));
await db.SaveChangesAsync();
await tx.CommitAsync();                   // qulflar darhol bo'shaydi
// provayder chaqiruvi keyin, relay orqali
```

## Tipik xatolar

| Xato | Nima bo'ladi |
|---|---|
| Tranzaksiya ichida HTTP so'rov | Qulflar tashqi API tezligiga bog'lanib qoladi |
| Tranzaksiya ichida uzoq hisob / `Thread.Sleep` | Xuddi shu — qulf ushlanadi |
| `BEGIN` qilib `COMMIT`/`ROLLBACK` yozmaslik | Ulanish `idle in transaction` holatida qoladi |
| Har `SaveChanges` uchun alohida tranzaksiya | Atomiklik yo'qoladi: biri o'tadi, ikkinchisi yo'q |
| Autocommit'ga tayanish | Ikki `UPDATE` orasida crash → nomuvofiqlik |

> **Amaliy qoida:** tranzaksiya **millisekundlarda** o'lchanishi kerak. Sekundlarda
> o'lchansa — dizaynda muammo bor.

## Fintech konteksti

- **Durability shartli emas.** Ba'zi tizimlar tezlik uchun `synchronous_commit = off`
  qiladi — bu crash paytida oxirgi bir necha tranzaksiyani yo'qotish demak. To'lovda
  bu qabul qilinmaydi.
- **Atomicity ledger'da hal qiluvchi.** Debit va credit yozuvlari bitta tranzaksiyada
  bo'lishi shart, aks holda `SUM(DR) ≠ SUM(CR)` bo'lib qoladi.
- Tashqi provayder chaqiruvi **hech qachon** DB tranzaksiyasiga bog'lanmaydi → outbox.

## Intervyu savollari

**1. ACID nima? Qaysi harf sizga eng muhim?**

> To'rttasini qisqa aytib, keyin kontekstga bog'layman:
>
> "Fintech'da men uchun eng ko'p muammo tug'diradigani — **Isolation**. Qolgan uchtasi
> DB tomonidan deyarli avtomatik ta'minlanadi, Isolation esa **darajaga bog'liq**, va
> standart daraja (Read Committed) lost update'ni to'smaydi. Ya'ni bu — ilova dasturchisi
> qaror qabul qilishi kerak bo'lgan yagona harf."

**2. `COMMIT` bosilganda aniq nima sodir bo'ladi?**

> O'zgarish WAL'ga yoziladi va `fsync` qilinadi — commit shu payt tugaydi. Ma'lumot
> fayllari keyinroq, checkpoint paytida yangilanadi.
>
> Sabab: WAL'ga yozish ketma-ket va tez, ma'lumot fayliga yozish tasodifiy va sekin.
> Crash bo'lsa DB WAL'dan tiklanadi.

**3. Tranzaksiya ichida tashqi API chaqirsa bo'ladimi?**

> Yo'q, ikki sababga ko'ra. Qulflar tashqi tizim tezligiga bog'lanadi va throughput
> qulaydi. Va DB rollback tashqi ta'sirni **qaytara olmaydi** — pul allaqachon ketgan
> bo'lishi mumkin.
>
> Yechim — outbox: tranzaksiyada faqat niyat yoziladi.

**4. `ROLLBACK` qilingan tranzaksiya WAL'ga yozilganmi?**

> Ha. WAL bajarilgan o'zgarishlarni yozadi, keyin rollback uchun kompensatsiya yozuvi
> qo'shiladi. Shuning uchun uzoq davom etib bekor qilingan tranzaksiya ham WAL hajmini
> o'stiradi.

## Deliverable

```csharp
[Fact]
public async Task Transfer_WhenSecondUpdateFails_RollsBackFirst()
{
    var (from, to) = await SeedAccounts(from: 100_000, to: 0);

    await Assert.ThrowsAsync<DbUpdateException>(async () => {
        using var tx = await db.Database.BeginTransactionAsync();
        await Withdraw(from, 80_000);
        await Deposit(to, -1);                    // CHECK constraint buziladi
        await tx.CommitAsync();
    });

    Assert.Equal(100_000, await GetBalance(from));  // o'zgarmagan bo'lishi SHART
    Assert.Equal(0,       await GetBalance(to));
}
```

## Xotira kartasi

```
ACID       A=hammasi/hech biri · C=constraint · I=parallel · D=yo'qolmaydi
Isolation  yagona harf — dasturchi qaror qabul qiladi
WAL        avval logga, keyin ma'lumotga · commit = fsync(WAL)
Tezlik     WAL ketma-ket, data fayl tasodifiy
Qulf       BEGIN'dan COMMIT'gacha ushlanadi
Qoida      tranzaksiya = millisekundlar · tashqi chaqiruv YO'Q
```

---

# 5.2 · Isolation levels va to'rt anomaliya

## Nima va nega

Bir vaqtda o'nlab tranzaksiya ishlaydi. Ular bir-birini **qanchalik ko'rishi** kerak?

Javob narx bilan keladi: to'liq izolyatsiya = to'liq to'g'rilik, lekin sekin.
Isolation level — **to'g'rilik va tezlik orasidagi sozlanadigan tugma**.

## To'rt anomaliya

**Dirty read** — commit qilinmagan ma'lumotni o'qish.

```
   vaqt    T1                        T2
   ────────────────────────────────────────────────────────
   t1      UPDATE balance = 20000
   t2                                SELECT balance → 20000   ← commit yo'q!
   t3      ROLLBACK
                                     T2 mavjud bo'lmagan qiymatni ko'rdi
```

**Non-repeatable read** — bir qatorni ikki marta o'qib, har xil qiymat olish.

```
   t1      SELECT balance → 100000
   t2                                UPDATE balance = 50000; COMMIT
   t3      SELECT balance → 50000    ← bitta tranzaksiya ichida boshqacha
```

**Phantom read** — bir shart bo'yicha ikki marta o'qib, **yangi qatorlar** ko'rish.

```
   t1      SELECT count(*)
           WHERE amount > 1000 → 5
   t2                                INSERT amount = 5000; COMMIT
   t3      SELECT count(*)
           WHERE amount > 1000 → 6   ← qator "paydo bo'ldi"
```

**Lost update** — 5.3 da alohida, chunki fintech'da eng xavflisi shu.

## Matritsa

```
   Daraja               dirty   non-rep   phantom   lost upd
   ──────────────────────────────────────────────────────────
   Read Uncommitted      BOR      BOR       BOR       BOR
   Read Committed        yo'q     BOR       BOR       BOR      ← DEFAULT
   Repeatable Read       yo'q     yo'q      BOR *     yo'q
   Snapshot              yo'q     yo'q      yo'q      write skew
   Serializable          yo'q     yo'q      yo'q      yo'q
```

`*` — **PostgreSQL'da bu qator boshqacha.** PostgreSQL'ning Repeatable Read'i aslida
Snapshot Isolation va phantomni ham to'sadi — standart talab qilganidan **kuchliroq**.

Aynan shu nomuvofiqlik 1995-yilgi *A Critique of ANSI SQL Isolation Levels* maqolasining
mavzusi: standart darajalarni anomaliyalar orqali ta'riflagan, lekin ta'riflar noaniq
bo'lib chiqqan va real implementatsiyalarga to'g'ri kelmagan.

## Write skew — Snapshot'ning teshigi

Ikki tranzaksiya **har xil qatorlarni** o'zgartiradi — konflikt yo'q, lekin birgalikda
invariant buziladi.

```
   Qoida: kamida bitta shifokor navbatchilikda qolsin. Hozir: Ali va Vali.

   vaqt    T1 (Ali chiqmoqchi)       T2 (Vali chiqmoqchi)
   ───────────────────────────────────────────────────────────
   t1      SELECT count(*) → 2
           "Vali bor, chiqsam bo'ladi"
   t2                                SELECT count(*) → 2
                                     "Ali bor, chiqsam bo'ladi"
   t3      UPDATE Ali  = off_duty
   t4                                UPDATE Vali = off_duty
   t5      COMMIT                    COMMIT
   ───────────────────────────────────────────────────────────
   Natija: HECH KIM QOLMADI. Ikkalasi ham "o'z snapshot'ida to'g'ri" edi.
```

**Fintech varianti:** umumiy kunlik limit 1 000 000. Ikki parallel to'lov, har biri
600 000. Ikkalasi ham snapshot'da "hozircha 0 sarflangan" deb ko'radi → jami 1 200 000.

**Yechim:** `SERIALIZABLE`, yoki invariantni ifodalovchi qatorni ataylab qulflash
(materializing the conflict) — limit yozuvini `FOR UPDATE` bilan olish.

## Kod

```sql
-- Bitta tranzaksiya uchun
BEGIN ISOLATION LEVEL SERIALIZABLE;
  -- ...
COMMIT;
```

```csharp
using var tx = await db.Database
    .BeginTransactionAsync(IsolationLevel.Serializable);

try {
    await DoWorkAsync();
    await tx.CommitAsync();
}
catch (PostgresException ex) when (ex.SqlState == "40001") {
    // serialization_failure — SERIALIZABLE'da bu NORMAL holat.
    // Ilova qayta urinishi KERAK, aks holda foydalanuvchi tasodifiy xato ko'radi.
    await tx.RollbackAsync();
    // retry with backoff + jitter
}
```

## Tipik xatolar

| Xato | Nega yomon |
|---|---|
| "Tranzaksiyaga o'radim, endi xavfsiz" | Read Committed lost update'ni to'smaydi |
| Butun ilovani `SERIALIZABLE` qilish | Throughput qulaydi, retry logikasi esa yozilmagan |
| `40001` ni oddiy xato deb log qilish | Bu kutilgan holat, retry kerak |
| PostgreSQL va SQL Server'ni bir xil deb bilish | Repeatable Read xatti-harakati har xil |
| Snapshot'da write skew'ni hisobga olmaslik | Limit va invariant tekshiruvlari buziladi |

## Fintech konteksti

- Standart darajani qoldirib **aniq qulf** ishlatish — amalda eng bashorat qilinadigan
  yondashuv.
- `SERIALIZABLE` ni butun ilovaga emas, **kritik oqimga** (limit tekshiruvi, kun yopilishi)
  qo'llash mumkin.
- Read replica'dan o'qiyotgan hisobot replication lag tufayli eskirgan bo'lishi mumkin —
  bu isolation emas, lekin bir xil ko'rinadi va chalkashtiradi.

## Intervyu savollari

**1. Read Committed'da qanday anomaliyalar qoladi?**

> Dirty read to'siladi. Qoladi: non-repeatable read, phantom va **lost update**.
>
> Amalda eng xavflisi lost update, chunki u xato qaytarmaydi. Shuning uchun balans bilan
> ishlashda men darajaga tayanmayman — aniq qulf yoki atomik `UPDATE` ishlataman.

**2. Serializable hammasini hal qilsa, nega uni doim ishlatmaymiz?**

> Narxi bor va u ikki DB'da har xil ko'rinadi. PostgreSQL'da SSI konfliktda tranzaksiyani
> bekor qiladi — ilova `40001` ni ushlab retry qilishi shart. SQL Server'da range lock'lar
> qo'yiladi, parallellik tushadi va deadlock ko'payadi.
>
> Ya'ni Serializable "bepul to'g'rilik" emas — u murakkablikni ilovaga ko'chiradi.

**3. PostgreSQL'da Repeatable Read phantomni to'sadimi?**

> Ha, va bu standartdan kuchliroq — u aslida Snapshot Isolation. Tranzaksiya boshida
> olingan snapshot bilan ishlaydi, shuning uchun yangi qatorlar ko'rinmaydi.
>
> Lekin write skew qoladi.

**4. Write skew nima? Misol keltiring.**

> Ikki tranzaksiya har xil qatorlarni o'zgartiradi, alohida-alohida to'g'ri, birgalikda
> biznes qoidasini buzadi.
>
> Fintech misoli: umumiy limit 1 000 000, ikki parallel to'lov har biri 600 000 — ikkalasi
> ham "limit yetarli" deb ko'radi.
>
> Yechim: `SERIALIZABLE`, yoki limit yozuvini `FOR UPDATE` bilan qulflash.

## Deliverable

```csharp
[Theory]
[InlineData(IsolationLevel.ReadCommitted,  true)]    // phantom BOR
[InlineData(IsolationLevel.RepeatableRead, false)]   // Postgres'da YO'Q
public async Task PhantomRead_DependsOnIsolationLevel(
    IsolationLevel level, bool phantomExpected)
{
    using var tx = await db.Database.BeginTransactionAsync(level);
    var first = await CountPaymentsOver(1000);

    await InsertPaymentFromAnotherConnection(5000);   // alohida ulanish

    var second = await CountPaymentsOver(1000);
    Assert.Equal(phantomExpected, second > first);
}
```

## Xotira kartasi

```
Anomaliyalar  dirty · non-repeatable · phantom · lost update
Default       Read Committed → faqat dirty read to'siladi
Postgres RR   aslida Snapshot — phantomni ham to'sadi
Write skew    har xil qator, birgalikda invariant buziladi
Serializable  bepul emas → 40001 retry MAJBURIY
Amaliy        standart daraja + aniq qulf
```

---

# 5.3 · Lost update ⭐

## Nima va nega

Fintech'dagi eng klassik xato va intervyuda **eng ko'p beriladigan savol**.

Ikki tranzaksiya bir xil qiymatni o'qiydi, ikkalasi ham o'z hisobiga ko'ra yozadi.
Ikkinchisi birinchisining ishini ustidan bosib o'tadi.

**Eng xavfli tomoni: hech qanday xato qaytmaydi.** Log toza, monitoring jim, natija
noto'g'ri.

## Chizma

```
   Balans = 100 000. Ikki parallel so'rov, har biri 80 000 yechmoqchi.

   vaqt    Tranzaksiya A                Tranzaksiya B
   ─────────────────────────────────────────────────────────────
   t1      SELECT balance → 100 000
   t2                                   SELECT balance → 100 000
   t3      hisoblaydi: 100000 − 80000
   t4                                   hisoblaydi: 100000 − 80000
   t5      UPDATE balance = 20 000
   t6      COMMIT              ✓
   t7                                   UPDATE balance = 20 000
   t8                                   COMMIT            ✗
   ─────────────────────────────────────────────────────────────
   YAKUNIY BALANS :  20 000
   YECHILGAN PUL  : 160 000
   YO'QOTISH      :  80 000 so'm yo'qdan bor bo'ldi
```

> Bu **Read Committed**da — PostgreSQL va SQL Server'ning **standart** rejimida — sodir
> bo'ladi. "Tranzaksiyaga o'rab qo'ydim" degan javob buni yechmaydi.

## Yechim 1 — atomik UPDATE (eng arzon)

O'qish va yozishni bitta amalga birlashtirish. DB qatorni `UPDATE` paytida o'zi qulflaydi,
orasiga hech kim kira olmaydi.

```sql
UPDATE accounts
SET    balance = balance - 80000
WHERE  id = 42
  AND  balance >= 80000;          -- shart SQL ICHIDA

-- Ta'sirlangan qatorlar:  1 → muvaffaqiyatli
--                         0 → mablag' yetmadi (yoki hisob yo'q)
```

```csharp
var affected = await db.Database.ExecuteSqlInterpolatedAsync($@"
    UPDATE accounts
    SET    balance = balance - {amount}
    WHERE  id = {accountId} AND balance >= {amount}");

if (affected == 0)
    return Result.Fail("Mablag' yetarli emas");
```

| Plus | Minus |
|---|---|
| Eng tez — bitta so'rov, qulf minimal | Faqat oddiy arifmetikada ishlaydi |
| Race condition tuzilishi bo'yicha mumkin emas | Oraliqda murakkab mantiq bo'lsa yaramaydi |
| Retry kerak emas | Bir nechta jadval o'zgarsa yetmaydi |

## Yechim 2 — pessimistic lock

```sql
BEGIN;
  SELECT balance FROM accounts WHERE id = 42 FOR UPDATE;
  -- ⚠ qator QULFLANDI. B shu yerda kutadi.

  -- ... murakkab mantiq: limit, komissiya, kurs ...

  UPDATE accounts SET balance = @new WHERE id = 42;
COMMIT;                        -- qulf bo'shadi, B davom etadi
```

```
   Pessimistic bilan bir xil ssenariy:

   t1   A: SELECT ... FOR UPDATE → 100 000     [qulf A da]
   t2   B: SELECT ... FOR UPDATE → ⏳ KUTADI
   t3   A: UPDATE → 20 000
   t4   A: COMMIT                              [qulf bo'shadi]
   t5   B: uyg'ondi → 20 000 ni o'qidi
   t6   B: 20 000 < 80 000 → RAD ETILDI    ✓ to'g'ri natija
```

## Yechim 3 — optimistic lock

Qulf yo'q. Yozish paytida "men o'qigan versiya hali o'zgarmaganmi?" deb tekshiriladi.

```sql
UPDATE accounts
SET    balance = @newBalance,
       version = version + 1
WHERE  id = @id
  AND  version = @versionIRead;   -- men o'qigan versiya

-- 0 qator → boshqa birov o'zgartirgan → qayta o'qib, qayta urinish
```

```csharp
public class Account
{
    public Guid Id { get; set; }
    public decimal Balance { get; set; }
    [Timestamp] public byte[] Version { get; set; }    // SQL Server: rowversion
}

// PostgreSQL:
modelBuilder.Entity<Account>().UseXminAsConcurrencyToken();

for (int attempt = 0; attempt < 3; attempt++)
{
    var acc = await db.Accounts.FindAsync(id);
    if (acc.Balance < amount) return Result.Fail("Mablag' yetarli emas");
    acc.Balance -= amount;

    try {
        await db.SaveChangesAsync();
        return Result.Ok();
    }
    catch (DbUpdateConcurrencyException) {
        db.ChangeTracker.Clear();
        await Task.Delay(Random.Shared.Next(10, 50));   // jitter
    }
}
return Result.Fail("Konflikt — keyinroq urinib ko'ring");
```

## Solishtirma jadval

| | Atomik UPDATE | Pessimistic | Optimistic |
|---|---|---|---|
| **Mexanizm** | DB ichida bitta amal | Qator o'qishda qulflanadi | Versiya yozishda tekshiriladi |
| **Qulf muddati** | Mikrosekundlar | Tranzaksiya oxirigacha | Yo'q |
| **Konflikt narxi** | Yo'q | Kutish | Butun operatsiya qayta |
| **Deadlock xavfi** | Juda past | Bor | Yo'q |
| **Murakkab mantiq** | Yaramaydi | Mos | Mos |
| **Konflikt tez-tez** | ✅ | ✅ | ❌ cheksiz retry |
| **Konflikt kam** | ✅ | ⚠ ortiqcha qulf | ✅ |
| **Fintech balans** | ✅ tavsiya | ✅ tavsiya | ⚠ retry idempotent bo'lsa |

## Tipik xatolar

| Xato | Natija |
|---|---|
| `SELECT` → C#da hisoblash → `UPDATE` | Klassik lost update |
| `FOR UPDATE` siz `SELECT`, keyin `UPDATE` | Qulf yo'q, foyda yo'q |
| Optimistic retry'ni idempotent qilmaslik | Retry ikkinchi marta pul yechadi |
| Cheksiz retry | Konflikt ko'p bo'lsa tizim qotadi |
| Balansni ilovada keshlash | Kesh eskirgan → tekshiruv ma'nosiz |

> **Eng xavfli kombinatsiya:** optimistic lock + idempotent bo'lmagan retry. Muammoni
> yechish o'rniga kuchaytirasiz.

## Fintech konteksti

Balans yechishda odatiy tanlov — **atomik UPDATE** yoki **pessimistic**:

1. Issiq hisobda (kassa, merchant) konflikt tez-tez → optimistic retry sikliga tushadi.
2. Pulda "qayta urinamiz" xavfliroq — retry idempotent bo'lmasa ikki marta yechadi.
3. Rad javobi darhol va aniq bo'lishi kerak.

Optimistic esa profil, sozlamalar, hujjat tahriri kabi kam konfliktli joylarda to'g'ri.

## Intervyu savollari

**1. Ikki kishi bir vaqtda bitta hisobdan pul yechsa nima bo'ladi?** ⭐

> **1) Muammoni nomlayman.** Bu lost update. U Read Committed'da — PostgreSQL va
> SQL Server'ning standart rejimida — bemalol sodir bo'ladi, chunki ikkala tranzaksiya
> ham eski qiymatni o'qigan. Xato qaytmaydi, natija jimgina noto'g'ri.
>
> **2) Uchta yechimni narxi bilan beraman.** Atomik `UPDATE ... WHERE balance >= @amt` —
> eng arzon. `SELECT ... FOR UPDATE` — oraliqda murakkab mantiq bo'lsa. Optimistic
> `rowversion` — konflikt kam bo'lsa.
>
> **3) Tanlovni asoslayman.** Balans uchun atomik `UPDATE` yoki pessimistic tanlayman:
> issiq hisobda konflikt tez-tez, va pulda retry xavfli.

**2. Optimistic va pessimistic — qaysi birini qachon?**

> Qaror **konflikt ehtimoliga** qarab qilinadi, sevimli usulga qarab emas.
>
> Konflikt tez-tez → pessimistic (optimistic bu yerda cheksiz retry beradi).
> Konflikt kam → optimistic (pessimistic bu yerda bekorga qulf ushlaydi).
>
> Javobning qiymati tanlovda emas — **nega** shuni tanlaganingizni ayta olishda.

**3. `UPDATE balance = balance - 100` o'zi xavfsizmi?**

> Ha, **bitta qator** kontekstida — DB `UPDATE` paytida qatorni qulflaydi va o'qish-yozishni
> atomik bajaradi.
>
> Lekin agar oldin `SELECT` qilib, C#da qaror qabul qilib, keyin shu `UPDATE` ni yozsangiz —
> qaror eski ma'lumotga asoslangan bo'ladi. Shuning uchun shart ham SQL ichida bo'lishi
> kerak: `AND balance >= @amt`.

**4. Optimistic lock'da retry'ni necha marta qilasiz?**

> Cheklangan son — odatda 3 marta, jitter bilan. Cheksiz retry konflikt ko'p bo'lganda
> tizimni qotiradi.
>
> Eng muhimi: retry qilinadigan operatsiya **idempotent** bo'lishi shart.
>
> 3 marta ham o'tmasa — bu signal: bu joyda optimistic noto'g'ri tanlov, pessimistic'ga
> o'tish kerak.

## Deliverable ⭐

Bu — **eng kuchli artefakt**. "Kodingiz to'g'riligini qanday kafolatlaysiz?" savoliga
javob sifatida aynan shuni ko'rsatish mumkin.

```csharp
// database/tests/LostUpdateTests.cs
public class LostUpdateTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _pg =
        new PostgreSqlBuilder().WithImage("postgres:16").Build();

    public Task InitializeAsync() => _pg.StartAsync();
    public Task DisposeAsync()    => _pg.DisposeAsync().AsTask();

    [Fact]
    public async Task NaiveReadThenWrite_LosesUpdate()
    {
        var id = await SeedAccount(balance: 100_000);

        var t1 = Task.Run(() => WithdrawNaive(id, 80_000));
        var t2 = Task.Run(() => WithdrawNaive(id, 80_000));
        await Task.WhenAll(t1, t2);

        Assert.Equal(20_000, await GetBalance(id));      // balans 20 000 ko'rinadi...
        Assert.Equal(160_000, t1.Result + t2.Result);    // ...lekin 160 000 yechilgan
        // ⚠ BU TEST BUGNI ISBOTLAYDI — u ataylab yashil
    }

    [Fact]
    public async Task AtomicUpdate_RejectsSecondWithdrawal()
    {
        var id = await SeedAccount(balance: 100_000);

        var results = await Task.WhenAll(
            Task.Run(() => WithdrawAtomic(id, 80_000)),
            Task.Run(() => WithdrawAtomic(id, 80_000)));

        Assert.Equal(1, results.Count(r => r.IsSuccess));    // aynan bittasi
        Assert.Equal(20_000, await GetBalance(id));
    }

    [Fact] public async Task PessimisticLock_RejectsSecondWithdrawal()  { /* FOR UPDATE */ }
    [Fact] public async Task OptimisticLock_ThrowsConcurrencyException() { /* rowversion */ }
}
```

## Xotira kartasi

```
Lost update   ikki tranzaksiya bir qiymatni o'qib, ikkalasi yozadi
Xavfi         XATO QAYTMAYDI — natija jimgina noto'g'ri
Qayerda       Read Committed = DEFAULT → himoya yo'q
Yechim 1      UPDATE bal = bal - @a WHERE bal >= @a    (eng arzon)
Yechim 2      SELECT ... FOR UPDATE                    (murakkab mantiq)
Yechim 3      rowversion + retry                       (konflikt kam)
Tanlov        konflikt ehtimoli hal qiladi
Fintech       balans → atomik yoki pessimistic
Shart         optimistic retry → operatsiya IDEMPOTENT bo'lsin
```

---

# 5.4 · Pessimistic locking

## Nima va nega

"Konflikt **bo'ladi** deb hisoblayman, shuning uchun oldindan qulflab qo'yaman."

Pessimistic locking — ma'lumotni **o'qish paytidayoq** band qilish. Boshqalar kutadi.
Bu eng bashorat qilinadigan usul: konflikt bo'lsa, u kutishga aylanadi, xatoga emas.

## Qulf turlari

```
   Qulf darajasi (yuqoridan pastga — qimmatlashadi):

   Row lock       bitta qator          ← eng ko'p ishlatiladigan
   Page lock      sahifa (SQL Server)
   Table lock     butun jadval         ← DDL, VACUUM FULL
```

PostgreSQL'da row lock rejimlari:

| Rejim | Nima to'sadi | Qachon |
|---|---|---|
| `FOR UPDATE` | Boshqa `FOR UPDATE`, `UPDATE`, `DELETE` | O'zgartirmoqchiman |
| `FOR NO KEY UPDATE` | Zaifroq — FK tekshiruviga xalaqit bermaydi | Kalit bo'lmagan ustunlarni o'zgartirish |
| `FOR SHARE` | Yozishni to'sadi, o'qishga ruxsat | O'qidim, hech kim o'zgartirmasin |
| `FOR KEY SHARE` | Eng zaif — faqat kalit o'zgarishini to'sadi | FK referens |

> **Muhim:** `SELECT` (qulfsiz) hech qachon kutmaydi. MVCC tufayli u eski snapshot'ni
> o'qiydi. Ya'ni `FOR UPDATE` qo'ymasangiz — hech qanday himoya yo'q.

## Kod

```sql
BEGIN;
  SELECT balance FROM accounts WHERE id = 42 FOR UPDATE;
  -- boshqa FOR UPDATE shu yerda kutadi

  UPDATE accounts SET balance = balance - 80000 WHERE id = 42;
COMMIT;
```

**`NOWAIT` — kutmaslik:**

```sql
SELECT * FROM accounts WHERE id = 42 FOR UPDATE NOWAIT;
-- band bo'lsa DARHOL xato: 55P03 lock_not_available
-- Foydali: foydalanuvchiga "hozir band, keyinroq urining" deyish
```

**`SKIP LOCKED` — navbat uchun oltin qoida:**

```sql
-- Outbox / job queue: bir nechta worker bir vaqtda ishlaydi,
-- har biri BOSHQA qatorlarni oladi va hech kim kutmaydi
SELECT id, payload
FROM   outbox
WHERE  published_at IS NULL
ORDER  BY created_at
LIMIT  100
FOR UPDATE SKIP LOCKED;
```

```
   SKIP LOCKED yo'q                    SKIP LOCKED bor
   ────────────────────────           ────────────────────────
   W1: qator 1..100 oldi              W1: qator 1..100 oldi
   W2: ⏳ KUTADI                       W2: qator 101..200 oldi
   W3: ⏳ KUTADI                       W3: qator 201..300 oldi
   → ketma-ket, foyda yo'q            → haqiqiy parallellik
```

**C# tomonida:**

```csharp
// EF Core'da FOR UPDATE uchun raw SQL kerak
var account = await db.Accounts
    .FromSqlInterpolated($"SELECT * FROM accounts WHERE id = {id} FOR UPDATE")
    .FirstAsync();

account.Balance -= amount;
await db.SaveChangesAsync();      // hali o'sha tranzaksiya ichida
await tx.CommitAsync();           // qulf shu yerda bo'shaydi
```

**Timeout qo'yish — majburiy:**

```sql
SET LOCAL lock_timeout = '3s';     -- 3 soniyadan ortiq kutmaslik
-- SQL Server: SET LOCK_TIMEOUT 3000;
```

Timeoutsiz qulf kutishi cheksiz bo'lishi mumkin — bu tizimni jimgina qotiradi.

## Tipik xatolar

| Xato | Natija |
|---|---|
| `FOR UPDATE` ni tranzaksiyasiz yozish | Qulf darhol bo'shaydi, foyda yo'q |
| Qulflarni har xil tartibda olish | Deadlock (5.6) |
| Uzoq tranzaksiyada qulf ushlash | Boshqalar kutadi, throughput qulaydi |
| `lock_timeout` qo'ymaslik | Cheksiz kutish, jimgina qotish |
| Job queue'da `SKIP LOCKED` ishlatmaslik | Worker'lar bir-birini kutadi, parallellik yo'qoladi |
| Indekssiz `UPDATE ... WHERE` | Seq scan → **ortiqcha qatorlar** qulflanadi |

> Oxirgisi ko'pincha e'tibordan chetda qoladi: indeks bo'lmasa PostgreSQL butun jadvalni
> skanerlaydi va yo'l-yo'lakay ko'p qatorni qulflaydi.

## Fintech konteksti

- **Balans yechish** — pessimistic uchun klassik holat: konflikt tez-tez, rad javobi
  aniq bo'lishi kerak.
- **Outbox relay** — `FOR UPDATE SKIP LOCKED` bilan bir nechta instance parallel ishlaydi.
- **Ikki hisob o'rtasida o'tkazma** — qulflarni `ORDER BY id` bilan olish shart (5.6).
- **Kun yopilishi / reconciliation** — bu yerda kengroq qulf oqlanadi.

## Intervyu savollari

**1. `SELECT ... FOR UPDATE` aynan nima qiladi?**

> Tanlangan qatorlarga eksklyuziv qulf qo'yadi va u **tranzaksiya oxirigacha** ushlanadi.
> Boshqa tranzaksiya shu qatorni `FOR UPDATE` bilan o'qimoqchi bo'lsa yoki o'zgartirmoqchi
> bo'lsa — kutadi.
>
> Muhim nuans: oddiy `SELECT` **kutmaydi** — MVCC tufayli u eski snapshot'ni o'qiydi.
> Ya'ni qulf faqat yozuvchilarni to'sadi.

**2. `SKIP LOCKED` nima uchun kerak?**

> Job queue va outbox uchun. Bir nechta worker bir vaqtda ishlaganda, `SKIP LOCKED`
> bo'lmasa ular bir-birini kutadi va parallellik yo'qoladi.
>
> `SKIP LOCKED` bilan har worker band bo'lmagan qatorlarni oladi — haqiqiy parallel
> ishlov beriladi.

**3. Pessimistic lock throughput'ni qanchalik tushiradi?**

> Bu **konflikt darajasiga** bog'liq. Konflikt kam bo'lsa — deyarli ta'sir qilmaydi, chunki
> qulf hech kimni kutdirmaydi. Konflikt ko'p bo'lsa — operatsiyalar ketma-ketlashadi.
>
> Shuning uchun issiq qatorni (masalan bitta merchant hisobi) qulflash butun tizimni
> sekinlashtiradi. Yechim — yozuvlarni append qilish va balansni keyin agregatsiya
> qilish, ya'ni qulfni umuman olib tashlash.

**4. Qulf qachon bo'shaydi?**

> `COMMIT` yoki `ROLLBACK` paytida. Oraliqda bo'shatib bo'lmaydi — `SAVEPOINT` ga
> qaytish faqat o'sha savepoint'dan keyin olingan qulflarni bo'shatadi.
>
> Bundan kelib chiqadigan qoida: tranzaksiya qancha uzoq bo'lsa, qulf shuncha uzoq turadi.

## Deliverable

```csharp
[Fact]
public async Task ForUpdate_SecondTransactionWaits()
{
    var id = await SeedAccount(balance: 100_000);

    using var tx1 = await db1.Database.BeginTransactionAsync();
    await LockRow(db1, id);                       // FOR UPDATE

    var sw = Stopwatch.StartNew();
    var blocked = Task.Run(async () => {
        using var tx2 = await db2.Database.BeginTransactionAsync();
        await LockRow(db2, id);                   // kutishi SHART
        return sw.ElapsedMilliseconds;
    });

    await Task.Delay(500);
    await tx1.CommitAsync();                      // qulf bo'shadi

    Assert.True(await blocked >= 500);            // haqiqatan kutgan
}

[Fact]
public async Task SkipLocked_WorkersTakeDifferentRows()
{
    await SeedOutbox(count: 300);

    var batches = await Task.WhenAll(
        Task.Run(() => ClaimBatch(size: 100)),
        Task.Run(() => ClaimBatch(size: 100)),
        Task.Run(() => ClaimBatch(size: 100)));

    var all = batches.SelectMany(b => b).ToList();
    Assert.Equal(300, all.Count);
    Assert.Equal(300, all.Distinct().Count());    // kesishish YO'Q
}
```

## Xotira kartasi

```
Pessimistic   "konflikt bo'ladi" → oldindan qulflayman
FOR UPDATE    eksklyuziv, tranzaksiya oxirigacha
FOR SHARE     o'qishga ruxsat, yozishni to'sadi
NOWAIT        band bo'lsa darhol xato (55P03)
SKIP LOCKED   band qatorlarni o'tkazib yuboradi → job queue uchun
Oddiy SELECT  KUTMAYDI (MVCC) → qulfsiz himoya yo'q
Majburiy      lock_timeout qo'yish
Tuzoq         indekssiz UPDATE → ortiqcha qatorlar qulflanadi
```

---

# 5.5 · Optimistic locking

## Nima va nega

"Konflikt **bo'lmaydi** deb hisoblayman. Bo'lsa — o'shanda hal qilaman."

Qulf umuman qo'yilmaydi. Yozish paytida "men o'qigan versiya hali o'zgarmaganmi?" deb
tekshiriladi. O'zgargan bo'lsa — operatsiya bekor qilinadi va qayta boshlanadi.

**Asosiy farq:** pessimistic konfliktni **kutishga**, optimistic esa **qayta ishlashga**
aylantiradi.

## Ichki mexanika

```
   Versiya ustuni bilan:

   vaqt    A                                B
   ──────────────────────────────────────────────────────────────
   t1      SELECT bal=100000, ver=7
   t2                                       SELECT bal=100000, ver=7
   t3      UPDATE ... SET ver=8
           WHERE id=42 AND ver=7
           → 1 qator                ✓
   t4                                       UPDATE ... SET ver=8
                                            WHERE id=42 AND ver=7
                                            → 0 QATOR              ✗
   ──────────────────────────────────────────────────────────────
   B "hech nima o'zgarmadi" degan signalni oladi va qayta uradi.
   Pul YO'QOLMADI — chunki 0 qator = konflikt aniqlandi.
```

Versiya sifatida nima ishlatiladi:

| DB | Mexanizm | Izoh |
|---|---|---|
| SQL Server | `rowversion` / `timestamp` | Avtomatik o'sadi, 8 bayt |
| PostgreSQL | `xmin` tizim ustuni | Qo'shimcha ustun kerak emas |
| Universal | `int version` qo'lda | Har `UPDATE` da `+1` |
| HTTP | `ETag` + `If-Match` | Xuddi shu g'oya API darajasida |

## Kod

```csharp
// SQL Server
public class Account
{
    public Guid Id { get; set; }
    public decimal Balance { get; set; }
    [Timestamp] public byte[] Version { get; set; }
}

// PostgreSQL — qo'shimcha ustunsiz
modelBuilder.Entity<Account>().UseXminAsConcurrencyToken();

// Qo'lda — har DB'da ishlaydi
modelBuilder.Entity<Account>()
    .Property(a => a.Version)
    .IsConcurrencyToken();
```

**To'g'ri retry sikli:**

```csharp
public async Task<Result> WithdrawAsync(Guid id, decimal amount)
{
    const int maxAttempts = 3;

    for (int attempt = 1; attempt <= maxAttempts; attempt++)
    {
        var acc = await db.Accounts.FindAsync(id);

        if (acc.Balance < amount)
            return Result.Fail("Mablag' yetarli emas");    // biznes rad — retry YO'Q

        acc.Balance -= amount;

        try
        {
            await db.SaveChangesAsync();
            return Result.Ok();
        }
        catch (DbUpdateConcurrencyException)
        {
            db.ChangeTracker.Clear();                      // eski holatni tashlash
            if (attempt == maxAttempts) break;
            await Task.Delay(BackoffWithJitter(attempt));  // 10ms, 20ms, 40ms ± jitter
        }
    }

    return Result.Fail("Tizim band — keyinroq urinib ko'ring");
}

static TimeSpan BackoffWithJitter(int attempt) =>
    TimeSpan.FromMilliseconds(
        Math.Pow(2, attempt) * 10 + Random.Shared.Next(0, 25));
```

**HTTP darajasida — bir xil g'oya:**

```http
GET /api/v1/accounts/42
→ 200 OK
  ETag: "7"

PUT /api/v1/accounts/42
  If-Match: "7"
→ 412 Precondition Failed        # boshqa birov o'zgartirgan
```

## Solishtirma jadval

| | Pessimistic | Optimistic |
|---|---|---|
| Falsafa | Konflikt bo'ladi | Konflikt bo'lmaydi |
| Konflikt → | Kutish | Qayta bajarish |
| Qulf | Bor, tranzaksiya oxirigacha | Yo'q |
| Deadlock | Mumkin | Mumkin emas |
| Uzoq operatsiya | Yaramaydi (qulf turadi) | Mos |
| Foydalanuvchi o'ylab turishi | Yaramaydi | Mos (web forma) |
| Konflikt tez-tez | ✅ | ❌ retry sikli |
| Retry shartlari | — | **Idempotent bo'lishi SHART** |

## Tipik xatolar

| Xato | Natija |
|---|---|
| Retry'ni idempotent qilmaslik | Qayta urinish ikkinchi marta pul yechadi |
| `ChangeTracker.Clear()` qilmaslik | EF eski, eskirgan obyektni qayta yuboradi |
| Cheksiz retry | Konflikt ko'p bo'lsa tizim qotadi |
| Biznes rad javobini ham retry qilish | "Mablag' yetmadi" — retry ma'nosiz |
| Jitter'siz backoff | Barcha retry'lar bir vaqtda uriladi (thundering herd) |
| Konflikt tez-tez joyda optimistic ishlatish | Doimiy retry, throughput qulaydi |

> **Diagnostika qoidasi:** agar 3 marta retry ham yetmayotgan bo'lsa — bu optimistic
> noto'g'ri tanlov ekanining signali, retry sonini oshirish emas.

## Fintech konteksti

Optimistic **to'g'ri** joylar:

- Foydalanuvchi profili, sozlamalari, manzillari
- Merchant konfiguratsiyasi
- Hujjat tahriri (foydalanuvchi formada uzoq turadi — pessimistic bu yerda yaramaydi)

Optimistic **xavfli** joylar:

- Issiq hisob balansi (kassa, yirik merchant) — konflikt tez-tez
- Retry idempotent bo'lmagan har qanday pul operatsiyasi

> Fintech'da eng ko'p uchraydigan to'g'ri javob: **balans uchun atomik `UPDATE` yoki
> pessimistic; qolgan hamma joyda optimistic.**

## Intervyu savollari

**1. Optimistic locking qanday ishlaydi?**

> Qulf qo'yilmaydi. Har qatorda versiya ustuni bo'ladi; `UPDATE` shartiga `AND version =
> @versionIRead` qo'shiladi va versiya oshiriladi.
>
> 0 qator ta'sirlangan bo'lsa — demak boshqa birov bizdan oldin yozgan. EF Core buni
> `DbUpdateConcurrencyException` ga aylantiradi.

**2. Konflikt bo'lganda nima qilasiz?**

> Uchta variant bor va tanlov **biznesga** bog'liq:
>
> - **Qayta urinish** — ma'lumotni yangidan o'qib, amalni takrorlash. Faqat operatsiya
>   idempotent bo'lsa.
> - **Foydalanuvchiga qaytarish** — "ma'lumot o'zgardi, yangilang". Forma tahririda to'g'ri.
> - **Birlashtirish (merge)** — turli maydonlar o'zgargan bo'lsa qo'lda birlashtirish.
>
> Pulda men birinchisini tanlayman, lekin faqat idempotentlik ta'minlangan bo'lsa.

**3. PostgreSQL'da `rowversion` yo'q — nima qilasiz?**

> Ikki variant. Birinchi: `xmin` tizim ustunidan foydalanish — EF Core'da
> `UseXminAsConcurrencyToken()`, qo'shimcha ustun kerak emas.
>
> Ikkinchi: oddiy `int version` ustuni va uni har `UPDATE` da qo'lda oshirish. Bu ochiqroq
> va DB'ga bog'liq emas.

**4. Optimistic'da deadlock bo'ladimi?**

> Yo'q — qulf yo'q, demak kutish ham yo'q, demak deadlock mumkin emas. Bu uning asosiy
> afzalligi.
>
> Lekin o'rniga **livelock** xavfi bor: konflikt tez-tez bo'lsa, tranzaksiyalar doimiy
> qayta urinib, hech biri tugamasligi mumkin. Shuning uchun retry soni cheklanadi.

## Deliverable

```csharp
[Fact]
public async Task ConcurrentUpdate_ThrowsConcurrencyException()
{
    var id = await SeedAccount(balance: 100_000);

    var a = await db1.Accounts.FindAsync(id);
    var b = await db2.Accounts.FindAsync(id);     // ikkalasi ham ver=7

    a.Balance -= 30_000;
    await db1.SaveChangesAsync();                 // ✓ ver=8

    b.Balance -= 30_000;
    await Assert.ThrowsAsync<DbUpdateConcurrencyException>(
        () => db2.SaveChangesAsync());            // ✗ ver=7 topilmadi

    Assert.Equal(70_000, await GetBalance(id));   // faqat BITTA yechish o'tdi
}

[Fact]
public async Task RetryLoop_EventuallySucceeds_AndNeverDoubleWithdraws()
{
    var id = await SeedAccount(balance: 100_000);

    var results = await Task.WhenAll(
        Enumerable.Range(0, 5).Select(_ => WithdrawWithRetry(id, 10_000)));

    Assert.Equal(5, results.Count(r => r.IsSuccess));
    Assert.Equal(50_000, await GetBalance(id));   // aynan 5 × 10 000
}
```

## Xotira kartasi

```
Optimistic    "konflikt bo'lmaydi" → qulf yo'q, yozishda tekshiraman
Mexanizm      UPDATE ... WHERE version = @old → 0 qator = konflikt
Versiya       SQL Server: rowversion · Postgres: xmin · qo'lda: int
EF Core       DbUpdateConcurrencyException
Retry         cheklangan (3) + backoff + JITTER + ChangeTracker.Clear()
Shart         operatsiya IDEMPOTENT bo'lsin
Deadlock      mumkin emas · lekin livelock xavfi bor
Fintech       profil/sozlama → ha · issiq balans → yo'q
```

---

# 5.6 · Deadlock

## Nima va nega

Ikki tranzaksiya bir-birining qulfini kutadi. Hech biri davom eta olmaydi — bu
**abadiy kutish**, va DB uni o'zi aniqlab, birini qurbon qiladi.

Deadlock'ni **butunlay yo'q qilib bo'lmaydi**. Uni kamaytirish va to'g'ri qayta urinish —
to'g'ri yondashuv. Intervyuda aynan shu tan olish kutiladi.

## Chizma

```
   T1: "Ali → Vali 50 000"          T2: "Vali → Ali 30 000"

   vaqt    T1                            T2
   ─────────────────────────────────────────────────────────────
   t1      LOCK Ali                ✓
   t2                                    LOCK Vali             ✓
   t3      LOCK Vali  →  ⏳ kutadi
                         (T2 da band)
   t4                                    LOCK Ali  →  ⏳ kutadi
                                                      (T1 da band)
   ─────────────────────────────────────────────────────────────

                    T1 ──kutadi──► Vali(T2)
                    ▲                  │
                    │                  │
                   Ali ◄──kutadi──── T2
                    tsikl → DEADLOCK

   Postgres:  ~1 soniyadan keyin aniqlaydi → birini bekor qiladi
              SQLSTATE 40P01  "deadlock detected"
   SQL Server: Error 1205    "chosen as the deadlock victim"
```

## Yechim 1 — qulf tartibini birxillashtirish

Bu **asosiy** yechim. Barcha tranzaksiyalar resurslarni bir xil tartibda qulflasa,
tsikl hosil bo'lishi **matematik jihatdan mumkin emas**.

```sql
-- ❌ Yo'nalishga bog'liq tartib → A→B va B→A deadlock beradi
SELECT * FROM accounts WHERE id = @from FOR UPDATE;
SELECT * FROM accounts WHERE id = @to   FOR UPDATE;

-- ✅ Har doim bir xil tartib — id o'sishi bo'yicha
SELECT * FROM accounts
WHERE  id IN (@from, @to)
ORDER  BY id
FOR UPDATE;
```

```csharp
// C# tomonida ham aniq tartib
var ids = new[] { fromId, toId }.OrderBy(x => x).ToArray();
var accounts = await db.Accounts
    .FromSqlInterpolated($@"
        SELECT * FROM accounts WHERE id = ANY({ids}) ORDER BY id FOR UPDATE")
    .ToListAsync();
```

## Yechim 2 — retry siyosati

Deadlock **tranzient** xato: qayta urinish odatda muvaffaqiyatli bo'ladi, chunki
raqobatchi tranzaksiya allaqachon tugagan.

```csharp
// PostgreSQL
catch (PostgresException ex) when (ex.SqlState == "40P01")   // deadlock_detected
{
    // retry
}

// SQL Server
catch (SqlException ex) when (ex.Number == 1205)
{
    // retry
}

// EF Core'da avtomatik:
options.UseNpgsql(cs, o => o.EnableRetryOnFailure(
    maxRetryCount: 3,
    maxRetryDelay: TimeSpan.FromSeconds(1),
    errorCodesToAdd: null));
```

> ⚠ `EnableRetryOnFailure` **aniq tranzaksiya** bilan birga ishlamaydi — o'z retry
> siklingizni yozishingiz kerak, va u butun tranzaksiyani boshidan takrorlashi shart.

## Yechim 3 — qulf hajmini kamaytirish

| Chora | Nima beradi |
|---|---|
| Indeks qo'yish | Seq scan → ortiqcha qatorlar qulflanmaydi |
| Tranzaksiyani qisqartirish | Qulf kamroq vaqt ushlanadi → to'qnashuv kamayadi |
| Tashqi chaqiruvni chiqarish | Qulf tashqi tizim tezligiga bog'lanmaydi |
| Bitta `UPDATE` ga birlashtirish | Ikki qulf o'rniga bitta atomik amal |
| `lock_timeout` qo'yish | Cheksiz kutish o'rniga aniq xato |

## Deadlock log'ini o'qish

```
ERROR:  deadlock detected
DETAIL: Process 4521 waits for ShareLock on transaction 8891;
        blocked by process 4530.
        Process 4530 waits for ShareLock on transaction 8890;
        blocked by process 4521.
HINT:   See server log for query details.
```

Nimaga qarash kerak:

1. **Qaysi ikkita so'rov** — server log'ida to'liq matni bo'ladi (`log_lock_waits = on`).
2. **Qaysi tartibda qulf olingan** — bu tartib nomuvofiqligini ko'rsatadi.
3. **Takrorlanish chastotasi** — kuniga bir marta bo'lsa retry yetadi; daqiqada bir
   marta bo'lsa dizayn muammosi.

## Tipik xatolar

| Xato | Natija |
|---|---|
| Qulflarni har xil tartibda olish | Klassik deadlock |
| Deadlock'ni oddiy xato deb log qilish | Foydalanuvchi tasodifiy xato ko'radi |
| Retry'da faqat oxirgi amalni takrorlash | Tranzaksiya bekor qilingan — **hammasi** qayta kerak |
| Indekssiz `UPDATE ... WHERE` | Ko'p qator qulflanadi → to'qnashuv ehtimoli oshadi |
| Cheksiz retry | Deadlock tsikli takrorlanaveradi |
| "Deadlock'ni butunlay yo'q qilaman" | Real emas — kamaytirish va retry to'g'ri javob |

## Fintech konteksti

- **P2P o'tkazma** — deadlock'ning eng ko'p uchraydigan manbai: A→B va B→A bir vaqtda.
  Yechim: `ORDER BY id FOR UPDATE`.
- **Batch job va onlayn so'rov** — kechqurun ishlaydigan hisobot job'i onlayn to'lovlar
  bilan to'qnashadi. Yechim: job'ni kichik batch'larga bo'lish.
- Deadlock takrorlanishi **monitoring metrikasi** bo'lishi kerak — o'sish tendensiyasi
  dizayn muammosini erta ko'rsatadi.

## Intervyu savollari

**1. Deadlock qanday paydo bo'ladi va uni qanday kamaytirasiz?** ⭐

> Ikki tranzaksiya resurslarni **teskari tartibda** qulflaganda: T1 A ni olib B ni kutadi,
> T2 B ni olib A ni kutadi. DB tsiklni aniqlaydi va birini bekor qiladi
> (Postgres `40P01`, SQL Server `1205`).
>
> Choralar, muhimlik tartibida:
> 1. Qulflarni **doim bir xil tartibda** olish — `ORDER BY id`. Bu tsiklni tuzilish
>    bo'yicha imkonsiz qiladi.
> 2. Tranzaksiyani qisqa tutish, ichida tashqi chaqiruv qilmaslik.
> 3. Indeks qo'yish — keraksiz qatorlar qulflanmasin.
> 4. Deadlock kodini **tranzient** deb belgilab, retry qilish.
>
> Va tan olaman: deadlock'ni butunlay yo'q qilib bo'lmaydi — uni kamaytirish va to'g'ri
> qayta urinish to'g'ri yondashuv.

**2. Deadlock bo'lganda retry'da nimani takrorlaysiz?**

> **Butun tranzaksiyani boshidan.** DB uni to'liq bekor qilgan — barcha o'zgarishlar
> yo'qolgan, snapshot ham eskirgan.
>
> Ko'p uchraydigan xato: faqat oxirgi `UPDATE` ni takrorlash. Bu ishlamaydi, chunki
> tranzaksiya allaqachon yo'q.

**3. Deadlock va lock timeout farqi nima?**

> **Deadlock** — tsiklik kutish, DB uni aniqlaydi va **darhol** birini bekor qiladi.
> Bu mantiqiy xato: shu holatda kutish hech qachon tugamaydi.
>
> **Lock timeout** — tsikl yo'q, shunchaki kutish uzoq davom etdi va biz belgilagan chegara
> oshdi. Bu resurs muammosi, mantiqiy emas.
>
> Birinchisi dizaynni ko'rsatadi, ikkinchisi yuk yoki uzoq tranzaksiyani.

**4. Deadlock'ni 100% yo'q qila olasizmi?**

> Bitta resurs turi bilan ishlaganda va qulf tartibi qat'iy bo'lsa — ha, nazariy jihatdan.
>
> Real tizimda esa yo'q: FK tekshiruvlari, indeks yangilanishi, batch job'lar kutilmagan
> tartibda qulf oladi. Shuning uchun retry **har doim** bo'lishi kerak.

## Deliverable

```csharp
[Fact]
public async Task ReverseOrderLocking_CausesDeadlock()
{
    var (a, b) = await SeedAccounts();

    var t1 = Task.Run(() => TransferUnordered(a, b, 50_000));   // A → B
    var t2 = Task.Run(() => TransferUnordered(b, a, 30_000));   // B → A

    var ex = await Record.ExceptionAsync(() => Task.WhenAll(t1, t2));

    Assert.IsType<PostgresException>(ex);
    Assert.Equal("40P01", ((PostgresException)ex).SqlState);
    // ⚠ Bu test muammoni ISBOTLAYDI
}

[Fact]
public async Task OrderedLocking_NeverDeadlocks()
{
    var (a, b) = await SeedAccounts();

    // 50 juft qarama-qarshi o'tkazma
    var tasks = Enumerable.Range(0, 50).SelectMany(_ => new[] {
        Task.Run(() => TransferOrdered(a, b, 1_000)),   // ORDER BY id FOR UPDATE
        Task.Run(() => TransferOrdered(b, a, 1_000))
    });

    await Task.WhenAll(tasks);                    // hech qanday exception YO'Q
    Assert.Equal(initialTotal, await TotalBalance(a, b));   // pul yo'qolmagan
}
```

## Xotira kartasi

```
Deadlock      tsiklik kutish → DB birini qurbon qiladi
Kodlar        Postgres 40P01 · SQL Server 1205
Asosiy sabab  qulflar HAR XIL tartibda olingan
Yechim 1      ORDER BY id FOR UPDATE — tsikl imkonsiz bo'ladi
Yechim 2      retry — BUTUN tranzaksiyani boshidan
Yechim 3      indeks · qisqa tranzaksiya · tashqi chaqiruv yo'q
Timeout≠DL    timeout = uzoq kutish · deadlock = tsikl
Haqiqat       butunlay yo'q qilib bo'lmaydi → retry doim kerak
```

---

# 5.7 · MVCC, snapshot va VACUUM

## Nima va nega

Klassik savol: agar tranzaksiya qatorni o'zgartirayotgan bo'lsa, uni o'qiyotganlar
kutishi kerakmi?

PostgreSQL javobi: **yo'q**. Sabab — MVCC (Multi-Version Concurrency Control):
har o'zgarish qatorning **yangi versiyasini** yaratadi, eskisi esa hali kerak
bo'lganlar uchun qoladi.

> **Asosiy qoida:** o'quvchilar yozuvchilarni bloklamaydi, yozuvchilar o'quvchilarni
> bloklamaydi. Faqat **yozuvchi yozuvchini** bloklaydi.

## Ichki mexanika

Har qatorda yashirin tizim ustunlari bor:

```
   ┌──────────┬────────┬────────┬─────────────────────────┐
   │ ctid     │  xmin  │  xmax  │  ma'lumot               │
   ├──────────┼────────┼────────┼─────────────────────────┤
   │ (0,1)    │  100   │  105   │  balance = 100 000      │  ← eski versiya
   │ (0,2)    │  105   │   0    │  balance =  20 000      │  ← yangi versiya
   └──────────┴────────┴────────┴─────────────────────────┘
                  ▲        ▲
                  │        └── qaysi tranzaksiya O'CHIRGAN (0 = tirik)
                  └─────────── qaysi tranzaksiya YARATGAN
```

**Snapshot** — tranzaksiya boshlanganda olinadigan «kesim»: qaysi tranzaksiyalar
allaqachon commit bo'lgan. Har o'qishda qator versiyasi shu snapshot bilan
solishtiriladi.

```
   Tranzaksiya 103 uchun ko'rinish qoidasi:

   xmin <= 103  VA  xmin commit bo'lgan   →  yaratilgani ko'rinadi
   xmax == 0    YOKI xmax hali commit emas →  o'chirilmagan hisoblanadi
                                  ↓
                        (0,1) KO'RINADI  — balance = 100 000
                        (0,2) ko'rinmaydi (xmin=105 > 103)
```

Shuning uchun `UPDATE` aslida **`DELETE` + `INSERT`**: eski qator `xmax` bilan
belgilanadi, yangi qator qo'shiladi.

## VACUUM — o'lik qatorlarni tozalash

```
   Hech kim ko'rmaydigan versiyalar = DEAD TUPLES

   ┌─────────────────────────────────────────────────────┐
   │  VACUUM        → o'lik joyni QAYTA ISHLATILADIGAN   │
   │                  qiladi, faylni kichraytirmaydi     │
   │                                                      │
   │  VACUUM FULL   → faylni qayta yozadi, joy qaytadi   │
   │                  ⚠ JADVALNI TO'LIQ QULFLAYDI        │
   │                                                      │
   │  ANALYZE       → statistikani yangilaydi (planner)   │
   │                                                      │
   │  autovacuum    → fon rejimida avtomatik              │
   └─────────────────────────────────────────────────────┘
```

```sql
-- O'lik qatorlar nisbatini ko'rish
SELECT relname,
       n_live_tup,
       n_dead_tup,
       round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
       last_autovacuum
FROM   pg_stat_user_tables
ORDER  BY n_dead_tup DESC
LIMIT  10;
```

## Table bloat — qanday paydo bo'ladi

```
   Sabab: UZOQ DAVOM ETGAN TRANZAKSIYA

   T1 (hisobot, 2 soat)         Boshqa tranzaksiyalar
   ────────────────────         ─────────────────────
   BEGIN                        1 mln UPDATE bajarildi
   snapshot olindi              → 1 mln o'lik qator
   ...                          → autovacuum ULARNI TOZALAY OLMAYDI,
   ...                            chunki T1 ularni hali ko'rishi mumkin
   ...
   COMMIT (2 soatdan keyin)     → endi tozalanadi

   Natija: jadval hajmi bir necha barobar o'sadi,
           so'rovlar sekinlashadi, disk to'ladi.
```

```sql
-- Uzoq tranzaksiyalarni topish — bu MONITORING metrikasi bo'lishi kerak
SELECT pid, now() - xact_start AS duration, state, left(query, 60)
FROM   pg_stat_activity
WHERE  xact_start IS NOT NULL
ORDER  BY duration DESC;
```

## Transaction ID wraparound

Tranzaksiya ID 32 bitli — ~4 milliard operatsiyadan keyin «aylanadi». VACUUM eski
qatorlarni «muzlatib» (freeze) bunga yo'l qo'ymaydi.

```
   ⚠ Agar autovacuum uzoq vaqt ishlamasa:
      WARNING: database "x" must be vacuumed within 10000000 transactions
      → keyin DB YOZISHNI TO'XTATADI (faqat o'qish rejimi)

   Bu real production incident turi.
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Uzoq davom etgan tranzaksiya | Bloat, autovacuum bloklanadi |
| `idle in transaction` ulanishlar | Xuddi shu, lekin sekinroq sezilaadi |
| Production'da `VACUUM FULL` | Jadval to'liq qulflanadi |
| `autovacuum` ni o'chirish | Wraparound xavfi, DB yozishni to'xtatadi |
| Katta `UPDATE` ni bitta tranzaksiyada | Bir vaqtning o'zida ko'p o'lik qator |
| `ANALYZE` ni unutish | Planner noto'g'ri qaror qabul qiladi |

## Fintech konteksti

- **Ledger jadvali append-only** — bu MVCC uchun ideal: `UPDATE` yo'q, demak o'lik
  qator ham yo'q, bloat muammosi yo'q.
- **Balans keshi** tez-tez `UPDATE` qilinadi — bu jadvalda `fillfactor` pasaytirilishi
  va autovacuum agressivroq sozlanishi mumkin.
- **Kunlik hisobot** uzoq tranzaksiyada ishlamasin — batch'larga bo'linsin yoki read
  replica'da bajarilsin.

## Intervyu savollari

**1. MVCC nima va nima beradi?**

> Har o'zgarish qatorning **yangi versiyasini** yaratadi, eskisi hali unga muhtoj
> tranzaksiyalar uchun qoladi. Har qatorda `xmin`/`xmax` tizim ustunlari bor va
> tranzaksiya o'z **snapshot**iga ko'ra qaysi versiyani ko'rishini aniqlaydi.
>
> Natija: o'quvchilar yozuvchilarni bloklamaydi, yozuvchilar o'quvchilarni
> bloklamaydi. Faqat yozuvchi yozuvchini bloklaydi.
>
> Narxi — o'lik qatorlar to'planadi va ularni tozalash kerak.

**2. VACUUM nima qiladi va nega kerak?**

> Hech kim ko'rmaydigan qator versiyalarini (dead tuples) tozalab, joyni qayta
> ishlatiladigan qiladi. Bundan tashqari eski tranzaksiya ID'larni «muzlatib»
> wraparound'ning oldini oladi.
>
> `VACUUM` faylni kichraytirmaydi — joyni ichkarida bo'shatadi. `VACUUM FULL`
> kichraytiradi, lekin jadvalni **to'liq qulflaydi**, shuning uchun production'da
> ishlatilmaydi.

**3. Table bloat qanday paydo bo'ladi?**

> Asosiy sabab — **uzoq davom etgan tranzaksiya**. U ochiq turgan ekan, autovacuum
> o'sha davrda yaratilgan o'lik qatorlarni tozalay olmaydi, chunki bu tranzaksiya
> ularni hali ko'rishi mumkin.
>
> Bir necha soatlik hisobot tranzaksiyasi jadval hajmini bir necha barobar
> o'stirishi mumkin.
>
> Shuning uchun `pg_stat_activity` da eng uzoq tranzaksiya davomiyligi — monitoring
> metrikasi bo'lishi kerak.

**4. Wraparound nima?**

> Tranzaksiya ID 32 bitli va ~4 milliarddan keyin aylanadi. VACUUM eski qatorlarni
> freeze qilib bunga yo'l qo'ymaydi.
>
> Agar autovacuum uzoq vaqt ishlamasa, PostgreSQL avval ogohlantiradi, keyin esa
> ma'lumot yo'qolishining oldini olish uchun **yozishni to'xtatadi** — DB faqat
> o'qish rejimiga o'tadi. Bu real production incident turi.

## Deliverable

```sql
-- database/monitoring/mvcc-health.sql
-- 1. Eng ko'p o'lik qatorli jadvallar
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum
FROM   pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;

-- 2. Uzoq tranzaksiyalar — alert manbai
SELECT pid, now() - xact_start AS duration, state, left(query, 80)
FROM   pg_stat_activity WHERE xact_start IS NOT NULL
ORDER  BY duration DESC;

-- 3. Wraparound xavfi
SELECT datname, age(datfrozenxid) AS xid_age
FROM   pg_database ORDER BY xid_age DESC;
```

```csharp
[Fact]
public async Task LongTransaction_PreventsVacuum()
{
    await SeedRows(10_000);

    using var longTx = await db1.Database.BeginTransactionAsync();
    await db1.Payments.FirstAsync();               // snapshot olindi

    await UpdateAllRowsFromAnotherConnection();    // 10 000 o'lik qator
    await RunVacuum();

    var dead = await DeadTupleCount("payments");
    Assert.True(dead > 0);                         // tozalanmadi — longTx ushlab turibdi

    await longTx.CommitAsync();
    await RunVacuum();
    Assert.Equal(0, await DeadTupleCount("payments"));
}
```

## Xotira kartasi

```
MVCC         har o'zgarish YANGI versiya · xmin/xmax tizim ustunlari
Qoida        o'quvchi↔yozuvchi bloklamaydi · faqat yozuvchi↔yozuvchi
UPDATE       aslida DELETE + INSERT
Snapshot     tranzaksiya boshida olinadi → qaysi versiya ko'rinadi
Dead tuples  hech kim ko'rmaydigan versiyalar → VACUUM tozalaydi
VACUUM       joyni qayta ishlatiladigan qiladi (fayl kichraymaydi)
VACUUM FULL  fayl kichrayadi, lekin JADVALNI QULFLAYDI → prod'da yo'q
Bloat sababi UZOQ TRANZAKSIYA → autovacuum tozalay olmaydi
Wraparound   32-bit XID · freeze qilinmasa DB yozishni to'xtatadi
Fintech      append-only ledger → bloat muammosi yo'q
```

---

# 5.8 · Indekslar

## Nima va nega

Indekssiz DB har so'rovda butun jadvalni o'qiydi — 10 million qatorli jadvalda bu
sekundlar. Indeks bu ishni **O(log n)** ga tushiradi.

Lekin indeks bepul emas: har `INSERT`/`UPDATE`/`DELETE` uni ham yangilaydi. Ya'ni
indeks — **o'qishni tezlashtirib, yozishni sekinlashtiradigan savdo**.

## Ichki mexanika — B-tree

```
   B-tree (balanslangan daraxt), 1 mln qator, 3 daraja:

                    ┌───────────────┐
                    │  50 · 100     │   root
                    └───┬───┬───┬───┘
              ┌─────────┘   │   └─────────┐
        ┌─────▼────┐  ┌─────▼────┐  ┌─────▼────┐
        │ 10 · 30  │  │ 60 · 80  │  │ 120·150  │   internal
        └──┬───┬───┘  └──────────┘  └──────────┘
     ┌─────▼┐ ┌▼──────┐
     │ 1..9 │ │ 11..29│  ...                        leaf → qator manzili
     └──────┘ └───────┘

   Qidirish: 3 ta sahifa o'qish, 1 000 000 emas.
```

Leaf'lar bir-biriga bog'langan — shuning uchun `BETWEEN`, `>`, `ORDER BY` ham tez
ishlaydi: bitta joyni topib, keyin ketma-ket o'qiladi.

## Composite indeks — ustunlar tartibi

Bu **eng ko'p so'raladigan indeks savoli**.

```sql
CREATE INDEX ix_payments ON payments (user_id, created_at);
```

```
   Indeks shunday saralangan:

   user_id │ created_at
   ────────┼────────────
      5    │ 2026-01-01     ← user_id bo'yicha guruhlangan,
      5    │ 2026-01-05        ichida created_at bo'yicha saralangan
      5    │ 2026-02-11
      7    │ 2026-01-02
      7    │ 2026-03-30
```

| So'rov | Indeks ishlaydimi | Nega |
|---|---|---|
| `WHERE user_id = 5` | ✅ | Birinchi ustun |
| `WHERE user_id = 5 AND created_at > '...'` | ✅ | To'liq mos |
| `WHERE user_id = 5 ORDER BY created_at` | ✅ | Saralash tekin |
| `WHERE created_at > '...'` | ❌ | Birinchi ustun yo'q |
| `WHERE created_at > '...' AND user_id = 5` | ✅ | Tartib muhim emas, **shart** muhim |

> **Telefon kitobi analogiyasi:** familiya + ism bo'yicha saralangan kitobda familiya
> bo'yicha topa olasiz, faqat ism bo'yicha esa yo'q.

**Qoida:** tenglik shartlari oldinda, oraliq shartlari (`>`, `<`, `BETWEEN`) oxirida.

```sql
-- WHERE status = 'pending' AND created_at > @date  uchun:
CREATE INDEX ix ON payments (status, created_at);   -- ✅ to'g'ri tartib
CREATE INDEX ix ON payments (created_at, status);   -- ❌ oraliq oldinda → yomon
```

Sabab: oraliq shartidan **keyingi** ustunlar indeksda samarasiz bo'lib qoladi.

## Indeksni o'ldiradigan yozuvlar

```sql
-- ❌ Ustunga funksiya qo'llanilsa indeks ISHLAMAYDI
WHERE LOWER(email) = 'a@b.uz'
WHERE DATE(created_at) = '2026-01-01'
WHERE amount::text LIKE '80%'
WHERE created_at + INTERVAL '1 day' > now()

-- ✅ Shartni ustunga tegmasdan yozing
WHERE email = 'a@b.uz'
WHERE created_at >= '2026-01-01' AND created_at < '2026-01-02'
WHERE created_at > now() - INTERVAL '1 day'

-- ✅ Yoki ifoda bo'yicha indeks yarating
CREATE INDEX ix_email_lower ON users (LOWER(email));
```

Boshqa tuzoqlar:

| Yozuv | Indeks | Izoh |
|---|---|---|
| `LIKE 'abc%'` | ✅ | Prefiks — B-tree'da ishlaydi |
| `LIKE '%abc'` | ❌ | Boshi noma'lum → trigram indeks kerak |
| `WHERE col != 5` | ❌ | Deyarli butun jadval |
| `WHERE col IS NULL` | ⚠ | Postgres'da ishlaydi, lekin selektivlik past |
| Turi mos kelmasa (`varchar` vs `int`) | ❌ | Yashirin `CAST` indeksni buzadi |

## Indeks turlari

| Tur | Qachon |
|---|---|
| **B-tree** | Default. Tenglik, oraliq, saralash |
| **Partial** | Qatorlarning kichik qismi so'raladi |
| **Covering** (`INCLUDE`) | So'rovga kerakli hamma ustun indeksda → jadvalga bormaydi |
| **Unique** | Constraint + indeks bir vaqtda |
| **GIN** | `jsonb`, massiv, to'liq matnli qidiruv |
| **Hash** | Faqat tenglik — kam ishlatiladi |

```sql
-- Partial: outbox uchun ideal — faqat publish qilinmaganlar indeksda
CREATE INDEX ix_outbox_pending ON outbox (created_at)
WHERE published_at IS NULL;
-- 10 mln qator jadvalda indeks bor-yo'g'i bir necha ming qatordan iborat

-- Covering: jadvalga umuman murojaat qilinmaydi (index-only scan)
CREATE INDEX ix_pay ON payments (user_id, created_at) INCLUDE (amount, status);

-- Unique: idempotency kaliti uchun MAJBURIY
CREATE UNIQUE INDEX ux_idem ON idempotency_keys (key);
```

## EXPLAIN — nimaga qarash kerak

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM payments WHERE user_id = 5 AND created_at > '2026-01-01';
```

```
   Index Scan using ix_payments on payments
     (cost=0.43..8.45 rows=1 width=64)
     (actual time=0.021..0.089 rows=1247 loops=1)
                              ▲            ▲
                              │            └── HAQIQIY qatorlar
                              └─────────────── PLANNER TAXMINI

   ⚠ rows=1 lekin actual rows=1247 → statistika eskirgan → ANALYZE payments;
```

| Nimani ko'rasiz | Ma'nosi |
|---|---|
| `Seq Scan` | Butun jadval o'qildi — kichik jadvalda normal, kattada muammo |
| `Index Scan` | Indeks ishlatildi, keyin jadvaldan qator olindi |
| `Index Only Scan` | Eng yaxshisi — jadvalga umuman borilmadi |
| `Bitmap Heap Scan` | Ko'p qator mos keladi — indeks + jadval birga |
| `Nested Loop` katta `rows` bilan | Ko'pincha yo'qolgan indeks belgisi |
| `Rows Removed by Filter: 50000` | Indeks noto'g'ri — ortiqcha qator o'qildi |
| `estimate` va `actual` orasida katta farq | `ANALYZE` kerak |

> **Muhim:** `Seq Scan` har doim yomon emas. Natija jadvalning katta qismini (~10%+)
> qamrasa, planner **ataylab** seq scan tanlaydi — va bu to'g'ri, chunki tasodifiy
> kirish ketma-ket o'qishdan sekinroq.

## Indeksning narxi

```
   Har INSERT bilan nima bo'ladi:

   Indekssiz jadval        →  1 yozuv
   3 ta indeksli jadval    →  1 + 3 = 4 yozuv

   Yozish tezligi ~3–4 barobar pasayadi.
```

- Disk joyi: indeks ba'zan jadvalning o'zidan katta bo'ladi.
- **Ishlatilmaydigan indeks — sof zarar:** yozishni sekinlashtiradi, foyda bermaydi.

```sql
-- Ishlatilmayotgan indekslarni topish
SELECT schemaname, relname, indexrelname, idx_scan
FROM   pg_stat_user_indexes
WHERE  idx_scan = 0
ORDER  BY pg_relation_size(indexrelid) DESC;
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Har ustunga alohida indeks | Yozish sekin, composite so'rovlar baribir sekin |
| Composite ustun tartibini o'ylamaslik | Indeks ishlatilmaydi |
| `WHERE` da funksiya ishlatish | Indeks e'tiborsiz qoladi |
| Selektivligi past ustunga indeks (`is_active`) | Foyda deyarli yo'q |
| Indeks qo'shib, `EXPLAIN` bilan tekshirmaslik | Ishlatilayotganini bilmaysiz |
| `CREATE INDEX` ni production'da oddiy yozish | Jadval **qulflanadi** → `CONCURRENTLY` kerak |
| Statistikani yangilamaslik | Planner noto'g'ri qaror qabul qiladi |

```sql
-- Production'da har doim:
CREATE INDEX CONCURRENTLY ix_payments_user ON payments (user_id, created_at);
-- Sekinroq, lekin jadvalni qulflamaydi
```

## Fintech konteksti

Eng kerakli indekslar:

```sql
-- Ledger: hisob bo'yicha tarix va balans hisoblash
CREATE INDEX ix_entries ON ledger_entries (account_id, created_at);

-- Idempotency: UNIQUE — bu indeks emas, XAVFSIZLIK mexanizmi
CREATE UNIQUE INDEX ux_idem ON idempotency_keys (key);

-- Outbox: partial — faqat yuborilmagan xabarlar
CREATE INDEX ix_outbox ON outbox (created_at) WHERE published_at IS NULL;

-- Reconciliation: kunlik solishtirish
CREATE INDEX ix_tx_date ON transactions (created_at, status);

-- Qidiruv: tranzaksiya raqami bo'yicha
CREATE UNIQUE INDEX ux_tx_ref ON transactions (external_reference);
```

> Indeks concurrency'ga ham ta'sir qiladi: indekssiz `UPDATE ... WHERE` seq scan qilib,
> **ortiqcha qatorlarni qulflaydi** → deadlock ehtimoli oshadi (5.6).

## Intervyu savollari

**1. `WHERE UPPER(name) = 'ALI'` — indeks ishlaydimi? Nega?** ⭐

> Yo'q. Indeks `name` ustunining **asl qiymatlari** bo'yicha saralangan, `UPPER(name)`
> esa boshqa qiymat — DB har qator uchun funksiyani hisoblashi kerak, ya'ni butun
> jadvalni o'qishi kerak.
>
> Ikki yechim: shartni ustunga tegmasdan yozish, yoki **ifoda bo'yicha indeks** yaratish:
> `CREATE INDEX ix ON users (UPPER(name))`.
>
> Bu qoida hamma joyda amal qiladi: `DATE(created_at)`, `col::text`, `col + 1` — hammasi
> indeksni o'chiradi.

**2. Composite indeksda ustunlar tartibi nega muhim?**

> Indeks chapdan o'ngga saralangan. `(a, b)` indeksi `WHERE a = ...` va
> `WHERE a = ... AND b = ...` uchun ishlaydi, lekin faqat `WHERE b = ...` uchun ishlamaydi.
>
> Qoida: **tenglik shartlari oldinda, oraliq shartlari oxirida** — chunki oraliqdan keyingi
> ustunlar indeksda samarasiz bo'lib qoladi.

**3. Indeks bor, lekin so'rov sekin. Nima qilasiz?**

> Birinchi qadam har doim `EXPLAIN ANALYZE` — taxmin qilmayman.
>
> Ko'p uchraydigan sabablar:
> - Shartda funksiya bor → indeks o'chgan.
> - Ustun tartibi so'rovga mos emas.
> - Statistika eskirgan — `estimate` va `actual rows` orasida katta farq, `ANALYZE` kerak.
> - Natija jadvalning katta qismini qamraydi → planner **ataylab** seq scan tanlagan,
>   va bu to'g'ri qaror.
> - Turi mos emas — yashirin `CAST` indeksni buzgan.

**4. Nega hamma ustunga indeks qo'ymaymiz?**

> Chunki har indeks yozishni sekinlashtiradi: 3 ta indeksli jadvalda bitta `INSERT`
> to'rtta yozuvga aylanadi. Bundan tashqari disk joyi va planner uchun qo'shimcha variant.
>
> Va ishlatilmaydigan indeks — **sof zarar**. Men `pg_stat_user_indexes` da `idx_scan = 0`
> bo'lganlarni davriy tekshirib, o'chiraman.

**5. `Index Scan` va `Index Only Scan` farqi?**

> `Index Scan` — indeksdan qator manzili topiladi, keyin **jadvaldan** qator o'qiladi.
> `Index Only Scan` — so'rovga kerakli hamma ustun indeksda bor, jadvalga umuman
> borilmaydi. Bu ancha tez.
>
> Buni `INCLUDE` bilan ataylab yaratish mumkin — covering index.

## Deliverable

```sql
-- database/queries/05-index-experiments.sql
-- Har so'rov uchun: EXPLAIN natijasi + xulosa yozib boriladi

-- 1. Bazaviy: indekssiz
EXPLAIN ANALYZE SELECT * FROM payments WHERE user_id = 5;
-- Seq Scan · actual time=245.1 ms · rows=1247

-- 2. Indeks qo'shildi
CREATE INDEX CONCURRENTLY ix_pay_user ON payments (user_id);
EXPLAIN ANALYZE SELECT * FROM payments WHERE user_id = 5;
-- Index Scan · actual time=1.8 ms  → 136× tezroq

-- 3. Funksiya bilan — indeks o'chadi
EXPLAIN ANALYZE SELECT * FROM payments WHERE user_id::text = '5';
-- Seq Scan · actual time=251.3 ms  → xulosa: CAST indeksni buzadi

-- 4. Covering index
CREATE INDEX ix_pay_cover ON payments (user_id) INCLUDE (amount, status);
EXPLAIN ANALYZE SELECT amount, status FROM payments WHERE user_id = 5;
-- Index Only Scan · actual time=0.9 ms

-- 5. Composite tartibi
-- (status, created_at) va (created_at, status) — ikkalasini o'lchab solishtirish
```

## Xotira kartasi

```
B-tree        O(log n) · leaf'lar bog'langan → oraliq va ORDER BY tekin
Composite     CHAPDAN o'ngga · tenglik oldinda, oraliq oxirida
O'ldiruvchi   ustunga funksiya · CAST · LIKE '%abc' · != 
Partial       WHERE bilan — outbox uchun ideal
Covering      INCLUDE → Index Only Scan, jadvalga bormaydi
EXPLAIN       Seq vs Index Scan · estimate vs actual → ANALYZE
Narxi         har indeks = yozish sekinroq · ishlatilmasa sof zarar
Production    CREATE INDEX CONCURRENTLY
Concurrency   indekssiz UPDATE → ortiqcha qatorlar qulflanadi
```

---

# 5.9 · `EXPLAIN ANALYZE` va planner

## Nima va nega

«So'rov sekin» — bu tashxis emas, alomat. `EXPLAIN` — DB ichini ko'rsatadigan
yagona ishonchli vosita. **Taxmin qilish o'rniga o'lchash** — bu bo'limning butun
mazmuni.

```sql
EXPLAIN                       -- faqat reja (so'rov bajarilmaydi)
EXPLAIN ANALYZE               -- reja + HAQIQIY bajarilish
EXPLAIN (ANALYZE, BUFFERS)    -- + disk/kesh o'qishlari
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
```

> ⚠ `ANALYZE` so'rovni **haqiqatan bajaradi**. `UPDATE`/`DELETE` uchun tranzaksiya
> ichida ishlatib, keyin `ROLLBACK` qiling.

## Rejani o'qish

Reja — **daraxt**, pastdan yuqoriga o'qiladi.

```
QUERY PLAN
─────────────────────────────────────────────────────────────────────
Nested Loop  (cost=0.71..48.5 rows=10 width=72)
             (actual time=0.05..1.21 rows=1247 loops=1)
  │
  ├─► Index Scan using ix_pay_user on payments p
  │     Index Cond: (user_id = 5)
  │     (cost=0.43..8.4 rows=10 width=40)
  │     (actual time=0.02..0.31 rows=1247 loops=1)
  │
  └─► Index Scan using accounts_pkey on accounts a
        Index Cond: (id = p.account_id)
        (actual time=0.001..0.001 rows=1 loops=1247)   ← 1247 MARTA bajarildi

Planning Time: 0.２ ms
Execution Time: 3.4 ms
```

| Nima | Ma'nosi |
|---|---|
| `cost=0.43..8.4` | Taxminiy narx: birinchi qator..hammasi (birlik shartli) |
| `rows=10` | **Planner taxmini** |
| `actual rows=1247` | **Haqiqiy** natija |
| `loops=1247` | Tugun necha marta bajarilgan |
| `Planning Time` | Rejani tuzishga ketgan vaqt |
| `Execution Time` | Bajarilishga ketgan vaqt |

> **Eng muhim signal:** `rows` (taxmin) va `actual rows` orasidagi katta farq —
> statistika eskirgan yoki so'rov planner uchun murakkab. `ANALYZE table;` chaqiring.

## Skan turlari

```
   Seq Scan          butun jadval ketma-ket o'qiladi
                     kichik jadval yoki natija katta qism bo'lsa — NORMAL

   Index Scan        indeksdan manzil → jadvaldan qator (random I/O)

   Index Only Scan   hamma kerakli ustun indeksda → jadvalga BORMAYDI  ← eng tez

   Bitmap Heap Scan  indeks bo'yicha bitmap quriladi, keyin jadval
                     TARTIB bilan o'qiladi (ko'p qator uchun samarali)

   Parallel Seq Scan bir necha worker parallel skanerlaydi
```

## Join strategiyalari

```
   Nested Loop       kichik × indeksli katta
                     har tashqi qator uchun ichkariga qidiruv
                     ⚠ ikkala tomon katta bo'lsa — FALOKAT

   Hash Join         bir tomondan hash jadval quriladi
                     tenglik shartlari uchun, ikkala tomon katta bo'lsa yaxshi

   Merge Join        ikkala tomon saralangan bo'lsa
                     katta hajmlarda samarali
```

## Diagnostika ro'yxati

| Belgi | Sabab | Chora |
|---|---|---|
| `Seq Scan` katta jadvalda | Indeks yo'q yoki ishlatilmagan | Indeks / shartni tuzatish |
| `rows` va `actual` farqi 100× | Statistika eskirgan | `ANALYZE` |
| `Rows Removed by Filter: 500000` | Indeks noto'g'ri ustunda | Composite indeks |
| `loops=100000` | N+1 yoki noto'g'ri join | So'rovni qayta yozish |
| `Sort` + `external merge Disk` | `work_mem` yetmayapti | Indeks bilan saralash |
| `Nested Loop` ikkala tomon katta | Planner adashgan | `ANALYZE`, statistika maqsadi |
| `Buffers: read=...` katta | Kesh promaxi, disk o'qish | Indeks, `shared_buffers` |

## Statistika

```sql
-- Statistikani yangilash
ANALYZE payments;

-- Muhim ustun uchun batafsilroq statistika
ALTER TABLE payments ALTER COLUMN status SET STATISTICS 1000;
ANALYZE payments;

-- Ustunlar bog'liqligi (masalan city va region bog'liq)
CREATE STATISTICS pay_stats (dependencies)
    ON user_id, status FROM payments;
ANALYZE payments;
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `EXPLAIN` ni `ANALYZE`siz o'qish | Faqat taxmin ko'rinadi, haqiqat emas |
| `cost` ni millisekund deb tushunish | Bu shartli birlik, vaqt emas |
| `Seq Scan` ni har doim yomon deb bilish | Katta natijada u **to'g'ri** tanlov |
| Bir marta o'lchab xulosa chiqarish | Birinchi bajarilish keshsiz — sekin |
| Production va dev'da bir xil reja kutish | Ma'lumot hajmi boshqa → reja boshqa |
| Planner'ni `SET enable_seqscan = off` bilan majburlash | Diagnostika uchun ok, yechim sifatida yo'q |

## Fintech konteksti

- **Kunlik reconciliation so'rovi** — eng qimmat so'rov. Uni `EXPLAIN` bilan
  o'lchash va indeks bilan optimallashtirish odatiy ish.
- **Ledger bo'yicha balans hisoblash** — `SUM` agregatsiyasi katta jadvalda.
  Yechim: snapshot jadvali yoki materialized view.
- Slow query log yoqilgan bo'lishi kerak: `log_min_duration_statement = 500ms`.

## Intervyu savollari

**1. So'rov sekin. Qanday boshlaysiz?**

> Birinchi qadam har doim `EXPLAIN (ANALYZE, BUFFERS)` — taxmin qilmayman.
>
> Keyin uchta narsaga qarayman:
> 1. **Skan turi** — katta jadvalda `Seq Scan` bormi.
> 2. **`rows` va `actual rows` farqi** — katta bo'lsa statistika eskirgan,
>    `ANALYZE` kerak.
> 3. **`loops`** — katta bo'lsa N+1 yoki noto'g'ri join strategiyasi.
>
> Va o'lchashni bir necha marta bajaraman: birinchi bajarilish keshsiz bo'ladi.

**2. `cost` nimani anglatadi?**

> Bu **shartli birlik**, millisekund emas. Planner turli rejalarni solishtirish uchun
> ishlatadi: ketma-ket sahifa o'qish narxi 1.0 deb olinadi, tasodifiy o'qish esa
> `random_page_cost` (default 4.0).
>
> SSD'da bu default noto'g'ri — u HDD uchun mo'ljallangan. SSD'da odatda 1.1 ga
> tushiriladi, aks holda planner indeksdan bekorga qochadi.

**3. `Seq Scan` har doim yomonmi?**

> Yo'q. Agar so'rov jadvalning katta qismini (~10%+) qaytarsa, ketma-ket o'qish
> indeks orqali tasodifiy o'qishdan **tezroq**.
>
> Planner buni tanlaganda odatda haq bo'ladi. Yomon bo'lsa — sabab ko'pincha
> statistika eskirganida yoki shartda funksiya borligida.

**4. Planner noto'g'ri reja tanlasa nima qilasiz?**

> Avval sababni topaman: `ANALYZE` qilinganmi, statistika maqsadi yetarlimi, ustunlar
> orasida bog'liqlik bormi (`CREATE STATISTICS`).
>
> `enable_seqscan = off` kabi sozlamalar — faqat **diagnostika** uchun, yechim emas.
> Ular so'rovni majburlaydi, lekin ma'lumot o'zgarganda yana muammo qaytadi.

## Deliverable

```sql
-- database/queries/09-explain-lab.sql
-- Har tajriba: so'rov → EXPLAIN natijasi → XULOSA yozib boriladi

-- 1. Bazaviy
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM payments WHERE user_id = 5;
-- Seq Scan · actual 245 ms · Buffers: read=12483
-- Xulosa: indeks yo'q

-- 2. Indeksdan keyin
CREATE INDEX CONCURRENTLY ix_pay_user ON payments (user_id);
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM payments WHERE user_id = 5;
-- Index Scan · actual 1.8 ms · Buffers: read=32     → 136× tezroq

-- 3. Statistika eskirgan holat
UPDATE payments SET status = 'completed' WHERE id % 2 = 0;
EXPLAIN ANALYZE SELECT * FROM payments WHERE status = 'completed';
-- rows=100 vs actual rows=500000   → ANALYZE kerak

-- 4. Index Only Scan
CREATE INDEX ix_cover ON payments (user_id) INCLUDE (amount_minor, status);
EXPLAIN ANALYZE SELECT amount_minor, status FROM payments WHERE user_id = 5;
-- Index Only Scan · actual 0.9 ms

-- 5. Join strategiyasi
EXPLAIN ANALYZE
SELECT p.*, a.* FROM payments p JOIN accounts a ON a.id = p.account_id
WHERE p.created_at > now() - interval '1 day';
```

## Xotira kartasi

```
Boshlash     EXPLAIN (ANALYZE, BUFFERS) — TAXMIN QILMA, O'LCHA
Daraxt       pastdan yuqoriga o'qiladi
cost         SHARTLI birlik, millisekund EMAS
rows/actual  katta farq → statistika eskirgan → ANALYZE
loops        katta → N+1 yoki noto'g'ri join
Skanlar      Seq · Index · Index Only (eng tez) · Bitmap Heap
Join         Nested Loop (kichik×indeksli) · Hash (katta=katta) · Merge (saralangan)
Seq Scan     natija katta qism bo'lsa — TO'G'RI tanlov
SSD          random_page_cost 4.0 → 1.1 ga tushiring
enable_*=off faqat diagnostika, yechim emas
```

---

# 5.10 · Normalizatsiya va denormalizatsiya

## Nima va nega

Normalizatsiya — **ma'lumot takrorlanishini yo'q qilish**. Har fakt bitta joyda
saqlansa, uni yangilashda nomuvofiqlik paydo bo'lmaydi.

```
   ❌ Normalizatsiyalanmagan — bitta jadval
   ┌────────────────────────────────────────────────────────────┐
   │ tx_id │ user_name │ user_phone   │ amount  │ merchant_name │
   ├───────┼───────────┼──────────────┼─────────┼───────────────┤
   │ 1     │ Ali       │ +998901111111│ 100 000 │ Korzinka      │
   │ 2     │ Ali       │ +998901111111│  50 000 │ Korzinka      │
   │ 3     │ Ali       │ +998901111111│  25 000 │ Makro         │
   └───────┴───────────┴──────────────┴─────────┴───────────────┘
              ▲              ▲
              └──────────────┴── TAKRORLANISH

   Muammolar:
   · Update anomaly  — telefon o'zgarsa 3 qatorni yangilash kerak
   · Insert anomaly  — tranzaksiyasiz foydalanuvchi qo'shib bo'lmaydi
   · Delete anomaly  — oxirgi tranzaksiya o'chsa foydalanuvchi ham yo'qoladi
```

## Normal shakllar

| Shakl | Talab | Amaliy ma'nosi |
|---|---|---|
| **1NF** | Atomik qiymatlar, takrorlanuvchi guruh yo'q | «telefonlar: +998..., +998...» bitta katakda bo'lmasin |
| **2NF** | 1NF + har atributning **to'liq** kalitga bog'liqligi | Composite kalitning bir qismiga bog'liq ustun ajratilsin |
| **3NF** | 2NF + tranzitiv bog'liqlik yo'q | `city` → `region` bog'liqligi alohida jadvalga |
| **BCNF** | 3NF ning kuchliroq varianti | Kamdan-kam amaliy farq |

Amalda **3NF** yetarli — undan yuqorisi ko'pincha nazariy mashq.

```sql
-- ✅ 3NF
CREATE TABLE users (
    id    uuid PRIMARY KEY,
    name  text NOT NULL,
    phone text NOT NULL UNIQUE
);

CREATE TABLE merchants (
    id   uuid PRIMARY KEY,
    name text NOT NULL
);

CREATE TABLE transactions (
    id           uuid PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users(id),
    merchant_id  uuid NOT NULL REFERENCES merchants(id),
    amount_minor bigint NOT NULL,
    currency     char(3) NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);
```

## Denormalizatsiya — ataylab takrorlash

```
   Qachon oqlanadi:

   ┌────────────────────────────────────────────────────────────┐
   │ 1. O'lchangan performans muammosi bor (taxmin emas)        │
   │ 2. O'qish yozishdan ANCHA ko'p                             │
   │ 3. Nomuvofiqlik xavfi boshqariladi (trigger/job/event)     │
   │ 4. TARIXIY QIYMAT saqlanishi kerak  ← fintech'da eng muhim │
   └────────────────────────────────────────────────────────────┘
```

**Fintech'dagi eng muhim holat — tarixiy nusxa:**

```sql
CREATE TABLE transactions (
    id            uuid PRIMARY KEY,
    merchant_id   uuid NOT NULL REFERENCES merchants(id),

    -- ⬇ ATAYLAB nusxa: merchant nomi keyin o'zgarsa ham
    --   chek va hisobotda O'SHA PAYTDAGI nom ko'rinishi kerak
    merchant_name text NOT NULL,

    -- ⬇ Kurs ham xuddi shunday (M4.6)
    fx_rate       numeric(18,8),
    amount_minor  bigint NOT NULL
);
```

> Bu **normalizatsiya buzilishi emas** — bu boshqa fakt. «Hozirgi nom» va
> «tranzaksiya paytidagi nom» ikki xil ma'lumot.

**Agregat kesh:**

```sql
-- Balans — ledger yozuvlaridan hosila, lekin keshlanadi
ALTER TABLE accounts ADD COLUMN balance_minor bigint NOT NULL DEFAULT 0;

-- Yozuvlar bilan BITTA tranzaksiyada yangilanadi
-- va davriy job bilan qayta hisoblanib tekshiriladi
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Erta denormalizatsiya | Murakkablik, foyda yo'q |
| Denormalizatsiyani sinxronlashtirmaslik | Ma'lumot nomuvofiq bo'lib qoladi |
| JSON'ga hammani tiqish | Constraint yo'q, indeks qiyin, tekshiruv yo'q |
| FK qo'ymaslik («tezroq bo'ladi») | Yetim yozuvlar, ma'lumot buziladi |
| Tarixiy nusxani «takrorlanish» deb olib tashlash | Chek va hisobot buziladi |
| Balansni faqat keshda saqlash | Haqiqat manbai yo'qoladi |

## Fintech konteksti

```
   ┌──────────────────────────────────────────────────────────────┐
   │  HAQIQAT MANBAI              │  HOSILA (keshlanishi mumkin)  │
   ├──────────────────────────────┼───────────────────────────────┤
   │  ledger_entries (append-only)│  accounts.balance_minor       │
   │  transactions                │  daily_summary                │
   │  fx_rates                    │  materialized view'lar        │
   └──────────────────────────────┴───────────────────────────────┘

   Qoida: hosila HAR DOIM qayta hisoblanishi mumkin bo'lsin.
          Aks holda u haqiqat manbaiga aylanadi va uni tekshirib bo'lmaydi.
```

## Intervyu savollari

**1. Qachon ataylab denormalizatsiya qilasiz?** ⭐

> To'rt holatda, va birinchisi majburiy shart: **o'lchangan** performans muammosi
> bo'lsa, taxmin emas.
>
> Qolganlari: o'qish yozishdan ancha ko'p bo'lsa; nomuvofiqlikni boshqarish yo'li
> bo'lsa (trigger, job, event); va — fintech'da eng muhimi — **tarixiy qiymat**
> saqlanishi kerak bo'lsa.
>
> Oxirgisi aslida denormalizatsiya ham emas: chekdagi merchant nomi «hozirgi nom»
> emas, «tranzaksiya paytidagi nom» — bu boshqa fakt.

**2. Balansni jadvalda saqlaysizmi?**

> Haqiqat manbai — **ledger yozuvlari**. Balans esa o'qish uchun keshlangan hosila,
> o'sha yozuvlar bilan **bitta tranzaksiyada** yangilanadi.
>
> Va davriy job bilan qayta hisoblanib tekshiriladi: agar kesh va yig'indi farq
> qilsa — bu alert.
>
> Faqat `UPDATE balance` qilsangiz, «bu pul qayerdan keldi?» savoliga javob yo'q —
> audit imkonsiz.

**3. FK'ni performans uchun olib tashlash mumkinmi?**

> Deyarli hech qachon. FK tekshiruvi arzon (indeksli qidiruv), yetim yozuvlarning
> narxi esa juda qimmat — ma'lumot buziladi va uni tiklash qo'lda ish talab qiladi.
>
> FK haqiqatan muammo bo'ladigan joy — juda katta hajmdagi bulk yuklash. U yerda
> ham yechim FK ni butunlay olib tashlash emas, yuklash davomida vaqtincha
> o'chirish.

**4. JSON ustun qachon to'g'ri?**

> Sxemasi oldindan noma'lum yoki juda o'zgaruvchan ma'lumot uchun: tashqi
> provayderning xom javobi, audit metadata, foydalanuvchi sozlamalari.
>
> **Noto'g'ri:** biznes qoidasi bog'liq bo'lgan maydonlarni JSON'ga tiqish. U yerda
> `CHECK` constraint yo'q, FK yo'q, indeks murakkab, va tur xavfsizligi yo'q.
>
> Fintech'da summa, valyuta, hisob ID — hech qachon JSON ichida emas.

## Deliverable

```sql
-- database/schema/10-normalization.sql
-- 3NF asosiy sxema + ataylab denormalizatsiya izohi bilan

CREATE TABLE transactions (
    id            uuid PRIMARY KEY,
    user_id       uuid NOT NULL REFERENCES users(id),
    merchant_id   uuid NOT NULL REFERENCES merchants(id),

    -- DENORMALIZATSIYA (ataylab): tranzaksiya paytidagi nom.
    -- Sabab: merchant nomini o'zgartirsa, eski cheklar o'zgarmasligi kerak.
    merchant_name text NOT NULL,

    amount_minor  bigint  NOT NULL CHECK (amount_minor > 0),
    currency      char(3) NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);
```

```csharp
[Fact]
public async Task MerchantRename_DoesNotChangeHistoricalReceipts()
{
    var merchant = await CreateMerchant("Korzinka");
    var tx = await CreateTransaction(merchant, Money.FromMajor(100_000m, Currency.Uzs));

    await RenameMerchant(merchant.Id, "Korzinka Plus");

    var receipt = await GetReceipt(tx.Id);
    Assert.Equal("Korzinka", receipt.MerchantName);      // TARIX o'zgarmadi
}

[Fact]
public async Task CachedBalance_MatchesLedgerSum()
{
    await MakeRandomTransactions(count: 500);

    var cached = await GetCachedBalance(accountId);
    var computed = await SumLedgerEntries(accountId);

    Assert.Equal(computed, cached);      // kunlik job aynan shuni tekshiradi
}
```

## Xotira kartasi

```
Normalizatsiya  takrorlanishni yo'q qilish → 3NF amalda yetarli
Anomaliyalar    update · insert · delete
Denormalizatsiya  4 shart: O'LCHANGAN muammo · o'qish>>yozish ·
                  sinxronlash yo'li bor · TARIXIY qiymat kerak
Tarixiy nusxa   merchant_name, fx_rate — bu takrorlanish EMAS, boshqa fakt
Haqiqat manbai  ledger_entries · hosila: balance, daily_summary
Qoida           hosila HAR DOIM qayta hisoblanishi mumkin bo'lsin
FK              olib tashlamang — yetim yozuvlar juda qimmat
JSON            noma'lum sxema uchun · biznes maydonlari uchun EMAS
```

---

# 5.11 · Constraint'lar

## Nima va nega

Ma'lumot butunligini himoya qilishning ikki joyi bor: **ilova** va **DB**.
Ilova kodini chetlab o'tish mumkin (migratsiya skripti, qo'lda `UPDATE`, boshqa
servis), DB constraint'ini esa yo'q.

> **Fintech qoidasi:** pulga tegishli invariantlar **DB darajasida** ham
> himoyalangan bo'lishi kerak. Ilova validatsiyasi — foydalanuvchiga chiroyli xato
> berish uchun; constraint — ma'lumot buzilmasligi uchun.

## Turlari

```sql
CREATE TABLE ledger_entries (
    id             bigserial PRIMARY KEY,

    transaction_id uuid NOT NULL,
    account_id     uuid NOT NULL
                   REFERENCES accounts(id) ON DELETE RESTRICT,   -- FK

    direction      char(2) NOT NULL
                   CHECK (direction IN ('DR','CR')),             -- CHECK

    amount_minor   bigint NOT NULL
                   CHECK (amount_minor > 0),                     -- manfiy yo'q

    currency       char(3) NOT NULL
                   CHECK (currency ~ '^[A-Z]{3}$'),              -- format

    created_at     timestamptz NOT NULL DEFAULT now(),

    UNIQUE (transaction_id, account_id, direction)               -- dublikat yo'q
);
```

| Constraint | Nimani himoya qiladi |
|---|---|
| `PRIMARY KEY` | Yagona identifikatsiya |
| `FOREIGN KEY` | Mavjud bo'lmagan yozuvga havola qilinmaydi |
| `UNIQUE` | Takrorlanish yo'q — **idempotentlik asosi** |
| `CHECK` | Qiymat diapazoni, format, mantiqiy shart |
| `NOT NULL` | Majburiy maydon |
| `EXCLUDE` | Murakkab to'qnashuvlar (oraliqlar kesishmasin) |

## `UNIQUE` — idempotentlikning poydevori

```sql
CREATE TABLE idempotency_keys (
    key           text PRIMARY KEY,          -- UNIQUE'ning kuchli shakli
    request_hash  text NOT NULL,
    response_body jsonb,
    status        text NOT NULL CHECK (status IN ('in_progress','completed')),
    created_at    timestamptz NOT NULL DEFAULT now()
);
```

```
   Ikki parallel bir xil so'rov:

   A: INSERT key='abc'  →  muvaffaqiyatli
   B: INSERT key='abc'  →  <u>unique_violation (23505)</u>
                            │
                            └─► B "allaqachon ishlanmoqda" deb tushunadi

   ⚠ Bu tekshiruvni ILOVADA qilib bo'lmaydi:
     SELECT → yo'q → INSERT   — orasida B kirib ulguradi (write skew)
```

C# tomonida:

```csharp
try
{
    db.IdempotencyKeys.Add(new(key, hash));
    await db.SaveChangesAsync();
}
catch (DbUpdateException e) when (e.InnerException is PostgresException
                                  { SqlState: "23505" })
{
    // allaqachon mavjud → saqlangan javobni qaytaramiz
    return await LoadStoredResponseAsync(key);
}
```

## `EXCLUDE` — kam ma'lum, lekin kuchli

Oraliqlar kesishmasligi kerak bo'lgan holatlar uchun:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE fx_rates (
    id        bigserial PRIMARY KEY,
    base_ccy  char(3) NOT NULL,
    quote_ccy char(3) NOT NULL,
    rate      numeric(18,8) NOT NULL CHECK (rate > 0),
    validity  tstzrange NOT NULL,

    -- Bir valyuta juftligi uchun vaqt oraliqlari KESISHMASIN
    EXCLUDE USING gist (
        base_ccy  WITH =,
        quote_ccy WITH =,
        validity  WITH &&
    )
);
```

## Deferred constraint

```sql
-- Tranzaksiya oxirida tekshiriladi — oraliq holat vaqtincha buzuq bo'lishi mumkin
ALTER TABLE ledger_entries
    ADD CONSTRAINT balanced_entry
    CHECK (...) DEFERRABLE INITIALLY DEFERRED;
```

Foydali: ikkita yozuv ketma-ket qo'shilayotganda oraliq holatda Δ ≠ 0 bo'ladi,
lekin `COMMIT` paytida to'g'ri bo'lishi kerak.

## Append-only jadvalni majburlash

```sql
-- Grant darajasida
REVOKE UPDATE, DELETE ON ledger_entries FROM app_user;

-- Trigger bilan qo'shimcha himoya
CREATE OR REPLACE FUNCTION no_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'ledger_entries append-only: % taqiqlangan', TG_OP;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_immutable
    BEFORE UPDATE OR DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION no_mutation();
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Constraint'ni faqat ilovada qo'yish | Migratsiya yoki boshqa servis buzadi |
| `unique_violation`ni umumiy xato deb ushlash | Idempotentlik ishlamaydi |
| `ON DELETE CASCADE` moliyaviy jadvalda | Tarix jimgina o'chib ketadi |
| `CHECK` da subquery ishlatishga urinish | PostgreSQL ruxsat bermaydi |
| Katta jadvalga `NOT NULL` qo'shish | Uzoq qulf (`NOT VALID` bilan bosqichma-bosqich) |
| Constraint nomini bermaslik | Xato xabari tushunarsiz, migratsiya qiyin |

```sql
-- ✅ Katta jadvalga xavfsiz qo'shish
ALTER TABLE payments
    ADD CONSTRAINT chk_amount_positive
    CHECK (amount_minor > 0) NOT VALID;          -- mavjud qatorlar tekshirilmaydi

ALTER TABLE payments VALIDATE CONSTRAINT chk_amount_positive;   -- keyin, sekin
```

## Fintech konteksti

Majburiy constraint'lar ro'yxati:

```sql
amount_minor bigint NOT NULL CHECK (amount_minor > 0)     -- manfiy summa yo'q
currency     char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$')
balance_minor bigint NOT NULL CHECK (balance_minor >= 0)  -- overdraft yo'q bo'lsa
spent_minor  bigint NOT NULL CHECK (spent_minor >= 0)     -- limit bo'shatish (M4.9)
UNIQUE (idempotency_key)
UNIQUE (transaction_id, account_id, direction)            -- dublikat yozuv yo'q
EXCLUDE ... (fx_rate oraliqlari kesishmasin)
```

## Intervyu savollari

**1. Validatsiyani ilovada qilsak yetarli emasmi?** ⭐

> Yo'q. Ilova — **yagona emas** ma'lumotga yozuvchi: migratsiya skriptlari, qo'lda
> `UPDATE`, boshqa mikroservis, ma'lumot import qilish.
>
> DB constraint'i — **oxirgi himoya chizig'i** va uni chetlab o'tib bo'lmaydi.
>
> Ikkalasi ham kerak: ilova validatsiyasi foydalanuvchiga tushunarli xato beradi,
> constraint esa ma'lumot buzilmasligini kafolatlaydi.

**2. `UNIQUE` constraint idempotentlik bilan qanday bog'liq?**

> To'g'ridan-to'g'ri. Idempotency kaliti bo'yicha `UNIQUE` — bu **poyga holatini
> DB darajasida hal qilish**.
>
> Ilovada `SELECT` qilib «yo'q ekan» deb `INSERT` qilsangiz, ikki parallel so'rov
> ikkalasi ham «yo'q» deb ko'radi — bu write skew. `UNIQUE` esa ikkinchisiga
> `23505` beradi va biz uni «allaqachon ishlangan» deb talqin qilamiz.

**3. `ON DELETE CASCADE` moliyaviy jadvalda qo'llaysizmi?**

> Yo'q, hech qachon. Moliyaviy yozuvlar **o'chirilmaydi** — bu audit talabi.
>
> Men `ON DELETE RESTRICT` qo'yaman: hisob o'chirilmoqchi bo'lsa va unga yozuvlar
> havola qilsa — operatsiya rad etiladi. Hisobni «o'chirish» esa `closed_at`
> maydonini to'ldirish bilan amalga oshiriladi.

**4. Katta jadvalga constraint qanday qo'shasiz?**

> `NOT VALID` bilan — bu constraint'ni **yangi va o'zgargan** qatorlar uchun darhol
> yoqadi, mavjud qatorlarni tekshirmaydi va qulf qisqa bo'ladi.
>
> Keyin alohida qadamda `VALIDATE CONSTRAINT` — bu uzoq davom etadi, lekin faqat
> yengil qulf oladi va yozishni bloklamaydi.

## Deliverable

```csharp
public class ConstraintTests
{
    [Fact]
    public async Task NegativeAmount_IsRejectedByDatabase()
    {
        var ex = await Assert.ThrowsAsync<DbUpdateException>(async () => {
            db.LedgerEntries.Add(new LedgerEntry { AmountMinor = -100 });
            await db.SaveChangesAsync();
        });
        Assert.Contains("chk_amount_positive", ex.InnerException!.Message);
    }

    [Fact]
    public async Task DuplicateIdempotencyKey_ThrowsUniqueViolation()
    {
        await InsertKey("abc");
        var ex = await Assert.ThrowsAsync<DbUpdateException>(() => InsertKey("abc"));
        Assert.Equal("23505", ((PostgresException)ex.InnerException!).SqlState);
    }

    [Fact]
    public async Task ParallelSameKey_OnlyOneSucceeds()
    {
        var results = await Task.WhenAll(
            TryInsertKey("k1"), TryInsertKey("k1"), TryInsertKey("k1"));

        Assert.Equal(1, results.Count(r => r));      // aynan bittasi
    }

    [Fact]
    public async Task LedgerEntry_CannotBeUpdatedOrDeleted()
    {
        var entry = await InsertLedgerEntry();

        await Assert.ThrowsAsync<PostgresException>(
            () => RawSql($"UPDATE ledger_entries SET amount_minor = 1 WHERE id = {entry.Id}"));
        await Assert.ThrowsAsync<PostgresException>(
            () => RawSql($"DELETE FROM ledger_entries WHERE id = {entry.Id}"));
    }

    [Fact]
    public async Task OverlappingFxRatePeriods_AreRejected()
    {
        await InsertRate("USD", "UZS", 12_700m, "[2026-01-01, 2026-02-01)");
        await Assert.ThrowsAsync<DbUpdateException>(
            () => InsertRate("USD", "UZS", 12_800m, "[2026-01-15, 2026-03-01)"));
    }
}
```

## Xotira kartasi

```
Nega DB'da    ilova yagona yozuvchi EMAS: migratsiya, qo'lda UPDATE, boshqa servis
Turlari       PK · FK · UNIQUE · CHECK · NOT NULL · EXCLUDE
UNIQUE        idempotentlik ASOSI → 23505 ni "allaqachon ishlangan" deb talqin
CHECK         amount > 0 · currency format · balance >= 0
FK            moliyada ON DELETE RESTRICT · CASCADE HECH QACHON
EXCLUDE       oraliqlar kesishmasin (fx_rates validity)
DEFERRABLE    tranzaksiya oxirida tekshiriladi (oraliq holat buzuq bo'lsa)
Append-only   REVOKE UPDATE,DELETE + trigger
Katta jadval  NOT VALID → keyin VALIDATE CONSTRAINT
```

---

# 5.12 · Connection pool

## Nima va nega

DB ulanishi **qimmat**: TCP qo'l siqish, autentifikatsiya, PostgreSQL'da esa har
ulanish uchun **alohida jarayon** (process) yaratiladi — bu ~10 MB xotira.

Pool ulanishlarni qayta ishlatadi: ilova «ochadi» va «yopadi», aslida esa poolga
qaytaradi.

```
   ┌─────────────┐      ┌──────────────────────┐      ┌──────────────┐
   │  Ilova      │      │   CONNECTION POOL    │      │  PostgreSQL  │
   │             │      │  ┌────┐ ┌────┐       │      │              │
   │ Open()  ────┼─────►│  │ ✓  │ │ ✓  │  bo'sh│      │  backend     │
   │             │      │  └────┘ └────┘       │      │  jarayonlar  │
   │ Close() ────┼─────►│  ┌────┐ ┌────┐       │◄────►│              │
   │  (qaytarish)│      │  │band│ │band│       │      │  har biri    │
   └─────────────┘      │  └────┘ └────┘       │      │  ~10 MB      │
                        └──────────────────────┘      └──────────────┘
                              Max Pool Size                max_connections
```

## Sozlash

```csharp
// Npgsql — connection string orqali
"Host=db;Database=fintech;Username=app;Password=***;" +
"Minimum Pool Size=5;" +
"Maximum Pool Size=50;" +       // default 100
"Connection Idle Lifetime=300;" +
"Timeout=15;" +                 // ulanish OLISH uchun kutish (soniya)
"Command Timeout=30;"           // so'rov bajarilishi uchun
```

```sql
-- PostgreSQL tomonida
SHOW max_connections;           -- default 100

-- Hozirgi ulanishlar
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

## Pool tugashi — eng ko'p uchraydigan incident

```
   Simptomlar:
   · "Timeout expired. The timeout period elapsed prior to obtaining
      a connection from the pool"
   · Kechikish keskin oshadi, keyin xatolar boshlanadi
   · DB CPU past — ya'ni DB emas, ILOVA muammosi

   Sabablar:
   ┌────────────────────────────────────────────────────────┐
   │ 1. Ulanish qaytarilmaydi (Dispose yo'q)                │
   │ 2. Uzoq tranzaksiya — ulanish ushlab turiladi          │
   │ 3. Tranzaksiya ichida tashqi API chaqiruvi             │
   │ 4. Pool hajmi yukka nisbatan kichik                    │
   │ 5. "idle in transaction" — BEGIN bor, COMMIT yo'q      │
   └────────────────────────────────────────────────────────┘
```

```sql
-- Muammoli ulanishlarni topish
SELECT pid, state, now() - state_change AS idle_for, left(query, 60)
FROM   pg_stat_activity
WHERE  state = 'idle in transaction'
ORDER  BY idle_for DESC;

-- Himoya: PostgreSQL o'zi uzsin
ALTER SYSTEM SET idle_in_transaction_session_timeout = '60s';
```

## Pool hajmini tanlash

```
   Ko'p uchraydigan xato: "ko'proq ulanish = tezroq" — bu NOTO'G'RI.

   PostgreSQL'da har ulanish = alohida jarayon.
   200 ta parallel ulanish 8 yadroli serverda kontekst almashinuviga
   ketadigan vaqtni oshiradi va throughput'ni TUSHIRADI.

   Boshlang'ich formula:
       pool_size ≈ (yadrolar × 2) + samarali disklar soni

   8 yadro, SSD  →  ~18–20

   Keyin O'LCHANADI va sozlanadi.
```

**Ko'p instansli ilova:**

```
   ⚠ Har instance o'z pooliga ega!

   10 instance × 50 pool size = 500 ulanish
   max_connections = 100                        → FALOKAT

   Yechim:
   · pool_size ni instance soniga bo'lib hisoblang
   · yoki PgBouncer qo'ying
```

## PgBouncer

```
   Ilova (500 ulanish)  →  PgBouncer  →  PostgreSQL (20 ta haqiqiy ulanish)

   Rejimlar:
   ┌──────────────┬──────────────────────────────────────────────┐
   │ session      │ ulanish sessiya oxirigacha biriktiriladi     │
   │ transaction  │ tranzaksiya oxirida qaytariladi ← eng ko'p   │
   │ statement    │ har so'rovdan keyin (tranzaksiya ishlamaydi) │
   └──────────────┴──────────────────────────────────────────────┘

   ⚠ transaction rejimida ishlamaydi:
     prepared statement (Npgsql'da o'chirish kerak),
     LISTEN/NOTIFY, sessiya darajasidagi SET, advisory lock
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `Dispose` qilmaslik | Ulanish poolga qaytmaydi → pool tugaydi |
| Tranzaksiya ichida tashqi API | Ulanish sekundlab band |
| Pool hajmini juda katta qilish | DB'da kontekst almashinuvi, throughput tushadi |
| Instance sonini hisobga olmaslik | `max_connections` oshib ketadi |
| `Command Timeout` = 0 (cheksiz) | Osilgan so'rov ulanishni abadiy ushlaydi |
| PgBouncer transaction rejimida prepared statement | Kutilmagan xatolar |

## Fintech konteksti

- **Background job'lar** (outbox relay, reconciliation) alohida pool ishlatsin —
  ular onlayn so'rovlar uchun ulanishlarni yeb qo'ymasin.
- **Read replica** uchun alohida connection string va pool.
- `idle_in_transaction_session_timeout` — majburiy sozlama, aks holda bitta bug
  butun tizimni to'xtatadi.

## Intervyu savollari

**1. Connection pool nima uchun kerak?**

> Ulanish ochish qimmat: TCP qo'l siqish, autentifikatsiya, va PostgreSQL'da har
> ulanish uchun alohida jarayon yaratiladi (~10 MB).
>
> Pool ulanishlarni qayta ishlatadi. Ilova `Open`/`Close` qiladi, lekin aslida
> ulanish poolga qaytadi — yangi TCP sessiya ochilmaydi.

**2. «Timeout expired... obtaining a connection from the pool» — nima qilasiz?**

> Bu **pool tugagan** degani, va deyarli har doim bu DB emas, **ilova** muammosi.
>
> Tekshiraman:
> 1. Ulanishlar `Dispose` qilinayaptimi (`using` yoki DI).
> 2. Uzoq tranzaksiyalar bormi — `pg_stat_activity` da `idle in transaction`.
> 3. Tranzaksiya ichida tashqi API chaqiruvi bormi.
> 4. Pool hajmi yukka mosmi.
>
> Tez chora sifatida pool hajmini oshirish — vaqtinchalik yamoq, sabab topilmasa
> muammo qaytadi.

**3. Pool hajmini qanday tanlaysiz?**

> «Ko'proq = tezroq» degan taxmin **noto'g'ri**. PostgreSQL'da har ulanish alohida
> jarayon, va 200 ta parallel ulanish 8 yadroli serverda throughput'ni **tushiradi**.
>
> Boshlang'ich formula: `(yadrolar × 2) + disklar`. 8 yadro va SSD uchun ~18–20.
> Keyin o'lchab sozlanadi.
>
> Va muhim nuans: har ilova instansi o'z pooliga ega. 10 instance × 50 = 500
> ulanish, `max_connections` esa 100 — bu falokat. Shuning uchun PgBouncer.

**4. PgBouncer qachon kerak?**

> Ilova instanslari ko'p bo'lganda yoki serverless muhitda, ya'ni ulanishlar soni
> `max_connections` dan oshib ketadigan holatda.
>
> Odatda `transaction` rejimi ishlatiladi — ulanish tranzaksiya oxirida qaytariladi.
> Lekin unda prepared statement, `LISTEN/NOTIFY` va sessiya darajasidagi sozlamalar
> ishlamaydi — Npgsql'da prepared statement'ni o'chirish kerak bo'ladi.

## Deliverable

```csharp
public class ConnectionPoolTests
{
    [Fact]
    public async Task Connections_AreReturnedToPool()
    {
        for (int i = 0; i < 500; i++)
        {
            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync();
            await conn.ExecuteScalarAsync("SELECT 1");
        }
        // Pool hajmi 20 bo'lsa ham 500 ta operatsiya muvaffaqiyatli o'tishi kerak
    }

    [Fact]
    public async Task LeakedConnection_ExhaustsPool()
    {
        var leaked = new List<NpgsqlConnection>();
        var poolSize = 10;

        for (int i = 0; i < poolSize; i++) {
            var c = new NpgsqlConnection(smallPoolCs);
            await c.OpenAsync();
            leaked.Add(c);                          // ataylab Dispose qilinmaydi
        }

        await Assert.ThrowsAsync<NpgsqlException>(async () => {
            await using var extra = new NpgsqlConnection(smallPoolCs);
            await extra.OpenAsync();                // Timeout expired
        });

        foreach (var c in leaked) await c.DisposeAsync();
    }

    [Fact]
    public async Task IdleInTransaction_IsTerminatedByTimeout()
    {
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync();
        await conn.ExecuteAsync("SET idle_in_transaction_session_timeout = '1s'");
        await conn.ExecuteAsync("BEGIN");

        await Task.Delay(2000);

        await Assert.ThrowsAsync<PostgresException>(
            () => conn.ExecuteAsync("SELECT 1"));   // sessiya uzilgan
    }
}
```

## Xotira kartasi

```
Nega          ulanish qimmat · PostgreSQL'da har ulanish = ALOHIDA JARAYON (~10 MB)
Pool          Open/Close → aslida poolga qaytariladi
Tugashi       "Timeout expired obtaining a connection" → ILOVA muammosi
Sabablar      Dispose yo'q · uzoq tranzaksiya · tranzaksiyada tashqi API
              · kichik pool · idle in transaction
Hajm          (yadro × 2) + disk ≈ 8 yadro → 18–20 · KO'PROQ ≠ TEZROQ
Instance      har instance o'z pooliga ega → 10 × 50 = 500 > max_connections
PgBouncer     transaction rejimi · prepared statement ishlamaydi
Majburiy      idle_in_transaction_session_timeout
Fintech       background job'lar uchun ALOHIDA pool
```

---

# 5.13 · Migratsiya va zero-downtime

## Nima va nega

Rolling deploy paytida **eski va yangi kod bir vaqtda ishlaydi**. Ya'ni har
migratsiya ikkala versiya bilan mos bo'lishi shart.

```
   Deploy davomida (bir necha daqiqa):

   ┌──────────────┐   ┌──────────────┐
   │  Instance 1  │   │  Instance 2  │
   │  ESKI kod    │   │  YANGI kod   │
   └───────┬──────┘   └──────┬───────┘
           │                 │
           └────────┬────────┘
                    ▼
              ┌──────────┐
              │    DB    │   ← sxema IKKALASINI ham qo'llab-quvvatlashi kerak
              └──────────┘
```

## Expand → Migrate → Contract

Har buzuvchi o'zgarish **uch relizga** bo'linadi.

```
   ┌─ RELIZ 1: EXPAND ───────────────────────────────────────┐
   │  Yangi ustun qo'shiladi (NULLABLE yoki DEFAULT bilan)   │
   │  Eski kod uni bilmaydi — muammo yo'q                    │
   └──────────────────────────────────────────────────────────┘
                              ↓
   ┌─ RELIZ 2: MIGRATE ──────────────────────────────────────┐
   │  Yangi kod IKKALA ustunga yozadi, yangisidan o'qiydi    │
   │  Fon job eski ma'lumotni ko'chiradi (batch'lar bilan)   │
   └──────────────────────────────────────────────────────────┘
                              ↓
   ┌─ RELIZ 3: CONTRACT ─────────────────────────────────────┐
   │  Eski ustun o'chiriladi                                  │
   │  Endi hech kim unga murojaat qilmaydi                    │
   └──────────────────────────────────────────────────────────┘
```

**Misol — `amount decimal` dan `amount_minor bigint` ga o'tish:**

```sql
-- RELIZ 1
ALTER TABLE payments ADD COLUMN amount_minor bigint;

-- RELIZ 2 (kod ikkalasiga yozadi)
UPDATE payments SET amount_minor = (amount * 100)::bigint
WHERE  amount_minor IS NULL AND id IN (SELECT id FROM payments
                                       WHERE amount_minor IS NULL LIMIT 10000);
-- ↑ batch'lar bilan, sikl ichida, sekin

ALTER TABLE payments ALTER COLUMN amount_minor SET NOT NULL;

-- RELIZ 3
ALTER TABLE payments DROP COLUMN amount;
```

## Qaysi amal qulflaydi

| Amal | Qulf | Xavfsizmi |
|---|---|---|
| `ADD COLUMN` (DEFAULT'siz) | Metadata, bir lahza | ✅ |
| `ADD COLUMN ... DEFAULT` (PG 11+) | Metadata | ✅ |
| `DROP COLUMN` | Metadata | ✅ (lekin kod tayyor bo'lsin) |
| `ALTER COLUMN TYPE` | **Butun jadval qayta yoziladi** | ❌ |
| `ADD CONSTRAINT ... CHECK` | Butun jadval skanerlanadi | ⚠ `NOT VALID` bilan ✅ |
| `ADD FOREIGN KEY` | Ikkala jadval skanerlanadi | ⚠ `NOT VALID` bilan ✅ |
| `CREATE INDEX` | **Yozish bloklanadi** | ❌ |
| `CREATE INDEX CONCURRENTLY` | Bloklamaydi | ✅ |
| `SET NOT NULL` | Butun jadval skanerlanadi | ⚠ `CHECK` orqali bosqichma-bosqich |

```sql
-- ✅ Xavfsiz naqshlar
CREATE INDEX CONCURRENTLY ix_pay_user ON payments (user_id);

ALTER TABLE payments ADD CONSTRAINT chk_amt CHECK (amount_minor > 0) NOT VALID;
ALTER TABLE payments VALIDATE CONSTRAINT chk_amt;

-- ⚠ lock_timeout — migratsiya butun tizimni to'xtatib qo'ymasin
SET lock_timeout = '3s';
```

> `CREATE INDEX CONCURRENTLY` tranzaksiya ichida ishlamaydi va xato bo'lsa
> **yaroqsiz indeks** qoldiradi — uni `DROP INDEX` bilan tozalash kerak.

## EF Core migratsiyalari

```csharp
public partial class AddAmountMinor : Migration
{
    protected override void Up(MigrationBuilder mb)
    {
        mb.AddColumn<long>("amount_minor", "payments", nullable: true);

        // Indeks — CONCURRENTLY faqat raw SQL orqali
        mb.Sql("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pay_amount " +
               "ON payments (amount_minor);", suppressTransaction: true);
    }

    protected override void Down(MigrationBuilder mb)
        => mb.DropColumn("amount_minor", "payments");   // Down HAR DOIM yozilsin
}
```

```
   ⚠ Production'da `dotnet ef database update` ilova ishga tushganda
     AVTOMATIK chaqirilmasin:

     · bir necha instance bir vaqtda migratsiya qilishga urinadi
     · migratsiya sekin bo'lsa health check yiqiladi
     · rollback qilib bo'lmaydi

   ✅ Migratsiya — ALOHIDA deploy qadami (job / init container).
```

## Ma'lumot migratsiyasi — batch bilan

```csharp
// ❌ Bitta UPDATE bilan 50 mln qator — soatlab qulf, WAL to'ladi
await db.Database.ExecuteSqlRawAsync(
    "UPDATE payments SET amount_minor = (amount * 100)::bigint");

// ✅ Batch'lar bilan, orasida nafas olish
while (true)
{
    var affected = await db.Database.ExecuteSqlRawAsync(@"
        UPDATE payments SET amount_minor = (amount * 100)::bigint
        WHERE id IN (SELECT id FROM payments
                     WHERE amount_minor IS NULL LIMIT 5000)");

    if (affected == 0) break;
    await Task.Delay(200, ct);      // replikatsiya va autovacuum ulgursin
}
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Ustunni qo'shish va o'chirishni bitta relizda | Eski instance yiqiladi |
| Ilova ishga tushganda avtomatik migratsiya | Parallel migratsiya, health check muammosi |
| `CREATE INDEX` `CONCURRENTLY`siz | Yozish bloklanadi |
| `ALTER COLUMN TYPE` katta jadvalda | Jadval qayta yoziladi, uzoq qulf |
| Bitta `UPDATE` bilan millionlab qator | Uzoq qulf, WAL to'lishi, replikatsiya lag |
| `Down` migratsiyasini yozmaslik | Rollback imkonsiz |
| `lock_timeout` qo'ymaslik | Migratsiya butun tizimni kutdiradi |

## Fintech konteksti

- **Ledger jadvali sxemasi o'zgarishi** — eng ehtiyot talab qiladigan holat.
  Append-only bo'lgani uchun eski yozuvlarni o'zgartirib bo'lmaydi: yangi ustun
  faqat nullable qo'shiladi va eski yozuvlarda `NULL` qoladi.
- **Migratsiya vaqti** — kam yuklamali oyna tanlanadi, lekin to'lov tizimi 24/7
  ishlaydi, shuning uchun zero-downtime naqshi **majburiy**.
- Har migratsiya **rollback rejasi** bilan birga hujjatlashtiriladi.

## Intervyu savollari

**1. Zero-downtime migratsiyani qanday qilasiz?** ⭐

> Asosiy tamoyil: rolling deploy paytida eski va yangi kod **bir vaqtda** ishlaydi,
> demak sxema ikkalasiga ham mos bo'lishi kerak.
>
> Shuning uchun har buzuvchi o'zgarish **uch relizga** bo'linadi:
> 1. **Expand** — yangi ustun qo'shiladi (nullable), eski kod uni bilmaydi.
> 2. **Migrate** — yangi kod ikkalasiga yozadi, fon job ma'lumotni batch'lar bilan
>    ko'chiradi.
> 3. **Contract** — eski ustun o'chiriladi.
>
> Va migratsiya ilova ishga tushganda emas, **alohida deploy qadamida** bajariladi.

**2. Katta jadvalga indeks qanday qo'shasiz?**

> `CREATE INDEX CONCURRENTLY` — u yozishni bloklamaydi. Oddiy `CREATE INDEX` esa
> jadvalga yozishni butunlay to'xtatadi.
>
> Narxi: sekinroq va tranzaksiya ichida ishlamaydi. Va agar xato bo'lsa —
> **yaroqsiz indeks** qoladi, uni `pg_index.indisvalid` orqali topib `DROP` qilish
> kerak.
>
> EF Core'da bu `mb.Sql(..., suppressTransaction: true)` orqali yoziladi.

**3. 50 million qatorni yangilash kerak. Qanday qilasiz?**

> Bitta `UPDATE` bilan emas — u soatlab qulf ushlaydi, WAL'ni to'ldiradi va
> replikatsiya lag'ini o'stiradi.
>
> **Batch'lar** bilan: 5–10 ming qatordan, sikl ichida, orasida qisqa `Delay` bilan —
> autovacuum va replika ulgursin. Progress log qilinadi va jarayon to'xtatilib qayta
> boshlanishi mumkin bo'lsin (idempotent).

**4. Migratsiyani ilova ishga tushganda bajarish mumkinmi?**

> Kichik loyihada mumkin, production'da esa yo'q.
>
> Sabablar: bir necha instance bir vaqtda migratsiya qilishga urinadi; migratsiya
> sekin bo'lsa health check yiqiladi va orkestrator pod'ni o'ldiradi; va rollback
> imkoni yo'q.
>
> To'g'ri yechim — migratsiya alohida qadam: init container, deploy job yoki qo'lda
> tasdiqlanadigan bosqich.

## Deliverable

```csharp
[Fact]
public async Task ExpandPhase_OldCodeStillWorks()
{
    await ApplyMigration("AddAmountMinor");           // yangi ustun qo'shildi

    var oldCodePayment = await LegacyRepository.InsertAsync(  // amount_minor bilmaydi
        new LegacyPayment { Amount = 1000.50m });

    Assert.NotNull(oldCodePayment);                   // eski kod ishlayapti
}

[Fact]
public async Task Backfill_IsResumable()
{
    await SeedPayments(count: 25_000, amountMinorNull: true);

    await RunBackfill(batchSize: 5000, stopAfterBatches: 2);   // ataylab to'xtatamiz
    Assert.Equal(15_000, await CountWhereAmountMinorIsNull());

    await RunBackfill(batchSize: 5000);                        // davom ettiramiz
    Assert.Equal(0, await CountWhereAmountMinorIsNull());
}

[Fact]
public async Task ConcurrentIndexCreation_DoesNotBlockWrites()
{
    var indexTask = RawSql("CREATE INDEX CONCURRENTLY ix_test ON payments (status)");
    var writeTask = InsertPaymentsFor(TimeSpan.FromSeconds(3));

    await Task.WhenAll(indexTask, writeTask);
    Assert.True(await writeTask > 0);                 // yozish to'xtamadi
}
```

## Xotira kartasi

```
Tamoyil       rolling deploy → eski va yangi kod BIR VAQTDA ishlaydi
Uch reliz     EXPAND (nullable ustun) → MIGRATE (ikkalasiga yozish + backfill)
              → CONTRACT (eski ustunni o'chirish)
Xavfsiz       ADD/DROP COLUMN · ADD COLUMN DEFAULT (PG 11+)
Xavfli        ALTER COLUMN TYPE · CREATE INDEX · SET NOT NULL
Yechim        CREATE INDEX CONCURRENTLY · ADD CONSTRAINT NOT VALID → VALIDATE
lock_timeout  migratsiya butun tizimni kutdirmasin
Backfill      BATCH'lar (5–10k) + Delay + qayta boshlanadigan (idempotent)
Deploy        migratsiya ALOHIDA qadam, ilova startida EMAS
Down          har doim yozilsin — rollback rejasi bilan
```

---

# 5.14 · Partitioning va sharding

## Nima va nega

Jadval o'sib ketganda ikki xil bo'lish usuli bor, va ular **butunlay boshqa
narsalar**:

```
   ┌─ PARTITIONING (bitta DB) ────────────────────────────────┐
   │                                                            │
   │   payments (mantiqiy jadval)                              │
   │      ├── payments_2026_06                                 │
   │      ├── payments_2026_07                                 │
   │      └── payments_2026_08                                 │
   │                                                            │
   │   · Tranzaksiyalar ISHLAYDI                                │
   │   · JOIN ishlaydi                                          │
   │   · Constraint'lar ishlaydi                                │
   │   · Ilova uchun BITTA jadval kabi ko'rinadi                │
   └────────────────────────────────────────────────────────────┘

   ┌─ SHARDING (bir necha DB) ────────────────────────────────┐
   │                                                            │
   │   Shard 1 (server A)      Shard 2 (server B)              │
   │   user_id % 2 = 0         user_id % 2 = 1                 │
   │                                                            │
   │   · Shard'lar ARO tranzaksiya YO'Q                         │
   │   · Shard'lar aro JOIN YO'Q                                │
   │   · Global UNIQUE YO'Q                                     │
   │   · Ilova qaysi shard ekanini BILISHI kerak                │
   └────────────────────────────────────────────────────────────┘
```

> **Sharding — eng oxirgi chora.** U tranzaksion kafolatlarni buzadi, ya'ni
> fintech'da eng qimmat narsani.

## Partitioning

```sql
-- Vaqt bo'yicha (eng ko'p uchraydigan)
CREATE TABLE payments (
    id           uuid NOT NULL,
    created_at   timestamptz NOT NULL,
    amount_minor bigint NOT NULL,
    PRIMARY KEY (id, created_at)          -- ⚠ partition kaliti PK ichida bo'lishi SHART
) PARTITION BY RANGE (created_at);

CREATE TABLE payments_2026_08 PARTITION OF payments
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE payments_2026_09 PARTITION OF payments
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
```

| Strategiya | Qachon |
|---|---|
| `RANGE` | Vaqt bo'yicha — tranzaksiyalar, loglar, ledger |
| `LIST` | Aniq qiymatlar — valyuta, region, tenant |
| `HASH` | Teng taqsimlash — kalit bo'yicha tabiiy guruh yo'q bo'lsa |

**Partition pruning — asosiy foyda:**

```sql
EXPLAIN SELECT * FROM payments WHERE created_at >= '2026-08-01';
-- Seq Scan on payments_2026_08     ← FAQAT bitta partition o'qiladi
-- boshqa partition'lar umuman ko'rilmaydi
```

**Ikkinchi katta foyda — arzon o'chirish:**

```sql
-- ❌ 50 mln qatorni DELETE qilish: soatlar, bloat, WAL
DELETE FROM payments WHERE created_at < '2025-01-01';

-- ✅ Partition'ni uzish — bir lahzada
ALTER TABLE payments DETACH PARTITION payments_2024_12;
DROP TABLE payments_2024_12;
```

## Partitioning cheklovlari

```
   ⚠ Partition kaliti PRIMARY KEY va har UNIQUE ichida bo'lishi SHART

   PRIMARY KEY (id)                  → ✗ ishlamaydi
   PRIMARY KEY (id, created_at)      → ✓

   Oqibat: global UNIQUE (masalan idempotency_key bo'yicha)
           partitsiyalangan jadvalda mumkin emas
           → alohida partitsiyalanmagan jadvalga chiqariladi
```

## Sharding — qachon va narxi

```
   Sharding kerak bo'ladigan belgilar:
   ┌────────────────────────────────────────────────────────┐
   │ · Yozish yuki BITTA serverga sig'maydi                  │
   │ · Ma'lumot hajmi bitta diskka sig'maydi                 │
   │ · Vertikal masshtab (kuchliroq server) tugagan          │
   │ · Read replica o'qish muammosini yechmayapti            │
   └────────────────────────────────────────────────────────┘

   Undan OLDIN sinaladigan choralar (tartib bilan):
   1. Indeks va so'rovlarni tuzatish     ← odatda eng katta foyda
   2. Kesh
   3. Read replica
   4. Partitioning
   5. Vertikal masshtab
   6. Sharding                            ← faqat shundan keyin
```

**Shard kalitini tanlash:**

```
   ✅ Yaxshi kalit: user_id / account_id
      Sabab: bitta foydalanuvchining hamma ma'lumoti BITTA shard'da
             → uning operatsiyalari uchun tranzaksiya ishlaydi

   ❌ Yomon kalit: created_at
      Sabab: hamma yangi yozuv BITTA shard'ga tushadi (hotspot)

   ⚠ Muammo: pul o'tkazmasi — Ali shard 1 da, Vali shard 2 da
      → ikki shard aro tranzaksiya kerak → SAGA (M10.6)
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Partitioning va sharding'ni chalkashtirish | Intervyuda darhol ko'rinadi |
| Erta sharding | Ulkan murakkablik, foyda yo'q |
| Shard kaliti sifatida vaqt | Hotspot — hamma yozuv bitta shard'ga |
| Partition kalitini PK'ga qo'shmaslik | Migratsiya ishlamaydi |
| Kelajakdagi partition'ni oldindan yaratmaslik | Yozish xatosi (`no partition found`) |
| Shard'lar aro tranzaksiya kutish | Yo'q — saga kerak |

```sql
-- Kelajak partition'larni avtomatik yaratish (yoki pg_partman)
CREATE TABLE payments_2026_10 PARTITION OF payments
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
-- ⚠ Bu unutilsa — INSERT xato beradi
```

## Fintech konteksti

- **`ledger_entries`** — vaqt bo'yicha partitioning uchun ideal nomzod: yozuvlar
  append-only, so'rovlar odatda yaqin davrga tegishli, eski partition'lar arxivga
  chiqariladi.
- **Regulyator talabi**: ma'lumot 5–10 yil saqlanishi kerak. Partition'lar bilan
  eski ma'lumotni arzon saqlashga (arxiv) ko'chirish oson.
- **Sharding** to'lov tizimida juda kam oqlanadi — mahalliy fintech hajmida deyarli
  hech qachon. Intervyuda buni ayta olish **yetuklik belgisi**.

## Intervyu savollari

**1. Partitioning va sharding farqi nima?** ⭐

> **Partitioning** — bitta DB ichida jadvalni bo'laklarga bo'lish. Tranzaksiyalar,
> JOIN va constraint'lar ishlaydi; ilova uchun bu bitta jadval kabi ko'rinadi.
>
> **Sharding** — ma'lumotni bir necha **alohida DB** ga tarqatish. Shard'lar aro
> tranzaksiya, JOIN va global UNIQUE **yo'q**; ilova qaysi shard ekanini bilishi
> kerak.
>
> Ya'ni partitioning — operatsion qulaylik, sharding esa arxitektura qarori va
> tranzaksion kafolatlarni yo'qotish.

**2. Qachon sharding qilasiz?**

> Faqat undan oldingi barcha choralar tugaganda: indeks va so'rovlarni tuzatish,
> kesh, read replica, partitioning, vertikal masshtab.
>
> Amalda mahalliy fintech hajmida sharding deyarli **hech qachon** kerak
> bo'lmaydi — bitta yaxshi sozlangan PostgreSQL kuniga millionlab tranzaksiyani
> ko'taradi.
>
> Va fintech'da narxi juda yuqori: shard'lar aro pul o'tkazmasi uchun saga kerak
> bo'ladi, ya'ni atomiklikni yo'qotasiz.

**3. Shard kalitini qanday tanlaysiz?**

> Kalit shunday bo'lishi kerakki, **ko'p operatsiyalar bitta shard ichida**
> bajarilsin. To'lov tizimida bu odatda `user_id` yoki `account_id`.
>
> `created_at` — yomon kalit: hamma yangi yozuv bitta shard'ga tushadi va hotspot
> hosil bo'ladi.
>
> Va baribir muammo qoladi: Ali shard 1 da, Vali shard 2 da bo'lsa — o'tkazma ikki
> shard'ga tegadi va saga talab qilinadi.

**4. Partitioning'ning eng katta amaliy foydasi nima?**

> Ikkitasi. Birinchi — **partition pruning**: so'rov faqat kerakli partition'ni
> o'qiydi.
>
> Ikkinchi va ko'pincha muhimrog'i — **arzon o'chirish**. 50 million qatorni
> `DELETE` qilish soatlab davom etadi va bloat qoldiradi; `DETACH PARTITION` esa
> bir lahzada bajariladi.
>
> Fintech'da bu arxivlash uchun juda qulay.

## Deliverable

```sql
-- database/schema/14-partitioning.sql
CREATE TABLE ledger_entries (
    id             bigserial,
    account_id     uuid NOT NULL,
    amount_minor   bigint NOT NULL CHECK (amount_minor > 0),
    direction      char(2) NOT NULL CHECK (direction IN ('DR','CR')),
    created_at     timestamptz NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE ledger_2026_08 PARTITION OF ledger_entries
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE INDEX ON ledger_2026_08 (account_id, created_at);
```

```csharp
[Fact]
public async Task Query_ScansOnlyRelevantPartition()
{
    var plan = await ExplainAsync(
        "SELECT * FROM ledger_entries WHERE created_at >= '2026-08-01' " +
        "AND created_at < '2026-09-01'");

    Assert.Contains("ledger_2026_08", plan);
    Assert.DoesNotContain("ledger_2026_07", plan);      // pruning ishladi
}

[Fact]
public async Task DetachPartition_IsInstant()
{
    await SeedPartition("ledger_2025_01", rows: 1_000_000);

    var sw = Stopwatch.StartNew();
    await RawSql("ALTER TABLE ledger_entries DETACH PARTITION ledger_2025_01");
    sw.Stop();

    Assert.True(sw.ElapsedMilliseconds < 1000);         // DELETE bo'lsa daqiqalar
}
```

## Xotira kartasi

```
Partitioning  BITTA DB · tranzaksiya/JOIN/constraint ISHLAYDI · ilova bilmaydi
Sharding      BIR NECHA DB · tranzaksiya/JOIN/global UNIQUE YO'Q · ilova biladi
Strategiya    RANGE (vaqt) · LIST (region/valyuta) · HASH (teng taqsimot)
Foyda 1       partition pruning — faqat kerakli bo'lak o'qiladi
Foyda 2       DETACH PARTITION — bir lahzada arxivlash (DELETE emas)
Cheklov       partition kaliti PK va har UNIQUE ichida BO'LISHI SHART
              → global UNIQUE (idempotency_key) alohida jadvalga
Shard kaliti  user_id/account_id ✓ · created_at ✗ (hotspot)
Tartib        indeks → kesh → replica → partition → vertikal → SHARDING oxirgi
Fintech       ledger vaqt bo'yicha partition · sharding deyarli hech qachon
```

---

# 5.15 · Replikatsiya va read replica

## Nima va nega

Bitta DB serveri ikki muammo tug'diradi: **yagona nosozlik nuqtasi** va **o'qish
yuki**. Replikatsiya ikkalasini ham hal qiladi.

```
   ┌──────────────┐    WAL oqimi     ┌──────────────┐
   │   PRIMARY    │ ───────────────► │   REPLICA    │
   │  (yozish +   │                  │  (faqat      │
   │   o'qish)    │ ───────────────► │   o'qish)    │
   └──────────────┘                  └──────────────┘
                                            ▲
                                            │
                                    LAG: bir necha ms
                                    (yoki sekundlar)
```

## Sinxron va asinxron

```
   ASINXRON (default)
   ┌────────────────────────────────────────────────────────┐
   │ 1. Primary WAL'ga yozadi                               │
   │ 2. COMMIT DARHOL qaytadi        ← tez                  │
   │ 3. WAL replikaga keyinroq yuboriladi                   │
   │                                                         │
   │ ⚠ Primary yiqilsa — oxirgi tranzaksiyalar YO'QOLADI    │
   └────────────────────────────────────────────────────────┘

   SINXRON
   ┌────────────────────────────────────────────────────────┐
   │ 1. Primary WAL'ga yozadi                               │
   │ 2. Replikaga yuboradi va TASDIQNI KUTADI               │
   │ 3. Shundan keyin COMMIT qaytadi  ← sekinroq            │
   │                                                         │
   │ ✅ Ma'lumot yo'qolmaydi                                 │
   │ ⚠ Replika yiqilsa — yozish TO'XTAYDI (agar yolg'iz)    │
   └────────────────────────────────────────────────────────┘
```

```sql
-- Sinxron rejim
ALTER SYSTEM SET synchronous_commit = 'on';
ALTER SYSTEM SET synchronous_standby_names = 'ANY 1 (replica1, replica2)';
-- ANY 1 — ikkitadan kamida biri tasdiqlasa yetarli (ikkalasi yiqilmasa to'xtamaydi)
```

## Replication lag — asosiy tuzoq

```
   To'lov oqimi:

   t1   POST /payments  →  PRIMARY'ga yoziladi          ✓
   t2   Client darhol   →  GET /payments/{id}
                           REPLICA'dan o'qiladi
   t3                   →  <u>404 Not Found</u>   ← hali yetib bormagan!

   Foydalanuvchi: "Pulim ketdi, lekin tranzaksiya ko'rinmayapti"
```

```sql
-- Lag'ni o'lchash (replikada)
SELECT now() - pg_last_xact_replay_timestamp() AS lag;

-- Primary tomonidan
SELECT client_addr, state,
       pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
FROM   pg_stat_replication;
```

**Yechimlar:**

```csharp
// 1. Read-your-writes — yozgandan keyin primary'dan o'qish
public async Task<Payment?> GetAsync(Guid id, bool justWritten = false)
    => justWritten
        ? await _primary.Payments.FindAsync(id)
        : await _replica.Payments.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);

// 2. Sticky session — foydalanuvchi yozgandan keyin N soniya primary'da
// 3. LSN tekshiruvi — yozuvning LSN'i replikada bormi
// 4. Eng sodda: kritik o'qishlar HAR DOIM primary'dan
```

## Nimani replikadan o'qish mumkin

```
   ┌──────────────────────────────┬────────────────────────────┐
   │  REPLIKA mumkin              │  PRIMARY majburiy          │
   ├──────────────────────────────┼────────────────────────────┤
   │  Analitika, hisobotlar       │  Balans (qaror qabul       │
   │  Tranzaksiyalar tarixi       │  qilinadigan har qanday    │
   │  (bir oz eskirsa ham mayli)  │  o'qish)                   │
   │  Qidiruv, ro'yxatlar         │  Limit tekshiruvi          │
   │  Ma'lumotnomalar             │  Idempotency kaliti        │
   │  Eksport                      │  Yozishdan oldingi o'qish  │
   └──────────────────────────────┴────────────────────────────┘

   Qoida: PULGA TEGISHLI QAROR har doim primary'dan.
```

## Failover

```
   Primary yiqildi:

   1. Nosozlikni aniqlash          (health check, bir necha soniya)
   2. Replikani promote qilish     (patroni / pg_auto_failover)
   3. Ilova yangi primary'ga ulanadi (DNS / connection string)
   4. Eski primary qaytsa — u endi REPLIKA bo'ladi

   ⚠ SPLIT BRAIN: eski primary qaytib, hali ham "men primary" deb
     o'ylasa — ikkita yozuvchi paydo bo'ladi va ma'lumot ajraladi.
     Shuning uchun avtomatik failover uchun fencing/quorum kerak.
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Balansni replikadan o'qish | Eskirgan ma'lumot bo'yicha qaror |
| Lag'ni monitoring qilmaslik | Muammo faqat shikoyatda ko'rinadi |
| Yozgandan keyin darhol replikadan o'qish | 404 yoki eski holat |
| Asinxron replikada ma'lumot yo'qolmaydi deb o'ylash | Failover'da oxirgi tranzaksiyalar yo'qoladi |
| Yagona sinxron replika | U yiqilsa yozish to'xtaydi |
| Fencing'siz avtomatik failover | Split brain |

## Fintech konteksti

- **Balans, limit, idempotency kaliti** — har doim primary'dan. Bu **qaror qabul
  qilinadigan** o'qishlar.
- **Kunlik hisobot va reconciliation** — replikadan, chunki ular kechagi ma'lumot
  bilan ishlaydi va primary'ni yuklamasligi kerak.
- **Sinxron replikatsiya** — to'lov tizimida odatda majburiy: commit qilingan
  to'lovning yo'qolishi qabul qilinmaydi.
- Lag alerti: > 5 soniya bo'lsa ogohlantirish, > 30 soniya bo'lsa replikadan o'qish
  avtomatik o'chiriladi.

## Intervyu savollari

**1. Read replica'dan nimani o'qish mumkin, nimani mumkin emas?** ⭐

> Qoida sodda: **pulga tegishli qaror** qabul qilinadigan har qanday o'qish
> primary'dan bo'ladi — balans, limit, idempotency kaliti.
>
> Replikadan: analitika, hisobotlar, tranzaksiyalar tarixi, qidiruv — ya'ni bir necha
> soniyalik eskirish zarar qilmaydigan ma'lumot.
>
> Sabab: replikatsiya lag'i tufayli replika **eskirgan** bo'lishi mumkin, va eskirgan
> balans bo'yicha qaror qabul qilish — pul yo'qotish demak.

**2. Replication lag qanday muammo tug'diradi?**

> Klassik stsenariy: client to'lov qiladi (primary'ga yoziladi), darhol keyin
> tranzaksiyani so'raydi (replikadan o'qiladi) — va **404** oladi, chunki yozuv hali
> yetib bormagan.
>
> Yechimlar: yozgandan keyin N soniya davomida primary'dan o'qish (sticky), yoki
> LSN tekshiruvi, yoki eng sodda — kritik o'qishlarni har doim primary'dan qilish.

**3. Sinxron va asinxron replikatsiya — qaysi birini tanlaysiz?**

> To'lov tizimida **sinxron**, chunki commit qilingan tranzaksiyaning yo'qolishi
> qabul qilinmaydi.
>
> Narxi: har commit replikaning tasdig'ini kutadi, ya'ni kechikish ortadi. Va agar
> yagona sinxron replika yiqilsa — yozish **to'xtaydi**.
>
> Shuning uchun kamida ikkita replika va `ANY 1` sozlamasi: biri yiqilsa ikkinchisi
> ishlaydi.

**4. Split brain nima?**

> Failover'dan keyin eski primary qaytib, hali ham «men primary» deb hisoblasa —
> ikkita yozuvchi paydo bo'ladi va ma'lumot ikki tarmoqqa ajraladi. Ularni keyin
> birlashtirib bo'lmaydi.
>
> Shuning uchun avtomatik failover **fencing** (eski primary'ni majburan
> to'xtatish) yoki quorum bilan ishlaydi — Patroni, pg_auto_failover shuni qiladi.

## Deliverable

```csharp
public class ReplicationTests
{
    [Fact]
    public async Task Balance_IsAlwaysReadFromPrimary()
    {
        var service = new AccountService(primaryDb, replicaDb);
        await service.GetBalanceAsync(accountId);

        Assert.Equal(1, primaryDb.QueryCount);
        Assert.Equal(0, replicaDb.QueryCount);      // replikaga bormadi
    }

    [Fact]
    public async Task Reports_UseReplica()
    {
        await service.GetDailyReportAsync(new DateOnly(2026, 8, 4));
        Assert.Equal(1, replicaDb.QueryCount);
    }

    [Fact]
    public async Task ReadYourWrites_FallsBackToPrimary()
    {
        var id = await service.CreatePaymentAsync(payment);      // primary
        var loaded = await service.GetAsync(id, justWritten: true);

        Assert.NotNull(loaded);                     // lag bo'lsa ham topildi
    }

    [Fact]
    public async Task ReplicationLag_IsMonitored()
    {
        var lag = await metrics.GetReplicationLagAsync();
        Assert.True(lag < TimeSpan.FromSeconds(5));  // alert chegarasi
    }
}
```

## Xotira kartasi

```
Maqsad        yagona nosozlik nuqtasini yo'qotish + o'qish yukini ajratish
Asinxron      COMMIT darhol qaytadi · TEZ · failover'da ma'lumot YO'QOLADI
Sinxron       replika tasdig'ini kutadi · ma'lumot yo'qolmaydi · sekinroq
              yagona sinxron replika yiqilsa YOZISH TO'XTAYDI → ANY 1
Lag           yozgandan keyin darhol o'qish → 404 · read-your-writes kerak
Replikadan    analitika · hisobot · tarix · qidiruv
Primary'dan   BALANS · limit · idempotency · qaror qabul qilinadigan har o'qish
Failover      promote → ilova qayta ulanadi · fencing/quorum SHART
Split brain   ikki primary → ma'lumot ajraladi → birlashtirib bo'lmaydi
Monitoring    lag > 5s alert · > 30s replikadan o'qishni o'chirish
```

---

# 5.16 · Zaxira va tiklash (PITR)

## Nima va nega

> **Zaxira nusxa tiklab ko'rilmaguncha — u mavjud emas.**

Fintech'da bu shunchaki IT-gigiyena emas: moliyaviy ma'lumotni yo'qotish
regulyator sanksiyasi va litsenziya yo'qotilishi demak.

## Zaxira turlari

```
   ┌─ Logical (pg_dump) ─────────────────────────────────────┐
   │  SQL yoki maxsus format · versiyalar aro ko'chirish     │
   │  ⚠ Sekin tiklanadi · PITR YO'Q · katta DB uchun yaramas │
   └──────────────────────────────────────────────────────────┘

   ┌─ Physical (pg_basebackup) ──────────────────────────────┐
   │  Fayl darajasida nusxa · tez tiklanadi                   │
   │  WAL arxivi bilan birga → PITR MUMKIN                    │
   │  ⚠ Bir xil PostgreSQL versiyasi kerak                    │
   └──────────────────────────────────────────────────────────┘
```

## PITR — vaqtning istalgan nuqtasiga tiklash

```
   Bazaviy nusxa (yakshanba 00:00)
        │
        ├──── WAL segmentlari ketma-ket arxivlanadi ────────►
        │      │      │      │      │      │      │
       00:00  04:00  08:00  12:00  14:37  16:00  20:00
                                     ▲
                                     │
                          "14:37 da noto'g'ri UPDATE bajarildi"
                                     │
   Tiklash: bazaviy nusxa + WAL'ni 14:36:59 gacha qo'llash
            → DB aynan o'sha lahzadagi holatga qaytadi
```

```bash
# WAL arxivlash (postgresql.conf)
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
wal_level = replica

# Bazaviy nusxa
pg_basebackup -D /backup/base -Fp -Xs -P

# Tiklash (recovery.signal + postgresql.conf)
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2026-08-04 14:36:59+05'
recovery_target_action = 'promote'
```

Amalda `pgBackRest` yoki `WAL-G` ishlatiladi — ular siqish, shifrlash, parallel
yuklash va saqlashni boshqaradi.

## RPO va RTO

```
   ┌──────────────────────────────────────────────────────────┐
   │  RPO (Recovery Point Objective)                          │
   │  "Qancha ma'lumot yo'qolishi mumkin?"                    │
   │  → zaxira/WAL arxivlash CHASTOTASI bilan belgilanadi     │
   │                                                           │
   │  RTO (Recovery Time Objective)                           │
   │  "Qancha vaqtda tiklanishimiz kerak?"                    │
   │  → tiklash JARAYONI tezligi bilan belgilanadi            │
   └──────────────────────────────────────────────────────────┘

   Fintech uchun tipik maqsad:
       RPO ≈ 0        (sinxron replika + uzluksiz WAL arxivlash)
       RTO < 15 daq   (mashq qilingan, avtomatlashtirilgan tiklash)
```

## 3-2-1 qoidasi

```
   3  nusxa    (asl + 2 zaxira)
   2  turli muhit  (lokal disk + obyekt saqlash)
   1  boshqa joyda (boshqa region / datacenter)
```

## Zaxira replikani almashtirmaydi

```
   ┌────────────────┬──────────────────────────────────────────┐
   │  Replika       │  Nosozlikdan himoya (server yiqildi)     │
   │                │  ⚠ Xatoni DARHOL takrorlaydi:            │
   │                │    DROP TABLE primary'da → replikada ham │
   ├────────────────┼──────────────────────────────────────────┤
   │  Zaxira        │  XATODAN himoya (noto'g'ri UPDATE,       │
   │                │  o'chirish, buzilish, ransomware)        │
   └────────────────┴──────────────────────────────────────────┘

   Ikkalasi ham KERAK. Biri ikkinchisini almashtirmaydi.
```

## Tiklashni mashq qilish

```
   Har chorakda (kamida):
   1. Ishlab chiqarish zaxirasidan alohida muhitga tiklash
   2. Ma'lumot butunligini tekshirish (ledger Δ = 0, qatorlar soni)
   3. RTO ni o'lchash — haqiqatan qancha vaqt ketdi
   4. Natijani hujjatlashtirish

   ⚠ Tiklab ko'rilmagan zaxira — bu FARAZ, kafolat emas.
     Tipik nosozliklar: siqilgan fayl buzuq, WAL segmenti yetishmaydi,
     shifrlash kaliti yo'qolgan, tiklash 6 soat davom etadi.
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Zaxirani hech qachon tiklab ko'rmaslik | Kerak bo'lganda ishlamaydi |
| Faqat `pg_dump` ga tayanish | PITR yo'q, tiklash sekin |
| WAL arxivini saqlamaslik | Faqat zaxira lahzasiga tiklanadi |
| Zaxirani bir xil serverda saqlash | Disk yiqilsa hammasi ketadi |
| Shifrlash kalitini zaxira yonida saqlash | Kalit ham yo'qoladi |
| Zaxira monitoring'i yo'q | Ular haftalar davomida bajarilmayotgan bo'lishi mumkin |
| Replikani zaxira deb hisoblash | `DROP TABLE` ikkalasiga ham tarqaladi |

## Fintech konteksti

- **Saqlash muddati** — regulyator talabi bo'yicha odatda 5–10 yil. Bu zaxira emas,
  **arxiv** — alohida siyosat va arzon saqlash.
- **Shifrlash** — zaxira nusxalari shifrlangan bo'lishi shart (PII, karta
  ma'lumotlari). Kalitlar alohida joyda (KMS).
- **Kirish nazorati** — zaxirani o'chirish huquqi juda cheklangan bo'lsin;
  ransomware birinchi navbatda zaxiralarni qidiradi. Immutable/WORM saqlash.
- **Ledger tekshiruvi** — tiklashdan keyin birinchi ish: `SUM(DR) = SUM(CR)`.

## Intervyu savollari

**1. Zaxira strategiyangizni tasvirlab bering.**

> Uch qatlam:
> 1. **Sinxron replika** — nosozlikdan himoya, RPO ≈ 0.
> 2. **Kunlik bazaviy nusxa + uzluksiz WAL arxivlash** — PITR imkoni, ya'ni
>    istalgan lahzaga qaytish.
> 3. **Boshqa regionda nusxa** — 3-2-1 qoidasi.
>
> Va eng muhimi: **har chorakda tiklashni mashq qilish**. Tiklab ko'rilmagan zaxira
> mavjud emas.

**2. PITR nima uchun kerak, kunlik zaxira yetarli emasmi?**

> Yetarli emas. Klassik holat: soat 14:37 da noto'g'ri `UPDATE` bajarildi va u 5
> million qatorni buzdi. Kunlik zaxira 00:00 dagi — 14 soatlik ish yo'qoladi.
>
> PITR bilan bazaviy nusxa ustiga WAL 14:36:59 gacha qo'llanadi va DB aynan o'sha
> lahzaga qaytadi.
>
> Bu WAL arxivlash yoqilgan bo'lishini talab qiladi.

**3. Replika zaxirani almashtiradimi?**

> Yo'q, ular **turli xavflardan** himoya qiladi.
>
> Replika — **nosozlikdan**: server yiqilsa ish davom etadi. Lekin u xatoni darhol
> takrorlaydi: primary'da `DROP TABLE` bajarilsa, replikada ham bajariladi.
>
> Zaxira — **xatodan**: noto'g'ri o'zgartirish, tasodifan o'chirish, buzilish,
> ransomware. Faqat u vaqtda orqaga qaytish imkonini beradi.

**4. RPO va RTO nima?**

> **RPO** — qancha ma'lumot yo'qolishi mumkin. Bu zaxira va WAL arxivlash
> chastotasi bilan belgilanadi.
>
> **RTO** — qancha vaqtda tiklanishimiz kerak. Bu tiklash jarayonining tezligi.
>
> Fintech'da odatiy maqsad: RPO ≈ 0 (sinxron replika + uzluksiz WAL) va RTO
> 15 daqiqagacha (mashq qilingan, avtomatlashtirilgan tiklash).
>
> Bu raqamlar biznes bilan kelishiladi va SLA'da yoziladi.

## Deliverable

```bash
#!/usr/bin/env bash
# database/ops/restore-drill.sh — chorakda bir marta bajariladi
set -euo pipefail

TARGET_TIME="${1:?Vaqt kiriting: '2026-08-04 14:36:59+05'}"
START=$(date +%s)

echo "1/4 Zaxirani tiklash..."
pgbackrest --stanza=fintech --type=time \
           --target="$TARGET_TIME" --target-action=promote restore

echo "2/4 Butunlikni tekshirish..."
psql -c "SELECT count(*) FROM ledger_entries;"
psql -c "SELECT sum(CASE direction WHEN 'DR' THEN amount_minor
                                   ELSE -amount_minor END) AS delta
         FROM ledger_entries;"     # 0 bo'lishi SHART

echo "3/4 Oxirgi tranzaksiya vaqti:"
psql -c "SELECT max(created_at) FROM ledger_entries;"

echo "4/4 RTO: $(( $(date +%s) - START )) soniya"
```

```csharp
[Fact(Skip = "Chorakda qo'lda bajariladi")]
public async Task RestoreDrill_MeetsRto()
{
    var sw = Stopwatch.StartNew();
    await RestoreFromBackup(targetTime: DateTimeOffset.UtcNow.AddHours(-1));
    sw.Stop();

    Assert.True(sw.Elapsed < TimeSpan.FromMinutes(15));       // RTO
    Assert.Equal(0, await LedgerDelta());                     // butunlik
    Assert.True(await RowCount("ledger_entries") > 0);
}
```

## Xotira kartasi

```
Qoida         tiklab ko'rilmagan zaxira — MAVJUD EMAS
Turlari       logical (pg_dump) — sekin, PITR yo'q
              physical (basebackup + WAL) — tez, PITR bor
PITR          bazaviy nusxa + WAL → ISTALGAN lahzaga qaytish
              wal_level=replica · archive_mode=on · recovery_target_time
RPO           qancha ma'lumot yo'qoladi → zaxira chastotasi (maqsad ≈ 0)
RTO           qancha vaqtda tiklanadi → jarayon tezligi (maqsad < 15 daq)
3-2-1         3 nusxa · 2 muhit · 1 boshqa joyda
Replika ≠ zaxira  replika XATONI takrorlaydi (DROP TABLE ikkalasida)
Vositalar     pgBackRest · WAL-G — siqish, shifrlash, parallel
Mashq         chorakda bir marta · butunlik: ledger Δ = 0 · RTO o'lchanadi
Fintech       shifrlash + KMS · immutable saqlash (ransomware) · 5–10 yil arxiv
```

---

## M5 — yakuniy tekshiruv ro'yxati

Quyidagi savollarga **kodsiz, og'zaki** javob bera olsangiz — bo'lim yopilgan:

- [ ] ACID'ning qaysi harfi ilova dasturchisiga qaror qoldiradi va nega
- [ ] `COMMIT` paytida aniq nima sodir bo'ladi
- [ ] Read Committed'da qaysi uch anomaliya qoladi
- [ ] Lost update'ni chizib ko'rsatish va uchta yechimni narxi bilan aytish
- [ ] Optimistic va pessimistic orasidagi tanlovni **konflikt ehtimoli** bilan asoslash
- [ ] `SKIP LOCKED` nima uchun kerakligi
- [ ] Deadlock'ni kamaytirishning to'rt chorasi
- [ ] `WHERE UPPER(name) = 'X'` nega indeksni o'chirishi
- [ ] Composite indeksda tenglik va oraliq shartlarining tartibi
- [ ] MVCC nima beradi va table bloat qanday paydo bo'ladi
- [ ] `EXPLAIN` da birinchi navbatda nimaga qaraysiz
- [ ] Qachon ataylab denormalizatsiya qilasiz
- [ ] Nega `UNIQUE` constraint idempotentlik uchun kerak
- [ ] «Timeout obtaining a connection from the pool» — nima qilasiz
- [ ] Zero-downtime migratsiyaning uch bosqichi
- [ ] Partitioning va sharding farqi
- [ ] Read replica'dan nimani o'qish mumkin emas
- [ ] RPO va RTO nima, replika zaxirani almashtiradimi

**Deliverable'lar:**

- [ ] `LostUpdateTests` — 4 ta test (naive / atomik / pessimistic / optimistic)
- [ ] `DeadlockTests` — tartibsiz vs tartibli qulflash
- [ ] `ConstraintTests` — manfiy summa, dublikat kalit, append-only himoyasi
- [ ] `ConnectionPoolTests` — ulanish qaytarilishi, pool tugashi
- [ ] `09-explain-lab.sql` — `EXPLAIN` tajribalari va xulosalari
- [ ] `mvcc-health.sql` — o'lik qatorlar, uzoq tranzaksiyalar, wraparound
- [ ] `restore-drill.sh` — chorakda bajariladigan tiklash mashqi
