import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getChallengeDetail, calculateDistance } from '../lib/challenges';

export function useChallenge(challengeId: string) {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadChallenge();
    getUserLocation();
  }, [challengeId, user]);

  const loadChallenge = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getChallengeDetail(challengeId, user.id);
      setChallenge(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading challenge:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if ('geolocation' in navigator) {
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

  const checkpointsWithDistance = challenge?.checkpoints?.map((checkpoint: any) => {
    if (userLocation) {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        parseFloat(checkpoint.lat),
        parseFloat(checkpoint.lng)
      );
      return { ...checkpoint, distance };
    }
    return checkpoint;
  });

  return {
    challenge: challenge ? { ...challenge, checkpoints: checkpointsWithDistance } : null,
    loading,
    error,
    userLocation,
    refresh: loadChallenge,
  };
}
