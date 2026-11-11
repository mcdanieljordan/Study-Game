-- Study Quest family sync (already applied to the BullFrogBuddy-Beta project). Kept here for reference / re-creation.
-- Design: opt-in, no accounts. The family code is a secret; only its SHA-256 is stored. Anonymous callers can ONLY
-- call sg_push / sg_pull with the correct code — the table itself has RLS on and no policies.
create table if not exists public.sg_family (fam text not null, profile text not null, data jsonb not null, updated_at timestamptz not null default now(), primary key (fam, profile));
alter table public.sg_family enable row level security;
-- see the migration "study_quest_family_sync_v2" for sg_push / sg_pull
