import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from('badges')
  .select('id, name, category, earning_method, tier, tier_threshold')
  .order('category')
  .order('tier_threshold');

if (error) {
  console.error('Error:', error);
} else {
  console.log('Current badges in database:');
  console.table(data);
}
