import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';
import { Album, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

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
        <LoadingSpinner size="lg" label="Loading albums..." />
      </Layout>
    );
  }

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">My Albums</h2>
            <p className="text-secondary">Organize your car photos into collections</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-3 bg-accent-primary hover:bg-accent-hover rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Album
          </button>
        </div>

        {albums.length === 0 ? (
          <div className="bg-surface border border-surfacehighlight rounded-xl">
            <EmptyState
              icon={Album}
              title="No Albums Yet"
              description="Organize your car photos into albums. Create collections for shows, meets, modifications, and more."
              actionLabel="Create Your First Album"
              onAction={() => setShowCreateModal(true)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {albums.map((album) => (
              <div
                key={album.id}
                className="bg-surface border border-surfacehighlight rounded-xl overflow-hidden hover:border-accent-primary transition-all"
              >
                {album.cover_image_url ? (
                  <div
                    className="w-full h-48 bg-surfacehighlight bg-cover bg-center"
                    style={{ backgroundImage: `url(${album.cover_image_url})` }}
                  />
                ) : (
                  <div className="w-full h-48 bg-surfacehighlight flex items-center justify-center">
                    <Album className="w-12 h-12 text-secondary" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold">{album.title}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAlbumVisibility(album.id, album.is_public)}
                        className="p-1 hover:bg-surfacehighlight rounded transition"
                      >
                        {album.is_public ? (
                          <Eye className="w-4 h-4 text-accent-primary" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-secondary" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteAlbum(album.id)}
                        className="p-1 hover:bg-surfacehighlight rounded transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {album.description && (
                    <p className="text-sm text-secondary mb-3">{album.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-secondary mb-3">
                    <span>{album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}</span>
                    <span>{album.is_public ? 'Public' : 'Private'}</span>
                  </div>

                  <button
                    onClick={() => onNavigate('create-post')}
                    className="w-full py-2 bg-accent-primary hover:bg-accent-hover rounded-lg font-bold text-sm uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Photo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-surfacehighlight rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Create New Album</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
                    Album Name *
                  </label>
                  <input
                    type="text"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    className="w-full bg-surfacehighlight border border-surfacehighlight rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    placeholder="e.g., Summer Car Shows 2024"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
                    Description
                  </label>
                  <textarea
                    value={newAlbumDescription}
                    onChange={(e) => setNewAlbumDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-surfacehighlight border border-surfacehighlight rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                    placeholder="What's this album about?"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAlbumPublic}
                      onChange={(e) => setNewAlbumPublic(e.target.checked)}
                      className="w-5 h-5 rounded border-surfacehighlight"
                    />
                    <span className="text-sm font-bold uppercase tracking-wider text-secondary">
                      Make album public
                    </span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewAlbumName('');
                      setNewAlbumDescription('');
                    }}
                    className="flex-1 px-4 py-3 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createAlbum}
                    disabled={!newAlbumName.trim()}
                    className="flex-1 px-4 py-3 bg-accent-primary hover:bg-accent-hover rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
