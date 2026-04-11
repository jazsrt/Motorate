import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

interface AuthCallbackPageProps {
  onSuccess: () => void;
}

export function AuthCallbackPage({ onSuccess }: AuthCallbackPageProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // PKCE flow: code is in the URL query string (not hash)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
          // Exchange the code for a session (PKCE flow)
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('PKCE exchange error:', error);
            setErrorMessage(error.message);
            setStatus('error');
            return;
          }
          setStatus('success');
          setTimeout(() => onSuccess(), 1500);
          return;
        }

        // Legacy implicit flow: tokens in hash (keep for backward compatibility)
        const fullHash = window.location.hash;
        const hashParams = new URLSearchParams(fullHash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error('Session error:', error);
            setErrorMessage(error.message);
            setStatus('error');
            return;
          }
          setStatus('success');
          setTimeout(() => onSuccess(), 1500);
          return;
        }

        if (user) {
          setStatus('success');
          setTimeout(() => onSuccess(), 500);
          return;
        }

        // Nothing in URL and no user — wait briefly for onAuthStateChange
        const timeout = setTimeout(() => {
          if (!user) {
            setErrorMessage('Verification link may have expired. Please request a new one.');
            setStatus('error');
          }
        }, 5000);
        return () => clearTimeout(timeout);
      } catch (error) {
        console.error('Callback error:', error);
        setErrorMessage('An error occurred during confirmation. Please try again.');
        setStatus('error');
      }
    };

    handleCallback();
  }, [user, onSuccess]);

  return (
    <div style={{ minHeight: '100vh', background: '#030508', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' as const }}>
        <Logo size="large" />
        <div style={{ marginTop: 32, padding: '32px 24px' }}>
          {status === 'loading' && (
            <>
              <Loader size={48} style={{ margin: '0 auto 16px', color: '#F97316', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', marginBottom: 8 }}>Confirming...</div>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e' }}>Please wait while we verify your account</div>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle size={48} style={{ margin: '0 auto 16px', color: '#20c060' }} />
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', marginBottom: 8 }}>You're In</div>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e' }}>Redirecting you now...</div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={48} style={{ margin: '0 auto 16px', color: '#ef4444' }} />
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', marginBottom: 8 }}>Something Went Wrong</div>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e', marginBottom: 24 }}>{errorMessage}</div>
              <button
                onClick={() => window.location.hash = ''}
                style={{ width: '100%', padding: 14, background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer' }}
              >
                Return to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
