// A source of random numbers in [0, 1), like `Math.random`. A test's draws
// (which exercises, their numbers, the order of options and cards) all take
// one, so a seeded one rebuilds the same test from its code (SLJ-232).
export type Random = () => number;

// The same sequence for the same seed, every time and on every computer
// (mulberry32: small, fast, and good enough to shuffle a test; not for
// secrets). `seed` is taken as a 32-bit whole number.
export function createSeededRandom(seed: number): Random {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
