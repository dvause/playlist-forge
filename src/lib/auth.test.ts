import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthTokens } from '@/types';

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

import {
  clearAuthTokens,
  getActiveService,
  getAuthTokens,
  getBaseUrl,
  isTokenExpired,
  setAuthTokens,
} from '@/lib/auth';

describe('auth helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  it('reads and parses auth tokens from the cookie store', async () => {
    const tokens: AuthTokens = {
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: 1_800_000_000_000,
      service: 'spotify',
    };

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: JSON.stringify(tokens) }),
    });

    await expect(getAuthTokens()).resolves.toEqual(tokens);
    await expect(getActiveService()).resolves.toBe('spotify');
  });

  it('returns null for missing or invalid auth cookies', async () => {
    cookiesMock.mockResolvedValueOnce({
      get: vi.fn().mockReturnValue(undefined),
    });

    await expect(getAuthTokens()).resolves.toBeNull();

    cookiesMock.mockResolvedValueOnce({
      get: vi.fn().mockReturnValue({ value: '{invalid-json' }),
    });

    await expect(getAuthTokens()).resolves.toBeNull();
  });

  it('writes and clears auth cookies with the expected options', async () => {
    const set = vi.fn();
    const del = vi.fn();
    const tokens: AuthTokens = {
      accessToken: 'token',
      expiresAt: 1_800_000_000_000,
      service: 'youtube',
    };

    cookiesMock.mockResolvedValue({
      set,
      delete: del,
    });

    await setAuthTokens(tokens);
    await clearAuthTokens();

    expect(set).toHaveBeenCalledWith(
      'playlist_auth',
      JSON.stringify(tokens),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      }),
    );
    expect(del).toHaveBeenCalledWith('playlist_auth');
  });

  it('uses the configured base url and applies the token expiry buffer', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';

    expect(getBaseUrl()).toBe('https://example.com');
    expect(
      isTokenExpired({
        accessToken: 'token',
        expiresAt: Date.now() + 59_000,
        service: 'spotify',
      }),
    ).toBe(true);
    expect(
      isTokenExpired({
        accessToken: 'token',
        expiresAt: Date.now() + 61_000,
        service: 'spotify',
      }),
    ).toBe(false);
  });

  it('falls back to the local default base url', () => {
    expect(getBaseUrl()).toBe('http://127.0.0.1:3000');
  });
});
