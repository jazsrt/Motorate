import { supabase } from './supabase';

function getOrCreateSessionId(): string {
  const SESSION_KEY = 'motorate_session_id';
  try {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

export async function trackPostView(postId: string, userId?: string | null): Promise<void> {
  try {
    if (!postId || typeof postId !== 'string') return;

    const sessionId = getOrCreateSessionId();

    // Check if already viewed this session by this user/session
    let alreadyViewed = false;
    if (userId) {
      const { count } = await supabase
        .from('post_views')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('user_id', userId);
      alreadyViewed = (count ?? 0) > 0;
    } else {
      const { count } = await supabase
        .from('post_views')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('session_id', sessionId)
        .is('user_id', null);
      alreadyViewed = (count ?? 0) > 0;
    }

    if (alreadyViewed) return;

    // Insert into post_views (existing table: id, post_id, user_id, session_id, viewed_at)
    await supabase
      .from('post_views')
      .insert({
        post_id: postId,
        user_id: userId || null,
        session_id: sessionId,
      })
      .then(({ error }) => {
        if (error) return;
        // Increment view_count on posts table (existing column)
        void Promise.resolve(supabase.rpc('increment_post_view_count', {
          p_post_id: postId,
          p_user_id: userId || null,
          p_session_id: sessionId,
        })).catch(() => {});
      });

  } catch {
    // Silent — view tracking must never break the UI
  }
}

