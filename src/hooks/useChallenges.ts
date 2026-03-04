import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getChallengesWithProgress } from '../lib/challenges';

export function useChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChallenges();
  }, [user]);

  const loadChallenges = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getChallengesWithProgress(user.id);
      setChallenges(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading challenges:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    challenges,
    loading,
    error,
    refresh: loadChallenges,
  };
}
