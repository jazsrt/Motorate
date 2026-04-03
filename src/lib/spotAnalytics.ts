import { supabase } from './supabase';

type SpotEvent =
  | 'quick_spot_started'
  | 'verified_spot_started'
  | 'quick_spot_created'
  | 'verified_spot_created'
  | 'verify_clicked_pre_submit'
  | 'verify_clicked_post_submit'
  | 'lookup_confirmed'
  | 'lookup_blocked_zero_balance'
  | 'cache_hit'
  | 'cache_miss'
  | 'quick_to_verified_conversion';

export async function trackSpotEvent(
  event: SpotEvent,
  userId: string | undefined,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.from('spot_analytics').insert({
      user_id: userId || null,
      event_name: event,
      properties,
    });
  } catch { /* analytics must never break the user flow */ }
}

export async function getLookupCredits(userId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('user_lookup_credits')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    return data?.balance ?? 0;
  } catch { return 0; }
}

export async function consumeLookupCredit(userId: string): Promise<boolean> {
  try {
    const { data: current } = await supabase
      .from('user_lookup_credits')
      .select('balance, lifetime_consumed')
      .eq('user_id', userId)
      .maybeSingle();
    if (!current || current.balance <= 0) return false;
    await supabase
      .from('user_lookup_credits')
      .update({
        balance: current.balance - 1,
        lifetime_consumed: current.lifetime_consumed + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    return true;
  } catch { return false; }
}
