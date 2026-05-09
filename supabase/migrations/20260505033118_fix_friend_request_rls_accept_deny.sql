drop policy if exists "Friend request recipients can accept pending requests" on public.follows;
drop policy if exists "Either side can remove follow relationship" on public.follows;

create policy "Friend request recipients can accept pending requests"
on public.follows
for update
to authenticated
using (
  auth.uid() = following_id
  and status = 'pending'
)
with check (
  auth.uid() = following_id
  and status = 'accepted'
);

create policy "Either side can remove follow relationship"
on public.follows
for delete
to authenticated
using (
  auth.uid() = follower_id
  or auth.uid() = following_id
);
