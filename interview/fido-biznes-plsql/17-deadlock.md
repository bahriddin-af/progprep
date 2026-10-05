# 17 · Deadlock

## Papkalar misoli (eng tushunarlisi)

Pul o'tkazish uchun kassirga ikkala mijozning papkasi kerak. Papka kimda bo'lsa, boshqasi ishlata olmaydi.

```
 1-kassir (Ali → Bobur):  Ali papkasini oldi 📁 → Bobur papkasini kutadi ⏳
 2-kassir (Bobur → Ali):  Bobur papkasini oldi 📁 → Ali papkasini kutadi ⏳
 Ikkalasi ham "ishim tugamaguncha bermayman" → 💀 DEADLOCK
```

| Hayot | Oracle |
|---|---|
| Papka | Qator |
| Papkani olish | UPDATE / FOR UPDATE → 🔒 |
| Qaytarish | COMMIT / ROLLBACK |
| Boshliq | Oracle → ORA-00060 |

**Ta'rif:** ikki session bir xil qatorlarni bir vaqtda **teskari tartibda qulflamoqchi** bo'lganda: har biri bittasini ushlab, ikkinchisini kutadi. (O'qish qulflamaydi, faqat o'zgartirish.)

- Bir xil yo'nalish (Ali→Bobur va Ali→Bobur) → oddiy kutish, deadlock yo'q
- Teskari yo'nalish bir vaqtda → deadlock bo'lishi mumkin

## Oracle nima qiladi

Bir necha soniyada aniqlaydi → bitta session'ga **ORA-00060** → faqat **oxirgi buyruq** bekor (statement-level rollback). Oldingi UPDATE va uning qulfi qoladi → dasturchi `EXCEPTION`da **ROLLBACK** qiladi.

## Muammo va yechim kodi

```sql
-- ❌ tartib kim jo'natayotganiga bog'liq
UPDATE accounts SET balance = balance - 100 WHERE id = p_from;
UPDATE accounts SET balance = balance + 100 WHERE id = p_to;
COMMIT;

-- ✅ avval ikkala hisob doim ID tartibida qulflanadi
SELECT id FROM accounts WHERE id IN (p_from, p_to) ORDER BY id FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = p_from;
UPDATE accounts SET balance = balance + 100 WHERE id = p_to;
COMMIT;
```

`FOR UPDATE` = papkani olaman, `ORDER BY id` = alifbo tartibida. Ikkinchi session ALI'da hech narsa ushlamasdan kutadi → birinchisi to'liq tugaydi → keyin ikkinchisi to'liq ishlaydi (navbat). `SELECT ... FOR UPDATE` hamma qatorlarni bitta buyruqda qulflaydi. Qoida faqat hamma kod unga amal qilsa ishlaydi → hisob o'zgarishlari bitta package orqali.

Birinchi kod xato emas (99.9% ishlaydi), lekin bankda yuklama katta → yechim kerak.

## Boshqa sabablar

1. **Foreign key ustunida indeks yo'q** → parent'dan DELETE butun child jadvalni qulflaydi ⭐
2. OLTP'da **bitmap** indeks
3. Ko'p qatorni turli tartibda UPDATE

## Intervyu javobi

> "Deadlock ikki session bir-birining qulfini kutib qolganda yuz beradi. Masalan, bir kassir Ali'dan Bobur'ga, ikkinchisi Bobur'dan Ali'ga pul o'tkazmoqda: birinchisi Ali'ni, ikkinchisi Bobur'ni qulfladi va har biri boshqasini kutyapti. Oracle buni o'zi aniqlab, bitta session'ga ORA-00060 beradi, faqat oxirgi buyruqni bekor qiladi, shuning uchun EXCEPTION'da ROLLBACK qilaman. Oldini olish uchun qatorlarni doim bir xil tartibda, masalan ID bo'yicha qulflayman; foreign key ustunlariga indeks qo'yaman."

**Kalit:** bir-birini kutish → ORA-00060 + ROLLBACK → bir xil tartib
