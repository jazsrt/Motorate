import { supabase } from './supabase';

export async function seedTestPost(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: userId,
        post_type: 'photo',
        image_url: 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800',
        caption: 'First real database post! 🚗',
        privacy_level: 'public',
        moderation_status: 'approved',
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('Error seeding test post:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create post',
    };
  }
}
