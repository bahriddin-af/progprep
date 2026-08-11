# InterviewPrep — arxitektura va UI komponentlar

roadmap.sh uslubidagi intervyuga tayyorgarlik platformasi.
Stack: **Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + React Flow**.

Ishlaydigan prototip: https://claude.ai/code/artifact/130efd29-9a22-480e-8900-04840edf4f72

---

## 1. Papka strukturasi

```
app/
├── layout.tsx                    # <html>, tema provayderi, shriftlar
├── page.tsx                      # Landing: Hero + RoadmapGrid
├── globals.css                   # Tailwind + @theme tokenlar
├── roadmaps/
│   ├── page.tsx                  # Barcha roadmap'lar ro'yxati
│   └── [slug]/
│       ├── page.tsx              # Bitta roadmap (server component)
│       └── opengraph-image.tsx
├── questions/[slug]/page.tsx     # Savollar ro'yxati ko'rinishi
├── mock-interview/page.tsx
├── pricing/page.tsx
└── api/
    └── progress/route.ts         # POST/GET — login qilgan user progressi

components/
├── layout/
│   ├── Header.tsx                # Logo + nav + auth tugmalar
│   ├── NavLinks.tsx
│   ├── MobileMenu.tsx
│   └── Footer.tsx
├── marketing/
│   ├── Hero.tsx
│   ├── RoadmapGrid.tsx
│   └── RoadmapCard.tsx
├── roadmap/
│   ├── RoadmapCanvas.tsx         # 'use client' — React Flow konteyner
│   ├── nodes/
│   │   ├── TopicNode.tsx         # sariq blok
│   │   ├── StageNode.tsx         # qora sarlavha blok
│   │   └── LabelNode.tsx         # matnli izoh
│   ├── edges/DashedEdge.tsx
│   ├── ProgressBar.tsx           # legend + foiz
│   └── LegendRow.tsx
├── topic/
│   ├── TopicDrawer.tsx           # 'use client' — o'ng paneldan chiqadigan
│   ├── StatusToggle.tsx          # Jarayonda / Tugatildi / O'tkazib yuborish
│   ├── QuestionAccordion.tsx
│   ├── AnswerBody.tsx            # MDX render
│   ├── CodeBlock.tsx             # Shiki highlight
│   └── ResourceList.tsx
└── ui/                           # primitivlar
    ├── Button.tsx
    ├── Badge.tsx
    ├── Sheet.tsx                 # Radix Dialog wrapper
    ├── Accordion.tsx
    └── ThemeToggle.tsx

lib/
├── roadmaps/
│   ├── registry.ts               # slug → metadata
│   ├── dotnet-fintech.ts         # nodes + edges + topics
│   └── types.ts
├── content/                      # MDX savollar va javoblar
│   └── dotnet-fintech/db-lost-update.mdx
├── hooks/
│   ├── useProgress.ts            # localStorage + server sync
│   └── useTopicDrawer.ts         # URL query state (?topic=db-lost-update)
└── utils/cn.ts                   # clsx + tailwind-merge

stores/
└── progressStore.ts              # Zustand — persist middleware
```

**Server / Client chegarasi:**

| Komponent | Turi | Sabab |
|---|---|---|
| `app/roadmaps/[slug]/page.tsx` | Server | Kontent build vaqtida o'qiladi, SEO |
| `RoadmapCanvas` | Client | React Flow — DOM o'lchovlari, drag |
| `TopicDrawer` | Client | Holat, animatsiya, klaviatura |
| `AnswerBody` | Server (RSC) | MDX server'da render qilinadi, bundle kichik qoladi |

---

## 2. Dizayn tokenlari (Tailwind v4)

`globals.css` — `tailwind.config.js` shart emas, `@theme` yetadi:

```css
@import "tailwindcss";

@theme {
  /* Neytral — sof oq va qora, roadmap.sh kabi */
  --color-canvas:      #ffffff;
  --color-canvas-alt:  #f9f9f9;
  --color-ink:         #0a0a0a;
  --color-ink-muted:   #3f3f46;
  --color-ink-faint:   #71717a;
  --color-hairline:    #e4e4e7;

  /* Node holatlari */
  --color-node:        #ffe599;   /* sariq — o'rganilmagan */
  --color-node-learn:  #d3ccfb;   /* siyohrang — jarayonda */
  --color-node-done:   #c6e7b8;   /* yashil — tugatilgan */
  --color-node-skip:   #e4e4e7;   /* kulrang — o'tkazib yuborilgan */

  --shadow-hard:       3px 3px 0 #0a0a0a;
  --shadow-hard-lg:    5px 5px 0 #0a0a0a;

  --radius-node:       8px;
}

@layer base {
  :root { color-scheme: light; }
  .dark {
    color-scheme: dark;
    --color-canvas:     #0a0a0a;
    --color-canvas-alt: #121212;
    --color-ink:        #fafafa;
    --color-ink-muted:  #d4d4d8;
    --color-ink-faint:  #a1a1aa;
    --color-hairline:   #27272a;
    --shadow-hard:      3px 3px 0 #000;
  }
}
```

Dark mode uchun `next-themes` + `<html class="dark">`.

---

## 3. Komponentlar — Tailwind kod namunalari

### 3.1 Header

```tsx
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2 text-base font-extrabold tracking-tight">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-[5px]
                           border-2 border-ink bg-node text-[11px] font-extrabold text-black">
            IP
          </span>
          InterviewPrep
        </Link>

        <nav className="ml-2 hidden gap-0.5 md:flex">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-2.5 py-1.5 text-sm text-ink-muted
                         transition-colors hover:bg-canvas-alt hover:text-ink
                         aria-[current=page]:font-semibold aria-[current=page]:text-ink"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost">Login</Button>
          <Button variant="solid">Sign up</Button>
        </div>
      </div>
    </header>
  );
}
```

### 3.2 Button — variantlar

```tsx
const button = cva(
  "inline-flex items-center justify-center rounded-lg text-sm whitespace-nowrap " +
  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-ink disabled:opacity-50",
  {
    variants: {
      variant: {
        ghost: "border border-hairline bg-canvas text-ink hover:bg-canvas-alt",
        solid: "bg-ink font-semibold text-canvas hover:opacity-85",
        node:  "border-2 border-black bg-node text-black shadow-hard " +
               "hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg " +
               "active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_#0a0a0a]",
      },
      size: { sm: "h-8 px-3", md: "h-9 px-3.5", lg: "h-11 px-5 text-[15px]" },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  }
);
```

### 3.3 Hero

```tsx
export function Hero() {
  return (
    <section className="border-b border-hairline bg-canvas-alt">
      <div className="mx-auto max-w-6xl px-5 py-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-hairline
                         bg-canvas px-3 py-1.5 text-[13px] text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
          <b className="text-ink">.NET Backend</b> · mahalliy fintech uchun
        </span>

        <h1 className="mx-auto mt-5 max-w-[16ch] text-balance text-3xl font-extrabold
                       tracking-tighter sm:text-5xl">
          Intervyuga bosqichma-bosqich tayyorlaning
        </h1>

        <p className="mx-auto mt-4 max-w-[56ch] text-[17px] text-ink-muted">
          Payme, Click, Uzum va banklar so'raydigan savollar — ustuvorlik bo'yicha
          tartiblangan yo'l xaritasi.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Button variant="solid" size="lg">Sign up free</Button>
          <Button size="lg">Yo'l xaritasini ko'rish</Button>
        </div>
      </div>
    </section>
  );
}
```

### 3.4 TopicNode — roadmap.sh'ning asosiy bloki

Bu eng muhim komponent: **2px qora chegara + qattiq soya + sariq fon**, va holatga qarab rang almashadi.

```tsx
import { Handle, Position, type NodeProps } from "@xyflow/react";

const STATUS_BG = {
  pending:  "bg-node",
  learning: "bg-node-learn",
  done:     "bg-node-done",
  skipped:  "bg-node-skip text-ink-faint line-through decoration-1",
} as const;

export function TopicNode({ data }: NodeProps<TopicNodeData>) {
  const { title, questionCount, status = "pending", onOpen } = data;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!opacity-0" />

      <button
        type="button"
        onClick={() => onOpen(data.id)}
        aria-label={`${title} — ${questionCount} savol`}
        className={cn(
          "group flex w-[240px] items-center gap-2.5 rounded-lg border-2 border-black",
          "px-3.5 py-2.5 text-left text-[15px] font-semibold -tracking-[0.01em] text-black",
          "shadow-hard transition-transform duration-100",
          "hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg",
          "active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_#0a0a0a]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          STATUS_BG[status]
        )}
      >
        <span className={cn(
          "grid h-4 w-4 flex-none place-items-center rounded border-2 border-current",
          "text-[11px] font-extrabold",
          status === "pending" ? "opacity-40" : "opacity-100"
        )}>
          {status === "done" ? "✓" : status === "learning" ? "•" : ""}
        </span>

        <span className="flex-1">{title}</span>

        <span className="ml-auto font-mono text-[11px] tabular-nums opacity-60">
          {questionCount}
        </span>
      </button>

      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </>
  );
}
```

### 3.5 StageNode — qora sarlavha

```tsx
export function StageNode({ data }: NodeProps<{ index: number; title: string }>) {
  return (
    <div className="rounded-lg border-2 border-ink bg-ink px-5 py-2.5
                    text-base font-bold -tracking-[0.02em] text-canvas shadow-hard">
      {data.index}. {data.title}
    </div>
  );
}
```

### 3.6 RoadmapCanvas — React Flow konteyner

```tsx
"use client";

import { ReactFlow, Background, BackgroundVariant, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const nodeTypes = { topic: TopicNode, stage: StageNode, label: LabelNode };
const edgeTypes = { dashed: DashedEdge };

export function RoadmapCanvas({ slug, nodes, edges }: RoadmapCanvasProps) {
  const { status, setStatus } = useProgress(slug);
  const { open } = useTopicDrawer();

  const enriched = useMemo(
    () => nodes.map(n =>
      n.type === "topic"
        ? { ...n, data: { ...n.data, status: status[n.id] ?? "pending", onOpen: open } }
        : n
    ),
    [nodes, status, open]
  );

  return (
    <div className="h-[calc(100dvh-8.5rem)] w-full bg-canvas">
      <ReactFlow
        nodes={enriched}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.35}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} className="!bg-canvas" />
        <Controls
          showInteractive={false}
          className="!rounded-lg !border !border-hairline !bg-canvas !shadow-none"
        />
      </ReactFlow>
    </div>
  );
}
```

**Edge — punktir chiziq:**

```tsx
export function DashedEdge({ sourceX, sourceY, targetX, targetY }: EdgeProps) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, borderRadius: 12 });
  return (
    <path
      d={path}
      fill="none"
      strokeWidth={2}
      strokeDasharray="5 5"
      className="stroke-ink opacity-60"
    />
  );
}
```

### 3.7 TopicDrawer — yon panel

Radix `Dialog` ustiga qurilgan. URL query bilan bog'lanadi (`?topic=db-lost-update`) — link ulashish mumkin bo'ladi.

```tsx
"use client";

export function TopicDrawer({ topic, open, onClose }: TopicDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-60 bg-black/40
                                   data-[state=open]:animate-in data-[state=open]:fade-in" />

        <Dialog.Content
          className="fixed right-0 top-0 z-70 flex h-dvh w-full max-w-[560px] flex-col
                     border-l border-hairline bg-canvas
                     data-[state=open]:animate-in data-[state=open]:slide-in-from-right
                     data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right
                     duration-250"
        >
          {/* Sarlavha */}
          <div className="flex items-start gap-3.5 border-b border-hairline px-5 py-4">
            <div>
              <span className="mb-1.5 block font-mono text-[11px] uppercase
                               tracking-[0.12em] text-ink-faint">
                {topic.stage}
              </span>
              <Dialog.Title className="text-xl font-bold -tracking-[0.03em]">
                {topic.title}
              </Dialog.Title>
            </div>
            <Dialog.Close className="ml-auto grid h-[30px] w-[30px] flex-none place-items-center
                                     rounded-md border border-hairline text-ink-muted
                                     hover:bg-canvas-alt">
              ✕
            </Dialog.Close>
          </div>

          <StatusToggle topicId={topic.id} />

          <div className="flex-1 overflow-y-auto px-5 pb-14 pt-5">
            <p className="text-[15px] text-ink-muted">{topic.summary}</p>

            {topic.hot && <Badge tone="hot" className="mt-3">tez-tez so'raladi</Badge>}

            <SectionLabel>Intervyu savollari</SectionLabel>
            <QuestionAccordion questions={topic.questions} />

            {topic.resources.length > 0 && (
              <>
                <SectionLabel>Manbalar</SectionLabel>
                <ResourceList items={topic.resources} />
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### 3.8 StatusToggle

```tsx
const OPTIONS = [
  { value: "learning", label: "Jarayonda",        on: "bg-node-learn text-black" },
  { value: "done",     label: "Tugatildi",        on: "bg-node-done  text-black" },
  { value: "skipped",  label: "O'tkazib yuborish", on: "bg-node-skip" },
] as const;

export function StatusToggle({ topicId }: { topicId: string }) {
  const { status, setStatus } = useProgressStore();
  const current = status[topicId];

  return (
    <div className="flex flex-wrap gap-2 border-b border-hairline bg-canvas-alt px-5 py-3.5">
      {OPTIONS.map(o => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => setStatus(topicId, active ? undefined : o.value)}
            className={cn(
              "rounded-full border-[1.5px] px-3 py-1.5 text-[13px] transition-colors",
              active
                ? `border-ink font-semibold ${o.on}`
                : "border-hairline bg-canvas text-ink-muted hover:border-ink-faint"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
```

### 3.9 QuestionAccordion

```tsx
export function QuestionAccordion({ questions }: { questions: Question[] }) {
  return (
    <div className="space-y-2">
      {questions.map((q, i) => (
        <details
          key={q.id}
          open={i === 0}
          className="group overflow-hidden rounded-[9px] border border-hairline bg-canvas"
        >
          <summary className="flex cursor-pointer list-none items-start gap-2.5 px-3.5 py-3
                              text-[14.5px] font-semibold hover:bg-canvas-alt
                              [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-[17px] leading-tight text-ink-faint
                             transition-transform group-open:rotate-90">›</span>
            <span>{q.title}</span>
          </summary>
          <div className="px-3.5 pb-3.5 pl-8 text-sm text-ink-muted">
            <AnswerBody source={q.answerMdx} />
          </div>
        </details>
      ))}
    </div>
  );
}
```

### 3.10 ProgressBar

```tsx
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div className="border-b border-hairline bg-canvas">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-3.5">
        <LegendRow />
        <div className="ml-auto flex items-center gap-2.5 font-mono text-[13px]
                        tabular-nums text-ink-muted">
          <span>{done} / {total}</span>
          <span className="h-1.5 w-[120px] overflow-hidden rounded-full
                           border border-hairline bg-canvas-alt">
            <span
              className="block h-full rounded-full bg-green-600 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Ma'lumot modeli

```ts
export type TopicStatus = "pending" | "learning" | "done" | "skipped";

export interface Question {
  id: string;
  title: string;
  answerMdx: string;
  difficulty: "junior" | "middle" | "senior";
  tags: string[];
}

export interface Topic {
  id: string;
  slug: string;
  title: string;
  stage: string;
  summary: string;
  hot?: boolean;              // "tez-tez so'raladi" badge
  questions: Question[];
  resources: Resource[];
}

export interface Roadmap {
  slug: string;               // "dotnet-fintech"
  title: string;
  description: string;
  stages: Stage[];
  nodes: Node[];              // React Flow
  edges: Edge[];
}
```

**Node koordinatalari** qo'lda emas, generator bilan hisoblanadi — stage markazda, topic'lar ikki ustunda:

```ts
export function layout(stages: Stage[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let y = 0;

  stages.forEach((stage, si) => {
    const stageId = `stage-${si}`;
    nodes.push({ id: stageId, type: "stage", position: { x: 0, y },
                 data: { index: si + 1, title: stage.title } });
    y += 110;

    stage.topics.forEach((t, ti) => {
      const col = ti % 2 === 0 ? -160 : 160;   // chap / o'ng ustun
      const row = Math.floor(ti / 2);
      nodes.push({ id: t.id, type: "topic",
                   position: { x: col, y: y + row * 68 }, data: t });
      edges.push({ id: `${stageId}-${t.id}`, source: stageId,
                   target: t.id, type: "dashed" });
    });

    y += Math.ceil(stage.topics.length / 2) * 68 + 90;
  });

  return { nodes, edges };
}
```

---

## 5. Progress tracking

Ikki qatlam: **localStorage darhol**, **server keyin** (login bo'lsa).

```ts
// stores/progressStore.ts
export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      status: {},
      setStatus: (topicId, value) => {
        set(s => {
          const next = { ...s.status };
          if (value) next[topicId] = value; else delete next[topicId];
          return { status: next };
        });
        queueSync(topicId, value);      // debounce → POST /api/progress
      },
      hydrate: (server) => set(s => ({ status: { ...server, ...s.status } })),
    }),
    { name: "ip-progress-v1", storage: createJSONStorage(() => localStorage) }
  )
);
```

**Nega shunday:** foydalanuvchi ro'yxatdan o'tmasdan ham ishlata olsin. Login qilganda localStorage'dagi holat server bilan birlashtiriladi — mahalliy qiymat ustun (`{ ...server, ...local }`), chunki u yangiroq.

DB sxemasi:

```sql
CREATE TABLE user_progress (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roadmap     text NOT NULL,
  topic_id    text NOT NULL,
  status      text NOT NULL CHECK (status IN ('learning','done','skipped')),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, roadmap, topic_id)
);
```

---

## 6. Kutubxonalar

| Vazifa | Tanlov | Sabab |
|---|---|---|
| Node graph | `@xyflow/react` (React Flow v12) | Pan/zoom, custom node, minimap tayyor |
| Drawer / modal | `@radix-ui/react-dialog` | Focus trap, `Esc`, ARIA — o'zi qiladi |
| Variantlar | `class-variance-authority` + `tailwind-merge` | Klass konfliktisiz variant tizimi |
| Holat | `zustand` + `persist` | Kichik, provider talab qilmaydi |
| Kontent | `next-mdx-remote` yoki Contentlayer | Savol/javob MDX faylda, kod bloklari bilan |
| Syntax highlight | `shiki` (build vaqtida) | Client bundle'ga hech narsa qo'shmaydi |
| Tema | `next-themes` | FOUC yo'q |

**React Flow o'rniga:** roadmap statik bo'lsa (pan/zoom kerak bo'lmasa), CSS grid + `position: absolute` SVG chiziqlar yetadi va ~40 KB tejaydi. Prototipda aynan shunday qilingan.

---

## 7. Erishish mumkin bo'lgan (a11y) va performans

- Node — `<button>`, `<div onClick>` emas. Tab bilan yurish ishlaydi.
- Drawer — Radix `Dialog`: focus trap, `Esc`, `aria-modal`, yopilganda fokus node'ga qaytadi.
- `prefers-reduced-motion` — slide animatsiyasi o'chadi.
- Kontrast: sariq `#FFE599` ustida qora matn — 11.6:1.
- Roadmap sahifasi **statik generatsiya** (`generateStaticParams`), React Flow esa `next/dynamic` bilan `ssr: false`.
- Savol javoblari server'da MDX'dan render qilinadi — client bundle faqat interaktiv qismni oladi.
