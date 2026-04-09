import { supabase } from './supabase';

export const NotificationTypes = {
  NEW_REVIEW: 'review',
  NEW_FOLLOWER: 'follow',
  BADGE_RECEIVED: 'badge_received',
  BADGE_UNLOCKED: 'badge_unlocked',
  BADGE_AWARDED: 'badge_awarded',
  REVIEW_APPROVED: 'review_approved',
  REVIEW_REJECTED: 'review_rejected',
  POST_LIKE: 'like',
  POST_COMMENT: 'comment',
  POST_SHARE: 'share',
  STOLEN_SIGHTING: 'stolen_sighting',
  CHALLENGE_COMPLETE: 'challenge_complete',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  VEHICLE_FOLLOW: 'vehicle_follow',
  VEHICLE_FOLLOW_REQUEST: 'vehicle_follow_request',
  VEHICLE_FOLLOW_APPROVED: 'vehicle_follow_approved',
} as const;

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];

async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  linkType?: string,
  linkId?: string
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      link_type: linkType,
      link_id: linkId,
      is_read: false,
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

/**
 * Check user's notification preferences before sending
 */
async function checkNotificationPreference(
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return true;

  const prefs = data.notification_preferences || {};

  // Check master toggle
  if (prefs.push_enabled === false) return false;

  // Map notification types to preference keys
  const prefMap: Record<string, string> = {
    [NotificationTypes.NEW_REVIEW]: 'new_reviews',
    [NotificationTypes.NEW_FOLLOWER]: 'new_followers',
    [NotificationTypes.BADGE_RECEIVED]: 'badges_received',
    [NotificationTypes.REVIEW_APPROVED]: 'moderation_updates',
    [NotificationTypes.REVIEW_REJECTED]: 'moderation_updates',
    [NotificationTypes.POST_LIKE]: 'post_interactions',
    [NotificationTypes.POST_COMMENT]: 'post_interactions',
  };

  const prefKey = prefMap[notificationType];
  if (prefKey && prefs[prefKey] === false) return false;

  return true;
}

/**
 * Send a push notification to a user
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    // Check if notifications are enabled for this type
    const notificationType = data?.type;
    if (notificationType) {
      const allowed = await checkNotificationPreference(userId, notificationType as NotificationType);
      if (!allowed) {
        return;
      }
    }

    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: { userId, title, body, data }
    });

    if (error) {
      console.error('Failed to send push notification:', error);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Notify vehicle owner of new review
 */
export async function notifyNewReview(
  vehicleId: string,
  reviewId: string
): Promise<void> {
  try {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('owner_id, make, model, year')
      .eq('id', vehicleId)
      .maybeSingle();

    if (!vehicle?.owner_id) return;

    const vehicleName = `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim();

    // Get reviewer handle
    const { data: review } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', reviewId)
      .maybeSingle();

    let handle = 'Someone';
    if (review?.author_id) {
      const { data: reviewer } = await supabase
        .from('profiles')
        .select('handle')
        .eq('id', review.author_id)
        .maybeSingle();
      handle = reviewer?.handle ? `@${reviewer.handle}` : 'Someone';
    }

    const message = `${handle} reviewed your ${vehicleName}`;

    await createNotification(
      vehicle.owner_id,
      NotificationTypes.NEW_REVIEW,
      'New Review',
      message,
      'vehicle',
      vehicleId
    );

    await sendPushNotification(
      vehicle.owner_id,
      'New Review',
      message,
      {
        type: NotificationTypes.NEW_REVIEW,
        vehicleId,
        reviewId,
        url: `/vehicle/${vehicleId}`
      }
    );
  } catch (error) {
    console.error('Error sending new review notification:', error);
  }
}

export async function notifyNewFollower(
  followedUserId: string,
  followerUserId: string
): Promise<void> {
  try {
    const { data: follower } = await supabase
      .from('profiles')
      .select('handle')
      .eq('id', followerUserId)
      .maybeSingle();

    if (!follower) return;

    const handle = follower.handle || 'Someone';
    const message = `@${handle} started following you`;

    await createNotification(
      followedUserId,
      NotificationTypes.NEW_FOLLOWER,
      'New Follower',
      message,
      'profile',
      followerUserId
    );

    await sendPushNotification(followedUserId, 'New Follower', message, {
      type: NotificationTypes.NEW_FOLLOWER,
      followerId: followerUserId,
      url: `/profile/${followerUserId}`
    });
  } catch (error) {
    console.error('Error sending new follower notification:', error);
  }
}

export async function notifyBadgeReceived(
  vehicleId: string,
  badgeId: string
): Promise<void> {
  try {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('owner_id, make, model, year')
      .eq('id', vehicleId)
      .maybeSingle();

    if (!vehicle?.owner_id) return;

    const { data: badge } = await supabase
      .from('badges')
      .select('name')
      .eq('id', badgeId)
      .maybeSingle();

    if (!badge) return;

    const vehicleName = `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim();
    const message = `Your ${vehicleName} received the ${badge.name} badge`;

    await createNotification(
      vehicle.owner_id,
      NotificationTypes.BADGE_RECEIVED,
      'Badge Received!',
      message,
      'vehicle',
      vehicleId
    );

    await sendPushNotification(vehicle.owner_id, 'Badge Received!', message, {
      type: NotificationTypes.BADGE_RECEIVED,
      badgeId,
      vehicleId,
      url: `/vehicle/${vehicleId}`
    });
  } catch (error) {
    console.error('Error sending badge received notification:', error);
  }
}

export async function notifyBadgeAwarded(
  userId: string,
  badgeId: string,
  badgeName: string
): Promise<void> {
  try {
    const message = `You earned the "${badgeName}" badge!`;

    await createNotification(
      userId,
      NotificationTypes.BADGE_AWARDED,
      'Badge Unlocked!',
      message,
      'badge',
      badgeId
    );

    await sendPushNotification(userId, 'Badge Unlocked!', message, {
      type: NotificationTypes.BADGE_AWARDED,
      badgeId
    });
  } catch (error) {
    console.error('Error sending badge awarded notification:', error);
  }
}

/**
 * Notify user of content moderation result
 */
export async function notifyModerationResult(
  userId: string,
  contentType: 'review' | 'post' | 'profile_image',
  contentId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<void> {
  try {
    const isApproved = status === 'approved';
    const notifTitle = isApproved ? 'Content Approved' : 'Content Not Approved';
    const notifMessage = isApproved
      ? `Your ${contentType} has been approved and is now visible`
      : rejectionReason || `Your ${contentType} did not meet our community guidelines`;

    await createNotification(
      userId,
      isApproved ? NotificationTypes.REVIEW_APPROVED : NotificationTypes.REVIEW_REJECTED,
      notifTitle,
      notifMessage,
      contentType,
      contentId
    );

    await sendPushNotification(
      userId,
      notifTitle,
      notifMessage,
      {
        type: isApproved ? NotificationTypes.REVIEW_APPROVED : NotificationTypes.REVIEW_REJECTED,
        contentType,
        contentId,
        status,
        url: '/'
      }
    );
  } catch (error) {
    console.error('Error sending moderation result notification:', error);
  }
}

export async function notifyPostLike(
  postId: string,
  authorId: string,
  likerId: string
): Promise<void> {
  try {
    if (authorId === likerId) return;

    const { data: liker } = await supabase
      .from('profiles')
      .select('handle')
      .eq('id', likerId)
      .maybeSingle();

    if (!liker) return;

    const handle = liker.handle || 'Someone';
    const message = `@${handle} liked your post`;

    await createNotification(
      authorId,
      NotificationTypes.POST_LIKE,
      'New Like',
      message,
      'post',
      postId
    );

    await sendPushNotification(authorId, 'New Like', message, {
      type: NotificationTypes.POST_LIKE,
      postId,
      likerId,
      url: `/feed`
    });
  } catch (error) {
    console.error('Error sending post like notification:', error);
  }
}

export async function notifyPostComment(
  postId: string,
  authorId: string,
  commenterId: string,
  commentText: string
): Promise<void> {
  try {
    if (authorId === commenterId) return;

    const { data: commenter } = await supabase
      .from('profiles')
      .select('handle')
      .eq('id', commenterId)
      .maybeSingle();

    if (!commenter) return;

    const handle = commenter.handle || 'Someone';
    const preview = commentText.length > 50
      ? commentText.substring(0, 47) + '...'
      : commentText;

    const message = `@${handle}: ${preview}`;

    await createNotification(
      authorId,
      NotificationTypes.POST_COMMENT,
      'New Comment',
      message,
      'post',
      postId
    );

    await sendPushNotification(authorId, 'New Comment', message, {
      type: NotificationTypes.POST_COMMENT,
      postId,
      commenterId,
      url: `/feed`
    });
  } catch (error) {
    console.error('Error sending post comment notification:', error);
  }
}

export async function notifyPostShare(
  postId: string,
  authorId: string,
  sharerId: string
): Promise<void> {
  try {
    if (authorId === sharerId) return;

    const { data: sharer } = await supabase
      .from('profiles')
      .select('handle')
      .eq('id', sharerId)
      .maybeSingle();

    if (!sharer) return;

    const handle = sharer.handle || 'Someone';
    const message = `@${handle} shared your post`;

    await createNotification(
      authorId,
      NotificationTypes.POST_SHARE,
      'Post Shared',
      message,
      'post',
      postId
    );

    await sendPushNotification(authorId, 'Post Shared', message, {
      type: NotificationTypes.POST_SHARE,
      postId,
      sharerId,
      url: `/feed`
    });
  } catch (error) {
    console.error('Error sending post share notification:', error);
  }
}

export const notifyPostLiked = notifyPostLike;
export const notifyFollowed = notifyNewFollower;

// ============================================================
// FRIEND NOTIFICATIONS
// ============================================================

export async function notifyFriendRequest(toUserId: string, fromUserId: string): Promise<void> {
  try {
    const { data: sender } = await supabase.from('profiles').select('handle').eq('id', fromUserId).maybeSingle();
    if (!sender) return;
    const handle = sender.handle || 'Someone';
    const message = `@${handle} sent you a friend request`;
    await createNotification(toUserId, 'friend_request', 'Friend Request', message, 'profile', fromUserId);
    await sendPushNotification(toUserId, 'Friend Request', message, { type: 'friend_request', fromUserId, url: `/profile/${fromUserId}` });
  } catch (error) { console.error('Error sending friend request notification:', error); }
}

export async function notifyFriendAccepted(toUserId: string, fromUserId: string): Promise<void> {
  try {
    const { data: accepter } = await supabase.from('profiles').select('handle').eq('id', fromUserId).maybeSingle();
    if (!accepter) return;
    const handle = accepter.handle || 'Someone';
    const message = `@${handle} accepted your friend request`;
    await createNotification(toUserId, 'friend_accepted', 'Friends', message, 'profile', fromUserId);
    await sendPushNotification(toUserId, 'Friends', message, { type: 'friend_accepted', fromUserId, url: `/profile/${fromUserId}` });
  } catch (error) { console.error('Error sending friend accepted notification:', error); }
}

// ============================================================
// VEHICLE FOLLOW NOTIFICATIONS
// ============================================================

export async function notifyVehicleFollow(vehicleId: string, followerUserId: string): Promise<void> {
  try {
    const { data: vehicle } = await supabase.from('vehicles').select('owner_id, make, model, year').eq('id', vehicleId).maybeSingle();
    if (!vehicle?.owner_id) return;
    if (vehicle.owner_id === followerUserId) return;
    const { data: follower } = await supabase.from('profiles').select('handle').eq('id', followerUserId).maybeSingle();
    const followerHandle = follower?.handle || 'Someone';
    const vehicleName = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
    const message = `Your ${vehicleName} gained a new fan! @${followerHandle}`;
    await createNotification(vehicle.owner_id, 'vehicle_follow', 'New Fan', message, 'vehicle', vehicleId);
    await sendPushNotification(vehicle.owner_id, 'New Fan', message, { type: 'vehicle_follow', vehicleId, followerUserId, url: `/vehicle/${vehicleId}` });
  } catch (error) { console.error('Error sending vehicle follow notification:', error); }
}

export async function notifyVehicleFollowRequest(vehicleId: string, requesterUserId: string): Promise<void> {
  try {
    const { data: vehicle } = await supabase.from('vehicles').select('owner_id, make, model, year').eq('id', vehicleId).maybeSingle();
    if (!vehicle?.owner_id) return;
    const { data: requester } = await supabase.from('profiles').select('handle').eq('id', requesterUserId).maybeSingle();
    const requesterHandle = requester?.handle || 'Someone';
    const vehicleName = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
    const message = `@${requesterHandle} wants to become a fan of your ${vehicleName}`;
    await createNotification(vehicle.owner_id, 'vehicle_follow_request', 'Fan Request', message, 'vehicle', vehicleId);
    await sendPushNotification(vehicle.owner_id, 'Fan Request', message, { type: 'vehicle_follow_request', vehicleId, requesterUserId, url: `/vehicle/${vehicleId}` });
  } catch (error) { console.error('Error sending vehicle follow request notification:', error); }
}

export async function notifyVehicleFollowApproved(followerUserId: string, vehicleId: string): Promise<void> {
  try {
    const { data: vehicle } = await supabase.from('vehicles').select('make, model, year, owner_id').eq('id', vehicleId).maybeSingle();
    if (!vehicle) return;
    const { data: owner } = await supabase.from('profiles').select('handle').eq('id', vehicle.owner_id).maybeSingle();
    const vehicleName = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
    const ownerHandle = owner?.handle || 'The owner';
    const message = `You're now a fan of ${ownerHandle}'s ${vehicleName}!`;
    await createNotification(followerUserId, 'vehicle_follow_approved', 'Fan Approved', message, 'vehicle', vehicleId);
    await sendPushNotification(followerUserId, 'Fan Approved', message, { type: 'vehicle_follow_approved', vehicleId, url: `/vehicle/${vehicleId}` });
  } catch (error) { console.error('Error sending vehicle follow approved notification:', error); }
}
