import { createWorker } from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  plateNumber: string | null;
}

export async function extractPlateFromImage(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });

  try {
    const { data } = await worker.recognize(imageFile);

    const cleanedText = data.text
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .trim();

    const platePattern = /[A-Z0-9]{5,8}/g;
    const matches = cleanedText.match(platePattern);
    const plateNumber = matches && matches.length > 0 ? matches[0] : null;

    return {
      text: data.text,
      confidence: data.confidence,
      plateNumber
    };
  } finally {
    await worker.terminate();
  }
}

export function isValidPlateNumber(plate: string): boolean {
  const plateRegex = /^[A-Z0-9]{5,8}$/;
  return plateRegex.test(plate.toUpperCase());
}

export function formatPlateNumber(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
