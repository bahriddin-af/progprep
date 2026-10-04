# 7 · ACID

**Tranzaksiya** = bir butun deb qaraladigan amallar guruhi. Ali → Vali 100 ming:

```sql
UPDATE accounts SET balance = balance - 100000 WHERE id = 'ALI';
UPDATE accounts SET balance = balance + 100000 WHERE id = 'VALI';
COMMIT;
```

| Harf | Nomi | Bir gapda | Bank misoli | Oracle'da |
|---|---|---|---|---|
| **A** | Atomicity | Hammasi yoki hech narsa | Ali'dan yechilib, Vali'ga tushmasa, hammasi bekor | UNDO, `ROLLBACK` |
| **C** | Consistency | Qoidalar buzilmaydi | Qoldiq manfiy bo'lmaydi, umumiy summa o'zgarmaydi | Constraint'lar |
| **I** | Isolation | Bir-biriga xalaqit bermaydi | Boshqalar yarim o'tkazmani ko'rmaydi | Lock, UNDO, READ COMMITTED |
| **D** | Durability | COMMIT'dan keyin yo'qolmaydi | Server o'chsa ham pul joyida | Redo log |

---

## A · Atomicity

```
 ❌ Atomicity bo'lmasa:  Ali -100k ✅ · ⚡ svet o'chdi · Vali +100k ❌ → 100 ming yo'qoldi
 ✅ Atomicity bilan:     Oracle 1-amalni ham BEKOR qiladi → Ali'ning puli joyida
```

### Tayyorgarlik

```sql
CREATE TABLE accounts (
   id       VARCHAR2(10) PRIMARY KEY,
   balance  NUMBER(18,2) CHECK (balance >= 0)
);
INSERT INTO accounts VALUES ('ALI',  500000);
INSERT INTO accounts VALUES ('VALI', 200000);
COMMIT;
```

### 1-misol: qo'lda ROLLBACK (faqat ko'rsatish uchun)

```sql
UPDATE accounts SET balance = balance - 100000 WHERE id = 'ALI';
UPDATE accounts SET balance = balance + 100000 WHERE id = 'VALI';
ROLLBACK;
SELECT * FROM accounts;   -- ALI 500 000, VALI 200 000
```

### 2-misol: o'tkazma o'rtasida xato

```sql
CREATE OR REPLACE PROCEDURE transfer (p_from VARCHAR2, p_to VARCHAR2, p_amount NUMBER) IS
BEGIN
   UPDATE accounts SET balance = balance - p_amount WHERE id = p_from;
   DBMS_OUTPUT.PUT_LINE('1-amal bajarildi: ' || p_from || ' -' || p_amount);

   UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;
   IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20001, 'Qabul qiluvchi hisob topilmadi: ' || p_to);
   END IF;

   COMMIT;
EXCEPTION
   WHEN OTHERS THEN
      ROLLBACK;
      DBMS_OUTPUT.PUT_LINE('Xato: ' || SQLERRM || ' → hammasi bekor qilindi');
      RAISE;
END;
/
BEGIN transfer('ALI', 'SOLI', 100000); END;   -- SOLI yo'q → ALI 500 000 qoladi
/
```

### 3-misol: CHECK buzilsa (A + C birga)

`transfer('ALI', 'VALI', 1000000)` → `ORA-02290` → ROLLBACK → hech narsa o'zgarmaydi.

### SAVEPOINT

```sql
UPDATE ... ALI;
SAVEPOINT after_ali;
UPDATE ... VALI;
ROLLBACK TO after_ali;   -- faqat VALI o'zgarishi bekor
```

### ROLLBACK'ni kim qiladi? (3 holat)

`ROLLBACK` real kodda shartsiz yozilmaydi, faqat `EXCEPTION` blokida.

| Holat | Kim bekor qiladi | Qanday |
|---|---|---|
| Kodda xato | **Dasturchi** | `EXCEPTION` blokida `ROLLBACK` |
| Svet o'chdi, server qulab tushdi | **Oracle avtomatik** | Instance recovery: redo + UNDO |
| Ilova qulab tushdi, ulanish uzildi | **Oracle avtomatik** | PMON |

```
 Redo log:  Tranzaksiya #1: ... COMMIT ✅   → saqlanadi (Durability)
            Tranzaksiya #2: ALI -100k ...    → COMMIT yo'q → UNDO bilan bekor (Atomicity)
```

**Svet o'chganda exception chiqmaydi:** server shunchaki to'xtaydi, `EXCEPTION` bloki ishlamaydi. Xatoni **ilova** ko'radi: `ORA-03113: end-of-file on communication channel` / `Connection reset`.

**Server yonganda kod davom etmaydi:** tugallanmagan tranzaksiya bekor qilinadi, ikkinchi `UPDATE` va `COMMIT` o'z-o'zidan bajarilmaydi. O'tkazmani foydalanuvchi yoki ilova **boshidan** qayta yuboradi.

**COMMIT paytida uzilish:** ilova commit bo'lganini bilmaydi. Qayta yuborsa, pul ikki marta o'tishi mumkin → har o'tkazmaga **noyob ID**, qayta yuborishdan oldin tekshirish (**idempotentlik**).

> "Atomicity tranzaksiya to'liq bajarilishi yoki to'liq bekor bo'lishini anglatadi. Kodda xato chiqsa, `EXCEPTION`da o'zim `ROLLBACK` qilaman. Server qulab tushsa yoki ulanish uzilsa, Oracle commit qilinmagan tranzaksiyalarni o'zi bekor qiladi: instance recovery'da redo o'qiladi, commit qilinganlari tiklanadi, qolganlari UNDO bilan bekor qilinadi."

---

## C · Consistency

Futbol hakami kabi: qoida buzilsa, harakat hisobga olinmaydi. Tranzaksiya bazani bir to'g'ri holatdan boshqa to'g'ri holatga o'tkazadi.

| Constraint | Qoida | Bank misoli |
|---|---|---|
| `CHECK` | Shartga mos | Qoldiq manfiy emas |
| `NOT NULL` | Bo'sh emas | Hisob raqami albatta bor |
| `PRIMARY KEY` | Noyob + bo'sh emas | Bir xil ID'li ikki hisob yo'q |
| `UNIQUE` | Takrorlanmaydi | Hisob raqami noyob |
| `FOREIGN KEY` | Bog'liq yozuv mavjud | Hisob mavjud mijozga tegishli |

```sql
CREATE TABLE clients (id NUMBER PRIMARY KEY, name VARCHAR2(100) NOT NULL);
CREATE TABLE accounts (
   id          VARCHAR2(10) PRIMARY KEY,
   client_id   NUMBER NOT NULL REFERENCES clients(id),
   acc_number  VARCHAR2(20) UNIQUE NOT NULL,
   balance     NUMBER(18,2) CHECK (balance >= 0)
);
```

| Sinov | Xato |
|---|---|
| Qoldiqdan ko'p yechish | `ORA-02290` check constraint violated |
| Mavjud bo'lmagan mijozga hisob | `ORA-02291` parent key not found |
| Bir xil hisob raqami | `ORA-00001` (`DUP_VAL_ON_INDEX`) |
| Hisobi bor mijozni o'chirish | `ORA-02292` child record found |

Constraint'ga sig'maydigan biznes qoidalar (summa > 0, o'ziga o'tkazmaslik) PL/SQL'da `RAISE_APPLICATION_ERROR` bilan tekshiriladi. Umumiy summa o'zgarmasligi = ikki yoqlama yozuv (debet = kredit).

> "Consistency tranzaksiya bazani bir to'g'ri holatdan boshqasiga o'tkazishini anglatadi. Oracle'da constraint'lar: `CHECK`, `NOT NULL`, `PRIMARY KEY`, `UNIQUE`, `FOREIGN KEY`. Masalan, `CHECK (balance >= 0)` bo'lsa, qoldiqdan ko'p yechib bo'lmaydi. Qolgan biznes qoidalarni PL/SQL'da tekshiraman."

---

## I · Isolation

5 ta kassa bir vaqtda ishlaydi, har biri alohida xonadagidek: boshqasining chala ishini ko'rmaydi.

### 1-holat: commit qilinmagan o'zgarish ko'rinmaydi

```
 Vaqt   SESSION 1 (kassir)                SESSION 2 (hisobot)
 10:00  UPDATE ALI -100k (commit yo'q)
 10:01                                    SELECT → 500 000 ✅ (eski, UNDO'dan)
 10:02  SELECT → 400 000 (o'zi ko'radi)
 10:03  COMMIT;
 10:04                                    SELECT → 400 000
```

Dirty read Oracle'da **yo'q**. O'quvchi eski versiyani **UNDO**dan oladi (read consistency) va kutmaydi.

### 2-holat: ikkalasi bir qatorni o'zgartirmoqchi → row lock 🔒

```
 10:00  UPDATE ALI -100k  🔒
 10:01                                    UPDATE ALI -50k  ⏳ kutyapti
 10:02  COMMIT; 🔓                        ✅ bajarildi → 350 000
```

```
 O'quvchi ↔ Yozuvchi: bloklamaydi · Yozuvchi ↔ Yozuvchi: BLOKLAYDI
```

### 3-holat: Lost update ⚠️

```
 10:00  SELECT → 500 000
 10:01                                    SELECT → 500 000
 10:02  UPDATE SET balance = 400 000; COMMIT
 10:04                                    UPDATE SET balance = 450 000; COMMIT
 Natija 450 000 ❌ (to'g'risi 350 000)
```

Yechim: `SELECT ... FOR UPDATE` (o'qishda qulflash) yoki `UPDATE ... SET balance = balance - X` (bitta buyruqda).

```sql
FOR UPDATE NOWAIT;        -- kutmasdan xato (ORA-00054)
FOR UPDATE WAIT 5;        -- 5 soniya kutadi
FOR UPDATE SKIP LOCKED;   -- qulflanganlarni o'tkazib yuboradi
```

### Isolation darajalari

| Muammo | Nima |
|---|---|
| Dirty read | Commit qilinmagan ma'lumot o'qiladi |
| Non-repeatable read | Bir qator 2 marta o'qilsa, har xil |
| Phantom read | So'rov 2 marta bajarilsa, yangi qatorlar |

| Daraja | Dirty | Non-repeatable | Phantom | Oracle |
|---|---|---|---|---|
| Read Uncommitted | bo'ladi | bo'ladi | bo'ladi | yo'q |
| **Read Committed** | yo'q | bo'ladi | bo'ladi | ✅ **default** |
| Repeatable Read | yo'q | yo'q | bo'ladi | yo'q |
| **Serializable** | yo'q | yo'q | yo'q | ✅ |

```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET TRANSACTION READ ONLY;
```

> "Isolation parallel tranzaksiyalar bir-biriga xalaqit bermasligini anglatadi. Oracle'da default READ COMMITTED: faqat commit qilingan ma'lumot ko'rinadi, dirty read yo'q. O'quvchi eski versiyani UNDO'dan oladi, o'quvchi va yozuvchi bir-birini bloklamaydi. Bir qatorni ikki session o'zgartirsa, row lock ishlaydi. Lost update'ni `SELECT ... FOR UPDATE` bilan oldini olaman. Oracle READ COMMITTED, SERIALIZABLE va READ ONLY'ni qo'llaydi."

---

## D · Durability

Kassirning **chek daftari** kabi: pul berilgach, yozuv daftarga tushadi. Kassa kompyuteri buzilsa ham daftar bo'yicha hammasi tiklanadi.

**COMMIT** = "Commit complete" qaytdi → o'zgarish **yo'qolmaydi** (svet o'chsa, server qulasa ham).

### COMMIT paytida nima bo'ladi?

```
 UPDATE ALI -100k
   ├─ Buffer cache (xotira)    : blok o'zgardi        ← data file'ga hali YOZILMAGAN
   ├─ UNDO                     : eski qiymat 500 000
   └─ Redo log buffer (xotira) : "ALI -100k" yozuvi

 COMMIT
   └─ LGWR → redo log buffer'ni DISKdagi online redo log faylga yozadi
      ✅ yozib bo'lgach, ilovaga "Commit complete" qaytadi

 Keyinroq (o'z vaqtida)
   └─ DBWn → o'zgargan bloklarni data file'larga yozadi
```

**Asosiy fikr:** COMMIT data file'ni kutmaydi, faqat **redo**ni diskka yozadi.

| Savol | Javob |
|---|---|
| Nega data file emas, redo? | Redo kichik va **ketma-ket** (sequential) yoziladi, tez. Data bloklar diskning turli joylarida (random I/O), sekin |
| Data file'ga yozilmagan, svet o'chdi? | Redo diskda bor → qayta tiklanadi |
| Kim yozadi? | **LGWR** (Log Writer) redo'ni · **DBWn** (Database Writer) data bloklarni |

### Svet o'chdi → Instance recovery (SMON)

```
 Redo log:  Tx #1: ALI -100k, VALI +100k, COMMIT ✅
            Tx #2: SOLI -50k ...              (COMMIT yo'q)

 Server yondi → SMON:
   1. Roll forward : redo'dagi o'zgarishlarni qayta qo'llaydi     → Tx #1 tiklandi (Durability)
   2. Roll back    : commit bo'lmaganini UNDO bilan bekor qiladi  → Tx #2 bekor (Atomicity)
```

### Redo va UNDO farqi (ko'p so'raladi!)

| | **Redo** | **UNDO** |
|---|---|---|
| Nimani saqlaydi | **Yangi** qiymat (nima qilindi) | **Eski** qiymat (oldin nima edi) |
| Maqsad | Qayta **bajarish** (tiklash) | **Bekor** qilish, eski versiyani o'qish |
| ACID | **D** | **A**, **I** (read consistency) |
| Qayerda | Online redo log fayllar | UNDO tablespace |

### Disk buzilsa? (media failure)

Svet o'chishi bir narsa, disk butunlay buzilishi boshqa. Bankda qo'shimcha himoya:

| Himoya | Nima qiladi |
|---|---|
| **Multiplexing** | Har redo log guruhida 2+ nusxa, turli disklarda |
| **ARCHIVELOG** rejimi | To'lgan redo log'lar arxivlanadi (ARCn), ustidan yozilmaydi |
| **RMAN backup** | Backup + arxiv log'lar → istalgan vaqtga tiklash |
| **Data Guard** | Boshqa joydagi zaxira (standby) baza, redo u yerga ham yuboriladi |

### Durability'ni kuchsizlantirish (bankda ishlatilmaydi)

```sql
COMMIT WRITE BATCH NOWAIT;   -- LGWR'ni kutmaydi → tez, lekin crash'da oxirgi commit yo'qolishi mumkin
```

Default `COMMIT` = `WRITE IMMEDIATE WAIT` → to'liq durability. Pul bilan ishlashda faqat shu.

> "Durability commit qilingan ma'lumot server qulab tushsa ham yo'qolmasligini anglatadi. Oracle'da COMMIT paytida LGWR redo log'ni diskka yozadi va shundan keyingina 'commit complete' qaytadi. Data file'larni keyinroq DBWn yozadi. Svet o'chsa, instance recovery'da SMON redo'ni qayta qo'llaydi, commit bo'lmaganini UNDO bilan bekor qiladi. Disk buzilishidan redo multiplexing, ARCHIVELOG, RMAN backup va Data Guard himoya qiladi. Masalan, Ali Vali'ga 100 ming o'tkazdi, commit bo'ldi va shu soniyada svet o'chdi: server yonganda o'tkazma joyida bo'ladi."

---

## ACID to'liq javob (30 soniya)

> "ACID tranzaksiyaning 4 xususiyati. **Atomicity**: hammasi yoki hech narsa, Oracle UNDO bilan bekor qiladi. **Consistency**: constraint'lar bazani to'g'ri holatda saqlaydi, masalan qoldiq manfiy bo'lmaydi. **Isolation**: parallel tranzaksiyalar bir-birining commit qilinmagan o'zgarishini ko'rmaydi, Oracle'da default READ COMMITTED, lock va UNDO bilan. **Durability**: commit'dan keyin ma'lumot yo'qolmaydi, chunki redo log diskka yoziladi. Bank misolida: Ali Vali'ga pul o'tkazsa, yo ikkala amal bajariladi, yo hech biri; qoldiq manfiy bo'lmaydi; boshqalar yarim o'tkazmani ko'rmaydi; commit bo'lgach svet o'chsa ham pul joyida."

---

## Tekshiruv savollari

1. Atomicity'ni Oracle qanday ta'minlaydi? Svet o'chsa nima bo'ladi?
2. Consistency'ni nima ta'minlaydi? 3 ta constraint ayting.
3. Session 1 commit qilmadi, Session 2 SELECT qildi: qaysi qiymat va qayerdan?
4. Lost update nima va qanday oldini olasiz?
5. Oracle'ning default isolation darajasi?
6. COMMIT paytida diskka nima yoziladi? Data file'lar qachon yoziladi?
7. Redo va UNDO farqi?
8. Svet o'chdi: SMON qaysi 2 qadamni bajaradi?

**Manba:** [Data Concurrency and Consistency](https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/data-concurrency-and-consistency.html)
