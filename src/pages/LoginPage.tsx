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
  const { signIn } = useAuth();
  const [bgIdx] = useState(() => Math.floor(Math.random() * carImages.length));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '12px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none' };
  const labelStyle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a8e9e', marginBottom: 6, display: 'block' };
  const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '14px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#000', cursor: 'pointer' };
  const ghostBtnStyle: React.CSSProperties = { width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a8e9e', cursor: 'pointer' };

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
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#eef4f8' }}>MOTO<span style={{ color: '#F97316' }}>R</span>ATE</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e', marginTop: 4 }}>Reputation for Real Cars</div>
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
