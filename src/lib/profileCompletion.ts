import { GarageProfile, ProfileCompletionBadge, ProfileCompletionLevel, ProfileCompletionStatus } from '../types/garage';

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

