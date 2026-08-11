import { generateAmbientDnB } from '../services/generator';
import { generateDancefloor } from '../services/dancefloorGenerator';
import { generateHypnoticTechno } from '../services/hypnoticGenerator';
import { generateJungle } from '../services/jungleGenerator';
import { generateJumpUp } from '../services/jumpUpGenerator';
import { generateLiquid } from '../services/liquidGenerator';
import { generateNeurofunk } from '../services/neurofunkGenerator';
import { seedRandom } from '../utils/random';
import { setSwing } from '../utils/groove';
import { setHumanize } from '../utils/humanize';
import { ParsedMidi, parseMidi } from '../utils/midiParser';

export type Feel = { seed?: number; swing?: number; humanize?: number };

/** Every generator behind one signature, with the tempo each one is tested at. */
export const GENERATORS = {
  ambient: {
    bpm: 174,
    run: (minutes: number) =>
      generateAmbientDnB(
        { bpm: 174, lengthMinutes: minutes, scaleRoot: 'A', scaleType: 'minor', mood: 'liquid', complexity: 0.7, breakDensity: 0.6, atmosphere: 0.8 },
        () => {}
      )
  },
  jungle: {
    bpm: 168,
    run: (minutes: number) =>
      generateJungle(
        { bpm: 168, lengthMinutes: minutes, scaleRoot: 'D', scaleType: 'dorian', style: 'classic', breakEnergy: 0.7, chopComplexity: 0.6, bassWeight: 0.7, dubSpace: 0.5 },
        () => {}
      )
  },
  liquid: {
    bpm: 174,
    run: (minutes: number) =>
      generateLiquid(
        { bpm: 174, lengthMinutes: minutes, scaleRoot: 'E', scaleType: 'dorian', style: 'smooth', groove: 0.6, bassFlow: 0.6, melody: 0.6, space: 0.6 },
        () => {}
      )
  },
  dancefloor: {
    bpm: 174,
    run: (minutes: number) =>
      generateDancefloor(
        { bpm: 174, lengthMinutes: minutes, scaleRoot: 'B', scaleType: 'minor', style: 'rave', drumDrive: 0.7, bassLift: 0.6, hookSize: 0.7, buildEnergy: 0.6 },
        () => {}
      )
  },
  jumpup: {
    bpm: 174,
    run: (minutes: number) =>
      generateJumpUp(
        { bpm: 174, lengthMinutes: minutes, scaleRoot: 'G', scaleType: 'minor', style: 'wobble', drumSnap: 0.7, wobble: 0.7, riffEnergy: 0.6, hype: 0.6 },
        () => {}
      )
  },
  neurofunk: {
    bpm: 174,
    run: (minutes: number) =>
      generateNeurofunk(
        { bpm: 174, lengthMinutes: minutes, scaleRoot: 'F', scaleType: 'phrygian', style: 'rolling', drumPressure: 0.85, bassMotion: 0.7, technicality: 0.8, tension: 0.6 },
        () => {}
      )
  },
  hypnotic: {
    bpm: 132,
    run: (minutes: number) =>
      generateHypnoticTechno(
        { bpm: 132, lengthMinutes: minutes, scaleRoot: 'C', scaleType: 'minor', style: 'berlin', drive: 0.7, hypnosis: 0.6, percussion: 0.8, space: 0.5 },
        () => {}
      )
  }
} as const;

export type GenreName = keyof typeof GENERATORS;
export const GENRE_NAMES = Object.keys(GENERATORS) as GenreName[];

/** Generation depends on module-level state, so every run sets all of it. */
export async function build(genre: GenreName, minutes = 1, feel: Feel = {}): Promise<Uint8Array> {
  const { seed = 12345, swing = 0, humanize = 0 } = feel;
  seedRandom(seed);
  setSwing(swing);
  setHumanize(humanize, seed, GENERATORS[genre].bpm);
  return GENERATORS[genre].run(minutes);
}

export async function buildParsed(genre: GenreName, minutes = 1, feel: Feel = {}): Promise<ParsedMidi> {
  return parseMidi(await build(genre, minutes, feel));
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
