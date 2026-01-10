import { NextResponse } from 'next/server';
import { getAuthTokens, isTokenExpired, setAuthTokens } from '@/lib/auth';
import { getSpotifyPlaylists, refreshSpotifyToken } from '@/lib/spotify';
import { getYouTubePlaylists, refreshYouTubeToken } from '@/lib/youtube';

export async function GET() {
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
    let playlists;
    if (tokens.service === 'spotify') {
      playlists = await getSpotifyPlaylists(tokens.accessToken);
    } else {
      playlists = await getYouTubePlaylists(tokens.accessToken);
    }

    return NextResponse.json({ playlists, service: tokens.service });
  } catch (err) {
    console.error('Failed to fetch playlists:', err);
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}
