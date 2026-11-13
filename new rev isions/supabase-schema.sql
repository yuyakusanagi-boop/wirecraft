create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (char_length(username) between 1 and 24),
  record jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists player_profiles_username_lower_key
  on public.player_profiles (lower(username));

alter table public.player_profiles enable row level security;

revoke all on table public.player_profiles from public, anon, authenticated;
grant select, insert, update on table public.player_profiles to authenticated;
grant all on table public.player_profiles to service_role;

drop policy if exists "Players can read their own profile" on public.player_profiles;
create policy "Players can read their own profile"
  on public.player_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Players can create their own profile" on public.player_profiles;
create policy "Players can create their own profile"
  on public.player_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update their own profile" on public.player_profiles;
create policy "Players can update their own profile"
  on public.player_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.score_audit_log (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('overall', 'story', 'practice', 'rush', 'endless')),
  submitted_score integer not null default 0 check (submitted_score >= 0),
  submitted_story_clears integer not null default 0 check (submitted_story_clears >= 0),
  submitted_practice_clears integer not null default 0 check (submitted_practice_clears >= 0),
  submitted_rush_clears integer not null default 0 check (submitted_rush_clears >= 0),
  submitted_endless_clears integer not null default 0 check (submitted_endless_clears >= 0),
  submitted_best_endless_streak integer not null default 0 check (submitted_best_endless_streak >= 0),
  raw_payload jsonb not null default '{}'::jsonb,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.score_audit_log enable row level security;
revoke all on table public.score_audit_log from public, anon, authenticated;
grant select on table public.score_audit_log to authenticated;

drop policy if exists "Players can log audit records for themselves" on public.score_audit_log;
drop policy if exists "Players can read their own score audit log" on public.score_audit_log;
create policy "Players can read their own score audit log"
  on public.score_audit_log for select to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.leaderboard_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('overall', 'story', 'practice', 'rush', 'endless')),
  display_name text not null check (char_length(display_name) between 1 and 24),
  score integer not null default 0 check (score >= 0),
  story_clears integer not null default 0 check (story_clears >= 0),
  practice_clears integer not null default 0 check (practice_clears >= 0),
  rush_clears integer not null default 0 check (rush_clears >= 0),
  endless_clears integer not null default 0 check (endless_clears >= 0),
  best_endless_streak integer not null default 0 check (best_endless_streak >= 0),
  verified boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

alter table public.leaderboard_scores
  add column if not exists verified boolean not null default false;

create index if not exists leaderboard_scores_mode_score_idx
  on public.leaderboard_scores (mode, score desc, best_endless_streak desc);

alter table public.leaderboard_scores enable row level security;

revoke all on table public.leaderboard_scores from public, anon, authenticated;
grant select on table public.leaderboard_scores to anon, authenticated;

-- Client-submitted totals are not proof of game completion. Remove the old RPC,
-- which accepted arbitrary scores from any authenticated player.
drop function if exists public.submit_verified_score(text, integer, integer, integer, integer, integer, integer, text);

-- Public leaderboard read access remains allowed; score writes stay disabled until
-- gameplay completion can be validated by trusted server-side logic.
drop policy if exists "Anyone can read leaderboard scores" on public.leaderboard_scores;
create policy "Anyone can read leaderboard scores"
  on public.leaderboard_scores for select to anon, authenticated
  using (verified);

create table if not exists public.unverified_leaderboard_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('overall', 'story', 'practice', 'rush', 'endless')),
  display_name text not null check (char_length(display_name) between 1 and 24),
  score integer not null default 0 check (score >= 0),
  story_clears integer not null default 0 check (story_clears >= 0),
  practice_clears integer not null default 0 check (practice_clears >= 0),
  rush_clears integer not null default 0 check (rush_clears >= 0),
  endless_clears integer not null default 0 check (endless_clears >= 0),
  best_endless_streak integer not null default 0 check (best_endless_streak >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

create index if not exists unverified_leaderboard_scores_mode_score_idx
  on public.unverified_leaderboard_scores (mode, score desc, best_endless_streak desc);

alter table public.unverified_leaderboard_scores enable row level security;
revoke all on table public.unverified_leaderboard_scores from public, anon, authenticated;
grant select on table public.unverified_leaderboard_scores to anon, authenticated;

drop policy if exists "Anyone can read unverified leaderboard scores" on public.unverified_leaderboard_scores;
create policy "Anyone can read unverified leaderboard scores"
  on public.unverified_leaderboard_scores for select to anon, authenticated
  using (true);

do $$
begin
  alter publication supabase_realtime add table public.leaderboard_scores;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.unverified_leaderboard_scores;
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.verified_run_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('story', 'practice', 'rush', 'endless')),
  level integer not null check (level between 1 and 30),
  challenge_day date not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  unique (user_id, mode, level, challenge_day)
);

alter table public.verified_run_challenges enable row level security;
revoke all on table public.verified_run_challenges from public, anon, authenticated;
grant all on table public.verified_run_challenges to service_role;

create or replace function public.issue_verified_run_challenge(
  p_user_id uuid,
  p_mode text,
  p_level integer
)
returns table (
  challenge_id uuid,
  challenge_mode text,
  challenge_level integer,
  challenge_expires_at timestamptz,
  challenge_completed_at timestamptz
)
language plpgsql
 set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'UTC')::date;
  v_next_level integer;
begin
  if p_user_id is null or p_mode not in ('story', 'practice', 'rush', 'endless') then
    raise exception 'Invalid challenge request.' using errcode = '22023';
  end if;
  if p_level is null or p_level < 1 or p_level > 30 then
    raise exception 'Level must be between 1 and 30.' using errcode = '22023';
  end if;

  if p_mode = 'endless' then
    select min(candidate.level)
      into v_next_level
      from generate_series(1, 30) as candidate(level)
      where not exists (
        select 1
          from public.verified_run_challenges as completed
          where completed.user_id = p_user_id
            and completed.mode = 'endless'
            and completed.challenge_day = v_day
            and completed.level = candidate.level
            and completed.completed_at is not null
      );
    if v_next_level is null or p_level <> v_next_level then
      raise exception 'Endless verified levels must be completed in order.' using errcode = '22023';
    end if;
  end if;

  return query
    insert into public.verified_run_challenges as existing
      (user_id, mode, level, challenge_day, created_at, expires_at)
    values
      (p_user_id, p_mode, p_level, v_day, now(), now() + interval '24 hours')
    on conflict (user_id, mode, level, challenge_day) do update
      set created_at = case
            when existing.completed_at is null and existing.expires_at <= now() then now()
            else existing.created_at
          end,
          expires_at = case
            when existing.completed_at is null and existing.expires_at <= now()
              then now() + interval '24 hours'
            else existing.expires_at
          end
    returning existing.id, existing.mode, existing.level, existing.expires_at, existing.completed_at;
end
$$;

create or replace function public.complete_verified_run_challenge(
  p_user_id uuid,
  p_challenge_id uuid
)
returns table (
  completed_mode text,
  completed_level integer,
  overall_score integer,
  mode_score integer,
  best_endless_streak integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.verified_run_challenges%rowtype;
  v_display_name text;
  v_daily_streak integer := 0;
  v_candidate integer;
  v_mode_score integer;
  v_overall public.leaderboard_scores%rowtype;
begin
  select *
    into v_challenge
    from public.verified_run_challenges
    where id = p_challenge_id and user_id = p_user_id
    for update;

  if not found then
    raise exception 'Verified challenge was not found.' using errcode = 'P0002';
  end if;
  if v_challenge.completed_at is not null then
    raise exception 'This verified challenge has already been completed.' using errcode = '23505';
  end if;
  if v_challenge.expires_at <= now() then
    raise exception 'Verified challenge has expired.' using errcode = '22023';
  end if;
  if v_challenge.mode = 'rush'
     and v_challenge.created_at + interval '50 seconds' < now() then
    raise exception 'Power Rush challenge exceeded its server time limit.' using errcode = '22023';
  end if;

  select username
    into v_display_name
    from public.player_profiles
    where user_id = p_user_id;
  if v_display_name is null then
    raise exception 'A synced player profile is required.' using errcode = '23502';
  end if;

  update public.verified_run_challenges
    set completed_at = now()
    where id = v_challenge.id;

  if v_challenge.mode = 'endless' then
    for v_candidate in 1..30 loop
      if exists (
        select 1
          from public.verified_run_challenges
          where user_id = p_user_id
            and mode = 'endless'
            and challenge_day = v_challenge.challenge_day
            and level = v_candidate
            and completed_at is not null
      ) then
        v_daily_streak := v_candidate;
      else
        exit;
      end if;
    end loop;
  end if;

  insert into public.leaderboard_scores as current_score
    (user_id, mode, display_name, score, story_clears, practice_clears,
     rush_clears, endless_clears, best_endless_streak, verified, updated_at)
  values
    (p_user_id, 'overall', v_display_name, 1,
     (v_challenge.mode = 'story')::integer,
     (v_challenge.mode = 'practice')::integer,
     (v_challenge.mode = 'rush')::integer,
     (v_challenge.mode = 'endless')::integer,
     v_daily_streak, true, now())
  on conflict (user_id, mode) do update
    set display_name = excluded.display_name,
        score = (case when current_score.verified then current_score.score else 0 end) + 1,
        story_clears = (case when current_score.verified then current_score.story_clears else 0 end) + excluded.story_clears,
        practice_clears = (case when current_score.verified then current_score.practice_clears else 0 end) + excluded.practice_clears,
        rush_clears = (case when current_score.verified then current_score.rush_clears else 0 end) + excluded.rush_clears,
        endless_clears = (case when current_score.verified then current_score.endless_clears else 0 end) + excluded.endless_clears,
        best_endless_streak = greatest(
          case when current_score.verified then current_score.best_endless_streak else 0 end,
          excluded.best_endless_streak
        ),
        verified = true,
        updated_at = now()
  returning * into v_overall;

  v_mode_score := case v_challenge.mode
    when 'story' then v_overall.story_clears
    when 'practice' then v_overall.practice_clears
    when 'rush' then v_overall.rush_clears
    else v_overall.endless_clears
  end;

  insert into public.leaderboard_scores
    (user_id, mode, display_name, score, story_clears, practice_clears,
     rush_clears, endless_clears, best_endless_streak, verified, updated_at)
  values
    (p_user_id, v_challenge.mode, v_display_name, v_mode_score,
     v_overall.story_clears, v_overall.practice_clears, v_overall.rush_clears,
     v_overall.endless_clears, v_overall.best_endless_streak, true, now())
  on conflict (user_id, mode) do update
    set display_name = excluded.display_name,
        score = excluded.score,
        story_clears = excluded.story_clears,
        practice_clears = excluded.practice_clears,
        rush_clears = excluded.rush_clears,
        endless_clears = excluded.endless_clears,
        best_endless_streak = excluded.best_endless_streak,
        verified = true,
        updated_at = now();

  return query
    select v_challenge.mode, v_challenge.level, v_overall.score,
           v_mode_score, v_overall.best_endless_streak;
end
$$;

revoke all on function public.issue_verified_run_challenge(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.complete_verified_run_challenge(uuid, uuid) from public, anon, authenticated;
grant execute on function public.issue_verified_run_challenge(uuid, text, integer) to service_role;
grant execute on function public.complete_verified_run_challenge(uuid, uuid) to service_role;
