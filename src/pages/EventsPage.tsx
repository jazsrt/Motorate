import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { Calendar, MapPin, Users, Clock, Plus, Navigation, Star } from 'lucide-react';
import { OnNavigate } from '../types/navigation';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: 'meet' | 'show' | 'race' | 'cruise' | 'other';
  start_time: string;
  end_time: string | null;
  location_name: string;
  lat: number;
  lng: number;
  organizer_id: string;
  organizer: {
    handle: string;
    avatar_url: string | null;
  };
  attendee_count: number;
  is_attending: boolean;
  distance_meters: number | null;
}

interface EventsPageProps {
  onNavigate: OnNavigate;
}

export function EventsPage({ onNavigate }: EventsPageProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'attending'>('upcoming');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (user) {
      getUserLocation();
      loadEvents();
    }
  }, [user, filter]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const loadEvents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!events_organizer_id_fkey(handle, avatar_url)
        `)
        .order('start_time', { ascending: true });

      if (filter === 'upcoming') {
        query = query.gte('start_time', new Date().toISOString());
      }

      const { data: eventData, error } = await query;

      if (error) throw error;

      if (eventData) {
        const { data: attendeeData } = await supabase
          .from('event_attendees')
          .select('event_id')
          .eq('user_id', user.id);

        const attendingEventIds = new Set(attendeeData?.map(a => a.event_id) || []);

        const enrichedEvents = await Promise.all(
          eventData.map(async (event) => {
            const { count } = await supabase
              .from('event_attendees')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id);

            let distance = null;
            if (userLocation) {
              const lat1 = userLocation.lat * Math.PI / 180;
              const lat2 = event.lat * Math.PI / 180;
              const deltaLat = (event.lat - userLocation.lat) * Math.PI / 180;
              const deltaLng = (event.lng - userLocation.lng) * Math.PI / 180;

              const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              distance = 6371000 * c;
            }

            return {
              ...event,
              attendee_count: count || 0,
              is_attending: attendingEventIds.has(event.id),
              distance_meters: distance,
            };
          })
        );

        let filteredEvents = enrichedEvents;
        if (filter === 'attending') {
          filteredEvents = enrichedEvents.filter(e => e.is_attending);
        }

        setEvents(filteredEvents);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = async (eventId: string, currentlyAttending: boolean) => {
    if (!user) return;

    try {
      if (currentlyAttending) {
        await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('event_attendees')
          .insert({
            event_id: eventId,
            user_id: user.id,
          });
      }

      loadEvents();
    } catch (error) {
      console.error('Error toggling attendance:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDistance = (meters: number | null) => {
    if (!meters) return null;
    const km = meters / 1000;
    if (km < 1) return `${Math.round(meters)}m away`;
    return `${km.toFixed(1)}km away`;
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meet': return 'bg-orange';
      case 'show': return 'bg-accent-2';
      case 'race': return 'bg-red-500';
      case 'cruise': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Car Events</h2>
            <p className="text-secondary">Discover and join local car meets and shows</p>
          </div>
          <button
            onClick={() => onNavigate('profile')}
            className="px-4 py-3 bg-accent-primary hover:bg-accent-hover rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95 flex items-center gap-2 touch-target"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-sm transition-all touch-target ${
              filter === 'upcoming'
                ? 'bg-accent-primary text-white'
                : 'bg-surfacehighlight hover:bg-surface'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('attending')}
            className={`px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-sm transition-all touch-target ${
              filter === 'attending'
                ? 'bg-accent-primary text-white'
                : 'bg-surfacehighlight hover:bg-surface'
            }`}
          >
            Attending
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-sm transition-all touch-target ${
              filter === 'all'
                ? 'bg-accent-primary text-white'
                : 'bg-surfacehighlight hover:bg-surface'
            }`}
          >
            All
          </button>
        </div>

        {loading ? (
          <LoadingSpinner size="lg" label="Loading events..." />
        ) : events.length === 0 ? (
          <div className="bg-surface border border-surfacehighlight rounded-xl">
            <EmptyState
              icon={Calendar}
              title={filter === 'attending' ? 'No Events Attended' : 'No Events Found'}
              description={
                filter === 'attending'
                  ? 'Join some events to see them here!'
                  : 'Check back soon for car meets, shows, and other events in your area.'
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-surface border border-surfacehighlight rounded-xl p-6 hover:border-accent-primary transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`${getEventTypeColor(event.event_type)} text-white text-xs px-2 py-1 rounded-lg font-bold uppercase`}>
                        {event.event_type}
                      </span>
                      {event.is_attending && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                          <Star className="w-3 h-3" fill="currentColor" />
                          Attending
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                    {event.description && (
                      <p className="text-secondary text-sm mb-3">{event.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-secondary text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(event.start_time)} at {formatTime(event.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-secondary text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location_name}</span>
                    {event.distance_meters && (
                      <span className="text-xs text-accent-primary">
                        • {formatDistance(event.distance_meters)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-secondary text-sm">
                    <Users className="w-4 h-4" />
                    <span>{event.attendee_count} {event.attendee_count === 1 ? 'person' : 'people'} attending</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAttendance(event.id, event.is_attending)}
                    className={`flex-1 px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95 touch-target ${
                      event.is_attending
                        ? 'bg-surfacehighlight hover:bg-surface'
                        : 'bg-accent-primary hover:bg-accent-hover text-white'
                    }`}
                  >
                    {event.is_attending ? 'Cancel' : 'Attend'}
                  </button>
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`;
                      window.open(url, '_blank');
                    }}
                    className="px-4 py-2 bg-surfacehighlight hover:bg-surface rounded-xl transition-all active:scale-95 touch-target"
                  >
                    <Navigation className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
