import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, Star, ThumbsUp, MessageSquare, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface VehicleStatsProps {
  vehicleId: string;
}

interface Stats {
  totalViews: number;
  totalReviews: number;
  averageRating: number;
  totalStickers: number;
  positiveStickers: number;
  negativeStickers: number;
}

export function VehicleStats({ vehicleId }: VehicleStatsProps) {
  const [stats, setStats] = useState<Stats>({
    totalViews: 0,
    totalReviews: 0,
    averageRating: 0,
    totalStickers: 0,
    positiveStickers: 0,
    negativeStickers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [vehicleId]);

  async function loadStats() {
    try {
      const { data: reviews, error: reviewsError } = await supabase
        .from('posts')
        .select('rating_driver, rating_vehicle')
        .eq('vehicle_id', vehicleId);

      if (reviewsError) throw reviewsError;

      const totalReviews = reviews?.length || 0;
      const avgDriverScore = totalReviews > 0
        ? reviews!.reduce((sum, r) => sum + (r.rating_driver ?? r.rating_vehicle ?? 0), 0) / totalReviews
        : 0;
      const avgVehicleScore = totalReviews > 0
        ? reviews!.reduce((sum, r) => sum + (r.rating_vehicle ?? 0), 0) / totalReviews
        : 0;
      const averageRating = (avgDriverScore + avgVehicleScore) / 2;

      const { data: stickers, error: stickersError } = await supabase
        .from('vehicle_stickers')
        .select(`
          sticker_id,
          bumper_stickers!vehicle_stickers_sticker_id_fkey(category)
        `)
        .eq('vehicle_id', vehicleId);

      if (stickersError) throw stickersError;

      const totalStickers = stickers?.length || 0;
      const positiveStickers = stickers?.filter((s: any) => s.bumper_stickers?.category === 'Positive').length || 0;
      const negativeStickers = stickers?.filter((s: any) => s.bumper_stickers?.category === 'Negative').length || 0;

      // profile_views table not yet created in Supabase
      const viewsCount = 0;

      setStats({
        totalViews: viewsCount,
        totalReviews,
        averageRating,
        totalStickers,
        positiveStickers,
        negativeStickers
      });
    } catch (error) {
      console.error('Failed to load vehicle stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[var(--s1)] border border-[var(--border2)] rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-[var(--border2)] rounded w-16 mb-2" />
            <div className="h-6 bg-[var(--border2)] rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    { label: 'Views', value: stats.totalViews, icon: Eye, color: 'blue' },
    { label: 'Spots', value: stats.totalReviews, icon: MessageSquare, color: 'green' },
    { label: 'Avg Rating', value: stats.averageRating.toFixed(1), icon: Star, color: 'yellow' },
    { label: 'Stickers', value: stats.totalStickers, icon: ThumbsUp, color: 'purple' },
    { label: 'Positive', value: stats.positiveStickers, icon: ThumbsUp, color: 'green' },
    { label: 'Negative', value: stats.negativeStickers, icon: ThumbsUp, color: 'red' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-surfacehighlight rounded-xl p-4 hover:bg-surfacehighlight/80 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">{stat.label}</span>
            <stat.icon className={`w-4 h-4 text-${stat.color}-500`} />
          </div>
          <p className="text-2xl font-bold text-white">{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
