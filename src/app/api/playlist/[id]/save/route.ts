import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokens, isTokenExpired, setAuthTokens } from '@/lib/auth';
import { reorderSpotifyPlaylist, refreshSpotifyToken } from '@/lib/spotify';
import { reorderYouTubePlaylist, refreshYouTubeToken } from '@/lib/youtube';
import { Track } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playlistId } = await params;
  const body = await request.json();
  const tracks: Track[] = body.tracks;

  if (!tracks || !Array.isArray(tracks)) {
    return NextResponse.json({ error: 'Invalid tracks data' }, { status: 400 });
  }

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
    if (tokens.service === 'spotify') {
      const trackUris = tracks.map((t) => t.uri);
      await reorderSpotifyPlaylist(tokens.accessToken, playlistId, trackUris);
    } else {
      await reorderYouTubePlaylist(tokens.accessToken, playlistId, tracks);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to save playlist:', err);
    return NextResponse.json({ error: 'Failed to save playlist' }, { status: 500 });
  }
}
