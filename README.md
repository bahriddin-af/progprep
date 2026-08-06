# PROGPREP

**Maqsad:** Middle+ / Senior .NET backend — **mahalliy fintech** (Payme, Click, Uzum, banklar). 12 hafta.

Muvaffaqiyat mezoni "0% reject" emas — bunga erishib bo'lmaydi.
Mezon: **agar reject olsam, sababi mening bilimim bo'lmasin.**

---

## 3 ta qoida

**1. Har hafta DELIVERABLE bo'lishi shart.**
Yozilgan kod, yechilgan masala, design hujjati, yozib olingan mock.
"Video ko'rdim", "maqola o'qidim" — deliverable EMAS.

**2. Har bir kod testsiz yozilmaydi.**
Bu shu yerdagi eng muhim qoida. Testni alohida "mavzu" qilib qo'ymaslik uchun
`testing/` papkasi ataylab yo'q — test har bir loyihaning ichida yashaydi.

Sabab: test yozmaslik — mening asosiy zaifligim, va u meni jimgina regressiyaga
olib kelgan. Oddiy kompaniyada bu kamchilik. **Fintech'da bu veto** — pul yo'qoladi.
"Kodingiz to'g'riligini qanday kafolatlaysiz?" savoli menga albatta beriladi.

**3. Papka strukturasini kengaytirish — ish emas.**
Beshta papka. Ro'yxat yopiq. Yangi papka yaratish yoqimli va xatarsiz,
lekin u bironta masalani yechmaydi. Bu prokrastinatsiyaning eng chiroyli shakli.

---

## Ustuvorlik (mahalliy fintech uchun)

| # | Papka | Nega |
|---|---|---|
| 1 | `database/` | Concurrency + isolation. **"Ikki kishi bir vaqtda bitta hisobdan pul yechsa?"** — bu savol albatta beriladi |
| 2 | `dotnet/` | .NET chuqurligi + pul bilan ishlash (`decimal`, rounding). Asosiy round |
| 3 | `stories.md` | Mening eng kuchli qurolim — pastga qarang |
| 4 | `architecture/` | SOLID, DDD, CQRS, audit trail / event sourcing |
| 5 | `system-design/` | Payment, ledger, saga, idempotency |
| 6 | `dsa/` | Yengil filtr. ~50 masala yetadi (NeetCode 150 emas). O'tish kifoya, porlash shart emas |

---

## Fintech'ga xos mavzular

Bular alohida papka emas — mavjud beshtaga tushadi.

**`dotnet/`**
- **Pulni `double`/`float` da saqlash — interview shu yerda tugaydi.** `decimal`.
  Sabab: IEEE 754 binary float 0.1 ni aniq ifodalay olmaydi.
- Rounding: banker's rounding (`MidpointRounding.ToEven`), precision, minor units (tiyin — butun son)

**`database/`** ⭐ eng muhim
- Lost update — ikki parallel balans yangilanishi
- Optimistic vs pessimistic locking — **qaysi biri va NEGA**
- Isolation levels — Read Committed'da qanday anomaliya qoladi
- `SELECT ... FOR UPDATE`, row-level lock, deadlock

**`architecture/`**
- Audit trail — yozuv o'chirilmaydi va o'zgartirilmaydi, faqat qo'shiladi
- Event sourcing asoslari

**`system-design/designs/`**
- `payment-system.md` — idempotency key (Stripe uslubi), retry, exactly-once illyuziyasi
- `ledger.md` — double-entry bookkeeping. **Fintech system design'ning markazi.**
  Balansni `UPDATE` qilmaysiz — immutable yozuvlar qo'shasiz.
- `wallet-balance.md` — concurrency
- `saga-outbox.md` — tarqoq tranzaksiya. **Menda bu muammo allaqachon bor** → hikoya tayyor

---

## Mening afzalligim (buni sotishni o'rganish kerak)

Mahalliy fintech'ga keladigan nomzodlarning aksariyati CRUD ilova yozgan. Menda:

- **Davlat tizimi** → bank/fintech ham xuddi shunday tartibga solinadigan muhit: audit,
  javobgarlik, xatoning yuqori narxi
- **Elektron imzo (ERI)** → bank tizimlarida kundalik talab
- **MVD/GCP integratsiyasi** → fintech'da **KYC** aynan shu davlat bazalariga ulanadi.
  Men buni allaqachon qilganman.
- **RabbitMQ + tarqoq tranzaksiya muammosi** → to'lov tizimining o'zagi

❌ "Men EDecision moduli ustida ishladim"

✅ "Men davlat bazalariga ulanadigan, elektron imzo bilan ishlaydigan, message queue
orqali asinxron oqimga ega tizimning modul egasi edim — va u yerda DB tranzaksiyasi
tashqi API'ni rollback qila olmasligi muammosiga duch keldim."

Ikkinchisi ularning tilida gapiryapti.

---

## Fayllar

- `log.md` — haftalik yozuv. Yagona halol o'lchagich.
- `stories.md` — STAR hikoyalar. Interview'gacha 6–8 ta tayyor bo'lsin.
- `applications.md` — apply qilganlarim va **reject sabablari**. Yagona real feedback loop.
- `mocks/` — mock interview yozuvlari.

---

## Hozirgi holat

**Hafta:** 1 / 12
**Fokus:** Testing odati + DSA arrays & hashing (har bir yechim test bilan)

## Boshlash

```bash
cd dsa
dotnet test
```
