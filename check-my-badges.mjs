import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkMyBadges() {
  // Get user ID for jazsrt
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, handle')
    .eq('handle', 'jazsrt')
    .single();

  if (profileError || !profile) {
    console.error('User not found:', profileError);
    return;
  }

  console.log(`\nChecking badges for user: ${profile.handle} (${profile.id})\n`);

  // Get all badges the user has
  const { data: userBadges, error: badgesError } = await supabase
    .from('user_badges')
    .select(`
      badge_id,
      awarded_at,
      badges (
        name,
        tier,
        category
      )
    `)
    .eq('user_id', profile.id)
    .order('awarded_at', { ascending: false });

  if (badgesError) {
    console.error('Error fetching badges:', badgesError);
    return;
  }

  if (!userBadges || userBadges.length === 0) {
    console.log('You have no badges yet!');
    return;
  }

  console.log(`Total badges: ${userBadges.length}\n`);
  console.log('Your badges:');
  console.table(userBadges.map(ub => ({
    badge_id: ub.badge_id,
    name: ub.badges?.name,
    tier: ub.badges?.tier || 'N/A',
    category: ub.badges?.category,
    awarded: new Date(ub.awarded_at).toLocaleString()
  })));

  // Check for unread badge notifications
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('id, type, read, created_at, data')
    .eq('user_id', profile.id)
    .eq('type', 'badge_earned')
    .eq('read', false)
    .order('created_at', { ascending: false });

  if (notifError) {
    console.error('Error fetching notifications:', notifError);
    return;
  }

  console.log(`\nUnread badge notifications: ${notifications?.length || 0}`);
  if (notifications && notifications.length > 0) {
    console.table(notifications.map(n => ({
      id: n.id.substring(0, 8),
      badge_id: n.data?.badge_id,
      created: new Date(n.created_at).toLocaleString()
    })));
  }
}

checkMyBadges();
