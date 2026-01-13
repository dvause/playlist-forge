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

  const result: Track[] = [];
  const artistQueues = new Map<string, Track[]>();

  for (const [artist, artistTracks] of tracksByArtist) {
    artistQueues.set(artist, [...artistTracks]);
  }

  let lastArtist: string | null = null;

  while (result.length < tracks.length) {
    // Get artists with remaining tracks
    const availableArtists = Array.from(artistQueues.entries())
      .filter(([, queue]) => queue.length > 0)
      .map(([artist]) => artist);

    if (availableArtists.length === 0) break;

    // Prefer artists different from the last one
    const differentArtists = availableArtists.filter(a => a !== lastArtist);
    const candidateArtists = differentArtists.length > 0 ? differentArtists : availableArtists;

    // Randomly select from candidates
    const selectedArtist = candidateArtists[Math.floor(Math.random() * candidateArtists.length)];
    const selectedTrack = artistQueues.get(selectedArtist)!.shift()!;

    result.push(selectedTrack);
    lastArtist = selectedArtist;
  }

  return result;
}

/**
 * Simple shuffle without smart distribution
 */
export function simpleShuffle(tracks: Track[]): Track[] {
  return fisherYatesShuffle(tracks);
}
