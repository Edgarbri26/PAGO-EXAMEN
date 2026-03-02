update public.payments p
set reference = '777777'
from public.payment_types pt
where p.payment_type_id = pt.id
  and pt.code = 'efectivo'
  and (p.reference is null or btrim(p.reference) = '');

create or replace function public.set_cash_reference_default()
returns trigger
language plpgsql
as $$
declare
  payment_type_code text;
begin
  select code into payment_type_code
  from public.payment_types
  where id = new.payment_type_id;

  if payment_type_code = 'efectivo' then
    new.reference := '777777';
  elsif new.reference is not null then
    new.reference := btrim(new.reference);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_cash_reference_default on public.payments;

create trigger trg_set_cash_reference_default
before insert or update on public.payments
for each row
execute function public.set_cash_reference_default();
