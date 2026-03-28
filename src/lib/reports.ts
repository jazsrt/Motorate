import { supabase } from './supabase';

export type ReportContentType = 'post' | 'comment' | 'profile';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

export interface Report {
  id: string;
  reporter_id: string;
  content_type: ReportContentType;
  content_id: string;
  reason: string;
  status: ReportStatus;
  admin_notes?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export async function createReport(
  contentType: ReportContentType,
  contentId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        content_type: contentType,
        content_id: contentId,
        reason: reason,
        status: 'pending',
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'You have already reported this content' };
      }
      console.error('Error creating report:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating report:', error);
    return { success: false, error: 'Failed to create report' };
  }
}

export async function getUserReports(): Promise<Report[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user reports:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user reports:', error);
    return [];
  }
}

export async function getPendingReports(): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending reports:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching pending reports:', error);
    return [];
  }
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const updateData: Record<string, unknown> = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    };

    if (adminNotes) {
      updateData.admin_notes = adminNotes;
    }

    const { error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId);

    if (error) {
      console.error('Error updating report:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating report:', error);
    return { success: false, error: 'Failed to update report' };
  }
}

export async function hasReported(
  contentType: ReportContentType,
  contentId: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .maybeSingle();

    if (error) {
      console.error('Error checking report status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking report status:', error);
    return false;
  }
}
