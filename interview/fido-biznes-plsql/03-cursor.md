# 3 · Cursor'lar (+ PGA, DBMS_OUTPUT)

## Qanday muammoni hal qiladi?

`SELECT INTO` faqat **1 ta qator** bilan ishlaydi. Mijozning 3 ta hisobi bo'lsa → `TOO_MANY_ROWS`. Yechim: qatorlarni **bittalab** olish. **Cursor** shuni qiladi: natija ustida yuradigan ko'rsatkich.

## O'xshatish: bankdagi navbat

```
  Navbat:   [Ali] [Vali] [Soli]
  "Keyingi!" → Ali · "Keyingi!" → Vali · "Keyingi!" → Soli · "Keyingi!" → hech kim → yopiladi
```

| Bank | Cursor |
|---|---|
| Navbat hosil bo'ladi | `OPEN` |
| "Keyingi!" | `FETCH` |
| "Hech kim yo'q" | `%NOTFOUND = TRUE` |
| Kassa yopiladi | `CLOSE` |

## Explicit cursor: 4 qadam

```sql
DECLARE
   CURSOR c IS SELECT id, balance FROM accounts WHERE client_id = 5;
   v_row  c%ROWTYPE;
BEGIN
   OPEN c;
   LOOP
      FETCH c INTO v_row;
      EXIT WHEN c%NOTFOUND;            -- FETCH'dan KEYIN
      DBMS_OUTPUT.PUT_LINE(v_row.id || ' -> ' || v_row.balance);
   END LOOP;
   CLOSE c;
END;
/
```

```
 OPEN:    ► (boshlanish)  101|1000  102|500  103|200
 FETCH 1: 101|1000 ◄   v_id=101
 FETCH 2: 102|500  ◄
 FETCH 3: 103|200  ◄
 FETCH 4:          ◄   %NOTFOUND = TRUE → EXIT
 CLOSE
```

## Atributlar

| Atribut | Ma'nosi |
|---|---|
| `%FOUND` | Oxirgi FETCH qator topdi |
| `%NOTFOUND` | Qator qolmadi |
| `%ROWCOUNT` | Nechta qator olindi |
| `%ISOPEN` | Ochiqmi (implicit'da doim FALSE) |

## Implicit cursor (`SQL`)

Oracle har bir DML va `SELECT INTO` uchun o'zi yaratadi:

```sql
UPDATE accounts SET balance = balance - 100 WHERE id = 999;
IF SQL%ROWCOUNT = 0 THEN
   RAISE_APPLICATION_ERROR(-20001, 'Hisob topilmadi');   -- UPDATE xato bermaydi!
END IF;
```

## Cursor FOR loop (90% hollarda)

```sql
FOR r IN (SELECT id, balance FROM accounts WHERE client_id = 5) LOOP
   DBMS_OUTPUT.PUT_LINE(r.id || ' -> ' || r.balance);
END LOOP;
```

FOR loop ham **cursor**: OPEN, FETCH, EXIT, CLOSE'ni Oracle o'zi bajaradi (10g+ ichida 100 tadan oladi).

## Parametrli cursor

```sql
CURSOR c_acc (p_cur VARCHAR2) IS SELECT * FROM accounts WHERE currency = p_cur;
FOR r IN c_acc('UZS') LOOP ... END LOOP;
FOR r IN c_acc('USD') LOOP ... END LOOP;
```

## SYS_REFCURSOR: natijani Java'ga berish

```sql
CREATE OR REPLACE PROCEDURE get_client_accounts (
   p_client IN NUMBER, p_result OUT SYS_REFCURSOR
) IS
BEGIN
   OPEN p_result FOR SELECT acc_number, balance FROM accounts WHERE client_id = p_client;
END;
/
```

## FOR UPDATE cursor

```sql
CURSOR c_acc IS SELECT id, balance FROM accounts WHERE currency = 'UZS' FOR UPDATE;
...
UPDATE accounts SET balance = balance * 1.01 WHERE CURRENT OF c_acc;
```

## FOR loop bo'lsa, explicit cursor nimaga kerak?

| Vaziyat | Nima ishlatiladi |
|---|---|
| Oddiy aylanib chiqish | ✅ FOR loop |
| Java'ga ro'yxat qaytarish | `SYS_REFCURSOR` (`OPEN ... FOR`) |
| Millionlab qator | Explicit cursor + `FETCH ... BULK COLLECT LIMIT` |
| Bir so'rovni turli parametr bilan | Nomli cursor (+ FOR loop) |
| Faqat 1-qator, xatosiz | OPEN / FETCH / CLOSE |

> "Cursor SQL natijasiga ko'rsatkich. Implicit cursor'ni Oracle har bir DML va `SELECT INTO` uchun yaratadi, uni `SQL%ROWCOUNT` bilan tekshiramiz. Explicit cursor ko'p qatorli so'rov uchun: `OPEN`, `FETCH`, `CLOSE`. Amalda FOR loop qulay. Explicit cursor boshqaruv kerak bo'lganda: `SYS_REFCURSOR` bilan ilovaga qaytarish, `BULK COLLECT ... LIMIT` bilan qismlab olish."

---

## PGA va SGA

```
 ┌────────────── SGA (barcha sessionlar uchun UMUMIY) ──────────────┐
 │  Buffer Cache (jadval bloklari) · Shared Pool (SQL plan, PL/SQL) │
 │  Redo Log Buffer                                                 │
 └──────────────────────────────────────────────────────────────────┘
   PGA (Ali)        PGA (Vali)        PGA (Java app)   ← har session'ga ALOHIDA
   o'zgaruvchilar, cursor holati, sort/hash maydoni, package state
```

- Katta `ORDER BY` PGA'ga sig'masa → TEMP'ga yoziladi → sekin
- `BULK COLLECT` LIMIT'siz → PGA to'lib ketadi
- Bind variable → plan SGA'da (Shared Pool) qayta ishlatiladi (soft parse)

> "SGA barcha sessionlar uchun umumiy xotira: buffer cache, shared pool, redo log buffer. PGA har bir server process uchun alohida: PL/SQL o'zgaruvchilari, cursor holati, sort va hash."

## DBMS_OUTPUT

Java'dagi `System.out.println()` o'xshashi. `PUT_LINE` ekranga emas, **buferga** yozadi, blok tugaganda klient ekranga chiqaradi. Ko'rish uchun `SET SERVEROUTPUT ON;` kerak. Production'da log jadval ishlatiladi.

**Manba:** [Static SQL (Cursors)](https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/static-sql.html) · [Memory Architecture](https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/memory-architecture.html) · [DBMS_OUTPUT](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_OUTPUT.html)
