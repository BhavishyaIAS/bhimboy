-- Fix: prevent_role_escalation blocked ALL role changes, including the
-- service role and the SQL Editor (where auth.uid() is null), making it
-- impossible to promote the first admin. Allow role changes when there is
-- no authenticated user context (direct/postgres/service-role access —
-- anon API requests are already blocked by RLS before triggers run), and
-- keep blocking authenticated non-admins.

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;
