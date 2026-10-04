# 15 · COMMIT, ROLLBACK, SAVEPOINT (chuqurroq)

Asoslar [07-acid.md](07-acid.md)da. Word o'xshatishi: DML = yozish, COMMIT = Ctrl+S, ROLLBACK = saqlamasdan yopish, SAVEPOINT = versiya belgisi.

## COMMIT ichida

```
 1. SCN (tartib raqami) beriladi
 2. LGWR redo'ni DISKKA yozadi → keyin "Commit complete"   (Durability)
 3. Qulflar ochiladi 🔓
 4. UNDO yozuvlari qayta ishlatishga bo'shaydi
```

COMMIT hajmdan qat'i nazar **tez**: data fayllarni DBWn keyinroq yozadi, faqat kichik redo kutiladi. ROLLBACK esa UNDO'dan har o'zgarishni qaytaradi → katta tranzaksiyada **sekin**.

## Statement-level rollback ⭐

Xato bergan buyruqning **faqat o'zi** bekor bo'ladi, tranzaksiya davom etadi:

```sql
UPDATE accounts SET balance = balance - 100000 WHERE id = 'ALI';   -- ✅
INSERT INTO accounts VALUES ('ALI', ...);                           -- ❌ ORA-00001, faqat shu bekor
COMMIT;                                                             -- ⚠️ UPDATE saqlanib ketdi
```

Butun tranzaksiyani bekor qilish dasturchining vazifasi (`EXCEPTION` → `ROLLBACK`).

Klient chaqirgan PL/SQL blok ushlanmagan xato bilan tugasa, **blok ichidagi** o'zgarishlar bekor bo'ladi, blokdan oldingilari qoladi.

## SAVEPOINT

```sql
UPDATE ... ALI;  SAVEPOINT sp1;  UPDATE ... VALI;  SAVEPOINT sp2;  INSERT ...;
ROLLBACK TO sp1;   -- VALI va INSERT bekor, sp2 o'chdi, TRANZAKSIYA DAVOM ETADI
COMMIT;            -- faqat ALI
```

| Qoida | |
|---|---|
| `ROLLBACK TO` tranzaksiyani tugatmaydi | keyin COMMIT/ROLLBACK kerak |
| Keyingi savepoint'lar o'chadi | |
| Savepoint'dan keyingi qulflar ochiladi | |
| Bir xil nom → eski almashtiriladi | |
| COMMIT / ROLLBACK → hammasi o'chadi | |

### Ommaviy maosh to'lovi ⭐

```sql
FOR r IN (SELECT emp_acc, amount FROM salary_list WHERE batch_id = p_batch_id) LOOP
   SAVEPOINT before_payment;
   BEGIN
      UPDATE accounts SET balance = balance - r.amount WHERE id = 'COMPANY';
      UPDATE accounts SET balance = balance + r.amount WHERE id = r.emp_acc;
      IF SQL%ROWCOUNT = 0 THEN
         RAISE_APPLICATION_ERROR(-20001, 'Hisob topilmadi: ' || r.emp_acc);
      END IF;
   EXCEPTION
      WHEN OTHERS THEN
         ROLLBACK TO before_payment;              -- faqat shu to'lov (kompaniyadan yechilgani ham)
         log_error(p_batch_id, r.emp_acc, SQLERRM);
   END;
END LOOP;
COMMIT;                                           -- 997 saqlandi, 3 log'da
```

## Qachon COMMIT ⭐

❌ Loop ichida har qatordan keyin: 1) har commit diskni kutadi → sekin; 2) atomicity yo'qoladi, qayerdan davom etish noma'lum; 3) ORA-01555 (fetch across commit).

| Holat | COMMIT |
|---|---|
| Biznes tranzaksiya | Mantiqiy birlik tugaganda |
| Ommaviy ishlov | Oxirida bitta; juda katta bo'lsa paketlab + restartable (qayta ishlanganlarni belgilash) |

**Procedure ichida COMMIT?** Tranzaksiyani chaqiruvchi boshqaradi. `withdraw` ichida COMMIT bo'lsa, `transfer` ichida `deposit` xato berganda ALI'dan yechilgani qaytmaydi. Kichik procedure'larda COMMIT yo'q, eng yuqori darajada bor.

Trigger ichida COMMIT → `ORA-04092` (istisno: autonomous).

| Buyruq | Tranzaksiya | Qulflar |
|---|---|---|
| `COMMIT` | tugaydi | ochiladi |
| `ROLLBACK` | tugaydi | ochiladi |
| `ROLLBACK TO sp` | davom etadi | sp'dan keyingilari ochiladi |
| `SAVEPOINT` | davom etadi | o'zgarmaydi |
| Xato bergan buyruq | davom etadi, faqat o'zi bekor | oldingilari qoladi |

## Intervyuda shunday deysiz

> "COMMIT'da LGWR redo'ni diskka yozadi va qulflar ochiladi, shuning uchun u hajmdan qat'i nazar tez. ROLLBACK UNDO'dan qaytaradi va katta tranzaksiyada sekin. Oracle'da statement-level rollback bor: xato bergan buyruqning o'zi bekor bo'ladi, shuning uchun EXCEPTION'da o'zim ROLLBACK qilaman. SAVEPOINT bilan qisman bekor qilaman, masalan ommaviy to'lovda xatoli to'lovni. Loop ichida har qatordan keyin commit qilmayman. Tranzaksiyani chaqiruvchi boshqaradi, kichik procedure'larda commit yo'q."

## Tekshiruv savollari

1. Nega COMMIT tez, ROLLBACK sekin bo'lishi mumkin?
2. UPDATE ✅ → INSERT ❌ → COMMIT: nima saqlanadi?
3. `ROLLBACK TO sp1`dan keyin tranzaksiya tugaydimi?
4. Loop'da har qatordan keyin COMMIT: 3 sabab.
5. `withdraw` ichida COMMIT nega xavfli?

**Manba:** [Oracle Concepts – Transactions](https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/transactions.html) · [SAVEPOINT](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/SAVEPOINT.html)
