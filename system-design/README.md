# system-design

**Qachon:** 5–9-hafta

## Tuzilma

- `_template.md` — **har bir design shu shablonda**. Ochib o'qing, keyin ishlating.
- `building-blocks/` — nazariy asos (5–7-hafta)
- `designs/` — amaliy mashq (8–9-hafta) ⭐ eng muhim qism

## building-blocks/ — o'rganish tartibi

1. **Caching** — cache-aside, write-through, invalidation, TTL, thundering herd
2. **Database scaling** — replication (master-slave), sharding, consistent hashing
3. **Load balancing** — L4 vs L7, algoritmlar
4. **Message queues** — at-least-once, ordering, consumer groups, **idempotency**, outbox
5. **Consistency** — CAP, strong vs eventual, read-your-writes
6. **Rate limiting** — token bucket, sliding window
7. **Saga / distributed transactions**
8. **Fundamentals** (tez o'ting): DNS, HTTPS, JWT, "URL yozganda nima bo'ladi"

Eslatma: 4 va 7 — bu mening kundalik ishim. Nazariy nomlarini o'rganish qoldi.

## designs/ — mashq (haftasiga 3 ta)

url-shortener → rate-limiter → chat (websocket) → notification-system →
news-feed → payment-system (idempotency + saga qaytadi) → distributed-cache

**Qoida:** taymer 45 daqiqa, ovoz chiqarib, telefonga yozib oling, keyin tinglang.

Birinchi 3 tasi juda yomon chiqadi. Bu normal — aynan shuning uchun mashq kerak.
Yozib olmasangiz, o'z bo'shliqlaringizni eshitmaysiz.
