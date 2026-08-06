/**
 * Belgilar tizimi — mezoni "o'qidim" emas, "intervyuda javob bera olaman".
 * O'qigan bilan tushuntira olganning orasidagi farq shu yerda aytiladi.
 */
const MARKS = [
  {
    color: "var(--color-state-learning)",
    glyph: "~",
    term: "Tayyorlanyapman",
    text: "o'qidim, lekin hali tutilib qolaman",
  },
  {
    color: "var(--color-state-done)",
    glyph: "✓",
    term: "Tayyor",
    text: "2 daqiqada, misol bilan og'zaki tushuntiraman",
  },
  {
    color: "var(--color-state-skip)",
    glyph: "×",
    term: "Kerak emas",
    text: "mo'ljaldagi vakansiyada so'ralmaydi",
  },
];

export function Legend() {
  return (
    /* Kengligi qat'iy — sarlavha bilan bo'y o'lchashmasin */
    <div className="spec w-[380px] px-5 py-4">
      <p className="label">Tayyorgarlik darajasi</p>

      <ul className="mt-3 space-y-2">
        {MARKS.map((m) => (
          <li
            key={m.glyph}
            className="flex items-start gap-3 text-[12.5px] leading-[1.45] text-[var(--color-ink-2)]"
          >
            <span
              aria-hidden
              className="mono mt-[1px] flex size-[17px] shrink-0 items-center justify-center text-[10px] leading-none text-[var(--color-paper)]"
              style={{ background: m.color }}
            >
              {m.glyph}
            </span>
            <span>
              <b className="font-semibold text-[var(--color-ink)]">{m.term}</b>
              {" — "}
              {m.text}
            </span>
          </li>
        ))}

        <li className="flex items-start gap-3 text-[12.5px] leading-[1.45] text-[var(--color-ink-2)]">
          <span
            aria-hidden
            className="mt-[6px] ml-[5.5px] mr-[5.5px] size-[6px] shrink-0"
            style={{ background: "var(--color-hot)" }}
          />
          <span>
            <b className="font-semibold text-[var(--color-ink)]">Tez-tez so&apos;raladi</b>
            {" — "}
            intervyularda deyarli har safar chiqadi, shulardan boshlang
          </span>
        </li>
      </ul>

      <p className="mt-3.5 border-t border-[var(--color-line-2)] pt-3 text-[11.5px] leading-[1.6] text-[var(--color-ink-3)]">
        Belgilashdan oldin kitobni yoping va javobni ovoz chiqarib ayting:
        ta&apos;rif, bitta amaliy misol, bitta trade-off. Aytolmadingizmi — u
        hali <span className="mono">~</span> darajasida. Intervyuda
        o&apos;qiganingiz emas, aytolganingiz hisoblanadi.
      </p>
    </div>
  );
}
