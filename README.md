# Playlist Forge

Playlist Forge is a Next.js app for loading a Spotify or YouTube playlist, reordering it with shuffle and sort tools, and saving the new order back to the source service.

## What It Does

- Connect to either Spotify or YouTube with OAuth
- Load all playlists for the authenticated account
- Open a playlist and fetch all tracks
- Shuffle tracks with a smart shuffle that tries to avoid back-to-back artists
- Sort tracks by title, artist, or release date
- Save the reordered playlist back to Spotify or YouTube

## Stack

- Next.js 16 App Router
- React 19
- TypeScript 5 in strict mode
- Tailwind CSS 4
- SST on AWS

## Requirements

- Node.js 20 or newer
- npm
- A Spotify developer app if you want Spotify auth
- A Google Cloud app with YouTube Data API v3 enabled if you want YouTube auth

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.local.example .env.local
```

If `.env.local.example` does not exist in your checkout, create `.env.local` manually.

3. Add these variables to `.env.local`:

```bash
NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3000

SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

YOUTUBE_CLIENT_ID=your_google_oauth_client_id
YOUTUBE_CLIENT_SECRET=your_google_oauth_client_secret
```

4. Configure OAuth callback URLs in your provider dashboards:

- Spotify redirect URI: `http://127.0.0.1:3000/api/auth/spotify/callback`
- Google redirect URI: `http://127.0.0.1:3000/api/auth/youtube/callback`

If you deploy the app, add equivalent production callback URLs for that host as well.

## Run The App

Start the local dev server:

```bash
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Other useful commands:

```bash
npm run lint
npm run build
npm run start
```

## How To Use It

1. Open the homepage.
2. Choose `Connect with Spotify` or `Connect with YouTube`.
3. Complete the OAuth flow.
4. After login, the app redirects to `/dashboard` and loads your playlists.
5. Click a playlist to open its editor.
6. Use the editor actions:
   - `Shuffle` runs the smart shuffle algorithm.
   - `Title A-Z` / `Z-A` sorts by track title.
   - `Artist A-Z` / `Z-A` sorts by artist name.
   - `Oldest` / `Newest` sorts by release date.
   - `Reset` restores the original order loaded from the service.
7. Click `Save Changes` to persist the new order back to the service.

## How It Works

### Authentication

- OAuth starts from `/api/auth/spotify` or `/api/auth/youtube`
- Tokens are stored in an HTTP-only cookie named `playlist_auth`
- Expired access tokens are refreshed automatically before playlist API calls
- The active service is inferred from the stored token payload

### Playlist Editing

- The dashboard loads playlists from `/api/playlists`
- The playlist page fetches all tracks with `/api/playlist/[id]?all=true`
- Reordering happens client-side first
- Changes are not persisted until `Save Changes` calls `/api/playlist/[id]/save`

### Service-Specific Save Behavior

- Spotify replaces playlist tracks in batches
- YouTube reorders via playlist item operations behind the API layer

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── playlist/[id]/
│   │   ├── playlists/
│   │   └── logout/
│   ├── dashboard/
│   └── playlist/[id]/
├── lib/
│   ├── auth.ts
│   ├── shuffle.ts
│   ├── sort.ts
│   ├── spotify.ts
│   └── youtube.ts
└── types/
```

## Deployment With SST

The repo includes `sst.config.ts` for AWS deployment through SST.

For local SST work:

```bash
npx sst dev
```

For deployment:

```bash
npx sst deploy
```

SST expects these secrets:

- `SpotifyClientId`
- `SpotifyClientSecret`
- `YouTubeClientId`
- `YouTubeClientSecret`

Those secrets are injected into the deployed Next.js app as:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`

## Troubleshooting

- If OAuth redirects back with an error, verify `NEXT_PUBLIC_BASE_URL` and your provider callback URLs match exactly.
- If the dashboard sends you back to `/`, your auth cookie is missing, expired, or refresh failed.
- If a save fails, confirm the connected account still has permission to modify that playlist.

## Additional Docs

- Repo instructions: [AGENTS.md](./AGENTS.md)
- Architecture notes: [.claude/docs/architectural_patterns.md](./.claude/docs/architectural_patterns.md)
