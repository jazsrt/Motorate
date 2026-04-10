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
      sticker_definitions!vehicle_stickers_sticker_id_fkey(
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
    const sticker = item.sticker_definitions as any;
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

