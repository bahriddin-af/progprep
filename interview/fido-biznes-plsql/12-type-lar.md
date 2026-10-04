# 12 · Oracle SQL type'lar: NUMBER, VARCHAR2, DATE

```sql
CREATE TABLE accounts (
   id          NUMBER(10),
   acc_number  VARCHAR2(20 CHAR),
   balance     NUMBER(18,2),
   opened_at   DATE
);
```

## NUMBER(p, s)

`p` = jami xonalar (≤ 38), `s` = verguldan keyingilar.

```sql
-- NUMBER(5,2): maksimum 999.99
123.456 → 123.46   ✅ kasr jimgina YAXLITLANADI
1234.5  → ❌ ORA-01438 (butun qism sig'madi)
```

Pul = `NUMBER(18,2)`. `BINARY_DOUBLE`/`FLOAT` emas: ikkilik saqlaydi, `0.1 + 0.2 = 0.30000000000000004`. (Java: `BigDecimal` vs `double`.) `INTEGER` = `NUMBER(38)`, `DECIMAL(p,s)` = `NUMBER(p,s)`.

## VARCHAR2(n)

O'zgaruvchan uzunlik. Ustunda 4000 bayt (yoki 32 767), PL/SQL'da 32 767, kattasi → `CLOB`.

```sql
VARCHAR2(5)        -- 5 BAYT: 'Валий' ❌ ORA-12899 (kirill 2 bayt)
VARCHAR2(5 CHAR)   -- 5 BELGI: ✅
```

| | CHAR(n) | VARCHAR2(n) |
|---|---|---|
| Uzunlik | Qat'iy, bo'sh joy bilan to'ldiriladi (`'UZS  '`) | O'zgaruvchan |
| Qachon | `currency CHAR(3)`, `'Y'/'N'` | Deyarli doim |

⭐ Oracle'da **`''` = NULL**: `WHERE col = ''` hech narsa topmaydi, `IS NULL` kerak.

## DATE

⭐ **Sana + vaqt, soniyagacha**: `2026-10-04 14:35:27`.

```sql
WHERE pay_date = DATE '2026-10-04'                  ❌ faqat 00:00:00 ni topadi
WHERE TRUNC(pay_date) = DATE '2026-10-04'           🟡 topadi, indeks ishlamaydi
WHERE pay_date >= DATE '2026-10-04'
  AND pay_date <  DATE '2026-10-05'                 ✅ topadi + indeks
```

```sql
SYSDATE + 1         -- ertaga          SYSDATE + 1/24     -- 1 soatdan keyin
d2 - d1             -- kunlar soni     ADD_MONTHS(d, 12)  -- depozit muddati
MONTHS_BETWEEN(a,b) · LAST_DAY(d) · TRUNC(SYSDATE)
TO_DATE('04.10.2026 14:35', 'DD.MM.YYYY HH24:MI') · TO_CHAR(SYSDATE, 'DD.MM.YYYY')
```

Formatni doim aniq yozish (NLS_DATE_FORMAT'ga tayanmaslik). `HH24` vs `HH`, `MM` (oy) vs `MI` (daqiqa).

| Tur | Aniqlik | Qachon |
|---|---|---|
| `DATE` | soniya | ko'p hollarda |
| `TIMESTAMP` | soniya ulushi (9 xona) | to'lovlar tartibi, audit |
| `TIMESTAMP WITH TIME ZONE` | + mintaqa | xalqaro |

Boshqalar: `CLOB` (katta matn), `BLOB` (fayl), `RAW` (hash), `BOOLEAN` (PL/SQL'da; jadvalda odatda `CHAR(1) CHECK IN ('Y','N')`).

## Intervyuda shunday deysiz

> "Sonlar uchun `NUMBER(p,s)`. Pulga `NUMBER(18,2)`, `FLOAT` emas, chunki u ikkilik ko'rinishda saqlaydi va yaxlitlash xatosi beradi. Kasr sig'masa yaxlitlanadi, butun qism sig'masa ORA-01438. Matn uchun `VARCHAR2`, ko'p tilli ma'lumotga `CHAR` semantikasi bilan. Oracle'da bo'sh satr NULL. `DATE` vaqtni soniyagacha saqlaydi, shuning uchun kunlik filtrni `>=` va `<` bilan yozaman. Soniya ulushlari kerak bo'lsa, `TIMESTAMP`."

## Tekshiruv savollari

1. `NUMBER(7,2)` ga `12345.678` va `123456.7` yozilsa?
2. Pulga nega `NUMBER`, `BINARY_DOUBLE` emas?
3. `VARCHAR2(10)` vs `VARCHAR2(10 CHAR)`?
4. `WHERE pay_date = DATE '2026-10-04'` nega ba'zi qatorlarni topmaydi?
5. `SYSDATE + 1/24`?

**Manba:** [Oracle SQL Language Reference – Data Types](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/Data-Types.html)
