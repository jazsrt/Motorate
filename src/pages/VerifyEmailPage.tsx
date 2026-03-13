import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { Mail, RefreshCw, Edit2, Eye, X } from 'lucide-react';

const carImages = [
  'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/3849173/pexels-photo-3849173.jpeg?auto=compress&cs=tinysrgb&w=1920',
];

export function VerifyEmailPage() {
  const { user, signOut } = useAuth();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  const handleResendEmail = async () => {
    if (!user?.email) return;

    setResending(true);
    setError('');
    setResent(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) {
        setError(error.message);
      } else {
        setResent(true);
      }
    } catch (err) {
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !user) return;

    setChangingEmail(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim()
      });

      if (error) {
        setError(error.message);
      } else {
        setShowChangeEmail(false);
        setResent(true);
        setNewEmail('');
      }
    } catch (err) {
      setError('Failed to change email. Please try again.');
    } finally {
      setChangingEmail(false);
    }
  };

  const handleContinueAsGuest = () => {
    localStorage.setItem('guestMode', 'true');
    window.location.hash = '#/search';
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
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
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Logo size="large" showTagline />
        </div>

        <div className="bg-surface/95 backdrop-blur-md rounded-xl p-8 border border-surfacehighlight shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-accent-primary/20 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-accent-primary" strokeWidth={1.5} />
            </div>

            <div>
              <h1 className="font-heading font-bold text-3xl mb-3 text-white">
                Check Your Inbox
              </h1>
              <p className="text-secondary text-lg">
                We've sent a verification link to
              </p>
              <p className="text-accent-primary font-heading font-semibold text-lg mt-2">
                {user?.email}
              </p>
            </div>

            <div className="w-full bg-surfacehighlight rounded-xl p-4 space-y-3">
              <p className="text-sm text-primary">
                Click the link in your email to verify your account and get started with MotoRate.
              </p>
              <p className="text-xs text-secondary">
                Check your spam folder if you don't see the email within a few minutes.
              </p>
            </div>

            {resent && (
              <div className="w-full bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                <p className="text-sm text-green-400 font-heading font-semibold">
                  Verification email resent successfully!
                </p>
              </div>
            )}

            {error && (
              <div className="w-full bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="w-full space-y-3">
              <button
                onClick={handleResendEmail}
                disabled={resending}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent-primary hover:bg-accent-hover text-white font-heading font-bold rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${resending ? 'animate-spin' : ''}`} strokeWidth={1.5} />
                {resending ? 'Resending...' : 'Resend Email'}
              </button>

              <button
                onClick={() => setShowChangeEmail(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-surfacehighlight hover:bg-surfacehighlight/80 text-white font-heading font-semibold rounded-full transition-all active:scale-95"
              >
                <Edit2 className="w-5 h-5" strokeWidth={1.5} />
                Change Email Address
              </button>

              <button
                onClick={handleContinueAsGuest}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange/20 hover:bg-orange/30 border border-orange/50 text-accent-primary font-heading font-semibold rounded-full transition-all active:scale-95"
              >
                <Eye className="w-5 h-5" strokeWidth={1.5} />
                Continue as Guest
              </button>

              <button
                onClick={signOut}
                className="w-full px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-heading font-semibold rounded-full transition-all active:scale-95"
              >
                Sign Out & Start Over
              </button>
            </div>
          </div>
        </div>
      </div>

      {showChangeEmail && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-surfacehighlight rounded-xl max-w-md w-full p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">Change Email Address</h3>
                <p className="text-secondary text-sm mt-1">
                  We'll send a verification link to your new email
                </p>
              </div>
              <button
                onClick={() => setShowChangeEmail(false)}
                className="p-1 hover:bg-surfacehighlight rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
                Current Email
              </label>
              <div className="bg-surfacehighlight rounded-xl px-4 py-3 text-secondary">
                {user?.email}
              </div>
            </div>

            <div>
              <label htmlFor="newEmail" className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
                New Email Address
              </label>
              <input
                type="email"
                id="newEmail"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surfacehighlight border border-surfacehighlight rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowChangeEmail(false)}
                className="flex-1 bg-surfacehighlight hover:bg-surfacehover rounded-xl px-4 py-3 font-bold uppercase tracking-wider text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeEmail}
                disabled={changingEmail || !newEmail.trim()}
                className="flex-1 bg-accent-primary hover:bg-accent-hover rounded-xl px-4 py-3 font-bold uppercase tracking-wider text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingEmail ? 'Changing...' : 'Change Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
