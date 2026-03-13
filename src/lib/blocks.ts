import { supabase } from './supabase';

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export async function blockUser(blockedUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (user.id === blockedUserId) {
      return { success: false, error: 'Cannot block yourself' };
    }

    const { error } = await supabase
      .from('user_blocks')
      .insert({
        blocker_id: user.id,
        blocked_id: blockedUserId,
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'User is already blocked' };
      }
      console.error('Error blocking user:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error blocking user:', error);
    return { success: false, error: 'Failed to block user' };
  }
}

export async function unblockUser(blockedUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedUserId);

    if (error) {
      console.error('Error unblocking user:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error unblocking user:', error);
    return { success: false, error: 'Failed to unblock user' };
  }
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking block status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking block status:', error);
    return false;
  }
}

export async function getBlockedUsers(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id);

    if (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }

    return data?.map(block => block.blocked_id) || [];
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    return [];
  }
}

export async function getUsersThatBlockedMe(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocked_id', user.id);

    if (error) {
      console.error('Error fetching blockers:', error);
      return [];
    }

    return data?.map(block => block.blocker_id) || [];
  } catch (error) {
    console.error('Error fetching blockers:', error);
    return [];
  }
}
