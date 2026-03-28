import { supabase } from './supabase';
import { sendPushNotification } from './notifications';

export type ContactMethod = 'app' | 'phone' | 'email';
export type AlertStatus = 'active' | 'recovered' | 'cancelled' | 'expired';

export interface StolenAlertData {
  stolenDate: string;
  stolenLocation?: {
    lat: number;
    lng: number;
    label: string;
  };
  description: string;
  policeReportNumber?: string;
  contactMethod: ContactMethod;
  contactInfo?: string;
}

export interface SightingData {
  location?: {
    lat: number;
    lng: number;
    label: string;
  };
  notes?: string;
  imageUrl?: string;
}

/**
 * Report a vehicle as stolen
 */
export async function reportVehicleStolen(
  vehicleId: string,
  data: StolenAlertData
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify ownership
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('owner_id, is_claimed')
    .eq('id', vehicleId)
    .single();

  if (vehicleError) throw vehicleError;

  if (!vehicle.is_claimed || vehicle.owner_id !== user.id) {
    throw new Error('You can only report your own claimed vehicles as stolen');
  }

  // Check for existing active alert
  const { data: existing } = await supabase
    .from('stolen_vehicle_alerts')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    throw new Error('This vehicle already has an active stolen alert');
  }

  // Create alert
  const { data: alert, error } = await supabase
    .from('stolen_vehicle_alerts')
    .insert({
      vehicle_id: vehicleId,
      reported_by: user.id,
      stolen_date: data.stolenDate,
      stolen_location_label: data.stolenLocation?.label,
      stolen_lat: data.stolenLocation?.lat,
      stolen_lng: data.stolenLocation?.lng,
      description: data.description,
      police_report_number: data.policeReportNumber,
      contact_method: data.contactMethod,
      contact_info: data.contactInfo,
    })
    .select()
    .single();

  if (error) throw error;
  return alert;
}

/**
 * Check if a vehicle has an active stolen alert
 */
export async function checkStolenStatus(vehicleId: string) {
  const { data, error } = await supabase
    .from('stolen_vehicle_alerts')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Report a sighting of a stolen vehicle
 */
export async function reportSighting(alertId: string, data: SightingData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Create sighting
  const { data: sighting, error } = await supabase
    .from('stolen_vehicle_sightings')
    .insert({
      alert_id: alertId,
      spotted_by: user.id,
      location_label: data.location?.label,
      lat: data.location?.lat,
      lng: data.location?.lng,
      notes: data.notes,
      image_url: data.imageUrl,
    })
    .select()
    .single();

  if (error) throw error;

  // Get alert details to notify owner
  const { data: alert } = await supabase
    .from('stolen_vehicle_alerts')
    .select(`
      reported_by,
      vehicle_id,
      vehicle:vehicles(make, model, year)
    `)
    .eq('id', alertId)
    .single();

  if (alert) {
    const vehicle = Array.isArray(alert.vehicle) ? alert.vehicle[0] : alert.vehicle;
    const vehicleName = `${vehicle?.year || ''} ${vehicle?.make || ''} ${vehicle?.model || ''}`.trim();
    const locationText = data.location?.label ? ` near ${data.location.label}` : '';

    await sendPushNotification(
      alert.reported_by,
      'Vehicle Spotted!',
      `Someone spotted your stolen ${vehicleName}${locationText}`,
      {
        type: 'stolen_sighting',
        alertId,
        sightingId: sighting.id,
        url: `/stolen-alert/${alertId}`,
      }
    );
  }

  return sighting;
}

/**
 * Mark a stolen vehicle as recovered
 */
export async function markAsRecovered(alertId: string, recoveredLocation?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('stolen_vehicle_alerts')
    .update({
      status: 'recovered',
      recovered_at: new Date().toISOString(),
      recovered_location_label: recoveredLocation,
    })
    .eq('id', alertId)
    .eq('reported_by', user.id);

  if (error) throw error;
}

/**
 * Cancel a stolen vehicle alert
 */
export async function cancelAlert(alertId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('stolen_vehicle_alerts')
    .update({ status: 'cancelled' })
    .eq('id', alertId)
    .eq('reported_by', user.id);

  if (error) throw error;
}

/**
 * Extend alert expiration by 90 days
 */
export async function extendAlert(alertId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const newExpiration = new Date();
  newExpiration.setDate(newExpiration.getDate() + 90);

  const { error } = await supabase
    .from('stolen_vehicle_alerts')
    .update({ expires_at: newExpiration.toISOString() })
    .eq('id', alertId)
    .eq('reported_by', user.id);

  if (error) throw error;
}

/**
 * Get user's stolen vehicle alerts
 */
export async function getMyAlerts(status?: AlertStatus) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('stolen_vehicle_alerts')
    .select(`
      *,
      vehicle:vehicles(id, make, model, year, color),
      sightings:stolen_vehicle_sightings(count)
    `)
    .eq('reported_by', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get alert details with sightings
 */
export async function getAlertDetail(alertId: string) {
  const { data: alert, error: alertError } = await supabase
    .from('stolen_vehicle_alerts')
    .select(`
      *,
      vehicle:vehicles(id, make, model, year, color, plate_hash)
    `)
    .eq('id', alertId)
    .single();

  if (alertError) throw alertError;

  const { data: sightings, error: sightingsError } = await supabase
    .from('stolen_vehicle_sightings')
    .select(`
      *,
      spotter:profiles(handle)
    `)
    .eq('alert_id', alertId)
    .order('created_at', { ascending: false });

  if (sightingsError) throw sightingsError;

  return {
    ...alert,
    sightings: sightings || [],
  };
}

/**
 * Get user's claimed vehicles (for reporting stolen)
 */
export async function getMyClaimedVehicles() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('vehicles')
    .select('id, make, model, year, color, plate_hash')
    .eq('owner_id', user.id)
    .eq('is_claimed', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
