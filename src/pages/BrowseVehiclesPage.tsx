import { useState, useEffect } from 'react';
import { Search, Car, Star, MapPin, Camera, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { SearchFilters, VehicleFilters } from '../components/SearchFilters';
import { supabase } from '../lib/supabase';
import { type OnNavigate } from '../types/navigation';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  avg_rating: number;
  spot_count: number;
  is_claimed: boolean;
  verification_status: string;
  owner_id?: string;
  photos?: { url: string; is_private?: boolean; uploaded_by?: string }[];
  stock_image_url?: string;
}

interface BrowseVehiclesPageProps {
  onNavigate: OnNavigate;
}

export function BrowseVehiclesPage({ onNavigate }: BrowseVehiclesPageProps) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<VehicleFilters>({
    make: '',
    year: '',
    verifiedOnly: false,
    sortBy: 'newest',
  });

  const [availableMakes, setAvailableMakes] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    loadVehicles();
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    const { data: makesData } = await supabase
      .from('vehicles')
      .select('make')
      .not('make', 'is', null);

    const { data: yearsData } = await supabase
      .from('vehicles')
      .select('year')
      .not('year', 'is', null);

    const makes = [...new Set(makesData?.map((v) => v.make).filter(Boolean) || [])].sort();
    const years = [...new Set(yearsData?.map((v) => v.year).filter(Boolean) || [])].sort(
      (a, b) => b - a
    );

    setAvailableMakes(makes);
    setAvailableYears(years);
  };

  const loadVehicles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('vehicles')
        .select(
          `
          id,
          make,
          model,
          year,
          color,
          avg_rating,
          spot_count,
          is_claimed,
          verification_status,
          owner_id,
          stock_image_url,
          photos:vehicle_images(url, is_private, uploaded_by)
        `
        )
        .not('make', 'is', null)
        .not('model', 'is', null);

      const { data, error } = await query;

      if (error) throw error;

      setVehicles((data as any) || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles
    .filter((v) => {
      if (filters.make && v.make !== filters.make) return false;
      if (filters.year && v.year !== parseInt(filters.year)) return false;
      if (filters.verifiedOnly && v.verification_status !== 'verified') return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          v.make?.toLowerCase().includes(query) ||
          v.model?.toLowerCase().includes(query) ||
          v.color?.toLowerCase().includes(query) ||
          v.year?.toString().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'rating':
          return (b.avg_rating || 0) - (a.avg_rating || 0);
        case 'spots':
          return (b.spot_count || 0) - (a.spot_count || 0);
        case 'oldest':
          return a.year - b.year;
        case 'newest':
        default:
          return b.year - a.year;
      }
    });

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Layout currentPage="search" onNavigate={onNavigate}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-2">
            <Car className="w-8 h-8 text-accent-primary" />
            Browse Vehicles
          </h1>
          <p className="text-secondary">
            Explore {vehicles.length} vehicles in the community
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
            <input
              type="text"
              placeholder="Search by make, model, color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface border border-surfacehighlight rounded-lg text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableMakes={availableMakes}
            availableYears={availableYears}
          />
        </div>

        {filteredVehicles.length === 0 ? (
          <EmptyState
            icon={<Car className="w-16 h-16 text-secondary" />}
            title="No vehicles found"
            description="Try adjusting your search or filters"
          />
        ) : (
          <>
            <div className="mb-4 text-sm text-secondary">
              Showing {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredVehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                >
                  <VehicleCard vehicle={vehicle} onNavigate={onNavigate} currentUserId={user?.id} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

interface VehicleCardProps {
  vehicle: Vehicle;
  onNavigate: OnNavigate;
  currentUserId?: string;
}

function VehicleCard({ vehicle, onNavigate, currentUserId }: VehicleCardProps) {
  const isOwner = currentUserId && vehicle.owner_id === currentUserId;

  // Filter out private photos if viewer is not the owner
  const visiblePhotos = vehicle.photos?.filter(photo => {
    if (!photo.is_private) return true;
    return isOwner;
  }) || [];

  const primaryPhoto = visiblePhotos[0]?.url || vehicle.stock_image_url;
  const hasPrivatePhoto = vehicle.photos?.[0]?.is_private && !isOwner;
  const isVerified = vehicle.verification_status === 'verified';

  return (
    <div
      className="bg-surface rounded-lg border border-surfacehighlight overflow-hidden hover:border-accent-primary transition-all cursor-pointer group"
      onClick={() => onNavigate('vehicle-detail', vehicle.id)}
    >
      <div className="relative aspect-video bg-surfacehighlight">
        {hasPrivatePhoto ? (
          <div className="w-full h-full bg-gradient-to-br from-surfacehighlight to-surface flex items-center justify-center flex-col gap-2">
            <Lock className="w-8 h-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Owner set this photo as private</span>
          </div>
        ) : primaryPhoto ? (
          <img
            src={primaryPhoto}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surfacehighlight to-surface flex items-center justify-center">
            <Camera className="w-8 h-8 text-secondary" />
          </div>
        )}

        {isVerified && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            Verified
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="flex items-center gap-3 text-white text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-[#F97316] text-[#F97316]" />
              <span>{vehicle.avg_rating ? vehicle.avg_rating.toFixed(1) : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{vehicle.spot_count || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg text-primary group-hover:text-accent-primary transition-colors">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        <p className="text-sm text-secondary mt-1">{vehicle.color}</p>
        {vehicle.is_claimed && (
          <span className="inline-block mt-2 text-xs bg-accent-primary/10 text-accent-primary px-2 py-1 rounded-full font-medium">
            Claimed
          </span>
        )}
      </div>
    </div>
  );
}
