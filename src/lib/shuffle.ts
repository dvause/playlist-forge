import { Track } from '@/types';

/**
 * Fisher-Yates shuffle algorithm
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Smart shuffle that avoids consecutive tracks by the same artist.
 * If impossible (too many tracks by same artist), spaces them as far apart as possible.
 */
export function smartShuffle(tracks: Track[]): Track[] {
  if (tracks.length <= 1) return [...tracks];

  // Group tracks by artist
  const tracksByArtist = new Map<string, Track[]>();
  for (const track of tracks) {
    const artistKey = track.artist.toLowerCase();
    if (!tracksByArtist.has(artistKey)) {
      tracksByArtist.set(artistKey, []);
    }
    tracksByArtist.get(artistKey)!.push(track);
  }

  // Shuffle tracks within each artist group
  for (const [artist, artistTracks] of tracksByArtist) {
    tracksByArtist.set(artist, fisherYatesShuffle(artistTracks));
  }

  // Create a list of (artist, track) pairs sorted by count descending
  const artistCounts = Array.from(tracksByArtist.entries())
    .map(([artist, artistTracks]) => ({ artist, count: artistTracks.length }))
    .sort((a, b) => b.count - a.count);

  const result: Track[] = [];
  const artistQueues = new Map<string, Track[]>();

  for (const [artist, artistTracks] of tracksByArtist) {
    artistQueues.set(artist, [...artistTracks]);
  }

  let lastArtist: string | null = null;
  let consecutiveAttempts = 0;
  const maxAttempts = tracks.length * 2;

  while (result.length < tracks.length && consecutiveAttempts < maxAttempts) {
    // Find an artist that's not the same as the last one
    let selectedArtist: string | null = null;
    let selectedTrack: Track | null = null;

    // Try to find a different artist with remaining tracks
    for (const { artist } of artistCounts) {
      const queue = artistQueues.get(artist)!;
      if (queue.length > 0 && artist !== lastArtist) {
        selectedArtist = artist;
        selectedTrack = queue.shift()!;
        break;
      }
    }

    // If no different artist available, use the same artist
    if (!selectedTrack) {
      for (const { artist } of artistCounts) {
        const queue = artistQueues.get(artist)!;
        if (queue.length > 0) {
          selectedArtist = artist;
          selectedTrack = queue.shift()!;
          break;
        }
      }
    }

    if (selectedTrack && selectedArtist) {
      result.push(selectedTrack);
      lastArtist = selectedArtist;
      consecutiveAttempts = 0;
    } else {
      consecutiveAttempts++;
    }
  }

  // Update positions
  return result.map((track, index) => ({
    ...track,
    position: index,
  }));
}

/**
 * Simple shuffle without smart distribution
 */
export function simpleShuffle(tracks: Track[]): Track[] {
  const shuffled = fisherYatesShuffle(tracks);
  return shuffled.map((track, index) => ({
    ...track,
    position: index,
  }));
}
