export type ServiceType = 'spotify' | 'youtube';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  trackCount: number;
  service: ServiceType;
  ownerId?: string;
  isPublic?: boolean;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumImageUrl?: string;
  duration: number; // milliseconds
  releaseDate?: string; // ISO date string
  uri: string; // Service-specific URI for reordering
  position: number; // Position in playlist
}

export interface PaginatedTracks {
  tracks: Track[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp
  service: ServiceType;
}

export interface SortOption {
  field: 'title' | 'artist' | 'releaseDate';
  direction: 'asc' | 'desc';
}

export interface PlaylistState {
  originalTracks: Track[];
  currentTracks: Track[];
  hasChanges: boolean;
  sortedBy?: SortOption;
  isShuffled: boolean;
}
