import { Track, SortOption } from '@/types';

export function sortTracks(tracks: Track[], option: SortOption): Track[] {
  const sorted = [...tracks].sort((a, b) => {
    let comparison = 0;

    switch (option.field) {
      case 'title':
        comparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        break;
      case 'artist':
        comparison = a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' });
        // Secondary sort by title for same artist
        if (comparison === 0) {
          comparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        }
        break;
      case 'releaseDate':
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        comparison = dateA - dateB;
        // Secondary sort by title for same date
        if (comparison === 0) {
          comparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        }
        break;
    }

    return option.direction === 'asc' ? comparison : -comparison;
  });

  // Update positions
  return sorted.map((track, index) => ({
    ...track,
    position: index,
  }));
}
