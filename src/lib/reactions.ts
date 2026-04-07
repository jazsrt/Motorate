import { supabase } from './supabase';
import { calculateAndAwardReputation, getLikeCount } from './reputation';

export type ReactionType = 'fire' | 'heart' | 'dead' | 'applause' | 'laugh' | 'shock' | 'angry';

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface ReactionCounts {
  fire: number;
  heart: number;
  dead: number;
  applause: number;
  laugh: number;
  shock: number;
  angry: number;
}

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  fire: '🔥',
  heart: '❤️',
  dead: '💀',
  applause: '👏',
  laugh: '😂',
  shock: '😮',
  angry: '😡',
};

export async function addReaction(postId: string, userId: string, reactionType: ReactionType) {
  const { data: existing } = await supabase
    .from('reactions')
    .select('id, reaction_type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    if (existing.reaction_type === reactionType) {
      return await removeReaction(postId, userId);
    } else {
      const { error } = await supabase
        .from('reactions')
        .update({ reaction_type: reactionType })
        .eq('id', existing.id);

      if (error) throw error;
      return { removed: false, reactionType };
    }
  } else {
    const { error } = await supabase
      .from('reactions')
      .insert({
        post_id: postId,
        user_id: userId,
        reaction_type: reactionType,
      });

    if (error) throw error;

    // Get post author and send notification + award reputation
    try {
      const { data: post } = await supabase
        .from('posts')
        .select('author_id')
        .eq('id', postId)
        .maybeSingle();

      if (post && post.author_id !== userId) {
        // Send notification
        const { notifyPostLike } = await import('./notifications');
        await notifyPostLike(postId, post.author_id, userId);

        // REPUTATION: Award points to POST AUTHOR (not the reactor)
        try {
          const likeCount = await getLikeCount(postId);
          await calculateAndAwardReputation({
            userId: post.author_id, // Award to post author!
            action: 'LIKE_RECEIVED',
            referenceType: 'post',
            referenceId: postId,
            metadata: { likeCount }
          });
        } catch (repError) {
          console.error('Reputation award error:', repError);
        }
      }
    } catch (notifError) {
      console.error('Failed to send reaction notification:', notifError);
    }


    return { removed: false, reactionType };
  }
}

export async function removeReaction(postId: string, userId: string) {
  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  
  if (error) throw error;
  return { removed: true };
}

export async function getReactionCounts(postId: string): Promise<ReactionCounts> {
  const { data, error } = await supabase
    .from('reactions')
    .select('reaction_type')
    .eq('post_id', postId);

  if (error) throw error;

  const counts: ReactionCounts = {
    fire: 0,
    heart: 0,
    dead: 0,
    applause: 0,
    laugh: 0,
    shock: 0,
    angry: 0,
  };

  data?.forEach((reaction) => {
    if (reaction.reaction_type in counts) {
      counts[reaction.reaction_type as ReactionType]++;
    }
  });

  return counts;
}

export async function getUserReaction(postId: string, userId: string): Promise<ReactionType | null> {
  const { data, error } = await supabase
    .from('reactions')
    .select('reaction_type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.reaction_type || null;
}
