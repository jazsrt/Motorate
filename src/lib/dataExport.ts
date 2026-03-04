import { supabase } from './supabase';

/**
 * Request user data export for GDPR compliance
 */
export async function requestDataExport(): Promise<Blob> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('export-user-data', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw error;

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });

  return blob;
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Request and download user data export
 */
export async function downloadDataExport(): Promise<void> {
  const blob = await requestDataExport();
  const timestamp = new Date().toISOString().split('T')[0];
  downloadBlob(blob, `motorate-data-export-${timestamp}.json`);
}
