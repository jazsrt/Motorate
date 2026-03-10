import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service_role key to bypass RLS for seeding
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ── 25 realistic car images from Pexels (free, no auth needed) ──
const carImages = [
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3752169/pexels-photo-3752169.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/337909/pexels-photo-337909.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1007410/pexels-photo-1007410.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/119435/pexels-photo-119435.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/244206/pexels-photo-244206.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1149831/pexels-photo-1149831.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1035108/pexels-photo-1035108.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/977003/pexels-photo-977003.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/627678/pexels-photo-627678.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1280560/pexels-photo-1280560.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1402787/pexels-photo-1402787.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/909907/pexels-photo-909907.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2127733/pexels-photo-2127733.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1545744/pexels-photo-1545744.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/810357/pexels-photo-810357.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1719648/pexels-photo-1719648.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2676096/pexels-photo-2676096.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3593922/pexels-photo-3593922.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3136673/pexels-photo-3136673.jpeg?auto=compress&cs=tinysrgb&w=800',
];

// ── Vehicle data for spots/reviews ──
const vehicles = [
  { year: 2024, make: 'BMW',          model: 'M4 Competition',    color: 'Isle of Man Green', plate_number: 'M4COMP',   plate_state: 'IL' },
  { year: 2023, make: 'Porsche',      model: '911 GT3 RS',       color: 'Python Green',      plate_number: 'GT3RS23',  plate_state: 'CA' },
  { year: 2025, make: 'Lamborghini',  model: 'Revuelto',         color: 'Viola Pasifae',     plate_number: 'RVOLTO',   plate_state: 'FL' },
  { year: 2024, make: 'Ford',         model: 'Mustang Dark Horse', color: 'Vapor Blue',      plate_number: 'DRKHRS',   plate_state: 'TX' },
  { year: 2023, make: 'Chevrolet',    model: 'Corvette Z06',     color: 'Accelerate Yellow', plate_number: 'Z06VTTE',  plate_state: 'MI' },
  { year: 2024, make: 'Mercedes-AMG', model: 'GT 63 S',          color: 'Graphite Grey',     plate_number: 'AMG63S',   plate_state: 'NY' },
  { year: 2022, make: 'Nissan',       model: 'GT-R Nismo',       color: 'Stealth Grey',      plate_number: 'GODZLA',   plate_state: 'NJ' },
  { year: 2024, make: 'Toyota',       model: 'GR Supra',         color: 'Renaissance Red',   plate_number: 'SUPRA24',  plate_state: 'IL' },
  { year: 2023, make: 'Dodge',        model: 'Challenger Hellcat', color: 'TorRed',          plate_number: 'HLCAT',    plate_state: 'OH' },
  { year: 2025, make: 'Tesla',        model: 'Model S Plaid',    color: 'Midnight Cherry',   plate_number: 'PLAID25',  plate_state: 'CA' },
  { year: 2024, make: 'Audi',         model: 'RS7',              color: 'Nardo Grey',        plate_number: 'RS7NRDO',  plate_state: 'IL' },
  { year: 2023, make: 'McLaren',      model: '720S',             color: 'Papaya Spark',      plate_number: 'MCL720',   plate_state: 'FL' },
  { year: 2024, make: 'Subaru',       model: 'WRX STI',          color: 'World Rally Blue',  plate_number: 'WRXSTI',   plate_state: 'CO' },
  { year: 2022, make: 'Honda',        model: 'Civic Type R',     color: 'Championship White', plate_number: 'TYPER',   plate_state: 'IL' },
  { year: 2024, make: 'Jeep',         model: 'Wrangler Rubicon', color: 'Sarge Green',       plate_number: 'RUBCN',    plate_state: 'AZ' },
  { year: 2023, make: 'Ferrari',      model: '296 GTB',          color: 'Rosso Corsa',       plate_number: '296GTB',   plate_state: 'CA' },
  { year: 2024, make: 'Rivian',       model: 'R1T',              color: 'Forest Green',      plate_number: 'RVIAN',    plate_state: 'WA' },
  { year: 2025, make: 'Cadillac',     model: 'CT5-V Blackwing',  color: 'Electric Blue',     plate_number: 'BLKWNG',   plate_state: 'MI' },
];

// ── Post data: 25 unique entries ──
const seedPosts = [
  // Quick Spots (10)
  { type: 'spot', spotType: 'quick', caption: 'This M4 is absolutely unreal in person. The green is insane under streetlights.', location: 'Lincoln Park, Chicago', sentiment: 'love', vehicleIdx: 0, ratingVehicle: 5, ratingDriver: 4, ratingDriving: 5 },
  { type: 'spot', spotType: 'quick', caption: 'GT3 RS parked at Cars and Coffee. Wing is massive. Owner said it has 4k miles on it.', location: 'Malibu, CA', sentiment: 'love', vehicleIdx: 1, ratingVehicle: 5, ratingDriver: null, ratingDriving: null },
  { type: 'spot', spotType: 'quick', caption: 'Revuelto just casually parked at Whole Foods. Violet is not a color I expected on a Lambo but it works.', location: 'Miami Beach, FL', sentiment: 'love', vehicleIdx: 2, ratingVehicle: 5, ratingDriver: 3, ratingDriving: 4 },
  { type: 'spot', spotType: 'quick', caption: 'Dark Horse rumbling through downtown. The coyote sounds angry.', location: 'Austin, TX', sentiment: 'love', vehicleIdx: 3, ratingVehicle: 4, ratingDriver: 4, ratingDriving: 3 },
  { type: 'spot', spotType: 'quick', caption: 'Z06 with dealer plates still on it. That flat-plane crank idle is unmistakable.', location: 'Detroit, MI', sentiment: 'love', vehicleIdx: 4, ratingVehicle: 5, ratingDriver: null, ratingDriving: null },
  { type: 'spot', spotType: 'quick', caption: 'AMG GT pulling out of a parking garage. Driver revved it for us. Respect.', location: 'Manhattan, NY', sentiment: 'love', vehicleIdx: 5, ratingVehicle: 5, ratingDriver: 5, ratingDriving: 4 },
  { type: 'spot', spotType: 'quick', caption: 'R35 GT-R Nismo spotted on the highway. Tried to keep up... could not.', location: 'Jersey Turnpike, NJ', sentiment: 'love', vehicleIdx: 6, ratingVehicle: 5, ratingDriver: 4, ratingDriving: 5 },
  { type: 'spot', spotType: 'quick', caption: 'This GR Supra is clean. No aftermarket stuff, just bone stock perfection.', location: 'Wicker Park, Chicago', sentiment: 'love', vehicleIdx: 7, ratingVehicle: 4, ratingDriver: 4, ratingDriving: 4 },
  { type: 'spot', spotType: 'quick', caption: 'Hellcat doing burnouts in a parking lot at 11pm. Classic Dodge behavior.', location: 'Columbus, OH', sentiment: null, vehicleIdx: 8, ratingVehicle: 4, ratingDriver: 2, ratingDriving: 1 },
  { type: 'spot', spotType: 'quick', caption: 'Model S Plaid launch from a stoplight. That thing is genuinely terrifying fast.', location: 'Palo Alto, CA', sentiment: 'love', vehicleIdx: 9, ratingVehicle: 5, ratingDriver: 3, ratingDriving: 5 },

  // Full Spots / Reviews (8)
  { type: 'spot', spotType: 'full', caption: 'Full review of this RS7. Interior is chef\'s kiss. Bang & Olufsen system is unmatched. The Nardo Grey makes it look like a stealth fighter.', location: 'River North, Chicago', sentiment: 'love', vehicleIdx: 10, ratingVehicle: 5, ratingDriver: 4, ratingDriving: 5, looks: 5, sound: 4, condition: 5 },
  { type: 'spot', spotType: 'full', caption: 'Got up close with this 720S. Carbon fiber everywhere. The dihedral doors never get old. Owner was super cool about letting me check it out.', location: 'South Beach, FL', sentiment: 'love', vehicleIdx: 11, ratingVehicle: 5, ratingDriver: 5, ratingDriving: 5, looks: 5, sound: 5, condition: 5 },
  { type: 'spot', spotType: 'full', caption: 'WRX STI in rally blue. This thing has been through some stuff — mud flaps are caked, paint has rock chips, but it\'s clearly loved. Full bolt-on build.', location: 'Boulder, CO', sentiment: 'love', vehicleIdx: 12, ratingVehicle: 4, ratingDriver: 5, ratingDriving: 4, looks: 3, sound: 4, condition: 3 },
  { type: 'spot', spotType: 'full', caption: 'Type R in Championship White. The owner showed me the boost gauge mod and the intake. Sounds like a sewing machine but moves like a rocket. Respectable daily.', location: 'Lakeview, Chicago', sentiment: 'love', vehicleIdx: 13, ratingVehicle: 4, ratingDriver: 4, ratingDriving: 4, looks: 4, sound: 3, condition: 5 },
  { type: 'spot', spotType: 'full', caption: 'Rubicon on 37s with a snorkel. This thing has clearly seen real trails. Lockers, winch, light bar — the whole setup. Built not bought.', location: 'Sedona, AZ', sentiment: 'love', vehicleIdx: 14, ratingVehicle: 4, ratingDriver: 5, ratingDriving: 3, looks: 4, sound: 3, condition: 3 },
  { type: 'spot', spotType: 'full', caption: '296 GTB. Words can\'t describe this car. The hybrid V6 sounds like nothing else. Rosso Corsa is THE Ferrari color. Absolute masterpiece.', location: 'Beverly Hills, CA', sentiment: 'love', vehicleIdx: 15, ratingVehicle: 5, ratingDriver: 5, ratingDriving: 5, looks: 5, sound: 5, condition: 5 },
  { type: 'spot', spotType: 'full', caption: 'R1T in the wild doing actual truck things — loaded bed, bikes on the rack. First EV truck I\'ve seen that looks like it gets used. Impressed.', location: 'Seattle, WA', sentiment: 'love', vehicleIdx: 16, ratingVehicle: 4, ratingDriver: 4, ratingDriving: 4, looks: 4, sound: 2, condition: 4 },
  { type: 'spot', spotType: 'full', caption: 'CT5-V Blackwing. The last true American super sedan with a manual trans. Owner let me hear the supercharger. My ears are still ringing. 10/10.', location: 'Dearborn, MI', sentiment: 'love', vehicleIdx: 17, ratingVehicle: 5, ratingDriver: 5, ratingDriving: 5, looks: 4, sound: 5, condition: 5 },

  // Photo posts (5)
  { type: 'photo', caption: 'Perfect golden hour at the car meet tonight. Best turnout we\'ve had all year.', location: 'Grant Park, Chicago' },
  { type: 'photo', caption: 'My garage setup is finally coming together. New epoxy floor and LED strips installed this weekend.', location: 'Home Garage' },
  { type: 'photo', caption: 'Three generations of Mustang at the show. 1967 Fastback, 2014 GT500, and the new Dark Horse. Which one you taking?', location: 'Woodward Ave, Detroit' },
  { type: 'photo', caption: 'Just finished detailing. 12 hours of paint correction and ceramic coat. Worth every minute.', location: 'Chicago, IL' },
  { type: 'photo', caption: 'Rain + neon + supercars. Downtown hits different at 2am.', location: 'River North, Chicago' },

  // Badge post (1)
  { type: 'photo', caption: 'Just unlocked Night Owl badge for spotting after midnight. This community is addicting.', location: 'Chicago, IL' },
  // Hate spot (1)
  { type: 'spot', spotType: 'quick', caption: 'Someone put a fake M badge on a 228i. Why do people do this? The badge delete would look better than a lie.', location: 'Oak Park, IL', sentiment: 'hate', vehicleIdx: null, ratingVehicle: 2, ratingDriver: 1, ratingDriving: 2 },
];

async function seed() {
  console.log('Connecting to Supabase...');

  // 1. Get existing profiles to use as authors
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, handle')
    .limit(10);

  if (profileError || !profiles?.length) {
    console.error('No profiles found. You need at least one signed-up user.', profileError);
    process.exit(1);
  }

  console.log(`Found ${profiles.length} profile(s): ${profiles.map(p => p.handle || p.id.slice(0, 8)).join(', ')}`);

  // 2. Create vehicles for the spots/reviews
  console.log('Creating vehicles...');
  const createdVehicles = [];
  for (const v of vehicles) {
    const plateHash = `seed_${v.plate_number}_${Date.now()}`;
    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        plate_hash: plateHash,
        year: v.year,
        make: v.make,
        model: v.model,
        color: v.color,
        plate_number: v.plate_number,
        plate_state: v.plate_state,
        stock_image_url: carImages[createdVehicles.length % carImages.length],
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Failed to create vehicle ${v.make} ${v.model}:`, error.message);
      createdVehicles.push(null);
    } else {
      createdVehicles.push(data.id);
      console.log(`  Created: ${v.year} ${v.make} ${v.model} (${data.id.slice(0, 8)})`);
    }
  }

  // 3. Create 25 posts with staggered timestamps (spread over last 3 days)
  console.log('\nCreating 25 feed posts...');
  const now = Date.now();
  let successCount = 0;

  for (let i = 0; i < seedPosts.length; i++) {
    const sp = seedPosts[i];
    const authorProfile = profiles[i % profiles.length];
    // Spread posts over last 72 hours so they appear in chronological order
    const hoursAgo = (seedPosts.length - i) * 2.8;
    const createdAt = new Date(now - hoursAgo * 3600000).toISOString();

    const vehicleId = sp.vehicleIdx != null ? createdVehicles[sp.vehicleIdx] : null;

    const postData = {
      author_id: authorProfile.id,
      post_type: sp.type === 'spot' ? 'spot' : 'photo',
      spot_type: sp.spotType || null,
      sentiment: sp.sentiment || null,
      image_url: carImages[i],
      caption: sp.caption,
      location_label: sp.location || null,
      vehicle_id: vehicleId,
      privacy_level: 'public',
      moderation_status: 'approved',
      created_at: createdAt,
      rating_vehicle: sp.ratingVehicle || null,
      rating_driver: sp.ratingDriver || null,
      rating_driving: sp.ratingDriving || null,
      looks_rating: sp.looks || null,
      sound_rating: sp.sound || null,
      condition_rating: sp.condition || null,
      heat_score: Math.floor(Math.random() * 80) + 20,
      quality_score: Math.floor(Math.random() * 40) + 60,
    };

    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select('id')
      .single();

    if (error) {
      console.error(`  [${i + 1}] FAILED: ${error.message}`);
      // Try without the rating columns in case they don't exist
      if (error.message.includes('column')) {
        const { rating_vehicle, rating_driver, rating_driving, looks_rating, sound_rating, condition_rating, spot_type, sentiment, heat_score, quality_score, ...fallbackData } = postData;
        const { data: d2, error: e2 } = await supabase.from('posts').insert(fallbackData).select('id').single();
        if (!e2) {
          successCount++;
          console.log(`  [${i + 1}] OK (fallback): ${sp.caption.slice(0, 50)}...`);
          continue;
        }
        console.error(`  [${i + 1}] FALLBACK ALSO FAILED: ${e2.message}`);
      }
    } else {
      successCount++;
      console.log(`  [${i + 1}] OK: ${sp.type}${sp.spotType ? '/' + sp.spotType : ''} — ${sp.caption.slice(0, 50)}...`);
    }
  }

  console.log(`\nDone! ${successCount}/25 posts created successfully.`);
  console.log('Refresh your feed in the app to see them.');
}

seed().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
