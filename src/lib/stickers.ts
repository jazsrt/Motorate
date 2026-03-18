import { supabase } from './supabase';

export interface StickerDefinition {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  category: 'Positive' | 'Negative' | 'Fun' | 'Community';
  color: string;
  created_at: string;
}

export interface VehicleSticker {
  id: string;
  vehicle_id: string;
  sticker_id: string;
  given_by: string;
  created_at: string;
}

export interface VehicleStickerWithCount {
  sticker_id: string;
  name: string;
  description: string;
  icon_name: string;
  category: 'Positive' | 'Negative' | 'Fun' | 'Community';
  color: string;
  count: number;
  user_gave_it: boolean;
}

export async function getStickerDefinitions(): Promise<StickerDefinition[]> {
  const { data, error } = await supabase
    .from('sticker_catalog')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching sticker definitions:', error);
    return [];
  }

  return data || [];
}

export async function getVehicleStickers(vehicleId: string, userId?: string): Promise<VehicleStickerWithCount[]> {
  const { data, error } = await supabase
    .from('vehicle_stickers')
    .select(`
      sticker_id,
      given_by,
      bumper_stickers!vehicle_stickers_sticker_id_fkey(
        id,
        name,
        description,
        icon_name,
        category,
        color
      )
    `)
    .eq('vehicle_id', vehicleId);

  if (error) {
    console.error('Error fetching vehicle stickers:', error);
    return [];
  }

  const stickerMap = new Map<string, VehicleStickerWithCount>();

  data?.forEach((item: any) => {
    const sticker = item.bumper_stickers;
    if (!sticker) return;

    if (!stickerMap.has(sticker.id)) {
      stickerMap.set(sticker.id, {
        sticker_id: sticker.id,
        name: sticker.name,
        description: sticker.description,
        icon_name: sticker.icon_name,
        category: sticker.category,
        color: sticker.color,
        count: 0,
        user_gave_it: false
      });
    }

    const entry = stickerMap.get(sticker.id)!;
    entry.count++;

    if (userId && item.given_by === userId) {
      entry.user_gave_it = true;
    }
  });

  return Array.from(stickerMap.values()).sort((a, b) => b.count - a.count);
}

// Delegates to canonical stickerService to ensure rate limiting, badges, and RP are applied
export async function giveSticker(
  vehicleId: string,
  stickerId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { giveSticker: canonicalGiveSticker } = await import('./stickerService');
  const result = await canonicalGiveSticker(vehicleId, stickerId, userId);
  return { success: result.success, error: result.message };
}

export async function removeSticker(
  vehicleId: string,
  stickerId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('vehicle_stickers')
      .delete()
      .eq('vehicle_id', vehicleId)
      .eq('sticker_id', stickerId)
      .eq('given_by', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error removing sticker:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserGivenStickers(userId: string): Promise<VehicleSticker[]> {
  const { data, error } = await supabase
    .from('vehicle_stickers')
    .select('*')
    .eq('given_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user stickers:', error);
    return [];
  }

  return data || [];
}

export async function getTopStickeredVehicles(limit: number = 10): Promise<Array<{
  vehicle_id: string;
  sticker_count: number;
  positive_count: number;
  negative_count: number;
}>> {
  const { data, error } = await supabase
    .from('vehicle_stickers')
    .select(`
      vehicle_id,
      sticker_id,
      bumper_stickers!vehicle_stickers_sticker_id_fkey(category)
    `);

  if (error) {
    console.error('Error fetching top stickered vehicles:', error);
    return [];
  }

  const vehicleCounts = new Map<string, {
    vehicle_id: string;
    sticker_count: number;
    positive_count: number;
    negative_count: number;
  }>();

  data?.forEach((item: any) => {
    const vehicleId = item.vehicle_id;
    const category = item.bumper_stickers?.category;

    if (!vehicleCounts.has(vehicleId)) {
      vehicleCounts.set(vehicleId, {
        vehicle_id: vehicleId,
        sticker_count: 0,
        positive_count: 0,
        negative_count: 0
      });
    }

    const counts = vehicleCounts.get(vehicleId)!;
    counts.sticker_count++;
    if (category === 'Positive') counts.positive_count++;
    else if (category === 'Negative') counts.negative_count++;
  });

  return Array.from(vehicleCounts.values())
    .sort((a, b) => b.sticker_count - a.sticker_count)
    .slice(0, limit);
}

export async function getVehicleStickerStats(vehicleId: string): Promise<{
  total: number;
  positive: number;
  negative: number;
}> {
  const stickers = await getVehicleStickers(vehicleId);

  return {
    total: stickers.reduce((sum, s) => sum + s.count, 0),
    positive: stickers.filter(s => s.category === 'Positive').reduce((sum, s) => sum + s.count, 0),
    negative: stickers.filter(s => s.category === 'Negative').reduce((sum, s) => sum + s.count, 0)
  };
}
