/**
 * Swing, applied while notes are written rather than inside each generator.
 *
 * Every off-beat 16th is pushed later; at full swing the pair lands on a
 * triplet feel (the second note sits two thirds of the way through the pair).
 */

let swingAmount = 0;
let stepTicks = 120; // a 16th at the default 480 ticks per beat

export function setSwing(amount: number, ticksPerBeat = 480) {
  swingAmount = Math.max(0, Math.min(1, amount));
  stepTicks = ticksPerBeat / 4;
}

/** Returns the tick an event should land on once swing is taken into account. */
export function swingTick(tick: number): number {
  if (swingAmount <= 0) return tick;

  const step = Math.round(tick / stepTicks);
  // Only the off-beat halves of each 16th pair move
  if (step % 2 === 0) return tick;

  // How far the note sits from its step, so triplets and flams keep their offset
  const drift = tick - step * stepTicks;
  return step * stepTicks + (swingAmount * stepTicks) / 3 + drift;
}
