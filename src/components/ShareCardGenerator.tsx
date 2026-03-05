import { supabase } from '../lib/supabase';

export interface ShareCardData {
  type: 'vehicle' | 'spot' | 'badge' | 'profile';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  stats?: { label: string; value: string }[];
  userHandle: string;
  userRep: number;
  deepLinkUrl: string;
}

export async function shareToSocial(data: ShareCardData, userId?: string): Promise<boolean> {
  const shareUrl = data.deepLinkUrl;
  const shareTitle = `${data.title} on MotoRate`;

  let shareText = '';
  switch (data.type) {
    case 'vehicle':
      shareText = `Check out this ${data.title} -- spotted by @${data.userHandle} on MotoRate`;
      break;
    case 'spot':
      shareText = `Just spotted a ${data.title}! Rate it on MotoRate`;
      break;
    case 'badge':
      shareText = `Just earned "${data.title}" on MotoRate! ${data.subtitle || ''}`.trim();
      break;
    case 'profile':
      shareText = `${data.userRep.toLocaleString()} rep and climbing. Find me on MotoRate: @${data.userHandle}`;
      break;
  }

  let shared = false;
  let platform = 'clipboard';

  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });
      shared = true;
      platform = 'native_share';
    } catch {
      // User cancelled or error — fall back to clipboard
    }
  }

  if (!shared) {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      shared = true;
      platform = 'clipboard';
    } catch {
      return false;
    }
  }

  // Track share event (silently fails if table doesn't exist)
  if (shared && userId) {
    try {
      await supabase.from('share_events').insert({
        user_id: userId,
        content_type: data.type,
        share_url: shareUrl,
        platform,
      });
    } catch {
      // Table may not exist yet — that's fine
    }
  }

  return shared;
}
