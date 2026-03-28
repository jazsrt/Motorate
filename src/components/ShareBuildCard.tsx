import { QRCodeSVG } from 'qrcode.react';
import { Trophy, Award, Car, User } from 'lucide-react';

interface ShareBuildCardProps {
  vehicle: {
    id: string;
    make: string | null;
    model: string | null;
    year: number | null;
    stock_image_url: string | null;
    profile_image_url?: string | null;
  };
  user: {
    handle: string;
    avatar_url: string | null;
    reputation_score: number;
    tier?: string;
  };
  stats?: {
    badge_count: number;
    rating_driver: number;
    rating_vehicle: number;
  };
}

export function ShareBuildCard({ vehicle, user, stats }: ShareBuildCardProps) {
  const vehicleUrl = `${window.location.origin}/#/vehicle/${vehicle.id}`;
  const avgScore = stats ? Math.round((stats.rating_driver + stats.rating_vehicle) / 2) : 0;

  return (
    <div className="w-full max-w-md bg-gradient-to-br from-background via-surface to-surfacehighlight rounded-2xl overflow-hidden border-2 border-accent-primary shadow-2xl">
      <div className="relative h-64 bg-gradient-to-br from-surfacehighlight to-surface">
        {(vehicle.profile_image_url || vehicle.stock_image_url) ? (
          <img
            src={(vehicle.profile_image_url || vehicle.stock_image_url)!}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-24 h-24 text-secondary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-2xl font-bold text-white mb-1">
            {vehicle.year} {vehicle.make}
          </h2>
          <p className="text-lg text-white/80 font-semibold">{vehicle.model}</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.handle}
                className="w-12 h-12 rounded-full border-2 border-accent-primary object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-accent-primary bg-surfacehighlight flex items-center justify-center">
                <User className="w-5 h-5 text-secondary" strokeWidth={1.5} />
              </div>
            )}
            <div>
              <div className="font-bold text-primary">@{user.handle}</div>
              {user.tier && (
                <div className="text-xs text-accent-primary uppercase tracking-wider font-bold">
                  {user.tier}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white p-2 rounded-lg">
            <QRCodeSVG value={vehicleUrl} size={80} level="H" />
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surfacehighlight rounded-lg p-3 text-center">
              <Trophy className="w-5 h-5 text-accent-primary mx-auto mb-1" />
              <div className="text-xl font-bold text-primary">{user.reputation_score}</div>
              <div className="text-xs text-secondary uppercase tracking-wider">REP</div>
            </div>
            <div className="bg-surfacehighlight rounded-lg p-3 text-center">
              <Award className="w-5 h-5 text-accent-primary mx-auto mb-1" />
              <div className="text-xl font-bold text-primary">{stats.badge_count}</div>
              <div className="text-xs text-secondary uppercase tracking-wider">Badges</div>
            </div>
            <div className="bg-surfacehighlight rounded-lg p-3 text-center">
              <Car className="w-5 h-5 text-accent-primary mx-auto mb-1" />
              <div className="text-xl font-bold text-primary">{avgScore}</div>
              <div className="text-xs text-secondary uppercase tracking-wider">Score</div>
            </div>
          </div>
        )}

        <div className="border-t border-surfacehighlight pt-4">
          <div className="text-center">
            <div className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">
              Scan to view on MotoRate
            </div>
            <div className="text-xs text-secondary">motorate.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}
