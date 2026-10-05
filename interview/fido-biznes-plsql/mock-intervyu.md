# Mock intervyu (DB qismi)

**Qoidalar:** savollar bittadan · jadvalga qaramasdan o'z so'zim bilan · har javob 0–10. Javoblar telefon dictation orqali og'zaki berildi.

## 2-mock (2026-10-05, intervyu kuni ertalab)

| # | Savol | 1-urinish | Yakuniy | Nima qolib ketdi |
|---|---|---|---|---|
| 1 | SQL va PL/SQL farqi, qayerda bajariladi | 7 | **9** | "Oracle server tomonida" |
| 2 | Context switch: muammo va yechim | 6 | **8** | BULK COLLECT = o'qish, FORALL = yozish, LIMIT, bitta SQL |
| 3 | ACID + bank misoli | 6 | **10** | (1-mock'da 0 edi) |
| 4 | Tranzaksiya, qachon boshlanadi/tugaydi | 5 | **9** | Commit qilinMAGAN ish bekor bo'ladi (qilingan emas!) |
| 5 | Indeks turlari, qayerda | 6 | 6 | **Unique** unutildi; **Bitmap B-tree emas**; bank misollari |
| 6 | UNDO va REDO | 6 | 7 | Eski qiymat vs qilingan o'zgarish; REDO = svet o'chganda tiklash |
| 7 | Deadlock | 3 | — | Tushundim ([17](17-deadlock.md)), qayta javob berilmadi |
| 8 | Partition | 6 | **9** | Pruning + DROP PARTITION |
| 9 | JOIN, INNER vs LEFT | 5 | 7 | NULL va bank misoli |
| 10 | Background job | 4 | **9** | DBMS_SCHEDULER, kun yopish, foiz |
| | **O'rtacha** | **5.4** | **8.1** | |

**Xulosa:** tushunaman, misol eshitgach tez yaxshilayman. Muammo: **birinchi javob qisqa, bank misoli yo'q**. Taxminiy o'tish ehtimoli ~55–65%.

**Qoida:** ta'rif → qanday ishlaydi → **"masalan, bankda..."** → Oracle'da nima bilan.

## 1-mock (2026-10-03)

| # | Savol | Ball |
|---|---|---|
| 1 | SQL va PL/SQL | 6 → 9 |
| 2 | Context switch | 4 |
| 3 | ACID | 0 |

## 10/10 javob namunalari

Har bir darsning oxirida "Intervyu javobi" bo'limi bor: [07](07-acid.md) ACID · [11](11-indekslar.md) indeks · [16](16-redo-undo.md) UNDO/REDO · [17](17-deadlock.md) deadlock · [18](18-partition.md) partition.

**1-savol:**
> "SQL deklarativ til, PL/SQL protsedurali dasturlash tili: tiplar, IF, LOOP, exception handling, procedure, function, trigger bor. PL/SQL Oracle server tomonida bajariladi: protsedurali qism PL/SQL engine'da, SQL buyruqlar SQL engine'da. Butun blok bir martada yuboriladi, trafik kamayadi."

**2-savol:**
> "Bu context switch. Har o'tish vaqt oladi, loop ichida SQL bo'lsa o'tishlar soni qatorlar soniga teng, katta hajmda juda sekin. BULK COLLECT bilan paket qilib o'qiyman, FORALL bilan paket qilib yozaman, xotira uchun LIMIT. Imkon bo'lsa, bitta SQL."

**4-savol:**
> "Tranzaksiya bir butun deb qaraladigan amallar guruhi: yo hammasi, yo hech biri, masalan Ali'dan Vali'ga o'tkazma. Oracle'da birinchi DML bilan o'zi boshlanadi, COMMIT yoki ROLLBACK bilan tugaydi, DDL avtomatik commit qiladi. Session xato bilan uzilsa, commit qilinmagan ish bekor bo'ladi."

**9-savol:**
> "INNER JOIN faqat ikkala jadvalda mos kelgan qatorlarni beradi, LEFT JOIN chap jadvalning hammasini, mosi yo'qlarda NULL. Masalan, mijozlar va hisoblar: INNER faqat hisobi bor mijozlar, LEFT hamma mijozlar, hisobi yo'qlarda NULL."

**10-savol:**
> "Background job belgilangan vaqtda avtomatik ishlaydigan vazifa, Oracle'da DBMS_SCHEDULER bilan yaratiladi (DBMS_JOB eskirgan). Bankda kun yopish, depozit foizlari, komissiya, tungi hisobotlar."
