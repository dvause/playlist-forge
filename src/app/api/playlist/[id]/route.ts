import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokens, isTokenExpired, setAuthTokens } from '@/lib/auth';
import { getSpotifyPlaylistTracks, getAllSpotifyPlaylistTracks, refreshSpotifyToken, SpotifyApiError } from '@/lib/spotify';
import { getYouTubePlaylistTracks, getAllYouTubePlaylistTracks, refreshYouTubeToken } from '@/lib/youtube';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playlistId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const all = searchParams.get('all') === 'true';

  let tokens = await getAuthTokens();

  if (!tokens) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Refresh token if expired
  if (isTokenExpired(tokens)) {
    try {
      if (tokens.service === 'spotify' && tokens.refreshToken) {
        tokens = await refreshSpotifyToken(tokens.refreshToken);
        await setAuthTokens(tokens);
      } else if (tokens.service === 'youtube' && tokens.refreshToken) {
        tokens = await refreshYouTubeToken(tokens.refreshToken);
        await setAuthTokens(tokens);
      } else {
        return NextResponse.json({ error: 'Token expired and cannot refresh' }, { status: 401 });
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
    }
  }

  try {
    if (all) {
      // Fetch all tracks for sorting/shuffling
      let tracks;
      if (tokens.service === 'spotify') {
        tracks = await getAllSpotifyPlaylistTracks(tokens.accessToken, playlistId);
      } else {
        tracks = await getAllYouTubePlaylistTracks(tokens.accessToken, playlistId);
      }
      return NextResponse.json({ tracks, service: tokens.service });
    } else {
      // Paginated fetch
      let result;
      if (tokens.service === 'spotify') {
        result = await getSpotifyPlaylistTracks(tokens.accessToken, playlistId, offset, limit);
      } else {
        result = await getYouTubePlaylistTracks(tokens.accessToken, playlistId, offset, limit);
      }
      return NextResponse.json({ ...result, service: tokens.service });
    }
  } catch (err) {
    console.error('Failed to fetch playlist tracks:', err);
    const status = err instanceof SpotifyApiError ? err.status : 500;
    return NextResponse.json({ error: 'Failed to fetch playlist tracks' }, { status });
  }
}
