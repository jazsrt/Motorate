import { supabase } from './supabase';
import { calculateAndAwardReputation } from './reputation';

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

  // Try sticker_catalog first, fall back to bumper_stickers
  let sticker: any | null = null;
  const { data: catalogSticker } = await supabase
    .from('sticker_catalog')
    .select('*')
    .eq('id', stickerId)
    .maybeSingle();

  if (catalogSticker) {
    sticker = catalogSticker;
  } else {
    const { data: fallbackSticker } = await supabase
      .from('bumper_stickers')
      .select('*')
      .eq('id', stickerId)
      .maybeSingle();
    sticker = fallbackSticker;
  }

  if (!sticker) {
    return { success: false, message: 'Sticker not found' };
  }

  // Check sticker limits: 5 positive, 3 negative per vehicle
  // Join against sticker_catalog (sentiment) since that's the live table
  const { data: userStickers } = await supabase
    .from('vehicle_stickers')
    .select(`
      sticker_id,
      sticker_catalog (
        sentiment
      )
    `)
    .eq('vehicle_id', vehicleId)
    .eq('given_by', senderId);

  if (userStickers) {
    let positiveCount = 0;
    let negativeCount = 0;

    userStickers.forEach((item: any) => {
      const sentiment = item.sticker_catalog?.sentiment;
      if (sentiment === 'positive' || sentiment === 'Positive') {
        positiveCount++;
      } else if (sentiment === 'negative' || sentiment === 'Negative') {
        negativeCount++;
      }
    });

    const isPositive = sticker.sentiment === 'positive' || sticker.category === 'Positive';
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

  // owner_id may be null for unclaimed vehicles — stickers still flow

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

  // Upsert vehicle_sticker_counts
  try {
    const { data: existingCount } = await supabase
      .from('vehicle_sticker_counts')
      .select('count')
      .eq('vehicle_id', vehicleId)
      .eq('tag_name', sticker.name)
      .maybeSingle();

    if (existingCount) {
      await supabase
        .from('vehicle_sticker_counts')
        .update({ count: (existingCount.count || 0) + 1 })
        .eq('vehicle_id', vehicleId)
        .eq('tag_name', sticker.name);
    } else {
      await supabase
        .from('vehicle_sticker_counts')
        .insert({
          vehicle_id: vehicleId,
          tag_name: sticker.name,
          tag_sentiment: sticker.category === 'Positive' ? 'positive' : 'negative',
          count: 1,
        });
    }
  } catch (countErr) {
    console.error('Failed to update sticker counts:', countErr);
  }

  const action = sticker.category === 'Positive'
    ? 'POSITIVE_STICKER_RECEIVED'
    : 'NEGATIVE_STICKER_RECEIVED';

  const points = sticker.category === 'Positive' ? 2 : -3;

  if (vehicle?.owner_id) {
    await calculateAndAwardReputation({
      userId: vehicle.owner_id,
      action,
      referenceType: 'sticker',
      referenceId: vehicleId
    });
    await checkStickerBadge(vehicleId, stickerId, vehicle.owner_id);
  } else {
    await checkStickerBadge(vehicleId, stickerId, '');
  }

  return {
    success: true,
    message: `${sticker.name} sticker added! ${points > 0 ? '+' : ''}${points} rep to owner`
  };
}

/**
 * Count UNIQUE users who gave this sticker type to this vehicle.
 * Award/upgrade vehicle badge in vehicle_badges table if threshold reached.
 */
async function checkStickerBadge(
  vehicleId: string,
  stickerId: string,
  _ownerId: string
) {
  const { data: stickerDef } = await supabase
    .from('sticker_catalog')
    .select('name')
    .eq('id', stickerId)
    .maybeSingle();

  const stickerName = stickerDef?.name;
  if (!stickerName) return;

  // Count unique users who gave this specific sticker to this vehicle
  const { data: givers } = await supabase
    .from('vehicle_stickers')
    .select('given_by')
    .eq('vehicle_id', vehicleId)
    .eq('sticker_id', stickerId);

  if (!givers) return;
  const uniqueCount = new Set(givers.map(g => g.given_by)).size;

  // Determine tier
  let tier: string | null = null;
  if (uniqueCount >= 20) tier = 'Platinum';
  else if (uniqueCount >= 10) tier = 'Gold';
  else if (uniqueCount >= 5) tier = 'Silver';
  else if (uniqueCount >= 1) tier = 'Bronze';

  if (!tier) return;

  const tierOrder: Record<string, number> = { Bronze: 1, Silver: 2, Gold: 3, Platinum: 4 };

  // Check if vehicle already has this badge at this tier or higher
  const { data: existing } = await supabase
    .from('vehicle_badges')
    .select('tier')
    .eq('vehicle_id', vehicleId)
    .eq('badge_id', stickerName)
    .maybeSingle();

  const existingOrder = existing ? (tierOrder[existing.tier] || 0) : 0;
  const newOrder = tierOrder[tier] || 0;

  if (existingOrder >= newOrder) return;

  // Upsert vehicle badge
  await supabase
    .from('vehicle_badges')
    .upsert({
      vehicle_id: vehicleId,
      badge_id: stickerName,
      tier,
      sticker_count: uniqueCount,
      earned_at: new Date().toISOString(),
    }, { onConflict: 'vehicle_id,badge_id' });

  // Award vehicle RP on tier upgrade
  const tierRP: Record<string, number> = { Bronze: 15, Silver: 30, Gold: 60, Platinum: 100 };
  const rpGain = tierRP[tier];

  if (rpGain) {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('reputation_score')
      .eq('id', vehicleId)
      .single();

    if (vehicle) {
      await supabase
        .from('vehicles')
        .update({ reputation_score: (vehicle.reputation_score || 0) + rpGain })
        .eq('id', vehicleId);
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
      sticker_catalog (
        id,
        name,
        icon_name,
        sentiment
      )
    `)
    .eq('vehicle_id', vehicleId);

  if (!data) return [];

  const stickerMap = new Map();

  data.forEach((item: any) => {
    const stickerId = item.sticker_id;
    const def = item.sticker_catalog as any;
    if (!def) return;

    if (!stickerMap.has(stickerId)) {
      stickerMap.set(stickerId, {
        sticker_id: stickerId,
        name: def.name,
        icon: def.icon_name,
        sentiment: def.sentiment,
        uniqueUsers: new Set(),
        tier: null
      });
    }

    stickerMap.get(stickerId).uniqueUsers.add(item.given_by);
  });

  return Array.from(stickerMap.values()).map((sticker) => {
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
      sentiment: sticker.sentiment,
      count,
      tier
    };
  });
}
