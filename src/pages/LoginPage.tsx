import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const doSignIn = async () => {
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken: captchaToken || undefined,
      },
    });

    turnstileRef.current?.reset();
    setCaptchaToken(null);

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

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'var(--white, #eef4f8)',
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
  };

  const inputFocusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--accent, #F97316)';
  };

  const inputBlurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
  };

  return (
    <div
      style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', overflow: 'hidden' }}
    >
      {/* Scrolling background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <div className="flex flex-col animate-scroll-down">
          {[...carImages, ...carImages].map((image, index) => (
            <div
              key={`${image}-${index}`}
              style={{
                width: '100%',
                flexShrink: 0,
                height: '100vh',
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(3,5,8,0.75) 0%, rgba(3,5,8,0.55) 100%)',
          }}
        />
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 10 }} className="animate-page-enter">
        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              color: 'var(--white, #eef4f8)',
            }}
          >
            MOTO<span style={{ color: 'var(--accent, #F97316)' }}>R</span>ATE
          </span>
        </div>

        {/* Tagline */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.3em',
              color: 'var(--dim, #6a7486)',
            }}
          >
            COMMUNITY DRIVEN
          </span>
        </div>

        {/* Form card */}
        <div
          style={{
            background: 'rgba(10,13,20,0.82)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: '28px 24px',
          }}
        >
          {/* Social Proof */}
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.15em',
              color: 'var(--dim, #6a7486)',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            <span style={{ color: 'var(--accent, #F97316)' }}>47,000</span> vehicles spotted this month
          </p>

          {/* Error */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(138,74,74,0.12)',
                border: '1px solid rgba(138,74,74,0.25)',
                marginBottom: 16,
              }}
            >
              <AlertCircle
                style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2, color: 'var(--negative)' }}
                strokeWidth={1.5}
              />
              <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--negative)' }}>{error}</p>
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.2em',
                color: 'var(--dim, #6a7486)',
                marginBottom: 6,
              }}
            >
              EMAIL
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
              onFocus={inputFocusStyle}
              onBlur={inputBlurStyle}
              style={{ ...inputStyle, width: '100%', height: 44, padding: '0 14px', outline: 'none', transition: 'border-color 0.2s' }}
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label
                htmlFor="password"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.2em',
                  color: 'var(--dim, #6a7486)',
                }}
              >
                PASSWORD
              </label>
              <button
                type="button"
                onClick={() => { setShowResetForm(!showResetForm); setError(''); setResetSuccess(false); }}
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  color: 'var(--accent, #F97316)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
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
              onFocus={inputFocusStyle}
              onBlur={inputBlurStyle}
              style={{ ...inputStyle, width: '100%', height: 44, padding: '0 14px', outline: 'none', transition: 'border-color 0.2s' }}
              placeholder="••••••••"
              required={!showResetForm}
            />
          </div>

          {/* Reset form */}
          {showResetForm && (
            <div
              style={{
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--white, #eef4f8)',
                    marginBottom: 4,
                  }}
                >
                  Reset your password
                </p>
                <p style={{ fontSize: 11, color: 'var(--dim, #6a7486)', marginBottom: 12 }}>
                  Enter your email and we'll send a reset link.
                </p>
              </div>

              {resetSuccess ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(74,138,106,0.10)',
                    border: '1px solid rgba(74,138,106,0.25)',
                  }}
                >
                  <CheckCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2, color: 'var(--positive)' }} strokeWidth={1.5} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--positive)' }}>Reset email sent</p>
                    <p style={{ fontSize: 11, marginTop: 2, color: 'var(--dim, #6a7486)' }}>Check your inbox at {resetEmail}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    onFocus={inputFocusStyle}
                    onBlur={inputBlurStyle}
                    style={{ ...inputStyle, width: '100%', height: 44, padding: '0 14px', outline: 'none', transition: 'border-color 0.2s' }}
                    placeholder="your@email.com"
                    required
                  />
                  <button
                    type="submit"
                    disabled={resetLoading}
                    style={{
                      width: '100%',
                      height: 44,
                      borderRadius: 8,
                      border: 'none',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.15em',
                      background: 'var(--accent, #F97316)',
                      color: '#030508',
                      cursor: 'pointer',
                      opacity: resetLoading ? 0.5 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Cloudflare Turnstile */}
          {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Turnstile
                ref={turnstileRef}
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                onSuccess={(token) => setCaptchaToken(token)}
                onError={() => setCaptchaToken(null)}
                onExpire={() => setCaptchaToken(null)}
                options={{
                  theme: 'dark',
                  size: 'flexible',
                }}
              />
            </div>
          )}

          {/* Sign in button */}
          <button
            type="button"
            onClick={doSignIn}
            disabled={loading || showResetForm}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 8,
              border: 'none',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.15em',
              background: 'var(--accent, #F97316)',
              color: '#030508',
              cursor: loading || showResetForm ? 'not-allowed' : 'pointer',
              opacity: loading || showResetForm ? 0.5 : 1,
              transition: 'opacity 0.2s, transform 0.1s',
              marginBottom: 20,
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '2px solid rgba(3,5,8,0.3)',
                    borderTopColor: '#030508',
                    animation: 'spin 0.6s linear infinite',
                    display: 'inline-block',
                  }}
                />
                SIGNING IN...
              </span>
            ) : 'SIGN IN'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                color: 'var(--muted, #586878)',
              }}
            >
              OR
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* OAuth */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 44,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--white, #eef4f8)',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.4 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <svg style={{ width: 16, height: 16, flexShrink: 0 }} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              GOOGLE
            </button>
            <button
              type="button"
              onClick={() => handleOAuthSignIn('facebook')}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 44,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--white, #eef4f8)',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.4 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              FACEBOOK
            </button>
          </div>
        </div>

        {/* Switch to register */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={onSwitchToRegister}
            style={{
              fontFamily: 'Barlow, sans-serif',
              fontSize: 12,
              color: 'var(--dim, #6a7486)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Don't have an account?{' '}
            <span style={{ color: 'var(--accent, #F97316)' }}>Sign up</span>
          </button>
        </div>
      </div>
    </div>
  );
}
