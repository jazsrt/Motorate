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
import { VinClaimModal } from '../components/VinClaimModal';
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (!vehicleDetails) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div style={{ maxWidth: 672, margin: '0 auto', padding: 24 }}>
          <div style={{
            background: '#0a0d14',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 48,
            textAlign: 'center',
          }}>
            <AlertCircle style={{ width: 64, height: 64, margin: '0 auto 16px', color: '#f87171' }} />
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: '#eef4f8',
              marginBottom: 8,
            }}>Vehicle Not Found</h2>
            <p style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 13,
              color: '#7a8e9e',
              marginBottom: 24,
            }}>
              No data found for this license plate.
            </p>
            <button
              onClick={() => onNavigate('feed')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: '#f97316',
                borderRadius: 8,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: '#000',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft style={{ width: 18, height: 18 }} />
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

  const overallAvg = posts.length > 0
    ? ((averageRatings.vehicle + averageRatings.driver + averageRatings.driving) / 3).toFixed(1)
    : '0.0';

  const positiveStickers = bumperStickers.filter(s => s.isPositive);
  const negativeStickers = bumperStickers.filter(s => !s.isPositive);

  return (
    <Layout currentPage="feed" onNavigate={onNavigate}>
      <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 96, background: '#060910' }}>

        {/* Hero Section - 220px */}
        <div style={{ position: 'relative', width: '100%', height: 220, overflow: 'hidden' }}>
          {vehicleDetails.stock_image_url ? (
            <>
              <img
                src={vehicleDetails.stock_image_url}
                alt={vehicleDisplay}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'brightness(0.55) saturate(0.7)',
                }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(3,5,8,0.98) 0%, rgba(3,5,8,0.4) 60%, transparent 100%)',
              }} />
            </>
          ) : (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#080b12',
              backgroundImage: 'linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(3,5,8,0.98) 0%, rgba(3,5,8,0.4) 60%, transparent 100%)',
              }} />
            </div>
          )}

          {/* Back Button */}
          <button
            onClick={() => onNavigate('feed')}
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(6,9,14,0.75)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#eef4f8',
              padding: 0,
              zIndex: 10,
            }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>

          {/* UNCLAIMED badge */}
          {!isActive && (
            <div style={{
              position: 'absolute',
              top: 18,
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
              color: '#7a8e9e',
              zIndex: 10,
            }}>
              UNCLAIMED
            </div>
          )}

          {/* Bottom text overlay */}
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
          }}>
            {/* Make/model label */}
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase' as const,
              color: 'rgba(249,115,22,0.88)',
              marginBottom: 4,
            }}>
              {vehicleDisplay}
            </div>
            {/* Plate number */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 24,
              fontWeight: 600,
              color: '#eef4f8',
              letterSpacing: '0.18em',
            }}>
              {plateState}-{plateNum}
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          background: '#0a0d14',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: '#eef4f8',
            }}>{posts.length}</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              color: '#445566',
            }}>Spots</div>
          </div>
          <div style={{
            textAlign: 'center',
            padding: '12px 0',
            borderLeft: '1px solid rgba(255,255,255,0.04)',
            borderRight: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: '#eef4f8',
            }}>{overallAvg}</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              color: '#445566',
            }}>Avg Rating</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: '#eef4f8',
            }}>{bumperStickers.length}</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              color: '#445566',
            }}>Stickers</div>
          </div>
        </div>

        {/* Claim CTA */}
        {!isActive && user && (
          <div style={{
            margin: '16px 16px 0',
            padding: 16,
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.25)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: '#eef4f8',
                marginBottom: 2,
              }}>Is this your vehicle?</div>
              <div style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: 10,
                color: '#7a8e9e',
              }}>Claim to manage profile &amp; respond to reviews</div>
            </div>
            <button
              onClick={() => setShowClaimModal(true)}
              style={{
                padding: '8px 18px',
                background: '#f97316',
                borderRadius: 6,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                color: '#000',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap' as const,
              }}
            >
              Claim
            </button>
          </div>
        )}

        {/* Bumper Stickers */}
        {bumperStickers.length > 0 && (
          <div style={{ padding: '16px 16px 0' }}>
            {positiveStickers.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: '#445566',
                  marginBottom: 8,
                }}>Vehicle Highlights</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {positiveStickers.map((sticker) => (
                    <div
                      key={sticker.tag}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 4,
                        background: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.2)',
                      }}
                    >
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase' as const,
                        color: '#4ade80',
                      }}>{sticker.tag}</span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 8,
                        fontWeight: 600,
                        color: 'rgba(74,222,128,0.6)',
                      }}>{sticker.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {negativeStickers.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: '#445566',
                  marginBottom: 8,
                }}>Driver Behavior</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {negativeStickers.map((sticker) => (
                    <div
                      key={sticker.tag}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 4,
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                      }}
                    >
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase' as const,
                        color: '#f87171',
                      }}>{sticker.tag}</span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 8,
                        fontWeight: 600,
                        color: 'rgba(248,113,113,0.6)',
                      }}>{sticker.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section label */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 16px 6px',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase' as const,
            color: '#445566',
          }}>All Spots</div>
          <button
            onClick={() =>
              onNavigate('scan', {
                plateState,
                plateNumber: plateNum,
              })
            }
            style={{
              padding: '5px 12px',
              background: '#f97316',
              borderRadius: 5,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: '#000',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Sparkles style={{ width: 10, height: 10 }} />
            Add Review
          </button>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div style={{
            margin: '0 16px',
            padding: 40,
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: 10,
            textAlign: 'center',
          }}>
            <Camera style={{ width: 40, height: 40, margin: '0 auto 12px', color: '#445566' }} />
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: '#7a8e9e',
              marginBottom: 6,
            }}>No Spots Yet</div>
            <div style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 11,
              color: '#445566',
              marginBottom: 16,
            }}>Be the first to review this vehicle!</div>
            <button
              onClick={() =>
                onNavigate('scan', {
                  plateState,
                  plateNumber: plateNum,
                })
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: '#f97316',
                borderRadius: 6,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                color: '#000',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Star style={{ width: 12, height: 12 }} />
              Leave First Review
            </button>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <div
                key={post.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
              >
                {/* Author row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <UserAvatar
                    avatarUrl={post.author.avatar_url}
                    handle={post.author.handle}
                    size="small"
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                      color: '#eef4f8',
                    }}>@{post.author.handle}</div>
                    <div style={{
                      fontFamily: "'Barlow', sans-serif",
                      fontSize: 8,
                      color: '#445566',
                    }}>
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  {/* Ratings compact */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {post.rating_vehicle && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Star style={{ width: 10, height: 10, fill: '#f97316', color: '#f97316' }} />
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#eef4f8',
                        }}>{post.rating_vehicle}</span>
                      </div>
                    )}
                    {post.rating_driver && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Star style={{ width: 10, height: 10, fill: '#f97316', color: '#f97316' }} />
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#eef4f8',
                        }}>{post.rating_driver}</span>
                      </div>
                    )}
                    {post.rating_driving && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Star style={{ width: 10, height: 10, fill: '#fb923c', color: '#fb923c' }} />
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#eef4f8',
                        }}>{post.rating_driving}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Media */}
                {post.image_url && !post.video_url && (
                  <img
                    src={post.image_url}
                    alt="Review"
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      marginBottom: 8,
                      maxHeight: 280,
                      objectFit: 'cover',
                    }}
                  />
                )}
                {post.video_url && (
                  <video
                    src={post.video_url}
                    controls
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      marginBottom: 8,
                      maxHeight: 280,
                    }}
                  />
                )}

                {/* Caption */}
                {post.caption && (
                  <p style={{
                    fontFamily: "'Barlow', sans-serif",
                    fontSize: 12,
                    color: '#7a8e9e',
                    lineHeight: 1.5,
                    margin: 0,
                    marginBottom: 4,
                  }}>{post.caption}</p>
                )}

                {/* Location */}
                {post.location_label && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontFamily: "'Barlow', sans-serif",
                    fontSize: 9,
                    color: '#445566',
                    marginTop: 4,
                  }}>
                    <Eye style={{ width: 9, height: 9 }} />
                    Spotted in {post.location_label}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showClaimModal && vehicleId && vehicleDetails && user && (
        <VinClaimModal
          vehicleId={vehicleId}
          vehicleInfo={{
            make: vehicleDetails.make,
            model: vehicleDetails.model,
            year: vehicleDetails.year,
            color: vehicleDetails.color,
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
