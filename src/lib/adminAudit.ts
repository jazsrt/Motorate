import { supabase } from './supabase';

interface AuditLogEntry {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAdminAction({
  action,
  targetType,
  targetId,
  metadata
}: AuditLogEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('Cannot log admin action: no authenticated user');
      return;
    }

    const { error } = await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
      user_agent: navigator.userAgent
    });

    if (error) {
      console.error('Failed to log admin action:', error);
    }
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

export async function getAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select(`
      *,
      admin:profiles!admin_id(handle, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }

  return data || [];
}

export async function getAuditLogsForTarget(targetType: string, targetId: string) {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select(`
      *,
      admin:profiles!admin_id(handle, avatar_url)
    `)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }

  return data || [];
}

export async function getAuditLogsForAdmin(adminId: string) {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select(`
      *,
      admin:profiles!admin_id(handle, avatar_url)
    `)
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }

  return data || [];
}
