# 11 · Indekslar (1-qism ✅ · 2-qism ✅ · 3-qism keyingi)

Vizual: [B-tree qidiruvi (interaktiv)](https://claude.ai/artifact/9pDqjhY78Ymryppw7ojSvD): ID kiritib, qadamma-qadam ko'rish.

## 1-qism · Indeks nima

Kitob oxiridagi ko'rsatkich: hamma betni varaqlamasdan, to'g'ri betga.

| Kitob | Oracle |
|---|---|
| Hamma betni varaqlash | **Full table scan** (indeks yo'q yoki ishlatilmaydi) |
| Ko'rsatkich | **Index** |
| "347-bet" | **ROWID** |

### ROWID

Jadvaldagi **qatorning diskdagi manzili** (indeksning ID'si emas!). GUID'ga o'xshaydi, lekin tasodifiy emas:

```
  AAAR3s   AAE   AAAACX   AAA
  obyekt   fayl   blok    qator
```

- Har qatorda bor, indeks bo'lmasa ham. Indeksda **qiymat + ROWID** saqlanadi
- INSERT → yangi qatorga yangi ROWID, eskilari o'zgarmaydi
- UPDATE → odatda o'zgarmaydi (row migration'da ham o'zgarmaydi)
- `ALTER TABLE MOVE`, partition o'zgarishi, export/import'da o'zgarishi mumkin → ID sifatida saqlamang, PRIMARY KEY ishlating

### Indeks DML'ga qanday ta'sir qiladi

| Amal | Yordam beradi | Xalaqit beradi |
|---|---|---|
| SELECT | ✅ topish | — |
| INSERT | — | 🐢 har indeksga yozuv qo'shiladi |
| UPDATE | ✅ WHERE qismi | 🐢 indeksli ustun o'zgarsa |
| DELETE | ✅ WHERE qismi | 🐢 har indeksdan o'chiriladi |

**UPDATE'da:** indeksli ustun o'zgarsa → shu qatorga tegishli eski **indeks yozuvi** o'chadi, yangi qiymat bo'yicha yangi yozuv saralangan joyga qo'shiladi (butun indeks qayta yaratilmaydi; ROWID o'sha). Indekssiz ustun o'zgarsa → indeksga tegilmaydi.

| WHERE | SET | Natija |
|---|---|---|
| Indeksli | Indekssiz | ⚡ eng tez (`UPDATE accounts SET balance = ... WHERE id = ...`) |
| Indeksli | Indeksli | 🟡 |
| Indekssiz | Indekssiz | 🐢 full scan |
| Indekssiz | Indeksli | 🐢🐢 |

**Nega har ustunga indeks qo'ymaymiz (2 sabab):** 1) DML sekinlashadi; 2) diskda alohida joy. Ko'p yoziladigan jadvalda (to'lovlar) kam indeks, ko'p o'qiladigan (hisobot) da ko'proq.

## 2-qism · Indeks turlari

### 1. B-tree (default)

Arxiv misoli:

```
 Kirishdagi taxta   = Root    (1..200 000 → 1-xona, ...)
 Xona ro'yxati      = Branch  (1..400 → 1-javon, ...)
 Javon              = Leaf    (id → ROWID kartochkalari)
 Boshqa binodagi papka = jadvaldagi qator
```

- **Binary tree emas:** har tugun = 1 blok (8 KB), unda yuzlab qiymat
- Pastdan quriladi: 1 mln ÷ 400 = 2 500 leaf → ÷ 500 = 5 branch → 1 root (rootda 5 yozuv)
- Har qavatda "qiymatdan katta bo'lmagan eng oxirgi chegara" topiladi (blok ichida o'rtadan bo'lib, xotirada)
- **Qadam = blok o'qish**, solishtirish emas. 1 mln qatorda 3 indeks + 1 jadval bloki = **4**; indekssiz ~20 000 blok
- **Balanced:** istalgan ID (101 yoki 999 900) bir xil qadamda
- Chegaralarni Oracle o'zi yozadi (blok to'lsa → split → yangi chegara yuqoriga)
- Ishlaydi: `=`, `BETWEEN`, `>`/`<`, `ORDER BY`, `LIKE 'ALI%'`
- Mos: ko'p turli qiymat (`client_id`, `acc_number`, `phone`). Mos emas: `gender`

### 2. Unique

B-tree + takrorlanishga yo'l qo'ymaydi (`ORA-00001`). PRIMARY KEY va UNIQUE constraint avtomatik yaratadi. Bank: hisob raqami, pasport, karta raqami. Bir nechta NULL bo'lishi mumkin.

### 3. Composite

`(client_id, pay_date)`: telefon kitobchasi kabi avval 1-ustun, keyin 2-ustun bo'yicha saralangan.

```sql
WHERE client_id = 101 AND pay_date = ...   ✅ (1 ta natija, eng tez)
WHERE client_id = 101                      ✅ (daraxtdan tushish bir xil, keyin ko'proq yozuv o'qiladi)
WHERE pay_date = ...                       ❌ odatda (chapdagi ustun yo'q)
```

Birinchiga eng ko'p `=` bilan qidiriladigan ustun. `(client_id, pay_date)` bor bo'lsa, alohida `(client_id)` kerak emas.

### 4. Function-based

`WHERE UPPER(last_name) = 'VALIYEV'` → oddiy indeks ishlamaydi (indeksda asl qiymat).

```sql
CREATE INDEX idx_clients_upper_name ON clients(UPPER(last_name));
```

WHERE'dagi ifoda indeksdagi bilan aynan bir xil bo'lishi kerak. Sana uchun TRUNC o'rniga:

```sql
WHERE pay_date >= DATE '2026-09-03' AND pay_date < DATE '2026-09-04'
```

### 5. Bitmap

Kam turli qiymat (`status`, `currency`, `gender`). Davomat jurnali kabi: har qiymat uchun 1/0 qatori. Kam joy, AND/OR tez.

⚠️ Bitta o'zgarish ko'p qatorni qulflaydi → **OLTP'da (to'lovlar) yo'q**, faqat DWH/hisobot.

| | B-tree | Bitmap |
|---|---|---|
| Qiymatlar | Ko'p turli | Kam turli |
| Ichida | Qiymat + ROWID | 1/0 qatorlari |
| Ko'p yozish | ✅ | ❌ lock |
| Qayerda | OLTP | DWH |

### Intervyu javobi (turlar)

> "Oracle'da default indeks B-tree, ko'p turli qiymatli ustunlar uchun, masalan client_id. Unique indeks takrorlanishga yo'l qo'ymaydi, uni PRIMARY KEY avtomatik yaratadi. Composite bir nechta ustundan iborat, unda tartib muhim: WHERE'da chapdagi ustun bo'lishi kerak. Function-based WHERE'da UPPER kabi funksiya bo'lganda kerak. Bitmap status kabi kam turli qiymatlar uchun, lekin OLTP'da lock muammosi beradi, shuning uchun faqat hisobot bazalarida."

## 3-qism · Indeks qachon ishlamaydi ⏳ keyingi

Qisqasi ([08](08-tezkor-takrorlash.md)da): `UPPER(col)`, `TRUNC(date_col)`, `LIKE '%x'`, yashirin `TO_NUMBER`, `col + 0`, `IS NULL`, `!=`, composite'da chap ustun yo'q, ko'p qator qaytsa optimizer full scan tanlaydi. Tekshirish: `EXPLAIN PLAN`, `DBMS_XPLAN.DISPLAY`.

## Mening javoblarim (baholar)

- Indeks nima 9 · Full scan 8 · ROWID 2 → 7 · Nega har ustunga emas 6 → 5 (joy sababini unutdim) · UPDATE'da qachon 8
- Javob berilmagan tekshiruvlar: B-tree (3 savol), Unique, Composite, Function-based, Bitmap
