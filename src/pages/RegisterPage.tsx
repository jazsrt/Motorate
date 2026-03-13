import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AlertCircle, Mail, Lightbulb, CheckCircle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);

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

    if (!phoneVerified) {
      setError('Please verify your phone number first');
      setLoading(false);
      return;
    }

    if (!captchaToken && import.meta.env.VITE_TURNSTILE_SITE_KEY) {
      setError('Please complete the security check');
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

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken: captchaToken || undefined,
        data: {
          phone: phone,
        },
      },
    });

    turnstileRef.current?.reset();
    setCaptchaToken(null);

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
        .upsert({
          id: data.user.id,
          handle: handle.trim(),
          phone: phone,
          onboarding_completed: true,
          reputation_score: 0,
        }, { onConflict: 'id' });

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
              badge_id: welcomeBadge.id,
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

  const formatPhoneForDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    setPhoneVerified(false);
    setCodeSent(false);
    setPhoneCode('');
  };

  const handleSendCode = async () => {
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setError('');
    setVerifyingPhone(true);

    try {
      const fullPhone = `+1${phone}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) {
        setError(error.message);
      } else {
        setCodeSent(true);
      }
    } catch {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleVerifyCode = async () => {
    if (phoneCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setError('');
    setVerifyingPhone(true);

    try {
      const fullPhone = `+1${phone}`;
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: phoneCode,
        type: 'sms',
      });

      if (error) {
        setError('Invalid code. Please try again.');
      } else {
        setPhoneVerified(true);
        await supabase.auth.signOut();
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifyingPhone(false);
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

  if (emailSent) {
    return (
      <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden" style={{ background: 'var(--black,#030508)' }}>
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
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '28px', color: 'var(--white,#eef4f8)', letterSpacing: '0.05em' }}>
              MOTO<span style={{ color: 'var(--accent,#F97316)' }}>R</span>ATE
            </span>
          </div>
          <div className="mt-8" style={{ background: 'var(--carbon-1,#0a0d14)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', padding: '32px' }}>
            <div className="mb-4 flex justify-center">
              <Mail className="w-10 h-10" style={{ color: 'var(--accent,#F97316)' }} strokeWidth={1.5} />
            </div>
            <h2 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '22px', color: 'var(--white,#eef4f8)', marginBottom: '16px' }}>Check Your Email</h2>
            <p style={{ color: 'var(--light,#a8bcc8)', marginBottom: '24px' }}>
              We've sent a confirmation link to <span style={{ color: 'var(--accent,#F97316)', fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>{email}</span>
            </p>
            <p style={{ fontSize: '14px', color: 'var(--light,#a8bcc8)', marginBottom: '24px' }}>
              Click the link in the email to verify your account and complete your profile setup.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', fontSize: '14px', color: 'var(--light,#a8bcc8)' }}>
              <p className="flex items-start gap-1.5"><Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} /> Tip: Check your spam folder if you don't see the email</p>
            </div>
          </div>
          <button
            onClick={onSwitchToLogin}
            className="mt-6 text-sm transition-colors active:scale-95"
            style={{ color: 'var(--accent,#F97316)', fontFamily: "'Barlow',sans-serif" }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden" style={{ background: 'var(--black,#030508)' }}>
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
          <div>
            <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '28px', color: 'var(--white,#eef4f8)', letterSpacing: '0.05em' }}>
              MOTO<span style={{ color: 'var(--accent,#F97316)' }}>R</span>ATE
            </span>
          </div>
          <p className="mt-4" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.2em', color: 'var(--dim,#6a7486)' }}>
            Create your account
          </p>
        </div>

        <form onSubmit={handleAccountCreation} className="space-y-6 backdrop-blur-md" style={{ background: 'var(--carbon-1,#0a0d14)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', padding: '32px' }}>
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm mb-2" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--light,#a8bcc8)' }}>
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
              className="w-full px-4 py-3 rounded-lg focus:outline-none placeholder:text-neutral-500"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--white,#eef4f8)' }}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="handle" className="block text-sm mb-2" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--light,#a8bcc8)' }}>
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
              className="w-full px-4 py-3 rounded-lg focus:outline-none placeholder:text-neutral-500"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--white,#eef4f8)' }}
              placeholder="yourhandle"
              required
              minLength={3}
              pattern="[a-zA-Z0-9_]+"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--light,#a8bcc8)' }}>Letters, numbers, and underscores only</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-2" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--light,#a8bcc8)' }}>
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
              className="w-full px-4 py-3 rounded-lg focus:outline-none placeholder:text-neutral-500"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--white,#eef4f8)' }}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {/* Phone Verification */}
          <div>
            <label className="block text-sm mb-2" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--light,#a8bcc8)' }}>
              Phone Number
            </label>
            {!phoneVerified ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 px-3 rounded-l-xl text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--light,#a8bcc8)', fontFamily: "'JetBrains Mono',monospace" }}>
                    +1
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={formatPhoneForDisplay(phone)}
                    onChange={handlePhoneChange}
                    className="w-full px-4 py-3 rounded-r-xl focus:outline-none placeholder:text-neutral-500"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: 'none', color: 'var(--white,#eef4f8)' }}
                    placeholder="(555) 123-4567"
                    disabled={codeSent}
                  />
                  {!codeSent && (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={phone.length !== 10 || verifyingPhone}
                      className="px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-40 whitespace-nowrap"
                      style={{ background: 'var(--accent,#F97316)', color: '#030508', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}
                    >
                      {verifyingPhone ? 'Sending...' : 'Send Code'}
                    </button>
                  )}
                </div>

                {codeSent && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none placeholder:text-neutral-500 tracking-[0.3em] text-center text-lg"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--white,#eef4f8)', fontFamily: "'JetBrains Mono',monospace" }}
                      placeholder="000000"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={phoneCode.length !== 6 || verifyingPhone}
                      className="px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-40 whitespace-nowrap"
                      style={{ background: 'var(--accent,#F97316)', color: '#030508', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}
                    >
                      {verifyingPhone ? 'Checking...' : 'Verify'}
                    </button>
                  </div>
                )}

                {codeSent && (
                  <button
                    type="button"
                    onClick={() => { setCodeSent(false); setPhoneCode(''); }}
                    className="text-xs transition-colors"
                    style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}
                  >
                    Change number or resend code
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-800 rounded-xl">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-300">+1 {formatPhoneForDisplay(phone)} verified</span>
                <button
                  type="button"
                  onClick={() => { setPhoneVerified(false); setCodeSent(false); setPhone(''); setPhoneCode(''); }}
                  className="text-xs ml-auto"
                  style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Cloudflare Turnstile */}
          {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
            <div className="flex justify-center">
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

          <button
            type="submit"
            disabled={loading || !phoneVerified || (!captchaToken && !!import.meta.env.VITE_TURNSTILE_SITE_KEY)}
            className="w-full py-3 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent,#F97316)', color: '#030508', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '13px', boxShadow: '0 4px 16px rgba(249,115,22,0.25)', border: '1px solid rgba(249,115,22,0.4)' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="px-3" style={{ background: 'var(--carbon-1,#0a0d14)', color: 'var(--dim,#6a7486)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Or sign up with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--white,#eef4f8)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}
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
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--white,#eef4f8)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}
            >
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToLogin}
            className="text-sm transition-colors active:scale-95"
            style={{ color: 'var(--accent,#F97316)', fontFamily: "'Barlow',sans-serif" }}
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
