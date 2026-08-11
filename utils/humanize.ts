import { createRng } from './random';

/**
 * Performance feel, applied as notes are written.
 *
 * The generators quantise everything: in a typical techno take every hit lands
 * exactly on a 16th and a whole shaker part shares three velocities. Real playing
 * pushes and drags, accents unevenly, and never strikes a chord perfectly
 * together. This nudges each note on the way out.
 *
 * It draws from its own random stream so changing the feel never re-rolls the
 * composition.
 */

type NoteShape = {
  channel: number;
  pitch: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
};

const DRUM_CHANNEL = 9;

let amount = 0;
let ticksPerMs = 480 * 120 / 60000;
let rng = createRng(1);
let lastStartTick = new Map<number, number>();
let stackIndex = new Map<number, number>();

export function setHumanize(value: number, seed: number, bpm: number, ticksPerBeat = 480) {
  amount = Math.max(0, Math.min(1, value));
  ticksPerMs = (ticksPerBeat * bpm) / 60000;
  rng = createRng((seed ^ 0x5f37_59df) >>> 0);
  lastStartTick = new Map();
  stackIndex = new Map();
}

/** Milliseconds of timing scatter a hit can take, by what it is. */
function timingSpreadMs(channel: number, pitch: number): number {
  if (channel !== DRUM_CHANNEL) return 14;
  if (pitch === 35 || pitch === 36) return 3; // the kick is the anchor, keep it tight
  if (pitch === 38 || pitch === 40 || pitch === 39) return 7;
  return 10; // hats, shakers and percussion breathe the most
}

/** Downbeats lean loud, the 16ths between them lean soft. */
function accentAt(startTick: number, ticksPerBeat = 480): number {
  const step = Math.round(startTick / (ticksPerBeat / 4)) % 4;
  if (step === 0) return 5;
  if (step === 2) return 1;
  return -4;
}

export function humanizeNote(note: NoteShape): NoteShape {
  if (amount <= 0) return note;

  const bipolar = () => rng() * 2 - 1;

  let startTick = note.startTick;

  // Notes written at the same instant get rolled apart slightly, like a hand
  // hitting a chord: perfectly simultaneous onsets are the giveaway of a machine.
  if (note.channel !== DRUM_CHANNEL) {
    if (lastStartTick.get(note.channel) === note.startTick) {
      const index = (stackIndex.get(note.channel) ?? 0) + 1;
      stackIndex.set(note.channel, index);
      startTick += index * (2 + rng() * 6) * ticksPerMs * amount;
    } else {
      stackIndex.set(note.channel, 0);
    }
    lastStartTick.set(note.channel, note.startTick);
  }

  startTick += bipolar() * timingSpreadMs(note.channel, note.pitch) * ticksPerMs * amount;

  const velocity =
    note.velocity + (bipolar() * 13 + accentAt(note.startTick)) * amount;

  const durationTicks = note.durationTicks * (1 + bipolar() * 0.12 * amount);

  return {
    ...note,
    startTick: Math.max(0, startTick),
    durationTicks: Math.max(1, durationTicks),
    velocity: Math.max(1, Math.min(127, velocity))
  };
}
