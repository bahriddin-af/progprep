# Frontend arxitekturasi

> Komponent kodlari va Tailwind namunalari — [`../platform-architecture.md`](../platform-architecture.md).
> Bu fayl — **qatlamlar, ma'lumot oqimi va render strategiyasi**.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Zustand
_(React Flow — 4-bosqichda)_

---

## 1. Qatlamlar

```
┌─────────────────────────────────────────────────────────────┐
│  CONTENT                    markdown fayllar (haqiqat manbai)│
│  dotnet/*.md, database/README.md, system-design/*.md ...     │
└──────────────────────┬──────────────────────────────────────┘
                       │  build vaqtida parse
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  DATA                       content/*.json + Zod sxema       │
│  Roadmap → Stage → Topic → Question                          │
└──────────────────────┬──────────────────────────────────────┘
                       │  server component import
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  DOMAIN            layout hisoblash, progress mantiqi        │
│  lib/graph.ts, lib/progress.ts   ← React'siz, sof funksiya   │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  UI                 RSC (statik)  +  Client (interaktiv)     │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  PERSISTENCE        localStorage  →  (login bo'lsa) API      │
└─────────────────────────────────────────────────────────────┘
```

**Bitta qoida:** bog'liqlik faqat pastga. `lib/graph.ts` React'ni bilmaydi,
`content/` UI'ni bilmaydi. Bu domen mantiqini brauzersiz test qilish imkonini
beradi.

---

## 2. Kontent quvuri

Markdown fayllar allaqachon yozilgan (34 000 qator). Ularni qo'lda JSON'ga
ko'chirish — ikki nusxa va ikki xil haqiqat. Shuning uchun **build vaqtida**
parse qilinadi.

```
   syllabus.md          ─┐
   dotnet/csharp.md      │
   database/README.md    ├─►  scripts/build-content.mjs
   system-design/*.md    │         │
   ...                  ─┘         │  remark + gray-matter
                                   │  Zod bilan validatsiya
                                   ▼
                          content/roadmap.json
                                   │
                                   │  import (RSC)
                                   ▼
                             app/roadmaps/[slug]
```

```ts
// scripts/build-content.mjs — markdown → tuzilgan ma'lumot
//
//  # 7.3 · DI va servis umri          → Topic { id, title }
//  > summary satri                    → Topic.summary
//  ## blok mazmuni                    → Topic.lesson (HTML)
//  **Savol?**  + javob paragraflari   → Question[]
//  ⭐ belgisi                          → hot: true
```

**Nega build vaqtida, runtime'da emas:** kontent o'zgarmaydi, foydalanuvchiga
bog'liq emas, va parse qimmat. Bir marta qilinadi, natija statik.

**CI'da tekshiruv:** har topic'da `summary` bor, kamida 1 ta savol, `id`
takrorlanmaydi. Sxema buzilsa build yiqiladi — bu kontent xatosini deploy'dan
oldin ushlaydi.

---

## 3. Render strategiyasi

Bu qismni to'g'ri taqsimlash — asosiy performans qarori.

```
                      SERVER (RSC)              CLIENT
   ┌──────────────────────────────┬───────────────────────────┐
   │ layout.tsx                   │                           │
   │ page.tsx                     │                           │
   │ Header (statik qism)         │  NavLinks (active state)  │
   │ Hero                         │                           │
   │ StageSection                 │                           │
   │ TopicNode ← faqat markup     │  StatusToggle             │
   │ TopicDrawer ← MAZMUN         │  DrawerShell ← ochish     │
   │                              │  RoadmapCanvas (ReactFlow)│
   └──────────────────────────────┴───────────────────────────┘

   ⚠ ASOSIY: drawer MAZMUNI server komponentida.
     Client komponent faqat ochish/yopish va animatsiyani boshqaradi.
```

```tsx
// ❌ butun drawer client — 171 mavzuning HTML'i JS bundle'iga tushadi
'use client';
export function TopicDrawer({ topic }) { return <div>{topic.lesson}</div>; }

// ✅ mazmun server'da, faqat qobiq client'da
// TopicDrawer.tsx  (server)
export function TopicDrawer({ topic }: { topic: Topic }) {
  return (
    <DrawerShell title={topic.title}>      {/* client — ochish/yopish */}
      <article dangerouslySetInnerHTML={{ __html: topic.lesson }} />
      <QuestionList questions={topic.questions} />
    </DrawerShell>
  );
}
```

| Qaror | Sabab |
|---|---|
| Sahifa `generateStaticParams` bilan statik | Kontent o'zgarmaydi, CDN'dan beriladi |
| Drawer — `searchParams` emas, **intercepting route** | `searchParams` sahifani dinamik qiladi; marshrut statikligini saqlaydi |
| Drawer mazmuni RSC | Bundle kichik qoladi (171 mavzu ≈ 450 KB matn) |
| React Flow faqat `/roadmaps/[slug]` da | ~40 KB, boshqa sahifalarda kerak emas |
| Progress client'da | Foydalanuvchiga xos, statik sahifani buzmaydi |

**Bundle byudjeti:** birinchi yuklash JS < 120 KB (gzip). React Flow lazy
import bilan alohida chunk'da.

---

## 4. Ma'lumot oqimi

```
   FOYDALANUVCHI                    HOLAT                   SAQLASH
   ────────────                     ─────                   ───────

   tugunni bosdi
        │
        ▼
   /roadmaps/[slug]/topic/m7-3 ──► URL = HOLAT MANBAI
        │                            │
        │                            ├─ orqaga tugmasi ishlaydi
        │                            ├─ havolani ulashish mumkin
        │                            └─ refresh'da drawer ochiq qoladi
        ▼
   TopicDrawer ochiladi
        │
        ▼
   "Tugatildi" bosildi
        │
        ▼
   useProgress().set(id, 'done')
        │
        ├──► Zustand store (darhol UI yangilanadi)
        │
        ├──► localStorage (sinxron, kutmaydi)
        │
        └──► login bo'lsa: POST /api/progress   (fon, debounce 2 s)
                    │
                    └─ xato bo'lsa: localStorage baribir saqlangan
```

**Prinsip:** UI hech qachon tarmoqni kutmaydi. localStorage — haqiqat manbai,
server — zaxira nusxa va qurilmalar orasida sinxronizatsiya.

```ts
// lib/progress.ts — konfliktni hal qilish
// Ikki qurilmada turli holat bo'lsa: oxirgi yozilgani yutadi (updatedAt).
// Pul emas — murakkab birlashtirish kerak emas.
type ProgressEntry = { status: Status; updatedAt: number };
```

---

## 5. Holat boshqaruvi — nima qayerda

```
   URL (marshrut)          /topic/m7-3      qaysi drawer ochiq
                           #stage-slug       qaysi bosqichga skroll
        │
        └─► ulashiladigan, orqaga tugmasi ishlaydi

   Zustand (persist)       progress          171 ta id → status
                           theme             light / dark
        │
        └─► localStorage bilan avtomatik sinxron

   React state             drawer animatsiyasi, akkordeon ochiqligi
        │
        └─► komponentdan tashqariga chiqmaydi

   Server                  kontent           o'zgarmas, RSC orqali
```

**Qoida:** URL'ga sig'adigan narsa URL'da bo'lsin. Ulashiladigan holatni
Zustand'ga qo'yish — orqaga tugmasini buzadi.

```
   ⚠ Global store'ga NIMA TUSHMASIN:
     · drawer ochiqmi        → URL
     · kontent               → RSC
     · hover, focus          → lokal state
```

---

## 6. Marshrutlar

```
   /                        landing — hero + roadmap kartalar
   /roadmaps                barcha roadmap'lar
   /roadmaps/[slug]                 ⭐ asosiy — bosqichlar va mavzular
   /roadmaps/[slug]/topic/[id]      mavzu — to'liq sahifa (ulashiladi)
   @drawer/(.)topic/[id]            ⭐ INTERCEPTING — ro'yxatdan bosilganda
                                       ro'yxat ustida drawer bo'lib ochiladi
   /questions/[slug]        faqat savollar ro'yxati (takrorlash uchun)
   /progress                shaxsiy statistika
   /mock-interview          mock jurnali

   /api/progress            GET / POST — login qilganlar uchun
```

`slug` qiymatlari: `dotnet-backend` (asosiy, 15 bosqich), keyinchalik
`dsa-only`, `system-design-only` kabi kesimlar.

---

## 7. Graf layout

React Flow tugun pozitsiyasini o'zi hisoblamaydi — bizga kerak.

```
   Bosqich (Stage)
   ═══════════════
        │
   ┌────┴────┬─────────┐
   │         │         │
 ┌───┐    ┌───┐     ┌───┐        bir qatorda 3 ta tugun
 │7.1│    │7.2│     │7.3│        kenglik bo'yicha moslashadi
 └───┘    └───┘     └───┘
   │         │         │
   └────┬────┴─────────┘
        │
   Keyingi bosqich
```

```ts
// lib/graph.ts — sof funksiya, React'siz, test qilinadi
export function buildLayout(stages: Stage[], width: number): Layout {
  // qaytaradi: { nodes: {id, x, y, w, h}[], edges: {from, to}[] }
  // mobil (< 768) → 1 ustun,  planshet → 2,  desktop → 3
}
```

**Nega alohida faylda:** layout mantiqini brauzersiz test qilish mumkin —
«3 bosqich, 12 mavzu → tugunlar kesishmaydi va ustunlar teng» degan test
oddiy unit test bo'ladi.

---

## 8. Papka strukturasi

```
site/
├── app/
│   ├── layout.tsx                  tema, shriftlar
│   ├── page.tsx                    landing
│   ├── roadmaps/[slug]/
│   │   ├── layout.tsx              children + @drawer parallel slot
│   │   ├── page.tsx                ⭐ bosqichlar ro'yxati (statik)
│   │   ├── topicShared.tsx         params + resolve, ikki marshrut uchun
│   │   ├── topic/[topicId]/        to'liq sahifa (statik)
│   │   └── @drawer/(.)topic/[id]/  intercepting drawer (statik)
│   ├── questions/[slug]/page.tsx
│   ├── progress/page.tsx
│   └── api/progress/route.ts
│
├── components/
│   ├── layout/       Header, Footer, ThemeToggle
│   ├── marketing/    Hero, RoadmapCard
│   ├── roadmap/
│   │   ├── RoadmapCanvas.tsx       'use client' — React Flow
│   │   ├── StageSection.tsx        server
│   │   ├── TopicNode.tsx           server (markup)
│   │   ├── StatusToggle.tsx        'use client'
│   │   ├── DrawerShell.tsx         'use client' — ochish/yopish
│   │   ├── TopicDrawer.tsx         server — MAZMUN
│   │   └── QuestionAccordion.tsx   'use client'
│   └── ui/           Button, Badge, Progress
│
├── lib/
│   ├── graph.ts                    layout hisoblash — sof
│   ├── progress.ts                 status mantiqi — sof
│   ├── store.ts                    Zustand + persist
│   └── content.ts                  JSON o'qish + Zod
│
├── content/
│   ├── roadmap.json                build natijasi
│   └── schema.ts                   Zod sxema
│
├── scripts/
│   └── build-content.ts            markdown → JSON
│
└── platform.html                   ⭐ hozirgi ishlaydigan prototip
```

---

## 9. Ko'chirish rejasi

`platform.html` allaqachon ishlaydi va 171 mavzu ichida. Uni bir zumda
almashtirishga hojat yo'q.

```
   1-bosqich   scripts/build-content.mjs  →  roadmap.json
               ⚠ platform.html'dagi DATA massivi manba sifatida
               (markdown parser'dan oldin — tezroq va aniqroq)

   2-bosqich   Next.js skeleti + statik ro'yxat ko'rinishi
               drawer'siz, faqat mavzular ro'yxati

   3-bosqich   Drawer + progress (localStorage)
               → shu nuqtada platform.html bilan funksional teng

   4-bosqich   React Flow graf ko'rinishi

   5-bosqich   Auth + server progress (ixtiyoriy)
```

**Hozirgi holat:** 1–3 bosqich bajarildi. `platform.html` hali manba sifatida
kerak (build undan o'qiydi), shuning uchun saqlanadi. Markdown parser
qo'shilgandan keyin arxivga o'tadi.

---

## 10. Test strategiyasi

```
   Sof mantiq (Vitest)         lib/graph.ts, lib/progress.ts
                               tez, brauzersiz — asosiy qamrov shu yerda

   Komponent (Testing Library) StatusToggle, QuestionAccordion
                               klaviatura, aria, holat o'zgarishi

   E2E (Playwright)            ⭐ 3 ta kritik yo'l:
                               · tugun bosildi → drawer ochildi → URL o'zgardi
                               · "tugatildi" → refresh → holat saqlandi
                               · mobil: drawer to'liq ekran

   Kontent (CI)                Zod sxema + id takrorlanmasligi
```

---

## 11. Erishish mumkinlik va performans

| Talab | Chora |
|---|---|
| Klaviatura | Tugunlar `<button>`, drawer'da focus trap, `Esc` yopadi |
| Skrinreader | `aria-expanded`, `aria-current`, holat matn bilan ham |
| Kontrast | Sariq badge ustida qora matn — 4.5:1 dan yuqori |
| Harakat | `prefers-reduced-motion` — animatsiya o'chadi |
| Tema | `prefers-color-scheme` + qo'lda o'tkazgich, token darajasida |
| LCP | Statik sahifa + CDN, hero'da rasm yo'q |
| Bundle | < 120 KB gzip, React Flow alohida chunk |
| Shriftlar | `next/font` bilan self-host, `font-display: swap` |
```
