import { supabase } from './supabase';
import { optimizeImage } from './imageOptimization';

export async function uploadImage(
  file: File | string,
  folder: 'profiles' | 'vehicles' | 'posts' | 'reviews'
): Promise<string> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // Optimize image before upload
  let fileToOptimize: File;
  if (typeof file === 'string') {
    const blob = await fetch(file).then((res) => res.blob());
    const extension = getImageExtension(file);
    fileToOptimize = new File([blob], `image.${extension}`, { type: blob.type });
  } else {
    fileToOptimize = file;
  }

  const optimized = await optimizeImage(fileToOptimize);

  // Use optimized file for upload
  const fileExt = optimized.name.split('.').pop() || 'jpg';
  const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;
  const fileToUpload = optimized;

  const { data, error } = await supabase.storage
    .from('motorate-images')
    .upload(fileName, fileToUpload, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('motorate-images').getPublicUrl(data.path);

  return publicUrl;
}

export async function deleteImage(url: string): Promise<void> {
  const path = url.split('/storage/v1/object/public/motorate-images/')[1];
  if (!path) throw new Error('Invalid image URL');

  const { error } = await supabase.storage.from('motorate-images').remove([path]);

  if (error) throw error;
}

function getImageExtension(dataURL: string): string {
  const match = dataURL.match(/data:image\/(.*?);/);
  return match ? match[1] : 'jpg';
}

export async function compressImage(
  file: File | string,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof file === 'string') {
      img.src = file;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });
}

export async function uploadFile(
  file: File,
  bucket: string,
  path: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${path}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const {
      data: { publicUrl }
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file'
    };
  }
}

export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file'
    };
  }
}

export async function getFileUrl(bucket: string, path: string): Promise<string | null> {
  try {
    const {
      data: { publicUrl }
    } = supabase.storage.from(bucket).getPublicUrl(path);

    return publicUrl;
  } catch (error) {
    console.error('Error getting file URL:', error);
    return null;
  }
}

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

export const ALLOWED_DOCUMENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  ...ALLOWED_IMAGE_TYPES
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateFile(
  file: File,
  allowedTypes: string[],
  maxSize: number = MAX_FILE_SIZE
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${(maxSize / 1024 / 1024).toFixed(0)}MB`
    };
  }

  return { valid: true };
}
