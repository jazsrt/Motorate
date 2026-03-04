import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkNotifications() {
  // Get user ID for jazsrt
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('handle', 'jazsrt')
    .single();

  if (!profile) {
    console.error('User not found');
    return;
  }

  // Get recent notifications
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\nRecent notifications (${notifications.length}):\n`);
  console.table(notifications.map(n => ({
    id: n.id.substring(0, 8),
    type: n.type,
    created: new Date(n.created_at).toLocaleString(),
    badge_id: n.data?.badge_id
  })));

  // Count badge notifications
  const badgeNotifs = notifications.filter(n => n.type === 'badge_earned');
  console.log(`\nBadge notifications: ${badgeNotifs.length}`);
}

checkNotifications();
