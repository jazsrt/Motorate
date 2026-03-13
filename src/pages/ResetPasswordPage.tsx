import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

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
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface to-surfacehighlight flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="large" showTagline />
        </div>

        <div className="bg-surface/95 backdrop-blur-md rounded-xl p-8 border border-surfacehighlight shadow-2xl">
          {verifyingToken ? (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="w-12 h-12 text-accent-primary animate-spin mx-auto" strokeWidth={1.5} />
              <h2 className="text-xl font-heading font-bold text-white">Verifying Reset Link</h2>
              <p className="text-secondary text-sm">
                Please wait while we verify your password reset link...
              </p>
            </div>
          ) : success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-status-success/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-status-success" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-heading font-bold text-white">Password Reset Successful</h2>
              <p className="text-secondary text-sm">
                Redirecting you to login...
              </p>
            </div>
          ) : !hasValidSession ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-status-danger/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-status-danger" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-heading font-bold text-white">Invalid Reset Link</h2>
              <p className="text-secondary text-sm mb-4">
                {error || 'This password reset link is invalid or has expired.'}
              </p>
              <button
                onClick={() => {
                  window.location.hash = '';
                  window.location.reload();
                }}
                className="btn-primary w-full"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Reset Password</h2>
              <p className="text-secondary text-sm mb-6">
                Enter your new password below
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-status-danger/20 border border-status-danger rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-status-danger flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <p className="text-sm text-status-danger">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-heading font-semibold mb-2 text-white">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-enhanced w-full text-white placeholder:text-neutral-500"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-secondary mt-1">At least 8 characters</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-heading font-semibold mb-2 text-white">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-enhanced w-full text-white placeholder:text-neutral-500"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:bg-surfacehighlight disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    window.location.hash = '';
                    window.location.reload();
                  }}
                  className="text-accent-primary hover:text-accent-hover text-sm font-heading font-semibold transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
