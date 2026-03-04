import { Lock } from 'lucide-react';
import { FollowButton } from './FollowButton';

interface PrivacyGateProps {
  profileUserId: string;
  profileHandle: string;
  isFollowing: boolean;
  onFollowChange?: () => void;
}

export function PrivacyGate({ profileUserId, profileHandle, isFollowing, onFollowChange }: PrivacyGateProps) {
  return (
    <div className="bg-surface border border-surfacehighlight rounded-xl p-12 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-surfacehighlight rounded-full mb-6">
        <Lock size={40} className="text-secondary" />
      </div>

      <h2 className="text-2xl font-bold uppercase tracking-wider mb-3">
        This Account is Private
      </h2>

      <p className="text-secondary mb-6 max-w-md mx-auto">
        Follow @{profileHandle || 'this user'} to see their photos, vehicles, and activity
      </p>

      <div className="flex justify-center">
        <FollowButton
          targetUserId={profileUserId}
          onFollowChange={onFollowChange}
        />
      </div>
    </div>
  );
}
