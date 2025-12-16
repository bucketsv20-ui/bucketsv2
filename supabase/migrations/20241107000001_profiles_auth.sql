-- Ensure profiles are automatically created for auth users and secured by RLS

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'viewer')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_select_self'
  ) then
    create policy profiles_select_self on profiles for select using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_insert_self'
  ) then
    create policy profiles_insert_self on profiles for insert with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_update_self_display'
  ) then
    create policy profiles_update_self_display on profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id and role = (select role from profiles p where p.id = auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_update_role_admin'
  ) then
    create policy profiles_update_role_admin on profiles for update using (is_admin()) with check (is_admin());
  end if;
end;
$$;
