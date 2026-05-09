drop policy if exists "Vehicle owners can view reviews on their vehicles" on public.reviews;

create policy "Vehicle owners can view reviews on their vehicles"
on public.reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.vehicles
    where vehicles.id = reviews.vehicle_id
      and vehicles.owner_id = (select auth.uid())
  )
);
