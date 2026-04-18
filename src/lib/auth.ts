import { cookies } from 'next/headers';
import { AuthTokens, ServiceType } from '@/types';

const TOKEN_COOKIE_NAME = 'playlist_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getAuthTokens(): Promise<AuthTokens | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(TOKEN_COOKIE_NAME);

  if (!tokenCookie?.value) {
    return null;
  }

  try {
    const tokens: AuthTokens = JSON.parse(tokenCookie.value);
    return tokens;
  } catch {
    return null;
  }
}

export async function setAuthTokens(tokens: AuthTokens): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, JSON.stringify(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearAuthTokens(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
}

export async function getActiveService(): Promise<ServiceType | null> {
  const tokens = await getAuthTokens();
  return tokens?.service ?? null;
}

export function isTokenExpired(tokens: AuthTokens): boolean {
  // Add 60 second buffer
  return Date.now() >= (tokens.expiresAt - 60000);
}

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000';
}
