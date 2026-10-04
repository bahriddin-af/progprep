# Fido-Biznes · PL/SQL developer intervyusiga tayyorgarlik

Intervyu: **dushanba, 2026-10-05**. Muqobil variant: IHMA (Ijtimoiy himoya milliy agentligi) IT markazi.

Oldingi nomzodga tushgan savollar:

```
http https · hash algorithms · how authentication works
DB:   indexes deeper · PL/SQL vs SQL · ACID · Background jobs
Java: Tomcat · Servlet · JSP · sessions, application lifecycle
```

## Darslar

| # | Fayl | Mavzu | Holat |
|---|---|---|---|
| 1 | [01-sql-vs-plsql.md](01-sql-vs-plsql.md) | SQL va PL/SQL, blok, `%TYPE`/`%ROWTYPE`, DBMS, trafik, JDBC | ✅ |
| 2 | [02-procedure-function-package.md](02-procedure-function-package.md) | Procedure, Function, Package, DML/DDL/DCL/TCL | ✅ |
| 3 | [03-cursor.md](03-cursor.md) | Cursor, PGA, `DBMS_OUTPUT`, nega explicit cursor | ✅ |
| 4 | [04-exception.md](04-exception.md) | Exception'lar, `RAISE_APPLICATION_ERROR` | ✅ |
| 5 | [05-collection-bulk-forall.md](05-collection-bulk-forall.md) | Collection, `BULK COLLECT`, `FORALL`, `LIMIT` | ✅ |
| 6 | [06-trigger.md](06-trigger.md) | Trigger, `:NEW/:OLD`, mutating table | ✅ |
| 7 | [07-acid.md](07-acid.md) | ACID: A, C, I, D · Redo vs UNDO (I va A farqi, D Telegram misoli bilan chatda o'tildi) | ✅ |
| 8 | [08-tezkor-takrorlash.md](08-tezkor-takrorlash.md) | Indeks, jobs, HTTPS, hash, auth, Java servlet | ✅ |
| 9 | [09-qoshimcha-savollar.md](09-qoshimcha-savollar.md) | Intervyuerning kutiladigan qo'shimcha savollari | ✅ |
| 10 | [10-table-tablespace.md](10-table-tablespace.md) | Table, tablespace, datafile, schema, buffer cache | ✅ |
| 11 | [11-indekslar.md](11-indekslar.md) | Indeks, ROWID, DML narxi, 5 tur (B-tree, Unique, Composite, Function-based, Bitmap) | ✅ |
| 12 | [12-type-lar.md](12-type-lar.md) | NUMBER, VARCHAR2, DATE, TIMESTAMP | ✅ |
| 13 | [13-join-lar.md](13-join-lar.md) | INNER, LEFT, RIGHT, FULL, CROSS, SELF, EXISTS, NOT IN tuzog'i | ✅ |
| 14 | [14-tranzaksiya-sessiya.md](14-tranzaksiya-sessiya.md) | Sessiya, V$SESSION, tranzaksiya boshlanishi/tugashi, JDBC autocommit | ✅ |
| 15 | [15-commit-rollback-savepoint.md](15-commit-rollback-savepoint.md) | COMMIT ichida, statement-level rollback, SAVEPOINT, qachon commit | ✅ |
| — | [mock-intervyu.md](mock-intervyu.md) | Mock intervyu: savollar, ballar, qayerda to'xtadik | 🟡 |

## Oracle SQL mavzular ro'yxati (bittadan o'tiladi)

1. ✅ Table, tablespace → [10](10-table-tablespace.md)
2. ✅ Index, index turlari, qayerda qanday index → [11](11-indekslar.md)
3. ✅ Oracle SQL type'lar: NUMBER, VARCHAR2, DATE → [12](12-type-lar.md)
4. ✅ Join'lar, turlari, qayerda qanday join → [13](13-join-lar.md)
5. ✅ ACID misollar bilan → [07](07-acid.md)
6. ✅ Tranzaksiya, sessiya → [14](14-tranzaksiya-sessiya.md)
7. ✅ COMMIT, ROLLBACK, SAVEPOINT → [15](15-commit-rollback-savepoint.md)
8. 🟡 Redo, UNDO log'lar (asosi [07](07-acid.md) D qismida; keyingi)
9. Deadlock
10. Partition'lar

## Keyingi qadamlar

**Shu yerda to'xtadik (2026-10-04):** 15-dars (COMMIT, ROLLBACK, SAVEPOINT) tugadi; keyingisi 8-mavzu: Redo, UNDO, keyin Deadlock, Partition. 12–15-darslarning tekshiruv savollariga hali javob berilmagan. Format: Claude bitta mavzuni tushuntiradi → men o'z so'zim bilan yozaman → baho.

1. [11-indekslar.md](11-indekslar.md) → 3-qism: indeks qachon ishlamaydi; javob berilmagan tekshiruv savollari
2. ACID va "Tranzaksiya nima?" ga o'z so'zim bilan javob (mock 3-savol qayta)
3. Mock intervyuni davom ettirish (3-savol: ACID, keyin indekslar, background jobs)
4. Hali o'tilmagan: Transaction/Locking/**Deadlock**, SQL amaliyot (JOIN, analytic), Dynamic SQL, View/MView, normalizatsiya

## Dushanba ertalab o'qiladigan kartochka

```
 ACID      → Atomicity (UNDO) · Consistency (constraint) · Isolation (lock, READ COMMITTED) · Durability (REDO)
 Indeks    → B-tree (default) · Bitmap (kam qiymat, OLTP'da yo'q) · Composite (chap ustun!) · Function-based
 Ishlamaydi→ UPPER(col) · LIKE '%x' · yashirin TO_NUMBER · IS NULL · col+0
 Cursor    → OPEN → FETCH → CLOSE · FOR loop avtomatik · SYS_REFCURSOR → Java
 Exception → NO_DATA_FOUND · TOO_MANY_ROWS · DUP_VAL_ON_INDEX · -20000..-20999 · WHEN OTHERS → log + RAISE
 Bulk      → context switch · FETCH ... BULK COLLECT LIMIT · EXIT WHEN cnt=0 · FORALL · SAVE EXCEPTIONS
 Trigger   → BEFORE/AFTER · ROW/STATEMENT · :NEW/:OLD · ORA-04091 → compound trigger
 HTTPS     → TLS · sertifikat · asimmetrik (kalit) → simmetrik (ma'lumot) · 443
 Hash      → bir tomonlama · SHA-256 · parol = salt + bcrypt · hash ≠ encryption
 Auth      → authN (kim?) vs authZ (nima mumkin?) · session+JSESSIONID vs JWT
 Servlet   → init (1) → service (har so'rov, thread) → destroy (1) · JSP → servlet'ga aylanadi
 Jobs      → DBMS_SCHEDULER (DBMS_JOB eskirgan) · kun yopish, foiz hisoblash
```

## Intervyu qoidalari

1. Har javobni **bank misoli** bilan bog'lash: "masalan, pul o'tkazmasida..."
2. Bilmasam, to'qimayman: "Buni amalda ishlatmaganman, lekin tushunishimcha..."
3. Javob tuzilishi: ta'rif (1 gap) → qanday ishlaydi → misol → qachon ishlatiladi
