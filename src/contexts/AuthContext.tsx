/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setSentryUser } from '../lib/sentry';

interface ProfileData {
  handle: string | null;
  onboarding_completed: boolean;
  role: string | null;
  reputation_score: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: ProfileData | null;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: 'google' | 'facebook') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('handle, onboarding_completed, role, reputation_score')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        await supabase.from('profiles').upsert({
          id: userId,
          handle: null,
          onboarding_completed: false,
          reputation_score: 0,
        }, { onConflict: 'id', ignoreDuplicates: true });

        const { data: newData } = await supabase
          .from('profiles')
          .select('handle, onboarding_completed, role, reputation_score')
          .eq('id', userId)
          .maybeSingle();

        setProfile(newData ? { ...newData, reputation_score: newData.reputation_score ?? 0 } : null);
        return;
      }

      setProfile({
        ...data,
        onboarding_completed: data.onboarding_completed ?? false,
        reputation_score: data.reputation_score ?? 0,
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    // CRITICAL: Force loading to complete after 3 seconds NO MATTER WHAT
    const emergencyTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth error:', error);
          setLoading(false);
          clearTimeout(emergencyTimeout);
          return;
        }

        setUser(session?.user ?? null);

        if (session?.user) {
          await loadProfile(session.user.id, session.user.email);
          setSentryUser({
            id: session.user.id,
            email: session.user.email,
          });
        } else {
          setSentryUser(null);
        }
      } catch (err) {
        console.error('Fatal auth error:', err);
      } finally {
        setLoading(false);
        clearTimeout(emergencyTimeout);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadProfile(session.user.id, session.user.email);
          setSentryUser({
            id: session.user.id,
            email: session.user.email,
          });
        } else {
          setProfile(null);
          setSentryUser(null);
        }
      })();
    });

    return () => {
      clearTimeout(emergencyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectTo = import.meta.env.PROD
      ? 'https://motorate.vercel.app/#/auth/callback'
      : `${window.location.origin}/#/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    return { data, error: error || null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error || null };
  };

  const signInWithOAuth = async (provider: 'google' | 'facebook') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/#/auth/callback`,
      },
    });
    return { error: error || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.hash = '';
    window.location.reload();
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id, user.email);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, profile, signUp, signIn, signInWithOAuth, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
