-- Guess Who — database schema
-- Run this in Supabase SQL Editor on a fresh project.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'session_status') then
    create type session_status as enum ('lobby', 'live', 'final');
  end if;
end $$;

create table if not exists sessions (
  code               text primary key check (length(code) between 3 and 12),
  host_token         text not null,
  host_name          text not null default 'Host',
  questions          jsonb not null,
  status             session_status not null default 'lobby',
  current_card_index int not null default 0,
  card_revealed      boolean not null default false,
  created_at         timestamptz not null default now(),
  ended_at           timestamptz
);

create table if not exists players (
  id            uuid primary key default gen_random_uuid(),
  session_code  text not null references sessions(code) on delete cascade,
  name          text not null check (length(trim(name)) between 1 and 30),
  player_token  text not null,
  joined_at     timestamptz not null default now()
);

create unique index if not exists players_session_lowername_uq
  on players (session_code, lower(name));

create table if not exists answers (
  player_id uuid not null references players(id) on delete cascade,
  q_index   int  not null check (q_index between 0 and 2),
  text      text not null check (length(trim(text)) between 1 and 500),
  primary key (player_id, q_index)
);

create table if not exists cards (
  id            uuid primary key default gen_random_uuid(),
  session_code  text not null references sessions(code) on delete cascade,
  player_id     uuid not null references players(id) on delete cascade,
  q_index       int  not null,
  position      int  not null,
  unique (session_code, position)
);

create index if not exists cards_session_position_idx on cards(session_code, position);

create table if not exists guesses (
  card_id           uuid not null references cards(id) on delete cascade,
  guesser_id        uuid not null references players(id) on delete cascade,
  guessed_player_id uuid not null references players(id) on delete cascade,
  created_at        timestamptz not null default now(),
  primary key (card_id, guesser_id)
);

-- Realtime publications for tables clients subscribe to.
-- Wrapped to be idempotent — Postgres errors if the table is already in the
-- publication, so we check pg_publication_tables first.
do $$
declare
  t text;
begin
  foreach t in array array['sessions', 'players', 'answers', 'cards', 'guesses'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
