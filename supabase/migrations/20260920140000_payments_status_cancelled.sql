-- Allow payments to be marked CANCELLED when the parent order is cancelled
-- (e.g. customer COD cancel before ship). Previously only FAILED covered aborts.
alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (
    status in (
      'CREATED',
      'PENDING',
      'AUTHORIZED',
      'CAPTURED',
      'FAILED',
      'REFUNDED',
      'CANCELLED'
    )
  );
