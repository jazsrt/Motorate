export async function optimizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = (width * MAX_HEIGHT) / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        ctx!.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              reject(new Error('Optimization failed'));
            }
          },
          'image/jpeg',
          0.85
        );
      };
    };
  });
}

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'origin';
  resize?: 'cover' | 'contain' | 'fill';
}

export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: ImageOptimizationOptions = {}
): string {
  if (!url) return '';

  if (!url.includes('/storage/v1/object/public/')) {
    return url;
  }

  const params = new URLSearchParams();

  if (options.width) {
    params.append('width', options.width.toString());
  }

  if (options.height) {
    params.append('height', options.height.toString());
  }

  if (options.quality) {
    params.append('quality', Math.min(100, Math.max(1, options.quality)).toString());
  }

  if (options.format) {
    params.append('format', options.format);
  }

  if (options.resize) {
    params.append('resize', options.resize);
  }

  if (params.toString() === '') {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
}

export const ImagePresets = {
  feedThumbnail: { width: 600, quality: 85, format: 'webp' as const },
  feedFull: { width: 1920, quality: 95, format: 'webp' as const },
  avatar: { width: 200, height: 200, quality: 90, format: 'webp' as const, resize: 'cover' as const },
  vehicleDetail: { width: 1920, quality: 95, format: 'webp' as const },
  vehicleThumbnail: { width: 400, quality: 85, format: 'webp' as const },
  galleryThumbnail: { width: 300, height: 300, quality: 80, format: 'webp' as const, resize: 'cover' as const },
};

export function getOptimizedImage(
  url: string | null | undefined,
  preset: keyof typeof ImagePresets
): string {
  return getOptimizedImageUrl(url, ImagePresets[preset]);
}
