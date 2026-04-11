import { useState } from 'react';
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

const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '12px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none' };
const labelStyle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a8e9e', marginBottom: 6, display: 'block' };
const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '14px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#000', cursor: 'pointer' };
const ghostBtnStyle: React.CSSProperties = { width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a8e9e', cursor: 'pointer' };

interface RegisterPageProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  claimingVehicleId?: string;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
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

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

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
