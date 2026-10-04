# 14 · Tranzaksiya va sessiya

```
 SESSIYA (Ali login ──────────────────────────────── logout)
   ├── Tx 1: kommunal to'lov ── COMMIT ✅
   ├── Tx 2: o'tkazma ───────── ROLLBACK ❌
   └── Tx 3: o'tkazma ───────── COMMIT ✅
```

## Sessiya

Login'dan logout'gacha mantiqiy "suhbat". Ichida: foydalanuvchi, PGA, NLS sozlamalari, package o'zgaruvchilari, faol tranzaksiya va qulflar.

| Connection | Session |
|---|---|
| Fizik TCP kanal (telefon liniyasi) | Mantiqiy suhbat (liniyadagi gap) |

```sql
SELECT sid, serial#, username, status, machine, program FROM v$session WHERE username IS NOT NULL;
SELECT SYS_CONTEXT('USERENV', 'SID') FROM dual;
ALTER SYSTEM KILL SESSION '401,55';     -- commit qilinmagani ROLLBACK, qulflar ochiladi
```

`ACTIVE` = SQL bajaryapti, `INACTIVE` = ulangan, bo'sh.

Global Temporary Table: har sessiya faqat o'z qatorlarini ko'radi (`ON COMMIT PRESERVE ROWS` / `DELETE ROWS`).

## Tranzaksiya

⭐ Oracle'da `BEGIN TRANSACTION` **yo'q**: birinchi DML (yoki `SELECT ... FOR UPDATE`) bilan avtomatik boshlanadi. Oddiy `SELECT` boshlamaydi.

| Tugash | Natija |
|---|---|
| `COMMIT` | ✅ |
| `ROLLBACK` | ❌ |
| Har qanday **DDL** | ✅ yashirin COMMIT (oldin va keyin) |
| Normal chiqish (SQL*Plus `EXIT`) | ✅ odatda COMMIT ⚠️ |
| Nonormal (crash, KILL, svet) | ❌ ROLLBACK |

Sessiyada bir vaqtda **bitta** tranzaksiya (istisno: autonomous transaction).

```sql
SELECT s.sid, s.username, t.start_time, t.used_urec
  FROM v$transaction t JOIN v$session s ON s.taddr = t.addr;
```

## Uzoq ochiq tranzaksiya ⚠️

Commit'siz `UPDATE` qilib ketish → qulflar ushlanadi, boshqalar kutadi, UNDO to'ladi, `ORA-01555 snapshot too old`. Tranzaksiya iloji boricha qisqa.

## JDBC autocommit ⭐

JDBC'da default `autoCommit = true` → har buyruqdan keyin COMMIT → o'tkazmada Atomicity buziladi.

```java
conn.setAutoCommit(false);
try { /* UPDATE ALI; UPDATE VALI; */ conn.commit(); }
catch (SQLException e) { conn.rollback(); throw e; }
```

Spring: `@Transactional`. Eng xavfsizi: mantiq PL/SQL procedure'da, Java'dan bitta chaqiruv.

Connection pool: sessiya turli foydalanuvchilarga qayta beriladi → package o'zgaruvchilarida user holatini saqlamaslik (`DBMS_SESSION.RESET_PACKAGE`).

| | Sessiya | Tranzaksiya |
|---|---|---|
| Boshlanish | Login | Birinchi DML |
| Tugash | Logout, KILL, uzilish | COMMIT, ROLLBACK, DDL |
| Saqlaydi | PGA, NLS, package state | Qulflar, UNDO |
| Ko'rish | `V$SESSION` | `V$TRANSACTION` |

## Intervyuda shunday deysiz

> "Sessiya ulanishdan uzilishgacha bo'lgan mantiqiy suhbat: foydalanuvchi, NLS, PGA, package o'zgaruvchilari, `V$SESSION`. Tranzaksiya Oracle'da birinchi DML bilan avtomatik boshlanadi va `COMMIT`, `ROLLBACK` yoki DDL bilan tugaydi. Nonormal uzilishda rollback bo'ladi. Sessiyada bir vaqtda bitta tranzaksiya, istisno autonomous. Tranzaksiyalarni qisqa saqlayman. JDBC'da autocommit default yoqilgan, o'tkazmada uni o'chiraman yoki mantiqni PL/SQL'ga qo'yaman."

## Tekshiruv savollari

1. Sessiya va tranzaksiya farqi? Sessiyada nechta tranzaksiya?
2. Tranzaksiya qachon boshlanadi? `SELECT` boshlaydimi?
3. `UPDATE` → `CREATE TABLE` → `ROLLBACK`: UPDATE bekor bo'ladimi?
4. Commit'siz `UPDATE` qilib ketish muammosi?
5. JDBC `autoCommit = true` xavfi?

**Manba:** [Oracle Concepts – Transactions](https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/transactions.html)
