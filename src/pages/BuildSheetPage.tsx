import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/storage';
import { ArrowLeft, Plus, AlertCircle, Upload, X, DollarSign, Package } from 'lucide-react';
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
  price_paid: number | null;
  after_photo_url: string | null;
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

const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '11px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none' };
const labelStyle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#7a8e9e', marginBottom: 6, display: 'block' };
const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '13px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#000', cursor: 'pointer' };

const sectionHeaderStyle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: '#7a8e9e' };
const fieldContainerStyle: React.CSSProperties = { background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 };
const inputRowStyle: React.CSSProperties = { padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' };

export function BuildSheetPage({ vehicleId, onNavigate, onBack }: BuildSheetPageProps) {
  const [modifications, setModifications] = useState<Modification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredDelete, setHoveredDelete] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);

  const loadModifications = useCallback(async () => {
    const { data } = await supabase
      .from('vehicle_modifications')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('category', { ascending: true });

    if (data) setModifications(data);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => {
    loadModifications();
  }, [vehicleId, loadModifications]);

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
      let imageUrl: string | null = null;

      if (newImage) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const uploadedUrl = await uploadImage(newImage, 'vehicles');
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
          }
        }
      }
      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from('vehicle_modifications')
        .insert({
          vehicle_id: vehicleId,
          user_id: user?.id,
          category: newCategory.toLowerCase() || null,
          part_name: newPartName,
          brand: newBrand || null,
          price_paid: newCost ? parseFloat(newCost) : null,
          notes: newNotes || null,
          after_photo_url: imageUrl,
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add modification');
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

  const totalInvested = modifications.reduce((sum, mod) => sum + (mod.price_paid || 0), 0);
  const modCount = modifications.length;

  const renderModRow = (mod: Modification) => (
    <div
      key={mod.id}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        {mod.after_photo_url && (
          <img
            src={mod.after_photo_url}
            alt={mod.part_name}
            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#eef4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{mod.part_name}</span>
            {mod.brand && (
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5a6e7e', letterSpacing: '0.12em', textTransform: 'uppercase' as const, flexShrink: 0 }}>{mod.brand}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            {mod.category && (
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5a6e7e', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>{CATEGORY_LABELS[mod.category] || mod.category}</span>
            )}
            {mod.price_paid !== null && (
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#4ade80', fontWeight: 600 }}>
                ${mod.price_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
          {mod.notes && (
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{mod.notes}</div>
          )}
        </div>
      </div>
      <button
        onClick={() => handleDeleteModification(mod.id)}
        onMouseEnter={() => setHoveredDelete(mod.id)}
        onMouseLeave={() => setHoveredDelete(null)}
        style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: hoveredDelete === mod.id ? '#ef4444' : '#5a6e7e', transition: 'color 0.15s', flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  );

  if (loading) {
    return (
      <Layout currentPage="profile" onNavigate={onNavigate}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e' }}>Loading build sheet...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 90 }}>

        {/* Sticky header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'linear-gradient(to bottom, #060910 60%, transparent)', paddingTop: 16, paddingBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onBack}
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <ArrowLeft size={16} color="#eef4f8" />
            </button>
            <div>
              <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', margin: 0, lineHeight: 1.1 }}>Build Sheet</h2>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5a6e7e', letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>Track every modification</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div style={{ ...fieldContainerStyle, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <DollarSign size={14} color="#4ade80" />
              <span style={{ ...sectionHeaderStyle, color: '#4ade80' }}>Total Invested</span>
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8' }}>
              ${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ ...fieldContainerStyle, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Package size={14} color="#F97316" />
              <span style={{ ...sectionHeaderStyle, color: '#F97316' }}>Mod Count</span>
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8' }}>
              {modCount}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#ef4444' }}>{error}</span>
          </div>
        )}

        {/* Add Modification form / button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{ ...primaryBtnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}
          >
            <Plus size={14} />
            Add Modification
          </button>
        )}

        {showAddForm && (
          <form onSubmit={handleAddModification} style={{ marginBottom: 20 }}>
            <div style={{ ...sectionHeaderStyle, marginBottom: 10 }}>New Modification</div>
            <div style={fieldContainerStyle}>
              {/* Category + Brand row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ ...inputRowStyle, borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                  <label htmlFor="category" style={labelStyle}>Category</label>
                  <select
                    id="category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none' as const }}
                  >
                    <option value="">Select</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>
                </div>
                <div style={inputRowStyle}>
                  <label htmlFor="brand" style={labelStyle}>Brand</label>
                  <input
                    type="text"
                    id="brand"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g., Garrett, KW"
                  />
                </div>
              </div>

              {/* Part name */}
              <div style={inputRowStyle}>
                <label htmlFor="partName" style={labelStyle}>Part / Modification *</label>
                <input
                  type="text"
                  id="partName"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g., GTX3076R Turbo Kit"
                  required
                />
              </div>

              {/* Cost */}
              <div style={inputRowStyle}>
                <label htmlFor="cost" style={labelStyle}>Cost (USD)</label>
                <input
                  type="number"
                  id="cost"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  step="0.01"
                  min="0"
                  style={inputStyle}
                  placeholder="0.00"
                />
              </div>

              {/* Notes */}
              <div style={inputRowStyle}>
                <label htmlFor="notes" style={labelStyle}>Notes</label>
                <textarea
                  id="notes"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' as const }}
                  placeholder="Installation notes, performance gains, etc."
                />
              </div>

              {/* Photo */}
              <div style={{ ...inputRowStyle, borderBottom: 'none' }}>
                <label style={labelStyle}>Photo (Optional)</label>
                {!newImage ? (
                  <label style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', width: '100%', height: 80, border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 8, cursor: 'pointer' }}>
                    <Upload size={18} color="#5a6e7e" />
                    <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', marginTop: 4 }}>Click to upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img src={newImage} alt="Modification preview" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }} />
                    <button
                      type="button"
                      onClick={() => setNewImage(null)}
                      style={{ position: 'absolute', top: 8, right: 8, padding: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={14} color="#eef4f8" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Form buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
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
                style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: '#7a8e9e', cursor: 'pointer' }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ ...primaryBtnStyle, flex: 1, width: 'auto', opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                disabled={submitting}
              >
                {submitting ? 'Adding...' : 'Add Mod'}
              </button>
            </div>
          </form>
        )}

        {/* Modifications list */}
        <div>
          <div style={{ ...sectionHeaderStyle, marginBottom: 12 }}>Modifications</div>

          {modifications.length === 0 ? (
            <div style={{ ...fieldContainerStyle, padding: '40px 14px', textAlign: 'center' as const }}>
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e' }}>No modifications added yet</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              {CATEGORIES.map((category) => {
                const categoryMods = modifications.filter((m) => m.category === category);
                if (categoryMods.length === 0) return null;

                const categoryTotal = categoryMods.reduce((sum, mod) => sum + (mod.price_paid || 0), 0);

                return (
                  <div key={category}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ ...sectionHeaderStyle, color: '#F97316' }}>{CATEGORY_LABELS[category]}</span>
                      {categoryTotal > 0 && (
                        <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e', fontWeight: 600 }}>
                          ${categoryTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <div style={fieldContainerStyle}>
                      {categoryMods.map(renderModRow)}
                    </div>
                  </div>
                );
              })}

              {modifications.filter((m) => !m.category).length > 0 && (
                <div>
                  <div style={{ ...sectionHeaderStyle, marginBottom: 8 }}>Uncategorized</div>
                  <div style={fieldContainerStyle}>
                    {modifications.filter((m) => !m.category).map(renderModRow)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Fixed bottom save — shows as "Add Modification" when list is empty and form is closed */}
    </Layout>
  );
}
