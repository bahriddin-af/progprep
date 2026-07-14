# STAR hikoyalar

Interview'gacha **6–8 ta** tayyor bo'lsin. Yozib qo'yish yetarli emas — ovoz chiqarib mashq qiling.

Format har biri uchun:
- **Situation** — kontekst, 2 gap. Ortiqcha tafsilot bermang.
- **Task** — mening javobgarligim aynan nima edi
- **Action** — men NIMA QILDIM (jamoa emas, men)
- **Result** — natija, iloji bo'lsa raqam bilan
- **Reflection** — hozir bo'lsa nimani boshqacha qilardim

---

## Nima uchun bu fayl muhim

Interview'ga keladigan odamlarning aksariyati kitobdan o'qigan nazariyani takrorlaydi.
Menda **real production tajribasi** bor va u aynan eng qiyin mavzularda.

Farqni ko'ring:

> ❌ "Saga — bu tarqoq tranzaksiyalarni boshqarish patterni, choreography va
> orchestration turlari bor..."

> ✅ "Bizda bir amal ichida DB'ga yozardik, tashqi davlat tizimidan ma'lumot olardik,
> elektron imzo qo'yardik va message queue'ga xabar chiqarardik. DB tranzaksiyasi
> tashqi API'ni rollback qila olmaydi — imzo o'tib, xabar chiqmay qolsa, tizim
> nomuvofiq holatga tushadi. Biz buni shunday hal qildik..."

Ikkinchisi meni boshqa nomzodlardan **butunlay ajratadi**. Lekin faqat oldindan
tayyorlab qo'ysam.

---

## Tayyorlanadigan hikoyalar

### 1. Tarqoq tranzaksiya muammosi (Saga / idempotency)
_Status: yozilmagan_

### 2. Tashqi tizim integratsiyasi — timeout, retry, ishonchsiz API
_Status: yozilmagan_

### 3. Elektron imzo / kriptografik imzolash
_Status: yozilmagan_

### 4. Katta refactoring — legacy modulni qayta qurish
_Status: yozilmagan_

### 5. ⭐ Eng katta xatoim — refactoring paytida jimgina regressiya
_Status: yozilmagan_

**Bu eng kuchli hikoyam bo'ladi.** "Eng katta xatoyingiz?" savoliga ideal javob:
- Xatoni tan olaman (filtrlar yo'qolgan, oylar davomida sezilmagan)
- Sababini aniq aytaman (test yozmasdim — bahona emas, sabab)
- Nima o'zgartirganimni ko'rsataman (endi har bir kod testsiz ketmaydi)

Interviewerlar bunday javobni yaxshi ko'radi — chunki u halol va o'sishni ko'rsatadi.
Yolg'on "perfeksionistman" javobidan yuz marta kuchli.

### 6. Modul egaligi — butun domenga javobgar bo'lish
_Status: yozilmagan_

### 7. Jamoadagi kelishmovchilik / texnik bahs
_Status: yozilmagan_

### 8. Muddat bosimi ostidagi qaror
_Status: yozilmagan_
