import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/storage';
import { ArrowLeft, Plus, Trash2, AlertCircle, Upload, X, DollarSign, Package } from 'lucide-react';
import { OnNavigate } from '../types/navigation';

interface BuildSheetPageProps {
  vehicleId: string;
  onNavigate: OnNavigate;
  onBack: () => void;
}

interface Modification {
  id: string;
  category: string | null;
  part_name: string;
  brand: string | null;
  cost_usd: number | null;
  image_urls: string[] | null;
  notes: string | null;
  is_verified: boolean;
}

const CATEGORIES = ['engine', 'suspension', 'exterior', 'interior', 'wheels', 'exhaust', 'electronics', 'other'];
const CATEGORY_LABELS: Record<string, string> = {
  engine: 'Engine',
  suspension: 'Suspension',
  exterior: 'Exterior',
  interior: 'Interior',
  wheels: 'Wheels & Tires',
  exhaust: 'Exhaust',
  electronics: 'Electronics',
  other: 'Other'
};

export function BuildSheetPage({ vehicleId, onNavigate, onBack }: BuildSheetPageProps) {
  const [modifications, setModifications] = useState<Modification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newCategory, setNewCategory] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);

  useEffect(() => {
    loadModifications();
  }, [vehicleId]);

  const loadModifications = async () => {
    const { data } = await supabase
      .from('vehicle_modifications')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('category', { ascending: true });

    if (data) setModifications(data);
    setLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddModification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let imageUrls: string[] = [];

      if (newImage) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const uploadedUrl = await uploadImage(newImage, 'vehicles');
          if (uploadedUrl) {
            imageUrls = [uploadedUrl];
          }
        }
      }

      const { error: insertError } = await supabase
        .from('vehicle_modifications')
        .insert({
          vehicle_id: vehicleId,
          category: newCategory.toLowerCase() || null,
          part_name: newPartName,
          brand: newBrand || null,
          cost_usd: newCost ? parseFloat(newCost) : null,
          notes: newNotes || null,
          image_urls: imageUrls.length > 0 ? imageUrls : null,
        });

      if (insertError) {
        setError(insertError.message);
      } else {
        setNewCategory('');
        setNewPartName('');
        setNewBrand('');
        setNewCost('');
        setNewNotes('');
        setNewImage(null);
        setShowAddForm(false);
        loadModifications();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteModification = async (modId: string) => {
    if (!confirm('Remove this modification?')) return;

    const { error: deleteError } = await supabase
      .from('vehicle_modifications')
      .delete()
      .eq('id', modId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      loadModifications();
    }
  };

  const totalInvested = modifications.reduce((sum, mod) => sum + (mod.cost_usd || 0), 0);
  const modCount = modifications.length;

  if (loading) {
    return (
      <Layout currentPage="profile" onNavigate={onNavigate}>
        <div className="flex items-center justify-center py-12">
          <div className="text-secondary">Loading build sheet...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Vehicle
        </button>

        <div>
          <h2 className="text-2xl font-bold mb-2">Build Sheet</h2>
          <p className="text-secondary">Track every modification and investment</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6" />
              <h3 className="text-sm font-bold uppercase tracking-wider opacity-90">Total Invested</h3>
            </div>
            <p className="text-3xl font-bold">${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>

          <div className="bg-gradient-to-br from-[#F97316] to-[#fb923c] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-6 h-6" />
              <h3 className="text-sm font-bold uppercase tracking-wider opacity-90">Mod Count</h3>
            </div>
            <p className="text-3xl font-bold">{modCount}</p>
          </div>
        </div>

        {error && (
          <div className="bg-status-danger/20 border border-status-danger rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-status-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-status-danger">{error}</p>
          </div>
        )}

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-gradient-to-tr from-accent-primary to-[#fb923c] hover:from-accent-hover hover:to-[#fb923c] rounded-xl px-4 py-3 font-bold uppercase tracking-wider text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[#F97316]/30"
          >
            <Plus className="w-5 h-5" />
            Add Modification
          </button>
        )}

        {showAddForm && (
          <form onSubmit={handleAddModification} className="bg-surface border border-surfacehighlight rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="brand" className="block text-sm font-medium mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  id="brand"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Garrett, KW, etc."
                />
              </div>
            </div>

            <div>
              <label htmlFor="partName" className="block text-sm font-medium mb-2">
                Part / Modification *
              </label>
              <input
                type="text"
                id="partName"
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., GTX3076R Turbo Kit"
                required
              />
            </div>

            <div>
              <label htmlFor="cost" className="block text-sm font-medium mb-2">
                Cost (USD)
              </label>
              <input
                type="number"
                id="cost"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                step="0.01"
                min="0"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={3}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                placeholder="Installation notes, performance gains, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Photo (Optional)
              </label>
              {!newImage ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-700 rounded-lg cursor-pointer hover:border-orange transition-colors">
                  <Upload className="w-8 h-8 text-secondary mb-2" />
                  <span className="text-sm text-secondary">Click to upload image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative">
                  <img src={newImage} alt="Modification preview" className="w-full h-48 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setNewImage(null)}
                    className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCategory('');
                  setNewPartName('');
                  setNewBrand('');
                  setNewCost('');
                  setNewNotes('');
                  setNewImage(null);
                }}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 rounded-lg px-4 py-3 font-medium transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-accent-primary hover:bg-accent-hover rounded-lg px-4 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Modifications</h3>
          {modifications.length === 0 ? (
            <p className="text-secondary text-center py-8">No modifications added yet</p>
          ) : (
            <div className="space-y-6">
              {CATEGORIES.map((category) => {
                const categoryMods = modifications.filter((m) => m.category === category);
                if (categoryMods.length === 0) return null;

                const categoryTotal = categoryMods.reduce((sum, mod) => sum + (mod.cost_usd || 0), 0);

                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-accent-primary uppercase tracking-wider">
                        {CATEGORY_LABELS[category]}
                      </h4>
                      {categoryTotal > 0 && (
                        <span className="text-xs font-bold text-secondary">
                          ${categoryTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {categoryMods.map((mod) => (
                        <div
                          key={mod.id}
                          className="bg-surfacehighlight rounded-xl p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-3">
                                {mod.image_urls && mod.image_urls.length > 0 && (
                                  <img
                                    src={mod.image_urls[0]}
                                    alt={mod.part_name}
                                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold truncate">{mod.part_name}</div>
                                  {mod.brand && (
                                    <div className="text-sm text-secondary">{mod.brand}</div>
                                  )}
                                  {mod.cost_usd !== null && (
                                    <div className="text-sm font-bold text-green-500 mt-1">
                                      ${mod.cost_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </div>
                                  )}
                                  {mod.notes && (
                                    <div className="text-xs text-secondary mt-2 line-clamp-2">
                                      {mod.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteModification(mod.id)}
                              className="p-2 text-status-danger hover:bg-red-900/30 rounded transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {modifications.filter((m) => !m.category).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-secondary mb-3">Uncategorized</h4>
                  <div className="space-y-3">
                    {modifications.filter((m) => !m.category).map((mod) => (
                      <div
                        key={mod.id}
                        className="bg-surfacehighlight rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3">
                              {mod.image_urls && mod.image_urls.length > 0 && (
                                <img
                                  src={mod.image_urls[0]}
                                  alt={mod.part_name}
                                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-bold truncate">{mod.part_name}</div>
                                {mod.brand && (
                                  <div className="text-sm text-secondary">{mod.brand}</div>
                                )}
                                {mod.cost_usd !== null && (
                                  <div className="text-sm font-bold text-green-500 mt-1">
                                    ${mod.cost_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </div>
                                )}
                                {mod.notes && (
                                  <div className="text-xs text-secondary mt-2 line-clamp-2">
                                    {mod.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteModification(mod.id)}
                            className="p-2 text-status-danger hover:bg-red-900/30 rounded transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
