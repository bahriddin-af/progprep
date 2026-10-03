# 9 · Kutiladigan qo'shimcha savollar

Intervyuer asosiy javobdan keyin chuqurlashtiradi: "indeks nima?" → "B-tree qanday?" → "nega bitmap OLTP'da yomon?"

## DB

| Asosiy savol | Qo'shimcha savol | Qisqa javob |
|---|---|---|
| SQL va PL/SQL | PL/SQL qayerda bajariladi? | Server tomonida, PL/SQL engine'da; SQL qismlari SQL engine'da |
| | Context switch nima? | Ikki engine orasidagi o'tish; `BULK COLLECT / FORALL` bilan kamaytiriladi |
| | Function'ni SQL ichida chaqirsa bo'ladimi? | Ha, DML qilmasa va `OUT` parametri bo'lmasa |
| ACID | Atomicity'ni Oracle qanday ta'minlaydi? | UNDO va `ROLLBACK` |
| | Durability-chi? | Redo log: `COMMIT`da diskka yoziladi |
| | Isolation level'lar? | RU, RC, RR, Serializable. Oracle: **Read Committed** (default), Serializable, Read Only |
| | Dirty read Oracle'da bormi? | Yo'q, o'quvchi eski versiyani UNDO'dan oladi |
| Indekslar | B-tree tuzilishi? | Root → branch → leaf; leaf'da qiymat + ROWID |
| | Har ustunga indeks qo'ysak? | DML sekinlashadi, joy ko'p ketadi |
| | Qachon ishlamaydi? | Funksiya, `LIKE '%x'`, yashirin konvertatsiya, `IS NULL`, `!=` |
| | Clustered indeks Oracle'da? | To'g'ridan-to'g'ri yo'q, o'xshashi **IOT** |
| | Ishlatilganini qanday bilasiz? | `EXPLAIN PLAN` + `DBMS_XPLAN.DISPLAY` |
| | PK va UNIQUE farqi? | PK NULL'siz va bitta; UNIQUE NULL qabul qiladi, bir nechta bo'lishi mumkin |
| Background jobs | DBMS_JOB vs DBMS_SCHEDULER? | Scheduler: chain, kalendar sintaksisi, tarix, OS script |
| | Job xato bersa? | `USER_SCHEDULER_JOB_RUN_DETAILS` + o'z log jadvalimiz |
| | Qo'lda ishga tushirish? | `DBMS_SCHEDULER.RUN_JOB('nom')` |

## Tarmoq va xavfsizlik

| Asosiy savol | Qo'shimcha savol | Qisqa javob |
|---|---|---|
| HTTP/HTTPS | Sertifikat nima uchun? | Server haqiqiyligini isbotlaydi (CA imzosi) |
| | Nega ikki xil shifrlash? | Asimmetrik sekin → faqat kalit uchun; ma'lumot AES bilan |
| | 401 vs 403? | Kimligi noma'lum / ruxsat yo'q |
| | GET vs POST? | URL'da parametr, olish / body'da, yuborish |
| Hash | Hash vs encryption? | Bir tomonlama / kalit bilan qaytariladi |
| | Salt nima? | Har userga tasodifiy qo'shimcha |
| | Nega bcrypt, SHA-256 emas? | SHA juda tez, brute-force oson |
| | Collision? | Ikki xil kirishdan bir xil hash |
| Auth | AuthN vs AuthZ? | Kimsan? / Nima mumkin? |
| | Session vs JWT? | Stateful serverda / stateless klientda |
| | Cookie himoyasi? | `HttpOnly`, `Secure`, `SameSite` |

## Java

| Asosiy savol | Qo'shimcha savol | Qisqa javob |
|---|---|---|
| Tomcat | Tomcat vs WebLogic? | Faqat servlet/JSP konteyner / to'liq Java EE |
| | Port? | 8080 |
| Servlet | Lifecycle? | `init()` → `service()` → `destroy()` |
| | Thread-safe'mi? | Obyekt bitta, thread ko'p → field'da holat saqlamaslik |
| | `doGet`ni kim chaqiradi? | `service()` HTTP metodiga qarab |
| JSP | Qanday ishlaydi? | Servlet'ga aylantirilib kompilyatsiya qilinadi |
| | Servlet vs JSP? | Controller / view |
| Session | Qanday ishlaydi? | Serverda ma'lumot, brauzerda `JSESSIONID` |
| | Cookie o'chirilgan bo'lsa? | URL rewriting |
| | Scope'lar? | Request, Session, Application |
| | Ilova start'da kod? | `ServletContextListener.contextInitialized()` |
