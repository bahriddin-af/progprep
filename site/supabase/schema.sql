-- Progressni saqlash. Supabase > SQL Editor'da bir marta ishga tushiriladi.
--
-- Nega bitta jsonb ustun, mavzu boshiga qator emas: progress butunligicha
-- o'qiladi va butunligicha yoziladi, hech qachon bo'lak-bo'lak so'ralmaydi.
-- 171 mavzu uchun bu ~15 KB — bitta qatorga bemalol sig'adi. Pul emas,
-- shuning uchun murakkab tarix ham kerak emas.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Qator darajasidagi xavfsizlik: har kim faqat o'z qatorini ko'radi.
-- Bu YOQILMASA anon kalit bilan hamma ma'lumotni o'qib bo'ladi.
alter table public.progress enable row level security;

drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own"
  on public.progress for select
  using (auth.uid() = user_id);

drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own"
  on public.progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own"
  on public.progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
