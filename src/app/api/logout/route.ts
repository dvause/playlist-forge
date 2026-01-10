import { NextResponse } from 'next/server';
import { clearAuthTokens, getBaseUrl } from '@/lib/auth';

export async function POST() {
  await clearAuthTokens();
  return NextResponse.json({ success: true });
}

export async function GET() {
  await clearAuthTokens();
  return NextResponse.redirect(getBaseUrl());
}
