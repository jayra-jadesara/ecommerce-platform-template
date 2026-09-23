-- Top relation sizes for Hosting & storage DB donut (service_role only).

create or replace function public.admin_platform_database_relation_sizes(
  p_limit int default 8
)
returns table (relation_name text, total_bytes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (n.nspname || '.' || c.relname)::text as relation_name,
    pg_total_relation_size(c.oid)::bigint as total_bytes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'm', 'p')
    and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
  order by pg_total_relation_size(c.oid) desc
  limit greatest(1, least(coalesce(p_limit, 8), 25));
$$;

revoke all on function public.admin_platform_database_relation_sizes(int) from public;
grant execute on function public.admin_platform_database_relation_sizes(int) to service_role;

comment on function public.admin_platform_database_relation_sizes(int) is
  'Largest relations by total size for admin platform usage charts.';
