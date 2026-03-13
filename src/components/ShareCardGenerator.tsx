import { supabase } from '../lib/supabase';

interface ShareCardData {
  type: 'vehicle' | 'spot' | 'badge' | 'profile';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  stats?: { label: string; value: string }[];
  userHandle: string;
  userRep: number;
  deepLinkUrl: string;
}

export async function shareToSocial(data: ShareCardData): Promise<boolean> {
  const shareUrl = data.deepLinkUrl;
  const shareTitle = `${data.title} on MotoRate`;

  let shareText = '';
  switch (data.type) {
    case 'vehicle':
      shareText = `Check out this ${data.title} - spotted by @${data.userHandle} on MotoRate`;
      break;
    case 'spot':
      shareText = `Just spotted a ${data.title}! Rate it on MotoRate`;
      break;
    case 'badge':
      shareText = `Just earned "${data.title}" on MotoRate! ${data.subtitle || ''}`;
      break;
    case 'profile':
      shareText = `${data.userRep.toLocaleString()} rep and climbing. Find me on MotoRate: @${data.userHandle}`;
      break;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });

      // Track share event (silently fails if table doesn't exist)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('share_events').insert({
            user_id: user.id,
            content_type: data.type,
            platform: 'native_share',
          });
        }
      } catch { /* share_events table may not exist yet */ }

      return true;
    } catch {
      // User cancelled or not supported — fall through to clipboard
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
  } catch {
    // Clipboard API not available
  }

  // Track clipboard share
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('share_events').insert({
        user_id: user.id,
        content_type: data.type,
        platform: 'clipboard',
      });
    }
  } catch { /* share_events table may not exist yet */ }

  return false;
}

export type { ShareCardData };
