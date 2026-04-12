import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut } from 'lucide-react';

interface SetHandleModalProps {
  userId: string;
  onComplete: (handle: string) => void;
}

export function SetHandleModal({ userId, onComplete }: SetHandleModalProps) {
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validate = (value: string): string | null => {
    if (value.length < 3) return 'Must be at least 3 characters';
    if (value.length > 20) return 'Must be 20 characters or less';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Letters, numbers, and underscores only';
    return null;
  };

  const checkAvailability = useCallback(async (value: string) => {
    const validationError = validate(value);
    if (validationError) {
      setError(validationError);
      setAvailable(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    setError('');
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('handle', value.toLowerCase())
        .neq('id', userId)
        .maybeSingle();

      if (data) {
        setError('That username is taken');
        setAvailable(false);
      } else {
        setError('');
        setAvailable(true);
      }
    } catch {
      setError('Could not check availability');
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!handle.trim()) {
      setError('');
      setAvailable(null);
      return;
    }

    const validationError = validate(handle.trim());
    if (validationError) {
      setError(validationError);
      setAvailable(null);
      return;
    }

    setChecking(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      checkAvailability(handle.trim());
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [handle, checkAvailability]);

  const handleSubmit = async () => {
    if (!available || submitting) return;
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ handle: handle.trim().toLowerCase() })
        .eq('id', userId);

      if (updateError) throw updateError;
      onComplete(handle.trim().toLowerCase());
    } catch {
      setError('Failed to save handle. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = available === true && !checking && !submitting && handle.trim().length >= 3;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#030508',
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo mark */}
        <div style={{
          width: 56, height: 56, borderRadius: 12, margin: '0 auto 28px',
          background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 26, fontWeight: 700, color: '#F97316' }}>M</span>
        </div>

        {/* Heading */}
        <h1 style={{
          fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700,
          color: '#eef4f8', textAlign: 'center' as const, margin: '0 0 8px', lineHeight: 1,
        }}>
          Choose Your Username
        </h1>
        <p style={{
          fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e',
          textAlign: 'center' as const, margin: '0 0 32px', lineHeight: 1.5,
        }}>
          This is your identity on MotoRate. You can't change it later.
        </p>

        {/* Input */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600,
            color: '#F97316',
          }}>@</span>
          <input
            type="text"
            value={handle}
            onChange={e => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
            placeholder="yourusername"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()}
            style={{
              width: '100%', padding: '14px 44px 14px 32px', boxSizing: 'border-box' as const,
              background: '#0d1117', border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : available ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 10, outline: 'none',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 500,
              color: '#eef4f8', letterSpacing: '0.02em',
            }}
          />
          {/* Status indicator */}
          {handle.trim().length >= 3 && (
            <span style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 16,
            }}>
              {checking ? (
                <div style={{ width: 16, height: 16, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : available ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              ) : error ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : null}
            </span>
          )}
        </div>

        {/* Error / status text */}
        <div style={{ minHeight: 20, marginBottom: 20 }}>
          {error && (
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>
          )}
          {available && !error && (
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#22c55e', margin: 0 }}>Username is available</p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: 14, borderRadius: 10, border: 'none',
            background: canSubmit ? '#F97316' : 'rgba(249,115,22,0.2)',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase' as const,
            color: canSubmit ? '#030508' : '#5a6e7e',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          {submitting ? 'Saving...' : 'Continue'}
        </button>

        {/* Sign Out escape */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.hash = '';
            window.location.reload();
          }}
          style={{
            width: '100%', marginTop: 12, padding: 10, borderRadius: 8, border: 'none',
            background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase' as const,
            color: '#5a6e7e', cursor: 'pointer',
          }}
        >
          <LogOut size={11} /> Sign Out
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
