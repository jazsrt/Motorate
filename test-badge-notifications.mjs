#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('Using', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service role' : 'anon', 'key\n');

console.log('====================================');
console.log('BADGE NOTIFICATION SYSTEM TEST');
console.log('====================================\n');

async function testBadgeNotifications() {
  // Step 1: Check existing badge awards and notifications
  console.log('Step 1: Checking existing badge awards and notifications...\n');

  const { data: badgeAwards, error: badgeError } = await supabase
    .from('user_badges')
    .select(`
      id,
      user_id,
      badge_id,
      awarded_at,
      badges (
        name,
        category,
        description
      )
    `)
    .order('awarded_at', { ascending: false })
    .limit(5);

  if (badgeError) {
    console.error('Error fetching badge awards:', badgeError);
    return;
  }

  console.log(`Total badge awards fetched: ${badgeAwards.length}\n`);

  if (badgeAwards.length > 0) {
    console.log('Recent badge awards:');
    for (const award of badgeAwards) {
      console.log(`  - User: ${award.user_id}`);
      console.log(`    Badge: ${award.badges?.name} (${award.badges?.category})`);
      console.log(`    Awarded: ${new Date(award.awarded_at).toLocaleString()}`);

      // Check for corresponding notification
      const { data: notification } = await supabase
        .from('notifications')
        .select('id, type, title, is_read, created_at')
        .eq('user_id', award.user_id)
        .eq('type', 'badge_awarded')
        .eq('link_id', award.badge_id)
        .maybeSingle();

      if (notification) {
        console.log(`    ✓ Notification exists: "${notification.title}" (Read: ${notification.is_read})`);
      } else {
        console.log(`    ✗ NO NOTIFICATION FOUND`);
      }
      console.log('');
    }
  } else {
    console.log('No badge awards found in the system.\n');
  }

  // Step 2: Count badges without notifications
  console.log('\nStep 2: Checking for badges without notifications...\n');

  const { data: allBadges } = await supabase
    .from('user_badges')
    .select('id, user_id, badge_id, badges(name)');

  let missingNotifications = 0;
  if (allBadges) {
    for (const badge of allBadges) {
      const { data: notification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', badge.user_id)
        .eq('type', 'badge_awarded')
        .eq('link_id', badge.badge_id)
        .maybeSingle();

      if (!notification) {
        missingNotifications++;
        console.log(`  ✗ Missing notification for badge: ${badge.badges?.name} (user: ${badge.user_id})`);
      }
    }
  }

  console.log(`\nTotal badges: ${allBadges?.length || 0}`);
  console.log(`Badges without notifications: ${missingNotifications}\n`);

  // Step 3: Test badge award simulation
  console.log('\nStep 3: Simulating a badge award...\n');

  // Get a test user - check the user_badges table for an existing user
  const { data: userBadgeData } = await supabase
    .from('user_badges')
    .select('user_id')
    .limit(1);

  if (!userBadgeData || userBadgeData.length === 0) {
    console.log('No user badges found. Cannot simulate badge award.\n');
    return;
  }

  const testUserId = userBadgeData[0].user_id;
  console.log(`Test user ID: ${testUserId}\n`);

  // Find a badge they don't have
  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', testUserId);

  const hasBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);

  const { data: availableBadges } = await supabase
    .from('badges')
    .select('id, name, description')
    .order('name')
    .limit(20);

  const unownedBadge = availableBadges?.find(b => !hasBadgeIds.has(b.id));

  if (!unownedBadge) {
    console.log('User already has all available badges. Cannot test new award.\n');
    return;
  }

  console.log(`Badge to award: ${unownedBadge.name}`);
  console.log(`Description: ${unownedBadge.description}\n`);

  // Count notifications before
  const { count: notificationsBefore } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', testUserId)
    .eq('type', 'badge_awarded');

  console.log(`Notifications before: ${notificationsBefore || 0}`);

  // Award the badge (this should trigger the notification)
  const { data: newAward, error: awardError } = await supabase
    .from('user_badges')
    .insert({
      user_id: testUserId,
      badge_id: unownedBadge.id,
      awarded_at: new Date().toISOString()
    })
    .select()
    .single();

  if (awardError) {
    console.error('Error awarding badge:', awardError);
    return;
  }

  console.log(`✓ Badge awarded successfully!\n`);

  // Wait a moment for the trigger to fire
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Count notifications after
  const { count: notificationsAfter } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', testUserId)
    .eq('type', 'badge_awarded');

  console.log(`Notifications after: ${notificationsAfter || 0}`);
  console.log(`New notifications created: ${(notificationsAfter || 0) - (notificationsBefore || 0)}\n`);

  // Verify the specific notification was created
  const { data: newNotification } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', testUserId)
    .eq('type', 'badge_awarded')
    .eq('link_id', unownedBadge.id)
    .maybeSingle();

  if (newNotification) {
    console.log('✓✓✓ SUCCESS! Notification was created:');
    console.log(`  Title: ${newNotification.title}`);
    console.log(`  Message: ${newNotification.message}`);
    console.log(`  Created: ${new Date(newNotification.created_at).toLocaleString()}`);
    console.log(`  Is Read: ${newNotification.is_read}\n`);
  } else {
    console.log('✗✗✗ FAILED! No notification was created.\n');
    console.log('Check that the trigger "on_badge_awarded_notify" exists on the user_badges table.\n');
  }

  // Step 4: Show recent notifications
  console.log('\nStep 4: Recent badge notifications:\n');

  const { data: recentNotifications } = await supabase
    .from('notifications')
    .select(`
      id,
      user_id,
      type,
      title,
      message,
      link_id,
      is_read,
      created_at
    `)
    .eq('type', 'badge_awarded')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentNotifications && recentNotifications.length > 0) {
    for (const notif of recentNotifications) {
      console.log(`  - ${notif.title}`);
      console.log(`    User: ${notif.user_id}`);
      console.log(`    Badge ID: ${notif.link_id}`);
      console.log(`    Read: ${notif.is_read}`);
      console.log(`    Created: ${new Date(notif.created_at).toLocaleString()}`);
      console.log('');
    }
  } else {
    console.log('  No badge notifications found.\n');
  }

  console.log('====================================');
  console.log('TEST COMPLETE');
  console.log('====================================\n');
}

testBadgeNotifications().catch(console.error);
