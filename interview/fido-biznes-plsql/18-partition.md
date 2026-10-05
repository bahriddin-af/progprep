# 18 · Partition'lar

Katta jadvalni bo'laklarga bo'lish; tashqaridan **bitta jadval**. Arxiv: hujjatlar oylar bo'yicha qutilarga.

```sql
CREATE TABLE payments (id NUMBER, client_id NUMBER, amount NUMBER(18,2), pay_date DATE)
PARTITION BY RANGE (pay_date)
INTERVAL (NUMTOYMINTERVAL(1, 'MONTH'))            -- har oy avtomatik yangi qism
(PARTITION p_first VALUES LESS THAN (DATE '2026-01-01'));
```

## 2 ta foyda

1. **Partition pruning:** `WHERE pay_date` sentyabr → faqat sentyabr qismi o'qiladi (WHERE'da partition ustuni bo'lishi kerak)
2. **DROP PARTITION:** eski ma'lumot bir zumda o'chadi. DELETE har qatorni alohida o'chiradi (UNDO + REDO + indekslar) 🐢; DROP qatorlarga tegmaydi, butun qismni olib tashlaydi ⚡ (qutini butunlay olib chiqish)

## Turlar

| Tur | Bank misoli |
|---|---|
| RANGE | To'lovlar oylar bo'yicha ⭐ |
| INTERVAL | RANGE + qismlarni Oracle o'zi yaratadi |
| LIST | Filial / viloyat |
| HASH | `client_id` bo'yicha teng taqsimlash |
| Composite | Oy + filial |

Indeks: **LOCAL** (har qismning o'zi; DROP'da boshqalar buzilmaydi) vs **GLOBAL**. Partitioning: Enterprise Edition'ning pullik opsiyasi.

## Intervyu javobi

> "Partition katta jadvalni bo'laklarga bo'lish, lekin tashqaridan u bitta jadval bo'lib qoladi. Masalan, bankda to'lovlar jadvalini sana bo'yicha oylarga bo'lishadi, RANGE yoki INTERVAL bilan. Foydasi ikkita: birinchidan, partition pruning, ya'ni sentyabr to'lovlari so'ralsa, Oracle faqat sentyabr qismini o'qiydi; ikkinchidan, eski ma'lumotni DROP PARTITION bilan bir soniyada o'chirish mumkin."
