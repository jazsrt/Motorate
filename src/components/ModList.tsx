import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ModListProps {
  mods: any[];
  category: string;
  vehicleId: string;
  onUpdate: () => void;
}

export function ModList({ mods, category, vehicleId, onUpdate }: ModListProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    part_name: '',
    brand: '',
    cost_usd: ''
  });
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

    if (!error) {
      onUpdate();
    }
  }

  return (
    <div>
      {mods.length === 0 ? (
        <p className="text-gray-500 text-sm italic mb-4">
          No modifications in this category yet
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {mods.map((mod) => (
            <div
              key={mod.id}
              className="flex items-start justify-between p-3 bg-surface border border-surfacehighlight rounded-lg"
            >
              <div className="flex-1">
                <div className="font-semibold text-primary">{mod.part_name}</div>
                {mod.brand && (
                  <div className="text-sm text-secondary">Brand: {mod.brand}</div>
                )}
                {mod.cost_usd && (
                  <div className="text-sm text-green-600 font-medium">
                    ${parseFloat(mod.cost_usd).toFixed(2)}
                  </div>
                )}
                {mod.notes && (
                  <div className="text-sm text-gray-500 mt-1">{mod.notes}</div>
                )}
              </div>
              <button
                onClick={() => handleDelete(mod.id)}
                className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
                title="Remove modification"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-accent-primary hover:text-accent-primary font-semibold text-sm"
        >
          <Plus size={18} />
          Add Modification
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-orange/10 rounded-lg border-2 border-orange/30">
          <input
            type="text"
            placeholder="Part Name *"
            required
            value={formData.part_name}
            onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Brand (optional)"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Cost USD (optional)"
            value={formData.cost_usd}
            onChange={(e) => setFormData({ ...formData, cost_usd: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-orange text-white rounded-lg hover:bg-orange disabled:opacity-50 font-medium"
            >
              {saving ? 'Adding...' : 'Add Mod'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({ part_name: '', brand: '', cost_usd: '' });
              }}
              className="px-4 py-2 bg-surfacehighlight text-secondary rounded-lg hover:bg-surfacehighlight/80 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
