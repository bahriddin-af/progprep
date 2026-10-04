# 8 · Tezkor takrorlash: oldingi nomzodning savollari

## Indekslar (chuqurroq)

Kitob mundarijasi kabi: indekssiz = **Full Table Scan**, indeks bilan = ROWID orqali to'g'ri qatorga.

```
 Root:    [ 1..250 | 251..500 | 501..750 | ... ]                    ← yuzlab bo'lak
              │
 Branch:  [ 1..10 | 11..20 | ... | 101..110 | ... | 241..250 ]      ← yuzlab bo'lak
                                     │
 Leaf:    [ 101→ROWID | 102→ROWID | ... | 110→ROWID ]               ← yuzlab qiymat
```

**Binary tree emas:** har tugun = 1 blok (8 KB), unda yuzlab qiymat → daraxt past.

Saralangan · 1 mln qatorda 3–4 qadam · leaf'da qiymat + ROWID · leaf'lar bog'langan (`BETWEEN` tez).

| Tur | Qachon |
|---|---|
| **B-tree** | Ko'p turli qiymat (`acc_number`) |
| **Bitmap** | Kam turli qiymat, DWH. OLTP'da lock muammosi |
| **Unique** | PK avtomatik yaratadi |
| **Composite** | `(client_id, currency)`: chap ustun `WHERE`da bo'lishi kerak |
| **Function-based** | `UPPER(last_name)` |

**Ishlamaydi:** `UPPER(col)`, `TRUNC(date_col)`, `LIKE '%x'`, VARCHAR2 ustunni son bilan solishtirish, `col + 0`, `IS NULL`, `!=`.

```sql
WHERE created_at >= DATE'2026-09-27' AND created_at < DATE'2026-09-28'   -- TRUNC o'rniga
EXPLAIN PLAN FOR SELECT * FROM accounts WHERE client_id = 5;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);   -- INDEX RANGE SCAN / TABLE ACCESS FULL
```

Narxi: DML sekinlashadi, joy egallaydi; ko'p qator olinsa optimizer baribir full scan tanlaydi.

> "Indeks qidiruvni tezlashtiradigan struktura. Oracle'da default B-tree: saralangan daraxt, leaf'da qiymat va ROWID. Kam turli qiymatlar uchun bitmap, lekin u OLTP'da lock muammosi beradi. Composite'da ustun tartibi muhim. Indeks ishlamaydigan hollar: ustunga funksiya, `LIKE '%...'`, yashirin konvertatsiya, `IS NULL`. DML'ni sekinlashtiradi. Tekshirish: `EXPLAIN PLAN`, `DBMS_XPLAN`."

## Background jobs

```sql
BEGIN
   DBMS_SCHEDULER.CREATE_JOB (
      job_name        => 'JOB_DAILY_INTEREST',
      job_type        => 'STORED_PROCEDURE',
      job_action      => 'ACC_PKG.CALC_INTEREST',
      start_date      => SYSTIMESTAMP,
      repeat_interval => 'FREQ=DAILY; BYHOUR=23; BYMINUTE=30',
      enabled         => TRUE);
END;
/
EXEC DBMS_SCHEDULER.RUN_JOB('JOB_DAILY_INTEREST');
SELECT * FROM user_scheduler_job_run_details;
```

| | DBMS_JOB | DBMS_SCHEDULER |
|---|---|---|
| Holati | Eskirgan | Tavsiya etiladi |
| Imkoniyat | Faqat PL/SQL | PL/SQL, OS script, chain |
| Log | Yo'q | Batafsil tarix |

Bankda: kun yopish (EOD), foiz hisoblash, muddati o'tgan kreditlar, hisobotlar, arxivlash.

## HTTP va HTTPS

| | HTTP | HTTPS |
|---|---|---|
| Port | 80 | 443 |
| Ma'lumot | Ochiq matn | TLS bilan shifrlangan |
| Sertifikat | Yo'q | CA imzolagan |

```
 1. "Salom, TLS"  →  2. ← Sertifikat + ochiq kalit  →  3. Brauzer tekshiradi (CA, domen, muddat)
 4. Asimmetrik bilan session kaliti kelishiladi  →  5. Qolgan hammasi SIMMETRIK (AES) — tez
```

Metodlar: GET, POST, PUT, PATCH, DELETE. Status: 200, 201, 400, **401** (kimligi noma'lum), **403** (ruxsat yo'q), 404, 500. HTTP stateless → session/cookie kerak.

## Hash algoritmlari

Hash = barmoq izi: bir tomonlama · deterministik · qat'iy uzunlik · avalanche · collision'ga chidamli.

| Algoritm | Holati |
|---|---|
| MD5, SHA-1 | ❌ eskirgan |
| SHA-256/512 | ✅ yaxlitlik, imzo |
| bcrypt, Argon2, PBKDF2 | ✅ **parollar** (ataylab sekin) |

| | Hashing | Encryption | Encoding |
|---|---|---|---|
| Qaytariladimi | ❌ | ✅ kalit bilan | ✅ kalitsiz |
| Misol | SHA-256 | AES, RSA | Base64 |

Parol = **salt + bcrypt**. Oracle: `STANDARD_HASH('text', 'SHA256')`, `DBMS_CRYPTO.HASH`.

## Autentifikatsiya

Authentication (kimsan? → 401) · Authorization (nima mumkin? → 403).

```
 login+parol (HTTPS) → DB'dan hash+salt → bcrypt(parol+salt) == hash ? → session yoki token
```

| | Session + Cookie | JWT |
|---|---|---|
| Ma'lumot | Serverda | Token ichida |
| Logout | Oson | Qiyin |
| Masshtab | Session bo'lishish kerak | Oson |

Qo'shimcha: 2FA, OAuth 2.0, cookie `HttpOnly`, `Secure`, `SameSite`.

## Java: Tomcat, Servlet, JSP, Session

```
 Brauzer ──HTTP──► TOMCAT (servlet konteyner, 8080) ──JDBC──► Oracle
```

**Servlet lifecycle:**
```
 yuklash → init() 1 marta → service() HAR so'rovda (doGet/doPost, alohida thread) → destroy() 1 marta
```
Obyekt bitta, thread'lar ko'p → instance field'da holat saqlamaslik.

**JSP**: HTML ichida Java, birinchi so'rovda servlet'ga aylantiriladi. Servlet = controller, JSP = view.

**Session**: `req.getSession()`, `setAttribute`, `invalidate()`. Ma'lumot serverda, brauzerda `JSESSIONID` cookie. Timeout 30 daqiqa. Cookie yo'q bo'lsa → URL rewriting.

| Scope | Obyekt | Yashaydi |
|---|---|---|
| Request | `HttpServletRequest` | 1 so'rov |
| Session | `HttpSession` | foydalanuvchi sessiyasi |
| Application | `ServletContext` | ilova ishlaguncha |

Application lifecycle: `ServletContextListener.contextInitialized()` → servlet `init()` → ... → `destroy()` → `contextDestroyed()`.

## Qolgan tezkor savollar

| Savol | Javob |
|---|---|
| View vs MView | View saqlangan so'rov; MView natijani fizik saqlaydi, refresh qilinadi |
| Deadlock | Ikki session bir-birining qulfini kutadi → ORA-00060. Qatorlarni bir xil tartibda qulflash |
| `WHERE` vs `HAVING` | Guruhlashdan oldin / keyin |
| `UNION` vs `UNION ALL` | Dublikatni olib tashlaydi / hammasi |
| `RANK` vs `DENSE_RANK` | 1,1,3 / 1,1,2 |
| Pul turi | `NUMBER(18,2)`, FLOAT emas |
| Bind variable | Plan qayta ishlatiladi + SQL injection'dan himoya |

```sql
-- 2-eng katta maosh
SELECT salary FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) rn FROM employees)
 WHERE rn = 2;
-- Dublikatlarni o'chirish
DELETE FROM accounts
 WHERE ROWID NOT IN (SELECT MIN(ROWID) FROM accounts GROUP BY acc_number);
```
