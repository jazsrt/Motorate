import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
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
  const [bgIdx] = useState(() => Math.floor(Math.random() * carImages.length));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '11px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none' };
  const labelStyle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a8e9e', marginBottom: 6, display: 'block' };
  const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '13px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#000', cursor: 'pointer' };
  const ghostBtnStyle: React.CSSProperties = { width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a8e9e', cursor: 'pointer' };

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

  const handleOAuthSignIn = async (provider: 'google' | 'facebook') => {
    setError('');
    setLoading(true);
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030508' }}>
      <img src={carImages[bgIdx]} alt="" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.22) saturate(0.6)', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(to bottom, rgba(3,5,8,0.6) 0%, rgba(3,5,8,0.85) 60%, rgba(3,5,8,0.97) 100%)', zIndex: 1 }} />
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 380, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: 'rgba(10,13,20,0.92)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '32px 28px', backdropFilter: 'blur(20px)' }}>
          {/* MOTORATE wordmark */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#eef4f8' }}>MOTO<span style={{ color: '#F97316' }}>R</span>ATE</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#5a6e7e', marginTop: 4 }}>Reputation for Real Cars</div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', marginBottom: 16 }}>
              <AlertCircle style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#fca5a5' }}>{error}</span>
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input type="email" id="email" inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} onFocus={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'} />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <button type="button" onClick={() => { setShowResetForm(!showResetForm); setError(''); setResetSuccess(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#F97316' }}>Forgot password?</button>
            </div>
            <input type="password" id="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required={!showResetForm} style={inputStyle} onFocus={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'} />
          </div>

          {/* Password reset form */}
          {showResetForm && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 17, fontWeight: 700, color: '#eef4f8', marginBottom: 12 }}>Reset Password</div>
              {resetSuccess ? (
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#20c060', padding: '10px 0' }}>Reset link sent — check your inbox.</div>
              ) : (
                <>
                  <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="Your email address" style={inputStyle} />
                  <button onClick={handlePasswordReset} disabled={resetLoading} style={{ ...primaryBtnStyle, marginTop: 12, opacity: resetLoading ? 0.5 : 1 }}>{resetLoading ? 'Sending\u2026' : 'Send Reset Link'}</button>
                </>
              )}
              <button onClick={() => setShowResetForm(false)} style={{ ...ghostBtnStyle, marginTop: 8 }}>Back to Sign In</button>
            </div>
          )}

          {/* Sign In button */}
          <button type="button" onClick={doSignIn} disabled={loading || showResetForm} style={{ ...primaryBtnStyle, marginTop: 16, opacity: (loading || showResetForm) ? 0.45 : 1 }}>
            {loading ? 'Signing in\u2026' : 'Sign In'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3a4e60' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Google OAuth */}
          <button type="button" onClick={() => handleOAuthSignIn('google')} disabled={loading} style={{ ...ghostBtnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          {/* Switch to register */}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e' }}>Don't have an account? </span>
            <button onClick={onSwitchToRegister} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontSize: 12, fontWeight: 600, color: '#F97316', textDecoration: 'underline', textUnderlineOffset: 3 }}>Sign up</button>
          </div>
        </div>
      </div>
    </div>
  );
}
