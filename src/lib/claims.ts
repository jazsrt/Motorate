import { supabase } from './supabase';
import { uploadFile } from './storage';

export interface VerificationClaim {
  id: string;
  vehicle_id: string;
  user_id: string;
  document_urls: string[];
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimWithDetails extends VerificationClaim {
  vehicle?: {
    id: string;
    year: number;
    make: string;
    model: string;
    plate_hash: string;
    color: string | null;
    stock_image_url: string | null;
  };
  user?: {
    id: string;
    handle: string;
    avatar_url: string | null;
    location: string | null;
  };
  reviewer?: {
    id: string;
    handle: string;
  };
}

export interface ClaimDocuments {
  registration: File | null;
  insurance: File | null;
  photo: File | null;
  selfie: File | null;
}

export interface LegacyClaimDocuments {
  files: File[];
  notes?: string;
}

export interface CanClaimResult {
  canClaim: boolean;
  reason?: string;
}

export async function canClaimVehicle(
  vehicleId: string,
  userId: string
): Promise<CanClaimResult> {
  try {
    const { data, error } = await supabase.rpc('can_claim_vehicle', {
      p_vehicle_id: vehicleId,
      p_user_id: userId
    });

    if (error) throw error;

    if (typeof data === 'object' && data !== null) {
      return {
        canClaim: data.success === true,
        reason: data.error || undefined
      };
    }

    return {
      canClaim: false,
      reason: 'Invalid response from server'
    };
  } catch (error) {
    console.error('Error checking claim eligibility:', error);
    return {
      canClaim: false,
      reason: 'Failed to check claim eligibility'
    };
  }
}

export async function submitVehicleClaim(
  vehicleId: string,
  userId: string,
  documents: ClaimDocuments
): Promise<{ success: boolean; claimId?: string; error?: string }> {
  try {
    const canClaim = await canClaimVehicle(vehicleId, userId);
    if (!canClaim.canClaim) {
      return {
        success: false,
        error: canClaim.reason || 'Cannot claim this vehicle'
      };
    }

    const uploadedUrls: string[] = [];
    const documentTypes: string[] = [];

    // Upload and track each document type
    const docEntries: Array<[keyof ClaimDocuments, File | null]> = [
      ['registration', documents.registration],
      ['insurance', documents.insurance],
      ['photo', documents.photo],
      ['selfie', documents.selfie]
    ];

    for (const [docType, file] of docEntries) {
      if (file) {
        const result = await uploadFile(
          file,
          'verification-docs',
          `${userId}/${vehicleId}/${docType}_${Date.now()}`
        );
        if (!result.success) {
          return { success: false, error: `Failed to upload ${docType}` };
        }
        uploadedUrls.push(result.url!);
        documentTypes.push(docType);
      }
    }

    if (uploadedUrls.length === 0) {
      return {
        success: false,
        error: 'At least one document is required'
      };
    }

    const { data, error } = await supabase
      .from('verification_claims')
      .insert({
        vehicle_id: vehicleId,
        user_id: userId,
        document_urls: uploadedUrls,
        document_types: documentTypes,
        notes: null,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      success: true,
      claimId: data.id
    };
  } catch (error) {
    console.error('Error submitting claim:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit claim'
    };
  }
}

export async function getUserClaims(userId: string): Promise<VerificationClaim[]> {
  try {
    const { data, error } = await supabase
      .from('verification_claims')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching user claims:', error);
    return [];
  }
}

export async function getClaimById(claimId: string): Promise<ClaimWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from('verification_claims')
      .select(`
        *,
        vehicle:vehicles (
          id,
          year,
          make,
          model,
          plate_hash,
          color,
          stock_image_url
        ),
        user:profiles!verification_claims_user_id_fkey (
          id,
          handle,
          avatar_url,
          location
        ),
        reviewer:profiles!verification_claims_reviewed_by_fkey (
          id,
          handle
        )
      `)
      .eq('id', claimId)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching claim:', error);
    return null;
  }
}

export async function getVehicleClaims(vehicleId: string): Promise<VerificationClaim[]> {
  try {
    const { data, error } = await supabase
      .from('verification_claims')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching vehicle claims:', error);
    return [];
  }
}

export async function getPendingClaims(): Promise<ClaimWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('verification_claims')
      .select(`
        *,
        vehicle:vehicles (
          id,
          year,
          make,
          model,
          plate_hash,
          color,
          stock_image_url
        ),
        user:profiles!verification_claims_user_id_fkey (
          id,
          handle,
          avatar_url,
          location
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching pending claims:', error);
    return [];
  }
}

export async function approveClaim(
  claimId: string,
  adminId: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('approve_claim', {
      p_claim_id: claimId,
      p_admin_id: adminId,
      p_admin_notes: adminNotes || null
    });

    if (error) throw error;

    if (typeof data === 'object' && data !== null) {
      return {
        success: data.success === true,
        error: data.error || undefined
      };
    }

    return {
      success: false,
      error: 'Invalid response from server'
    };
  } catch (error) {
    console.error('Error approving claim:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve claim'
    };
  }
}

export async function rejectClaim(
  claimId: string,
  adminId: string,
  adminNotes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('reject_claim', {
      p_claim_id: claimId,
      p_admin_id: adminId,
      p_admin_notes: adminNotes
    });

    if (error) throw error;

    if (typeof data === 'object' && data !== null) {
      return {
        success: data.success === true,
        error: data.error || undefined
      };
    }

    return {
      success: false,
      error: 'Invalid response from server'
    };
  } catch (error) {
    console.error('Error rejecting claim:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject claim'
    };
  }
}

export async function getClaimStats(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}> {
  try {
    const { data, error } = await supabase
      .from('verification_claims')
      .select('status');

    if (error) throw error;

    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: data?.length || 0
    };

    data?.forEach((claim) => {
      if (claim.status === 'pending') stats.pending++;
      else if (claim.status === 'approved') stats.approved++;
      else if (claim.status === 'rejected') stats.rejected++;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching claim stats:', error);
    return {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };
  }
}

export async function getClaimStatus(
  vehicleId: string,
  userId: string
): Promise<{
  hasClaim: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  claimId?: string;
  reviewedAt?: string;
  adminNotes?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('verification_claims')
      .select('id, status, reviewed_at, admin_notes')
      .eq('vehicle_id', vehicleId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { hasClaim: false };
    }

    return {
      hasClaim: true,
      status: data.status,
      claimId: data.id,
      reviewedAt: data.reviewed_at,
      adminNotes: data.admin_notes
    };
  } catch (error) {
    console.error('Error fetching claim status:', error);
    return { hasClaim: false };
  }
}

export async function cancelClaim(claimId: string, userId: string): Promise<boolean> {
  try {
    const { data: claim, error: fetchError } = await supabase
      .from('verification_claims')
      .select('user_id, status')
      .eq('id', claimId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!claim) {
      throw new Error('Claim not found');
    }

    if (claim.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    if (claim.status !== 'pending') {
      throw new Error('Can only cancel pending claims');
    }

    const { error: deleteError } = await supabase
      .from('verification_claims')
      .delete()
      .eq('id', claimId);

    if (deleteError) throw deleteError;

    return true;
  } catch (error) {
    console.error('Error canceling claim:', error);
    return false;
  }
}

export function getClaimDocumentUrl(url: string | null): string | null {
  if (!url) return null;

  if (url.startsWith('http')) {
    return url;
  }

  const { data } = supabase.storage
    .from('verification-docs')
    .getPublicUrl(url);

  return data.publicUrl;
}

export async function getRecentApprovedClaims(limit: number = 10): Promise<ClaimWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('verification_claims')
      .select(`
        *,
        vehicle:vehicles (
          id,
          year,
          make,
          model,
          plate_hash,
          color,
          stock_image_url
        ),
        user:profiles!verification_claims_user_id_fkey (
          id,
          handle,
          avatar_url,
          location
        ),
        reviewer:profiles!verification_claims_reviewed_by_fkey (
          id,
          handle
        )
      `)
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching recent approved claims:', error);
    return [];
  }
}

export interface ClaimedVehicle {
  vehicle_id: string;
  plate_hash: string;
  plate_state: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  owner_id: string | null;
  owner_handle: string | null;
  owner_avatar_url: string | null;
  is_verified: boolean;
  claimed_at: string | null;
}

export interface SearchedUser {
  user_id: string;
  handle: string;
  email: string | null;
  avatar_url: string | null;
  role: string;
  vehicle_count: number;
}

export async function adminInstantClaim(
  vehicleId: string,
  targetUserId: string,
  adminId: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_instant_claim', {
      p_vehicle_id: vehicleId,
      p_target_user_id: targetUserId,
      p_admin_id: adminId,
      p_admin_notes: adminNotes || null
    });

    if (error) throw error;

    return {
      success: data.success,
      error: data.error,
      message: data.message
    };
  } catch (error) {
    console.error('Error with admin instant claim:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process instant claim'
    };
  }
}

export async function adminTransferVehicle(
  vehicleId: string,
  newOwnerId: string,
  adminId: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string; message?: string; oldOwnerId?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_transfer_vehicle', {
      p_vehicle_id: vehicleId,
      p_new_owner_id: newOwnerId,
      p_admin_id: adminId,
      p_admin_notes: adminNotes || null
    });

    if (error) throw error;

    return {
      success: data.success,
      error: data.error,
      message: data.message,
      oldOwnerId: data.old_owner_id
    };
  } catch (error) {
    console.error('Error transferring vehicle:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transfer vehicle'
    };
  }
}

export async function adminRevokeClaim(
  vehicleId: string,
  adminId: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_revoke_claim', {
      p_vehicle_id: vehicleId,
      p_admin_id: adminId,
      p_admin_notes: adminNotes || null
    });

    if (error) throw error;

    return {
      success: data.success,
      error: data.error,
      message: data.message
    };
  } catch (error) {
    console.error('Error revoking claim:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke claim'
    };
  }
}

export async function adminDeleteVehicle(
  vehicleId: string,
  adminId: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_delete_vehicle', {
      p_vehicle_id: vehicleId,
      p_admin_id: adminId,
      p_admin_notes: adminNotes || null
    });

    if (error) throw error;

    return {
      success: data.success,
      error: data.error,
      message: data.message
    };
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete vehicle'
    };
  }
}

export async function adminGetClaimedVehicles(
  adminId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ClaimedVehicle[]> {
  try {
    const { data, error } = await supabase.rpc('admin_get_claimed_vehicles', {
      p_admin_id: adminId,
      p_limit: limit,
      p_offset: offset
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching claimed vehicles:', error);
    return [];
  }
}

export async function adminSearchVehicles(
  adminId: string,
  searchTerm: string,
  limit: number = 20
): Promise<ClaimedVehicle[]> {
  try {
    const { data, error } = await supabase.rpc('admin_search_vehicles', {
      p_admin_id: adminId,
      p_search_term: searchTerm,
      p_limit: limit
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error searching vehicles:', error);
    return [];
  }
}

export async function adminSearchUsers(
  adminId: string,
  searchTerm: string,
  limit: number = 20
): Promise<SearchedUser[]> {
  try {
    const { data, error } = await supabase.rpc('admin_search_users', {
      p_admin_id: adminId,
      p_search_term: searchTerm,
      p_limit: limit
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}
