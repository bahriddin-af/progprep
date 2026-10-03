# 6 · Trigger'lar

## O'xshatish

Seyf signalizatsiyasi: eshik ochilsa, hech kim tugma bosmasa ham kamera **o'zi** yonadi. **Trigger** = jadvaldagi `INSERT/UPDATE/DELETE`da **avtomatik** ishlaydigan PL/SQL blok. Uni qo'lda chaqirib bo'lmaydi.

| Vaqt | Qachon |
|---|---|
| `BEFORE` | Tekshirish, `:NEW`ni o'zgartirish |
| `AFTER` | Audit, log, boshqa jadvalni yangilash |
| `INSTEAD OF` | Faqat view uchun |

## Row-level va Statement-level

```
 UPDATE 1000 qator:
 Statement-level:  ⚡             → 1 marta
 Row-level:        ⚡⚡⚡ ... ⚡    → 1000 marta (FOR EACH ROW)
```

## :NEW va :OLD

| Hodisa | `:OLD` | `:NEW` |
|---|---|---|
| `INSERT` | NULL | yangi qator |
| `UPDATE` | eski | yangi |
| `DELETE` | o'chirilgan | NULL |

## Audit trigger

```sql
CREATE OR REPLACE TRIGGER trg_accounts_audit
AFTER UPDATE OF balance ON accounts
FOR EACH ROW
BEGIN
   INSERT INTO balance_audit
   VALUES (:OLD.id, :OLD.balance, :NEW.balance, USER, SYSDATE);
END;
/
```

## BEFORE trigger

```sql
CREATE OR REPLACE TRIGGER trg_accounts_check
BEFORE INSERT OR UPDATE ON accounts
FOR EACH ROW
BEGIN
   IF :NEW.balance < 0 THEN
      RAISE_APPLICATION_ERROR(-20010, 'Qoldiq manfiy bo''lishi mumkin emas');
   END IF;
   IF INSERTING THEN
      :NEW.id         := acc_seq.NEXTVAL;
      :NEW.created_at := SYSDATE;
   END IF;
END;
/
```

- `:NEW`ni faqat `BEFORE`da o'zgartirish mumkin
- Oddiy tekshiruv uchun `CHECK` constraint yaxshiroq

## Mutating table (ORA-04091)

Row-level trigger o'z jadvalini o'qisa yoki o'zgartirsa chiqadi: jadval yarim o'zgargan holatda.

```
 ✅✅✅✅✅ (500 yangilandi) │ ⏳⏳⏳⏳⏳ (500 hali)
                          ▲ row trigger SUM so'rasa → ❌ ORA-04091
```

Yechim: **compound trigger**, statement-level trigger yoki mantiqni procedure'ga ko'chirish.

```sql
CREATE OR REPLACE TRIGGER trg_acc_compound
FOR UPDATE OF balance ON accounts
COMPOUND TRIGGER
   TYPE t_ids IS TABLE OF accounts.client_id%TYPE;
   v_clients t_ids := t_ids();

   AFTER EACH ROW IS
   BEGIN
      v_clients.EXTEND;
      v_clients(v_clients.COUNT) := :NEW.client_id;
   END AFTER EACH ROW;

   AFTER STATEMENT IS
   BEGIN
      FOR i IN 1 .. v_clients.COUNT LOOP
         UPDATE clients
            SET total_balance = (SELECT SUM(balance) FROM accounts WHERE client_id = v_clients(i))
          WHERE id = v_clients(i);
      END LOOP;
   END AFTER STATEMENT;
END trg_acc_compound;
/
```

Bo'limlar: `BEFORE STATEMENT` · `BEFORE EACH ROW` · `AFTER EACH ROW` · `AFTER STATEMENT`.

## Autonomous transaction (log saqlanib qolsin)

```sql
CREATE OR REPLACE PROCEDURE log_attempt (p_msg VARCHAR2) IS
   PRAGMA AUTONOMOUS_TRANSACTION;
BEGIN
   INSERT INTO security_log(msg, at) VALUES (p_msg, SYSDATE);
   COMMIT;
END;
/
```

Asosiy tranzaksiya rollback bo'lsa ham log qoladi. Pul uchun ishlatilmaydi.

## Kamchiliklar

Yashirin mantiq · DML sekinlashadi · trigger zanjirlari · `TRUNCATE` trigger'ni ishga tushirmaydi. Murakkab biznes mantiq package'da bo'lishi kerak.

```sql
ALTER TRIGGER trg_accounts_audit DISABLE;
ALTER TABLE accounts DISABLE ALL TRIGGERS;
SELECT trigger_name, status FROM user_triggers;
```

> "Trigger jadvaldagi DML hodisasida avtomatik ishlaydigan PL/SQL blok: `BEFORE`, `AFTER`, view uchun `INSTEAD OF`. Row-level har qator uchun ishlaydi va `:OLD`, `:NEW` bor; statement-level bir marta. `:NEW`ni faqat `BEFORE`da o'zgartirish mumkin. Bankda asosan audit uchun. Row-level trigger o'z jadvalini o'qisa, ORA-04091 chiqadi, uni compound trigger bilan hal qilaman. Murakkab mantiqni package'da yozaman."

**Manba:** [PL/SQL Triggers](https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/plsql-triggers.html)
