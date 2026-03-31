import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '12px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none' };
const labelStyle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a8e9e', marginBottom: 6, display: 'block' };
const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '14px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#000', cursor: 'pointer' };

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    const handlePasswordRecovery = async () => {
      try {
        // Check if there's a recovery token in the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?')));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        // Recovery token check

        if (type === 'recovery' && accessToken) {
          // Token is present, Supabase should automatically handle it
          // Wait a moment for the session to be established
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Now check if we have a valid session
        const { data: { session } } = await supabase.auth.getSession();

        // Session validated

        if (session) {
          setHasValidSession(true);
        } else {
          setError('Invalid or expired reset link. Please request a new password reset.');
        }
      } catch (err) {
        console.error('Error handling recovery:', err);
        setError('Failed to verify reset link. Please try again.');
      } finally {
        setVerifyingToken(false);
      }
    };

    handlePasswordRecovery();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        window.location.hash = '';
        window.location.reload();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (verifyingToken) {
      return (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Loader2 style={{ width: 32, height: 32, color: '#F97316', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} strokeWidth={1.5} />
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', marginBottom: 6 }}>Verifying Reset Link</div>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e' }}>Please wait while we verify your password reset link...</div>
        </div>
      );
    }

    if (success) {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, background: 'rgba(32,192,96,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle style={{ width: 24, height: 24, color: '#20c060' }} strokeWidth={1.5} />
          </div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', marginBottom: 6 }}>Password Reset Successful</div>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e' }}>Redirecting you to login...</div>
        </div>
      );
    }

    if (!hasValidSession) {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, background: 'rgba(232,58,74,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle style={{ width: 24, height: 24, color: '#e83a4a' }} strokeWidth={1.5} />
          </div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', marginBottom: 6 }}>Invalid Reset Link</div>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e', marginBottom: 20 }}>
            {error || 'This password reset link is invalid or has expired.'}
          </div>
          <button
            onClick={() => {
              window.location.hash = '';
              window.location.reload();
            }}
            style={primaryBtnStyle}
          >
            Back to Login
          </button>
        </div>
      );
    }

    return (
      <>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', marginBottom: 4 }}>Reset Password</div>
        <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e', marginBottom: 20 }}>Enter your new password below</div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', marginBottom: 16 }}>
              <AlertCircle style={{ width: 14, height: 14, color: '#e83a4a', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#e83a4a' }}>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="password" style={labelStyle}>New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
            />
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#3a4e60', marginTop: 4 }}>At least 8 characters</div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...primaryBtnStyle, opacity: loading ? 0.45 : 1 }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => {
              window.location.hash = '';
              window.location.reload();
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, color: '#F97316' }}
          >
            Back to Login
          </button>
        </div>
      </>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030508' }}>
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 380, margin: '0 auto', padding: '24px 16px' }}>
        {/* MOTORATE wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#eef4f8' }}>MOTO<span style={{ color: '#F97316' }}>R</span>ATE</div>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e', marginTop: 4 }}>Reputation for Real Cars</div>
        </div>

        <div style={{ background: 'rgba(10,13,20,0.92)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '32px 28px', backdropFilter: 'blur(20px)' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
