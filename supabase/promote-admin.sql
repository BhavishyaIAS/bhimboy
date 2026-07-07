-- Promote a user to admin. Run in the Supabase SQL Editor AFTER the
-- user has signed up through the app. Replace the email below if needed.
--
-- Note: this includes the 0003 trigger fix inline, because the original
-- role-escalation guard blocked role changes made from the SQL Editor
-- (where auth.uid() is null). Safe to run more than once.

-- 1. Ensure the guard allows service-role / SQL-editor changes.
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

-- 2. Promote the account.
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'girishvenky007@gmail.com');

-- 3. Verify.
select p.id, u.email, p.full_name, p.role
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'girishvenky007@gmail.com';
