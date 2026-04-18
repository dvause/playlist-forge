'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Playlist, ServiceType } from '@/types';

export default function Dashboard() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [service, setService] = useState<ServiceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        const response = await fetch('/api/playlists');
        if (response.status === 401) {
          router.push('/');
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to fetch playlists');
        }
        const data = await response.json();
        setPlaylists(data.playlists);
        setService(data.service);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylists();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-gray-600 border-t-white rounded-full animate-spin" />
          <p className="text-gray-400">Loading playlists...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">Playlist Shuffler</h1>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                service === 'spotify'
                  ? 'bg-[#1DB954]/20 text-[#1DB954]'
                  : 'bg-[#FF0000]/20 text-[#FF0000]'
              }`}
            >
              {service === 'spotify' ? 'Spotify' : 'YouTube'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-white mb-6">Your Playlists</h2>

        {playlists.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No playlists found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => router.push(`/playlist/${playlist.id}`)}
                className="group bg-gray-800/50 hover:bg-gray-800 rounded-xl p-4 text-left transition-colors"
              >
                <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-700">
                  {playlist.imageUrl ? (
                    <Image
                      src={playlist.imageUrl}
                      alt={playlist.name}
                      width={320}
                      height={320}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <svg
                        className="w-12 h-12"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-white truncate">{playlist.name}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
