import { useState, useEffect } from 'react';
import { Ban, Check } from 'lucide-react';
import { blockUser, unblockUser, isUserBlocked } from '../lib/blocks';
import { useToast } from '../contexts/ToastContext';

interface BlockUserButtonProps {
  userId: string;
  userName: string;
  variant?: 'button' | 'menu-item';
}

export function BlockUserButton({ userId, userName, variant = 'button' }: BlockUserButtonProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function checkBlockStatus() {
      const blocked = await isUserBlocked(userId);
      setIsBlocked(blocked);
    }
    checkBlockStatus();
  }, [userId]);

  async function handleToggleBlock() {
    if (!isBlocked) {
      setShowConfirm(true);
      return;
    }

    setIsLoading(true);

    try {
      const result = await unblockUser(userId);
      if (result.success) {
        setIsBlocked(false);
        showToast(`${userName} has been unblocked`, 'success');
      } else {
        showToast(result.error || 'Failed to unblock user', 'error');
      }
    } catch (error) {
      console.error('Error toggling block:', error);
      showToast('An error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmBlock() {
    setShowConfirm(false);
    setIsLoading(true);

    try {
      const result = await blockUser(userId);
      if (result.success) {
        setIsBlocked(true);
        showToast(`${userName} has been blocked. They can't message you and their content will be hidden.`, 'success');
      } else {
        showToast(result.error || 'Failed to block user', 'error');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      showToast('An error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  if (variant === 'menu-item') {
    return (
      <button
        onClick={handleToggleBlock}
        disabled={isLoading}
        style={{
          width: '100%', padding: '8px 16px', textAlign: 'left' as const,
          fontSize: 14, background: 'transparent', border: 'none', cursor: 'pointer',
          opacity: isLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8,
          color: '#eef4f8', fontFamily: "'Barlow', sans-serif",
        }}
      >
        {isBlocked ? (
          <>
            <Check style={{ width: 16, height: 16 }} />
            <span>Unblock {userName}</span>
          </>
        ) : (
          <>
            <Ban style={{ width: 16, height: 16 }} />
            <span>Block {userName}</span>
          </>
        )}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleToggleBlock}
        disabled={isLoading}
        style={{
          padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
          opacity: isLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8,
          background: isBlocked ? '#16a34a' : '#dc2626',
          color: '#fff', border: 'none',
          fontFamily: "'Barlow', sans-serif", fontSize: 14,
        }}
      >
        {isBlocked ? (
          <>
            <Check style={{ width: 16, height: 16 }} />
            <span>Unblock</span>
          </>
        ) : (
          <>
            <Ban style={{ width: 16, height: 16 }} />
            <span>Block User</span>
          </>
        )}
      </button>

      {showConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              background: '#0e1320', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, width: '100%', maxWidth: 448,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{
                fontSize: 18, fontWeight: 700, color: '#eef4f8',
                fontFamily: "'Rajdhani', sans-serif",
              }}>
                Block {userName}?
              </h3>
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 14, color: '#7a8e9e', marginBottom: 16, fontFamily: "'Barlow', sans-serif" }}>
                Blocking {userName} will prevent them from messaging you and their content will be hidden from your feed.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    flex: 1, padding: '8px 16px', borderRadius: 8,
                    background: '#0e1320', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#eef4f8', fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Barlow', sans-serif", fontSize: 14,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBlock}
                  disabled={isLoading}
                  style={{
                    flex: 1, padding: '8px 16px', borderRadius: 8,
                    background: '#dc2626', color: '#fff', border: 'none',
                    fontWeight: 600, cursor: 'pointer',
                    opacity: isLoading ? 0.5 : 1,
                    fontFamily: "'Barlow', sans-serif", fontSize: 14,
                  }}
                >
                  {isLoading ? 'Blocking...' : 'Block User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
