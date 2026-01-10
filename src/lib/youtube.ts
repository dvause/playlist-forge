import { Playlist, Track, PaginatedTracks, AuthTokens } from '@/types';
import { getBaseUrl } from './auth';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

export function getYouTubeAuthUrl(): string {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const redirectUri = `${getBaseUrl()}/api/auth/youtube/callback`;

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeYouTubeCode(code: string): Promise<AuthTokens> {
  const clientId = process.env.YOUTUBE_CLIENT_ID!;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET!;
  const redirectUri = `${getBaseUrl()}/api/auth/youtube/callback`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
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
    service: 'youtube',
  };
}

export async function refreshYouTubeToken(refreshToken: string): Promise<AuthTokens> {
  const clientId = process.env.YOUTUBE_CLIENT_ID!;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET!;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: refreshToken, // Google doesn't return a new refresh token
    expiresAt: Date.now() + data.expires_in * 1000,
    service: 'youtube',
  };
}

async function youtubeFetch(endpoint: string, accessToken: string, options?: RequestInit) {
  const url = endpoint.startsWith('http') ? endpoint : `${YOUTUBE_API_BASE}${endpoint}`;
  const separator = url.includes('?') ? '&' : '?';
  const urlWithKey = url;

  const response = await fetch(urlWithKey, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`YouTube API error: ${response.status} - ${error}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getYouTubePlaylists(accessToken: string): Promise<Playlist[]> {
  const playlists: Playlist[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      mine: 'true',
      maxResults: '50',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const data = await youtubeFetch(`/playlists?${params.toString()}`, accessToken);

    for (const item of data.items) {
      playlists.push({
        id: item.id,
        name: item.snippet.title,
        description: item.snippet.description || undefined,
        imageUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        trackCount: item.contentDetails.itemCount,
        service: 'youtube',
        ownerId: item.snippet.channelId,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return playlists;
}

interface YouTubePlaylistItem {
  id: string;
  snippet: {
    title: string;
    description?: string;
    thumbnails?: {
      medium?: { url: string };
      default?: { url: string };
    };
    videoOwnerChannelTitle?: string;
    resourceId: {
      videoId: string;
    };
    position: number;
  };
  contentDetails: {
    videoId: string;
    videoPublishedAt?: string;
  };
}

export async function getYouTubePlaylistTracks(
  accessToken: string,
  playlistId: string,
  offset: number = 0,
  limit: number = 50
): Promise<PaginatedTracks> {
  // YouTube uses page tokens, not offsets, so we need to paginate to the right page
  let pageToken: string | undefined;
  let currentOffset = 0;
  const tracks: Track[] = [];

  // First, we need to skip pages until we reach the offset
  while (currentOffset < offset) {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: '50',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const data = await youtubeFetch(`/playlistItems?${params.toString()}`, accessToken);
    pageToken = data.nextPageToken;
    currentOffset += data.items.length;

    if (!pageToken) break;
  }

  // Now fetch the actual page we need
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    playlistId,
    maxResults: String(limit),
  });
  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const data = await youtubeFetch(`/playlistItems?${params.toString()}`, accessToken);

  for (const item of data.items as YouTubePlaylistItem[]) {
    tracks.push({
      id: item.id,
      title: item.snippet.title,
      artist: item.snippet.videoOwnerChannelTitle || 'Unknown',
      album: undefined,
      albumImageUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      duration: 0, // YouTube playlist items don't include duration
      releaseDate: item.contentDetails.videoPublishedAt,
      uri: item.contentDetails.videoId,
      position: item.snippet.position,
    });
  }

  return {
    tracks,
    total: data.pageInfo.totalResults,
    offset,
    limit,
    hasMore: !!data.nextPageToken,
  };
}

export async function getAllYouTubePlaylistTracks(
  accessToken: string,
  playlistId: string
): Promise<Track[]> {
  const allTracks: Track[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: '50',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const data = await youtubeFetch(`/playlistItems?${params.toString()}`, accessToken);

    for (const item of data.items as YouTubePlaylistItem[]) {
      allTracks.push({
        id: item.id,
        title: item.snippet.title,
        artist: item.snippet.videoOwnerChannelTitle || 'Unknown',
        album: undefined,
        albumImageUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        duration: 0,
        releaseDate: item.contentDetails.videoPublishedAt,
        uri: item.contentDetails.videoId,
        position: allTracks.length,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return allTracks;
}

interface PlaylistItemResource {
  id: string;
  snippet: {
    playlistId: string;
    resourceId: {
      kind: string;
      videoId: string;
    };
    position: number;
  };
}

export async function reorderYouTubePlaylist(
  accessToken: string,
  playlistId: string,
  tracks: Track[]
): Promise<void> {
  // YouTube requires moving items one at a time
  // Strategy: Delete all items and re-add them in the new order
  // This is more reliable than trying to calculate minimal moves

  // First, get all current playlist items with their IDs
  const currentItems: PlaylistItemResource[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: 'id,snippet',
      playlistId,
      maxResults: '50',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const data = await youtubeFetch(`/playlistItems?${params.toString()}`, accessToken);
    currentItems.push(...data.items);
    pageToken = data.nextPageToken;
  } while (pageToken);

  // Delete all items
  for (const item of currentItems) {
    await youtubeFetch(`/playlistItems?id=${item.id}`, accessToken, {
      method: 'DELETE',
    });
  }

  // Re-add items in the new order
  for (const track of tracks) {
    await youtubeFetch('/playlistItems?part=snippet', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId: track.uri,
          },
        },
      }),
    });
  }
}
