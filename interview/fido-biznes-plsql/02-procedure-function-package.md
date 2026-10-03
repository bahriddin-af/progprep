# 2 · Procedure, Function, Package (+ DML/DDL)

## O'xshatish

- **Procedure** buyruqni **bajaradigan** xodim: "101 dan 102 ga 500 ming o'tkaz."
- **Function** **javob beradigan** xodim: "101-hisob qoldig'i qancha?"
- **Package** **bo'lim**: bog'liq xizmatlar bitta joyda.

## Procedure

```sql
CREATE OR REPLACE PROCEDURE deposit (
   p_acc_id  IN  accounts.id%TYPE,
   p_amount  IN  NUMBER
) IS
BEGIN
   UPDATE accounts SET balance = balance + p_amount WHERE id = p_acc_id;
   COMMIT;
END deposit;
/
-- EXEC deposit(101, 500000);
```

## Function

```sql
CREATE OR REPLACE FUNCTION get_balance (p_acc_id IN accounts.id%TYPE)
RETURN NUMBER IS
   v_balance  accounts.balance%TYPE;
BEGIN
   SELECT balance INTO v_balance FROM accounts WHERE id = p_acc_id;
   RETURN v_balance;
END get_balance;
/
SELECT acc_number, get_balance(id) FROM accounts;   -- SQL ichida chaqiriladi
```

| | Procedure | Function |
|---|---|---|
| Qiymat qaytaradimi | Yo'q (`OUT` parametr orqali mumkin) | **Ha**, `RETURN` majburiy |
| SQL ichida | ❌ | ✅ (DML qilmasa) |
| Nima uchun | Amal bajarish | Hisoblash, qiymat olish |

## IN, OUT, IN OUT

```
 IN      ─── qiymat ──────────────────────►  (faqat o'qiydi; default)
 OUT     ◄────────────────────── natija ───  (faqat yozadi)
 IN OUT  ◄─── qiymat beriladi, o'zgarib qaytadi ───►
```

```sql
CREATE OR REPLACE PROCEDURE check_balance (
   p_acc_id IN NUMBER, p_balance OUT NUMBER, p_status OUT VARCHAR2
) IS
BEGIN
   SELECT balance INTO p_balance FROM accounts WHERE id = p_acc_id;
   p_status := CASE WHEN p_balance > 0 THEN 'ACTIVE' ELSE 'EMPTY' END;
END;
/
```

## Package

```
 ┌───────────────────────────────┐
 │  SPECIFICATION (spec)         │  ← "vitrina": tashqaridan nima ko'rinadi
 ├───────────────────────────────┤
 │  BODY                         │  ← "oshxona": kod + private qismlar
 └───────────────────────────────┘
```

```sql
CREATE OR REPLACE PACKAGE acc_pkg IS
   PROCEDURE deposit  (p_acc_id NUMBER, p_amount NUMBER);
   PROCEDURE withdraw (p_acc_id NUMBER, p_amount NUMBER);
   FUNCTION  get_balance (p_acc_id NUMBER) RETURN NUMBER;
END acc_pkg;
/
CREATE OR REPLACE PACKAGE BODY acc_pkg IS
   PROCEDURE write_log (p_msg VARCHAR2) IS          -- PRIVATE
   BEGIN
      INSERT INTO acc_log(msg, created_at) VALUES (p_msg, SYSDATE);
   END;

   PROCEDURE deposit (p_acc_id NUMBER, p_amount NUMBER) IS
   BEGIN
      UPDATE accounts SET balance = balance + p_amount WHERE id = p_acc_id;
      write_log('Deposit: ' || p_acc_id || ' +' || p_amount);
   END;

   PROCEDURE withdraw (p_acc_id NUMBER, p_amount NUMBER) IS
   BEGIN
      UPDATE accounts SET balance = balance - p_amount WHERE id = p_acc_id;
      write_log('Withdraw: ' || p_acc_id || ' -' || p_amount);
   END;

   FUNCTION get_balance (p_acc_id NUMBER) RETURN NUMBER IS
      v_bal NUMBER;
   BEGIN
      SELECT balance INTO v_bal FROM accounts WHERE id = p_acc_id;
      RETURN v_bal;
   END;
END acc_pkg;
/
-- acc_pkg.deposit(101, 500000);
```

**Package nima uchun kerak:**
1. Guruhlash
2. Inkapsulyatsiya (private qismlar)
3. Tezlik: birinchi chaqiruvda butunlay xotiraga yuklanadi
4. Faqat **body** o'zgarsa, bog'liq obyektlar invalid bo'lmaydi
5. Session state: package o'zgaruvchilari session davomida saqlanadi
6. Overloading: `find_acc(p_id NUMBER)` va `find_acc(p_number VARCHAR2)`

> "Package bog'liq procedure, function va o'zgaruvchilarni bitta modulga yig'adi: spec tashqi interfeys, body implementatsiya. Afzalliklari: inkapsulyatsiya, overloading, session state, bir marta yuklangani uchun tezlik. Body o'zgarganda bog'liq obyektlar invalid bo'lmaydi."

---

## DML, DDL, DCL, TCL

| Guruh | Nomi | Nima qiladi | Buyruqlar |
|---|---|---|---|
| **DML** | Data Manipulation | **Ma'lumot**ni o'zgartiradi | `INSERT`, `UPDATE`, `DELETE`, `MERGE` (+ `SELECT`) |
| **DDL** | Data Definition | **Struktura**ni o'zgartiradi | `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME` |
| **DCL** | Data Control | **Huquq** | `GRANT`, `REVOKE` |
| **TCL** | Transaction Control | **Tranzaksiya** | `COMMIT`, `ROLLBACK`, `SAVEPOINT` |

```
 DML: o'zgarish vaqtinchalik → COMMIT saqlaydi, ROLLBACK bekor qiladi
 DDL: avtomatik COMMIT → ROLLBACK qilib bo'lmaydi (oldingi DML ham commit bo'ladi!)
```

```sql
MERGE INTO accounts a
USING (SELECT 103 AS id, 700000 AS amt FROM dual) s
   ON (a.id = s.id)
 WHEN MATCHED THEN UPDATE SET a.balance = a.balance + s.amt
 WHEN NOT MATCHED THEN INSERT (id, balance) VALUES (s.id, s.amt);
```

### DELETE, TRUNCATE, DROP

| | DELETE | TRUNCATE | DROP |
|---|---|---|---|
| Turi | DML | DDL | DDL |
| Nimani | Qatorlar (`WHERE` bilan) | Barcha qatorlar | Jadvalning o'zini |
| `ROLLBACK` | ✅ | ❌ | ❌ (faqat `FLASHBACK`) |
| Tezlik | Sekin (undo yoziladi) | Juda tez | Tez |
| Trigger | ✅ ishlaydi | ❌ | ❌ |

DML qiladigan function'ni `SELECT` ichida chaqirib bo'lmaydi: `ORA-14551`.

**Manba:** [Oracle PL/SQL – Packages](https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/plsql-packages.html) · [Types of SQL Statements](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/Types-of-SQL-Statements.html)
