import { NextResponse } from 'next/server';
import { getYouTubeAuthUrl } from '@/lib/youtube';

export async function GET() {
  const authUrl = getYouTubeAuthUrl();
  return NextResponse.redirect(authUrl);
}
