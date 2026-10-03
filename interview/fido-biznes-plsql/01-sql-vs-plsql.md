# 1 · SQL va PL/SQL, blok tuzilishi

## SQL va PL/SQL: oddiy o'xshatish

**SQL** bazaga beriladigan **bitta buyruq**: "101-hisobning qoldig'ini ber."

```sql
SELECT balance FROM accounts WHERE id = 101;
```

**PL/SQL** bir nechta qadamdan iborat **yo'riqnoma**: "Qoldiqni ol. 1000 dan kam bo'lsa, xabar chiqar. Hisob topilmasa, xatoni ushla."

```sql
DECLARE
   v_balance NUMBER;
BEGIN
   SELECT balance INTO v_balance FROM accounts WHERE id = 101;
   IF v_balance < 1000 THEN
      DBMS_OUTPUT.PUT_LINE('Mablag'' kam');
   END IF;
EXCEPTION
   WHEN NO_DATA_FOUND THEN
      DBMS_OUTPUT.PUT_LINE('Hisob yo''q');
END;
/
```

| | SQL | PL/SQL |
|---|---|---|
| Turi | Deklarativ | Protsedurali |
| Bajarilishi | Bitta so'rov | Butun blok bir martada yuboriladi |
| Mantiq | `IF`, loop yo'q | `IF`, `LOOP`, `CASE` bor |
| Xatoni ushlash | Yo'q | `EXCEPTION` bloki bor |
| Qayerda ishlaydi | SQL engine | PL/SQL engine (+ SQL engine) |

## Blok tuzilishi

```
DECLARE     ← o'zgaruvchilar (ixtiyoriy)
BEGIN       ← asosiy kod (majburiy)
EXCEPTION   ← xatoni ushlash (ixtiyoriy)
END;        ← (majburiy)
```

- **Anonim blok**: nomi yo'q, bazada saqlanmaydi
- **Nomlangan blok**: procedure, function, package, trigger. Bazada kompilyatsiya qilingan holda saqlanadi

## Context switch

```
 ┌──────────────────┐   SQL buyruq    ┌──────────────────┐
 │  PL/SQL engine   │ ──────────────► │   SQL engine     │
 │ (IF, LOOP, o'zg.)│ ◄────────────── │ (SELECT, UPDATE) │
 └──────────────────┘    natija       └──────────────────┘
          har bir o'tish = context switch (vaqt sarflanadi)
```

Loop ichida 100 000 ta `INSERT` → 100 000 ta context switch → sekin. Yechim: `BULK COLLECT` / `FORALL` (5-dars).

## Trafik va round trip (ilova ↔ server)

**Trafik** = tarmoq orqali o'tadigan so'rov va javoblar miqdori (yo'ldagi mashinalar kabi).

Ikki xil "yo'l" bor:

```
  Brauzer        1-YO'L (HTTP)       Java (Tomcat)      2-YO'L (JDBC)       Oracle
  ┌───────┐ ── POST /transfer ──►  ┌────────────┐ ── SQL / procedure ──► ┌────────┐
  │       │ ◄────── javob ──────── │ Controller │ ◄────── natija ─────── │        │
  └───────┘                        └────────────┘                        └────────┘
       ikkala holatda ham 1 marta              farq AYNAN SHU YERDA
```

```
 Mantiq Java'da:   Java ══5 marta══► Oracle   (SELECT, UPDATE, UPDATE, INSERT, COMMIT)
 Mantiq PL/SQL'da: Java ──1 marta──► Oracle   (transfer() ichida 5 ta buyruq serverda)
```

| | Round trip (tarmoq) | Context switch |
|---|---|---|
| Qayerda | Ilova ↔ Server | Server **ichida**: PL/SQL engine ↔ SQL engine |
| Nima kamaytiradi | **PL/SQL blok va procedure** | **BULK COLLECT / FORALL** |

Java kodi SQL'ga **aylanmaydi**: Java SQL'ni matn (`String`) sifatida JDBC driver orqali yuboradi, Oracle uni parse qilib bajaradi. Istisno: ORM (Hibernate) Java metodlaridan SQL matnini avtomatik tuzib beradi.

## JDBC driver

**JDBC** = Java Database Connectivity. **JDBC API** standart interfeyslar (`Connection`, `PreparedStatement`, `ResultSet`), **driver** esa ma'lum bir baza uchun ularni amalga oshiradigan kutubxona (Oracle: `ojdbc11.jar`, Thin driver). Driver Java va Oracle orasidagi tarjimon.

```
jdbc:oracle:thin:@db-server:1521/ORCLPDB      ← 1521 = Oracle standart porti
```

```java
CallableStatement cs = conn.prepareCall("{ call acc_pkg.transfer(?, ?, ?) }");
cs.setInt(1, 101); cs.setInt(2, 102); cs.setBigDecimal(3, new BigDecimal("100000"));
cs.execute();
```

| JDBC'da | PL/SQL'dagi o'xshashi |
|---|---|
| `ResultSet` + `rs.next()` | Cursor + `FETCH` |
| `?` (PreparedStatement) | Bind variable |
| `CallableStatement` | Procedure chaqirish |
| `OracleTypes.CURSOR` | `SYS_REFCURSOR` |

Connection pool (HikariCP): ulanishlar oldindan ochib qo'yiladi va qayta ishlatiladi.

## DBMS nima?

**DBMS** = DataBase Management System (ma'lumotlar bazasini boshqarish tizimi). Oracle **RDBMS** (relational). `DBMS_` prefiksi Oracle'ning tayyor package'lari: `DBMS_OUTPUT`, `DBMS_SCHEDULER`, `DBMS_STATS`, `DBMS_XPLAN`, `DBMS_CRYPTO`, `DBMS_UTILITY`.

## %TYPE va %ROWTYPE

```sql
v_balance  accounts.balance%TYPE;   -- bitta ustun turi
v_acc      accounts%ROWTYPE;        -- butun qator strukturasi
```

```sql
DECLARE
   v_acc  accounts%ROWTYPE;
BEGIN
   SELECT * INTO v_acc FROM accounts WHERE id = 101;
   DBMS_OUTPUT.PUT_LINE(v_acc.acc_number || ' : ' || v_acc.balance);
END;
/
```

```
 v_acc  (accounts%ROWTYPE)
 ┌─────────────┬──────────────────────┐
 │ id          │ 101                  │
 │ client_id   │ 5                    │
 │ acc_number  │ 20208000100000000101 │
 │ balance     │ 1500000.00           │
 │ currency    │ UZS                  │
 └─────────────┴──────────────────────┘
```

Jadval ustuni turi o'zgarsa, kod o'zgarishsiz ishlayveradi. `%ROWTYPE` cursor bilan ham ishlaydi: `c_acc%ROWTYPE`.

## SELECT INTO: ikki xato

| Natija | Nima bo'ladi |
|---|---|
| 0 ta qator | `NO_DATA_FOUND` |
| 1 ta qator | ✅ |
| 2+ qator | `TOO_MANY_ROWS` |

## Intervyuda shunday deysiz

> "SQL deklarativ til: nima kerakligini aytamiz, qanday bajarishni Oracle hal qiladi. PL/SQL SQL ustiga qurilgan protsedurali til: o'zgaruvchilar, shartlar, sikllar, exception handling bor, procedure, function, package va trigger yaratish mumkin. PL/SQL Oracle server tomonida bajariladi: protsedurali qism PL/SQL engine'da, ichidagi SQL buyruqlar SQL engine'da. Butun blok serverga bir martada yuboriladi, ilova va baza orasidagi borib-kelishlar kamayadi."

**Manba:** [Oracle PL/SQL Language Reference – Overview](https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/overview.html)
