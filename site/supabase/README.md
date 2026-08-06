# Progressni bulutda saqlash (Supabase)

Sozlanmasa ham sayt ishlaydi: kirish tugmasi ko'rinmaydi, progress faqat
brauzerda (`localStorage`) qoladi. Quyidagi qadamlar uni hisobga bog'laydi.

## 1. Loyiha yaratish

[supabase.com](https://supabase.com) → GitHub bilan kirish → **New project**.
Tekin reja yetarli. Region: `Frankfurt` (O'zbekistonga eng yaqinlaridan).

## 2. Jadvalni yaratish

**SQL Editor** → `schema.sql` faylining mazmunini qo'yib **Run**.

Bu `progress` jadvalini va Row Level Security qoidalarini yaratadi. RLS'siz
brauzerdagi ochiq kalit bilan boshqalarning ma'lumotini o'qib bo'lardi.

## 3. Kirish usullarini yoqish

**Authentication → Sign In / Providers**:

- **Google** — yoqing. Client ID va Secret Google Cloud Console'dan olinadi
  (APIs & Services → Credentials → OAuth client ID → Web application).
- **GitHub** — yoqing. GitHub → Settings → Developer settings →
  OAuth Apps → New OAuth App.

Ikkalasida ham **Authorization callback URL** sifatida Supabase ko'rsatgan
manzilni yozing: `https://<loyiha>.supabase.co/auth/v1/callback`

**Authentication → URL Configuration**:

- Site URL: `https://progprep.vercel.app`
- Redirect URLs: `https://progprep.vercel.app/**` va `http://localhost:3000/**`

Oxirgisi bo'lmasa, mahalliy ishlab chiqishda kirish ishlamaydi.

## 4. Kalitlarni ulash

**Project Settings → API** dan ikki qiymatni oling va ikki joyga yozing.

Mahalliy — `site/.env.local` (git'ga tushmaydi):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Vercel — **Settings → Environment Variables**, xuddi shu ikkita nom.
Qo'shgandan keyin **Deployments → oxirgisi → Redeploy** qiling, aks holda
o'zgaruvchilar build'ga kirmaydi.

> `anon` kaliti ochiq — u brauzerga tushadi va bu normal. Ma'lumotni RLS
> himoya qiladi, kalit emas. `service_role` kalitini esa hech qachon
> `NEXT_PUBLIC_` bilan yozmang.

## Qanday sinxronlanadi

Kirganda serverdagi va brauzerdagi holat `mergeProgress` bilan birlashtiriladi:
har mavzu uchun `updatedAt` yangirog'i g'olib. Ya'ni telefonda belgilaganingiz
noutbukdagi belgilashni o'chirib yubormaydi. Keyingi har bir o'zgarish ~1
soniya kechikish bilan saqlanadi.
