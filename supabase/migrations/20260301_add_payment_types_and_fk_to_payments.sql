create table if not exists public.payment_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  requires_reference boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.payment_types (code, name, requires_reference)
values
  ('pago_movil', 'Pago Móvil', true),
  ('efectivo', 'Efectivo', false)
on conflict (code) do update
set
  name = excluded.name,
  requires_reference = excluded.requires_reference;

alter table public.payments
  add column if not exists payment_type_id uuid;

update public.payments p
set payment_type_id = pt.id
from public.payment_types pt
where p.payment_type_id is null
  and pt.code = 'pago_movil';

alter table public.payments
  alter column payment_type_id set not null;

alter table public.payments
  alter column reference drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_payment_type_id_fkey'
  ) then
    alter table public.payments
      add constraint payments_payment_type_id_fkey
      foreign key (payment_type_id)
      references public.payment_types(id)
      on update cascade
      on delete restrict;
  end if;
end
$$;

alter table public.payment_types enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_types'
      and policyname = 'Public can view payment types'
  ) then
    create policy "Public can view payment types"
      on public.payment_types
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_types'
      and policyname = 'Authenticated users can manage payment types'
  ) then
    create policy "Authenticated users can manage payment types"
      on public.payment_types
      for all
      to public
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;
end
$$;
