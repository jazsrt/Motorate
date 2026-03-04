const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url?: string
): Promise<void> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          title,
          body,
          url: url || '/'
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to send push notification:', error);
    } else {
      const result = await response.json();
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}
