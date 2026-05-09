import { supabase } from './supabase';

export type ModerationSurface = 'comment' | 'message' | 'post';

export interface TextModerationResult {
  allowed: boolean;
  reason?: string;
}

function rejectionMessage(surface: ModerationSurface, reason?: string): string {
  if (reason === 'inappropriate') {
    return surface === 'message'
      ? 'Message blocked: content does not meet community guidelines.'
      : 'Comment blocked: content does not meet community guidelines.';
  }

  return surface === 'message'
    ? 'Message blocked by moderation.'
    : 'Comment blocked by moderation.';
}

export async function moderateTextContent(
  text: string,
  surface: ModerationSurface
): Promise<TextModerationResult> {
  const trimmed = text.trim();
  if (!trimmed) return { allowed: true };

  try {
    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: {
        contentType: surface,
        textContent: trimmed,
      },
    });

    if (error) {
      console.error('[contentModeration] moderation function failed:', error);
      return { allowed: true };
    }

    if (data?.decision === 'rejected') {
      return {
        allowed: false,
        reason: rejectionMessage(surface, data.reason),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[contentModeration] moderation failed:', error);
    return { allowed: true };
  }
}
