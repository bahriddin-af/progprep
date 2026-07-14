# architecture — kod tashkiloti

**Qachon:** 5–7-hafta

## `system-design/` dan farqi

Ko'pchilik buni chalkashtiradi, lekin interview'da bular **alohida round**:

- **architecture** = bitta ilova ichidagi kod tashkiloti.
  "SOLID'ni tushuntiring", "Repository pattern'ning kamchiligi nima?"
- **system-design** = tarqoq tizim, infratuzilma, masshtab.
  "Millionlab foydalanuvchi uchun chat qanday quriladi?"

## Mavzular

- SOLID — har bir printsipga **o'z kodingizdan** misol (kitobdagi `Shape`/`Circle` emas)
- Design patterns — hammasi emas, real ishlatiladiganlari:
  Strategy, Factory, Decorator, Adapter, Observer, Repository, Unit of Work
- Repository / Unit of Work — **kamchiliklari ham** (bu savol tuzoq: EF Core allaqachon UoW)
- CQRS — qachon kerak, qachon ortiqcha murakkablik
- DDD asoslari — aggregate, entity, value object, bounded context
- Clean / Hexagonal architecture — qatlamlar va bog'liqlik yo'nalishi

## Qoida

Har bir pattern uchun javob bering: **"buni ishlatmaslik qachon to'g'ri?"**
Pattern'ni maqtash — junior javob. Chegarasini bilish — senior javob.
