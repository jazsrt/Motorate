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
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (type === 'signup' || type === 'email_change') {
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
            setTimeout(() => {
              onSuccess();
            }, 2000);
          } else {
            setErrorMessage('Invalid confirmation link. Please try signing up again.');
            setStatus('error');
          }
        } else if (user) {
          setStatus('success');
          setTimeout(() => {
            onSuccess();
          }, 1000);
        } else {
          setErrorMessage('No confirmation data found. Please check the link in your email.');
          setStatus('error');
        }
      } catch (error) {
        console.error('Callback error:', error);
        setErrorMessage('An error occurred during confirmation. Please try again.');
        setStatus('error');
      }
    };

    handleCallback();
  }, [user, onSuccess]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Logo size="large" />
        <div className="mt-8 card-crisp bg-surface border-accent-primary">
          {status === 'loading' && (
            <>
              <Loader className="w-16 h-16 mx-auto mb-4 text-accent-primary animate-spin" />
              <h2 className="font-heading font-bold text-2xl mb-4">Confirming Your Email</h2>
              <p className="text-secondary">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h2 className="font-heading font-bold text-2xl mb-4">Email Confirmed!</h2>
              <p className="text-secondary mb-6">
                Your account has been verified. Redirecting you now...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h2 className="font-heading font-bold text-2xl mb-4">Confirmation Failed</h2>
              <p className="text-secondary mb-6">{errorMessage}</p>
              <button
                onClick={() => window.location.hash = ''}
                className="btn-primary w-full"
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
