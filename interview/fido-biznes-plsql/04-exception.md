# 4 · Exception'lar

## O'xshatish

Bankomatda pul yetmasa, u o'chib qolmaydi: "Mablag' yetarli emas" deb chiqaradi. **Exception** = kod bajarilayotganda chiqqan xato, **exception handling** = uni ushlab, to'g'ri munosabat bildirish.

```
 BEGIN
   1-qadam ✅
   SELECT ... ❌ xato!  ─────────┐
   2-qadam  (o'tkazib yuboriladi) │
 EXCEPTION                       │
   WHEN NO_DATA_FOUND ◄──────────┘
 END;
```

## 3 turi

1. **Predefined** (nomi bor) · 2. **Nomsiz Oracle xatolari** (faqat raqam) · 3. **Foydalanuvchi exception'i**

## Predefined (yod oling)

| Nomi | Qachon | Kodi |
|---|---|---|
| `NO_DATA_FOUND` | `SELECT INTO` 0 qator | ORA-01403 |
| `TOO_MANY_ROWS` | `SELECT INTO` 2+ qator | ORA-01422 |
| `DUP_VAL_ON_INDEX` | Unique/PK takrorlandi | ORA-00001 |
| `ZERO_DIVIDE` | 0 ga bo'lish | ORA-01476 |
| `VALUE_ERROR` | Qiymat sig'madi / tur noto'g'ri | ORA-06502 |
| `INVALID_NUMBER` | SQL'da `'abc'` → son | ORA-01722 |
| `CURSOR_ALREADY_OPEN` | Ochiq cursor'ni qayta ochish | ORA-06511 |
| `OTHERS` | Boshqa har qanday (doim oxirida) | — |

`SQLCODE` xato raqami, `SQLERRM` xato matni.

## O'z exception'imiz

```sql
DECLARE
   e_insufficient_funds  EXCEPTION;
BEGIN
   IF v_balance < v_amount THEN
      RAISE e_insufficient_funds;
   END IF;
EXCEPTION
   WHEN e_insufficient_funds THEN
      DBMS_OUTPUT.PUT_LINE('Mablag'' yetarli emas');
END;
```

### RAISE_APPLICATION_ERROR (amalda shu)

```sql
RAISE_APPLICATION_ERROR(-20001, 'Mablag'' yetarli emas. Qoldiq: ' || v_balance);
```

Raqam faqat **-20000 … -20999**. Java `ORA-20001: ...` ni oladi.

## PRAGMA EXCEPTION_INIT

```sql
DECLARE
   e_child_exists  EXCEPTION;
   PRAGMA EXCEPTION_INIT(e_child_exists, -2292);
BEGIN
   DELETE FROM clients WHERE id = 5;
EXCEPTION
   WHEN e_child_exists THEN
      DBMS_OUTPUT.PUT_LINE('Mijozning hisoblari bor');
END;
```

## Propagation

Ichki blokda ushlanmagan xato tashqi blokka, u ham ushlamasa Java'ga ko'tariladi. Loop davom etishi uchun:

```sql
FOR r IN (SELECT id FROM accounts) LOOP
   BEGIN
      process_account(r.id);
   EXCEPTION
      WHEN OTHERS THEN log_error(r.id, SQLERRM);
   END;
END LOOP;
```

## Nimani qilmaslik kerak

```sql
WHEN OTHERS THEN NULL;     -- ❌ xato "yutib yuborildi", bankda eng xavfli
```

```sql
WHEN OTHERS THEN           -- ✅
   ROLLBACK;
   log_error(SQLCODE, SQLERRM, DBMS_UTILITY.FORMAT_ERROR_BACKTRACE);
   RAISE;                  -- o'zgartirmasdan qayta ko'tarish
```

## To'liq misol: withdraw

```sql
CREATE OR REPLACE PROCEDURE withdraw (p_acc_id IN accounts.id%TYPE, p_amount IN NUMBER) IS
   v_balance  accounts.balance%TYPE;
BEGIN
   IF p_amount <= 0 THEN
      RAISE_APPLICATION_ERROR(-20002, 'Summa musbat bo''lishi kerak');
   END IF;

   SELECT balance INTO v_balance FROM accounts WHERE id = p_acc_id FOR UPDATE;

   IF v_balance < p_amount THEN
      RAISE_APPLICATION_ERROR(-20001, 'Mablag'' yetarli emas');
   END IF;

   UPDATE accounts SET balance = balance - p_amount WHERE id = p_acc_id;
   COMMIT;
EXCEPTION
   WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20003, 'Hisob topilmadi: ' || p_acc_id);
   WHEN OTHERS THEN
      ROLLBACK;
      RAISE;
END withdraw;
/
```

> "Exception kod bajarilayotganda chiqadigan xato. Xato chiqsa, boshqaruv `EXCEPTION` bo'limiga o'tadi, ushlanmasa tashqi blokka ko'tariladi. Uch turi bor: `NO_DATA_FOUND`, `TOO_MANY_ROWS`, `DUP_VAL_ON_INDEX` kabi predefined; nomsiz Oracle xatolari, ularga `PRAGMA EXCEPTION_INIT` bilan nom beriladi; foydalanuvchi exception'lari. Biznes xatolarni ilovaga `RAISE_APPLICATION_ERROR` bilan yuboraman (-20000…-20999). `WHEN OTHERS THEN NULL` yozmayman: log qilib, `RAISE` bilan qayta ko'taraman."

**Manba:** [PL/SQL Error Handling](https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/plsql-error-handling.html)
