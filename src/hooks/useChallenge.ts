import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getChallengeDetail, calculateDistance } from '../lib/challenges';

export function useChallenge(challengeId: string) {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const loadChallenge = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getChallengeDetail(challengeId, user.id);
      setChallenge(data);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading challenge:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [challengeId, user]);

  useEffect(() => {
    loadChallenge();
    getUserLocation();
  }, [challengeId, user, loadChallenge]);

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

  const checkpointsWithDistance = (challenge?.checkpoints as Array<Record<string, unknown>> | undefined)?.map((checkpoint: Record<string, unknown>) => {
    if (userLocation) {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        parseFloat(String(checkpoint.lat)),
        parseFloat(String(checkpoint.lng))
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
