-- Persist phone from auth metadata when a customer signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, first_name, last_name, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update
    set
      first_name = coalesce(excluded.first_name, public.user_profiles.first_name),
      last_name = coalesce(excluded.last_name, public.user_profiles.last_name),
      phone = coalesce(excluded.phone, public.user_profiles.phone);
  return new;
end;
$$;
