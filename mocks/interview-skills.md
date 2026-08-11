# M15 · Intervyu ko'nikmalari

> `README.md` — mock'lar **jurnali** (qachon, qanday yozib borish).
> Bu fayl — **nima gapirish** va **qanday gapirish**.

Texnik bilim intervyuning yarmi. Qolgan yarmi — bosim ostida tushuntira olish,
bilmagan narsani tan olish, va o'zingiz haqingizda ishonchli gapirish.

**Fintechda alohida vazn:** pul bilan ishlaganingiz uchun ular sizda
**ehtiyotkorlik** va **javobgarlik** izlaydi. «Tez yozdim, ishladi» — minus.
«Sekin yozdim, chunki bu pul harakati edi» — plyus.

| # | Mavzu |
|---|---|
| [15.1](#151--star-formati) | STAR formati |
| [15.2](#152--eng-qiyin-bug-hikoyasi-) | Eng qiyin bug hikoyasi ⭐ |
| [15.3](#153--xato-qildim-hikoyasi-) | «Xato qildim» hikoyasi ⭐ |
| [15.4](#154--kelishmovchilik-hikoyasi) | Kelishmovchilik hikoyasi |
| [15.5](#155--nega-ishdan-ketyapsiz) | «Nega ishdan ketyapsiz?» |
| [15.6](#156--ozingiz-haqingizda-90-soniya) | «O'zingiz haqingizda» — 90 soniya |
| [15.7](#157--live-coding--ovoz-chiqarib-oylash) | Live coding — ovoz chiqarib o'ylash |
| [15.8](#158--system-design-intervyu-tartibi) | System design intervyu tartibi |
| [15.9](#159--bilmagan-savolga-javob-) | Bilmagan savolga javob ⭐ |
| [15.10](#1510--ularga-beriladigan-savollar) | Ularga beriladigan savollar |
| [15.11](#1511--maosh-muzokarasi) | Maosh muzokarasi |

---

# 15.1 · STAR formati

## Nima va nega

«Bir vaqtni aytib bering...» bilan boshlanadigan har savol — **xulq-atvor savoli**.
Ular hikoya kutadi, fikr emas.

```
   ❌ "Men har doim testlarga e'tibor beraman"        — bu FIKR
   ✅ "O'tgan yili to'lov servisida..."                — bu HIKOYA
```

## Struktura

```
   S  Situation   ─ kontekst          ~15 soniya   "To'lov servisi, 3 kishi jamoa"
   T  Task        ─ sizning vazifangiz ~10 soniya   "Menga X topshirildi"
   A  Action      ─ SIZ nima qildingiz ~60 soniya   ⭐ eng uzun qism
   R  Result      ─ natija, raqam bilan ~20 soniya   "Xatolar 40% kamaydi"

   Jami: ~2 daqiqa. 4 daqiqadan oshsa — uzun.
```

| Xato | To'g'ri |
|---|---|
| «Biz qildik» | «Men qildim, jamoa bilan» |
| Situation 2 daqiqa | Situation 15 soniya |
| Raqamsiz natija | «p95 800ms → 120ms» |
| Action'da texnologiya sanash | Action'da **qaror** va **nega** |

```
   ⚠ "BIZ" SO'ZI — eng ko'p uchraydigan muammo.
     Intervyuchi SIZNING hissangizni bilmoqchi.
     Jamoa ishini kamsitmasdan o'z qismingizni aniq ayting.
```

## Tayyorlash

**4 ta hikoya yetadi** — ular 15 xil savolga moslashadi:

```
   1. Qiyin texnik muammo         → "eng qiyin", "murakkab", "debug"
   2. Xato / muvaffaqiyatsizlik   → "xato", "o'rgandingiz", "qayta qilsangiz"
   3. Kelishmovchilik             → "rozi bo'lmadingiz", "konflikt", "ishontirish"
   4. Yetakchilik / tashabbus     → "boshladingiz", "yaxshiladingiz", "o'rgatdingiz"
```

**Deliverable:** har birini **yozing** (og'zaki tayyorlash ishlamaydi), keyin
ovoz yozib tinglang.

**Xotira kartasi:** *Situation qisqa, Action uzun, Result raqamli, «men» — «biz» emas.*

---

# 15.2 · Eng qiyin bug hikoyasi ⭐

## Nega bu savol

Ular bug'ni emas — **fikrlash jarayoningizni** eshitmoqchi. Yaxshi javob
metodikani ko'rsatadi: gipoteza → o'lchov → tasdiqlash.

```
   ❌ "Juda qiyin bug edi, uzoq qidirdim, oxiri topdim"
      → jarayon yo'q, o'rganish yo'q

   ✅ Aniq simptom → gipoteza → qanday RAD ETDIM → qanday TASDIQLADIM → tuzatish
      → qanday QAYTALANMASLIGINI ta'minladim
```

## Shablon

```
   1. SIMPTOM     "Har kuni ~3 ta to'lov ikki marta hisoblanardi"
   2. NEGA QIYIN  "Qayta tiklab bo'lmasdi — faqat yuklama ostida"
   3. GIPOTEZALAR "Uchtasini tekshirdim: tarmoq retry, ikki instans, kesh"
   4. QANDAY TOR  "Loglarda X ko'rdim → birinchi ikkitasi rad etildi"
   5. SABAB       "Idempotentlik kaliti yozilishdan KEYIN saqlanardi"
   6. TUZATISH    "Bitta tranzaksiya ichiga oldim"
   7. OLDINI OLISH "Konkurent test qo'shdim + ikki marta hisoblash alerti"
```

```
   ⭐ 7-QADAM ENG MUHIM — va ko'pchilik uni aytmaydi.
     "Tuzatdim" — junior javobi.
     "Tuzatdim va bir xil sinf xatolarni oldini oldim" — senior javobi.
```

## Fintech uchun kuchli mavzular

| Mavzu | Nima ko'rsatadi |
|---|---|
| Ikki marta hisoblash | Idempotentlik tushunchasi (M10.8) |
| Yaxlitlashda tiyin yo'qolishi | `decimal` va yaxlitlash (M4) |
| Race condition balansda | Konkurentlik va bloklash (M5.4) |
| Timeout'dan keyin noaniq holat | «Timeout = noma'lum» (M10.14) |
| Ulanish puli tugashi | Async va resurs boshqaruvi (M3.6) |

**Deliverable:** o'zingiz haqiqatan hal qilgan bitta bug'ni shu 7 qadam bo'yicha
yozing. To'qib chiqarmang — chuqurlashtirilgan savol darhol fosh qiladi.

**Xotira kartasi:** *Simptom → gipoteza → o'lchov → sabab → tuzatish → **oldini olish***

---

# 15.3 · «Xato qildim» hikoyasi ⭐

## Nega bu savol

Ikkita narsani tekshiradi: **javobgarlikni o'z zimmangizga olasizmi** va
**xatodan o'rganasizmi**. Fintechda bu ayniqsa muhim.

```
   ❌ "Xato qilmayman" / "Perfeksionistman"
      → yolg'on yoki o'z-o'zini bilmaslik

   ❌ "Menejer noto'g'ri talab berdi, shuning uchun..."
      → aybni ag'darish. ENG YOMON javob.

   ✅ Haqiqiy xato + sizning ulushingiz + tuzatish + tizimli o'zgarish
```

## Shablon

```
   1. XATO           aniq va qisqa, bahonasiz
   2. TA'SIR         halol: nima buzildi, kim ta'sirlandi
   3. QANDAY BILDIM  o'zim topdimmi yoki aytishdimi (halol ayting)
   4. DARHOL         qanday to'xtatdim / qaytardim
   5. ESKALATSIYA    ⭐ kimga va QANCHA TEZ aytdim
   6. TIZIMLI        nima o'zgardiki, bu sinf xato takrorlanmasin
```

```
   ⭐ 5-QADAM FINTECHDA HAL QILUVCHI.

     Pul bilan ishlashda eng katta xato — xatoni YASHIRISH.
     "Darhol jamoa liderga aytdim" — bu javobning eng qimmatli jumlasi.
     Uni albatta ayting.
```

## Miqyos tanlash

```
   Juda kichik  → "CSS'da rang xato edi"        — jiddiy emas, savolni chetlab o'tish
   Juda katta   → "Kompaniyaga $2M zarar"       — ishonch yo'qotasiz
   ✅ To'g'ri   → real ta'sir bo'lgan, lekin siz tuzatgan va o'rgangan xato
```

**Namuna qism:**

> «Migratsiyada ustunni darhol o'chirdim, eski versiya hali ishlab turgan edi.
> 4 daqiqa 500 xatolar ketdi. O'zim monitoringda ko'rdim, rollback qildim va
> darhol jamoa chatiga yozdim. Shundan keyin **expand→migrate→contract** ni
> jamoa qoidasiga aylantirdik — endi hech kim bitta deploy'da ustun o'chirmaydi.»

**Xotira kartasi:** *Xatoni ayting, bahona qilmang, tez eskalatsiya qilganingizni
ayting, tizimli o'zgarish bilan yoping.*

---

# 15.4 · Kelishmovchilik hikoyasi

## Nega bu savol

Fikringizni himoya qila olasizmi — va kerak bo'lganda **fikringizdan qayta
olasizmi**. Ikkalasi ham kerak.

```
   ❌ "Men to'g'ri edim, ular tushunmadi"       → takabburlik
   ❌ "Rozi bo'ldim, chunki u senior edi"        → o'z fikri yo'q
   ✅ Dalil keltirdim → tingladim → qaror qabul qilindi → qo'llab-quvvatladim
```

## Shablon

```
   1. NIMA HAQIDA     texnik masala, shaxsiy emas
   2. IKKI POZITSIYA  ⭐ ULARNIKINI ADOLATLI ayting
   3. DALILINGIZ      fikr emas — o'lchov, prototip, hujjat
   4. TINGLADIM       ularning dalilida nima to'g'ri edi
   5. QAROR           kim qaror qildi va qanday
   6. KEYIN           qaror sizga qarshi bo'lsa ham — qanday qo'llab-quvvatladingiz
```

```
   ⭐ 2-QADAM — TEST SHU YERDA.

     Qarshi tomon pozitsiyasini kuchli va adolatli tasvirlay olsangiz,
     demak siz haqiqatan tinglagansiz.
     Uni kulgili qilib ko'rsatsangiz — tinglamagansiz.
```

## «Fikringizni o'zgartirgan holat»

Bu **kuchli** javob, zaif emas:

> «Repository pattern kerak deb turib oldim. Jamoadoshim so'radi: qaysi test
> undan foyda ko'radi? Ko'rib chiqdim — bittasi ham emas, hammasi Testcontainers
> ishlatardi. U haq edi, qo'shimcha qatlamni olib tashladik.»

**Deliverable:** ikkita hikoya — biri siz haq bo'lgan, biri siz fikringizni
o'zgartirgan. Ikkinchisi ko'pincha kuchliroq taassurot qoldiradi.

**Xotira kartasi:** *Ularning pozitsiyasini adolatli ayting, dalil bilan bahslashing,
qarorni qabul qiling.*

---

# 15.5 · «Nega ishdan ketyapsiz?»

```
   ❌ Eski ish joyini yomonlash — kelajakda ular haqida ham shunday deysiz
   ❌ "Ko'proq pul"  — halol, lekin yagona sabab bo'lsa zaif
   ✅ NIMAGA qarab ketayotganingiz (nimadan emas)
```

| Vaziyat | Javob yo'nalishi |
|---|---|
| O'sish yo'q | «Texnik qiyinchilik darajasi to'xtab qoldi, kattaroq yuklama bilan ishlamoqchiman» |
| Ishdan bo'shatildi | Halol va qisqa: «Kompaniya qisqartirdi, 12 kishidan 4 tasi ketdi» — bahonasiz |
| Qisqa muddat | Sababni ayting, keyin nima o'rganganingizga o'ting |
| Boshqa yo'nalish | «Fintech domenida ishlash men uchun qiziqroq — pul oqimi, aniqlik talabi» |

```
   ⚠ QOIDA: eski jamoa haqida faqat neytral yoki ijobiy.
     Hatto haqiqatan yomon bo'lgan bo'lsa ham.
     Intervyuchi sizning KELAJAKDA ular haqida qanday gapirishingizni baholaydi.
```

**Xotira kartasi:** *Nimaga qarab ketyapsiz — nimadan qochayotganingiz emas.*

---

# 15.6 · «O'zingiz haqingizda» — 90 soniya

Bu savol emas — **ochilish**. Intervyuning keyingi 10 daqiqasini u belgilaydi.

```
   Struktura:

   HOZIR      "N yil .NET backend, oxirgi ikki yil to'lovlar sohasida"      15s
   NIMA       "Asosan tranzaksiya ishlash va integratsiyalar"                20s
   MISOL ⭐   "Masalan, kunlik 50 ming to'lovli servis — outbox bilan       30s
               ikki marta hisoblashni yo'qotdik"
   NEGA SHU   "Shuning uchun fintechda davom etmoqchiman"                    15s
```

```
   ⭐ MISOL QISMI — TUZOQ QO'YISH.

     Aytgan aniq narsangiz keyingi savolni belgilaydi.
     "Outbox" desangiz — undan so'raydi, va siz tayyorsiz (M10.5).
     Umumiy gapirsangiz — ular tasodifiy mavzu tanlaydi.
```

| Xato | To'g'ri |
|---|---|
| Rezyumeni xronologik o'qish | Hozirdan boshlash |
| 5 daqiqa gapirish | 90 soniya |
| Shaxsiy hayot | Faqat kasbiy |
| «Men mehnatsevarman» | Aniq misol |

**Deliverable:** yozing, ovoz yozib oling, 90 soniyaga sig'diring, 5 marta
takrorlang. Bu yagona **yodlab olish kerak** bo'lgan javob.

---

# 15.7 · Live coding — ovoz chiqarib o'ylash

## Asosiy qoida

```
   JIM O'TIRIB TO'G'RI KOD YOZISH  <  GAPIRIB O'RTACHA KOD YOZISH

   Ular yechimni emas — SIZ BILAN ISHLASH qanday bo'lishini baholaydi.
   Jim odam bilan ishlash qiyin.
```

## Tartib

```
   1. TAKRORLANG      "Ya'ni, massiv berilgan va men..."          30s
   2. SAVOL BERING ⭐  bo'sh kirish? dublikat? hajmi? manfiy?      30s
   3. MISOL           qo'lda 1-2 misol ishlab chiqing              1m
   4. YONDASHUV       "Sodda yo'l O(n²). Hash bilan O(n) qilaman"  1m
   5. TASDIQLASH      "Shuni yozsam bo'ladimi?" ← BOSHLASHDAN OLDIN
   6. YOZING          gapirib turib
   7. TEKSHIRING      ⭐ misolni qo'lda kod bo'ylab yuring
   8. YAXSHILANG      "Xotirani kamaytirish mumkin, lekin..."
```

```
   ⚠ 5-QADAM — eng ko'p tejaladigan vaqt.
     Yondashuvni tasdiqlatmasdan 15 daqiqa noto'g'ri yo'nalishda yozish —
     eng ko'p uchraydigan muvaffaqiyatsizlik sababi.
```

## Qotib qolganda

```
   ❌ Jim qolish
   ✅ "Hozir ikki variant o'ylayapman. Birinchisi... lekin muammo shundaki..."

   ✅ Sodda yechimni AVVAL yozing:
      "Avval O(n²) yozaman, ishlaganini ko'ramiz, keyin yaxshilayman"
      → ishlaydigan kod > ishlamaydigan optimal kod
```

## Qanday gapirish kerak

| Vaziyat | Ayting |
|---|---|
| Nom tanlash | «`seen` deb nomlayman — ko'rilganlarni saqlaydi» |
| Chegara holati | «Bo'sh massivda bu 0 qaytaradi, to'g'ri» |
| Shubha | «Bu yerda `<=` yoki `<` — misolda tekshiraman» |
| Xato topdingiz | «To'xtang, bu yerda xato bor: indeks chegaradan chiqadi» |

```
   ⭐ O'Z XATOINGIZNI O'ZINGIZ TOPISH — KUCHLI SIGNAL.
     Uni yashirmang, ovoz chiqarib toping va tuzating.
```

**Xotira kartasi:** *Savol bering → yondashuvni tasdiqlating → gapirib yozing →
misol bilan tekshiring.*

---

# 15.8 · System design intervyu tartibi

45 daqiqa. Vaqt taqsimoti hal qiluvchi — ko'pchilik talablarda qotib qoladi yoki
darhol kod yozishga tushadi.

```
   ┌──────────────────────────────────────────────────────────┐
   │ 1. TALABLAR             5–8 daq   funksional + NFR        │
   │ 2. MIQYOS               3 daq     RPS, hajm, o'sish       │
   │ 3. API                  5 daq     asosiy 3–4 endpoint     │
   │ 4. MA'LUMOT MODELI      5 daq     jadvallar, kalitlar     │
   │ 5. YUQORI DARAJA        8 daq     ⭐ quti-strelka chizma   │
   │ 6. CHUQURLASHISH       10 daq     ular tanlagan qism      │
   │ 7. TOR JOYLAR           5 daq     nima birinchi sinadi    │
   └──────────────────────────────────────────────────────────┘
```

## 1-qadam — so'raladigan savollar

```
   Funksional:   Kim ishlatadi? Asosiy stsenariy? Nima KIRMAYDI?
   Miqyos:       Kunlik foydalanuvchi? Peak RPS? O'sish?
   Aniqlik:      Pul harakati bormi? Yo'qotish mumkinmi?  ← fintechda BIRINCHI
   Kechikish:    Sinxron javob kerakmi yoki async bo'ladimi?
```

```
   ⚠ "Nima KIRMAYDI" savolini bering.
     Doirani cheklash — senior signali.
     "KYC va anti-fraud'ni bu suhbatdan tashqarida qoldiraman, rozimisiz?"
```

## Fintech uchun majburiy nuqtalar

Bularni **siz o'zingiz** ko'tarishingiz kerak — so'rashlarini kutmang:

```
   □ Ikki tomonlama yozuv (double-entry) — Δ = 0          (M11.1)
   □ Idempotentlik — Idempotency-Key                      (M10.8)
   □ Pul turi — decimal / minor units                     (M4.3)
   □ Timeout = NOMA'LUM, muvaffaqiyatsizlik emas          (M10.14)
   □ Solishtirish (reconciliation) — kunlik               (M10.15)
   □ Audit log — o'zgarmas                                (M8.13)
```

```
   ⭐ Bu ro'yxatdan 3 tasini o'zingiz aytsangiz,
     suhbat darhol boshqa darajaga chiqadi.
```

## Chizma

```
   Client → API GW → Payment API → ┬→ Postgres (ledger)
                                    ├→ Outbox → Worker → Bank adapter
                                    └→ Redis (idempotency, limit)

   Sodda boshlang. Ular "yuklama 10x oshsa?" desa — KEYIN murakkablashtiring.
   Boshidan Kafka va 12 ta servis chizish — minus.
```

**Xotira kartasi:** *Talablar → miqyos → API → model → chizma → chuqurlashish →
tor joylar. Sodda boshlang.*

---

# 15.9 · Bilmagan savolga javob ⭐

## Nega bu eng muhim ko'nikma

Fintechda bilmagan narsani bilgandek ko'rsatish — **xavfli**. Ular buni ataylab
tekshiradi: javobingiz yo'q savolni beradi va nima qilishingizni kuzatadi.

```
   ❌ To'qib chiqarish      → 2 ta chuqurlashtirilgan savol bilan fosh bo'ladi.
                              Bu ENG YOMON natija — endi hech bir javobingizga
                              ishonmaydilar.
   ❌ "Bilmayman" + jimlik  → qiziquvchanlik yo'q

   ✅ Chegarani ayting → BILGANINGIZDAN qurib boring → qanday bilib olishingizni ayting
```

## Shablon

```
   1. CHEGARA    "Kafka'ning ichki replikatsiyasi bilan ishlamaganman."
   2. QO'SHNI    "Lekin RabbitMQ bilan ishlaganman va u yerda..."
   3. FIKRLASH   "Mantiqan Kafka'da ham yetakchi-ergashuvchi bo'lishi kerak,
                  chunki tartib kafolati buni talab qiladi."
   4. TEKSHIRISH "Tekshirmagan taxminim. Hujjatdan aniqlab, aytib beraman."
```

```
   ⭐ 3-QADAM — SHU YERDA BAHOLANASIZ.
     Bilmasangiz ham FIKRLAY olasizmi?
     Birinchi tamoyillardan xulosa chiqarish — bilgan faktdan qimmatliroq.
```

## Ajratib ayting

```
   BILAMAN    "Bu shunday ishlaydi"
   TAXMIN     "Menimcha shunday, lekin tekshirmaganman"     ← farqni AYTING
   BILMAYMAN  "Bu sohada tajribam yo'q"
```

```
   ⚠ Bu farqni aniq aytadigan nomzod — ishonchli nomzod.
     Fintechda "menimcha to'g'ri" va "bilaman" orasidagi farq
     production incidentga teng.
```

## Qisman bilganda

> «To'liq javob bermayman, lekin boshlang'ich nuqtani aytaman: X bilan
> boshlagan bo'lardim, chunki... Keyin Y ni o'lchab, tasdiqlagan bo'lardim.»

**Xotira kartasi:** *Chegarani ayting, bilganingizdan quring, taxminni taxmin deb
belgilang.*

---

# 15.10 · Ularga beriladigan savollar

Bu **baholanadi**. «Savolim yo'q» — qiziqmaslik signali.

```
   Kamida 5 ta tayyorlang, 3 tasini bering.
   Suhbat davomida javob berilganini o'chirib boring.
```

| Kimga | Savol | Nima bilib olasiz |
|---|---|---|
| Muhandis | «Production'ga qanchalik tez-tez chiqasiz?» | Yetuklik darajasi |
| Muhandis | «Oxirgi incident nima edi va keyin nima o'zgardi?» | ⭐ Blameless madaniyat bormi |
| Muhandis | «Kod review qanday o'tadi, o'rtacha qancha vaqt?» | Jarayon |
| Muhandis | «Testlar qanday? Testcontainers ishlatasizmi?» | Sifat darajasi |
| Muhandis | «Texnik qarz uchun vaqt ajratiladimi?» | Bosim darajasi |
| Lider | «Bu rolda 6 oydan keyin muvaffaqiyat nima?» | Kutilmalar aniqmi |
| Lider | «Jamoada nechta odam, qanday taqsimlangan?» | Struktura |
| Lider | «Nima uchun bu pozitsiya ochildi?» | O'sishmi yoki ketishmi |
| HR | «Keyingi qadamlar va muddat?» | Jarayon |

```
   ⭐ "Oxirgi incident nima edi?" — eng ko'p ma'lumot beradigan savol.

     Ochiq javob + "shundan keyin monitoringni o'zgartirdik" → sog'lom jamoa
     "Bizda incident bo'lmaydi"                              → ⚠ yashirishadi
     Aybdorni aytish                                          → ⚠ ayblov madaniyati
```

```
   ❌ Bermang: "Nima qilasizlar?" (saytdan o'qish kerak edi)
              Birinchi suhbatda ta'til/maosh (yakuniy bosqichda)
```

---

# 15.11 · Maosh muzokarasi

```
   ⚠ ASOSIY QOIDA: BIRINCHI RAQAMNI SIZ AYTMANG.

   "Sizda bu pozitsiya uchun ajratilgan diapazon bormi?"
```

Majburlashsa — **diapazon** ayting, bitta raqam emas, va pastki chegarangiz
haqiqatan qabul qiladigan raqam bo'lsin.

```
   Tayyorgarlik:

   1. BOZOR       O'zbekiston .NET middle+/senior diapazoni — 3-4 manbadan
   2. MINIMUM     Rad etadigan chegara — SUHBATDAN OLDIN belgilang
   3. PAKET       Faqat maosh emas: bonus, ta'til, remote, o'qish byudjeti,
                  ko'rib chiqish davri
```

| Ular deydi | Siz |
|---|---|
| «Diapazon X–Y» | Yuqori qismini so'rang, sababini asoslang |
| «Bu maksimum» | «Tushundim. 6 oydan keyin ko'rib chiqish mumkinmi?» |
| «Hozirgi maoshingiz?» | «Bozor darajasi va rol qiymatidan kelib chiqmoqchiman» |
| Taklif berildi | ⭐ «Rahmat. 2-3 kun o'ylab ko'rsam bo'ladimi?» |

```
   ⭐ DARHOL "HA" DEMANG.
     Bir necha kun so'rash — normal va professional.
     Bu vaqtda boshqa takliflarni yakunlaysiz.
```

**Ohang:** hamkorlik, kurash emas. «Ikkalamizga mos variantni topmoqchiman.»

---

## M15 — yakuniy tekshiruv ro'yxati

- [ ] 4 ta STAR hikoyasi **yozilgan** va ovoz yozib tinglangan
- [ ] «O'zingiz haqingizda» — 90 soniya, yodlangan
- [ ] Eng qiyin bug — 7 qadam, «oldini olish» qismi bilan
- [ ] «Xato qildim» — eskalatsiya qismi bilan
- [ ] Kelishmovchilik — ikkita variant (haq bo'lgan / fikrini o'zgartirgan)
- [ ] «Nega ketyapsiz» — eski joyni yomonlamasdan
- [ ] Live coding tartibi — yondashuvni **tasdiqlatish** qadami bilan
- [ ] System design 45 daqiqa taqsimoti
- [ ] Fintech majburiy 6 nuqtasi — yoddan
- [ ] «Bilmayman» shabloni — 4 qadam
- [ ] 5 ta savol tayyorlangan
- [ ] Maosh minimumi belgilangan

**Deliverable'lar:**

- [ ] `mocks/stories.md` — 4 ta STAR hikoyasi to'liq matn
- [ ] «O'zingiz haqingizda» — 90 soniyalik yozuv
- [ ] Har mock uchun `README.md` formatida jurnal
- [ ] Kamida **4 ta mock begona odam bilan**
