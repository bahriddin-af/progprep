# <Tizim nomi>

> Har bir design shu shablonda. Struktura — bilimdan muhimroq: odamlar system
> design'da bilim yetishmasligidan emas, **struktura yo'qligidan** yiqiladi.
> Taymer qo'ying: 45 daqiqa. Ovoz chiqarib gapiring va yozib oling.

## 1. Talablar (5 daq)

- **Funksional:**
- **Nofunksional:** masshtab / latency / availability / consistency
- **Ataylab ko'lamdan chiqardim:** _(buni aytish sizni kuchli ko'rsatadi)_

## 2. Hisob-kitob (5 daq)

- DAU:
- QPS (o'rtacha / peak):
- O'qish : yozish nisbati:
- Storage (kunlik / 5 yillik):
- Bandwidth:

## 3. API

```
POST /...
GET  /...
```

## 4. Ma'lumotlar modeli va DB tanlovi

- Sxema:
- **Qaysi DB va NEGA:** _(SQL/NoSQL — sabab bo'lmasa, javob nol)_

## 5. Yuqori darajali arxitektura

_(sxema — client → LB → service → cache → DB → queue → worker)_

## 6. Chuqurlashish (1–2 komponent)

_Interviewer bittasini tanlaydi. Tayyor bo'ling._

## 7. Trade-off'lar ⭐ BALL SHU YERDA BERILADI

| Qaror | Nima yutdim | Nima yo'qotdim | Alternativa nega tanlanmadi |
|---|---|---|---|
| | | | |

Interviewer sizning **Redis tanlaganingizni** tekshirmaydi — **nega tanlaganingizni
va evaziga nimani qurbon qilganingizni** tekshiradi.

## 8. Bottleneck'lar va keyingi masshtablash

- 10x yuk kelsa, birinchi nima sinadi?
- Single point of failure qayerda?
