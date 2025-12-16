-- Create per-season settings for scoring configuration

create table if not exists public.season_settings (
  season_id bigint primary key references public.seasons(season_id) on delete cascade,
  points_rules jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.season_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'season_settings' and policyname = 'season_settings_select_admin'
  ) then
    create policy season_settings_select_admin on public.season_settings
      for select
      using (is_admin());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'season_settings' and policyname = 'season_settings_write_admin'
  ) then
    create policy season_settings_write_admin on public.season_settings
      for all
      using (is_admin())
      with check (is_admin());
  end if;
end;
$$;
