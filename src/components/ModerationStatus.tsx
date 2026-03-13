import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type ModerationStatusType = 'pending' | 'approved' | 'rejected';

interface ModerationStatusProps {
  status: ModerationStatusType;
  rejectionReason?: string;
  isOwnContent?: boolean;
}

const rejectionMessages: Record<string, string> = {
  no_vehicle: "We couldn't find a vehicle in your photo. Please try again with a clearer car photo.",
  inappropriate: "This content doesn't meet our community guidelines.",
  spam: "This looks like spam. If this is a mistake, please contact support.",
  default: "This content was removed by our moderation system."
};

function getRejectionMessage(reason?: string): string {
  if (!reason) return rejectionMessages.default;
  return rejectionMessages[reason] || rejectionMessages.default;
}

export function ModerationStatus({ status, rejectionReason, isOwnContent = false }: ModerationStatusProps) {
  if (status === 'approved') {
    return null;
  }

  if (status === 'pending') {
    return (
      <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-3 flex items-start gap-3">
        <Clock className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-accent-primary">Under Review</p>
          <p className="text-xs text-accent-primary/80 mt-0.5">
            Your content is being reviewed and will be visible to others shortly.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-start gap-3">
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-300">Content Removed</p>
          <p className="text-xs text-red-400/80 mt-1">
            {getRejectionMessage(rejectionReason)}
          </p>
          {isOwnContent && (
            <p className="text-xs text-secondary mt-2">
              This content is only visible to you.
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
