-- Phase 2 foundation helpers: extensions, timestamps, auth profile bootstrap.
-- Safe to run on a fresh Supabase project.

create extension if not exists "pgcrypto";

-- Keep updated_at in sync on row changes.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Generic BEFORE UPDATE trigger function for updated_at columns.';
