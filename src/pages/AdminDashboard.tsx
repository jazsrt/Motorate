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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surfacehighlight rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-primary mb-4">Ban User</h2>
        <div className="mb-4 p-3 bg-status-danger/10 border border-status-danger/30 rounded-lg">
          <p className="text-sm text-status-danger">
            You are about to ban <span className="font-semibold">@{user.handle}</span>
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-primary mb-2">
              Reason for Ban
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-surfacehighlight border border-surfacehighlight text-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              required
            >
              <option value="">Select a reason</option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="impersonation">Impersonation</option>
              <option value="illegal_activity">Illegal Activity</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-primary mb-2">
              Ban Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 bg-surfacehighlight border border-surfacehighlight text-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
            >
              <option value="1">1 Day</option>
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-surfacehighlight text-secondary bg-surfacehighlight rounded-xl hover:bg-surface transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-status-danger text-white rounded-xl hover:bg-status-danger/90 disabled:opacity-50 transition-all"
            >
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surfacehighlight rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-primary mb-4">Reject & Remove Content</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-primary mb-2">
              Reason for Rejection
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-surfacehighlight border border-surfacehighlight text-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              required
            >
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-surfacehighlight text-secondary bg-surfacehighlight rounded-xl hover:bg-surface transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-status-danger text-white rounded-xl hover:bg-status-danger/90 disabled:opacity-50 transition-all"
            >
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surfacehighlight rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-primary mb-4">Reject Post</h2>
        <div className="mb-4 p-3 bg-status-danger/10 border border-status-danger/30 rounded-lg">
          <p className="text-sm text-status-danger">
            You are about to reject this post by <span className="font-semibold">@{post.author_handle}</span>
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-primary mb-2">
              Reason for Rejection
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-surfacehighlight border border-surfacehighlight text-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              required
            >
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-surfacehighlight text-secondary bg-surfacehighlight rounded-xl hover:bg-surface transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-status-danger text-white rounded-xl hover:bg-status-danger/90 disabled:opacity-50 transition-all"
            >
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
    <div className="bg-surface border border-surfacehighlight rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-surfacehighlight rounded-lg">
            <Car className="w-6 h-6 text-accent-primary" />
          </div>
          <div>
            <p className="font-semibold text-primary">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
            <p className="text-sm text-secondary">
              Plate: {vehicle.plate_hash} {vehicle.plate_state && `(${vehicle.plate_state})`}
            </p>
            {vehicle.owner_handle ? (
              <p className="text-sm text-accent-primary">Owner: @{vehicle.owner_handle}</p>
            ) : (
              <p className="text-sm text-status-warning">Unclaimed</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {vehicle.is_verified && (
            <span className="px-2 py-1 bg-status-success/20 text-status-success text-xs rounded-full">Verified</span>
          )}
          {vehicle.is_claimed && (
            <span className="px-2 py-1 bg-accent-primary/20 text-accent-primary text-xs rounded-full">Claimed</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-surfacehighlight">
        {!vehicle.is_claimed && (
          <button
            onClick={onInstantClaim}
            className="flex-1 px-3 py-2 bg-status-success text-white text-sm rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1"
          >
            <UserPlus className="w-4 h-4" />
            Assign Owner
          </button>
        )}
        {vehicle.is_claimed && (
          <button
            onClick={onTransfer}
            className="flex-1 px-3 py-2 bg-accent-primary text-white text-sm rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Transfer
          </button>
        )}
        {vehicle.is_claimed && (
          <button
            onClick={onRevoke}
            className="flex-1 px-3 py-2 bg-status-warning text-white text-sm rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1"
          >
            <XCircle className="w-4 h-4" />
            Revoke
          </button>
        )}
        <button
          onClick={onDelete}
          className="px-3 py-2 bg-status-danger text-white text-sm rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surfacehighlight rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-primary mb-4">{getTitle()}</h2>

        <div className="mb-4 p-3 bg-surfacehighlight rounded-lg">
          <p className="font-semibold text-primary">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
          <p className="text-sm text-secondary">Plate: {vehicle.plate_hash}</p>
          {vehicle.owner_handle && (
            <p className="text-sm text-accent-primary">Current owner: @{vehicle.owner_handle}</p>
          )}
        </div>

        {(action === 'transfer' || action === 'instant') && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-primary mb-2">
              Select New Owner
            </label>
            {users.length === 0 ? (
              <p className="text-sm text-secondary">Search for users first using the search box above.</p>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 bg-surfacehighlight border border-surfacehighlight text-primary rounded-lg focus:ring-2 focus:ring-accent-primary"
              >
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
          <div className="mb-6 p-3 bg-status-warning/10 border border-status-warning/30 rounded-lg">
            <p className="text-sm text-status-warning">
              This will remove ownership from the current owner. The vehicle will become unclaimed and can be claimed by anyone.
            </p>
          </div>
        )}

        {action === 'delete' && (
          <div className="mb-6 p-3 bg-status-danger/10 border border-status-danger/30 rounded-lg">
            <p className="text-sm text-status-danger">
              This will permanently delete the vehicle and all associated data (claims, stickers, modifications, images, reviews). This action cannot be undone.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-surfacehighlight text-secondary bg-surfacehighlight rounded-xl hover:bg-surface transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={(action === 'transfer' || action === 'instant') && !selectedUserId}
            className={`flex-1 px-4 py-2 text-white rounded-xl transition-all disabled:opacity-50 ${
              action === 'delete' ? 'bg-status-danger hover:bg-status-danger/90' :
              action === 'revoke' ? 'bg-status-warning hover:bg-status-warning/90' :
              'bg-accent-primary hover:bg-accent-hover'
            }`}
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

    // Total Users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Daily Active Users
    const { count: dau } = await supabase
      .from('user_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gte('last_active_at', today);

    // Weekly Active Users
    const { count: wau } = await supabase
      .from('user_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gte('last_active_at', sevenDaysAgo);

    // Monthly Active Users
    const { count: mau } = await supabase
      .from('user_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gte('last_active_at', thirtyDaysAgo);

    // New Signups
    const { count: newUsers7d } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    const { count: newUsers30d } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo);

    // Daily Signups for Chart
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

    // Engagement Metrics
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

    // Engagement Rate (simplified calculation)
    const { data: activeUserIds } = await supabase
      .from('posts')
      .select('author_id')
      .gte('created_at', today);

    const uniqueActiveUsers = new Set(activeUserIds?.map(p => p.author_id) || []).size;
    const engagementRate = totalUsers ? Math.round((uniqueActiveUsers / totalUsers) * 100) : 0;

    // Average Posts Per User
    const avgPostsPerUser = totalUsers && posts30d ? parseFloat((posts30d / totalUsers).toFixed(2)) : 0;

    // Feature Usage
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

    // Profile Completion Rate
    const { count: completedProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('avatar_url', 'is', null)
      .not('bio', 'is', null)
      .neq('bio', '');

    const profileCompletionRate = totalUsers ? Math.round((completedProfiles! / totalUsers) * 100) : 0;

    // Retention (simplified - would need more complex queries for accurate calculation)
    const day1Retention = 0; // Placeholder
    const day7Retention = 0; // Placeholder

    // Churned Users
    const { count: _churnedUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // Top Users (Last 7 Days)
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
      // Fetch metrics
      const dashboardMetrics = await fetchDashboardMetrics();
      setMetrics(dashboardMetrics);

      // Load users
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

      // Load reports
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

      // Load logs
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

      // Load pending posts
      const { data: pendingPostsData } = await supabase.rpc('get_pending_posts');
      setPendingPosts(pendingPostsData || []);

      // Load pending claims
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

  const renderOverview = () => {
    if (!metrics) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto mb-4"></div>
            <p className="text-secondary">Loading dashboard metrics...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">Dashboard Overview</h2>
            <p className="text-sm text-secondary mt-1">
              Last updated: {metrics.lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl hover:bg-accent-hover transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Top Row - 4 Big Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-accent-primary/20 to-accent-hover/20 border border-accent-primary/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-secondary mb-1">Total Users</p>
                <h3 className="text-4xl font-bold text-primary">{metrics.totalUsers}</h3>
              </div>
              <Users className="w-12 h-12 text-accent-primary opacity-50" />
            </div>
            <div className="flex items-center gap-1 text-sm mt-2">
              <ArrowUp className="w-4 h-4 text-status-success" />
              <span className="text-status-success font-semibold">+{metrics.newUsers30d}</span>
              <span className="text-secondary ml-1">this month</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-status-success/20 to-status-success/10 border border-status-success/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-secondary mb-1">Daily Active Users</p>
                <h3 className="text-4xl font-bold text-primary">{metrics.dau}</h3>
              </div>
              <Activity className="w-12 h-12 text-status-success opacity-50" />
            </div>
            <div className="text-sm text-secondary mt-2">
              {metrics.totalUsers > 0 ? Math.round((metrics.dau / metrics.totalUsers) * 100) : 0}% of total users
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#F97316]/20 to-[#fb923c]/10 border border-orange/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-secondary mb-1">Weekly Active Users</p>
                <h3 className="text-4xl font-bold text-primary">{metrics.wau}</h3>
              </div>
              <TrendingUp className="w-12 h-12 text-accent-primary opacity-50" />
            </div>
            <div className="text-sm text-secondary mt-2">
              {metrics.totalUsers > 0 ? Math.round((metrics.wau / metrics.totalUsers) * 100) : 0}% of total users
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#fb923c]/20 to-[#fb923c]/10 border border-[#fb923c]/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-secondary mb-1">Monthly Active Users</p>
                <h3 className="text-4xl font-bold text-primary">{metrics.mau}</h3>
              </div>
              <UserCheck className="w-12 h-12 text-accent-2 opacity-50" />
            </div>
            <div className="text-sm text-secondary mt-2">
              {metrics.totalUsers > 0 ? Math.round((metrics.mau / metrics.totalUsers) * 100) : 0}% of total users
            </div>
          </div>
        </div>

        {/* Growth Section */}
        <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">User Growth (Last 30 Days)</h3>
          {metrics.dailySignups.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.dailySignups}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #1E293B',
                    borderRadius: '0.5rem',
                    color: '#f8f9fb'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="#fb923c"
                  strokeWidth={2}
                  dot={{ fill: '#fb923c', r: 4 }}
                  name="Signups"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-secondary">
              No signup data available
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-surfacehighlight rounded-lg p-4">
              <p className="text-sm text-secondary mb-1">New Signups (7d)</p>
              <p className="text-2xl font-bold text-primary">{metrics.newUsers7d}</p>
            </div>
            <div className="bg-surfacehighlight rounded-lg p-4">
              <p className="text-sm text-secondary mb-1">New Signups (30d)</p>
              <p className="text-2xl font-bold text-primary">{metrics.newUsers30d}</p>
            </div>
            <div className="bg-surfacehighlight rounded-lg p-4">
              <p className="text-sm text-secondary mb-1">Growth Rate</p>
              <p className="text-2xl font-bold text-primary">
                {metrics.totalUsers > 0 ? Math.round((metrics.newUsers30d / metrics.totalUsers) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Engagement Section */}
        <div>
          <h3 className="text-lg font-semibold text-primary mb-4">Engagement Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-accent-primary/20 rounded-lg">
                  <Image className="w-6 h-6 text-accent-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">Posts (7d)</p>
                  <p className="text-xs text-secondary">Last 7 days</p>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-primary">{metrics.posts7d}</h3>
            </div>

            <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-status-success/20 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-status-success" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">Comments (7d)</p>
                  <p className="text-xs text-secondary">Last 7 days</p>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-primary">{metrics.comments7d}</h3>
            </div>

            <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-pink-500/20 rounded-lg">
                  <Heart className="w-6 h-6 text-pink-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">Likes (7d)</p>
                  <p className="text-xs text-secondary">Last 7 days</p>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-primary">{metrics.likes7d}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
              <p className="text-sm text-secondary mb-2">Engagement Rate</p>
              <h3 className="text-4xl font-bold text-primary">{metrics.engagementRate}%</h3>
              <p className="text-xs text-secondary mt-2">Users who posted/commented/liked today</p>
            </div>

            <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
              <p className="text-sm text-secondary mb-2">Avg Posts Per User</p>
              <h3 className="text-4xl font-bold text-primary">{metrics.avgPostsPerUser}</h3>
              <p className="text-xs text-secondary mt-2">Average posts per user (30 days)</p>
            </div>
          </div>
        </div>

        {/* Feature Usage Section */}
        <div>
          <h3 className="text-lg font-semibold text-primary mb-4">Feature Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-500/20 rounded-lg">
                  <Car className="w-6 h-6 text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">Vehicles</p>
                  <p className="text-xs text-secondary">Total registered</p>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-primary">{metrics.totalVehicles}</h3>
              <p className="text-xs text-secondary mt-2">+{metrics.vehicles7d} in last 7 days</p>
            </div>

            <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Award className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">Badges Earned</p>
                  <p className="text-xs text-secondary">Total awarded</p>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-primary">{metrics.totalBadgesEarned}</h3>
            </div>

            <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Image className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">Photos</p>
                  <p className="text-xs text-secondary">Total uploaded</p>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-primary">{metrics.totalPhotos}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
              <p className="text-sm text-secondary mb-2">Profile Completion</p>
              <h3 className="text-4xl font-bold text-primary">{metrics.profileCompletionRate}%</h3>
              <p className="text-xs text-secondary mt-2">Users with avatar and bio</p>
              <div className="mt-4 h-2 bg-surfacehighlight rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-primary transition-all"
                  style={{ width: `${metrics.profileCompletionRate}%` }}
                />
              </div>
            </div>

            <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
              <p className="text-sm text-secondary mb-2">Posts Per Day</p>
              <h3 className="text-4xl font-bold text-primary">
                {Math.round(metrics.posts30d / 30)}
              </h3>
              <p className="text-xs text-secondary mt-2">Average daily posts (30 days)</p>
            </div>
          </div>
        </div>

        {/* Top Users Section */}
        {metrics.topUsers.length > 0 && (
          <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Top Users (Last 7 Days)</h3>
            <div className="space-y-3">
              {metrics.topUsers.slice(0, 10).map((topUser, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-surfacehighlight rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-secondary w-8">#{index + 1}</span>
                    <UserAvatar
                      avatarUrl={topUser.avatar_url}
                      userName={topUser.username}
                      size="small"
                    />
                    <span className="font-medium text-primary">@{topUser.username}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-primary">{topUser.post_count}</p>
                      <p className="text-xs text-secondary">posts</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-primary">{topUser.comment_count}</p>
                      <p className="text-xs text-secondary">comments</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-primary">{topUser.like_count}</p>
                      <p className="text-xs text-secondary">likes</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderUserManagement = () => (
    <div className="space-y-6">
      <div className="bg-surface border border-surfacehighlight rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary" />
          <input
            type="text"
            placeholder="Search by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surfacehighlight border border-surfacehighlight text-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-surface border border-surfacehighlight rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surfacehighlight border-b border-surfacehighlight">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Reputation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfacehighlight">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-secondary">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-surfacehighlight">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          avatarUrl={u.avatar_url}
                          userName={u.handle}
                          size="small"
                        />
                        <span className="font-medium text-primary">@{u.handle}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-primary font-medium">{u.email}</div>
                      <div className="text-xs text-secondary">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.last_sign_in_at ? (
                        <div>
                          <div className="text-sm text-primary font-medium">
                            {new Date(u.last_sign_in_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-secondary">
                            {new Date(u.last_sign_in_at).toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-secondary italic">Never logged in</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        u.role === 'admin' ? 'bg-accent-primary/20 text-accent-primary' :
                        u.role === 'moderator' ? 'bg-accent-primary/20 text-accent-primary' :
                        'bg-surfacehighlight text-secondary'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-accent-primary" />
                        <span className="text-sm font-mono font-bold text-accent-primary">
                          {u.reputation_score || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        u.is_banned ? 'bg-status-danger/20 text-status-danger' : 'bg-status-success/20 text-status-success'
                      }`}>
                        {u.is_banned ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === u.id ? null : u.id)}
                          className="p-2 hover:bg-surfacehighlight rounded-lg"
                        >
                          <MoreVertical className="w-5 h-5 text-secondary" />
                        </button>
                        {activeMenu === u.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg border border-surfacehighlight py-1 z-10">
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                showToast('Password reset email sent', 'success');
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfacehighlight flex items-center gap-2"
                            >
                              <Key className="w-4 h-4" />
                              Reset Password
                            </button>
                            {u.is_banned ? (
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  handleUnbanUser(u.id);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-status-success hover:bg-surfacehighlight flex items-center gap-2"
                              >
                                <Check className="w-4 h-4" />
                                Unban User
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  setBanModalUser(u);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-status-danger hover:bg-surfacehighlight flex items-center gap-2"
                              >
                                <Ban className="w-4 h-4" />
                                Ban User
                              </button>
                            )}
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  handlePromoteUser(u.id, u.role);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-accent-primary hover:bg-surfacehighlight flex items-center gap-2"
                              >
                                <UserPlus className="w-4 h-4" />
                                {u.role === 'moderator' ? 'Demote to User' : 'Promote to Moderator'}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                handleDeleteUser(u.id);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-status-danger hover:bg-surfacehighlight flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Pending Posts</h2>
          <p className="text-sm text-secondary mt-1">Review and approve user-submitted content</p>
        </div>
        <div className="bg-surfacehighlight px-4 py-2 rounded-xl">
          <span className="text-2xl font-bold text-primary">{pendingPosts.length}</span>
          <span className="text-sm text-secondary ml-2">pending</span>
        </div>
      </div>

      {pendingPosts.length === 0 ? (
        <div className="bg-surface border border-surfacehighlight rounded-xl p-12 text-center">
          <Check className="w-12 h-12 text-status-success mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">All Caught Up!</h3>
          <p className="text-secondary">No posts pending moderation</p>
        </div>
      ) : (
        pendingPosts.map((post) => (
          <div key={post.post_id} className="bg-surface border border-surfacehighlight rounded-xl overflow-hidden">
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surfacehighlight">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <UserAvatar
                    avatarUrl={post.author_avatar_url}
                    userName={post.author_handle}
                    size="small"
                  />
                  <div>
                    <p className="font-medium text-primary">@{post.author_handle}</p>
                    <p className="text-sm text-secondary">
                      {new Date(post.created_at).toLocaleDateString()} {new Date(post.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-status-warning/20 text-status-warning mb-2">
                    {post.post_type === 'photo' ? 'Photo Post' : post.post_type === 'spotting' ? 'Spotting' : 'Badge Given'}
                  </span>
                  {post.vehicle_make && post.vehicle_model && (
                    <p className="text-sm font-medium text-primary mb-2">
                      {post.vehicle_year} {post.vehicle_make} {post.vehicle_model}
                    </p>
                  )}
                  {post.location_label && (
                    <p className="text-xs text-secondary mb-2"><MapPin className="w-3 h-3 inline" /> {post.location_label}</p>
                  )}
                  {post.caption && (
                    <p className="text-primary mt-2">{post.caption}</p>
                  )}
                </div>

                {post.image_url && (
                  <div className="border border-surfacehighlight rounded-lg overflow-hidden">
                    <img
                      src={post.image_url}
                      alt="Post content"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="p-6 flex flex-col justify-center gap-4">
                <h3 className="text-lg font-semibold text-primary mb-2">Moderation Actions</h3>
                <button
                  onClick={() => handleApprovePost(post.post_id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-status-success text-white rounded-xl hover:bg-status-success/90 font-medium transition-all"
                >
                  <Check className="w-5 h-5" />
                  Approve Post
                </button>
                <button
                  onClick={() => setRejectModalPost(post)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-status-danger text-white rounded-xl hover:bg-status-danger/90 font-medium transition-all"
                >
                  <X className="w-5 h-5" />
                  Reject Post
                </button>
                <p className="text-xs text-secondary text-center mt-2">
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
    <div className="space-y-6">
      {reports.length === 0 ? (
        <div className="bg-surface border border-surfacehighlight rounded-xl p-12 text-center">
          <Shield className="w-12 h-12 text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No Pending Reports</h3>
          <p className="text-secondary">All reports have been reviewed</p>
        </div>
      ) : (
        reports.map((report) => (
          <div key={report.id} className="bg-surface border border-surfacehighlight rounded-xl overflow-hidden">
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surfacehighlight">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <UserAvatar
                    avatarUrl={report.reporter.avatar_url}
                    userName={report.reporter.handle}
                    size="small"
                  />
                  <div>
                    <p className="font-medium text-primary">@{report.reporter.handle}</p>
                    <p className="text-sm text-secondary">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-status-danger/20 text-status-danger mb-2">
                    {report.reason.replace('_', ' ')}
                  </span>
                  <p className="text-primary">{report.description}</p>
                </div>

                {report.content && (
                  <div className="border border-surfacehighlight rounded-lg p-4 bg-surfacehighlight">
                    {report.content.image_url && (
                      <img
                        src={report.content.image_url}
                        alt="Reported content"
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                    )}
                    {report.content.caption && (
                      <p className="text-sm text-primary">{report.content.caption}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 flex flex-col justify-center gap-4">
                <h3 className="text-lg font-semibold text-primary mb-2">Moderation Actions</h3>
                <button
                  onClick={() => handleApproveReport(report.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-status-success text-white rounded-xl hover:bg-status-success/90 font-medium transition-all"
                >
                  <Check className="w-5 h-5" />
                  Approve (No Action)
                </button>
                <button
                  onClick={() => setRejectModalReport(report)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-status-danger text-white rounded-xl hover:bg-status-danger/90 font-medium transition-all"
                >
                  <X className="w-5 h-5" />
                  Reject & Remove Content
                </button>
                <p className="text-xs text-secondary text-center mt-2">
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Vehicle Ownership Claims</h2>
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {pendingClaims.length === 0 ? (
          <div className="text-center py-12 bg-surface border border-surfacehighlight rounded-lg">
            <CheckCircle className="w-16 h-16 text-status-success mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-primary mb-2">All caught up!</h3>
            <p className="text-secondary">No pending vehicle ownership claims to review.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingClaims.map(claim => (
              <div
                key={claim.id}
                className="bg-surface border border-surfacehighlight rounded-xl p-6"
              >
                <div className="flex items-start gap-4">
                  {/* Vehicle Image */}
                  {claim.vehicle?.stock_image_url && (
                    <div className="flex-shrink-0">
                      <img
                        src={claim.vehicle.stock_image_url}
                        alt={`${claim.vehicle.make} ${claim.vehicle.model}`}
                        className="w-32 h-24 object-cover rounded-lg border border-surfacehighlight"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* User Info - Clickable */}
                    <div className="flex items-center gap-3 mb-3">
                      <UserAvatar
                        userId={claim.user?.id || ''}
                        src={claim.user?.avatar_url}
                        size="md"
                      />
                      <div>
                        <button
                          onClick={() => claim.user?.id && onNavigate?.('user-profile', claim.user.id)}
                          className="font-semibold text-primary hover:text-accent-primary transition"
                        >
                          @{claim.user?.handle || 'Unknown'}
                        </button>
                        {claim.user?.location && (
                          <p className="text-xs text-secondary flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {claim.user.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Vehicle Details */}
                    {claim.vehicle && (
                      <div className="bg-surfacehighlight/50 rounded-lg p-3 mb-4">
                        <p className="font-semibold text-primary mb-1">
                          {claim.vehicle.year} {claim.vehicle.make} {claim.vehicle.model}
                        </p>
                        {claim.vehicle.color && (
                          <p className="text-sm text-secondary">
                            Color: {claim.vehicle.color}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Documents */}
                    {claim.document_urls && claim.document_urls.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--t3)' }}>
                          Submitted Documents ({claim.document_urls.length})
                        </p>
                        <div className="grid grid-cols-2 gap-3">
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
                                className="flex items-center gap-2 px-3 py-2 bg-surfacehighlight rounded-lg hover:bg-accent-primary/10 transition text-sm"
                              >
                                <Icon className="w-4 h-4" />
                                {label}
                              </a>
                            ) : (
                              <span
                                key={index}
                                className="flex items-center gap-2 px-3 py-2 bg-surfacehighlight rounded-lg text-sm opacity-50 cursor-not-allowed"
                              >
                                <Icon className="w-4 h-4" />
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-secondary">
                      Submitted {new Date(claim.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleApproveClaim(claim)}
                      className="px-4 py-2 bg-status-success text-white rounded-lg hover:opacity-90 transition flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for rejection (will be shown to user):');
                        if (reason) handleRejectClaim(claim, reason);
                      }}
                      className="px-4 py-2 bg-status-danger text-white rounded-lg hover:opacity-90 transition flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Reject
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">Vehicle Management</h2>
            <p className="text-sm text-secondary mt-1">Search, transfer, and manage vehicle ownership</p>
          </div>
          <button
            onClick={handleLoadClaimedVehicles}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition"
          >
            <RefreshCw className="w-4 h-4" />
            Load All Claimed
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
            <h3 className="font-semibold text-primary mb-4">Search Vehicles</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by plate, make, model, or owner..."
                value={vehicleSearchQuery}
                onChange={(e) => setVehicleSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchVehicles()}
                className="flex-1 px-4 py-2 bg-surfacehighlight border border-surfacehighlight text-primary rounded-lg focus:ring-2 focus:ring-accent-primary"
              />
              <button
                onClick={handleSearchVehicles}
                disabled={vehiclesLoading}
                className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
            <h3 className="font-semibold text-primary mb-4">Search Users (for Transfer/Assign)</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by username or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                className="flex-1 px-4 py-2 bg-surfacehighlight border border-surfacehighlight text-primary rounded-lg focus:ring-2 focus:ring-accent-primary"
              />
              <button
                onClick={handleSearchUsers}
                className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
            {userSearchResults.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
                {userSearchResults.map(u => (
                  <div key={u.user_id} className="flex items-center justify-between p-2 bg-surfacehighlight rounded-lg">
                    <div className="flex items-center gap-2">
                      <UserAvatar userId={u.user_id} src={u.avatar_url} size="sm" />
                      <div>
                        <p className="font-medium text-primary text-sm">@{u.handle}</p>
                        <p className="text-xs text-secondary">{u.vehicle_count} vehicles</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-surface rounded text-secondary">{u.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {vehiclesLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-accent-primary animate-spin" />
          </div>
        ) : (
          <>
            {vehicleSearchResults.length > 0 && (
              <div>
                <h3 className="font-semibold text-primary mb-4">Search Results ({vehicleSearchResults.length})</h3>
                <div className="grid gap-4">
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
                <h3 className="font-semibold text-primary mb-4">All Claimed Vehicles ({claimedVehicles.length})</h3>
                <div className="grid gap-4">
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
              <div className="text-center py-12 bg-surface border border-surfacehighlight rounded-lg">
                <Car className="w-16 h-16 text-secondary mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-primary mb-2">No vehicles to display</h3>
                <p className="text-secondary">Search for a vehicle or click "Load All Claimed" to view claimed vehicles.</p>
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

    const totalUsers = badges.reduce((sum, b) => sum + (b.user_count || 0), 0);
    const avgBadgesPerUser = badges.length > 0 ? (totalUsers / badges.length).toFixed(1) : '0';

    const tierCounts = {
      bronze: badges.filter(b => b.tier === 'bronze').length,
      silver: badges.filter(b => b.tier === 'silver').length,
      gold: badges.filter(b => b.tier === 'gold').length,
      platinum: badges.filter(b => b.tier === 'platinum').length
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Badge System Dashboard</h2>
          <p className="text-sm text-secondary mt-1">Manage badge definitions and track distribution</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Award className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-secondary uppercase tracking-wider">Bronze</p>
                <p className="text-2xl font-bold text-primary">{tierCounts.bronze}</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-surfacehighlight rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-500"
                style={{ width: `${badges.length > 0 ? (tierCounts.bronze / badges.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gray-400/20 rounded-lg">
                <Award className="w-5 h-5 text-gray-300" />
              </div>
              <div>
                <p className="text-xs text-secondary uppercase tracking-wider">Silver</p>
                <p className="text-2xl font-bold text-primary">{tierCounts.silver}</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-surfacehighlight rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-400 transition-all duration-500"
                style={{ width: `${badges.length > 0 ? (tierCounts.silver / badges.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Award className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-secondary uppercase tracking-wider">Gold</p>
                <p className="text-2xl font-bold text-primary">{tierCounts.gold}</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-surfacehighlight rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 transition-all duration-500"
                style={{ width: `${badges.length > 0 ? (tierCounts.gold / badges.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange/20 rounded-lg">
                <Award className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <p className="text-xs text-secondary uppercase tracking-wider">Platinum</p>
                <p className="text-2xl font-bold text-primary">{tierCounts.platinum}</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-surfacehighlight rounded-full overflow-hidden">
              <div
                className="h-full bg-orange transition-all duration-500"
                style={{ width: `${badges.length > 0 ? (tierCounts.platinum / badges.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-accent-primary/20 to-accent-hover/20 border border-accent-primary/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary mb-1">Total Badges</p>
                <p className="text-4xl font-bold text-primary">{badges.length}</p>
              </div>
              <Award className="w-12 h-12 text-accent-primary opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-status-success/20 to-status-success/10 border border-status-success/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary mb-1">Total Awards</p>
                <p className="text-4xl font-bold text-primary">{totalUsers}</p>
              </div>
              <Users className="w-12 h-12 text-status-success opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-status-warning/20 to-status-warning/10 border border-status-warning/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary mb-1">Avg Per Badge</p>
                <p className="text-4xl font-bold text-primary">{avgBadgesPerUser}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-status-warning opacity-50" />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-surfacehighlight rounded-xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary" />
            <input
              type="text"
              placeholder="Search badges by name or description..."
              value={badgeSearchQuery}
              onChange={(e) => setBadgeSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surfacehighlight border border-surfacehighlight text-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
            />
          </div>
        </div>

        {filteredBadges.length === 0 ? (
          <div className="bg-surface border border-surfacehighlight rounded-xl p-12 text-center">
            <Award className="w-12 h-12 text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-primary mb-2">No Badges Found</h3>
            <p className="text-secondary">
              {badges.length === 0 ? 'No badges have been created yet.' : 'No badges match your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-surface border border-surfacehighlight rounded-xl p-6 hover:border-accent-primary/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{badge.icon || <Award className="w-10 h-10 text-orange" />}</div>
                    <div>
                      <h3 className="font-bold text-primary">{badge.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                        badge.tier === 'bronze' ? 'bg-orange-500/20 text-orange-400' :
                        badge.tier === 'silver' ? 'bg-gray-400/20 text-gray-300' :
                        badge.tier === 'gold' ? 'bg-yellow-500/20 text-yellow-400' :
                        badge.tier === 'platinum' ? 'bg-orange/20 text-accent-primary' :
                        'bg-surfacehighlight text-secondary'
                      }`}>
                        {badge.tier}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-secondary mb-4">{badge.description}</p>

                <div className="flex items-center justify-between pt-4 border-t border-surfacehighlight">
                  <div className="text-sm">
                    <span className="text-accent-primary font-bold">{badge.user_count}</span>
                    <span className="text-secondary ml-1">users</span>
                  </div>
                  <div className="text-xs text-secondary">
                    ID: {badge.id.slice(0, 8)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSystemLogs = () => (
    <div className="bg-surface border border-surfacehighlight rounded-xl overflow-hidden">
      <div className="p-6 border-b border-surfacehighlight">
        <h3 className="text-lg font-semibold text-primary">Recent Admin Actions</h3>
      </div>
      <div className="divide-y divide-surfacehighlight">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-secondary mx-auto mb-4" />
            <p className="text-secondary">No admin actions recorded</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-surfacehighlight">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-primary">@{log.admin.handle}</span>
                    <span className="text-sm text-secondary">
                      {log.action_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-secondary">{log.description}</p>
                </div>
                <span className="text-xs text-secondary whitespace-nowrap ml-4">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-surface border border-surfacehighlight rounded-xl p-8 max-w-md text-center shadow-lg">
          <div className="bg-status-danger/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-status-danger" />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-2">Access Denied</h2>
          <p className="text-secondary mb-6">
            You do not have permission to access the admin dashboard.
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('feed')}
              className="bg-gradient-to-r from-accent-primary to-accent-hover text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Return to Feed
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <div className="w-64 bg-surface border-r border-surfacehighlight flex flex-col">
          <div className="p-6 border-b border-surfacehighlight">
            <h1 className="text-xl font-bold text-primary">Admin Dashboard</h1>
          </div>

          <nav className="flex-1 p-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                activeTab === 'overview'
                  ? 'bg-accent-primary/20 text-accent-primary font-medium'
                  : 'text-secondary hover:bg-surfacehighlight'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                activeTab === 'users'
                  ? 'bg-accent-primary/20 text-accent-primary font-medium'
                  : 'text-secondary hover:bg-surfacehighlight'
              }`}
            >
              <Users className="w-5 h-5" />
              User Management
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                activeTab === 'posts'
                  ? 'bg-accent-primary/20 text-accent-primary font-medium'
                  : 'text-secondary hover:bg-surfacehighlight'
              }`}
            >
              <Car className="w-5 h-5" />
              Pending Posts
              {pendingPosts.length > 0 && (
                <span className="ml-auto bg-status-warning text-white text-xs font-bold px-2 py-1 rounded-full">
                  {pendingPosts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('moderation')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                activeTab === 'moderation'
                  ? 'bg-accent-primary/20 text-accent-primary font-medium'
                  : 'text-secondary hover:bg-surfacehighlight'
              }`}
            >
              <Shield className="w-5 h-5" />
              Reports
              {reports.length > 0 && (
                <span className="ml-auto bg-status-danger text-white text-xs font-bold px-2 py-1 rounded-full">
                  {reports.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('claims')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                activeTab === 'claims'
                  ? 'bg-accent-primary/20 text-accent-primary font-medium'
                  : 'text-secondary hover:bg-surfacehighlight'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              Vehicle Claims
              {pendingClaims.length > 0 && (
                <span className="ml-auto bg-status-warning text-white text-xs font-bold px-2 py-1 rounded-full">
                  {pendingClaims.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                activeTab === 'vehicles'
                  ? 'bg-accent-primary/20 text-accent-primary font-medium'
                  : 'text-secondary hover:bg-surfacehighlight'
              }`}
            >
              <Car className="w-5 h-5" />
              Vehicle Management
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                activeTab === 'logs'
                  ? 'bg-accent-primary/20 text-accent-primary font-medium'
                  : 'text-secondary hover:bg-surfacehighlight'
              }`}
            >
              <FileText className="w-5 h-5" />
              System Logs
            </button>
            <button
              onClick={() => setActiveTab('badges')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                activeTab === 'badges'
                  ? 'bg-accent-primary/20 text-accent-primary font-medium'
                  : 'text-secondary hover:bg-surfacehighlight'
              }`}
            >
              <Award className="w-5 h-5" />
              Badges
              {badges.length > 0 && (
                <span className="ml-auto bg-accent-primary/20 text-accent-primary text-xs font-bold px-2 py-1 rounded-full">
                  {badges.length}
                </span>
              )}
            </button>
          </nav>

          <div className="p-4 border-t border-surfacehighlight">
            <button
              onClick={() => onNavigate && onNavigate('feed')}
              className="w-full px-4 py-2 text-secondary hover:bg-surfacehighlight rounded-lg flex items-center gap-2 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to App
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
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
