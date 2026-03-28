import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getChallengesWithProgress } from '../lib/challenges';

export function useChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChallenges = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getChallengesWithProgress(user.id);
      setChallenges(data || []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading challenges:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadChallenges();
  }, [user, loadChallenges]);

  return {
    challenges,
    loading,
    error,
    refresh: loadChallenges,
  };
}
