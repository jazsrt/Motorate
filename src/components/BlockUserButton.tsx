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
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
      >
        {isBlocked ? (
          <>
            <Check className="w-4 h-4" />
            <span>Unblock {userName}</span>
          </>
        ) : (
          <>
            <Ban className="w-4 h-4" />
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
        className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${
          isBlocked
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
      >
        {isBlocked ? (
          <>
            <Check className="w-4 h-4" />
            <span>Unblock</span>
          </>
        ) : (
          <>
            <Ban className="w-4 h-4" />
            <span>Block User</span>
          </>
        )}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="card-v3 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-surfacehighlight">
              <h3 className="text-lg font-heading font-bold text-primary">Block {userName}?</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-secondary mb-4">
                Blocking {userName} will prevent them from messaging you and their content will be hidden from your feed.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-surfacehighlight hover:bg-surfacehighlight/80 text-primary font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBlock}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
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
