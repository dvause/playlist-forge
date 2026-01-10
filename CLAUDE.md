# Playlist Forge

A web application for shuffling, sorting, and managing Spotify and YouTube playlists.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4
- **Deployment**: SST (Serverless Stack) on AWS
- **APIs**: Spotify Web API, YouTube Data API v3

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (REST endpoints)
│   │   ├── auth/          # OAuth flows (Spotify, YouTube)
│   │   ├── playlists/     # Playlist listing
│   │   └── playlist/[id]/ # Track operations, save
│   ├── dashboard/         # Playlist selection page
│   └── playlist/[id]/     # Track editing page
├── lib/                   # Shared utilities
│   ├── auth.ts           # Cookie-based token management
│   ├── spotify.ts        # Spotify API client
│   ├── youtube.ts        # YouTube API client
│   ├── shuffle.ts        # Shuffle algorithms
│   └── sort.ts           # Sort utilities
└── types/                # TypeScript interfaces
    └── index.ts          # Playlist, Track, AuthTokens, etc.
```

## Essential Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
npx sst dev      # Start SST dev mode with AWS resources
npx sst deploy   # Deploy to AWS
```

## Environment Variables

Required secrets (managed via SST):
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`

For local dev, also set:
- `NEXT_PUBLIC_BASE_URL` (defaults to `http://localhost:3000`)

## Key Files

| Purpose | Location |
|---------|----------|
| Type definitions | `src/types/index.ts:1-53` |
| Auth token handling | `src/lib/auth.ts:1-51` |
| Spotify API client | `src/lib/spotify.ts:1-238` |
| YouTube API client | `src/lib/youtube.ts:1-341` |
| Smart shuffle algorithm | `src/lib/shuffle.ts:19-94` |
| SST infrastructure | `sst.config.ts:1-33` |

## Path Aliases

- `@/*` maps to `./src/*` (configured in `tsconfig.json:22-24`)

## Additional Documentation

When working on specific areas, consult these references:

| Topic | File |
|-------|------|
| Architectural patterns | `.claude/docs/architectural_patterns.md` |
