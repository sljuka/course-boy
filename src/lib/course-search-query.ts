// What a student typed in Home's search: plain words match a course's title,
// description or id; `:favorites` (or `:favourites`) keeps only starred
// courses (SLJ-50), whichever group they're in. Filters combine with words:
// `:favorites math`.
export type CourseSearchQuery = {
  favoritesOnly: boolean;
  text: string;
};

const FAVORITES_FILTERS = new Set([":favorites", ":favourites"]);

export function parseCourseSearchQuery(query: string): CourseSearchQuery {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const favoritesOnly = words.some((word) => FAVORITES_FILTERS.has(word.toLowerCase()));

  return {
    favoritesOnly,
    text: words
      .filter((word) => !FAVORITES_FILTERS.has(word.toLowerCase()))
      .join(" ")
      .toLowerCase(),
  };
}
