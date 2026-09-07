-- Generic seed only: system roles. No client brand, products, or pricing.

insert into public.roles (code, name, description)
values
  ('SUPER_ADMIN', 'Super Admin', 'Full platform access including role assignment'),
  ('ADMIN', 'Admin', 'Store administration and catalog management'),
  ('EDITOR', 'Editor', 'Content, catalog, and media editing'),
  ('ORDER_MANAGER', 'Order Manager', 'Orders, payments, and fulfillment')
on conflict (code) do nothing;
