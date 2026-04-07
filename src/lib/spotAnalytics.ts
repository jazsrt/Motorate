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

const DEFAULT_LOOKUP_CREDITS = 10;

export async function getLookupCredits(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_lookup_credits')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      // Table may not exist — grant default credits so API can be called
      console.warn('[getLookupCredits] query error:', error.message);
      return DEFAULT_LOOKUP_CREDITS;
    }

    if (!data) {
      // No row for this user — create one with default credits
      console.log('[getLookupCredits] No credit row found, granting default credits');
      await supabase.from('user_lookup_credits').insert({
        user_id: userId,
        balance: DEFAULT_LOOKUP_CREDITS,
        lifetime_consumed: 0,
      }).select().maybeSingle();
      return DEFAULT_LOOKUP_CREDITS;
    }

    return data.balance ?? DEFAULT_LOOKUP_CREDITS;
  } catch {
    // If anything fails, still allow lookups
    return DEFAULT_LOOKUP_CREDITS;
  }
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
