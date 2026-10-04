# 10 · Table, Tablespace, Schema, Datafile

## Table

Ma'lumot qator va ustunlarda saqlanadigan obyekt. **Qator** = bitta yozuv (bitta mijozning hisobi), **ustun** = yozuvning xususiyati (qoldiq), har ustunning turi bor (NUMBER, VARCHAR2, DATE).

## Tablespace va Datafile

Kutubxona misoli:

```
 Kutubxona        = Database
   └─ Bo'lim      = Tablespace   (mantiqiy nom)
       └─ Javon   = Datafile     (diskdagi haqiqiy fayl: .dbf)
           └─ Kitob = Table
```

- **Tablespace** mantiqiy saqlash joyi, ma'lumotni guruhlash uchun
- **Datafile** diskdagi faylning **o'zi** (boshqa fayllarni "saqlamaydi")
- Jadvallar, indekslar, UNDO: hammasi fizik jihatdan datafile'larda turadi

```sql
CREATE TABLESPACE bank_data
   DATAFILE 'D:\oracle\bank_data01.dbf' SIZE 500M AUTOEXTEND ON;

CREATE TABLE accounts (id VARCHAR2(10) PRIMARY KEY, balance NUMBER(18,2))
   TABLESPACE bank_data;
```

### Nega bir tablespace'da bir nechta datafile?

1. Bitta datafile ~32 GB chegarasi bor (8 KB blokda), to'lovlar jadvali o'sadi
2. Diskda joy tugaydi → yangi faylni boshqa diskka qo'yish
3. Turli disklardan parallel o'qish → tezroq

```sql
ALTER TABLESPACE bank_data ADD DATAFILE 'E:\oracle\bank_data02.dbf' SIZE 10G;
```

Bigfile tablespace: bitta juda katta fayl (`CREATE BIGFILE TABLESPACE ...`).

### Standart tablespace'lar

| Nomi | Nima |
|---|---|
| SYSTEM | Oracle ichki ma'lumotlari |
| SYSAUX | SYSTEM'ga yordamchi |
| **UNDO** | Eski qiymatlar → ROLLBACK (A) va read consistency (I) |
| **TEMP** | Vaqtinchalik: katta ORDER BY, GROUP BY, JOIN xotiraga sig'masa |
| USERS | Foydalanuvchi jadvallari (default) |

### Oracle'ning 3 asosiy fayli

| Fayl | Nima |
|---|---|
| Datafile | Ma'lumot: jadval, indeks, UNDO |
| Redo log file | O'zgarishlar "daftari" (Durability) |
| Control file | Baza "pasporti": fayllar qayerda |

## Schema va Tablespace farqi

| | Savol |
|---|---|
| **Schema** | Jadval **kimniki**? (Oracle'da schema = user) |
| **Tablespace** | Jadval **qayerda saqlanadi**? |

Bitta schemaning jadvallari bir nechta tablespace'da, bitta tablespace'da bir nechta schemaning jadvallari bo'lishi mumkin.

```sql
CREATE USER bank IDENTIFIED BY parol123
   DEFAULT TABLESPACE bank_data QUOTA 1G ON bank_data;
SELECT owner, table_name, tablespace_name FROM all_tables;
```

## SELECT qilganda ma'lumot qayerdan keladi?

```
 1. Buffer cache (SGA, xotira)da bormi?
      ├─ HA  → xotiradan ⚡ (logical read)
      └─ YO'Q → datafile'dan 🐢 (physical read) → keshga qo'yiladi
```

UPDATE ham buffer cache'da bo'ladi; COMMIT'da redo diskka yoziladi; DBWn keyinroq datafile'ga yozadi.

## Intervyu javobi

> "Table ma'lumot qator va ustunlarda saqlanadigan obyekt. Tablespace mantiqiy saqlash joyi, fizik jihatdan diskdagi bir yoki bir nechta datafile'dan iborat. Standart tablespace'lar: SYSTEM, SYSAUX, UNDO, TEMP, USERS. Schema esa user'ga tegishli obyektlar to'plami: schema 'kimniki', tablespace 'qayerda' degan savolga javob beradi."

## Mening javoblarim (baholar)

- Table: 9/10 · Tablespace/datafile: 6/10 (datafile = faylning o'zi!) · UNDO/TEMP: 8/10
- Qoldi: schema vs tablespace farqini o'z so'zim bilan yozish
