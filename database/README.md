# database — SQL va DB ichkarisi

**Qachon:** 3-hafta

## Nega alohida papka

**EF Core bilish ≠ SQL bilish.** Interviewer toza SQL savolini beradi va EF
sizni himoya qilmaydi. Backend interview'larida ko'pincha alohida DB round bor.

Bu — DSA'dan keyin eng ko'p yiqitadigan bo'lim. System design'dan ko'ra muhimroq.

## Mavzular va real savollar

| Mavzu | Savol |
|---|---|
| Index turlari | "Clustered va non-clustered farqi? Covering index nima?" |
| Index qachon ishlamaydi | "`WHERE UPPER(name) = 'X'` — index ishlaydimi? Nega?" ⭐ |
| Execution plan | Plan berilib, "bu yerda muammo qayerda?" deb so'raladi |
| Isolation levels | "Read Committed va Repeatable Read — qanday anomaliya farq qiladi?" |
| Deadlock | "Deadlock qanday paydo bo'ladi va qanday oldini olasiz?" |
| Locking | "Optimistic va pessimistic — qachon qaysi biri?" |
| Window functions / CTE | Amaliy masala beriladi |
| Normalizatsiya | "Qachon ataylab denormalizatsiya qilasiz?" |

## Ishlash usuli

Har bir mavzu uchun `.sql` fayl: masala → so'rov → **execution plan natijasi** →
xulosa. Nazariy konspekt emas — ishlatib ko'rilgan natija.
