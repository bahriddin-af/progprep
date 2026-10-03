# Mock intervyu (DB qismi)

**Qoidalar:** savollar bittadan · jadvalga qaramasdan o'z so'zim bilan · har javob 0–10 · oxirida umumiy ball va "o'tdim / o'tmadim".

**Mavzular:** SQL va PL/SQL, ACID, Indekslar, Background jobs (~15 savol).

| # | Savol | Ball | Izoh |
|---|---|---|---|
| 1 | SQL va PL/SQL farqi? PL/SQL qayerda bajariladi? | 6 → **9** (qayta) | Deklarativ/protsedurali, engine'lar, trafik aytildi. Qo'shish kerak: "server tomonida", package |
| 2 | Engine'lar orasidagi o'tish nima, qanday muammo, qanday kamaytiriladi? | **4** | Context switch nomi to'g'ri; muammo (sekinlik) va yechim (`BULK COLLECT`, `FORALL`, `LIMIT`) aytilmadi |
| 3 | ACID nima? Har harf + bank misoli | **0** | Bilmadim → A, C, I ni o'rgandim ([07-acid.md](07-acid.md)). D qoldi, keyin qayta javob beraman |

## Keyingi qadam

1. D (Durability) darsi
2. 3-savolga qayta javob: ACID to'liq
3. Davomi: indekslar, background jobs savollari

## 10/10 javob namunalari

**1-savol:**
> "SQL deklarativ til, PL/SQL protsedurali: o'zgaruvchi, shart, sikl, exception handling, procedure, function, package, trigger bor. PL/SQL Oracle server tomonida bajariladi: protsedurali qism PL/SQL engine'da, SQL buyruqlar SQL engine'da. Butun blok bir martada yuboriladi, ilova va baza orasidagi borib-kelishlar kamayadi."

**2-savol:**
> "Bu context switch. Har o'tish vaqt oladi, loop ichida SQL bo'lsa o'tishlar soni qatorlar soniga teng, katta hajmda juda sekin. `BULK COLLECT` va `FORALL` bilan ma'lumot paket bilan olinadi va yoziladi, xotira uchun `LIMIT` ishlataman. Imkon bo'lsa, bitta SQL bilan yozaman."
