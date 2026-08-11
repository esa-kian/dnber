/**
 * Seeded random number generator (mulberry32).
 *
 * The generators run again on every control change, so their randomness has to
 * be reproducible: with the same seed, tweaking one slider changes only what
 * that slider affects instead of rolling an entirely new track.
 */

let state = 0x9e3779b9;

export function seedRandom(seed: number) {
  state = seed >>> 0 || 1;
}

/** An independent stream, so one feature's draws never shift another's. */
export function createRng(seed: number): () => number {
  let local = seed >>> 0 || 1;
  return () => {
    local = (local + 0x6d2b79f5) >>> 0;
    let t = local;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function random(): number {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
