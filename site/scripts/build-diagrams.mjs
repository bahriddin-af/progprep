// diagrams/*.d2 → public/diagrams/<nom>.<tema>.svg
//
// D2.js WASM orqali ishlaydi, tashqi binar kerak emas — shuning uchun bu
// skript Vercel build'ida ham, mahalliy mashinada ham bir xil natija beradi.
//
// Nega ikkita SVG: saytda qo'lda temaga o'tkazgich bor (data-theme), D2
// esa faqat prefers-color-scheme ni biladi. Ikki nusxa chizib, CSS bilan
// kerakligini ko'rsatgan ma'qul — aks holda qorong'i temada oq quti chiqadi.
//
//   node scripts/build-diagrams.mjs

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { D2 } from "@terrastruct/d2";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "diagrams");
// public/ ga yoziladi: SVG ichida shrift base64 bilan singdirilgan (~30 KB),
// shuning uchun uni har sahifaga inline qilish isrof — rasm sifatida bersak,
// brauzer bir marta yuklab keshlaydi.
const outDir = join(root, "public", "diagrams");

if (!existsSync(srcDir)) {
  console.log("· diagrams/ yo'q — chizma bosqichi o'tkazib yuborildi");
  process.exit(0);
}

const THEMES = [
  { name: "light", themeID: 0 },
  { name: "dark", themeID: 200 },
];

const d2 = new D2();
mkdirSync(outDir, { recursive: true });

const files = readdirSync(srcDir).filter((f) => f.endsWith(".d2"));
let count = 0;

for (const file of files) {
  const name = basename(file, ".d2");
  const source = readFileSync(join(srcDir, file), "utf8");

  for (const theme of THEMES) {
    const result = await d2.compile(source, {
      layout: "elk",
      themeID: theme.themeID,
      // Sahifada o'z bo'shlig'i bor — SVG ichida katta hoshiya kerak emas.
      pad: 12,
      sketch: false,
      noXMLTag: true,
      // Bir sahifada bir nechta chizma bo'lsa, id'lar to'qnashmasin.
      salt: `${name}-${theme.name}`,
    });
    const svg = await d2.render(result.diagram, {
      ...result.renderOptions,
      themeID: theme.themeID,
      pad: 12,
      noXMLTag: true,
      salt: `${name}-${theme.name}`,
    });
    writeFileSync(join(outDir, `${name}.${theme.name}.svg`), svg, "utf8");
  }
  count++;
}

console.log(`✓ public/diagrams — ${count} chizma × ${THEMES.length} tema`);
process.exit(0);
