import { NextRequest, NextResponse } from 'next/server';
import { exchangeSpotifyCode } from '@/lib/spotify';
import { setAuthTokens, getBaseUrl } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${getBaseUrl()}/?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${getBaseUrl()}/?error=no_code`);
  }

  try {
    const tokens = await exchangeSpotifyCode(code);
    await setAuthTokens(tokens);
    return NextResponse.redirect(`${getBaseUrl()}/dashboard`);
  } catch (err) {
    console.error('Spotify auth error:', err);
    return NextResponse.redirect(`${getBaseUrl()}/?error=auth_failed`);
  }
}
