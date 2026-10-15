// Pep talks for the end of a practice test, picked at random so it doesn't
// always read the same: one set for a run with every answer right first
// time, another for the rest (never "Perfect!" for a run that wasn't).

const PERFECT_CHEER_KEYS = [
  "courseDetails.practiceCheerPerfect1",
  "courseDetails.practiceCheerPerfect2",
  "courseDetails.practiceCheerPerfect3",
] as const;

const CHEER_KEYS = [
  "courseDetails.practiceCheer1",
  "courseDetails.practiceCheer2",
  "courseDetails.practiceCheer3",
  "courseDetails.practiceCheer4",
  "courseDetails.practiceCheer5",
  "courseDetails.practiceCheer6",
] as const;

export function pickCheerKey(isPerfect: boolean, random: () => number = Math.random): string {
  const keys = isPerfect ? PERFECT_CHEER_KEYS : CHEER_KEYS;
  return keys[Math.floor(random() * keys.length)];
}
