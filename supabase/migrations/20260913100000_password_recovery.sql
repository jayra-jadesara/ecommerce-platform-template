-- In-app password recovery (no email/SMS): security question + hashed answer.

alter table public.user_profiles
  add column if not exists recovery_question_id text,
  add column if not exists recovery_answer_hash text;

comment on column public.user_profiles.recovery_question_id is
  'Fixed recovery question id (e.g. mother_maiden). Set at register or profile.';
comment on column public.user_profiles.recovery_answer_hash is
  'scrypt hash of normalized recovery answer. Writable only via service role.';

-- Persist recovery question id from signup metadata (hash is set by app via service role).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    first_name,
    last_name,
    phone,
    recovery_question_id
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'recovery_question_id', '')
  )
  on conflict (id) do update
    set
      first_name = coalesce(excluded.first_name, public.user_profiles.first_name),
      last_name = coalesce(excluded.last_name, public.user_profiles.last_name),
      phone = coalesce(excluded.phone, public.user_profiles.phone),
      recovery_question_id = coalesce(
        excluded.recovery_question_id,
        public.user_profiles.recovery_question_id
      );
  return new;
end;
$$;

-- Block authenticated clients from forging/clearing the answer hash.
create or replace function public.guard_user_profile_recovery_hash()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.recovery_answer_hash is distinct from old.recovery_answer_hash
     and coalesce(auth.role(), '') <> 'service_role' then
    new.recovery_answer_hash := old.recovery_answer_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_guard_recovery_hash on public.user_profiles;
create trigger user_profiles_guard_recovery_hash
  before update on public.user_profiles
  for each row
  execute function public.guard_user_profile_recovery_hash();

-- Email → auth user id lookup for recovery (service role / security definer only).
create or replace function public.lookup_auth_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  uid uuid;
begin
  if p_email is null or length(trim(p_email)) = 0 then
    return null;
  end if;
  select u.id
    into uid
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
  return uid;
end;
$$;

revoke all on function public.lookup_auth_user_id_by_email(text) from public;
grant execute on function public.lookup_auth_user_id_by_email(text) to service_role;
