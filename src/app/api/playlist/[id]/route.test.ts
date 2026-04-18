import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getAuthTokens: vi.fn(),
  isTokenExpired: vi.fn(),
  setAuthTokens: vi.fn(),
}));

const spotifyMocks = vi.hoisted(() => {
  class MockSpotifyApiError extends Error {
    constructor(
      message: string,
      public readonly status: number
    ) {
      super(message);
      this.name = 'SpotifyApiError';
    }
  }

  return {
    getSpotifyPlaylistTracks: vi.fn(),
    getAllSpotifyPlaylistTracks: vi.fn(),
    refreshSpotifyToken: vi.fn(),
    SpotifyApiError: MockSpotifyApiError,
  };
});

const youtubeMocks = vi.hoisted(() => ({
  getYouTubePlaylistTracks: vi.fn(),
  getAllYouTubePlaylistTracks: vi.fn(),
  refreshYouTubeToken: vi.fn(),
}));

vi.mock('@/lib/auth', () => authMocks);
vi.mock('@/lib/spotify', () => spotifyMocks);
vi.mock('@/lib/youtube', () => youtubeMocks);

import { GET } from '@/app/api/playlist/[id]/route';

describe('GET /api/playlist/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the full playlist when all=true for YouTube', async () => {
    const tracks = [{ id: '1', title: 'Song', artist: 'Artist', duration: 0, uri: 'vid1', position: 0 }];
    authMocks.getAuthTokens.mockResolvedValue({
      accessToken: 'yt-token',
      refreshToken: 'refresh',
      expiresAt: 2000,
      service: 'youtube',
    });
    authMocks.isTokenExpired.mockReturnValue(false);
    youtubeMocks.getAllYouTubePlaylistTracks.mockResolvedValue(tracks);

    const request = {
      nextUrl: new URL('http://localhost/api/playlist/abc?all=true'),
    } as Request & { nextUrl: URL };

    const response = await GET(request, { params: Promise.resolve({ id: 'abc' }) });

    expect(youtubeMocks.getAllYouTubePlaylistTracks).toHaveBeenCalledWith('yt-token', 'abc');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tracks, service: 'youtube' });
  });

  it('passes pagination params through to Spotify', async () => {
    const result = {
      tracks: [{ id: '1', title: 'Song', artist: 'Artist', duration: 1, uri: 'sp:1', position: 25 }],
      total: 100,
      offset: 25,
      limit: 10,
      hasMore: true,
    };
    authMocks.getAuthTokens.mockResolvedValue({
      accessToken: 'sp-token',
      refreshToken: 'refresh',
      expiresAt: 2000,
      service: 'spotify',
    });
    authMocks.isTokenExpired.mockReturnValue(false);
    spotifyMocks.getSpotifyPlaylistTracks.mockResolvedValue(result);

    const request = {
      nextUrl: new URL('http://localhost/api/playlist/abc?offset=25&limit=10'),
    } as Request & { nextUrl: URL };

    const response = await GET(request, { params: Promise.resolve({ id: 'abc' }) });

    expect(spotifyMocks.getSpotifyPlaylistTracks).toHaveBeenCalledWith('sp-token', 'abc', 25, 10);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ...result, service: 'spotify' });
  });
});
