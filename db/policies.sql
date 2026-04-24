-- Row Level Security policies
-- Rule: anon role can SELECT freely; all INSERT/UPDATE/DELETE go through
-- Server Actions using the service role (which bypasses RLS).
-- Effect: clients can read with the anon key (filtered by session code in app
-- code) but cannot write directly to the database.

alter table sessions enable row level security;
alter table players  enable row level security;
alter table answers  enable row level security;
alter table cards    enable row level security;
alter table guesses  enable row level security;

-- Allow anon + authenticated to read everything. Writes go through service role.
-- Drop first so this script is idempotent.
drop policy if exists "read sessions" on sessions;
drop policy if exists "read players"  on players;
drop policy if exists "read answers"  on answers;
drop policy if exists "read cards"    on cards;
drop policy if exists "read guesses"  on guesses;

create policy "read sessions" on sessions for select using (true);
create policy "read players"  on players  for select using (true);
create policy "read answers"  on answers  for select using (true);
create policy "read cards"    on cards    for select using (true);
create policy "read guesses"  on guesses  for select using (true);

-- No INSERT/UPDATE/DELETE policies = those operations are denied by default
-- for the anon and authenticated roles. The service role used in Server
-- Actions bypasses RLS entirely, so it handles all mutations.
