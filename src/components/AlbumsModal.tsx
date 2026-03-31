import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { uploadImage } from '../lib/storage';

interface Album {
  id: string;
  title: string;
  cover_image_url: string | null;
  is_public: boolean;
  photo_count: number;
}

interface AlbumsModalProps {
  onClose: () => void;
  vehicleId?: string;
}

export function AlbumsModal({ onClose, vehicleId }: AlbumsModalProps) {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadAlbums = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const withCounts = await Promise.all(
        data.map(async (a) => {
          const { count } = await supabase
            .from('album_photos')
            .select('*', { count: 'exact', head: true })
            .eq('album_id', a.id);
          return { ...a, photo_count: count || 0 };
        })
      );
      setAlbums(withCounts);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAlbums(); }, [loadAlbums]);

  const loadAlbumPhotos = async (albumId: string) => {
    const { data } = await supabase
      .from('album_photos')
      .select('image_url')
      .eq('album_id', albumId)
      .order('created_at', { ascending: false });
    setAlbumPhotos((data || []).map(p => p.image_url));
    setSelectedAlbum(albumId);
  };

  const createAlbum = async () => {
    if (!user || !newTitle.trim()) return;
    setCreating(true);
    await supabase.from('albums').insert({
      user_id: user.id,
      title: newTitle.trim(),
      vehicle_id: vehicleId || null,
      is_public: true,
    });
    setNewTitle('');
    setCreating(false);
    loadAlbums();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAlbum || !user) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'albums');
      await supabase.from('album_photos').insert({
        album_id: selectedAlbum,
        image_url: url,
        user_id: user.id,
      });
      // Update cover if first photo
      const album = albums.find(a => a.id === selectedAlbum);
      if (album && !album.cover_image_url) {
        await supabase.from('albums').update({ cover_image_url: url }).eq('id', selectedAlbum);
      }
      loadAlbumPhotos(selectedAlbum);
      loadAlbums();
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  };

  const deleteAlbum = async (albumId: string) => {
    await supabase.from('album_photos').delete().eq('album_id', albumId);
    await supabase.from('albums').delete().eq('id', albumId);
    setSelectedAlbum(null);
    setAlbumPhotos([]);
    loadAlbums();
  };

  // Album detail view
  if (selectedAlbum) {
    const album = albums.find(a => a.id === selectedAlbum);
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(3,5,8,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '85vh', background: '#0a0d14', borderRadius: '16px 16px 0 0', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', display: 'flex', flexDirection: 'column' as const }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => { setSelectedAlbum(null); setAlbumPhotos([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a8e9e', padding: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8' }}>{album?.title || 'Album'}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>{albumPhotos.length} photos</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.25)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}>
                {uploading ? 'Uploading...' : '+ Photo'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={uploading} />
              </label>
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7a8e9e" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          {/* Photo grid */}
          <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'none' as const, padding: 14 }}>
            {albumPhotos.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' as const }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#3a4e60', marginBottom: 8 }}>No Photos Yet</div>
                <label style={{ padding: '8px 16px', borderRadius: 6, background: '#F97316', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer' }}>
                  Add First Photo
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={uploading} />
                </label>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
                {albumPhotos.map((url, i) => (
                  <div key={i} style={{ aspectRatio: '1', borderRadius: 6, overflow: 'hidden', background: '#111720' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
            {/* Delete */}
            <button onClick={() => deleteAlbum(selectedAlbum)} style={{ marginTop: 16, padding: '8px 0', width: '100%', background: 'none', border: '1px solid rgba(232,58,74,0.20)', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#e83a4a', cursor: 'pointer' }}>
              Delete Album
            </button>
            <div style={{ height: 32 }} />
          </div>
        </div>
      </div>
    );
  }

  // Albums list view
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(3,5,8,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '75vh', background: '#0a0d14', borderRadius: '16px 16px 0 0', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', display: 'flex', flexDirection: 'column' as const }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8' }}>Albums</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7a8e9e" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Create new */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 8 }}>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createAlbum()}
            placeholder="New album name..."
            style={{ flex: 1, background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '8px 12px', fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#eef4f8', outline: 'none' }}
          />
          <button onClick={createAlbum} disabled={!newTitle.trim() || creating} style={{ padding: '8px 14px', background: '#F97316', border: 'none', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer', opacity: !newTitle.trim() || creating ? 0.5 : 1 }}>
            Create
          </button>
        </div>

        {/* Album list */}
        <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'none' as const }}>
          {loading ? (
            <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.2)', borderTopColor: '#F97316', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : albums.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' as const }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#3a4e60' }}>
                No Albums Yet
              </div>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', marginTop: 4 }}>
                Create one above to organize your photos
              </div>
            </div>
          ) : (
            albums.map(album => (
              <div
                key={album.id}
                onClick={() => loadAlbumPhotos(album.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: '#111720', flexShrink: 0 }}>
                  {album.cover_image_url ? (
                    <img src={album.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>{album.title}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e', marginTop: 2 }}>
                    {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
                    {!album.is_public && ' · Private'}
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            ))
          )}
          <div style={{ height: 32 }} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
