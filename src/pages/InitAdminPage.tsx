import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Shield,
  Users,
  TrendingUp,
  Search,
  Ban,
  CheckCircle,
  BarChart3,
  Award,
  Activity,
  Video,
  Car
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface InitAdminPageProps {
  onNavigate?: (page: 'admin' | 'feed') => void;
}

interface AdminStats {
  total_users: number;
  total_posts: number;
  total_reviews: number;
  total_vehicles: number;
  badge_counts: Array<{ badge_id: string; badge_name: string; count: number }>;
  recent_users: Array<{
    id: string;
    handle: string;
    role: string;
    avatar_url: string;
    reputation_score: number;
    created_at: string;
  }>;
  economy_stats: {
    total_heat: number;
    avg_rating_driver: number;
    avg_rating_vehicle: number;
    video_post_percentage: number;
    posts_with_vehicles: number;
    scout_count: number;
    judge_count: number;
    spectator_count: number;
  };
}

type TabType = 'users' | 'economy';

export default function InitAdminPage({ onNavigate }: InitAdminPageProps = {}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAdminStats();
    }
  }, [user]);

  async function fetchAdminStats() {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch all stats in parallel
      const [
        usersResult,
        postsResult,
        reviewsResult,
        vehiclesResult,
        rolesResult
      ] = await Promise.all([
        supabase.from('profiles').select('id, handle, role, avatar_url, reputation_score, created_at').order('created_at', { ascending: false }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('ratings').select('id', { count: 'exact', head: true }),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('role')
      ]);

      // Calculate role distribution
      const roles = rolesResult.data || [];
      const scout_count = roles.filter(r => r.role === 'scout').length;
      const judge_count = roles.filter(r => r.role === 'judge').length;
      const spectator_count = roles.filter(r => !r.role || r.role === 'spectator').length;

      // For now, use mock data for some stats
      const total_heat = Math.round(Math.random() * 10000);
      const avg_rating_driver = Math.round(Math.random() * 5);
      const avg_rating_vehicle = Math.round(Math.random() * 5);

      const statsData: AdminStats = {
        total_users: usersResult.data?.length || 0,
        total_posts: postsResult.count || 0,
        total_reviews: reviewsResult.count || 0,
        total_vehicles: vehiclesResult.count || 0,
        badge_counts: [],
        recent_users: (usersResult.data || []).map(u => ({
          id: u.id,
          handle: u.handle || '',
          role: u.role || 'spectator',
          avatar_url: u.avatar_url || '',
          reputation_score: u.reputation_score || 0,
          created_at: u.created_at
        })),
        economy_stats: {
          total_heat,
          avg_rating_driver,
          avg_rating_vehicle,
          video_post_percentage: 0,
          posts_with_vehicles: postsResult.count || 0,
          scout_count,
          judge_count,
          spectator_count
        }
      };

      setStats(statsData);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      showToast('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleBanUser(userId: string, handle: string) {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'banned' })
        .eq('id', userId);

      if (error) throw error;

      showToast(`Banned user ${handle}`, 'success');
      await fetchAdminStats();
    } catch (error) {
      console.error('Error banning user:', error);
      showToast('Failed to ban user', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleVerifyOwner(userId: string, handle: string) {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'judge' })
        .eq('id', userId);

      if (error) throw error;

      showToast(`Verified ${handle} as owner`, 'success');
      await fetchAdminStats();
    } catch (error) {
      console.error('Error verifying owner:', error);
      showToast('Failed to verify owner', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  const filteredUsers = stats?.recent_users.filter(u =>
    u.handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Admin Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 border-b border-gray-700 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Admin Command Center</h1>
                <p className="text-gray-400 text-sm">Manage users and monitor economy</p>
              </div>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('feed')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Back to Feed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-accent-primary" />
              <span className="text-2xl font-bold text-white">{stats?.total_users}</span>
            </div>
            <p className="text-gray-400 text-sm">Total Users</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-6 h-6 text-green-400" />
              <span className="text-2xl font-bold text-white">{stats?.total_posts}</span>
            </div>
            <p className="text-gray-400 text-sm">Total Posts</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-6 h-6 text-accent-2" />
              <span className="text-2xl font-bold text-white">{stats?.total_reviews}</span>
            </div>
            <p className="text-gray-400 text-sm">Total Reviews</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Car className="w-6 h-6 text-orange-400" />
              <span className="text-2xl font-bold text-white">{stats?.total_vehicles}</span>
            </div>
            <p className="text-gray-400 text-sm">Total Vehicles</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                <span>User Roster</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('economy')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'economy'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>Economy Health</span>
              </div>
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'users' && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by username or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* User Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Avatar</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Username</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">User ID</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Role</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Rep</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                          <td className="py-3 px-4">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.handle}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                                {user.handle?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-white font-medium">{user.handle || 'Anonymous'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-gray-300 text-xs font-mono">{user.id.substring(0, 8)}...</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                              user.role === 'judge' ? 'bg-accent-2/20 text-accent-2' :
                              user.role === 'scout' ? 'bg-orange/20 text-accent-primary' :
                              user.role === 'banned' ? 'bg-gray-500/20 text-gray-400' :
                              'bg-gray-600/20 text-gray-400'
                            }`}>
                              {user.role || 'spectator'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-orange-400 font-semibold">{user.reputation_score}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {user.role !== 'admin' && user.role !== 'banned' && (
                                <>
                                  <button
                                    onClick={() => handleVerifyOwner(user.id, user.handle)}
                                    disabled={actionLoading === user.id}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50 text-sm"
                                    title="Verify as Owner (Judge)"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Verify</span>
                                  </button>
                                  <button
                                    onClick={() => handleBanUser(user.id, user.handle)}
                                    disabled={actionLoading === user.id}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 text-sm"
                                    title="Ban User"
                                  >
                                    <Ban className="w-4 h-4" />
                                    <span>Ban</span>
                                  </button>
                                </>
                              )}
                              {user.role === 'admin' && (
                                <span className="text-gray-500 text-sm italic">Admin</span>
                              )}
                              {user.role === 'banned' && (
                                <span className="text-gray-500 text-sm italic">Banned</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No users found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'economy' && stats && (
              <div className="space-y-6">
                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-orange-400" />
                      </div>
                      <h3 className="font-semibold text-white">Total Heat Generated</h3>
                    </div>
                    <p className="text-3xl font-bold text-orange-400">
                      {stats.economy_stats.total_heat.toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">Combined driver + cool scores</p>
                  </div>

                  <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-orange/20 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-accent-primary" />
                      </div>
                      <h3 className="font-semibold text-white">Avg Quality Score</h3>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-2xl font-bold text-accent-primary">
                          {stats.economy_stats.avg_rating_driver}
                        </p>
                        <p className="text-gray-400 text-xs">Driver</p>
                      </div>
                      <div className="border-l border-gray-600 pl-4">
                        <p className="text-2xl font-bold text-accent-2">
                          {stats.economy_stats.avg_rating_vehicle}
                        </p>
                        <p className="text-gray-400 text-xs">Vehicle</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Video className="w-6 h-6 text-green-400" />
                      </div>
                      <h3 className="font-semibold text-white">Video Upload %</h3>
                    </div>
                    <p className="text-3xl font-bold text-green-400">
                      {stats.economy_stats.video_post_percentage}%
                    </p>
                    <p className="text-gray-400 text-sm mt-1">Posts with vehicles: {stats.economy_stats.posts_with_vehicles}</p>
                  </div>
                </div>

                {/* User Distribution Chart */}
                <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Award className="w-6 h-6 text-orange-400" />
                    User Role Distribution
                  </h3>
                  <div className="space-y-4">
                    {/* Scouts */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-accent-primary font-semibold">Scouts</span>
                        <span className="text-white font-bold">{stats.economy_stats.scout_count}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#F97316] to-[#fb923c] h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(stats.economy_stats.scout_count / stats.total_users) * 100}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Judges */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-accent-2 font-semibold">Judges (Verified Owners)</span>
                        <span className="text-white font-bold">{stats.economy_stats.judge_count}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#fb923c] to-[#fb923c] h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(stats.economy_stats.judge_count / stats.total_users) * 100}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Spectators */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 font-semibold">Spectators</span>
                        <span className="text-white font-bold">{stats.economy_stats.spectator_count}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-gray-500 to-gray-400 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(stats.economy_stats.spectator_count / stats.total_users) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-300 text-sm mb-2">
                      <span className="font-semibold text-white">Economy Balance:</span> The gamification system works best with a healthy mix of content creators (Scouts) and vehicle owners (Judges).
                    </p>
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>• Ideal Scout:Judge ratio: 3:1</span>
                      <span>• Current ratio: {
                        stats.economy_stats.judge_count > 0
                          ? `${Math.round(stats.economy_stats.scout_count / stats.economy_stats.judge_count)}:1`
                          : 'N/A'
                      }</span>
                    </div>
                  </div>
                </div>

                {/* Badge Distribution */}
                {stats.badge_counts.length > 0 && (
                  <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                    <h3 className="text-xl font-bold text-white mb-4">Badge Distribution</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {stats.badge_counts.map((badge) => (
                        <div key={badge.badge_id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                          <p className="text-white font-semibold text-sm mb-1">{badge.badge_name}</p>
                          <p className="text-orange-400 text-xl font-bold">{badge.count}</p>
                          <p className="text-gray-500 text-xs">in circulation</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
