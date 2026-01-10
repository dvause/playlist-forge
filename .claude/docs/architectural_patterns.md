# Architectural Patterns

## Service Adapter Pattern

Spotify and YouTube APIs are abstracted behind parallel implementations with consistent interfaces. Both services expose the same function signatures for:

- `get{Service}AuthUrl()` - Generate OAuth URL
- `exchange{Service}Code()` - Exchange auth code for tokens
- `refresh{Service}Token()` - Refresh expired tokens
- `get{Service}Playlists()` - Fetch user playlists
- `get{Service}PlaylistTracks()` - Fetch tracks (paginated)
- `getAll{Service}PlaylistTracks()` - Fetch all tracks
- `reorder{Service}Playlist()` - Save new track order

**Examples**: `src/lib/spotify.ts:115-142` vs `src/lib/youtube.ts:121-153`

When adding a new music service, create a new file in `src/lib/` following this pattern.

## Token Refresh Middleware

API routes check token expiration before making service calls. The pattern appears in:
- `src/app/api/playlists/route.ts:14-29`
- `src/app/api/playlist/[id]/route.ts:23-38`
- `src/app/api/playlist/[id]/save/route.ts:26-41`

```
1. Get tokens from cookies
2. Check if expired (with 60s buffer)
3. If expired, refresh via service-specific endpoint
4. Store new tokens in cookies
5. Proceed with API call
```

The expiration check includes a 60-second buffer: `src/lib/auth.ts:44-47`

## Cookie-Based Session Management

Authentication tokens stored as HTTP-only cookies (not localStorage):
- Single cookie stores full `AuthTokens` object as JSON
- 30-day expiration
- Secure flag enabled in production
- SameSite=lax for CSRF protection

**Implementation**: `src/lib/auth.ts:23-32`

## Pagination Abstraction

Services use different pagination mechanisms but expose a unified `PaginatedTracks` interface:

- **Spotify**: Offset-based (`?offset=50&limit=50`)
- **YouTube**: Token-based (`?pageToken=xxx`)

The YouTube client internally handles token-to-offset translation: `src/lib/youtube.ts:182-203`

## Pure Functions for Data Transformation

Shuffle and sort operations are pure functions that:
1. Accept a `Track[]` array
2. Return a new array (no mutation)
3. Update `position` field on each track

**Shuffle**: `src/lib/shuffle.ts` - Two algorithms available:
- `smartShuffle()` - Avoids consecutive same-artist tracks
- `simpleShuffle()` - Standard Fisher-Yates

**Sort**: `src/lib/sort.ts:3-37` - Supports title, artist, releaseDate with secondary sort

## Client-Side State Pattern

The playlist editor (`src/app/playlist/[id]/page.tsx`) maintains:
- `originalTracks` - Initial state for reset functionality
- `currentTracks` - Working copy modified by operations
- `hasChanges` - Derived flag comparing current vs original

Changes are only persisted when user explicitly clicks "Save Changes".

## API Route Parameter Pattern

Dynamic route parameters in Next.js 15+ are async. The pattern used:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}
```

**Examples**: `src/app/api/playlist/[id]/route.ts:6-10`, `src/app/api/playlist/[id]/save/route.ts:7-11`

## Error Handling

API routes follow a consistent error response pattern:
- 401 for auth failures (triggers redirect on client)
- 400 for validation errors
- 500 for service failures

Client components check for 401 and redirect to login: `src/app/dashboard/page.tsx:18-21`

## Service-Specific Reordering

Track reordering differs significantly between services:

**Spotify**: Replace all tracks at once (batched in 100s)
- `src/lib/spotify.ts:211-238`

**YouTube**: Delete all then re-add in order (more API calls)
- `src/lib/youtube.ts:291-341`

This is encapsulated in the adapter pattern so callers don't need to know the difference.
