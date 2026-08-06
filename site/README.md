# site — InterviewPrep frontend

Next.js 16 · TypeScript · Tailwind v4 · Zustand

Arxitektura: [`ARCHITECTURE.md`](./ARCHITECTURE.md)

## Ishga tushirish

```bash
npm install
npm run dev        # kontent build + dev server
```

| Buyruq | Nima qiladi |
|---|---|
| `npm run content` | `platform.html` → `content/roadmap.json` (+ validatsiya) |
| `npm run dev` | kontent + dev server |
| `npm run build` | kontent + 347 statik sahifa |
| `npm test` | `lib/` sof mantiq testlari (14 ta) |
| `npm run typecheck` | `tsc --noEmit` |

## Kontent

Haqiqat manbai — hozircha `platform.html` ichidagi `DATA` massivi.
`scripts/build-content.mjs` uni o'qiydi, normallashtiradi va tekshiradi:
har mavzuda `summary`, `lesson` va kamida bitta savol bo'lishi shart,
`id` takrorlanmasligi kerak. Buzilsa build yiqiladi.

Keyingi qadam — markdown fayllardan (`../dotnet/*.md` va h.k.) to'g'ridan-to'g'ri
parse qilish.

## Marshrutlar

```
/                                  landing
/roadmaps/dotnet-backend           bosqichlar va mavzular
/roadmaps/dotnet-backend/topic/ID  mavzu — to'liq sahifa
                                   ro'yxatdan bosilsa drawer bo'lib ochiladi
/progress                          shaxsiy statistika
```

Drawer — intercepting route (`@drawer/(.)topic/[topicId]`), `searchParams` emas.
Shuning uchun barcha sahifalar statik qoladi va havola ulashilsa to'liq sahifa
ochiladi.
