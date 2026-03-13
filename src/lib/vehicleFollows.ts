import { supabase } from './supabase'

export async function trackVehicle(vehicleId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('vehicle_follows')
    .insert({ user_id: user.id, vehicle_id: vehicleId })
  if (error && error.code !== '23505') throw error // ignore duplicate
}

export async function untrackVehicle(vehicleId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('vehicle_follows')
    .delete()
    .eq('user_id', user.id)
    .eq('vehicle_id', vehicleId)
  if (error) throw error
}

export async function isTrackingVehicle(vehicleId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('vehicle_follows')
    .select('id')
    .eq('user_id', user.id)
    .eq('vehicle_id', vehicleId)
    .maybeSingle()
  return !!data
}

export async function getVehicleTrackerCount(vehicleId: string): Promise<number> {
  const { count } = await supabase
    .from('vehicle_follows')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId)
  return count ?? 0
}
