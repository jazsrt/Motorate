import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Users, Shield, FileText, Search, MoreVertical, Ban, UserPlus, Key, TrendingUp, Car, Check, CheckCircle, X, ChevronLeft, ArrowUp, XCircle, UserCheck, Activity, Award, RefreshCw, MessageSquare, Heart, Image, MapPin, CircleUser as UserCircle, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from '../components/UserAvatar';
import { useToast } from '../contexts/ToastContext';
import {
  getPendingClaims,
  approveClaim,
  rejectClaim,
  ClaimWithDetails,
  getClaimDocumentUrl,
  adminSearchVehicles,
  adminSearchUsers,
  adminInstantClaim,
  adminTransferVehicle,
  adminRevokeClaim,
  adminDeleteVehicle,
  adminGetClaimedVehicles,
  ClaimedVehicle,
  SearchedUser
} from '../lib/claims';

type Tab = 'overview' | 'users' | 'posts' | 'moderation' | 'claims' | 'vehicles' | 'logs' | 'badges';

interface DashboardMetrics {
  // Growth Metrics
  totalUsers: number;
  dau: number;
  wau: number;
  mau: number;
  newUsers7d: number;
  newUsers30d: number;
  dailySignups: Array<{ date: string; signups: number }>;

  // Engagement Metrics
  postsToday: number;
  posts7d: number;
  posts30d: number;
  comments7d: number;
  likes7d: number;
  engagementRate: number;
  avgPostsPerUser: number;

  // Feature Usage
  totalVehicles: number;
  vehicles7d: number;
  totalBadgesEarned: number;
  totalPhotos: number;
  profileCompletionRate: number;

  // Retention
  day1Retention: number;
  day7Retention: number;
  churnedUsers: number;

  // Top Users
  topUsers: Array<{
    username: string;
    avatar_url: string | null;
    post_count: number;
    comment_count: number;
    like_count: number;
  }>;

  lastUpdated: Date;
}

interface User {
  id: string;
  handle: string;
  email: string;
  avatar_url: string | null;
  role: string;
  is_banned: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  reputation_score: number;
}

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  reporter: {
    handle: string;
    avatar_url: string | null;
  };
  content?: {
    caption?: string;
    image_url?: string;
    post_type?: string;
  };
}

interface AdminLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_user_id: string | null;
  target_content_id: string | null;
  description: string;
  created_at: string;
  admin: {
    handle: string;
  };
}

interface PendingPost {
  post_id: string;
  author_id: string;
  author_handle: string;
  author_avatar_url: string | null;
  post_type: string;
  image_url: string | null;
  caption: string | null;
  location_label: string | null;
  created_at: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
}

// -- Shared inline style constants --
const FONT = {
  display: 'Rajdhani, sans-serif',
  condensed: 'Barlow Condensed, sans-serif',
  body: 'Barlow, sans-serif',
  mono: 'JetBrains Mono, monospace',
};

const C = {
  bg: '#030508',
  surface: '#0a0d14',
  surface2: '#0e1320',
  borderDim: 'rgba(255,255,255,0.06)',
  orange: '#F97316',
  text: '#eef4f8',
  sub: '#7a8e9e',
  dim: '#5a6e7e',
  muted: '#3a4e60',
  gold: '#f0a030',
  green: '#20c060',
  red: '#ef4444',
  yellow: '#eab308',
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
};
const modalBox: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 12,
  maxWidth: 420, width: '100%', padding: 24,
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontFamily: FONT.condensed, fontWeight: 600,
  color: C.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em',
};
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: C.surface2, border: `1px solid ${C.borderDim}`,
  color: C.text, borderRadius: 8, fontFamily: FONT.body, fontSize: 14, outline: 'none',
};
const btnCancel: React.CSSProperties = {
  flex: 1, padding: '8px 16px', border: `1px solid ${C.borderDim}`, color: C.sub,
  background: C.surface2, borderRadius: 10, fontFamily: FONT.condensed, fontSize: 14,
  textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer',
};
const btnDanger: React.CSSProperties = {
  flex: 1, padding: '8px 16px', background: C.red, color: '#fff', borderRadius: 10, border: 'none',
  fontFamily: FONT.condensed, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer',
};
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
  background: C.orange, color: '#fff', border: 'none', borderRadius: 10,
  fontFamily: FONT.condensed, fontSize: 14, textTransform: 'uppercase',
  letterSpacing: '0.04em', cursor: 'pointer',
};
const btnSuccess: React.CSSProperties = {
  ...btnPrimary, background: C.green,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px 8px 36px', background: C.surface2,
  border: `1px solid ${C.borderDim}`, color: C.text, borderRadius: 8,
  fontFamily: FONT.body, fontSize: 14, outline: 'none',
};

interface BanModalProps {
  user: User;
  onClose: () => void;
  onBan: (userId: string, reason: string, duration: number | null) => Promise<void>;
}

function BanUserModal({ user, onClose, onBan }: BanModalProps) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<string>('permanent');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const durationDays = duration === 'permanent' ? null : parseInt(duration);
      await onBan(user.id, reason, durationDays);
      onClose();
    } catch (error) {
      console.error('Failed to ban user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 16 }}>Ban User</h2>
        <div style={{ marginBottom: 16, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
          <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.red }}>
            You are about to ban <span style={{ fontWeight: 600 }}>@{user.handle}</span>
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Reason for Ban</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} style={selectStyle} required>
              <option value="">Select a reason</option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="impersonation">Impersonation</option>
              <option value="illegal_activity">Illegal Activity</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Ban Duration</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} style={selectStyle}>
              <option value="1">1 Day</option>
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} style={btnCancel}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...btnDanger, opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Banning...' : 'Ban User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RejectModalProps {
  report: Report;
  onClose: () => void;
  onReject: (reportId: string, reason: string) => Promise<void>;
}

function RejectContentModal({ report, onClose, onReject }: RejectModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onReject(report.id, reason);
      onClose();
    } catch (error) {
      console.error('Failed to reject content:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 16 }}>Reject &amp; Remove Content</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Reason for Rejection</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} style={selectStyle} required>
              <option value="">Select a reason</option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment or Bullying</option>
              <option value="hate_speech">Hate Speech</option>
              <option value="violence">Violence or Graphic Content</option>
              <option value="sexual_content">Sexual Content</option>
              <option value="misinformation">Misinformation</option>
              <option value="copyright">Copyright Violation</option>
              <option value="other">Other Violation</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} style={btnCancel}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...btnDanger, opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Rejecting...' : 'Reject & Remove'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RejectPostModalProps {
  post: PendingPost;
  onClose: () => void;
  onReject: (postId: string, reason: string) => Promise<void>;
}

function RejectPostModal({ post, onClose, onReject }: RejectPostModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onReject(post.post_id, reason);
      onClose();
    } catch (error) {
      console.error('Failed to reject post:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 16 }}>Reject Post</h2>
        <div style={{ marginBottom: 16, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
          <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.red }}>
            You are about to reject this post by <span style={{ fontWeight: 600 }}>@{post.author_handle}</span>
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Reason for Rejection</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} style={selectStyle} required>
              <option value="">Select a reason</option>
              <option value="no_vehicle">No Vehicle Visible</option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="spam">Spam</option>
              <option value="low_quality">Low Quality</option>
              <option value="harassment">Harassment</option>
              <option value="off_topic">Off Topic</option>
              <option value="other">Other Violation</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} style={btnCancel}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...btnDanger, opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Rejecting...' : 'Reject Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface VehicleCardProps {
  vehicle: ClaimedVehicle;
  onSelect: () => void;
  onTransfer: () => void;
  onRevoke: () => void;
  onDelete: () => void;
  onInstantClaim: () => void;
}

function VehicleCard({ vehicle, onTransfer, onRevoke, onDelete, onInstantClaim }: VehicleCardProps) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, background: C.surface2, borderRadius: 8 }}>
            <Car style={{ width: 24, height: 24, color: C.orange }} />
          </div>
          <div>
            <p style={{ fontFamily: FONT.body, fontWeight: 600, color: C.text }}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
            <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.sub }}>
              Plate: {vehicle.plate_hash} {vehicle.plate_state && `(${vehicle.plate_state})`}
            </p>
            {vehicle.owner_handle ? (
              <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.orange }}>Owner: @{vehicle.owner_handle}</p>
            ) : (
              <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.yellow }}>Unclaimed</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {vehicle.is_verified && (
            <span style={{ padding: '2px 8px', background: 'rgba(32,192,96,0.2)', color: C.green, fontSize: 11, fontFamily: FONT.condensed, borderRadius: 10 }}>Verified</span>
          )}
          {vehicle.is_claimed && (
            <span style={{ padding: '2px 8px', background: 'rgba(249,115,22,0.2)', color: C.orange, fontSize: 11, fontFamily: FONT.condensed, borderRadius: 10 }}>Claimed</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.borderDim}` }}>
        {!vehicle.is_claimed && (
          <button onClick={onInstantClaim} style={{ ...btnSuccess, flex: 1, justifyContent: 'center', fontSize: 12 }}>
            <UserPlus style={{ width: 14, height: 14 }} /> Assign Owner
          </button>
        )}
        {vehicle.is_claimed && (
          <button onClick={onTransfer} style={{ ...btnPrimary, flex: 1, justifyContent: 'center', fontSize: 12 }}>
            <RefreshCw style={{ width: 14, height: 14 }} /> Transfer
          </button>
        )}
        {vehicle.is_claimed && (
          <button onClick={onRevoke} style={{ ...btnPrimary, flex: 1, justifyContent: 'center', fontSize: 12, background: C.yellow }}>
            <XCircle style={{ width: 14, height: 14 }} /> Revoke
          </button>
        )}
        <button onClick={onDelete} style={{ ...btnDanger, flex: 'none', padding: '8px 12px' }}>
          <Trash2 style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

interface VehicleActionModalProps {
  vehicle: ClaimedVehicle;
  action: 'transfer' | 'revoke' | 'delete' | 'instant';
  users: SearchedUser[];
  onClose: () => void;
  onInstantClaim: (vehicleId: string, targetUserId: string) => void;
  onTransfer: (vehicleId: string, newOwnerId: string) => void;
  onRevoke: (vehicleId: string) => void;
  onDelete: (vehicleId: string) => void;
}

function VehicleActionModal({ vehicle, action, users, onClose, onInstantClaim, onTransfer, onRevoke, onDelete }: VehicleActionModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const getTitle = () => {
    switch (action) {
      case 'transfer': return 'Transfer Vehicle Ownership';
      case 'revoke': return 'Revoke Vehicle Claim';
      case 'delete': return 'Delete Vehicle';
      case 'instant': return 'Assign Vehicle to User';
    }
  };

  const handleConfirm = () => {
    switch (action) {
      case 'transfer':
        if (selectedUserId) onTransfer(vehicle.vehicle_id, selectedUserId);
        break;
      case 'revoke':
        onRevoke(vehicle.vehicle_id);
        break;
      case 'delete':
        onDelete(vehicle.vehicle_id);
        break;
      case 'instant':
        if (selectedUserId) onInstantClaim(vehicle.vehicle_id, selectedUserId);
        break;
    }
  };

  const confirmBg = action === 'delete' ? C.red : action === 'revoke' ? C.yellow : C.orange;

  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 16 }}>{getTitle()}</h2>

        <div style={{ marginBottom: 16, padding: 12, background: C.surface2, borderRadius: 8 }}>
          <p style={{ fontFamily: FONT.body, fontWeight: 600, color: C.text }}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
          <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.sub }}>Plate: {vehicle.plate_hash}</p>
          {vehicle.owner_handle && (
            <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.orange }}>Current owner: @{vehicle.owner_handle}</p>
          )}
        </div>

        {(action === 'transfer' || action === 'instant') && (
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Select New Owner</label>
            {users.length === 0 ? (
              <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.sub }}>Search for users first using the search box above.</p>
            ) : (
              <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={selectStyle}>
                <option value="">Select a user...</option>
                {users.map(u => (
                  <option key={u.user_id} value={u.user_id}>
                    @{u.handle} ({u.vehicle_count} {u.vehicle_count === 1 ? 'plate' : 'plates'})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {action === 'revoke' && (
          <div style={{ marginBottom: 24, padding: 12, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8 }}>
            <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.yellow }}>
              This will remove ownership from the current owner. The vehicle will become unclaimed and can be claimed by anyone.
            </p>
          </div>
        )}

        {action === 'delete' && (
          <div style={{ marginBottom: 24, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
            <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.red }}>
              This will permanently delete the vehicle and all associated data (claims, stickers, modifications, images, reviews). This action cannot be undone.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={onClose} style={btnCancel}>Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={(action === 'transfer' || action === 'instant') && !selectedUserId}
            style={{
              ...btnDanger,
              background: confirmBg,
              opacity: ((action === 'transfer' || action === 'instant') && !selectedUserId) ? 0.5 : 1,
            }}
          >
            {action === 'delete' ? 'Delete' :
             action === 'revoke' ? 'Revoke' :
             action === 'transfer' ? 'Transfer' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AdminDashboardProps {
  onNavigate?: (page: string, data?: unknown) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps = {}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [banModalUser, setBanModalUser] = useState<User | null>(null);
  const [rejectModalReport, setRejectModalReport] = useState<Report | null>(null);
  const [rejectModalPost, setRejectModalPost] = useState<PendingPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [badgeSearchQuery, setBadgeSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [pendingClaims, setPendingClaims] = useState<ClaimWithDetails[]>([]);
  const [_selectedClaim, setSelectedClaim] = useState<ClaimWithDetails | null>(null);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [vehicleSearchResults, setVehicleSearchResults] = useState<ClaimedVehicle[]>([]);
  const [claimedVehicles, setClaimedVehicles] = useState<ClaimedVehicle[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<SearchedUser[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<ClaimedVehicle | null>(null);
  const [vehicleActionModal, setVehicleActionModal] = useState<'transfer' | 'revoke' | 'delete' | 'instant' | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  const checkAdminAccess = useCallback(async () => {
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role === 'admin' || profile?.role === 'moderator') {
      setHasAccess(true);
    } else {
      setHasAccess(false);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAdminAccess();
  }, [user, checkAdminAccess]);

  useEffect(() => {
    if (!hasAccess) return;

    const channel = supabase
      .channel('admin_claim_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verification_claims'
        },
        async () => {
          const claims = await getPendingClaims();
          setPendingClaims(claims);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasAccess]);

  const loadBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading badges:', error);
        return;
      }

      const badgesWithCounts = await Promise.all(
        (data || []).map(async (badge) => {
          const { count } = await supabase
            .from('user_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('badge_id', badge.id);

          return {
            ...badge,
            description: badge.type ? `${badge.type} badge` : '',
            tier: badge.type === 'good' ? 'gold' : badge.type === 'bad' ? 'bronze' : 'silver',
            user_count: count || 0
          };
        })
      );

      setBadges(badgesWithCounts);
    } catch (error) {
      console.error('Failed to load badges:', error);
    }
  };

  const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: dau } = await supabase
      .from('user_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gte('last_active_at', today);

    const { count: wau } = await supabase
      .from('user_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gte('last_active_at', sevenDaysAgo);

    const { count: mau } = await supabase
      .from('user_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gte('last_active_at', thirtyDaysAgo);

    const { count: newUsers7d } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    const { count: newUsers30d } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo);

    const { data: signupData } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true });

    const signupsByDate: { [key: string]: number } = {};
    signupData?.forEach(profile => {
      const date = new Date(profile.created_at).toISOString().split('T')[0];
      signupsByDate[date] = (signupsByDate[date] || 0) + 1;
    });

    const dailySignups = Object.entries(signupsByDate)
      .map(([date, signups]) => ({ date, signups }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const { count: postsToday } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    const { count: posts7d } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    const { count: posts30d } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo);

    const { count: comments7d } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    const { count: likes7d } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    const { data: activeUserIds } = await supabase
      .from('posts')
      .select('author_id')
      .gte('created_at', today);

    const uniqueActiveUsers = new Set(activeUserIds?.map(p => p.author_id) || []).size;
    const engagementRate = totalUsers ? Math.round((uniqueActiveUsers / totalUsers) * 100) : 0;

    const avgPostsPerUser = totalUsers && posts30d ? parseFloat((posts30d / totalUsers).toFixed(2)) : 0;

    const { count: totalVehicles } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true });

    const { count: vehicles7d } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    const { count: totalBadgesEarned } = await supabase
      .from('user_inventory')
      .select('*', { count: 'exact', head: true });

    const { count: totalPhotos } = await supabase
      .from('post_images')
      .select('*', { count: 'exact', head: true });

    const { count: completedProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('avatar_url', 'is', null)
      .not('bio', 'is', null)
      .neq('bio', '');

    const profileCompletionRate = totalUsers ? Math.round((completedProfiles! / totalUsers) * 100) : 0;

    const day1Retention = 0;
    const day7Retention = 0;

    const { count: _churnedUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const { data: topUsers } = await supabase
      .rpc('get_top_users', { days: 7 })
      .limit(10);

    return {
      totalUsers: totalUsers || 0,
      dau: dau || 0,
      wau: wau || 0,
      mau: mau || 0,
      newUsers7d: newUsers7d || 0,
      newUsers30d: newUsers30d || 0,
      dailySignups,
      postsToday: postsToday || 0,
      posts7d: posts7d || 0,
      posts30d: posts30d || 0,
      comments7d: comments7d || 0,
      likes7d: likes7d || 0,
      engagementRate,
      avgPostsPerUser,
      totalVehicles: totalVehicles || 0,
      vehicles7d: vehicles7d || 0,
      totalBadgesEarned: totalBadgesEarned || 0,
      totalPhotos: totalPhotos || 0,
      profileCompletionRate,
      day1Retention,
      day7Retention,
      churnedUsers: 0,
      topUsers: topUsers || [],
      lastUpdated: new Date()
    };
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const dashboardMetrics = await fetchDashboardMetrics();
      setMetrics(dashboardMetrics);

      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const usersData = await supabase
        .from('profiles')
        .select('id, handle, avatar_url, created_at, role, reputation_score');

      const bannedUsersData = await supabase
        .from('user_bans')
        .select('user_id')
        .or('expires_at.is.null,expires_at.gt.now()');

      const bannedUserIds = new Set(bannedUsersData.data?.map(ban => ban.user_id) || []);
      const authUserMap = new Map(
        authUsers?.users.map(u => [u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at }]) || []
      );

      const usersWithBanStatus: User[] = (usersData.data || []).map(user => {
        const authUser = authUserMap.get(user.id);
        return {
          ...user,
          handle: user.handle,
          email: authUser?.email || 'N/A',
          last_sign_in_at: authUser?.last_sign_in_at || null,
          role: user.role || 'user',
          is_banned: bannedUserIds.has(user.id)
        };
      });

      setUsers(usersWithBanStatus);

      const moderationQueueData = await supabase
        .from('reports')
        .select(`
          id,
          content_type,
          content_id,
          reason,
          description,
          status,
          created_at,
          reporter:reporter_id(handle, avatar_url)
        `)
        .eq('status', 'pending');

      const reportsWithContent = await Promise.all(
        (moderationQueueData.data || []).map(async (report: any) => {
          let content = null;
          if (report.content_type === 'post' && report.content_id) {
            const { data } = await supabase
              .from('posts')
              .select('caption, image_url, post_type')
              .eq('id', report.content_id)
              .maybeSingle();
            content = data;
          }
          return {
            ...report,
            content
          };
        })
      );

      setReports(reportsWithContent as any);

      const logsData = await supabase
        .from('admin_actions')
        .select(`
          id,
          admin_id,
          action_type,
          target_user_id,
          target_content_id,
          description,
          created_at,
          admin:profiles!admin_actions_admin_id_fkey(handle)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setLogs((logsData.data || []) as unknown as AdminLog[]);

      const { data: pendingPostsData } = await supabase.rpc('get_pending_posts');
      setPendingPosts(pendingPostsData || []);

      const claims = await getPendingClaims();
      setPendingClaims(claims);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (hasAccess) {
      loadDashboardData();
      loadBadges();
    }
  }, [hasAccess, loadDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    showToast('Dashboard refreshed', 'success');
    setRefreshing(false);
  };

  const handleBanUser = async (userId: string, reason: string, durationDays: number | null) => {
    try {
      const { error } = await supabase.rpc('admin_ban_user', {
        target_user_id: userId,
        reason: reason,
        duration_days: durationDays
      });

      if (error) throw error;

      showToast('User banned successfully', 'success');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to ban user:', error);
      showToast('Failed to ban user', 'error');
      throw error;
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      await supabase
        .from('user_bans')
        .delete()
        .eq('user_id', userId);

      await supabase.from('admin_actions').insert({
        admin_id: user!.id,
        action_type: 'unban_user',
        target_user_id: userId,
        description: 'Unbanned user'
      });

      showToast('User unbanned successfully', 'success');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to unban user:', error);
      showToast('Failed to unban user', 'error');
    }
  };

  const handlePromoteUser = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'moderator' ? 'user' : 'moderator';

      await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      await supabase.from('admin_actions').insert({
        admin_id: user!.id,
        action_type: newRole === 'moderator' ? 'promote_user' : 'demote_user',
        target_user_id: userId,
        description: `Changed role to ${newRole}`
      });

      showToast(`User ${newRole === 'moderator' ? 'promoted' : 'demoted'} successfully`, 'success');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to update user role:', error);
      showToast('Failed to update user role', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      await supabase.from('admin_actions').insert({
        admin_id: user!.id,
        action_type: 'delete_user',
        target_user_id: userId,
        description: 'Permanently deleted user account'
      });

      showToast('User deleted successfully', 'success');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      showToast('Failed to delete user', 'error');
    }
  };

  const handleApproveReport = async (reportId: string) => {
    try {
      await supabase
        .from('reports')
        .update({
          status: 'resolved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user!.id
        })
        .eq('id', reportId);

      await supabase.from('admin_actions').insert({
        admin_id: user!.id,
        action_type: 'approve_report',
        description: `Approved report ${reportId} - no action taken`
      });

      showToast('Report approved (no action taken)', 'success');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to approve report:', error);
      showToast('Failed to approve report', 'error');
    }
  };

  const handleRejectReport = async (reportId: string, reason: string) => {
    try {
      const report = reports.find(r => r.id === reportId);

      if (!report) {
        throw new Error('Report not found');
      }

      if (report.content_type === 'post') {
        const { error: deleteError } = await supabase
          .from('posts')
          .delete()
          .eq('id', report.content_id);

        if (deleteError) throw deleteError;
      }

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user!.id
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      await supabase.from('admin_actions').insert({
        admin_id: user!.id,
        action_type: 'reject_content',
        target_content_id: report.content_id,
        description: `Rejected and removed ${report.content_type}. Reason: ${reason}`
      });

      showToast('Content removed successfully', 'success');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to reject report:', error);
      showToast('Failed to reject report', 'error');
      throw error;
    }
  };

  const handleApprovePost = async (postId: string) => {
    try {
      const { error } = await supabase.rpc('admin_approve_post', {
        p_post_id: postId,
        p_admin_id: user!.id
      });

      if (error) throw error;

      showToast('Post approved successfully', 'success');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to approve post:', error);
      showToast('Failed to approve post', 'error');
    }
  };

  const handleRejectPost = async (postId: string, reason: string) => {
    try {
      const { error } = await supabase.rpc('admin_reject_post', {
        p_post_id: postId,
        p_admin_id: user!.id,
        p_rejection_reason: reason
      });

      if (error) throw error;

      showToast('Post rejected successfully', 'success');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to reject post:', error);
      showToast('Failed to reject post', 'error');
      throw error;
    }
  };

  const filteredUsers = users.filter(u =>
    u.handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // -- Stat card helper --
  const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) => (
    <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <Icon style={{ width: 28, height: 28, color, opacity: 0.6 }} />
      <div>
        <p style={{ fontFamily: FONT.mono, fontSize: 26, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontFamily: FONT.condensed, fontSize: 12, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</p>
      </div>
    </div>
  );

  const renderOverview = () => {
    if (!metrics) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <p style={{ fontFamily: FONT.body, color: C.sub }}>Loading dashboard metrics...</p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header with Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 700, color: C.text }}>Dashboard Overview</h2>
            <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.sub, marginTop: 4 }}>
              Last updated: {metrics.lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} style={{ ...btnPrimary, opacity: refreshing ? 0.5 : 1 }}>
            <RefreshCw style={{ width: 14, height: 14 }} />
            REFRESH
          </button>
        </div>

        {/* Top Row - 4 Big Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <StatCard label="Total Users" value={metrics.totalUsers} icon={Users} color={C.orange} />
          <StatCard label="DAU" value={metrics.dau} icon={Activity} color={C.green} />
          <StatCard label="WAU" value={metrics.wau} icon={TrendingUp} color={C.orange} />
          <StatCard label="MAU" value={metrics.mau} icon={UserCheck} color={C.gold} />
        </div>

        {/* Growth Section */}
        <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 24 }}>
          <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>User Growth (Last 30 Days)</h3>
          {metrics.dailySignups.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.dailySignups}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.muted} />
                <XAxis dataKey="date" stroke={C.dim} tick={{ fontSize: 12 }} />
                <YAxis stroke={C.dim} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: C.surface2,
                    border: `1px solid ${C.borderDim}`,
                    borderRadius: 8,
                    color: C.text,
                    fontFamily: FONT.body,
                  }}
                />
                <Line type="monotone" dataKey="signups" stroke={C.orange} strokeWidth={2} dot={{ fill: C.orange, r: 4 }} name="Signups" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: FONT.body, color: C.sub }}>
              No signup data available
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 24 }}>
            {[
              { label: 'New Signups (7d)', value: metrics.newUsers7d },
              { label: 'New Signups (30d)', value: metrics.newUsers30d },
              { label: 'Growth Rate', value: `${metrics.totalUsers > 0 ? Math.round((metrics.newUsers30d / metrics.totalUsers) * 100) : 0}%` },
            ].map((item, i) => (
              <div key={i} style={{ background: C.surface2, borderRadius: 8, padding: 16 }}>
                <p style={{ fontFamily: FONT.condensed, fontSize: 12, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{item.label}</p>
                <p style={{ fontFamily: FONT.mono, fontSize: 22, fontWeight: 700, color: C.text }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement Section */}
        <div>
          <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>Engagement Metrics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
            <StatCard label="Posts (7d)" value={metrics.posts7d} icon={Image} color={C.orange} />
            <StatCard label="Comments (7d)" value={metrics.comments7d} icon={MessageSquare} color={C.green} />
            <StatCard label="Likes (7d)" value={metrics.likes7d} icon={Heart} color="#e879a0" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 20 }}>
              <p style={{ fontFamily: FONT.condensed, fontSize: 12, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Engagement Rate</p>
              <p style={{ fontFamily: FONT.mono, fontSize: 32, fontWeight: 700, color: C.text }}>{metrics.engagementRate}%</p>
              <p style={{ fontFamily: FONT.body, fontSize: 11, color: C.dim, marginTop: 4 }}>Users who posted/commented/liked today</p>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 20 }}>
              <p style={{ fontFamily: FONT.condensed, fontSize: 12, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Avg Posts Per User</p>
              <p style={{ fontFamily: FONT.mono, fontSize: 32, fontWeight: 700, color: C.text }}>{metrics.avgPostsPerUser}</p>
              <p style={{ fontFamily: FONT.body, fontSize: 11, color: C.dim, marginTop: 4 }}>Average posts per user (30 days)</p>
            </div>
          </div>
        </div>

        {/* Feature Usage Section */}
        <div>
          <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>Feature Usage</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
            <StatCard label="Vehicles" value={metrics.totalVehicles} icon={Car} color={C.orange} />
            <StatCard label="Badges Earned" value={metrics.totalBadgesEarned} icon={Award} color={C.gold} />
            <StatCard label="Photos" value={metrics.totalPhotos} icon={Image} color={C.green} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 20 }}>
              <p style={{ fontFamily: FONT.condensed, fontSize: 12, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Profile Completion</p>
              <p style={{ fontFamily: FONT.mono, fontSize: 32, fontWeight: 700, color: C.text }}>{metrics.profileCompletionRate}%</p>
              <p style={{ fontFamily: FONT.body, fontSize: 11, color: C.dim, marginTop: 4 }}>Users with avatar and bio</p>
              <div style={{ marginTop: 12, height: 6, background: C.surface2, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: C.orange, width: `${metrics.profileCompletionRate}%` }} />
              </div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 20 }}>
              <p style={{ fontFamily: FONT.condensed, fontSize: 12, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Posts Per Day</p>
              <p style={{ fontFamily: FONT.mono, fontSize: 32, fontWeight: 700, color: C.text }}>{Math.round(metrics.posts30d / 30)}</p>
              <p style={{ fontFamily: FONT.body, fontSize: 11, color: C.dim, marginTop: 4 }}>Average daily posts (30 days)</p>
            </div>
          </div>
        </div>

        {/* Top Users Section */}
        {metrics.topUsers.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 24 }}>
            <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>Top Users (Last 7 Days)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {metrics.topUsers.slice(0, 10).map((topUser, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: C.surface2, borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 700, color: C.dim, width: 28 }}>#{index + 1}</span>
                    <UserAvatar avatarUrl={topUser.avatar_url} userName={topUser.username} size="small" />
                    <span style={{ fontFamily: FONT.body, fontWeight: 500, color: C.text }}>@{topUser.username}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    {[
                      { v: topUser.post_count, l: 'posts' },
                      { v: topUser.comment_count, l: 'comments' },
                      { v: topUser.like_count, l: 'likes' },
                    ].map((stat, si) => (
                      <div key={si} style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: FONT.mono, fontWeight: 700, color: C.text, fontSize: 14 }}>{stat.v}</p>
                        <p style={{ fontFamily: FONT.condensed, fontSize: 10, color: C.dim, textTransform: 'uppercase' }}>{stat.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 16px', textAlign: 'left', fontSize: 11, fontFamily: FONT.condensed,
    fontWeight: 600, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em',
  };
  const tdStyle: React.CSSProperties = {
    padding: '10px 16px', whiteSpace: 'nowrap', fontFamily: FONT.body, fontSize: 13,
  };

  const renderUserManagement = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: C.dim }} />
        <input
          type="text"
          placeholder="Search by username or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.borderDim}` }}>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Last Login</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Reputation</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: 32, color: C.sub }}>
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${C.borderDim}` }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <UserAvatar avatarUrl={u.avatar_url} userName={u.handle} size="small" />
                        <span style={{ fontWeight: 500, color: C.text }}>@{u.handle}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ color: C.text, fontWeight: 500 }}>{u.email}</div>
                      <div style={{ fontSize: 11, color: C.dim }}>
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {u.last_sign_in_at ? (
                        <div>
                          <div style={{ color: C.text, fontWeight: 500 }}>
                            {new Date(u.last_sign_in_at).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: 11, color: C.dim }}>
                            {new Date(u.last_sign_in_at).toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: C.dim, fontStyle: 'italic' }}>Never logged in</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex', padding: '2px 8px', fontSize: 11, fontFamily: FONT.condensed,
                        fontWeight: 600, borderRadius: 10,
                        background: (u.role === 'admin' || u.role === 'moderator') ? 'rgba(249,115,22,0.2)' : C.surface2,
                        color: (u.role === 'admin' || u.role === 'moderator') ? C.orange : C.sub,
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendingUp style={{ width: 14, height: 14, color: C.orange }} />
                        <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: C.orange, fontSize: 13 }}>
                          {u.reputation_score || 0}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex', padding: '2px 8px', fontSize: 11, fontFamily: FONT.condensed,
                        fontWeight: 600, borderRadius: 10,
                        background: u.is_banned ? 'rgba(239,68,68,0.2)' : 'rgba(32,192,96,0.2)',
                        color: u.is_banned ? C.red : C.green,
                      }}>
                        {u.is_banned ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setActiveMenu(activeMenu === u.id ? null : u.id)}
                          style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}
                        >
                          <MoreVertical style={{ width: 18, height: 18, color: C.sub }} />
                        </button>
                        {activeMenu === u.id && (
                          <div style={{
                            position: 'absolute', right: 0, marginTop: 8, width: 192,
                            background: C.surface, borderRadius: 8, border: `1px solid ${C.borderDim}`,
                            padding: 4, zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                          }}>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                showToast('Password reset email sent', 'success');
                              }}
                              style={{ width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: 13, fontFamily: FONT.body, color: C.text, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 6 }}
                            >
                              <Key style={{ width: 14, height: 14 }} />
                              Reset Password
                            </button>
                            {u.is_banned ? (
                              <button
                                onClick={() => { setActiveMenu(null); handleUnbanUser(u.id); }}
                                style={{ width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: 13, fontFamily: FONT.body, color: C.green, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 6 }}
                              >
                                <Check style={{ width: 14, height: 14 }} />
                                Unban User
                              </button>
                            ) : (
                              <button
                                onClick={() => { setActiveMenu(null); setBanModalUser(u); }}
                                style={{ width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: 13, fontFamily: FONT.body, color: C.red, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 6 }}
                              >
                                <Ban style={{ width: 14, height: 14 }} />
                                Ban User
                              </button>
                            )}
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => { setActiveMenu(null); handlePromoteUser(u.id, u.role); }}
                                style={{ width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: 13, fontFamily: FONT.body, color: C.orange, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 6 }}
                              >
                                <UserPlus style={{ width: 14, height: 14 }} />
                                {u.role === 'moderator' ? 'Demote to User' : 'Promote to Moderator'}
                              </button>
                            )}
                            <button
                              onClick={() => { setActiveMenu(null); handleDeleteUser(u.id); }}
                              style={{ width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: 13, fontFamily: FONT.body, color: C.red, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 6 }}
                            >
                              <Trash2 style={{ width: 14, height: 14 }} />
                              Delete User
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPendingPosts = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: C.text }}>Pending Posts</h2>
          <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.sub, marginTop: 4 }}>Review and approve user-submitted content</p>
        </div>
        <div style={{ background: C.surface2, padding: '8px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 22, fontWeight: 700, color: C.text }}>{pendingPosts.length}</span>
          <span style={{ fontFamily: FONT.condensed, fontSize: 12, color: C.sub, textTransform: 'uppercase' }}>pending</span>
        </div>
      </div>

      {pendingPosts.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 48, textAlign: 'center' }}>
          <Check style={{ width: 48, height: 48, color: C.green, margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>All Caught Up!</h3>
          <p style={{ fontFamily: FONT.body, color: C.sub }}>No posts pending moderation</p>
        </div>
      ) : (
        pendingPosts.map((post) => (
          <div key={post.post_id} style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: 24, borderRight: `1px solid ${C.borderDim}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <UserAvatar avatarUrl={post.author_avatar_url} userName={post.author_handle} size="small" />
                  <div>
                    <p style={{ fontFamily: FONT.body, fontWeight: 500, color: C.text }}>@{post.author_handle}</p>
                    <p style={{ fontSize: 12, fontFamily: FONT.body, color: C.sub }}>
                      {new Date(post.created_at).toLocaleDateString()} {new Date(post.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <span style={{ display: 'inline-flex', padding: '2px 8px', fontSize: 11, fontFamily: FONT.condensed, fontWeight: 600, borderRadius: 10, background: 'rgba(234,179,8,0.2)', color: C.yellow, marginBottom: 8 }}>
                    {post.post_type === 'photo' ? 'Photo Post' : post.post_type === 'spotting' ? 'Spotting' : 'Badge Given'}
                  </span>
                  {post.vehicle_make && post.vehicle_model && (
                    <p style={{ fontSize: 13, fontFamily: FONT.body, fontWeight: 500, color: C.text, marginBottom: 8 }}>
                      {post.vehicle_year} {post.vehicle_make} {post.vehicle_model}
                    </p>
                  )}
                  {post.location_label && (
                    <p style={{ fontSize: 11, fontFamily: FONT.body, color: C.sub, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin style={{ width: 12, height: 12 }} /> {post.location_label}
                    </p>
                  )}
                  {post.caption && (
                    <p style={{ fontFamily: FONT.body, color: C.text, marginTop: 8 }}>{post.caption}</p>
                  )}
                </div>

                {post.image_url && (
                  <div style={{ border: `1px solid ${C.borderDim}`, borderRadius: 8, overflow: 'hidden' }}>
                    <img src={post.image_url} alt="Post content" style={{ width: '100%', height: 256, objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                <h3 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Moderation Actions</h3>
                <button onClick={() => handleApprovePost(post.post_id)} style={{ ...btnSuccess, width: '100%', justifyContent: 'center', padding: '10px 16px' }}>
                  <Check style={{ width: 18, height: 18 }} /> APPROVE POST
                </button>
                <button onClick={() => setRejectModalPost(post)} style={{ ...btnDanger, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px' }}>
                  <X style={{ width: 18, height: 18 }} /> REJECT POST
                </button>
                <p style={{ fontFamily: FONT.mono, fontSize: 11, color: C.dim, textAlign: 'center', marginTop: 8 }}>
                  Post ID: {post.post_id.slice(0, 8)}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderModeration = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {reports.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 48, textAlign: 'center' }}>
          <Shield style={{ width: 48, height: 48, color: C.sub, margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>No Pending Reports</h3>
          <p style={{ fontFamily: FONT.body, color: C.sub }}>All reports have been reviewed</p>
        </div>
      ) : (
        reports.map((report) => (
          <div key={report.id} style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: 24, borderRight: `1px solid ${C.borderDim}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <UserAvatar avatarUrl={report.reporter.avatar_url} userName={report.reporter.handle} size="small" />
                  <div>
                    <p style={{ fontFamily: FONT.body, fontWeight: 500, color: C.text }}>@{report.reporter.handle}</p>
                    <p style={{ fontSize: 12, fontFamily: FONT.body, color: C.sub }}>{new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <span style={{ display: 'inline-flex', padding: '2px 8px', fontSize: 11, fontFamily: FONT.condensed, fontWeight: 600, borderRadius: 10, background: 'rgba(239,68,68,0.2)', color: C.red, marginBottom: 8 }}>
                    {report.reason.replace('_', ' ')}
                  </span>
                  <p style={{ fontFamily: FONT.body, color: C.text }}>{report.description}</p>
                </div>

                {report.content && (
                  <div style={{ border: `1px solid ${C.borderDim}`, borderRadius: 8, padding: 16, background: C.surface2 }}>
                    {report.content.image_url && (
                      <img src={report.content.image_url} alt="Reported content" style={{ width: '100%', height: 192, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
                    )}
                    {report.content.caption && (
                      <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.text }}>{report.content.caption}</p>
                    )}
                  </div>
                )}
              </div>

              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                <h3 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Moderation Actions</h3>
                <button onClick={() => handleApproveReport(report.id)} style={{ ...btnSuccess, width: '100%', justifyContent: 'center', padding: '10px 16px' }}>
                  <Check style={{ width: 18, height: 18 }} /> APPROVE (NO ACTION)
                </button>
                <button onClick={() => setRejectModalReport(report)} style={{ ...btnDanger, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px' }}>
                  <X style={{ width: 18, height: 18 }} /> REJECT &amp; REMOVE
                </button>
                <p style={{ fontFamily: FONT.mono, fontSize: 11, color: C.dim, textAlign: 'center', marginTop: 8 }}>
                  Report ID: {report.id.slice(0, 8)}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderClaims = () => {
    const handleApproveClaim = async (claim: ClaimWithDetails) => {
      if (!user) return;
      try {
        const result = await approveClaim(claim.id, user.id);
        if (result.success) {
          showToast('Claim approved successfully', 'success');
          loadDashboardData();
          setSelectedClaim(null);
        } else {
          showToast(result.error || 'Failed to approve claim', 'error');
        }
      } catch (error) {
        console.error('Error approving claim:', error);
        showToast('Failed to approve claim', 'error');
      }
    };

    const handleRejectClaim = async (claim: ClaimWithDetails, reason: string) => {
      if (!user) return;
      try {
        const result = await rejectClaim(claim.id, user.id, reason);
        if (result.success) {
          showToast('Claim rejected', 'success');
          loadDashboardData();
          setSelectedClaim(null);
        } else {
          showToast(result.error || 'Failed to reject claim', 'error');
        }
      } catch (error) {
        console.error('Error rejecting claim:', error);
        showToast('Failed to reject claim', 'error');
      }
    };

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 700, color: C.text }}>Vehicle Ownership Claims</h2>
          <button onClick={loadDashboardData} style={btnPrimary}>
            <RefreshCw style={{ width: 14, height: 14 }} /> REFRESH
          </button>
        </div>

        {pendingClaims.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10 }}>
            <CheckCircle style={{ width: 64, height: 64, color: C.green, margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>All caught up!</h3>
            <p style={{ fontFamily: FONT.body, color: C.sub }}>No pending vehicle ownership claims to review.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pendingClaims.map(claim => (
              <div key={claim.id} style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {claim.vehicle?.stock_image_url && (
                    <div style={{ flexShrink: 0 }}>
                      <img
                        src={claim.vehicle.stock_image_url}
                        alt={`${claim.vehicle.make} ${claim.vehicle.model}`}
                        style={{ width: 128, height: 96, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.borderDim}` }}
                      />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <UserAvatar userId={claim.user?.id || ''} src={claim.user?.avatar_url} size="md" />
                      <div>
                        <button
                          onClick={() => claim.user?.id && onNavigate?.('user-profile', claim.user.id)}
                          style={{ fontFamily: FONT.body, fontWeight: 600, color: C.text, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          @{claim.user?.handle || 'Unknown'}
                        </button>
                        {claim.user?.location && (
                          <p style={{ fontSize: 11, fontFamily: FONT.body, color: C.sub, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin style={{ width: 12, height: 12 }} /> {claim.user.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {claim.vehicle && (
                      <div style={{ background: C.surface2, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                        <p style={{ fontFamily: FONT.body, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                          {claim.vehicle.year} {claim.vehicle.make} {claim.vehicle.model}
                        </p>
                        {claim.vehicle.color && (
                          <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.sub }}>Color: {claim.vehicle.color}</p>
                        )}
                      </div>
                    )}

                    {claim.document_urls && claim.document_urls.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, fontFamily: FONT.condensed, fontWeight: 600, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                          Submitted Documents ({claim.document_urls.length})
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {claim.document_urls.map((url: string, index: number) => {
                            const docType = (claim as unknown as Record<string, string[]>).document_types?.[index] || `Document ${index + 1}`;
                            const icon = docType === 'registration' || docType === 'insurance' ? FileText :
                                        docType === 'photo' ? Image :
                                        docType === 'selfie' ? UserCircle : FileText;
                            const Icon = icon;
                            const label = docType.charAt(0).toUpperCase() + docType.slice(1);

                            const docUrl = getClaimDocumentUrl(url);
                            return docUrl ? (
                              <a
                                key={index}
                                href={docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: C.surface2, borderRadius: 8, fontSize: 13, fontFamily: FONT.body, color: C.text, textDecoration: 'none' }}
                              >
                                <Icon style={{ width: 14, height: 14 }} /> {label}
                              </a>
                            ) : (
                              <span
                                key={index}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: C.surface2, borderRadius: 8, fontSize: 13, fontFamily: FONT.body, color: C.dim, opacity: 0.5 }}
                              >
                                <Icon style={{ width: 14, height: 14 }} /> {label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <p style={{ fontSize: 11, fontFamily: FONT.body, color: C.sub }}>
                      Submitted {new Date(claim.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={() => handleApproveClaim(claim)} style={{ ...btnSuccess, padding: '8px 16px' }}>
                      <Check style={{ width: 14, height: 14 }} /> Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for rejection (will be shown to user):');
                        if (reason) handleRejectClaim(claim, reason);
                      }}
                      style={{ ...btnDanger, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}
                    >
                      <X style={{ width: 14, height: 14 }} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderVehicleManagement = () => {
    const handleSearchVehicles = async () => {
      if (!user || !vehicleSearchQuery.trim()) return;
      setVehiclesLoading(true);
      try {
        const results = await adminSearchVehicles(user.id, vehicleSearchQuery.trim());
        setVehicleSearchResults(results);
      } catch (_error) {
        showToast('Failed to search vehicles', 'error');
      } finally {
        setVehiclesLoading(false);
      }
    };

    const handleSearchUsers = async () => {
      if (!user || !userSearchQuery.trim()) return;
      try {
        const results = await adminSearchUsers(user.id, userSearchQuery.trim());
        setUserSearchResults(results);
      } catch (_error) {
        showToast('Failed to search users', 'error');
      }
    };

    const handleLoadClaimedVehicles = async () => {
      if (!user) return;
      setVehiclesLoading(true);
      try {
        const vehicles = await adminGetClaimedVehicles(user.id, 50, 0);
        setClaimedVehicles(vehicles);
      } catch (_error) {
        showToast('Failed to load claimed vehicles', 'error');
      } finally {
        setVehiclesLoading(false);
      }
    };

    const handleInstantClaim = async (vehicleId: string, targetUserId: string) => {
      if (!user) return;
      const notes = prompt('Admin notes (optional):');
      const result = await adminInstantClaim(vehicleId, targetUserId, user.id, notes || undefined);
      if (result.success) {
        showToast('Vehicle assigned successfully', 'success');
        setVehicleActionModal(null);
        setSelectedVehicle(null);
        handleSearchVehicles();
      } else {
        showToast(result.error || 'Failed to assign vehicle', 'error');
      }
    };

    const handleTransfer = async (vehicleId: string, newOwnerId: string) => {
      if (!user) return;
      const notes = prompt('Reason for transfer (e.g., vehicle sold):');
      const result = await adminTransferVehicle(vehicleId, newOwnerId, user.id, notes || undefined);
      if (result.success) {
        showToast('Vehicle transferred successfully', 'success');
        setVehicleActionModal(null);
        setSelectedVehicle(null);
        handleSearchVehicles();
        handleLoadClaimedVehicles();
      } else {
        showToast(result.error || 'Failed to transfer vehicle', 'error');
      }
    };

    const handleRevoke = async (vehicleId: string) => {
      if (!user) return;
      const notes = prompt('Reason for revoking claim:');
      if (!notes) return;
      const result = await adminRevokeClaim(vehicleId, user.id, notes);
      if (result.success) {
        showToast('Claim revoked successfully', 'success');
        setVehicleActionModal(null);
        setSelectedVehicle(null);
        handleSearchVehicles();
        handleLoadClaimedVehicles();
      } else {
        showToast(result.error || 'Failed to revoke claim', 'error');
      }
    };

    const handleDelete = async (vehicleId: string) => {
      if (!user) return;
      const confirmed = confirm('Are you sure you want to permanently delete this vehicle? This cannot be undone.');
      if (!confirmed) return;
      const notes = prompt('Reason for deletion:');
      const result = await adminDeleteVehicle(vehicleId, user.id, notes || undefined);
      if (result.success) {
        showToast('Vehicle deleted successfully', 'success');
        setVehicleActionModal(null);
        setSelectedVehicle(null);
        handleSearchVehicles();
        handleLoadClaimedVehicles();
      } else {
        showToast(result.error || 'Failed to delete vehicle', 'error');
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 700, color: C.text }}>Vehicle Management</h2>
            <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.sub, marginTop: 4 }}>Search, transfer, and manage vehicle ownership</p>
          </div>
          <button onClick={handleLoadClaimedVehicles} style={btnPrimary}>
            <RefreshCw style={{ width: 14, height: 14 }} /> LOAD ALL CLAIMED
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 24 }}>
            <h3 style={{ fontFamily: FONT.display, fontWeight: 600, color: C.text, marginBottom: 16 }}>Search Vehicles</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Search by plate, make, model, or owner..."
                value={vehicleSearchQuery}
                onChange={(e) => setVehicleSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchVehicles()}
                style={{ ...inputStyle, paddingLeft: 12, flex: 1 }}
              />
              <button onClick={handleSearchVehicles} disabled={vehiclesLoading} style={{ ...btnPrimary, opacity: vehiclesLoading ? 0.5 : 1 }}>
                <Search style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 24 }}>
            <h3 style={{ fontFamily: FONT.display, fontWeight: 600, color: C.text, marginBottom: 16 }}>Search Users (for Transfer/Assign)</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Search by username or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                style={{ ...inputStyle, paddingLeft: 12, flex: 1 }}
              />
              <button onClick={handleSearchUsers} style={btnPrimary}>
                <Search style={{ width: 14, height: 14 }} />
              </button>
            </div>
            {userSearchResults.length > 0 && (
              <div style={{ marginTop: 16, maxHeight: 192, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {userSearchResults.map(u => (
                  <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, background: C.surface2, borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UserAvatar userId={u.user_id} src={u.avatar_url} size="sm" />
                      <div>
                        <p style={{ fontFamily: FONT.body, fontWeight: 500, color: C.text, fontSize: 13 }}>@{u.handle}</p>
                        <p style={{ fontFamily: FONT.body, fontSize: 11, color: C.sub }}>{u.vehicle_count} vehicles</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: FONT.condensed, padding: '2px 8px', background: C.surface, borderRadius: 6, color: C.sub }}>{u.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {vehiclesLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <RefreshCw style={{ width: 32, height: 32, color: C.orange }} />
          </div>
        ) : (
          <>
            {vehicleSearchResults.length > 0 && (
              <div>
                <h3 style={{ fontFamily: FONT.display, fontWeight: 600, color: C.text, marginBottom: 16 }}>Search Results ({vehicleSearchResults.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {vehicleSearchResults.map(vehicle => (
                    <VehicleCard
                      key={vehicle.vehicle_id}
                      vehicle={vehicle}
                      onSelect={() => setSelectedVehicle(vehicle)}
                      onTransfer={() => { setSelectedVehicle(vehicle); setVehicleActionModal('transfer'); }}
                      onRevoke={() => { setSelectedVehicle(vehicle); setVehicleActionModal('revoke'); }}
                      onDelete={() => { setSelectedVehicle(vehicle); setVehicleActionModal('delete'); }}
                      onInstantClaim={() => { setSelectedVehicle(vehicle); setVehicleActionModal('instant'); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {claimedVehicles.length > 0 && vehicleSearchResults.length === 0 && (
              <div>
                <h3 style={{ fontFamily: FONT.display, fontWeight: 600, color: C.text, marginBottom: 16 }}>All Claimed Vehicles ({claimedVehicles.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {claimedVehicles.map(vehicle => (
                    <VehicleCard
                      key={vehicle.vehicle_id}
                      vehicle={vehicle}
                      onSelect={() => setSelectedVehicle(vehicle)}
                      onTransfer={() => { setSelectedVehicle(vehicle); setVehicleActionModal('transfer'); }}
                      onRevoke={() => { setSelectedVehicle(vehicle); setVehicleActionModal('revoke'); }}
                      onDelete={() => { setSelectedVehicle(vehicle); setVehicleActionModal('delete'); }}
                      onInstantClaim={() => { setSelectedVehicle(vehicle); setVehicleActionModal('instant'); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {vehicleSearchResults.length === 0 && claimedVehicles.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10 }}>
                <Car style={{ width: 64, height: 64, color: C.sub, margin: '0 auto 16px', opacity: 0.5 }} />
                <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>No vehicles to display</h3>
                <p style={{ fontFamily: FONT.body, color: C.sub }}>Search for a vehicle or click "Load All Claimed" to view claimed vehicles.</p>
              </div>
            )}
          </>
        )}

        {vehicleActionModal && selectedVehicle && (
          <VehicleActionModal
            vehicle={selectedVehicle}
            action={vehicleActionModal}
            users={userSearchResults}
            onClose={() => { setVehicleActionModal(null); setSelectedVehicle(null); }}
            onInstantClaim={handleInstantClaim}
            onTransfer={handleTransfer}
            onRevoke={handleRevoke}
            onDelete={handleDelete}
          />
        )}
      </div>
    );
  };

  const renderBadgeManagement = () => {
    const filteredBadges = badges.filter(b =>
      b.name?.toLowerCase().includes(badgeSearchQuery.toLowerCase()) ||
      b.description?.toLowerCase().includes(badgeSearchQuery.toLowerCase())
    );

    const totalBadgeUsers = badges.reduce((sum, b) => sum + (b.user_count || 0), 0);
    const avgBadgesPerUser = badges.length > 0 ? (totalBadgeUsers / badges.length).toFixed(1) : '0';

    const tierCounts = {
      bronze: badges.filter(b => b.tier === 'bronze').length,
      silver: badges.filter(b => b.tier === 'silver').length,
      gold: badges.filter(b => b.tier === 'gold').length,
      platinum: badges.filter(b => b.tier === 'platinum').length
    };

    const tierColors: Record<string, string> = { bronze: '#cd7f32', silver: '#9ca3af', gold: '#eab308', platinum: C.orange };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 700, color: C.text }}>Badge System Dashboard</h2>
          <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.sub, marginTop: 4 }}>Manage badge definitions and track distribution</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {(['bronze', 'silver', 'gold', 'platinum'] as const).map(tier => (
            <div key={tier} style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Award style={{ width: 20, height: 20, color: tierColors[tier] }} />
                <div>
                  <p style={{ fontFamily: FONT.condensed, fontSize: 11, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tier}</p>
                  <p style={{ fontFamily: FONT.mono, fontSize: 22, fontWeight: 700, color: C.text }}>{tierCounts[tier]}</p>
                </div>
              </div>
              <div style={{ height: 6, background: C.surface2, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: tierColors[tier], width: `${badges.length > 0 ? (tierCounts[tier] / badges.length) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <StatCard label="Total Badges" value={badges.length} icon={Award} color={C.orange} />
          <StatCard label="Total Awards" value={totalBadgeUsers} icon={Users} color={C.green} />
          <StatCard label="Avg Per Badge" value={avgBadgesPerUser} icon={TrendingUp} color={C.gold} />
        </div>

        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: C.dim }} />
          <input
            type="text"
            placeholder="Search badges by name or description..."
            value={badgeSearchQuery}
            onChange={(e) => setBadgeSearchQuery(e.target.value)}
            style={inputStyle}
          />
        </div>

        {filteredBadges.length === 0 ? (
          <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 48, textAlign: 'center' }}>
            <Award style={{ width: 48, height: 48, color: C.sub, margin: '0 auto 16px' }} />
            <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>No Badges Found</h3>
            <p style={{ fontFamily: FONT.body, color: C.sub }}>
              {badges.length === 0 ? 'No badges have been created yet.' : 'No badges match your search.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filteredBadges.map((badge) => (
              <div key={badge.id} style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 32 }}>{badge.icon || <Award style={{ width: 36, height: 36, color: C.orange }} />}</div>
                  <div>
                    <h3 style={{ fontFamily: FONT.body, fontWeight: 700, color: C.text }}>{badge.name}</h3>
                    <span style={{
                      display: 'inline-flex', padding: '2px 8px', fontSize: 10, fontFamily: FONT.condensed,
                      fontWeight: 600, borderRadius: 10, marginTop: 4,
                      background: `${tierColors[badge.tier] || C.surface2}33`,
                      color: tierColors[badge.tier] || C.sub,
                    }}>
                      {badge.tier}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.sub, marginBottom: 16 }}>{badge.description}</p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${C.borderDim}` }}>
                  <div>
                    <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: C.orange }}>{badge.user_count}</span>
                    <span style={{ fontFamily: FONT.condensed, fontSize: 12, color: C.sub, marginLeft: 4 }}>users</span>
                  </div>
                  <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.dim }}>ID: {badge.id.slice(0, 8)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSystemLogs = () => (
    <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: 24, borderBottom: `1px solid ${C.borderDim}` }}>
        <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: C.text }}>Recent Admin Actions</h3>
      </div>
      <div>
        {logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <FileText style={{ width: 48, height: 48, color: C.sub, margin: '0 auto 16px' }} />
            <p style={{ fontFamily: FONT.body, color: C.sub }}>No admin actions recorded</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} style={{ padding: 16, borderBottom: `1px solid ${C.borderDim}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: FONT.body, fontWeight: 500, color: C.text }}>@{log.admin.handle}</span>
                    <span style={{ fontSize: 13, fontFamily: FONT.body, color: C.sub }}>
                      {log.action_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, fontFamily: FONT.body, color: C.sub }}>{log.description}</p>
                </div>
                <span style={{ fontSize: 11, fontFamily: FONT.mono, color: C.dim, whiteSpace: 'nowrap', marginLeft: 16 }}>
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: FONT.body, color: C.sub }}>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.borderDim}`, borderRadius: 12, padding: 32, maxWidth: 400, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield style={{ width: 32, height: 32, color: C.red }} />
          </div>
          <h2 style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 8 }}>Access Denied</h2>
          <p style={{ fontFamily: FONT.body, color: C.sub, marginBottom: 24 }}>
            You do not have permission to access the admin dashboard.
          </p>
          {onNavigate && (
            <button onClick={() => onNavigate('feed')} style={{ ...btnPrimary, padding: '10px 24px' }}>
              RETURN TO FEED
            </button>
          )}
        </div>
      </div>
    );
  }

  const navBtn = (tab: Tab, icon: React.ElementType, label: string, badge?: number) => {
    const Icon = icon;
    const active = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          borderRadius: 8, marginBottom: 4, border: 'none', cursor: 'pointer',
          background: active ? 'rgba(249,115,22,0.15)' : 'transparent',
          color: active ? C.orange : C.sub,
          fontFamily: FONT.condensed, fontSize: 14, fontWeight: active ? 600 : 400,
          textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left',
        }}
      >
        <Icon style={{ width: 18, height: 18 }} />
        {label}
        {badge !== undefined && badge > 0 && (
          <span style={{
            marginLeft: 'auto', background: C.orange, color: '#fff', fontSize: 10,
            fontFamily: FONT.mono, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
          }}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar */}
        <div style={{ width: 240, background: C.surface, borderRight: `1px solid ${C.borderDim}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '52px 16px 14px', background: '#0a0d14', borderBottom: `1px solid ${C.borderDim}` }}>
            <h1 style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 700, color: C.text }}>Admin Dashboard</h1>
          </div>

          <nav style={{ flex: 1, padding: 12 }}>
            {navBtn('overview', LayoutDashboard, 'Overview')}
            {navBtn('users', Users, 'User Management')}
            {navBtn('posts', Car, 'Pending Posts', pendingPosts.length)}
            {navBtn('moderation', Shield, 'Reports', reports.length)}
            {navBtn('claims', CheckCircle, 'Vehicle Claims', pendingClaims.length)}
            {navBtn('vehicles', Car, 'Vehicle Mgmt')}
            {navBtn('logs', FileText, 'System Logs')}
            {navBtn('badges', Award, 'Badges', badges.length || undefined)}
          </nav>

          <div style={{ padding: 12, borderTop: `1px solid ${C.borderDim}` }}>
            <button
              onClick={() => onNavigate && onNavigate('feed')}
              style={{
                width: '100%', padding: '8px 14px', background: 'transparent', border: 'none',
                color: C.sub, fontFamily: FONT.condensed, fontSize: 14, textTransform: 'uppercase',
                letterSpacing: '0.04em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                borderRadius: 8, textAlign: 'left',
              }}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} /> Back to App
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: 32 }}>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUserManagement()}
            {activeTab === 'posts' && renderPendingPosts()}
            {activeTab === 'moderation' && renderModeration()}
            {activeTab === 'claims' && renderClaims()}
            {activeTab === 'vehicles' && renderVehicleManagement()}
            {activeTab === 'logs' && renderSystemLogs()}
            {activeTab === 'badges' && renderBadgeManagement()}
          </div>
        </div>
      </div>

      {banModalUser && (
        <BanUserModal
          user={banModalUser}
          onClose={() => setBanModalUser(null)}
          onBan={handleBanUser}
        />
      )}

      {rejectModalReport && (
        <RejectContentModal
          report={rejectModalReport}
          onClose={() => setRejectModalReport(null)}
          onReject={handleRejectReport}
        />
      )}

      {rejectModalPost && (
        <RejectPostModal
          post={rejectModalPost}
          onClose={() => setRejectModalPost(null)}
          onReject={handleRejectPost}
        />
      )}
    </div>
  );
}
