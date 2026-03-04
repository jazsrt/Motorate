import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function listAllBadges() {
  const { data, error } = await supabase
    .from('badges')
    .select('id, name, tier, category')
    .order('category', { ascending: true })
    .order('tier', { ascending: true });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('All Badges:');
    console.table(data);
  }
}

listAllBadges();
