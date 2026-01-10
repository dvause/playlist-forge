import { NextResponse } from 'next/server';
import { getSpotifyAuthUrl } from '@/lib/spotify';

export async function GET() {
  const authUrl = getSpotifyAuthUrl();
  return NextResponse.redirect(authUrl);
}
