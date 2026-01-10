import { Playlist, Track, PaginatedTracks, AuthTokens } from '@/types';
import { getBaseUrl } from './auth';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com';

const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
].join(' ');

export function getSpotifyAuthUrl(): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = `${getBaseUrl()}/api/auth/spotify/callback`;

  const params = new URLSearchParams({
    client_id: clientId!,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    show_dialog: 'true',
  });

  return `${SPOTIFY_AUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeSpotifyCode(code: string): Promise<AuthTokens> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const redirectUri = `${getBaseUrl()}/api/auth/spotify/callback`;

  const response = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    service: 'spotify',
  };
}

export async function refreshSpotifyToken(refreshToken: string): Promise<AuthTokens> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

  const response = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    service: 'spotify',
  };
}

async function spotifyFetch(endpoint: string, accessToken: string, options?: RequestInit) {
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify API error: ${response.status} - ${error}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getSpotifyPlaylists(accessToken: string): Promise<Playlist[]> {
  const playlists: Playlist[] = [];
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  while (hasMore) {
    const data = await spotifyFetch(`/me/playlists?limit=${limit}&offset=${offset}`, accessToken);

    for (const item of data.items) {
      playlists.push({
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        imageUrl: item.images?.[0]?.url,
        trackCount: item.tracks.total,
        service: 'spotify',
        ownerId: item.owner.id,
        isPublic: item.public,
      });
    }

    offset += limit;
    hasMore = data.next !== null;
  }

  return playlists;
}

export async function getSpotifyPlaylistTracks(
  accessToken: string,
  playlistId: string,
  offset: number = 0,
  limit: number = 50
): Promise<PaginatedTracks> {
  const data = await spotifyFetch(
    `/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}&fields=items(track(id,name,uri,duration_ms,artists,album)),total,offset,limit`,
    accessToken
  );

  const tracks: Track[] = data.items
    .filter((item: { track: unknown }) => item.track !== null)
    .map((item: { track: SpotifyTrack }, index: number) => ({
      id: item.track.id,
      title: item.track.name,
      artist: item.track.artists.map((a: { name: string }) => a.name).join(', '),
      artistId: item.track.artists[0]?.id,
      album: item.track.album.name,
      albumImageUrl: item.track.album.images?.[0]?.url,
      duration: item.track.duration_ms,
      releaseDate: item.track.album.release_date,
      uri: item.track.uri,
      position: offset + index,
    }));

  return {
    tracks,
    total: data.total,
    offset: data.offset,
    limit: data.limit,
    hasMore: offset + tracks.length < data.total,
  };
}

interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: Array<{ id: string; name: string }>;
  album: {
    name: string;
    images?: Array<{ url: string }>;
    release_date?: string;
  };
}

export async function getAllSpotifyPlaylistTracks(
  accessToken: string,
  playlistId: string
): Promise<Track[]> {
  const allTracks: Track[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const result = await getSpotifyPlaylistTracks(accessToken, playlistId, offset, limit);
    allTracks.push(...result.tracks);
    offset += limit;
    hasMore = result.hasMore;
  }

  return allTracks;
}

export async function reorderSpotifyPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  // Spotify allows replacing all tracks in a playlist at once
  // We need to do this in batches of 100
  const batchSize = 100;

  // First, clear the playlist and add the first batch
  await spotifyFetch(`/playlists/${playlistId}/tracks`, accessToken, {
    method: 'PUT',
    body: JSON.stringify({
      uris: trackUris.slice(0, batchSize),
    }),
  });

  // Add remaining tracks in batches
  for (let i = batchSize; i < trackUris.length; i += batchSize) {
    const batch = trackUris.slice(i, i + batchSize);
    await spotifyFetch(`/playlists/${playlistId}/tracks`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        uris: batch,
      }),
    });
  }
}
