import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ModListProps {
  mods: any[];
  category: string;
  vehicleId: string;
  onUpdate: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
  background: '#0e1320', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8, outline: 'none',
  fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#eef4f8',
};

export function ModList({ mods, category, vehicleId, onUpdate }: ModListProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ part_name: '', brand: '', cost_usd: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('vehicle_modifications')
      .insert({
        vehicle_id: vehicleId,
        user_id: user?.id,
        category,
        part_name: formData.part_name,
        brand: formData.brand || null,
        cost_usd: formData.cost_usd ? parseFloat(formData.cost_usd) : null
      });

    if (!error) {
      setFormData({ part_name: '', brand: '', cost_usd: '' });
      setShowForm(false);
      onUpdate();
    } else {
      alert('Failed to add modification');
    }

    setSaving(false);
  }

  async function handleDelete(modId: string) {
    if (!confirm('Remove this modification?')) return;

    const { error } = await supabase
      .from('vehicle_modifications')
      .delete()
      .eq('id', modId);

    if (!error) onUpdate();
  }

  return (
    <div>
      {mods.length === 0 ? (
        <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#3a4e60', fontStyle: 'italic', margin: '0 0 12px' }}>
          No modifications in this category yet
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 12 }}>
          {mods.map((mod) => (
            <div
              key={mod.id}
              style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                padding: '10px 12px', background: '#0e1320',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: '#eef4f8' }}>{mod.part_name}</div>
                {mod.brand && (
                  <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e', marginTop: 2 }}>
                    {mod.brand}
                  </div>
                )}
                {mod.cost_usd && (
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#20c060', fontWeight: 600, marginTop: 2 }}>
                    ${parseFloat(mod.cost_usd).toFixed(2)}
                  </div>
                )}
                {mod.notes && (
                  <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', marginTop: 4 }}>{mod.notes}</div>
                )}
              </div>
              <button
                onClick={() => handleDelete(mod.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#ef4444' }}
                title="Remove modification"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Modification
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{
          display: 'flex', flexDirection: 'column' as const, gap: 10,
          padding: 14, background: 'rgba(249,115,22,0.05)',
          borderRadius: 8, border: '1px solid rgba(249,115,22,0.2)',
        }}>
          <input type="text" placeholder="Part Name *" required value={formData.part_name}
            onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
            style={inputStyle} />
          <input type="text" placeholder="Brand (optional)" value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            style={inputStyle} />
          <input type="number" step="0.01" placeholder="Cost USD (optional)" value={formData.cost_usd}
            onChange={(e) => setFormData({ ...formData, cost_usd: e.target.value })}
            style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
              background: '#F97316', fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
              color: '#030508', cursor: 'pointer', opacity: saving ? 0.5 : 1,
            }}>
              {saving ? 'Adding...' : 'Add Mod'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormData({ part_name: '', brand: '', cost_usd: '' }); }}
              style={{
                padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent', fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                color: '#7a8e9e', cursor: 'pointer',
              }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
