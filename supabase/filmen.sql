-- Oefening filmen (pagina filmen/): filmpjes en beschrijvingen van nieuwe oefeningen.
-- Alleen voor ingelogde gebruikers. Plak dit in Supabase > SQL Editor > New query en klik op Run.
-- Je kunt het later opnieuw draaien; bestaande gegevens blijven staan.
--
-- Daarna in Supabase (eenmalig):
--   1. Authentication > Users > Add user > Create new user: je e-mailadres en een wachtwoord
--      ("Auto Confirm User" aan).
--   2. Authentication > Sign In / Providers: zet "Allow new users to sign up" UIT,
--      zodat niemand anders een account kan maken. De scores in de apps hebben geen account nodig.

create table if not exists public.film_oefeningen (
  id         text        primary key check (length(id) <= 60),
  data       jsonb       not null default '{}'::jsonb,
  status     text        not null default 'concept' check (status in ('concept', 'ingestuurd', 'verwerkt')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.film_oefeningen enable row level security;
revoke all on public.film_oefeningen from anon;
grant select, insert, update, delete on public.film_oefeningen to authenticated;

drop policy if exists "film_oefeningen: ingelogd" on public.film_oefeningen;
create policy "film_oefeningen: ingelogd" on public.film_oefeningen
  for all to authenticated using (true) with check (true);

-- Opslagbak voor de filmpjes: niet openbaar, hooguit 50 MB per filmpje, alleen video
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('filmpjes', 'filmpjes', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "filmpjes: lezen"     on storage.objects;
drop policy if exists "filmpjes: uploaden"  on storage.objects;
drop policy if exists "filmpjes: wijzigen"  on storage.objects;
drop policy if exists "filmpjes: wissen"    on storage.objects;
create policy "filmpjes: lezen"    on storage.objects for select to authenticated using (bucket_id = 'filmpjes');
create policy "filmpjes: uploaden" on storage.objects for insert to authenticated with check (bucket_id = 'filmpjes');
create policy "filmpjes: wijzigen" on storage.objects for update to authenticated using (bucket_id = 'filmpjes') with check (bucket_id = 'filmpjes');
create policy "filmpjes: wissen"   on storage.objects for delete to authenticated using (bucket_id = 'filmpjes');
