import { X, Lock, Car } from 'lucide-react';

interface GuestJoinModalProps {
  onClose: () => void;
  action: string;
}

export function GuestJoinModal({ onClose, action }: GuestJoinModalProps) {
  const handleJoin = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surfacehighlight rounded-xl max-w-md w-full">
        <div className="p-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-accent-primary/20 rounded-full flex items-center justify-center">
              <Car className="w-8 h-8 text-accent-primary" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-2">Join the Garage</h2>
            <p className="text-secondary">
              {action} requires an account. Join MotoRate to interact with the community, rate vehicles, and share your rides.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleJoin}
              className="w-full py-3 bg-accent-primary text-white font-bold rounded-xl hover:bg-accent-primary/90 transition-colors"
            >
              Sign Up Free
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 bg-surfacehighlight text-primary font-medium rounded-xl hover:bg-surfacehighlight/80 transition-colors"
            >
              Continue Browsing
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-secondary justify-center">
            <Lock className="w-3 h-3" />
            <span>Free forever. No credit card required.</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-surfacehighlight rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
