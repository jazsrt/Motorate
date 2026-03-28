import { supabase } from './supabase';
import { calculateAndAwardReputation } from './reputation';

export interface VehicleRating {
  id: string;
  vehicle_id: string;
  rated_by: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverRating {
  id: string;
  driver_id: string;
  rated_by: string;
  vehicle_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface VehicleRatingWithUser extends VehicleRating {
  rater?: {
    id: string;
    handle: string;
    avatar_url: string | null;
  };
}

export interface DriverRatingWithUser extends DriverRating {
  rater?: {
    id: string;
    handle: string;
    avatar_url: string | null;
  };
  vehicle?: {
    id: string;
    year: number;
    make: string;
    model: string;
  };
}

export async function rateVehicle(
  vehicleId: string,
  rating: number,
  comment?: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    const { error } = await supabase
      .from('vehicle_ratings')
      .upsert({
        vehicle_id: vehicleId,
        rated_by: user.id,
        rating,
        comment: comment || null,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    await calculateAndAwardReputation({
      userId: user.id,
      action: 'COMMENT_LEFT',
      referenceType: 'vehicle_rating',
      referenceId: vehicleId
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('Error rating vehicle:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function rateDriver(
  driverId: string,
  rating: number,
  vehicleId?: string,
  comment?: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    if (driverId === user.id) {
      return { success: false, error: 'Cannot rate yourself' };
    }

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('owner_id, is_verified')
      .eq('owner_id', driverId)
      .eq('is_verified', true)
      .limit(1)
      .maybeSingle();

    if (!vehicle) {
      return { success: false, error: 'Driver must be a verified owner' };
    }

    const { error } = await supabase
      .from('driver_ratings')
      .insert({
        driver_id: driverId,
        rated_by: user.id,
        vehicle_id: vehicleId || null,
        rating,
        comment: comment || null
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'You can only rate a driver once per day' };
      }
      throw error;
    }

    await calculateAndAwardReputation({
      userId: user.id,
      action: 'COMMENT_LEFT',
      referenceType: 'driver_rating',
      referenceId: driverId
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('Error rating driver:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getUserVehicleRating(
  vehicleId: string,
  userId: string
): Promise<VehicleRating | null> {
  try {
    const { data, error } = await supabase
      .from('vehicle_ratings')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('rated_by', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user vehicle rating:', error);
    return null;
  }
}

export async function getVehicleRatings(vehicleId: string): Promise<VehicleRatingWithUser[]> {
  try {
    const { data, error } = await supabase
      .from('vehicle_ratings')
      .select(`
        *,
        rater:profiles!vehicle_ratings_rated_by_fkey (
          id,
          handle,
          avatar_url
        )
      `)
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching vehicle ratings:', error);
    return [];
  }
}

export async function getDriverRatings(driverId: string): Promise<DriverRatingWithUser[]> {
  try {
    const { data, error } = await supabase
      .from('driver_ratings')
      .select(`
        *,
        rater:profiles!driver_ratings_rated_by_fkey (
          id,
          handle,
          avatar_url
        ),
        vehicle:vehicles (
          id,
          year,
          make,
          model
        )
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching driver ratings:', error);
    return [];
  }
}

export async function getVehicleRatingStats(vehicleId: string): Promise<{
  average: number;
  count: number;
  distribution: { [key: number]: number };
}> {
  try {
    const ratings = await getVehicleRatings(vehicleId);

    const distribution: { [key: number]: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    ratings.forEach((rating) => {
      distribution[rating.rating]++;
    });

    const average =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    return {
      average: Math.round(average * 100) / 100,
      count: ratings.length,
      distribution
    };
  } catch (error) {
    console.error('Error calculating vehicle rating stats:', error);
    return {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
}

export async function getDriverRatingStats(driverId: string): Promise<{
  average: number;
  count: number;
  distribution: { [key: number]: number };
}> {
  try {
    const ratings = await getDriverRatings(driverId);

    const distribution: { [key: number]: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    ratings.forEach((rating) => {
      distribution[rating.rating]++;
    });

    const average =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    return {
      average: Math.round(average * 100) / 100,
      count: ratings.length,
      distribution
    };
  } catch (error) {
    console.error('Error calculating driver rating stats:', error);
    return {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
}

export async function deleteVehicleRating(
  ratingId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data: rating, error: fetchError } = await supabase
      .from('vehicle_ratings')
      .select('rated_by')
      .eq('id', ratingId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!rating) {
      throw new Error('Rating not found');
    }

    if (rating.rated_by !== userId) {
      throw new Error('Unauthorized');
    }

    const { error: deleteError } = await supabase
      .from('vehicle_ratings')
      .delete()
      .eq('id', ratingId);

    if (deleteError) throw deleteError;

    return true;
  } catch (error) {
    console.error('Error deleting vehicle rating:', error);
    return false;
  }
}

export async function getTopRatedVehicles(limit: number = 10): Promise<Array<{
  vehicle_id: string;
  year: number;
  make: string;
  model: string;
  avg_rating: number;
  rating_count: number;
  owner_handle?: string;
}>> {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        id,
        year,
        make,
        model,
        avg_rating,
        rating_count,
        owner:profiles!vehicles_owner_id_fkey (
          handle
        )
      `)
      .gte('rating_count', 3)
      .order('avg_rating', { ascending: false })
      .order('rating_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data as any[] || []).map((v: any) => ({
      vehicle_id: v.id,
      year: v.year,
      make: v.make,
      model: v.model,
      avg_rating: v.avg_rating,
      rating_count: v.rating_count,
      owner_handle: v.owner?.handle
    }));
  } catch (error) {
    console.error('Error fetching top rated vehicles:', error);
    return [];
  }
}

export async function getTopRatedDrivers(limit: number = 10): Promise<Array<{
  driver_id: string;
  handle: string;
  full_name: string | null;
  avatar_url: string | null;
  avg_driver_rating: number;
  driver_rating_count: number;
}>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, handle, full_name, avatar_url, avg_driver_rating, driver_rating_count')
      .gte('driver_rating_count', 3)
      .order('avg_driver_rating', { ascending: false })
      .order('driver_rating_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((p) => ({
      driver_id: p.id,
      handle: p.handle,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      avg_driver_rating: p.avg_driver_rating,
      driver_rating_count: p.driver_rating_count
    }));
  } catch (error) {
    console.error('Error fetching top rated drivers:', error);
    return [];
  }
}

export function getRatingEmoji(rating: number): string {
  if (rating >= 4.5) return '⭐';
  if (rating >= 4.0) return '🌟';
  if (rating >= 3.5) return '✨';
  if (rating >= 3.0) return '💫';
  if (rating >= 2.0) return '⚡';
  return '💭';
}

export function getRatingLabel(rating: number): string {
  if (rating >= 4.8) return 'Outstanding';
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 4.0) return 'Very Good';
  if (rating >= 3.5) return 'Good';
  if (rating >= 3.0) return 'Average';
  if (rating >= 2.0) return 'Below Average';
  return 'Poor';
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}
