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
    reorderSpotifyPlaylist: vi.fn(),
    refreshSpotifyToken: vi.fn(),
    SpotifyApiError: MockSpotifyApiError,
  };
});

const youtubeMocks = vi.hoisted(() => ({
  reorderYouTubePlaylist: vi.fn(),
  refreshYouTubeToken: vi.fn(),
}));

vi.mock('@/lib/auth', () => authMocks);
vi.mock('@/lib/spotify', () => spotifyMocks);
vi.mock('@/lib/youtube', () => youtubeMocks);

import { POST } from '@/app/api/playlist/[id]/save/route';

describe('POST /api/playlist/[id]/save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid request bodies', async () => {
    const request = new Request('http://localhost/api/playlist/abc/save', {
      method: 'POST',
      body: JSON.stringify({ tracks: 'not-an-array' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as never, { params: Promise.resolve({ id: 'abc' }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid tracks data' });
  });

  it('maps Spotify tracks to uris before saving', async () => {
    const tracks = [
      { id: '1', title: 'One', artist: 'A', duration: 1, uri: 'spotify:track:1', position: 0 },
      { id: '2', title: 'Two', artist: 'B', duration: 1, uri: 'spotify:track:2', position: 1 },
    ];
    authMocks.getAuthTokens.mockResolvedValue({
      accessToken: 'sp-token',
      refreshToken: 'refresh',
      expiresAt: 2000,
      service: 'spotify',
    });
    authMocks.isTokenExpired.mockReturnValue(false);

    const request = new Request('http://localhost/api/playlist/abc/save', {
      method: 'POST',
      body: JSON.stringify({ tracks }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as never, { params: Promise.resolve({ id: 'abc' }) });

    expect(spotifyMocks.reorderSpotifyPlaylist).toHaveBeenCalledWith('sp-token', 'abc', [
      'spotify:track:1',
      'spotify:track:2',
    ]);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it('refreshes expired YouTube tokens before saving', async () => {
    const expiredTokens = {
      accessToken: 'old-token',
      refreshToken: 'refresh-token',
      expiresAt: 1000,
      service: 'youtube' as const,
    };
    const refreshedTokens = {
      accessToken: 'new-token',
      refreshToken: 'refresh-token',
      expiresAt: 2000,
      service: 'youtube' as const,
    };
    const tracks = [{ id: '1', title: 'One', artist: 'A', duration: 0, uri: 'vid1', position: 0 }];

    authMocks.getAuthTokens.mockResolvedValue(expiredTokens);
    authMocks.isTokenExpired.mockReturnValue(true);
    youtubeMocks.refreshYouTubeToken.mockResolvedValue(refreshedTokens);

    const request = new Request('http://localhost/api/playlist/abc/save', {
      method: 'POST',
      body: JSON.stringify({ tracks }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as never, { params: Promise.resolve({ id: 'abc' }) });

    expect(youtubeMocks.refreshYouTubeToken).toHaveBeenCalledWith('refresh-token');
    expect(authMocks.setAuthTokens).toHaveBeenCalledWith(refreshedTokens);
    expect(youtubeMocks.reorderYouTubePlaylist).toHaveBeenCalledWith('new-token', 'abc', tracks);
    expect(response.status).toBe(200);
  });
});
