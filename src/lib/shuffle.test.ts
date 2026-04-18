import { afterEach, describe, expect, it, vi } from 'vitest';
import { simpleShuffle, smartShuffle } from '@/lib/shuffle';
import type { Track } from '@/types';

const tracks: Track[] = [
  { id: '1', title: 'Alpha', artist: 'Artist A', duration: 1, uri: 'a1', position: 0 },
  { id: '2', title: 'Bravo', artist: 'Artist B', duration: 1, uri: 'b1', position: 1 },
  { id: '3', title: 'Charlie', artist: 'Artist A', duration: 1, uri: 'a2', position: 2 },
  { id: '4', title: 'Delta', artist: 'Artist C', duration: 1, uri: 'c1', position: 3 },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('simpleShuffle', () => {
  it('returns a shuffled copy without mutating the input', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = simpleShuffle(tracks);

    expect(result).toEqual([tracks[1], tracks[2], tracks[3], tracks[0]]);
    expect(result).not.toBe(tracks);
    expect(tracks).toEqual([
      { id: '1', title: 'Alpha', artist: 'Artist A', duration: 1, uri: 'a1', position: 0 },
      { id: '2', title: 'Bravo', artist: 'Artist B', duration: 1, uri: 'b1', position: 1 },
      { id: '3', title: 'Charlie', artist: 'Artist A', duration: 1, uri: 'a2', position: 2 },
      { id: '4', title: 'Delta', artist: 'Artist C', duration: 1, uri: 'c1', position: 3 },
    ]);
  });
});

describe('smartShuffle', () => {
  it('avoids consecutive artists when an alternative artist is available', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = smartShuffle(tracks);

    expect(result).toHaveLength(tracks.length);
    expect(result.map(track => track.id).sort()).toEqual(tracks.map(track => track.id).sort());

    for (let index = 1; index < result.length; index += 1) {
      expect(result[index]?.artist).not.toBe(result[index - 1]?.artist);
    }
  });

  it('returns all tracks even when consecutive artists cannot be fully avoided', () => {
    const crowdedTracks: Track[] = [
      { id: '1', title: 'One', artist: 'Artist A', duration: 1, uri: 'a1', position: 0 },
      { id: '2', title: 'Two', artist: 'Artist A', duration: 1, uri: 'a2', position: 1 },
      { id: '3', title: 'Three', artist: 'Artist A', duration: 1, uri: 'a3', position: 2 },
      { id: '4', title: 'Four', artist: 'Artist B', duration: 1, uri: 'b1', position: 3 },
    ];

    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = smartShuffle(crowdedTracks);

    expect(result).toHaveLength(crowdedTracks.length);
    expect(result.map(track => track.id).sort()).toEqual(crowdedTracks.map(track => track.id).sort());
  });
});
