-- Guess Who — database schema
-- Run this in Supabase SQL Editor on a fresh project.

create type if not exists session_status as enum ('lobby', 'live', 'final');

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
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table answers;
alter publication supabase_realtime add table guesses;
alter publication supabase_realtime add table cards;
