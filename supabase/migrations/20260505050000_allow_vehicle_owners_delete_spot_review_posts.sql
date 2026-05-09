drop policy if exists "Vehicle owners can delete spot and review posts on their vehicles" on public.posts;

create policy "Vehicle owners can delete spot and review posts on their vehicles"
on public.posts
for delete
to authenticated
using (
  post_type in ('spot', 'review')
  and exists (
    select 1
    from public.vehicles
    where vehicles.id = posts.vehicle_id
      and vehicles.owner_id = (select auth.uid())
  )
);
