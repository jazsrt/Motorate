import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AlertCircle } from 'lucide-react';

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

const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '11px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none' };
const labelStyle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a8e9e', marginBottom: 6, display: 'block' };
const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '13px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#000', cursor: 'pointer' };
const ghostBtnStyle: React.CSSProperties = { width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a8e9e', cursor: 'pointer' };

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
  const [bgIdx] = useState(() => Math.floor(Math.random() * carImages.length));

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
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030508' }}>
        <img src={carImages[bgIdx]} alt="" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.22) saturate(0.6)', zIndex: 0 }} />
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(to bottom, rgba(3,5,8,0.6) 0%, rgba(3,5,8,0.85) 60%, rgba(3,5,8,0.97) 100%)', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 380, margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ background: 'rgba(10,13,20,0.92)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '32px 28px', backdropFilter: 'blur(20px)', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#20c060', marginBottom: 6 }}>Check your email</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e' }}>We sent a confirmation link to <span style={{ color: '#eef4f8' }}>{email}</span></div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#3a4e60', marginTop: 12 }}>Click the link to verify your account</div>
            <button onClick={onSwitchToLogin} style={{ ...ghostBtnStyle, marginTop: 20 }}>Back to Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030508' }}>
      <img src={carImages[bgIdx]} alt="" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.22) saturate(0.6)', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(to bottom, rgba(3,5,8,0.6) 0%, rgba(3,5,8,0.85) 60%, rgba(3,5,8,0.97) 100%)', zIndex: 1 }} />
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 380, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: 'rgba(10,13,20,0.92)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '32px 28px', backdropFilter: 'blur(20px)' }}>
          {/* Wordmark */}
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

          <form onSubmit={handleAccountCreation}>
            {/* Username */}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="handle" style={labelStyle}>Username</label>
              <input type="text" id="handle" autoComplete="username" autoCapitalize="off" value={handle} onChange={e => setHandle(e.target.value.toLowerCase())} placeholder="yourhandle" required minLength={3} pattern="[a-zA-Z0-9_]+" style={inputStyle} onFocus={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'} />
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#3a4e60', marginTop: 4 }}>Letters, numbers, and underscores only</div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <input type="email" id="email" inputMode="email" autoComplete="email" autoCapitalize="off" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} onFocus={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'} />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <input type="password" id="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} style={inputStyle} onFocus={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'} />
            </div>

            {/* Create Account */}
            <button type="submit" disabled={loading} style={{ ...primaryBtnStyle, opacity: loading ? 0.45 : 1 }}>
              {loading ? 'Creating account\u2026' : 'Create Account'}
            </button>
          </form>

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

          {/* Switch to login */}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e' }}>Already have an account? </span>
            <button onClick={onSwitchToLogin} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontSize: 12, fontWeight: 600, color: '#F97316', textDecoration: 'underline', textUnderlineOffset: 3 }}>Sign in</button>
          </div>
        </div>
      </div>
    </div>
  );
}
