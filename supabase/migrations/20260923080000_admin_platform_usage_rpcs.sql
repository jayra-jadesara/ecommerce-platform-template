-- Platform usage dashboard: DB + storage size for admin Hosting & storage page.
-- Callable only with service_role (server-side).

create or replace function public.admin_platform_database_size_bytes()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select pg_database_size(current_database())::bigint;
$$;

create or replace function public.admin_platform_storage_by_bucket()
returns table (bucket_id text, total_bytes bigint)
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    o.bucket_id::text,
    coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint as total_bytes
  from storage.objects o
  group by o.bucket_id;
$$;

revoke all on function public.admin_platform_database_size_bytes() from public;
revoke all on function public.admin_platform_storage_by_bucket() from public;

grant execute on function public.admin_platform_database_size_bytes() to service_role;
grant execute on function public.admin_platform_storage_by_bucket() to service_role;

comment on function public.admin_platform_database_size_bytes() is
  'Returns current database size in bytes for admin platform usage.';
comment on function public.admin_platform_storage_by_bucket() is
  'Returns storage.objects size totals per bucket for admin platform usage.';
