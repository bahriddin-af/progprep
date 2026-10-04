# 13 · JOIN'lar

```
clients              accounts
┌────┬──────┐        ┌─────┬───────────┬─────────┐
│ 1  │ Ali  │        │ 101 │ 1         │ 500 000 │
│ 2  │ Vali │        │ 102 │ 1         │ 200 000 │
│ 3  │ Soli │ ← hisobi yo'q  │ 103 │ 2  │ 300 000 │
└────┴──────┘        │ 104 │ 9         │  50 000 │ ← egasi yo'q
                     └─────┴───────────┴─────────┘
```

| JOIN | Natija | Misolda | Bank misoli |
|---|---|---|---|
| **INNER** | Faqat juftlari borlar | Ali×2, Vali (3 qator) | To'lov + to'lovchi |
| **LEFT** | Chapning hammasi, juft yo'q → NULL | + Soli/NULL | Hamma mijozlar |
| **RIGHT** | O'ngning hammasi | + NULL/104 | Kam; LEFT bilan almashtiriladi |
| **FULL** | Ikkala tomon | + Soli/NULL + NULL/104 | Sverka (bizdagi vs ulardagi to'lovlar) |
| **CROSS** | Barcha kombinatsiyalar | 3×3 = 9 | Mijoz × valyuta shabloni; `ON` unutilsa xavf |
| **SELF** | Jadval o'zi bilan | `employees e JOIN employees m ON m.id = e.manager_id` | Xodim → rahbar |
| **EXISTS** | Bor-yo'qligi, ko'paytirmaydi | Ali, Vali (1 martadan) | Hisobi bor mijozlar |
| **NOT EXISTS** | Yo'qligi, NULL'da xavfsiz | Soli | Hisobi yo'q mijozlar |

JOIN'da qator **ko'payishi** mumkin (Ali'ning 2 hisobi → 2 qator).

## Hisobi yo'q mijozlar ⭐

```sql
SELECT c.name FROM clients c
  LEFT JOIN accounts a ON a.client_id = c.id
 WHERE a.id IS NULL;

SELECT c.name FROM clients c
 WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.client_id = c.id);
```

## NOT IN tuzog'i

`id NOT IN (1, 2, NULL)` = `id != 1 AND id != 2 AND id != NULL` → UNKNOWN → **0 qator**. Inkor uchun `NOT EXISTS`.

## LEFT JOIN: shart ON'dami yoki WHERE'dami ⭐

```sql
LEFT JOIN accounts a ON a.client_id = c.id
WHERE a.currency = 'USD'                    ❌ Soli yo'qoladi → INNER'ga aylandi

LEFT JOIN accounts a ON a.client_id = c.id
                    AND a.currency = 'USD'  ✅
```

`ON` qaysi o'ng qatorlar biriktirilishini belgilaydi, `WHERE` yakuniy natijani filtrlaydi.

## Eski Oracle sintaksisi

```sql
FROM clients c, accounts a WHERE a.client_id(+) = c.id   -- = LEFT JOIN
```

`(+)` juft bo'lmasligi mumkin bo'lgan tomonda. Eski bank kodida ko'p.

## JOIN algoritmlari

| Algoritm | Qachon |
|---|---|
| Nested Loops | Kichik natija + o'ngda indeks |
| Hash Join | Ikkala jadval katta, `=`, PGA'da hash jadval |
| Sort Merge | Saralangan ma'lumot, `>`/`<` |

FOREIGN KEY ustuniga indeks qo'yish kerak (Nested Loops + parent DELETE'da lock).

## Intervyuda shunday deysiz

> "JOIN ikki jadvalni umumiy ustun bo'yicha bog'laydi. INNER faqat juftlari borlarni, LEFT chapning hammasini (juft yo'q bo'lsa NULL), RIGHT aksi, FULL ikkala tomonni qaytaradi, bu sverka uchun qulay. CROSS barcha kombinatsiyalar, SELF jadvalni o'zi bilan bog'laydi. Hisobi yo'q mijozlarni `LEFT JOIN ... IS NULL` yoki `NOT EXISTS` bilan topaman; `NOT IN` NULL'da bo'sh natija beradi. LEFT JOIN'da o'ng jadval shartini `ON` ichiga yozaman."

## Tekshiruv savollari

1. INNER JOIN nechta qator? Ali necha marta va nega?
2. Hisobi yo'q mijozlar (2 usul).
3. `LEFT JOIN ... WHERE a.currency = 'USD'` nega Soli'ni yo'qotadi?
4. `NOT IN` + NULL?
5. `a.client_id(+) = c.id` qaysi JOIN?

**Manba:** [Oracle SQL Language Reference – Joins](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/Joins.html)
