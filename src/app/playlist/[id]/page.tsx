'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Track, SortOption, ServiceType } from '@/types';
import { smartShuffle } from '@/lib/shuffle';
import { sortTracks } from '@/lib/sort';

export default function PlaylistPage() {
  const router = useRouter();
  const params = useParams();
  const playlistId = params.id as string;

  const [originalTracks, setOriginalTracks] = useState<Track[]>([]);
  const [currentTracks, setCurrentTracks] = useState<Track[]>([]);
  const [service, setService] = useState<ServiceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentSort, setCurrentSort] = useState<SortOption | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const tracksPerPage = 50;

  const fetchAllTracks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/playlist/${playlistId}?all=true`);
      if (response.status === 401) {
        router.push('/');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch tracks');
      }
      const data = await response.json();
      setOriginalTracks(data.tracks);
      setCurrentTracks(data.tracks);
      setService(data.service);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [playlistId, router]);

  useEffect(() => {
    fetchAllTracks();
  }, [fetchAllTracks]);

  const handleShuffle = () => {
    const shuffled = smartShuffle(currentTracks);
    setCurrentTracks(shuffled);
    setHasChanges(true);
    setIsShuffled(true);
    setCurrentSort(null);
    setCurrentPage(1);
  };

  const handleSort = (field: SortOption['field'], direction: SortOption['direction']) => {
    const option: SortOption = { field, direction };
    const sorted = sortTracks(currentTracks, option);
    setCurrentTracks(sorted);
    setHasChanges(true);
    setCurrentSort(option);
    setIsShuffled(false);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setCurrentTracks([...originalTracks]);
    setHasChanges(false);
    setCurrentSort(null);
    setIsShuffled(false);
    setCurrentPage(1);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/playlist/${playlistId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: currentTracks }),
      });
      if (!response.ok) {
        throw new Error('Failed to save playlist');
      }
      setOriginalTracks([...currentTracks]);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (!ms) return '--:--';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Pagination
  const totalPages = Math.ceil(currentTracks.length / tracksPerPage);
  const startIndex = (currentPage - 1) * tracksPerPage;
  const endIndex = startIndex + tracksPerPage;
  const displayedTracks = currentTracks.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-gray-600 border-t-white rounded-full animate-spin" />
          <p className="text-gray-400">Loading tracks...</p>
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
            onClick={() => router.push('/dashboard')}
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
      {/* Header */}
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-white">Edit Playlist</h1>
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
            <div className="flex items-center gap-2">
              {hasChanges && (
                <>
                  <button
                    onClick={handleReset}
                    disabled={saving}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleShuffle}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                isShuffled
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Shuffle
            </button>

            <div className="h-6 w-px bg-gray-700 mx-2" />

            <span className="text-sm text-gray-500">Sort by:</span>

            {/* Title Sort */}
            <div className="flex">
              <button
                onClick={() => handleSort('title', 'asc')}
                className={`px-3 py-2 text-sm rounded-l-lg transition-colors ${
                  currentSort?.field === 'title' && currentSort.direction === 'asc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Title A-Z
              </button>
              <button
                onClick={() => handleSort('title', 'desc')}
                className={`px-3 py-2 text-sm rounded-r-lg transition-colors border-l border-gray-700 ${
                  currentSort?.field === 'title' && currentSort.direction === 'desc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Z-A
              </button>
            </div>

            {/* Artist Sort */}
            <div className="flex">
              <button
                onClick={() => handleSort('artist', 'asc')}
                className={`px-3 py-2 text-sm rounded-l-lg transition-colors ${
                  currentSort?.field === 'artist' && currentSort.direction === 'asc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Artist A-Z
              </button>
              <button
                onClick={() => handleSort('artist', 'desc')}
                className={`px-3 py-2 text-sm rounded-r-lg transition-colors border-l border-gray-700 ${
                  currentSort?.field === 'artist' && currentSort.direction === 'desc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Z-A
              </button>
            </div>

            {/* Release Date Sort */}
            <div className="flex">
              <button
                onClick={() => handleSort('releaseDate', 'asc')}
                className={`px-3 py-2 text-sm rounded-l-lg transition-colors ${
                  currentSort?.field === 'releaseDate' && currentSort.direction === 'asc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Oldest
              </button>
              <button
                onClick={() => handleSort('releaseDate', 'desc')}
                className={`px-3 py-2 text-sm rounded-r-lg transition-colors border-l border-gray-700 ${
                  currentSort?.field === 'releaseDate' && currentSort.direction === 'desc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Newest
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Track List */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {hasChanges && (
          <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-200 text-sm">
            You have unsaved changes. Click &quot;Save Changes&quot; to update the playlist on {service === 'spotify' ? 'Spotify' : 'YouTube'}.
          </div>
        )}

        <div className="mb-4 text-sm text-gray-400">
          {currentTracks.length} tracks total
          {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
        </div>

        <div className="bg-gray-800/30 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_1fr_80px] md:grid-cols-[40px_1fr_1fr_1fr_80px] gap-4 px-4 py-3 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700/50">
            <span>#</span>
            <span>Title</span>
            <span>Artist</span>
            <span className="hidden md:block">Album</span>
            <span className="text-right">Duration</span>
          </div>

          {/* Track Rows */}
          <div className="divide-y divide-gray-800/50">
            {displayedTracks.map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                className="grid grid-cols-[40px_1fr_1fr_80px] md:grid-cols-[40px_1fr_1fr_1fr_80px] gap-4 px-4 py-3 hover:bg-gray-800/30 transition-colors items-center"
              >
                <span className="text-gray-500 text-sm">{startIndex + index + 1}</span>
                <div className="flex items-center gap-3 min-w-0">
                  {track.albumImageUrl && (
                    <img
                      src={track.albumImageUrl}
                      alt=""
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <span className="text-white truncate">{track.title}</span>
                </div>
                <span className="text-gray-400 truncate">{track.artist}</span>
                <span className="text-gray-500 truncate hidden md:block">{track.album || '-'}</span>
                <span className="text-gray-500 text-sm text-right">{formatDuration(track.duration)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 text-sm rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
