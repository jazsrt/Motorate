import { useState, useEffect } from 'react';
import { Camera, Car } from 'lucide-react';
import { supabase } from '../lib/supabase';

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

interface PlateSearchProps {
  onSearch: (state: string, plateNumber: string) => void;
  onCameraScan?: () => void;
  onNavigateToVehicle?: (vehicleId: string) => void;
  initialPlate?: string;
}

export function PlateSearch({ onSearch, onCameraScan, onNavigateToVehicle, initialPlate }: PlateSearchProps) {
  const [state, setState] = useState('Illinois');
  const [plateNumber, setPlateNumber] = useState(initialPlate || '');
  const [recentSpots, setRecentSpots] = useState<any[]>([]);

  useEffect(() => {
    loadRecentSpots();
  }, []);

  useEffect(() => {
    if (initialPlate) {
      setPlateNumber(initialPlate);
    }
  }, [initialPlate]);

  async function loadRecentSpots() {
    try {
      const { data } = await supabase
        .from('vehicles')
        .select('id, year, make, model, plate_number, plate_state')
        .not('owner_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentSpots(data || []);
    } catch (err) {
      console.error('Failed to load recent spots:', err);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state || !plateNumber.trim()) return;
    onSearch(state, plateNumber.trim().toUpperCase());
  };

  return (
    <>
      {/* Divider */}
      <div className="px-4 pt-6 pb-6 flex flex-col items-center">
        <div className="flex items-center gap-3 w-full max-w-xs mb-6">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-[10px] uppercase tracking-[2px] font-medium" style={{ color: 'var(--t4)' }}>
            or enter manually
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Manual Input Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
              placeholder="ABC 1234"
              className="flex-1 rounded-lg px-4 py-3 uppercase outline-none transition-all"
              style={{
                background: 'linear-gradient(135deg, #ece4d4, #f4ecdc, #ece4d4)',
                border: '2px solid #888',
                color: '#111',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '32px',
                letterSpacing: '0.3em',
                fontWeight: 700,
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={(e) => (e.target.style.borderColor = '#888')}
            />
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="min-w-[90px] rounded-lg px-3 py-3 text-xs outline-none cursor-pointer transition-all"
              style={{
                background: 'var(--s2)',
                border: '1px solid var(--border)',
                color: 'var(--t2)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            >
              {US_STATES.map((s) => (
                <option key={s.code} value={s.name}>{s.code}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!plateNumber.trim() || !state}
            className="spot-btn disabled:opacity-40"
          >
            Look Up Plate
          </button>
        </form>
      </div>

      <div className="h-20" />
    </>
  );
}
