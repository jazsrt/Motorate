/**
 * Bumper Stickers System
 *
 * Manages micro-achievements (bumper stickers) that users collect
 * to unlock badges and track progress.
 */

import { supabase } from './supabase';

export interface BumperSticker {
  id: string;
  user_id: string;
  sticker_type: string;
  earned_at: string;
  related_content_id?: string | null;
  related_content_type?: 'post' | 'comment' | 'spot' | 'event' | 'vehicle' | 'challenge' | null;
  metadata?: Record<string, any>;
}

export interface StickerDefinition {
  id: string;
  sticker_type: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  rarity: 'common' | 'uncommon' | 'rare';
  points_value: number;
  unlocks_badge_slug?: string | null;
  required_count: number;
}

export interface StickerProgress {
  sticker_type: string;
  sticker_name: string;
  current_count: number;
  required_count: number;
  progress_percent: number;
  unlocks_badge?: string | null;
  is_complete: boolean;
}

/**
 * Get all sticker definitions
 */
export async function getStickerDefinitions(): Promise<StickerDefinition[]> {
  const { data, error } = await supabase
    .from('sticker_definitions')
    .select('*')
    .order('rarity', { ascending: true });

  if (error) {
    console.error('Error fetching sticker definitions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's sticker collection
 */
export async function getUserStickers(userId: string): Promise<BumperSticker[]> {
  const { data, error } = await supabase
    .from('bumper_stickers')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) {
    console.error('Error fetching user stickers:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's sticker progress toward badges
 */
export async function getStickerProgress(userId: string): Promise<StickerProgress[]> {
  const { data, error } = await supabase
    .rpc('get_sticker_progress', { p_user_id: userId });

  if (error) {
    console.error('Error fetching sticker progress:', error);
    return [];
  }

  return data || [];
}

/**
 * Award a sticker to a user
 */
export async function awardSticker(
  userId: string,
  stickerType: string,
  contentId?: string | null,
  contentType?: 'post' | 'comment' | 'spot' | 'event' | 'vehicle' | 'challenge' | null
): Promise<string | null> {
  const { data, error } = await supabase
    .rpc('award_sticker', {
      p_user_id: userId,
      p_sticker_type: stickerType,
      p_content_id: contentId || null,
      p_content_type: contentType || null
    });

  if (error) {
    console.error('Error awarding sticker:', error);
    return null;
  }

  return data;
}

/**
 * Get sticker count by type for a user
 */
export async function getStickerCountByType(
  userId: string,
  stickerType: string
): Promise<number> {
  const { count, error } = await supabase
    .from('bumper_stickers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('sticker_type', stickerType);

  if (error) {
    console.error('Error counting stickers:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get total sticker count for a user
 */
export async function getTotalStickerCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('bumper_stickers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Error counting total stickers:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get close-to-complete stickers (for "almost there" notifications)
 */
export async function getAlmostCompleteStickers(
  userId: string,
  threshold: number = 0.8
): Promise<StickerProgress[]> {
  const progress = await getStickerProgress(userId);

  return progress.filter(
    (sticker) =>
      !sticker.is_complete &&
      sticker.progress_percent >= threshold * 100
  );
}

/**
 * Get recently earned stickers
 */
export async function getRecentStickers(
  userId: string,
  limit: number = 10
): Promise<BumperSticker[]> {
  const { data, error } = await supabase
    .from('bumper_stickers')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent stickers:', error);
    return [];
  }

  return data || [];
}

/**
 * Get sticker rarity color
 */
export function getStickerRarityColor(rarity: 'common' | 'uncommon' | 'rare'): string {
  switch (rarity) {
    case 'common':
      return 'text-gray-400';
    case 'uncommon':
      return 'text-[#F97316]';
    case 'rare':
      return 'text-[#fb923c]';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get sticker rarity background
 */
export function getStickerRarityBg(rarity: 'common' | 'uncommon' | 'rare'): string {
  switch (rarity) {
    case 'common':
      return 'bg-gray-500/10 border-gray-500/30';
    case 'uncommon':
      return 'bg-[#F97316]/10 border-[#F97316]/30';
    case 'rare':
      return 'bg-[#fb923c]/10 border-[#fb923c]/30';
    default:
      return 'bg-gray-500/10 border-gray-500/30';
  }
}

/**
 * Format sticker earned date
 */
export function formatStickerDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Group stickers by type with counts
 */
export function groupStickersByType(stickers: BumperSticker[]): Record<string, number> {
  return stickers.reduce((acc, sticker) => {
    acc[sticker.sticker_type] = (acc[sticker.sticker_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Calculate total sticker value (sum of points)
 */
export async function calculateStickerValue(userId: string): Promise<number> {
  const stickers = await getUserStickers(userId);
  const definitions = await getStickerDefinitions();

  const definitionMap = definitions.reduce((acc, def) => {
    acc[def.sticker_type] = def.points_value;
    return acc;
  }, {} as Record<string, number>);

  return stickers.reduce((total, sticker) => {
    return total + (definitionMap[sticker.sticker_type] || 0);
  }, 0);
}

/**
 * Check if user can earn a specific sticker
 */
export async function canEarnSticker(
  userId: string,
  stickerType: string,
  contentId?: string
): Promise<boolean> {
  // Check if sticker definition exists
  const { data: definition, error: defError } = await supabase
    .from('sticker_definitions')
    .select('*')
    .eq('sticker_type', stickerType)
    .maybeSingle();

  if (defError || !definition) {
    return false;
  }

  // If contentId provided, check if already earned for this content
  if (contentId) {
    const { data: existing, error: existError } = await supabase
      .from('bumper_stickers')
      .select('id')
      .eq('user_id', userId)
      .eq('sticker_type', stickerType)
      .eq('related_content_id', contentId)
      .maybeSingle();

    if (existError) {
      return false;
    }

    // If already exists, can't earn again
    if (existing) {
      return false;
    }
  }

  return true;
}
