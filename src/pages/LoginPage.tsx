import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

const carImages = [
  'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/3849173/pexels-photo-3849173.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/1149831/pexels-photo-1149831.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/1680135/pexels-photo-1680135.jpeg?auto=compress&cs=tinysrgb&w=1920',
];

interface LoginPageProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

export function LoginPage({ onSuccess, onSwitchToRegister }: LoginPageProps) {
  const { signIn, signInWithOAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const doSignIn = async () => {
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSignIn();
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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      if (error) throw error;
      setResetSuccess(true);
      setTimeout(() => {
        setShowResetForm(false);
        setResetSuccess(false);
        setResetEmail('');
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      {/* Scrolling background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="flex flex-col animate-scroll-down">
          {[...carImages, ...carImages].map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="w-full flex-shrink-0"
              style={{
                height: '100vh',
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))}
        </div>
        <div
          className="absolute inset-0 bg-gradient-to-b from-bg/75 via-bg/65 to-bg/85"
        />
      </div>

      <div className="w-full max-w-sm relative z-10 page-enter">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo size="large" showTagline />
        </div>

        {/* Form card */}
        <div className="modal-content rounded-2xl p-6 space-y-5" style={{ backdropFilter: 'blur(24px)' }}>
          {/* Social Proof */}
          <p className="text-[9px] text-center" style={{ color: '#909aaa', letterSpacing: '0.5px' }}>
            <strong style={{ color: '#F97316', fontWeight: 500 }}>47,000</strong> vehicles spotted this month
          </p>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg"
              style={{ background: 'rgba(138,74,74,0.12)', border: '1px solid rgba(138,74,74,0.25)' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} style={{ color: 'var(--negative)' }} />
              <p className="text-[12px] leading-[1.5]" style={{ color: 'var(--negative)' }}>{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-[10px] font-medium uppercase"
              style={{ color: 'var(--text-tertiary)', letterSpacing: '1.5px' }}
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg text-[13px] transition-all focus:outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-2)',
                color: 'var(--text-primary)',
              }}
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-[10px] font-medium uppercase"
                style={{ color: 'var(--text-tertiary)', letterSpacing: '1.5px' }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => { setShowResetForm(!showResetForm); setError(''); setResetSuccess(false); }}
                className="text-[10px] transition-colors"
                style={{ color: 'var(--accent)', letterSpacing: '0.3px' }}
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              id="password"
              autoComplete="current-password"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg text-[13px] transition-all focus:outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-2)',
                color: 'var(--text-primary)',
              }}
              placeholder="••••••••"
              required={!showResetForm}
            />
          </div>

          {/* Reset form */}
          {showResetForm && (
            <div
              className="rounded-lg p-4 space-y-3"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <div>
                <p
                  className="text-[12px] font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Reset your password
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Enter your email and we'll send a reset link.
                </p>
              </div>

              {resetSuccess ? (
                <div
                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(74,138,106,0.10)', border: '1px solid rgba(74,138,106,0.25)' }}
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} style={{ color: 'var(--positive)' }} />
                  <div>
                    <p className="text-[12px] font-medium" style={{ color: 'var(--positive)' }}>Reset email sent</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Check your inbox at {resetEmail}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-2.5">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="input-enhanced text-sm"
                    placeholder="your@email.com"
                    required
                  />
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'var(--orange)' }}
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Sign in button */}
          <button
            type="button"
            onClick={doSignIn}
            disabled={loading || showResetForm}
            className="w-full h-12 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--orange)', boxShadow: '0 4px 16px rgba(249,115,22,0.25)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span
              className="text-[10px] font-medium uppercase"
              style={{ color: 'var(--text-quaternary)', letterSpacing: '1px' }}
            >
              or
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-11 rounded-lg text-[11px] font-medium transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: 'rgba(255,255,255,0.95)',
                color: '#1a1a1a',
              }}
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
              className="flex items-center justify-center gap-2 h-11 rounded-lg text-[11px] font-medium transition-all active:scale-95 disabled:opacity-40"
              style={{ background: '#1877F2', color: '#ffffff' }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>
        </div>

        {/* Switch to register */}
        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToRegister}
            className="text-[12px] transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Don't have an account?{' '}
            <span style={{ color: 'var(--accent)' }}>Sign up</span>
          </button>
        </div>
      </div>
    </div>
  );
}
