# 16 · UNDO va REDO

## Kassir va 2 ta daftar

Ali 500 000 → 400 000:

```
 📕 UNDO (qizil daftar):  "Ali'da OLDIN 500 000 edi"   → bekor qilish uchun
 📗 REDO (yashil daftar): "Ali'ni 400 000 QILDIM"      → tiklash uchun
```

UNDO va REDO **jarayon emas, ma'lumot**. Jarayonlar: ROLLBACK (UNDO'dan foydalanadi), recovery (REDO'dan foydalanadi).

| | 📕 UNDO | 📗 REDO |
|---|---|---|
| Nima saqlaydi | **Eski** qiymat (vaqtincha) | **Qilingan o'zgarish** |
| Nima uchun | Bekor qilish | Tiklash |
| Qayerda | UNDO tablespace | Redo log fayllar (+ archive log) |
| ACID | A, I | D |

## UNDO vazifalari

1. **ROLLBACK** → eski qiymat qaytadi
2. **Read consistency** → commit qilinmagan o'zgarish o'rniga boshqalarga eski qiymat ko'rinadi
3. **Recovery** → commit bo'lmagan ish bekor qilinadi
4. **Flashback:** `SELECT ... FROM accounts AS OF TIMESTAMP (SYSTIMESTAMP - INTERVAL '5' MINUTE)`

Vaqtincha saqlanadi (`UNDO_RETENTION`). Joy tugab eski yozuv o'chsa → **ORA-01555 snapshot too old** (uzoq hisobot).

## REDO

UPDATE → xotirada (redo log buffer). **COMMIT → LGWR diskka yozadi** → "Commit complete". Data fayllarni DBWn keyinroq yozadi.

```
 COMMIT bo'ldi → svet o'chdi → server yondi → 400 000 ✅ (REDO tikladi)
 COMMIT YO'Q   → svet o'chdi → server yondi → 500 000 ↩️ (UNDO bekor qildi)
```

⚠️ REDO faqat **commit qilingan** ma'lumotni saqlab qolishni kafolatlaydi.

Redo fayllar aylana bo'ylab yoziladi; bankda ARCHIVELOG rejimi (nusxa olinadi) → disk buzilsa backup + archive log bilan tiklanadi.

## Real misollar (bank)

- Kassada to'lov xato bilan tugadi → ROLLBACK → UNDO'dan qoldiq qaytdi
- Operator balansni ko'ryapti, kassir hali commit qilmagan → eski qoldiq ko'rinadi
- Kechki katta hisobot → ORA-01555
- Maosh o'tkazildi, commit, svet o'chdi → REDO bilan hammasi joyida

## Intervyu javobi

> "UNDO o'zgarishdan oldingi qiymatni vaqtincha saqlaydi, u UNDO tablespace'da turadi. Undan ROLLBACK'da va boshqa session'larga commit qilinmagan o'zgarish o'rniga eski qiymatni ko'rsatishda foydalaniladi, bu Atomicity va Isolation. REDO qilingan o'zgarishni yozadi: COMMIT'da LGWR uni diskka yozadi, svet o'chsa commit qilingan ma'lumot redo orqali tiklanadi, bu Durability. Qisqasi: UNDO bekor qilish uchun, REDO tiklash uchun."
