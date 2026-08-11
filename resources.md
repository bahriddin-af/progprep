# Manbalar

> To'liq versiya, chizmalar bilan — `README.md` → "Manbalar" bo'limi.
> Bu fayl — kundalik ishlatish uchun qisqa checklist.

Ustuvorlik `README.md` dagi tartib bilan bir xil:
`database/` → `dotnet/` → `architecture/` → `system-design/` → `dsa/`.

**Qoida:** o'qish deliverable emas. `[ ]` → `[x]` faqat deliverable tayyor bo'lganda.

---

## 1. Database ⭐ eng muhim

| ✓ | Manba | Deliverable |
|---|---|---|
| [ ] | [A Critique of ANSI SQL Isolation Levels](https://arxiv.org/pdf/cs/0701157) — Berenson, Bernstein, Gray va b., 1995 ([CMU nusxasi](https://www.cs.cmu.edu/~15721-f24/papers/Critique_of_ANSI_Isolation_Levels.pdf)) | 4 anomaliyani (dirty read, non-repeatable read, phantom, lost update) o'z so'zim bilan `database/README.md` ga yozish |
| [ ] | [PostgreSQL — Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) | Read Committed'da lost update'ni reproduce qiluvchi integration test |
| [ ] | [PostgreSQL — Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html) | `SELECT ... FOR UPDATE` bilan balans yechish + parallel test |
| [ ] | [EF Core — Concurrency conflicts](https://learn.microsoft.com/en-us/ef/core/saving/concurrency) | `rowversion` token, `DbUpdateConcurrencyException` testda ushlanadi |
| [ ] | [SQL Server — Locking & row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide) | Ataylab deadlock yasash, log'ni o'qib izohlash |

**Interview savoli:** "Ikki kishi bir vaqtda bitta hisobdan pul yechsa nima bo'ladi?"
Javob kod bilan ko'rsatilishi kerak — optimistic yoki pessimistic, va **NEGA**.

---

## 2. .NET va pul

| ✓ | Manba | Deliverable |
|---|---|---|
| [ ] | [Goldberg — What Every Computer Scientist Should Know About Floating-Point](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html) (kirish qismi yetadi) | `0.1 + 0.2 != 0.3` ni `double` da ko'rsatuvchi test |
| [ ] | [`System.Decimal`](https://learn.microsoft.com/en-us/dotnet/api/system.decimal) + [`MidpointRounding`](https://learn.microsoft.com/en-us/dotnet/api/system.midpointrounding) | Banker's rounding (`ToEven`) vs `AwayFromZero` unit-testlari; minor units (tiyin — butun son) |
| [ ] | [Stephen Cleary — There Is No Thread](https://blog.stephencleary.com/2013/11/there-is-no-thread.html) | "async thread yaratadimi?" savoliga 3 jumlalik javob |
| [ ] | [Async/await best practices](https://learn.microsoft.com/en-us/archive/msdn-magazine/2013/march/async-await-best-practices-in-asynchronous-programming) | `.Result` deadlock'ini reproduce qilish, `ConfigureAwait` izohi |
| [ ] | [.NET GC fundamentals](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals) | Gen0/1/2 va LOH ni bir sahifada tushuntirish |
| [ ] | [DI service lifetimes](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection) | Captive dependency bug'ini yasab, keyin tuzatish |

**Veto savoli:** pulni `double`/`float` da saqlash — interview shu yerda tugaydi. Har doim `decimal`.

---

## 3. Architecture

| ✓ | Manba | Deliverable |
|---|---|---|
| [ ] | [Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html) | Outbox jadval sxemasi + relay skeleti |
| [ ] | [Idempotent Consumer](https://microservices.io/patterns/communication-style/idempotent-consumer.html) | Dublikat xabar ikki marta qo'llanmasligini isbotlovchi test |
| [ ] | [Saga](https://microservices.io/patterns/data/saga.html) | To'lov saga diagrammasi, compensating transaction'lar bilan |
| [ ] | [Fowler — Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) | Append-only ledger: yozuv o'chirilmaydi, o'zgartirilmaydi |
| [ ] | [Fowler — CQRS](https://martinfowler.com/bliki/CQRS.html) | Qachon kerak **EMAS**ligini ham yozish |
| [ ] | [Fowler — Bounded Context](https://martinfowler.com/bliki/BoundedContext.html) | Payment domenini kontekstlarga bo'lish |

---

## 4. System design (fintech)

| ✓ | Manba | Deliverable |
|---|---|---|
| [ ] | [Stripe — Idempotent requests](https://docs.stripe.com/api/idempotent_requests) | `Idempotency-Key` handler + retry testi |
| [ ] | Modern Treasury — Accounting for Developers [I](https://www.moderntreasury.com/journal/accounting-for-developers-part-i) · [II](https://www.moderntreasury.com/journal/accounting-for-developers-part-ii) · [III](https://www.moderntreasury.com/journal/accounting-for-developers-part-iii) | Double-entry ledger sxemasi (debit/credit balansi = 0) |
| [ ] | [Enforcing Immutability in your Double-Entry Ledger](https://www.moderntreasury.com/journal/enforcing-immutability-in-your-double-entry-ledger) | Audit trail: faqat `INSERT`, hech qachon `UPDATE`/`DELETE` |
| [ ] | [Polly — Retry / Circuit Breaker](https://github.com/App-vNext/Polly) | Jitter bilan retry policy + circuit breaker |

---

## 5. DSA — yengil filtr

~50 masala yetadi. O'tish kifoya, porlash shart emas.

| ✓ | Manba | Deliverable |
|---|---|---|
| [ ] | [NeetCode Roadmap](https://neetcode.io/roadmap) | `dsa/` dagi 12 patternning har biridan 3–4 masala |
| [ ] | [Big-O cheat sheet](https://www.bigocheatsheet.com/) | Har yechim tepasida time/space complexity komment |

---

## 12 haftaga taqsimot

| Hafta | Fokus | Yopilishi kerak |
|---|---|---|
| 1 | Database 1–5 | Lost update testi ishlaydi. Bu poydevor — shoshmang |
| 2–3 | .NET 6–11 | `decimal` + rounding testlari, async deadlock demo |
| 4–5 | Architecture 12–17 | Outbox sxemasi + idempotent consumer testi |
| 6–7 | System design 18–21 | `payment-system.md`, `ledger.md` yozilgan |
| 8–12 | Mock + `stories.md` | 6–8 STAR hikoya, 3+ yozib olingan mock |

DSA butun davomida haftasiga 4–5 masala — alohida blok emas.
