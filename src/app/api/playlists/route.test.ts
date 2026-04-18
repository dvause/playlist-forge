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
    getSpotifyPlaylists: vi.fn(),
    refreshSpotifyToken: vi.fn(),
    SpotifyApiError: MockSpotifyApiError,
  };
});

const youtubeMocks = vi.hoisted(() => ({
  getYouTubePlaylists: vi.fn(),
  refreshYouTubeToken: vi.fn(),
}));

vi.mock('@/lib/auth', () => authMocks);
vi.mock('@/lib/spotify', () => spotifyMocks);
vi.mock('@/lib/youtube', () => youtubeMocks);

import { GET } from '@/app/api/playlists/route';

describe('GET /api/playlists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth tokens are present', async () => {
    authMocks.getAuthTokens.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Not authenticated' });
  });

  it('refreshes expired Spotify tokens and returns playlists', async () => {
    const expiredTokens = {
      accessToken: 'expired',
      refreshToken: 'refresh-token',
      expiresAt: 1000,
      service: 'spotify' as const,
    };
    const refreshedTokens = {
      accessToken: 'fresh',
      refreshToken: 'refresh-token',
      expiresAt: 2000,
      service: 'spotify' as const,
    };
    const playlists = [{ id: 'pl_1', name: 'Mix', trackCount: 4, service: 'spotify' as const }];

    authMocks.getAuthTokens.mockResolvedValue(expiredTokens);
    authMocks.isTokenExpired.mockReturnValue(true);
    spotifyMocks.refreshSpotifyToken.mockResolvedValue(refreshedTokens);
    spotifyMocks.getSpotifyPlaylists.mockResolvedValue(playlists);

    const response = await GET();

    expect(spotifyMocks.refreshSpotifyToken).toHaveBeenCalledWith('refresh-token');
    expect(authMocks.setAuthTokens).toHaveBeenCalledWith(refreshedTokens);
    expect(spotifyMocks.getSpotifyPlaylists).toHaveBeenCalledWith('fresh');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ playlists, service: 'spotify' });
  });

  it('propagates Spotify API status codes from downstream failures', async () => {
    authMocks.getAuthTokens.mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: 2000,
      service: 'spotify',
    });
    authMocks.isTokenExpired.mockReturnValue(false);
    spotifyMocks.getSpotifyPlaylists.mockRejectedValue(
      new spotifyMocks.SpotifyApiError('rate limited', 429)
    );

    const response = await GET();

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to fetch playlists' });
  });
});
