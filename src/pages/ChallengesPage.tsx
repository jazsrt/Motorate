import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { MapPin, Trophy, CheckCircle2, Navigation } from 'lucide-react';
import { OnNavigate } from '../types/navigation';
import { EmptyState } from '../components/ui/EmptyState';

interface Challenge {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  radius_meters: number;
  points_reward: number;
  badge_id: string | null;
  is_completed: boolean;
  distance_meters: number | null;
}

interface ChallengesPageProps {
  onNavigate: OnNavigate;
}

export function ChallengesPage({ onNavigate }: ChallengesPageProps) {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getUserLocation();
    loadChallenges();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const loadChallenges = async () => {
    if (!user) return;

    const { data: challengesData, error } = await supabase
      .from('location_challenges')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error loading challenges:', error);
      setLoading(false);
      return;
    }

    const { data: completions } = await supabase
      .from('challenge_completions')
      .select('challenge_id')
      .eq('user_id', user.id);

    const completedIds = new Set(completions?.map(c => c.challenge_id) || []);

    const challengesWithStatus = (challengesData || []).map(challenge => ({
      ...challenge,
      is_completed: completedIds.has(challenge.id),
      distance_meters: userLocation
        ? calculateDistance(userLocation.lat, userLocation.lng, challenge.lat, challenge.lng)
        : null,
    })).sort((a, b) => {
      if (a.is_completed !== b.is_completed) {
        return a.is_completed ? 1 : -1;
      }
      if (a.distance_meters && b.distance_meters) {
        return a.distance_meters - b.distance_meters;
      }
      return 0;
    });

    setChallenges(challengesWithStatus);
    setLoading(false);
  };

  const openInMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const formatDistance = (meters: number | null): string => {
    if (meters === null) return 'Location unavailable';
    if (meters < 1000) return `${Math.round(meters)}m away`;
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  if (loading) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div className="flex items-center justify-center py-12">
          <div className="text-secondary">Loading challenges...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="feed" onNavigate={onNavigate}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Photo Challenges</h2>
          <p className="text-secondary">Visit locations and snap photos to earn rewards</p>
        </div>

        <div className="bg-gradient-to-r from-accent-primary/20 to-accent-hover/20 border border-accent-primary/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Trophy className="w-6 h-6 text-accent-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">How it works</p>
              <p className="text-sm text-secondary">
                Navigate to challenge locations, take a photo within the radius, and earn points and badges!
                Complete all challenges to unlock exclusive rewards.
              </p>
            </div>
          </div>
        </div>

        {challenges.length === 0 ? (
          <div className="bg-surface border border-surfacehighlight rounded-xl">
            <EmptyState
              icon={Trophy}
              title="No Active Challenges"
              description="Check back soon for new location-based challenges! Earn points and unlock exclusive badges by visiting special spots."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className={`bg-surface border rounded-xl p-4 ${
                  challenge.is_completed
                    ? 'border-green-800 opacity-75'
                    : 'border-surfacehighlight'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{challenge.name}</h3>
                      {challenge.is_completed && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    {challenge.description && (
                      <p className="text-sm text-secondary mb-3">{challenge.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 text-accent-primary font-bold">
                        <Trophy className="w-4 h-4" />
                        +{challenge.points_reward} pts
                      </div>
                      <div className="flex items-center gap-1.5 text-secondary">
                        <MapPin className="w-4 h-4" />
                        {formatDistance(challenge.distance_meters)}
                      </div>
                    </div>
                  </div>
                  {!challenge.is_completed && (
                    <button
                      onClick={() => openInMaps(challenge.lat, challenge.lng)}
                      className="p-3 bg-accent-primary hover:bg-accent-hover rounded-xl transition-all active:scale-95"
                    >
                      <Navigation className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4">
          <p className="text-sm text-accent-primary">
            <span className="font-bold">Tip:</span> When you arrive at a challenge location,
            create a post with a photo. If you're within the radius, the challenge will automatically complete!
          </p>
        </div>
      </div>
    </Layout>
  );
}
