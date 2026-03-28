import { GarageProfile, ProfileCompletionBadge, ProfileCompletionLevel, ProfileCompletionStatus } from '../types/garage';
import { supabase } from './supabase';

export const PROFILE_COMPLETION_BADGES: Record<ProfileCompletionLevel, ProfileCompletionBadge> = {
  none: {
    key: 'none',
    name: 'Get Started',
    description: 'Create your username to begin',
    icon_name: 'UserPlus',
    requiredFields: ['handle'],
  },
  starter: {
    key: 'starter_profile',
    name: 'Starter Profile',
    description: 'Get started with your profile',
    icon_name: 'Rocket',
    requiredFields: ['handle'],
  },
  complete: {
    key: 'complete_profile',
    name: 'Complete Profile',
    description: 'Fill out your full profile',
    icon_name: 'CheckCircle',
    requiredFields: ['handle', 'location'],
  },
  pro: {
    key: 'profile_pro',
    name: 'Profile Pro',
    description: 'Unlock all profile features',
    icon_name: 'Star',
    requiredFields: ['handle', 'location', 'bio', 'photo'],
  },
};

export function calculateProfileCompletionLevel(profile: GarageProfile | null): ProfileCompletionLevel {
  if (!profile) return 'none';

  const hasHandle = !!(profile.handle || profile.username) && (profile.handle || profile.username || '').trim().length > 0;
  const hasLocation = !!profile.location && profile.location.trim().length > 0;
  const hasBio = !!profile.bio && profile.bio.trim().length > 0;
  const hasPhoto = !!(profile.profile_photo_url || profile.avatar_url);

  if (hasHandle && hasLocation && hasBio && hasPhoto) {
    return 'pro';
  }

  if (hasHandle && hasLocation) {
    return 'complete';
  }

  if (hasHandle) {
    return 'starter';
  }

  return 'none';
}

export function calculateProfileCompletion(profile: GarageProfile | null): ProfileCompletionStatus {
  const level = calculateProfileCompletionLevel(profile);

  if (!profile) {
    return {
      level: 'none',
      percentage: 0,
      badges: [],
      missingFields: Object.keys(PROFILE_COMPLETION_BADGES.pro.requiredFields),
    };
  }

  const totalFields = 4;
  const completedFields = [
    (profile.handle || profile.username) ? 1 : 0,
    profile.location ? 1 : 0,
    profile.bio ? 1 : 0,
    (profile.profile_photo_url || profile.avatar_url) ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const percentage = Math.round((completedFields / totalFields) * 100);

  const unlockedBadges: ProfileCompletionBadge[] = [];
  if (level === 'starter' || level === 'complete' || level === 'pro') {
    unlockedBadges.push(PROFILE_COMPLETION_BADGES.starter);
  }
  if (level === 'complete' || level === 'pro') {
    unlockedBadges.push(PROFILE_COMPLETION_BADGES.complete);
  }
  if (level === 'pro') {
    unlockedBadges.push(PROFILE_COMPLETION_BADGES.pro);
  }

  const missingFields: string[] = [];
  if (!profile.handle && !profile.username) missingFields.push('handle');
  if (!profile.location) missingFields.push('location');
  if (!profile.bio) missingFields.push('bio');
  if (!profile.profile_photo_url && !profile.avatar_url) missingFields.push('photo');

  const nextLevel = level === 'pro' ? 'pro' : level === 'complete' ? 'pro' : 'complete';
  const nextBadge = level !== 'pro' ? PROFILE_COMPLETION_BADGES[nextLevel] : undefined;

  return {
    level,
    percentage,
    nextBadge,
    badges: unlockedBadges,
    missingFields,
  };
}

export async function getProfileCompletionBadges(userId: string): Promise<ProfileCompletionBadge[]> {
  try {
    const { data, error } = await supabase
      .from('user_profile_completion')
      .select('badge_key, earned_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching profile completion badges:', error);
    }

    const badges: ProfileCompletionBadge[] = [];
    const earnedKeys = new Set((data || []).map(d => d.badge_key));
    const seenKeys = new Set<string>();
    const badgeLevels: ProfileCompletionLevel[] = ['starter', 'complete', 'pro'];

    for (const level of badgeLevels) {
      const badge = PROFILE_COMPLETION_BADGES[level];
      if (seenKeys.has(badge.key)) continue;
      seenKeys.add(badge.key);

      const earnedData = (data || []).find(d => d.badge_key === badge.key);
      badges.push({
        ...badge,
        earned: earnedKeys.has(badge.key),
        earnedAt: earnedData?.earned_at,
      });
    }

    return badges;
  } catch (error) {
    console.error('Error fetching profile completion badges:', error);
    return [
      { ...PROFILE_COMPLETION_BADGES.starter, earned: false },
      { ...PROFILE_COMPLETION_BADGES.complete, earned: false },
      { ...PROFILE_COMPLETION_BADGES.pro, earned: false },
    ];
  }
}

export async function awardProfileCompletionBadge(userId: string, badgeKey: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profile_completion')
      .insert([{ user_id: userId, badge_key: badgeKey }]);

    if (error?.code === '23505') {
      return false;
    }

    if (error) {
      console.error('Error awarding profile completion badge:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error awarding profile completion badge:', error);
    return false;
  }
}

export async function checkAndAwardProfileCompletionBadges(userId: string, profile: GarageProfile): Promise<string[]> {
  const awardedBadges: string[] = [];
  const level = calculateProfileCompletionLevel(profile);

  const badgesAwardedThisLevel: ProfileCompletionLevel[] = [];
  if (level === 'starter' || level === 'complete' || level === 'pro') {
    badgesAwardedThisLevel.push('starter');
  }
  if (level === 'complete' || level === 'pro') {
    badgesAwardedThisLevel.push('complete');
  }
  if (level === 'pro') {
    badgesAwardedThisLevel.push('pro');
  }

  for (const badgeLevel of badgesAwardedThisLevel) {
    const badge = PROFILE_COMPLETION_BADGES[badgeLevel];
    const awarded = await awardProfileCompletionBadge(userId, badge.key);
    if (awarded) {
      awardedBadges.push(badge.name);

      // Send notification for newly awarded badge
      try {
        const { notifyBadgeAwarded } = await import('./notifications');
        await notifyBadgeAwarded(userId, badge.key, badge.name);
      } catch (notifError) {
        console.error('Failed to send badge notification:', notifError);
      }
    }
  }

  return awardedBadges;
}
