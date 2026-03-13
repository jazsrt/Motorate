import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { hashPlate } from '../lib/hash';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  ArrowLeft, Star, User, Camera, AlertCircle, Key, ChevronLeft,
  Award, TrendingUp, ThumbsUp, ThumbsDown, MessageCircle, Eye,
  Sparkles, Shield, Car
} from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { ClaimVehicleModalVerification } from '../components/ClaimVehicleModalVerification';
import { GuestBottomNav } from '../components/GuestBottomNav';
import { UserAvatar } from '../components/UserAvatar';

interface Post {
  id: string;
  caption: string | null;
  image_url: string | null;
  video_url: string | null;
  rating_vehicle: number | null;
  rating_driver: number | null;
  rating_driving: number | null;
  location_label: string | null;
  created_at: string;
  author_id: string;
  author: {
    username?: string;
    handle: string;
    avatar_url: string | null;
  };
}

interface BumperSticker {
  tag: string;
  count: number;
  isPositive: boolean;
}

interface ShadowProfilePageProps {
  plateNumber: string;
  onNavigate: (page: any, vehicleId?: string) => void;
}

export default function ShadowProfilePage({ plateNumber, onNavigate }: ShadowProfilePageProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<any>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [bumperStickers, setBumperStickers] = useState<BumperSticker[]>([]);
  const [averageRatings, setAverageRatings] = useState({
    vehicle: 0,
    driver: 0,
    driving: 0,
  });
  const [plateState, setPlateState] = useState('');
  const [plateNum, setPlateNum] = useState('');

  useEffect(() => {
    if (plateNumber) {
      loadPlateData();
    } else {
      // No plateNumber provided
    }
  }, [plateNumber]);

  const loadPlateData = async () => {
    if (!plateNumber) return;

    setLoading(true);
    try {
      const decodedPlate = decodeURIComponent(plateNumber);
      const [state, num] = decodedPlate.split('-');

      if (!state || !num) {
        console.error('Invalid plate format:', { state, num, decodedPlate });
        setLoading(false);
        return;
      }

      setPlateState(state);
      setPlateNum(num);

      const plateHash = await hashPlate(state, num);

      const { data: vehicle, error: queryError } = await supabase
        .from('vehicles')
        .select('id, owner_id, is_claimed, make, model, year, color, stock_image_url')
        .eq('plate_hash', plateHash)
        .maybeSingle();

      if (queryError) {
        console.error('Database query error:', queryError);
        throw queryError;
      }

      if (vehicle) {
        setIsActive(vehicle.is_claimed);
        setVehicleId(vehicle.id);
        setVehicleDetails(vehicle);

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id,
            caption,
            image_url,
            video_url,
            rating_vehicle,
            rating_driver,
            rating_driving,
            location_label,
            created_at,
            author_id,
            author:profiles!posts_author_id_fkey (
              username,
              handle,
              avatar_url
            )
          `)
          .eq('vehicle_id', vehicle.id)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        setPosts((postsData as any) || []);

        // Calculate average ratings
        if (postsData && postsData.length > 0) {
          const sums = postsData.reduce(
            (acc, post) => ({
              vehicle: acc.vehicle + (post.rating_vehicle || 0),
              driver: acc.driver + (post.rating_driver || 0),
              driving: acc.driving + (post.rating_driving || 0),
              vehicleCount: acc.vehicleCount + (post.rating_vehicle ? 1 : 0),
              driverCount: acc.driverCount + (post.rating_driver ? 1 : 0),
              drivingCount: acc.drivingCount + (post.rating_driving ? 1 : 0),
            }),
            { vehicle: 0, driver: 0, driving: 0, vehicleCount: 0, driverCount: 0, drivingCount: 0 }
          );

          setAverageRatings({
            vehicle: sums.vehicleCount > 0 ? sums.vehicle / sums.vehicleCount : 0,
            driver: sums.driverCount > 0 ? sums.driver / sums.driverCount : 0,
            driving: sums.drivingCount > 0 ? sums.driving / sums.drivingCount : 0,
          });
        }

        // Fetch and aggregate bumper stickers
        const { data: tags } = await supabase
          .from('review_tags')
          .select('tag_label, post_id')
          .in(
            'post_id',
            postsData?.map((p) => p.id) || []
          );

        if (tags) {
          const VEHICLE_TAGS = [
            'Nice Wrap', 'Nice Wheels', 'Gorgeous Car', 'Nice Exhaust', 'Love the Color',
            'Dream Car', 'Super Clean', 'Mint Condition', 'Mean Stance', 'Factory Fresh',
            'Head Turner', 'Daily Driver', 'Track Ready', 'Rare Spec', 'Weekend Toy',
            'Show Car', 'Sleeper', 'Classic', 'Work in Progress'
          ];

          const tagCounts = tags.reduce((acc: Record<string, number>, tag) => {
            acc[tag.tag_label] = (acc[tag.tag_label] || 0) + 1;
            return acc;
          }, {});

          const stickerArray: BumperSticker[] = Object.entries(tagCounts)
            .map(([tag, count]) => ({
              tag,
              count,
              isPositive: VEHICLE_TAGS.includes(tag),
            }))
            .sort((a, b) => b.count - a.count);

          setBumperStickers(stickerArray);
        }
      } else {
        // No vehicle found for this plate
      }
    } catch (error) {
      console.error('Error loading plate data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (!vehicleDetails) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-surface border border-surfacehighlight rounded-2xl p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold mb-2">Vehicle Not Found</h2>
            <p className="text-secondary mb-6">
              No data found for this license plate.
            </p>
            <button
              onClick={() => onNavigate('feed')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent-primary hover:bg-accent-hover rounded-xl font-bold transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Feed
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const vehicleDisplay = vehicleDetails.make && vehicleDetails.model
    ? `${vehicleDetails.year || ''} ${vehicleDetails.make} ${vehicleDetails.model}`.trim()
    : 'Unknown Vehicle';

  const positiveStickers = bumperStickers.filter(s => s.isPositive);
  const negativeStickers = bumperStickers.filter(s => !s.isPositive);

  return (
    <Layout currentPage="feed" onNavigate={onNavigate}>
      <div className="max-w-5xl mx-auto pb-24">
        {/* Hero Header with Glassmorphism */}
        <div className="relative mb-8 overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 via-[#fb923c]/20 to-pink-500/20 backdrop-blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.3),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(244,114,182,0.2),transparent_50%)]" />

          <div className="relative p-8 space-y-6">
            <button
              onClick={() => onNavigate('feed')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface/80 backdrop-blur-sm hover:bg-surfacehighlight rounded-xl transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-bold">Back</span>
            </button>

            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
              {/* Vehicle Image */}
              {vehicleDetails.stock_image_url ? (
                <img
                  src={vehicleDetails.stock_image_url}
                  alt={vehicleDisplay}
                  className="w-full lg:w-48 h-48 rounded-2xl object-cover border-4 border-accent-primary/30 shadow-2xl shadow-accent-primary/20"
                />
              ) : (
                <div className="w-full lg:w-48 h-48 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-[#fb923c]/20 border-4 border-accent-primary/30 flex items-center justify-center shadow-2xl">
                  <Car className="w-24 h-24 text-accent-primary" />
                </div>
              )}

              {/* Vehicle Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl lg:text-5xl font-heading font-bold uppercase tracking-tight bg-gradient-to-r from-white via-accent-primary to-[#fb923c] bg-clip-text text-transparent">
                      {vehicleDisplay}
                    </h1>
                    {!isActive && (
                      <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold border border-orange-500/50">
                        UNCLAIMED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 bg-surface/80 backdrop-blur-sm rounded-xl border border-surfacehighlight w-fit">
                    <span className="text-xs font-bold text-secondary uppercase">Plate:</span>
                    <span className="font-mono font-bold text-lg tracking-wider">{plateState}-{plateNum}</span>
                  </div>

                  {vehicleDetails.color && (
                    <p className="text-sm text-secondary mt-2">
                      <span className="font-bold">Color:</span> {vehicleDetails.color}
                    </p>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface/80 backdrop-blur-sm rounded-xl p-3 border border-surfacehighlight text-center">
                    <div className="text-2xl font-bold text-accent-primary">{posts.length}</div>
                    <div className="text-xs font-bold text-secondary uppercase">Spots</div>
                  </div>
                  <div className="bg-surface/80 backdrop-blur-sm rounded-xl p-3 border border-surfacehighlight text-center">
                    <div className="text-2xl font-bold text-yellow-500">{averageRatings.vehicle.toFixed(1)}</div>
                    <div className="text-xs font-bold text-secondary uppercase">Vehicle</div>
                  </div>
                  <div className="bg-surface/80 backdrop-blur-sm rounded-xl p-3 border border-surfacehighlight text-center">
                    <div className="text-2xl font-bold text-accent-primary">{averageRatings.driver.toFixed(1)}</div>
                    <div className="text-xs font-bold text-secondary uppercase">Driver</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Claim CTA */}
            {!isActive && user && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 border-2 border-green-500/50 backdrop-blur-sm shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Award className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-heading font-bold mb-2 text-green-300">
                      Is This Your Vehicle?
                    </h3>
                    <p className="text-sm text-secondary mb-4">
                      Claim this plate to manage its profile, respond to spots, and showcase your ride to the community.
                    </p>
                    <button
                      onClick={() => setShowClaimModal(true)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl px-6 py-3 font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-green-500/30"
                    >
                      Claim This Plate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Community Ratings */}
        {posts.length > 0 && (
          <div className="mb-8 bg-gradient-to-br from-surface via-surfacehighlight to-surface border border-surfacehighlight rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Star className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-heading font-bold uppercase tracking-tight">Community Ratings</h2>
              <span className="text-sm text-secondary">({posts.length} review{posts.length !== 1 ? 's' : ''})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-surfacehighlight/50 backdrop-blur-sm rounded-xl border border-yellow-500/20">
                <div className="text-xs font-bold text-secondary uppercase mb-2">The Vehicle</div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl font-bold text-yellow-500">{averageRatings.vehicle.toFixed(1)}</div>
                  <div className="text-sm text-secondary">/ 5.0</div>
                </div>
                <StarRating value={averageRatings.vehicle} onChange={() => {}} readOnly size="large" />
              </div>

              <div className="p-5 bg-surfacehighlight/50 backdrop-blur-sm rounded-xl border border-orange/20">
                <div className="text-xs font-bold text-secondary uppercase mb-2">The Driver</div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl font-bold text-accent-primary">{averageRatings.driver.toFixed(1)}</div>
                  <div className="text-sm text-secondary">/ 5.0</div>
                </div>
                <StarRating value={averageRatings.driver} onChange={() => {}} readOnly size="large" />
              </div>

              <div className="p-5 bg-surfacehighlight/50 backdrop-blur-sm rounded-xl border border-orange-500/20">
                <div className="text-xs font-bold text-secondary uppercase mb-2">The Driving</div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl font-bold text-accent-2">{averageRatings.driving.toFixed(1)}</div>
                  <div className="text-sm text-secondary">/ 5.0</div>
                </div>
                <StarRating value={averageRatings.driving} onChange={() => {}} readOnly size="large" />
              </div>
            </div>
          </div>
        )}

        {/* Bumper Stickers */}
        {bumperStickers.length > 0 && (
          <div className="mb-8 space-y-6">
            {positiveStickers.length > 0 && (
              <div className="bg-gradient-to-br from-surface via-surfacehighlight to-surface border border-surfacehighlight rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <ThumbsUp className="w-6 h-6 text-green-400" />
                  <h2 className="text-xl font-heading font-bold uppercase tracking-tight">Vehicle Highlights</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {positiveStickers.map((sticker) => (
                    <div
                      key={sticker.tag}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg shadow-green-500/20 flex items-center gap-2"
                    >
                      <span className="font-bold text-sm">{sticker.tag}</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                        {sticker.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {negativeStickers.length > 0 && (
              <div className="bg-gradient-to-br from-surface via-surfacehighlight to-surface border border-surfacehighlight rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <ThumbsDown className="w-6 h-6 text-red-400" />
                  <h2 className="text-xl font-heading font-bold uppercase tracking-tight">Driver Behavior</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {negativeStickers.map((sticker) => (
                    <div
                      key={sticker.tag}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 shadow-lg shadow-red-500/20 flex items-center gap-2"
                    >
                      <span className="font-bold text-sm">{sticker.tag}</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                        {sticker.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reviews */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-heading font-bold uppercase tracking-tight flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-accent-primary" />
              All Spots
            </h2>
            <button
              onClick={() =>
                onNavigate('scan', {
                  plateState,
                  plateNumber: plateNum,
                })
              }
              className="bg-gradient-to-r from-accent-primary to-[#fb923c] hover:shadow-lg hover:shadow-accent-primary/30 rounded-xl px-6 py-3 font-bold uppercase tracking-wider text-sm transition-all active:scale-95"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Add Review
              </span>
            </button>
          </div>

          {posts.length === 0 ? (
            <div className="bg-surface border-2 border-dashed border-surfacehighlight rounded-2xl p-12 text-center">
              <Camera className="w-16 h-16 mx-auto mb-4 text-secondary" />
              <h3 className="text-xl font-bold mb-2">No Spots Yet</h3>
              <p className="text-secondary mb-6">Be the first to review this vehicle!</p>
              <button
                onClick={() =>
                  onNavigate('scan', {
                    plateState,
                    plateNumber: plateNum,
                  })
                }
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-primary to-[#fb923c] hover:shadow-lg rounded-xl font-bold transition-all"
              >
                <Star className="w-5 h-5" />
                Leave First Review
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-gradient-to-br from-surface via-surfacehighlight to-surface border border-surfacehighlight rounded-2xl p-6 shadow-xl hover:shadow-accent-primary/20 transition-all"
                >
                  {/* Author Info */}
                  <div className="flex items-start gap-4 mb-4">
                    <UserAvatar
                      avatarUrl={post.author.avatar_url}
                      handle={post.author.handle}
                      size="large"
                      className="border-2 border-accent-primary/50"
                    />
                    <div className="flex-1">
                      <div className="font-bold">@{post.author.handle}</div>
                      <div className="text-xs text-secondary">
                        {new Date(post.created_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>

                    {/* Ratings */}
                    <div className="flex flex-col gap-2">
                      {post.rating_vehicle && (
                        <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg">
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-sm font-bold">{post.rating_vehicle}</span>
                          <span className="text-xs text-secondary">Vehicle</span>
                        </div>
                      )}
                      {post.rating_driver && (
                        <div className="flex items-center gap-1 bg-orange/10 px-2 py-1 rounded-lg">
                          <Star className="w-4 h-4 fill-[#F97316] text-accent-primary" />
                          <span className="text-sm font-bold">{post.rating_driver}</span>
                          <span className="text-xs text-secondary">Driver</span>
                        </div>
                      )}
                      {post.rating_driving && (
                        <div className="flex items-center gap-1 bg-accent-2/10 px-2 py-1 rounded-lg">
                          <Star className="w-4 h-4 fill-[#fb923c] text-accent-2" />
                          <span className="text-sm font-bold">{post.rating_driving}</span>
                          <span className="text-xs text-secondary">Driving</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Media */}
                  {post.image_url && !post.video_url && (
                    <img
                      src={post.image_url}
                      alt="Review"
                      className="w-full rounded-xl mb-4 max-h-96 object-cover"
                    />
                  )}
                  {post.video_url && (
                    <video
                      src={post.video_url}
                      controls
                      className="w-full rounded-xl mb-4 max-h-96"
                    />
                  )}

                  {/* Caption */}
                  {post.caption && (
                    <p className="text-sm leading-relaxed mb-3">{post.caption}</p>
                  )}

                  {/* Location */}
                  {post.location_label && (
                    <div className="text-xs text-secondary flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Spotted in {post.location_label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showClaimModal && vehicleId && vehicleDetails && user && (
        <ClaimVehicleModalVerification
          vehicleId={vehicleId}
          userId={user.id}
          vehicleInfo={{
            make: vehicleDetails.make || 'Unknown',
            model: vehicleDetails.model || 'Unknown',
            year: vehicleDetails.year || 0,
            color: vehicleDetails.color || 'Unknown',
            plateState: vehicleDetails.state || '',
            plateNumber: plateNumber,
          }}
          onClose={() => setShowClaimModal(false)}
          onSuccess={() => {
            setShowClaimModal(false);
            loadPlateData();
          }}
        />
      )}

      {!user && <GuestBottomNav onNavigate={onNavigate} />}
    </Layout>
  );
}
