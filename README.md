# interview-prep

Maqsad: **Middle+ / Senior .NET backend** pozitsiyasiga tayyorgarlik. 12 hafta.

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
Sabab: test yozmaslik — mening asosiy zaifligim. Uni karantinga olsam, yopilmaydi.

**3. Papka strukturasini kengaytirish — ish emas.**
Beshta papka. Ro'yxat yopiq. Yangi papka yaratish yoqimli va xatarsiz,
lekin u bironta masalani yechmaydi. Bu prokrastinatsiyaning eng chiroyli shakli.

---

## Papkalar (reject ehtimoli bo'yicha tartibda)

| Papka | Nima uchun | Vazn |
|---|---|---|
| `dsa/` | Birinchi filtr. Bu yerda yiqilsam, qolgan bilimim ko'rilmaydi ham | Eng yuqori |
| `dotnet/` | async, GC, DI lifetimes, EF Core pitfalls | Yuqori |
| `database/` | SQL, index, execution plan, transaction, deadlock. EF bilish ≠ SQL bilish | Yuqori |
| `architecture/` | SOLID, design patterns, CQRS, DDD | O'rta |
| `system-design/` | Tarqoq tizimlar, masshtab, trade-off'lar | O'rta |

Eslatma: system design eng "chiroyli" mavzu, lekin eng ko'p yiqitadigani — **DSA va SQL**.

---

## Fayllar

- `log.md` — haftalik yozuv. Yagona halol o'lchagich.
- `stories.md` — STAR hikoyalar. Interview'gacha 6–8 ta tayyor bo'lsin.
- `applications.md` — apply qilganlarim va **reject sabablari**. Yagona real feedback loop.
- `mocks/` — mock interview yozuvlari.

---

## Hozirgi holat

**Hafta:** 1 / 12
**Fokus:** DSA — arrays & hashing + har bir yechimga test

## Boshlash

```bash
cd dsa
dotnet test
```
