import { supabase } from './supabase';

/**
 * Delete user account - GDPR "right to be forgotten"
 *
 * This will:
 * - Anonymize all reviews (preserve vehicle history)
 * - Delete all posts, comments, likes
 * - Delete social connections (follows, blocks)
 * - Delete badge inventory
 * - Delete challenge progress
 * - Cancel active stolen alerts
 * - Release claimed vehicles
 * - Delete profile
 * - Sign out user
 *
 * WARNING: This action cannot be undone!
 */
export async function deleteAccount(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Delete uploaded storage files for this user
  try {
    const folders = [
      `${user.id}/profiles`,
      `${user.id}/vehicles`,
      `${user.id}/posts`,
      `${user.id}/reviews`,
    ];
    for (const folder of folders) {
      const { data: files } = await supabase.storage
        .from('motorate-images')
        .list(folder);
      if (files && files.length > 0) {
        const paths = files.map((f: { name: string }) => `${folder}/${f.name}`);
        await supabase.storage.from('motorate-images').remove(paths);
      }
    }
  } catch (storageErr) {
    console.error('Failed to clean up storage files:', storageErr);
    // Non-fatal — proceed with DB deletion
  }

  // Delete all user data via database function
  const { error: dbError } = await supabase.rpc('delete_user_account', {
    p_user_id: user.id,
  });

  if (dbError) {
    console.error('Error deleting user data:', dbError);
    throw new Error('Failed to delete account data: ' + dbError.message);
  }

  // Sign out (this also removes the session)
  await supabase.auth.signOut();
}

/**
 * Verify password before account deletion
 */
export async function verifyPasswordForDeletion(password: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  return !error;
}
