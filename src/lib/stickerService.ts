import { supabase } from './supabase';
import { calculateAndAwardReputation } from './reputation';
import { awardBadge } from './reputation';

interface GiveStickerResult {
  success: boolean;
  message: string;
  alreadyGiven?: boolean;
}

/**
 * CRITICAL: Prevent users from giving same sticker twice to same vehicle
 * This is enforced by UNIQUE constraint in database
 * Also enforces limits: 5 positive stickers, 3 negative stickers per vehicle
 */
export async function giveSticker(
  vehicleId: string,
  stickerId: string,
  senderId: string
): Promise<GiveStickerResult> {

  const { data: existing } = await supabase
    .from('vehicle_stickers')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('sticker_id', stickerId)
    .eq('given_by', senderId)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      message: 'You already gave this sticker to this vehicle!',
      alreadyGiven: true
    };
  }

  const { data: sticker } = await supabase
    .from('sticker_definitions')
    .select('*')
    .eq('id', stickerId)
    .single();

  if (!sticker) {
    return { success: false, message: 'Sticker not found' };
  }

  // Check sticker limits: 5 positive, 3 negative per vehicle
  const { data: userStickers } = await supabase
    .from('vehicle_stickers')
    .select(`
      sticker_id,
      sticker_definitions!vehicle_stickers_sticker_id_fkey (
        category
      )
    `)
    .eq('vehicle_id', vehicleId)
    .eq('given_by', senderId);

  if (userStickers) {
    let positiveCount = 0;
    let negativeCount = 0;

    userStickers.forEach((item: any) => {
      const category = item.sticker_definitions?.category;
      if (category === 'Positive') {
        positiveCount++;
      } else if (category === 'Negative') {
        negativeCount++;
      }
    });

    const isPositive = sticker.category === 'Positive';
    if (isPositive && positiveCount >= 5) {
      return {
        success: false,
        message: 'You can only give up to 5 positive stickers to this vehicle'
      };
    }
    if (!isPositive && negativeCount >= 3) {
      return {
        success: false,
        message: 'You can only give up to 3 negative stickers to this vehicle'
      };
    }
  }

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('owner_id, make, model')
    .eq('id', vehicleId)
    .single();

  if (!vehicle?.owner_id) {
    return { success: false, message: 'Vehicle has no owner' };
  }

  const { error } = await supabase
    .from('vehicle_stickers')
    .insert({
      vehicle_id: vehicleId,
      sticker_id: stickerId,
      given_by: senderId
    });

  if (error) {
    console.error('Failed to add sticker:', error);
    return { success: false, message: 'Database error' };
  }

  const action = sticker.category === 'Positive'
    ? 'POSITIVE_STICKER_RECEIVED'
    : 'NEGATIVE_STICKER_RECEIVED';

  const points = sticker.category === 'Positive' ? 2 : -3;

  await calculateAndAwardReputation({
    userId: vehicle.owner_id,
    action,
    referenceType: 'sticker',
    referenceId: vehicleId
  });

  await checkStickerBadge(vehicleId, stickerId, vehicle.owner_id);

  return {
    success: true,
    message: `${sticker.name} sticker added! ${points > 0 ? '+' : ''}${points} rep to owner`
  };
}

/**
 * Count UNIQUE users who gave this sticker type
 * Award badge if threshold reached
 */
async function checkStickerBadge(
  vehicleId: string,
  stickerId: string,
  ownerId: string
) {
  const { data: uniqueUsers } = await supabase
    .from('vehicle_stickers')
    .select('given_by')
    .eq('vehicle_id', vehicleId)
    .eq('sticker_id', stickerId);

  if (!uniqueUsers) return;

  const uniqueCount = new Set(uniqueUsers.map(u => u.given_by)).size;


  const thresholds = [
    { count: 1, tier: 'Bronze' },
    { count: 5, tier: 'Silver' },
    { count: 10, tier: 'Gold' },
    { count: 20, tier: 'Platinum' }
  ];

  const { data: stickerDef } = await supabase
    .from('sticker_definitions')
    .select('name')
    .eq('id', stickerId)
    .single();

  for (const { count, tier } of thresholds) {
    if (uniqueCount === count) {
      const badgeSlug = `${stickerDef?.name.toLowerCase().replace(/\s+/g, '-')}-${tier.toLowerCase()}`;

      await awardBadge(ownerId, badgeSlug);
    }
  }
}

/**
 * Get sticker counts for a vehicle with tier information
 */
export async function getVehicleStickers(vehicleId: string) {
  const { data } = await supabase
    .from('vehicle_stickers')
    .select(`
      id,
      sticker_id,
      given_by,
      sticker_definitions!vehicle_stickers_sticker_id_fkey (
        id,
        name,
        icon_name,
        category
      )
    `)
    .eq('vehicle_id', vehicleId);

  if (!data) return [];

  const stickerMap = new Map();

  data.forEach((item: any) => {
    const stickerId = item.sticker_id;
    const def = item.sticker_definitions;

    if (!stickerMap.has(stickerId)) {
      stickerMap.set(stickerId, {
        sticker_id: stickerId,
        name: def.name,
        icon: def.icon_name,
        category: def.category,
        uniqueUsers: new Set(),
        tier: null
      });
    }

    stickerMap.get(stickerId).uniqueUsers.add(item.given_by);
  });

  return Array.from(stickerMap.values()).map((sticker: any) => {
    const count = sticker.uniqueUsers.size;
    let tier = null;

    if (count >= 20) tier = 'Platinum';
    else if (count >= 10) tier = 'Gold';
    else if (count >= 5) tier = 'Silver';
    else if (count >= 1) tier = 'Bronze';

    return {
      sticker_id: sticker.sticker_id,
      name: sticker.name,
      icon: sticker.icon,
      category: sticker.category,
      count,
      tier
    };
  });
}
