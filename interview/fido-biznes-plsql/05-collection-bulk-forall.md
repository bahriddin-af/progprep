# 5 · Collection, BULK COLLECT, FORALL

## O'xshatish

```
 Oddiy loop:      🚶📦 → 🚶📦 → 🚶📦 → ... (1000 marta)
 BULK / FORALL:   🚶🛒[📦📦📦📦📦📦...] → (1 marta)
```

**Araba** = collection · **yuklash** = `BULK COLLECT` · **tushirish** = `FORALL`.

```
 100 000 ta context switch → SEKIN 🐢     FORALL: 1 ta context switch → TEZ 🚀
```

## Collection'ning 3 turi

| | Associative array | Nested table | VARRAY |
|---|---|---|---|
| E'lon | `TABLE OF ... INDEX BY` | `TABLE OF ...` | `VARRAY(n) OF ...` |
| Indeks | Son **yoki matn** | Son | Son |
| Hajm | Cheksiz | Cheksiz | **Maksimum belgilangan** |
| Initsializatsiya | Kerak emas | Kerak (yoki BULK COLLECT) | Kerak |
| Jadvalda saqlash | ❌ | ✅ | ✅ |
| Qachon | Lookup / kesh | **BULK COLLECT** | Kichik aniq ro'yxat |

```sql
TYPE t_rates IS TABLE OF NUMBER INDEX BY VARCHAR2(3);   -- v_rate('USD') := 12650;
TYPE t_list  IS TABLE OF NUMBER;                        -- t_list(101, 102); .EXTEND
TYPE t_phones IS VARRAY(3) OF VARCHAR2(13);
```

Metodlar: `.COUNT`, `.FIRST/.LAST`, `.EXTEND`, `.DELETE`, `.EXISTS(i)`.

## BULK COLLECT

```sql
DECLARE
   TYPE t_acc IS TABLE OF accounts%ROWTYPE;
   v_accs  t_acc;
BEGIN
   SELECT * BULK COLLECT INTO v_accs FROM accounts WHERE currency = 'UZS';
   DBMS_OUTPUT.PUT_LINE(v_accs.COUNT || ' ta hisob');
END;
```

Qator topmasa `NO_DATA_FOUND` **chiqmaydi**, `COUNT = 0` bo'ladi.

## LIMIT (katta hajm, PGA to'lmasin)

⚠️ `LIMIT`ni `SELECT ... BULK COLLECT INTO` bilan yozib **bo'lmaydi**, faqat explicit cursor'dan `FETCH`da ishlaydi.

```sql
DECLARE
   CURSOR c IS SELECT id FROM accounts;
   TYPE t_ids IS TABLE OF accounts.id%TYPE;
   v_ids  t_ids;
BEGIN
   OPEN c;
   LOOP
      FETCH c BULK COLLECT INTO v_ids LIMIT 1000;
      EXIT WHEN v_ids.COUNT = 0;                     -- %NOTFOUND emas!

      FORALL i IN 1 .. v_ids.COUNT
         UPDATE accounts SET balance = balance * 1.01 WHERE id = v_ids(i);
   END LOOP;
   CLOSE c;
   COMMIT;
END;
/
```

**Nega `%NOTFOUND` emas:** oxirgi paketda masalan 437 ta keladi, `%NOTFOUND` darhol TRUE bo'ladi va 437 ta ishlanmay qoladi.

| Holat | Usul |
|---|---|
| Qatorlar kam | `SELECT ... BULK COLLECT INTO` |
| Ko'p yoki noma'lum | `OPEN` → `FETCH ... LIMIT` → `CLOSE` |

Imkon bo'lsa, oddiy bitta SQL yaxshiroq: `UPDATE accounts SET balance = balance * 1.01;`

## FORALL

- loop emas: `LOOP / END LOOP` yo'q
- ichida faqat **bitta** DML
- `IF`, `DBMS_OUTPUT` yozib bo'lmaydi

## SAVE EXCEPTIONS

```sql
DECLARE
   e_bulk  EXCEPTION;
   PRAGMA EXCEPTION_INIT(e_bulk, -24381);
BEGIN
   FORALL i IN 1 .. v_rows.COUNT SAVE EXCEPTIONS
      INSERT INTO accounts VALUES v_rows(i);
EXCEPTION
   WHEN e_bulk THEN
      FOR j IN 1 .. SQL%BULK_EXCEPTIONS.COUNT LOOP
         DBMS_OUTPUT.PUT_LINE('Qator #' || SQL%BULK_EXCEPTIONS(j).ERROR_INDEX ||
            ' xato: ' || SQLERRM(-SQL%BULK_EXCEPTIONS(j).ERROR_CODE));
      END LOOP;
END;
```

## Real misol: kunlik foiz (background job yuragi)

```sql
DECLARE
   CURSOR c IS SELECT id, balance FROM accounts WHERE acc_type = 'DEPOSIT';
   TYPE t_ids IS TABLE OF accounts.id%TYPE;
   TYPE t_bal IS TABLE OF accounts.balance%TYPE;
   v_ids t_ids;  v_bal t_bal;
BEGIN
   OPEN c;
   LOOP
      FETCH c BULK COLLECT INTO v_ids, v_bal LIMIT 1000;
      EXIT WHEN v_ids.COUNT = 0;
      FORALL i IN 1 .. v_ids.COUNT
         UPDATE accounts
            SET balance = balance + ROUND(v_bal(i) * 0.18 / 365, 2)
          WHERE id = v_ids(i);
      COMMIT;
   END LOOP;
   CLOSE c;
END;
/
```

> "Oddiy loop'da har SQL uchun context switch bo'ladi. `BULK COLLECT` ko'p qatorni bir martada collection'ga oladi, `FORALL` bir martada DML qiladi. Katta hajmda `LIMIT` ishlataman va loop'dan `COUNT = 0` bilan chiqaman. Xatolar jarayonni to'xtatmasligi uchun `SAVE EXCEPTIONS`. Collection turlari: associative array, nested table, VARRAY."

**Manba:** [PL/SQL Optimization and Tuning](https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/plsql-optimization-and-tuning.html)
