/**
 * Seeded random numbers so a game can be replayed from its seed.
 */

/**
 * Creates a mulberry32 generator.
 * @param {number} seed Any integer; equal seeds produce equal sequences.
 * @returns {() => number} Function returning floats in [0, 1).
 */
export function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws a standard normal sample (Box-Muller).
 * @param {() => number} rng Generator from {@link createRng}.
 * @returns {number} Sample with mean 0 and standard deviation 1.
 */
export function gaussian(rng) {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
