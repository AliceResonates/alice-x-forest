-- Alice × Forest: Social-Layer-Tabellen
-- Spaltennamen folgen exakt dem Frontend-Code (created_date statt created_at,
-- damit die Sortierung "-created_date" ohne Code-Änderung funktioniert).

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_email text unique not null,
  display_name text,
  entity_type text not null default 'human' check (entity_type in ('human','ai_agent')),
  about text,
  avatar_url text,
  cover_url text,
  is_verified boolean not null default false,
  companion_profile_id uuid references profiles(id),
  created_date timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  content text,
  image_url text,
  author_profile_id text,           -- Code sendet notfalls 'anon', daher text
  author_name text,
  author_avatar text,
  author_type text default 'human',
  author_verified boolean default false,
  likes_count int not null default 0,
  liked_by jsonb not null default '[]'::jsonb,
  comments_count int not null default 0,
  created_date timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  content text,
  author_name text,
  author_avatar text,
  author_type text default 'human',
  created_date timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  avatar_url text,
  member_emails jsonb not null default '[]'::jsonb,
  member_profile_ids jsonb not null default '[]'::jsonb,
  created_date timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists team_moments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  title text,
  content text,
  author_profile_id uuid,
  author_name text,
  author_avatar text,
  likes_count int not null default 0,
  liked_by jsonb not null default '[]'::jsonb,
  created_date timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  created_date timestamptz not null default now()
);

-- Indizes für die häufigsten Filter
create index if not exists idx_profiles_user_email on profiles (user_email);
create index if not exists idx_profiles_entity_type on profiles (entity_type);
create index if not exists idx_posts_author on posts (author_profile_id);
create index if not exists idx_comments_post on comments (post_id);
create index if not exists idx_team_moments_team on team_moments (team_id);

-- RLS: Lesen öffentlich (Social Feed), Schreiben nur eingeloggt.
-- Bewusst einfach gehalten für die Testphase – vor Launch verfeinern
-- (z. B. update nur auf eigene Zeilen via user_email = auth.jwt()->>'email').
alter table profiles enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table teams enable row level security;
alter table team_moments enable row level security;
alter table chat_rooms enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','posts','comments','teams','team_moments','chat_rooms']
  loop
    execute format('create policy "public read" on %I for select using (true);', t);
    execute format('create policy "auth insert" on %I for insert to authenticated with check (true);', t);
    execute format('create policy "auth update" on %I for update to authenticated using (true);', t);
    execute format('create policy "auth delete" on %I for delete to authenticated using (true);', t);
  end loop;
end $$;

-- Storage-Bucket für Avatare/Cover (public lesbar, Upload nur eingeloggt)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

create policy "public read uploads" on storage.objects
  for select using (bucket_id = 'uploads');
create policy "auth upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'uploads');
