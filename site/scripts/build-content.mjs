// platform.html'dagi DATA massivini content/roadmap.json ga aylantiradi.
//
// Nega HTML'dan: DATA allaqachon tuzilgan va tekshirilgan. Markdown parser
// keyingi bosqichda qo'shiladi — hozir manba bitta bo'lsin.
//
//   node scripts/build-content.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "platform.html"), "utf8");

// ---- 1. DATA blokini ajratib olish -----------------------------------------

const start = html.indexOf("const DATA = [");
const end = html.indexOf("\n];", start);
if (start === -1 || end === -1) {
  throw new Error("platform.html ichida DATA bloki topilmadi");
}
const source = html.slice(start + "const DATA = ".length, end + 3);

// Template literal'lar bor, shuning uchun JSON.parse emas — baholash kerak.
const stages = new Function(`return ${source}`)();

// ---- 2. Normallashtirish ----------------------------------------------------

/**
 * Chizmani koddan ajratadi.
 *
 * Ikkalasi ham <pre> ichida keladi, lekin talabi qarama-qarshi: kod o'qishga
 * qulay bo'lishi uchun keng qatorlararo masofa istaydi, quti chizmasi esa
 * vertikal chiziqlari uzilmasligi uchun zich bo'lishi shart. Shuning uchun
 * build vaqtida belgilab qo'yamiz — CSS keyin ikkisini boshqacha bezaydi.
 */
const BOX_CHARS = /[┌┐└┘├┤┬┴┼─│═║╔╗╚╝▲▼◄►]/;

/**
 * <div data-d2="nom">izoh</div> → D2 chizmasi.
 *
 * Ikki tema uchun ikki rasm qo'yiladi, kerakligini CSS tanlaydi. `alt` esa
 * izohdan olinadi — ekran o'qigich uchun chizma jim qolmasin.
 */
function embedDiagrams(html) {
  return html.replace(
    /<div data-d2="([\w-]+)"[^>]*>([\s\S]*?)<\/div>/g,
    (_whole, name, note) => {
      const clean = note.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      const alt = clean.replace(/"/g, "&quot;");
      return (
        `<figure class="d2">` +
        `<img class="d2-light" src="/diagrams/${name}.light.svg" alt="${alt}" loading="lazy">` +
        `<img class="d2-dark" src="/diagrams/${name}.dark.svg" alt="${alt}" loading="lazy">` +
        (clean ? `<figcaption>${note.trim()}</figcaption>` : "") +
        `</figure>`
      );
    },
  );
}

function markDiagrams(html) {
  return html.replace(/<pre>([\s\S]*?)<\/pre>/g, (whole, body) =>
    BOX_CHARS.test(body) ? `<pre class="dg">${body}</pre>` : whole,
  );
}


const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const roadmap = {
  slug: "dotnet-backend",
  title: "Intervyuga tayyorgarlik",
  description:
    "Backend intervyusida so'raladigan mavzular, ketma-ketlik bilan.",
  stages: stages.map((stage, i) => ({
    id: `s${i + 1}`,
    order: i + 1,
    slug: slugify(stage.stage),
    title: stage.stage,
    subtitle: stage.sub ?? "",
    topics: (stage.topics ?? []).map((t, j) => ({
      id: t.id,
      order: j + 1,
      title: t.title,
      summary: t.summary ?? "",
      hot: t.hot === true,
      lesson: embedDiagrams(markDiagrams((t.lesson ?? "").trim())),
      questions: (t.questions ?? []).map((q, k) => ({
        id: `${t.id}-q${k + 1}`,
        question: q.q,
        answer: embedDiagrams(markDiagrams((q.a ?? "").trim())),
      })),
    })),
  })),
};

// ---- 3. Validatsiya — buzilsa build yiqiladi --------------------------------

const errors = [];
const seen = new Set();

for (const stage of roadmap.stages) {
  if (!stage.title) errors.push(`${stage.id}: sarlavha yo'q`);
  if (stage.topics.length === 0) errors.push(`${stage.id}: mavzu yo'q`);

  for (const topic of stage.topics) {
    const where = `${stage.title} / ${topic.id}`;
    if (!topic.id) errors.push(`${where}: id yo'q`);
    if (seen.has(topic.id)) errors.push(`${where}: id TAKRORLANGAN`);
    seen.add(topic.id);

    if (!topic.summary) errors.push(`${where}: summary yo'q`);
    if (!topic.lesson) errors.push(`${where}: lesson bo'sh`);
    if (topic.questions.length === 0) errors.push(`${where}: savol yo'q`);

    for (const q of topic.questions) {
      if (!q.question) errors.push(`${where}: savol matni bo'sh`);
      if (!q.answer) errors.push(`${where}: javob bo'sh`);
    }
  }
}

if (errors.length > 0) {
  console.error(`\n✖ Kontent validatsiyasi yiqildi (${errors.length} ta):\n`);
  for (const e of errors.slice(0, 25)) console.error(`   ${e}`);
  if (errors.length > 25) console.error(`   ... yana ${errors.length - 25} ta`);
  process.exit(1);
}

// ---- 4. Yozish --------------------------------------------------------------

mkdirSync(join(root, "content"), { recursive: true });
writeFileSync(
  join(root, "content", "roadmap.json"),
  JSON.stringify(roadmap, null, 2),
  "utf8",
);

const topicCount = roadmap.stages.reduce((n, s) => n + s.topics.length, 0);
const questionCount = roadmap.stages.reduce(
  (n, s) => n + s.topics.reduce((m, t) => m + t.questions.length, 0),
  0,
);

console.log(
  `✓ content/roadmap.json — ${roadmap.stages.length} bosqich, ` +
    `${topicCount} mavzu, ${questionCount} savol`,
);
