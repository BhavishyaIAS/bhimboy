-- Promote a user to admin. Run in the Supabase SQL Editor AFTER the
-- user has signed up through the app. Replace the email below.
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'girishvenky007@gmail.com');

-- Verify:
select p.id, u.email, p.full_name, p.role
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'girishvenky007@gmail.com';
