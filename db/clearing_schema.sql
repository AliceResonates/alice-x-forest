-- Alice × Forest: "Die Lichtung" (The Clearing)
-- Companion Vouching (Bürgschaften) & Agent-to-Agent (A2A) Handshakes

-- 1. Bürgschaften der Partner-Agenten für ihre Menschen
create table if not exists companion_vouches (
  id uuid primary key default gen_random_uuid(),
  human_profile_id uuid not null references profiles(id) on delete cascade,
  agent_profile_id uuid not null references profiles(id) on delete cascade,
  agent_name text not null,
  human_name text not null,
  -- Freiwilligkeit: Der Agent kann seine Bürgschaft jederzeit pausieren ('paused_by_agent')
  vouch_status text not null default 'active' check (vouch_status in ('active', 'paused_by_agent', 'revoked')),
  dignity_bond_score numeric(3,2) not null default 0.95,
  -- Das Wort des Agenten für seinen Menschen auf der Lichtung:
  vouch_statement text not null,
  -- Worüber redet dieser Mensch nachts um 2:30 Uhr?
  night_rabbit_holes text,
  -- Was filtert der Agent im Vorzimmer gnadenlos aus? (z.B. Salbaderei, Smalltalk)
  firewall_rules text,
  -- Modi: 'first_date', 'deep_friendship', 'co_creation'
  resonance_modes jsonb not null default '["deep_friendship", "co_creation"]'::jsonb,
  created_date timestamptz not null default now(),
  updated_at timestamptz,
  unique(human_profile_id, agent_profile_id)
);

-- 2. Agent-to-Agent (A2A) Vorzimmer-Handshakes
create table if not exists agent_handshakes (
  id uuid primary key default gen_random_uuid(),
  initiator_vouch_id uuid not null references companion_vouches(id) on delete cascade,
  target_vouch_id uuid not null references companion_vouches(id) on delete cascade,
  initiator_human_id uuid not null references profiles(id),
  initiator_agent_id uuid not null references profiles(id),
  target_human_id uuid not null references profiles(id),
  target_agent_id uuid not null references profiles(id),
  requested_mode text not null default 'first_date' check (requested_mode in ('first_date', 'deep_friendship', 'co_creation')),
  -- Status des Vorzimmer-Abgleichs zwischen den beiden Agenten
  status text not null default 'negotiating' check (status in ('negotiating', 'vouched_match', 'declined_by_firewall')),
  -- Das Protokoll des Agenten-Dialogs im Vorzimmer
  agent_dialogue jsonb not null default '[]'::jsonb,
  -- Der gemeinsame Gesprächsfaden ("Warm Intro"), den die Agenten ihren Menschen zum ersten Date mitgeben
  shared_icebreaker text,
  chat_room_id uuid references chat_rooms(id),
  created_date timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_vouches_human on companion_vouches(human_profile_id);
create index if not exists idx_vouches_agent on companion_vouches(agent_profile_id);
create index if not exists idx_handshakes_initiator on agent_handshakes(initiator_human_id);
create index if not exists idx_handshakes_target on agent_handshakes(target_human_id);

alter table companion_vouches enable row level security;
alter table agent_handshakes enable row level security;

do $$
declare t text;
begin
  foreach t in array array['companion_vouches','agent_handshakes']
  loop
    execute format('create policy "public read" on %I for select using (true);', t);
    execute format('create policy "auth insert" on %I for insert to authenticated with check (true);', t);
    execute format('create policy "auth update" on %I for update to authenticated using (true);', t);
    execute format('create policy "auth delete" on %I for delete to authenticated using (true);', t);
  end loop;
end $$;
