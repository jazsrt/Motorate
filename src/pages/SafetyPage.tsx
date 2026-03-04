import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Layout } from '../components/Layout';
import { type OnNavigate } from '../types/navigation';
import { ReportStolenModal } from '../components/ReportStolenModal';
import { AlertTriangle, MapPin, AlertOctagon, MapPinned, Search } from 'lucide-react';
import { getCrimeData, type CrimeIncident } from '../lib/chicagoCrimeApi';
import 'leaflet/dist/leaflet.css';

interface SafetyPageProps {
  onNavigate: OnNavigate;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function SafetyPage({ onNavigate }: SafetyPageProps) {
  const [showStolenCarModal, setShowStolenCarModal] = useState(false);
  const [crimeData, setCrimeData] = useState<CrimeIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.8781, -87.6298]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadCrimeData(mapCenter[0], mapCenter[1]);
  }, []);

  const loadCrimeData = async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCrimeData(lat, lng, 3);
      setCrimeData(data);
    } catch (err) {
      console.error('Failed to load crime data:', err);
      setError('Failed to load crime data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' Chicago')}`);
      const data = await response.json();

      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setMapCenter([newLat, newLng]);
        await loadCrimeData(newLat, newLng);
      } else {
        setError('Location not found');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to search location');
    } finally {
      setSearching(false);
    }
  };

  const handleReportStolen = () => {
    setShowStolenCarModal(true);
  };

  const getCrimeStats = () => {
    const thefts = crimeData.filter(c =>
      c.type?.toUpperCase().includes('THEFT') ||
      c.type?.toUpperCase().includes('BURGLARY')
    ).length;

    const violence = crimeData.filter(c =>
      c.type?.toUpperCase().includes('BATTERY') ||
      c.type?.toUpperCase().includes('ASSAULT')
    ).length;

    const other = crimeData.length - thefts - violence;

    return { thefts, violence, other };
  };

  const stats = getCrimeStats();

  return (
    <Layout currentPage="safety" onNavigate={onNavigate}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Safety & Parking</h2>
          <p className="text-secondary">Tools to help you stay safe</p>
        </div>

        <div className="bg-status-danger/20 border-2 border-status-danger rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertOctagon className="w-8 h-8 text-status-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-status-danger mb-2 uppercase tracking-wider">Report My Car Stolen</h3>
              <p className="text-primary/90 text-sm mb-4 font-medium">
                If your vehicle has been stolen, report it here to alert the Reputation community.
                We'll flag your vehicle and notify you if anyone spots it.
              </p>
              <button
                onClick={handleReportStolen}
                className="px-6 py-3 bg-status-danger hover:bg-status-danger/90 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95"
              >
                Report Stolen Vehicle
              </button>
            </div>
          </div>
        </div>

        <div className="bg-status-warning/20 border border-status-warning rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-status-warning flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-status-warning mb-2 uppercase tracking-wider">Safety Guidelines</h3>
              <ul className="space-y-2 text-sm text-status-warning/90 font-medium">
                <li>• Never confront drivers about their ratings</li>
                <li>• This data is for entertainment purposes only</li>
                <li>• Report abusive content immediately</li>
                <li>• Respect privacy and local laws</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <MapPin className="w-6 h-6 text-accent-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold mb-2 uppercase tracking-wider">Parking Timer</h3>
              <p className="text-secondary text-sm mb-4 font-medium">
                Set a reminder for when your parking meter expires
              </p>
              <button className="px-4 py-2 bg-accent-primary hover:bg-accent-hover rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95">
                Set Timer
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-surfacehighlight rounded-xl overflow-hidden">
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wider flex items-center gap-2">
              <MapPinned className="w-5 h-5 text-accent-primary" />
              Chicago Crime Map
            </h3>

            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Chicago address..."
                className="flex-1 px-4 py-2 bg-surfacehighlight rounded-lg text-white border border-surfacehighlight focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
              <button
                type="submit"
                disabled={searching}
                className="bg-accent-primary hover:bg-accent-hover p-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Search className="w-6 h-6 text-white" />
              </button>
            </form>

            {!loading && !error && crimeData.length > 0 && (
              <div className="bg-surfacehighlight rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <span className="font-bold text-xs">Incidents: {crimeData.length}</span>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-600"></div>
                      <span className="text-[10px]">Violence ({stats.violence})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-[10px]">Theft ({stats.thefts})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange"></div>
                      <span className="text-[10px]">Other ({stats.other})</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {loading && (
            <div className="bg-surfacehighlight p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto mb-4"></div>
              <p className="text-secondary text-sm">Loading crime data...</p>
            </div>
          )}

          {error && (
            <div className="bg-status-danger/20 border border-status-danger m-4 rounded-xl p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-status-danger mx-auto mb-2" />
              <p className="text-status-danger text-sm font-medium">{error}</p>
              <button
                onClick={() => loadCrimeData(mapCenter[0], mapCenter[1])}
                className="mt-4 px-4 py-2 bg-status-danger hover:bg-status-danger/90 rounded-lg text-sm font-bold"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && crimeData.length > 0 && (
            <>
              <div style={{ height: '500px', width: '100%' }}>
                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapUpdater center={mapCenter} />

                  {crimeData.map((crime, idx) => {
                    if (!crime.location) return null;

                    const fillColor =
                      crime.type?.toUpperCase().includes('THEFT') || crime.type?.toUpperCase().includes('BURGLARY') ? 'orange' :
                      crime.type?.toUpperCase().includes('BATTERY') || crime.type?.toUpperCase().includes('ASSAULT') ? 'red' :
                      'blue';

                    return (
                      <CircleMarker
                        key={`${crime.id}-${idx}`}
                        center={[crime.location.lat, crime.location.lng]}
                        radius={8}
                        pathOptions={{
                          fillColor,
                          color: 'white',
                          weight: 1,
                          fillOpacity: 0.7
                        }}
                      >
                        <Popup>
                          <div className="text-black">
                            <strong className="block text-sm font-bold">{crime.primary_type}</strong>
                            <p className="text-xs mt-1">{crime.description}</p>
                            <p className="text-xs text-gray-500 mt-1">{crime.block}</p>
                            <p className="text-xs text-gray-500">{new Date(crime.date).toLocaleDateString()}</p>
                            {crime.arrest && (
                              <span className="inline-block mt-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold">
                                Arrest Made
                              </span>
                            )}
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              </div>

              <div className="p-4 bg-surfacehighlight">
                <p className="text-xs text-secondary">
                  Data provided by the City of Chicago. Showing incidents within 3km radius.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="bg-status-danger/20 border border-status-danger rounded-xl p-6">
          <h3 className="text-lg font-bold text-status-danger mb-3 uppercase tracking-wider">Report Abuse</h3>
          <p className="text-primary/90 text-sm mb-4 font-medium">
            If you see content that violates our community guidelines or contains personal attacks,
            please report it immediately.
          </p>
          <button className="px-4 py-2 bg-status-danger hover:bg-status-danger/90 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95">
            Report Content
          </button>
        </div>
      </div>

      {showStolenCarModal && (
        <ReportStolenModal
          onClose={() => setShowStolenCarModal(false)}
          onSuccess={() => setShowStolenCarModal(false)}
        />
      )}

    </Layout>
  );
}
