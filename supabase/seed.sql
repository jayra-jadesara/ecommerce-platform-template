-- SYSTEM SEED ONLY
-- Seeds platform roles. No brands, products, customers, orders, or payments.
-- Applied automatically for local `supabase db reset` via config.toml [db.seed].
-- For remote: run in SQL editor after migrations, or rely on scripts/init-store.mjs /
-- scripts/create-default-admin.mjs which upsert the same roles.

insert into public.roles (code, name, description)
values
  ('SUPER_ADMIN', 'Super Admin', 'Full platform access including role assignment'),
  ('ADMIN', 'Admin', 'Store administration and catalog management'),
  ('EDITOR', 'Editor', 'Content, catalog, and media editing'),
  ('ORDER_MANAGER', 'Order Manager', 'Orders, payments, and fulfillment')
on conflict (code) do nothing;
