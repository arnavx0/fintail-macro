/**
 * Deterministic pseudo-random numbers for sample data that must look the
 * same on every load. Never use for anything security-sensitive.
 */

/** Uniform numbers in [0, 1) from a 32-bit seed (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A standard normal draw from a uniform source (Box–Muller). */
export function standardNormal(next: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
}

/** A stable 32-bit seed from a string, so each symbol gets its own series. */
export function seedFromString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
