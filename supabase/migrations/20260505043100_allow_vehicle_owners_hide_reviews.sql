drop policy if exists "Owners can hide reviews on their vehicles" on public.reviews;

create policy "Owners can hide reviews on their vehicles"
on public.reviews
for update
to authenticated
using (
  exists (
    select 1
    from public.vehicles
    where vehicles.id = reviews.vehicle_id
      and vehicles.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.vehicles
    where vehicles.id = reviews.vehicle_id
      and vehicles.owner_id = (select auth.uid())
  )
);
