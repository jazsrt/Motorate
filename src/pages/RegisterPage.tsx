import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AlertCircle, Mail, Lightbulb } from 'lucide-react';
import { Logo } from '../components/Logo';

const carImages = [
  'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/3849173/pexels-photo-3849173.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/1149831/pexels-photo-1149831.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/1680135/pexels-photo-1680135.jpeg?auto=compress&cs=tinysrgb&w=1920',
];

interface RegisterPageProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  claimingVehicleId?: string;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { signUp, signInWithOAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!handle.trim()) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    if (handle.trim().length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(handle.trim())) {
      setError('Username can only contain letters, numbers, and underscores');
      setLoading(false);
      return;
    }

    const { data: existingHandle } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', handle.trim())
      .maybeSingle();

    if (existingHandle) {
      setError('This username is already taken');
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await signUp(email, password);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data?.user && !data?.user?.identities?.length) {
      setError('An account with this email already exists. Please sign in instead.');
      setLoading(false);
      return;
    }

    if (data?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: data.user.id, handle: handle.trim(), onboarding_completed: true, reputation_score: 0 }, { onConflict: 'id' });

      if (profileError) {
        console.error('Failed to set handle:', profileError);
      }

      try {
        const { data: welcomeBadge } = await supabase
          .from('badges')
          .select('id')
          .eq('slug', 'welcome')
          .maybeSingle();

        if (welcomeBadge) {
          await supabase
            .from('user_badges')
            .insert({
              user_id: data.user.id,
              badge_id: welcomeBadge.id
            });
        }
      } catch (badgeError) {
        console.error('Failed to award welcome badge:', badgeError);
      }
    }

    if (data?.session) {
      setLoading(false);
      return;
    }

    setEmailSent(true);
    setLoading(false);
  };

  const handleOAuthSignIn = async (provider: 'google' | 'facebook') => {
    setError('');
    setLoading(true);

    const { error } = await signInWithOAuth(provider);

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 z-0 flex flex-col">
          <div className="flex flex-col animate-scroll-down">
            {[...carImages, ...carImages].map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="w-full h-screen flex-shrink-0"
                style={{
                  backgroundImage: `url(${image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        </div>
        <div className="w-full max-w-md text-center relative z-10">
          <Logo size="large" />
          <div className="mt-8 card-crisp bg-surface border-accent-primary">
            <div className="mb-4 flex justify-center">
              <Mail className="w-10 h-10 text-accent-primary" strokeWidth={1.5} />
            </div>
            <h2 className="font-heading font-bold text-2xl mb-4">Check Your Email</h2>
            <p className="text-secondary mb-6">
              We've sent a confirmation link to <span className="text-accent-primary font-heading font-bold">{email}</span>
            </p>
            <p className="text-sm text-secondary mb-6">
              Click the link in the email to verify your account and complete your profile setup.
            </p>
            <div className="bg-surfacehighlight rounded-xl p-4 text-sm text-secondary">
              <p className="mb-2 flex items-start gap-1.5"><Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} /> Tip: Check your spam folder if you don't see the email</p>
            </div>
          </div>
          <button
            onClick={onSwitchToLogin}
            className="mt-6 text-accent-primary hover:text-accent-hover text-sm font-heading font-semibold transition-colors active:scale-95"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 z-0 flex flex-col">
        <div className="flex flex-col animate-scroll-down">
          {[...carImages, ...carImages].map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="w-full h-screen flex-shrink-0"
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Logo size="large" />
          <p className="text-secondary mt-4 text-sm">Create your account</p>
        </div>

        <form onSubmit={handleAccountCreation} className="space-y-6 bg-surface/95 backdrop-blur-md rounded-xl p-8 border border-surfacehighlight shadow-2xl">
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-heading font-semibold mb-2" style={{ color: 'var(--t2)' }}>
              Email
            </label>
            <input
              type="email"
              id="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-enhanced w-full placeholder:text-neutral-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="handle" className="block text-sm font-heading font-semibold mb-2" style={{ color: 'var(--t2)' }}>
              Username
            </label>
            <input
              type="text"
              id="handle"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              className="input-enhanced w-full placeholder:text-neutral-500"
              placeholder="yourhandle"
              required
              minLength={3}
              pattern="[a-zA-Z0-9_]+"
            />
            <p className="text-xs text-secondary mt-1">Letters, numbers, and underscores only</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-heading font-semibold mb-2" style={{ color: 'var(--t2)' }}>
              Password
            </label>
            <input
              type="password"
              id="password"
              autoComplete="new-password"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-enhanced w-full placeholder:text-neutral-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--orange)', boxShadow: '0 4px 16px rgba(249,115,22,0.25)', border: '1px solid rgba(249,115,22,0.4)' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surfacehighlight"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-surface px-3 text-secondary font-heading font-bold">Or sign up with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-100 text-black font-heading font-semibold rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthSignIn('facebook')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-heading font-semibold rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToLogin}
            className="text-accent-primary hover:text-accent-hover text-sm font-heading font-semibold transition-colors active:scale-95"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
