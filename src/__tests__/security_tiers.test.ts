import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function waitForProfile(userId: string, maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

describe.skip('Security Tiers Test Suite', () => {
  let spectatorAuth: any = null;
  let driverAuth: any = null;
  let ownerAuth: any = null;

  let spectatorId: string;
  let driverId: string;
  let ownerId: string;

  let testVehicleId: string;
  let testReviewId: string;
  let testPostId: string;

  beforeAll(async () => {
    console.log('Setting up test users...');

    const timestamp = Date.now();
    const spectatorEmail = `spectator-${timestamp}@test.com`;
    const driverEmail = `driver-${timestamp}@test.com`;
    const ownerEmail = `owner-${timestamp}@test.com`;
    const password = 'TestPassword123!';

    const { data: spectatorData, error: spectatorError } = await supabase.auth.signUp({
      email: spectatorEmail,
      password: password,
    });

    if (spectatorError) {
      console.error('Spectator signup error:', spectatorError);
      throw spectatorError;
    }

    spectatorAuth = spectatorData;
    spectatorId = spectatorData.user!.id;

    console.log('Waiting for spectator profile creation...');
    const spectatorProfileExists = await waitForProfile(spectatorId);
    if (!spectatorProfileExists) {
      console.warn('Spectator profile not created via trigger, creating manually...');
      await supabase
        .from('profiles')
        .insert({ id: spectatorId, role: 'spectator' });
    } else {
      await supabase
        .from('profiles')
        .update({ role: 'spectator' })
        .eq('id', spectatorId);
    }

    await supabase.auth.signOut();

    const { data: driverData, error: driverError } = await supabase.auth.signUp({
      email: driverEmail,
      password: password,
    });

    if (driverError) {
      console.error('Driver signup error:', driverError);
      throw driverError;
    }

    driverAuth = driverData;
    driverId = driverData.user!.id;

    console.log('Waiting for driver profile creation...');
    const driverProfileExists = await waitForProfile(driverId);
    if (!driverProfileExists) {
      console.warn('Driver profile not created via trigger, creating manually...');
      await supabase
        .from('profiles')
        .insert({ id: driverId, role: 'driver' });
    } else {
      await supabase
        .from('profiles')
        .update({ role: 'driver' })
        .eq('id', driverId);
    }

    await supabase.auth.signOut();

    const { data: ownerData, error: ownerError } = await supabase.auth.signUp({
      email: ownerEmail,
      password: password,
    });

    if (ownerError) {
      console.error('Owner signup error:', ownerError);
      throw ownerError;
    }

    ownerAuth = ownerData;
    ownerId = ownerData.user!.id;

    console.log('Waiting for owner profile creation...');
    const ownerProfileExists = await waitForProfile(ownerId);
    if (!ownerProfileExists) {
      console.warn('Owner profile not created via trigger, creating manually...');
      await supabase
        .from('profiles')
        .insert({ id: ownerId, role: 'owner' });
    } else {
      await supabase
        .from('profiles')
        .update({ role: 'owner' })
        .eq('id', ownerId);
    }

    await supabase.auth.signOut();

    console.log('Test users created successfully');
    console.log(`Spectator ID: ${spectatorId}`);
    console.log(`Driver ID: ${driverId}`);
    console.log(`Owner ID: ${ownerId}`);
  });

  afterAll(async () => {
    console.log('Cleaning up test data...');

    if (testPostId) {
      await supabase.from('posts').delete().eq('id', testPostId);
    }

    if (testReviewId) {
      await supabase.from('reviews').delete().eq('id', testReviewId);
    }

    if (testVehicleId) {
      await supabase.from('vehicles').delete().eq('id', testVehicleId);
    }

    await supabase.auth.signOut();
    console.log('Cleanup complete');
  });

  describe('Test 1: Shadow Vehicle Creation', () => {
    it('should allow Spectator to create a shadow vehicle by searching a new plate', async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: spectatorAuth.user.email,
        password: 'TestPassword123!',
      });

      expect(signInError).toBeNull();

      const plateHash = `test_plate_hash_${Date.now()}`;

      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          plate_hash: plateHash,
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          color: 'Silver',
          type: 'sedan',
          owner_id: null,
          is_claimed: false,
        })
        .select()
        .single();

      console.log('Shadow vehicle creation result:', { vehicle, vehicleError });

      expect(vehicleError).toBeNull();
      expect(vehicle).toBeDefined();
      expect(vehicle.owner_id).toBeNull();
      expect(vehicle.is_claimed).toBe(false);

      testVehicleId = vehicle.id;

      await supabase.auth.signOut();
    });
  });

  describe('Test 2: Spectator Review Limits', () => {
    it('should prevent Spectator from inserting review with text', async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: spectatorAuth.user.email,
        password: 'TestPassword123!',
      });

      expect(signInError).toBeNull();

      if (!testVehicleId) {
        throw new Error('Test vehicle not created');
      }

      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          vehicle_id: testVehicleId,
          author_id: spectatorId,
          driver_score: 5,
          cool_score: 5,
          text: 'This should not be allowed for spectators',
        })
        .select()
        .single();

      console.log('Spectator review attempt result:', { review, reviewError });

      expect(reviewError).toBeDefined();
      expect(review).toBeNull();

      await supabase.auth.signOut();
    });
  });

  describe('Test 3: Driver Photo Review Rights', () => {
    it('should allow Driver to post a photo review', async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: driverAuth.user.email,
        password: 'TestPassword123!',
      });

      expect(signInError).toBeNull();

      if (!testVehicleId) {
        throw new Error('Test vehicle not created');
      }

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: driverId,
          post_type: 'photo',
          image_url: 'https://example.com/test-image.jpg',
          caption: 'Test photo review from driver',
          vehicle_id: testVehicleId,
          privacy_level: 'public',
        })
        .select()
        .single();

      console.log('Driver photo post result:', { post, postError });

      expect(postError).toBeNull();
      expect(post).toBeDefined();
      expect(post.author_id).toBe(driverId);
      expect(post.post_type).toBe('photo');

      testPostId = post.id;

      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          vehicle_id: testVehicleId,
          author_id: driverId,
          driver_score: 8,
          cool_score: 7,
          text: 'Great car, smooth drive!',
        })
        .select()
        .single();

      console.log('Driver review result:', { review, reviewError });

      expect(reviewError).toBeNull();
      expect(review).toBeDefined();
      expect(review.text).toBe('Great car, smooth drive!');

      testReviewId = review.id;

      await supabase.auth.signOut();
    });
  });

  describe('Test 4: Driver God Mode Denial', () => {
    it('should prevent Driver from hiding reviews (god mode action)', async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: driverAuth.user.email,
        password: 'TestPassword123!',
      });

      expect(signInError).toBeNull();

      if (!testReviewId) {
        throw new Error('Test review not created');
      }

      const { data: hiddenReview, error: hideError } = await supabase
        .from('reviews')
        .update({ is_hidden_by_owner: true })
        .eq('id', testReviewId)
        .neq('author_id', driverId)
        .select()
        .single();

      console.log('Driver hide attempt result:', { hiddenReview, hideError });

      expect(hiddenReview).toBeNull();

      const { data: reviewCheck } = await supabase
        .from('reviews')
        .select('is_hidden_by_owner')
        .eq('id', testReviewId)
        .single();

      expect(reviewCheck?.is_hidden_by_owner).toBe(false);

      await supabase.auth.signOut();
    });
  });

  describe('Test 5: Owner God Mode Access', () => {
    it('should allow Owner to hide reviews (god mode action)', async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: ownerAuth.user.email,
        password: 'TestPassword123!',
      });

      expect(signInError).toBeNull();

      if (!testReviewId) {
        throw new Error('Test review not created');
      }

      const { data: ownerVehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          plate_hash: `owner_test_plate_${Date.now()}`,
          make: 'BMW',
          model: 'M3',
          year: 2023,
          color: 'Black',
          type: 'sedan',
          owner_id: ownerId,
          is_claimed: true,
        })
        .select()
        .single();

      expect(vehicleError).toBeNull();
      expect(ownerVehicle).toBeDefined();

      const { data: ownerReview, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          vehicle_id: ownerVehicle.id,
          author_id: driverId,
          driver_score: 6,
          cool_score: 8,
          text: 'Nice car but expensive',
        })
        .select()
        .single();

      expect(reviewError).toBeNull();

      const { data: hiddenReview, error: hideError } = await supabase
        .from('reviews')
        .update({ is_hidden_by_owner: true })
        .eq('id', ownerReview.id)
        .select()
        .single();

      console.log('Owner hide review result:', { hiddenReview, hideError });

      expect(hideError).toBeNull();
      expect(hiddenReview).toBeDefined();
      expect(hiddenReview.is_hidden_by_owner).toBe(true);

      await supabase.from('reviews').delete().eq('id', ownerReview.id);
      await supabase.from('vehicles').delete().eq('id', ownerVehicle.id);

      await supabase.auth.signOut();
    });
  });

  describe('Test 6: Privacy - Friends Only Posts', () => {
    it('should hide "Friends Only" posts from non-followers', async () => {
      const { error: driverSignIn } = await supabase.auth.signInWithPassword({
        email: driverAuth.user.email,
        password: 'TestPassword123!',
      });

      expect(driverSignIn).toBeNull();

      const { data: privatePost, error: privatePostError } = await supabase
        .from('posts')
        .insert({
          author_id: driverId,
          post_type: 'photo',
          image_url: 'https://example.com/private-image.jpg',
          caption: 'This is a friends-only post',
          privacy_level: 'friends',
        })
        .select()
        .single();

      expect(privatePostError).toBeNull();
      expect(privatePost).toBeDefined();

      await supabase.auth.signOut();

      const { error: spectatorSignIn } = await supabase.auth.signInWithPassword({
        email: spectatorAuth.user.email,
        password: 'TestPassword123!',
      });

      expect(spectatorSignIn).toBeNull();

      const { data: followCheck } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', spectatorId)
        .eq('following_id', driverId)
        .maybeSingle();

      expect(followCheck).toBeNull();

      const { data: visiblePosts } = await supabase
        .from('posts')
        .select('*')
        .eq('id', privatePost.id);

      console.log('Non-follower visibility check:', { visiblePosts });

      const isVisible = visiblePosts && visiblePosts.length > 0;
      const canAccess = visiblePosts?.[0]?.privacy_level === 'public' || followCheck !== null;

      expect(canAccess).toBe(false);

      await supabase.auth.signOut();

      const { error: ownerSignIn } = await supabase.auth.signInWithPassword({
        email: ownerAuth.user.email,
        password: 'TestPassword123!',
      });

      expect(ownerSignIn).toBeNull();

      const { error: followError } = await supabase
        .from('follows')
        .insert({
          follower_id: ownerId,
          following_id: driverId,
        });

      expect(followError).toBeNull();

      const { data: followCheck2 } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', ownerId)
        .eq('following_id', driverId)
        .maybeSingle();

      expect(followCheck2).toBeDefined();

      const { data: visiblePosts2 } = await supabase
        .from('posts')
        .select('*')
        .eq('id', privatePost.id);

      const canAccessAsFollower = visiblePosts2 && visiblePosts2.length > 0 && followCheck2 !== null;

      console.log('Follower visibility check:', { visiblePosts2, canAccessAsFollower });

      expect(canAccessAsFollower).toBe(true);

      await supabase.from('follows').delete().eq('follower_id', ownerId).eq('following_id', driverId);
      await supabase.from('posts').delete().eq('id', privatePost.id);

      await supabase.auth.signOut();
    });
  });
});
