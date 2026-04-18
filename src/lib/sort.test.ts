import { describe, expect, it } from 'vitest';
import { sortTracks } from '@/lib/sort';
import type { Track } from '@/types';

const tracks: Track[] = [
  { id: '1', title: 'beta', artist: 'Zulu', duration: 1, uri: '1', position: 0, releaseDate: '2024-05-01' },
  { id: '2', title: 'Alpha', artist: 'alpha', duration: 1, uri: '2', position: 1, releaseDate: '2024-05-01' },
  { id: '3', title: 'gamma', artist: 'Alpha', duration: 1, uri: '3', position: 2, releaseDate: '2023-01-01' },
  { id: '4', title: 'delta', artist: 'bravo', duration: 1, uri: '4', position: 3 },
];

describe('sortTracks', () => {
  it('sorts by title case-insensitively without mutating the input', () => {
    const result = sortTracks(tracks, { field: 'title', direction: 'asc' });

    expect(result.map(track => track.title)).toEqual(['Alpha', 'beta', 'delta', 'gamma']);
    expect(tracks.map(track => track.title)).toEqual(['beta', 'Alpha', 'gamma', 'delta']);
  });

  it('sorts by artist with title as a secondary key', () => {
    const result = sortTracks(tracks, { field: 'artist', direction: 'asc' });

    expect(result.map(track => `${track.artist}:${track.title}`)).toEqual([
      'alpha:Alpha',
      'Alpha:gamma',
      'bravo:delta',
      'Zulu:beta',
    ]);
  });

  it('sorts by release date and uses title as a tie-breaker', () => {
    const result = sortTracks(tracks, { field: 'releaseDate', direction: 'asc' });

    expect(result.map(track => track.id)).toEqual(['4', '3', '2', '1']);
  });
});
