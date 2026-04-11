import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';
import { Album, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

interface AlbumType {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  photo_count: number;
  vehicle_id: string | null;
  created_at: string;
  vehicle?: {
    make: string;
    model: string;
    year: number;
  };
}

interface AlbumsPageProps {
  onNavigate: OnNavigate;
}

export function AlbumsPage({ onNavigate }: AlbumsPageProps) {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<AlbumType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [newAlbumPublic, setNewAlbumPublic] = useState(true);

  const loadAlbums = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading albums:', error);
    } else if (data) {
      const albumsWithCounts = await Promise.all(
        data.map(async (album) => {
          const { count } = await supabase
            .from('album_photos')
            .select('*', { count: 'exact', head: true })
            .eq('album_id', album.id);

          return { ...album, photo_count: count || 0 };
        })
      );
      setAlbums(albumsWithCounts);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAlbums();
    }
  }, [user, loadAlbums]);

  const createAlbum = async () => {
    if (!user || !newAlbumName.trim()) return;

    const { error } = await supabase.from('albums').insert({
      user_id: user.id,
      title: newAlbumName.trim(),
      description: newAlbumDescription.trim() || null,
      is_public: newAlbumPublic
    });

    if (error) {
      console.error('Error creating album:', error);
      alert('Failed to create album: ' + error.message);
    } else {
      setNewAlbumName('');
      setNewAlbumDescription('');
      setShowCreateModal(false);
      loadAlbums();
    }
  };

  const toggleAlbumVisibility = async (albumId: string, currentVisibility: boolean) => {
    const { error } = await supabase
      .from('albums')
      .update({ is_public: !currentVisibility })
      .eq('id', albumId);

    if (error) {
      console.error('Error updating album:', error);
    } else {
      loadAlbums();
    }
  };

  const deleteAlbum = async (albumId: string) => {
    if (!confirm('Delete this album? Posts won\'t be deleted, just removed from the album.')) {
      return;
    }

    const { error } = await supabase.from('albums').delete().eq('id', albumId);

    if (error) {
      console.error('Error deleting album:', error);
    } else {
      loadAlbums();
    }
  };

  if (loading) {
    return (
      <Layout currentPage="profile" onNavigate={onNavigate}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#F97316', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div style={{ paddingBottom: 40 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 20px' }}>
          <div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 4 }}>Albums</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e' }}>Organize your vehicle photos into collections</div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#F97316', border: 'none', borderRadius: 2, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#030508' }}
          >
            <Plus size={14} /> New Album
          </button>
        </div>

        {/* Empty state */}
        {albums.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
            <Album size={40} style={{ color: '#1e2a38', margin: '0 auto 16px', display: 'block' }} strokeWidth={1.2} />
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', marginBottom: 6 }}>No Albums Yet</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e', marginBottom: 20, lineHeight: 1.5 }}>
              Organize your vehicle photos into collections — shows, meets, modifications.
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{ padding: '10px 24px', background: '#F97316', border: 'none', borderRadius: 2, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#030508' }}
            >
              Create Your First Album
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {albums.map((album) => (
              <div key={album.id} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                {/* Cover image */}
                {album.cover_image_url ? (
                  <div style={{ width: '100%', height: 160, backgroundImage: `url(${album.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                ) : (
                  <div style={{ width: '100%', height: 120, background: '#0a0d14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Album size={32} style={{ color: '#1e2a38' }} strokeWidth={1.2} />
                  </div>
                )}

                {/* Info row */}
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 3 }}>{album.title}</div>
                    {album.description && (
                      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.description}</div>
                    )}
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3a4e60' }}>
                      {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'} · {album.is_public ? 'Public' : 'Private'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    <button
                      onClick={() => toggleAlbumVisibility(album.id, album.is_public)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: album.is_public ? '#F97316' : '#5a6e7e' }}
                    >
                      {album.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => deleteAlbum(album.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#5a6e7e' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create modal */}
        {showCreateModal && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={() => { setShowCreateModal(false); setNewAlbumName(''); setNewAlbumDescription(''); }}
          >
            <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24, maxWidth: 440, width: '100%' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', marginBottom: 20 }}>New Album</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a8e9e', marginBottom: 6 }}>Album Name *</label>
                  <input type="text" value={newAlbumName} onChange={e => setNewAlbumName(e.target.value)} placeholder="e.g. Summer Car Shows 2025" autoFocus style={{ width: '100%', padding: '11px 14px', borderRadius: 8, background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a8e9e', marginBottom: 6 }}>Description</label>
                  <textarea value={newAlbumDescription} onChange={e => setNewAlbumDescription(e.target.value)} rows={3} placeholder="What's this album about?" style={{ width: '100%', padding: '11px 14px', borderRadius: 8, background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#eef4f8', outline: 'none', boxSizing: 'border-box', resize: 'none' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newAlbumPublic} onChange={e => setNewAlbumPublic(e.target.checked)} style={{ width: 16, height: 16 }} />
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e' }}>Make album public</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => { setShowCreateModal(false); setNewAlbumName(''); setNewAlbumDescription(''); }} style={{ flex: 1, padding: '12px 0', borderRadius: 2, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a8e9e' }}>Cancel</button>
                <button onClick={createAlbum} disabled={!newAlbumName.trim()} style={{ flex: 1, padding: '12px 0', borderRadius: 2, background: newAlbumName.trim() ? '#F97316' : 'rgba(249,115,22,0.3)', border: 'none', cursor: newAlbumName.trim() ? 'pointer' : 'not-allowed', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#030508', opacity: newAlbumName.trim() ? 1 : 0.5 }}>Create</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
