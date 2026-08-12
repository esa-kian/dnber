import { MidiFile } from '../utils/midiEncoder';
import { DRUM_MAPPING, ROOT_NOTES } from '../utils/musicTheory';
import { GenerationStatus, JumpUpConfig, MidiTrack } from '../types';
import { random } from '../utils/random';
import { yieldToUi } from '../utils/schedule';

const TICKS_PER_BEAT = 480;
const BAR_TICKS = TICKS_PER_BEAT * 4;
const STEP_TICKS = TICKS_PER_BEAT / 4;

const CHANNELS = {
  stabs: 0,
  sub: 1,
  bassMain: 4,
  bassResponse: 5,
  fx: 6,
  drums: 9
};

const GM_PROGRAMS = {
  brassStab: 62,
  subBass: 38,
  wobbleBass: 39,
  squareLead: 80,
  fx: 99
};

type Section = {
  name: string;
  bars: number;
  drums: number;
  bass: number;
  stabs: number;
  hype: number;
  drop?: boolean;
  stripEvery?: number;
};

type BendShape = 'none' | 'scoop' | 'drop' | 'pop' | 'rise';

type BassStep = {
  step: number;
  duration: number;
  semitone: number;
  lane: 'main' | 'response';
  velocity: number;
  bend: BendShape;
  cutoff: number;
};

type DrumPattern = {
  kicks: number[];
  hats: number[];
  opens: number[];
  ghosts: number[];
};

const DRUM_PATTERNS: Record<JumpUpConfig['style'], DrumPattern[]> = {
  bouncy: [
    { kicks: [0, 10, 16, 22, 26], hats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], opens: [14, 30], ghosts: [7, 11, 23, 27] },
    { kicks: [0, 8, 10, 16, 24, 26], hats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], opens: [6, 22, 30], ghosts: [3, 11, 19, 27] }
  ],
  wobble: [
    { kicks: [0, 10, 16, 21, 26], hats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], opens: [14, 30], ghosts: [7, 15, 23, 31] },
    { kicks: [0, 7, 10, 16, 22, 27], hats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], opens: [10, 30], ghosts: [5, 11, 21, 29] }
  ],
  dark: [
    { kicks: [0, 10, 16, 26], hats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], opens: [30], ghosts: [11, 23, 31] },
    { kicks: [0, 8, 10, 16, 24, 27], hats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], opens: [14, 30], ghosts: [7, 15, 27] }
  ],
  rave: [
    { kicks: [0, 6, 10, 16, 22, 26], hats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], opens: [6, 14, 22, 30], ghosts: [3, 7, 11, 19, 27] },
    { kicks: [0, 10, 14, 16, 22, 26], hats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], opens: [14, 30], ghosts: [5, 11, 21, 27, 31] }
  ]
};

const BASS_RIFFS: Record<JumpUpConfig['style'], BassStep[][]> = {
  bouncy: [
    [
      { step: 0, duration: 4, semitone: 0, lane: 'main', velocity: 114, bend: 'scoop', cutoff: 46 },
      { step: 5, duration: 2, semitone: 7, lane: 'response', velocity: 84, bend: 'pop', cutoff: 88 },
      { step: 8, duration: 2, semitone: 10, lane: 'main', velocity: 88, bend: 'drop', cutoff: 78 },
      { step: 10, duration: 4, semitone: 0, lane: 'response', velocity: 112, bend: 'scoop', cutoff: 54 },
      { step: 16, duration: 4, semitone: 0, lane: 'main', velocity: 112, bend: 'scoop', cutoff: 50 },
      { step: 21, duration: 2, semitone: 3, lane: 'response', velocity: 84, bend: 'pop', cutoff: 84 },
      { step: 24, duration: 2, semitone: 7, lane: 'main', velocity: 88, bend: 'rise', cutoff: 92 },
      { step: 27, duration: 4, semitone: 0, lane: 'response', velocity: 114, bend: 'drop', cutoff: 58 }
    ],
    [
      { step: 0, duration: 5, semitone: 0, lane: 'main', velocity: 114, bend: 'scoop', cutoff: 44 },
      { step: 7, duration: 2, semitone: 10, lane: 'response', velocity: 86, bend: 'pop', cutoff: 90 },
      { step: 10, duration: 3, semitone: 0, lane: 'main', velocity: 110, bend: 'drop', cutoff: 58 },
      { step: 16, duration: 4, semitone: 0, lane: 'response', velocity: 112, bend: 'scoop', cutoff: 48 },
      { step: 22, duration: 2, semitone: 7, lane: 'main', velocity: 86, bend: 'rise', cutoff: 92 },
      { step: 26, duration: 5, semitone: 0, lane: 'response', velocity: 114, bend: 'scoop', cutoff: 56 }
    ]
  ],
  wobble: [
    [
      { step: 0, duration: 6, semitone: 0, lane: 'main', velocity: 116, bend: 'scoop', cutoff: 38 },
      { step: 8, duration: 2, semitone: 7, lane: 'response', velocity: 84, bend: 'pop', cutoff: 96 },
      { step: 10, duration: 5, semitone: 0, lane: 'main', velocity: 114, bend: 'drop', cutoff: 52 },
      { step: 16, duration: 6, semitone: 0, lane: 'response', velocity: 116, bend: 'scoop', cutoff: 42 },
      { step: 24, duration: 2, semitone: 10, lane: 'main', velocity: 86, bend: 'rise', cutoff: 100 },
      { step: 27, duration: 4, semitone: 0, lane: 'response', velocity: 114, bend: 'drop', cutoff: 58 }
    ],
    [
      { step: 0, duration: 4, semitone: 0, lane: 'main', velocity: 114, bend: 'scoop', cutoff: 40 },
      { step: 5, duration: 1, semitone: -1, lane: 'response', velocity: 78, bend: 'pop', cutoff: 102 },
      { step: 7, duration: 2, semitone: 7, lane: 'main', velocity: 84, bend: 'rise', cutoff: 92 },
      { step: 10, duration: 5, semitone: 0, lane: 'response', velocity: 114, bend: 'drop', cutoff: 54 },
      { step: 16, duration: 5, semitone: 0, lane: 'main', velocity: 116, bend: 'scoop', cutoff: 44 },
      { step: 23, duration: 2, semitone: 3, lane: 'response', velocity: 84, bend: 'pop', cutoff: 88 },
      { step: 27, duration: 4, semitone: 0, lane: 'main', velocity: 114, bend: 'drop', cutoff: 60 }
    ]
  ],
  dark: [
    [
      { step: 0, duration: 6, semitone: 0, lane: 'main', velocity: 116, bend: 'scoop', cutoff: 34 },
      { step: 8, duration: 2, semitone: -1, lane: 'response', velocity: 88, bend: 'drop', cutoff: 82 },
      { step: 10, duration: 4, semitone: 0, lane: 'main', velocity: 112, bend: 'scoop', cutoff: 46 },
      { step: 16, duration: 5, semitone: 0, lane: 'response', velocity: 112, bend: 'drop', cutoff: 40 },
      { step: 23, duration: 2, semitone: 6, lane: 'main', velocity: 86, bend: 'pop', cutoff: 96 },
      { step: 27, duration: 4, semitone: 0, lane: 'response', velocity: 114, bend: 'scoop', cutoff: 52 }
    ],
    [
      { step: 0, duration: 5, semitone: 0, lane: 'main', velocity: 116, bend: 'scoop', cutoff: 36 },
      { step: 7, duration: 2, semitone: 1, lane: 'response', velocity: 86, bend: 'drop', cutoff: 84 },
      { step: 10, duration: 4, semitone: 0, lane: 'main', velocity: 112, bend: 'drop', cutoff: 50 },
      { step: 16, duration: 6, semitone: 0, lane: 'response', velocity: 114, bend: 'scoop', cutoff: 42 },
      { step: 25, duration: 1, semitone: 6, lane: 'main', velocity: 80, bend: 'pop', cutoff: 100 },
      { step: 27, duration: 4, semitone: -1, lane: 'response', velocity: 106, bend: 'drop', cutoff: 64 }
    ]
  ],
  rave: [
    [
      { step: 0, duration: 4, semitone: 0, lane: 'main', velocity: 114, bend: 'scoop', cutoff: 48 },
      { step: 4, duration: 1, semitone: 12, lane: 'response', velocity: 78, bend: 'pop', cutoff: 112 },
      { step: 7, duration: 2, semitone: 7, lane: 'main', velocity: 86, bend: 'rise', cutoff: 94 },
      { step: 10, duration: 4, semitone: 0, lane: 'response', velocity: 112, bend: 'drop', cutoff: 58 },
      { step: 16, duration: 4, semitone: 0, lane: 'main', velocity: 114, bend: 'scoop', cutoff: 50 },
      { step: 20, duration: 1, semitone: 12, lane: 'response', velocity: 78, bend: 'pop', cutoff: 114 },
      { step: 22, duration: 2, semitone: 10, lane: 'main', velocity: 88, bend: 'rise', cutoff: 98 },
      { step: 26, duration: 5, semitone: 0, lane: 'response', velocity: 114, bend: 'drop', cutoff: 60 }
    ],
    [
      { step: 0, duration: 5, semitone: 0, lane: 'main', velocity: 114, bend: 'scoop', cutoff: 46 },
      { step: 6, duration: 2, semitone: 7, lane: 'response', velocity: 84, bend: 'pop', cutoff: 94 },
      { step: 10, duration: 3, semitone: 0, lane: 'main', velocity: 112, bend: 'drop', cutoff: 56 },
      { step: 14, duration: 1, semitone: 12, lane: 'response', velocity: 78, bend: 'pop', cutoff: 116 },
      { step: 16, duration: 4, semitone: 0, lane: 'response', velocity: 112, bend: 'scoop', cutoff: 50 },
      { step: 22, duration: 2, semitone: 10, lane: 'main', velocity: 88, bend: 'rise', cutoff: 100 },
      { step: 27, duration: 4, semitone: 0, lane: 'response', velocity: 114, bend: 'drop', cutoff: 62 }
    ]
  ]
};

const STAB_SHAPES: Record<JumpUpConfig['style'], number[][]> = {
  bouncy: [[0, 7, 10], [0, 3, 7], [7, 10, 12]],
  wobble: [[0, 7], [0, 10], [3, 7]],
  dark: [[0, 6], [0, -1, 6], [1, 6]],
  rave: [[0, 7, 12], [0, 10, 12], [7, 10, 12]]
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function chance(probability: number): boolean {
  return random() < clamp01(probability);
}

function randomBetween(min: number, max: number): number {
  return min + random() * (max - min);
}

function barTick(bar: number): number {
  return Math.round(bar * BAR_TICKS);
}

function stepTick(step: number): number {
  return Math.round(step * STEP_TICKS);
}

function rootMidi(root: string, octave: number): number {
  return ROOT_NOTES[root] + octave * 12;
}

function keepInRange(note: number, low: number, high: number): number {
  let result = note;
  while (result < low) result += 12;
  while (result > high) result -= 12;
  return result;
}

function addNote(
  midi: MidiFile,
  track: MidiTrack,
  channel: number,
  pitch: number,
  velocity: number,
  startTick: number,
  durationTicks: number,
  humanize: number = 0
) {
  midi.addNote(
    track,
    channel,
    pitch,
    clamp(velocity + randomBetween(-3, 3), 1, 127),
    Math.max(0, Math.round(startTick + randomBetween(-humanize, humanize))),
    Math.max(1, Math.round(durationTicks + randomBetween(-humanize, humanize)))
  );
}

function addDrum(
  midi: MidiFile,
  track: MidiTrack,
  note: number,
  velocity: number,
  startTick: number,
  durationTicks: number = STEP_TICKS * 0.72
) {
  midi.addNote(track, CHANNELS.drums, note, velocity, startTick, durationTicks);
}

function configureTrack(
  midi: MidiFile,
  track: MidiTrack,
  channel: number,
  program: number,
  volume: number,
  pan: number,
  reverb: number,
  chorus: number
) {
  midi.addProgramChange(track, channel, program, 0);
  midi.addControlChange(track, channel, 7, volume, 0);
  midi.addControlChange(track, channel, 10, pan, 0);
  midi.addControlChange(track, channel, 91, reverb, 0);
  midi.addControlChange(track, channel, 93, chorus, 0);
}

function setPitchBendRange(midi: MidiFile, track: MidiTrack, channel: number, semitones: number) {
  midi.addControlChange(track, channel, 101, 0, 0);
  midi.addControlChange(track, channel, 100, 0, 0);
  midi.addControlChange(track, channel, 6, semitones, 0);
  midi.addControlChange(track, channel, 38, 0, 0);
  midi.addControlChange(track, channel, 101, 127, STEP_TICKS);
  midi.addControlChange(track, channel, 100, 127, STEP_TICKS);
}

function addBendGesture(
  midi: MidiFile,
  track: MidiTrack,
  channel: number,
  startTick: number,
  durationTicks: number,
  shape: BendShape,
  movement: number
) {
  const amount = Math.round(900 + movement * 2200);
  const midpoint = startTick + Math.round(durationTicks * 0.5);
  const late = startTick + Math.round(durationTicks * 0.82);
  const endTick = startTick + durationTicks;

  midi.addPitchBend(track, channel, 0, Math.max(0, startTick - 4));

  if (shape === 'scoop') {
    midi.addPitchBend(track, channel, -amount, startTick);
    midi.addPitchBend(track, channel, Math.round(amount * 0.2), midpoint);
  } else if (shape === 'drop') {
    midi.addPitchBend(track, channel, Math.round(amount * 0.2), startTick);
    midi.addPitchBend(track, channel, -amount, late);
  } else if (shape === 'pop') {
    midi.addPitchBend(track, channel, amount, startTick + Math.round(durationTicks * 0.2));
    midi.addPitchBend(track, channel, -Math.round(amount * 0.35), midpoint);
  } else if (shape === 'rise') {
    midi.addPitchBend(track, channel, -Math.round(amount * 0.4), startTick);
    midi.addPitchBend(track, channel, amount, late);
  }

  midi.addPitchBend(track, channel, 0, endTick);
}

function addWobbleAutomation(
  midi: MidiFile,
  track: MidiTrack,
  channel: number,
  startTick: number,
  durationTicks: number,
  cutoff: number,
  movement: number
) {
  const start = clamp(cutoff - 18 * movement, 24, 116);
  const peak = clamp(cutoff + 34 * movement, 34, 124);
  const mid = startTick + Math.round(durationTicks * 0.48);
  const late = startTick + Math.round(durationTicks * 0.78);
  const end = startTick + durationTicks;

  midi.addControlChange(track, channel, 74, start, startTick);
  midi.addControlChange(track, channel, 71, 52 + movement * 38, startTick);
  midi.addControlChange(track, channel, 1, 20 + movement * 70, startTick);
  midi.addControlChange(track, channel, 74, peak, mid);
  midi.addControlChange(track, channel, 74, clamp(peak - 18, 24, 124), late);
  midi.addControlChange(track, channel, 74, start, end);
}

function createArrangement(totalBars: number): Section[] {
  if (totalBars <= 16) {
    return [
      { name: 'jump up loop', bars: totalBars, drums: 0.95, bass: 0.98, stabs: 0.44, hype: 0.58, drop: true }
    ];
  }

  if (totalBars <= 64) {
    const introBars = Math.max(4, Math.min(8, Math.floor(totalBars * 0.18)));
    const buildBars = Math.max(4, Math.min(8, Math.floor(totalBars * 0.16)));
    const outroBars = totalBars > 36 ? 4 : 0;
    const dropBars = Math.max(1, totalBars - introBars - buildBars - outroBars);

    return [
      { name: 'drum tease', bars: introBars, drums: 0.34, bass: 0.14, stabs: 0.25, hype: 0.25 },
      { name: 'hype build', bars: buildBars, drums: 0.66, bass: 0.38, stabs: 0.48, hype: 0.72 },
      { name: 'jump up drop', bars: dropBars, drums: 0.96, bass: 1, stabs: 0.58, hype: 0.75, drop: true, stripEvery: 16 },
      { name: 'quick outro', bars: outroBars, drums: 0.45, bass: 0.18, stabs: 0.22, hype: 0.2 }
    ].filter(section => section.bars > 0);
  }

  const cycle: Section[] = [
    { name: 'drum intro', bars: 16, drums: 0.34, bass: 0.12, stabs: 0.24, hype: 0.24 },
    { name: 'short build', bars: 8, drums: 0.68, bass: 0.38, stabs: 0.48, hype: 0.78 },
    { name: 'drop A', bars: 32, drums: 0.98, bass: 1, stabs: 0.58, hype: 0.76, drop: true, stripEvery: 16 },
    { name: 'switch', bars: 16, drums: 0.82, bass: 0.72, stabs: 0.42, hype: 0.58, drop: true, stripEvery: 8 },
    { name: 'breakdown', bars: 16, drums: 0.18, bass: 0.16, stabs: 0.34, hype: 0.36 },
    { name: 'second build', bars: 8, drums: 0.72, bass: 0.45, stabs: 0.5, hype: 0.85 },
    { name: 'drop B', bars: 32, drums: 1, bass: 1, stabs: 0.64, hype: 0.82, drop: true, stripEvery: 16 },
    { name: 'outro', bars: 8, drums: 0.42, bass: 0.16, stabs: 0.2, hype: 0.2 }
  ];

  const arrangement: Section[] = [];
  let remainingBars = totalBars;
  let index = 0;

  while (remainingBars > 0) {
    const template = cycle[index % cycle.length];
    const bars = Math.min(template.bars, remainingBars);
    arrangement.push({ ...template, bars });
    remainingBars -= bars;
    index++;
  }

  return arrangement;
}

function addJumpUpDrums(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  config: JumpUpConfig,
  phraseIndex: number
) {
  const pattern = DRUM_PATTERNS[config.style][phraseIndex % DRUM_PATTERNS[config.style].length];
  const snap = clamp01(config.drumSnap * 0.72 + section.drums * 0.36);
  const totalSteps = bars * 16;
  const startTick = barTick(startBar);
  const humanize = 2 + (1 - config.drumSnap) * 5;

  if (section.drop && startBar % 16 === 0) {
    addDrum(midi, track, DRUM_MAPPING.CRASH, 82 + snap * 18, startTick, TICKS_PER_BEAT * 1.5);
  }

  for (let step = 0; step < totalSteps; step++) {
    const local = step % 32;
    const tick = Math.round(startTick + stepTick(step) + randomBetween(-humanize, humanize));

    if (pattern.kicks.includes(local)) {
      addDrum(midi, track, DRUM_MAPPING.KICK, 88 + snap * 30 + (local === 0 ? 10 : 0), tick, STEP_TICKS * 0.82);
    }

    if ([4, 12, 20, 28].includes(local)) {
      addDrum(midi, track, DRUM_MAPPING.SNARE, 106 + snap * 19, tick, STEP_TICKS * 0.92);
      if (snap > 0.58) {
        addDrum(midi, track, DRUM_MAPPING.ELECTRIC_SNARE, 38 + snap * 22, tick + 3, STEP_TICKS * 0.76);
      }
    } else if (pattern.ghosts.includes(local) && chance(0.06 + snap * 0.18)) {
      addDrum(midi, track, DRUM_MAPPING.SNARE, 20 + snap * 24, tick, STEP_TICKS * 0.34);
    }

    if (pattern.hats.includes(local) && section.drums > 0.24) {
      const hatVelocity = 36 + snap * 28 + (local % 4 === 0 ? 10 : 0);
      addDrum(midi, track, DRUM_MAPPING.CLOSED_HH, hatVelocity, tick, STEP_TICKS * 0.42);
    }

    if (pattern.opens.includes(local) && section.drop && chance(0.18 + config.hype * 0.38)) {
      addDrum(midi, track, DRUM_MAPPING.OPEN_HH, 46 + snap * 26, tick, STEP_TICKS);
    }
  }

  if ((startBar + bars) % 8 === 0 && chance(0.18 + config.hype * 0.48)) {
    const fillTick = barTick(startBar + bars - 1);
    [11, 13, 14, 15].forEach((step, index) => {
      const drum = index === 0 ? DRUM_MAPPING.SNARE : index === 1 ? DRUM_MAPPING.LOW_TOM : DRUM_MAPPING.ELECTRIC_SNARE;
      addDrum(midi, track, drum, 44 + snap * 26 + index * 8, fillTick + stepTick(step), STEP_TICKS * 0.35);
    });
  }
}

function addBassPhrase(
  midi: MidiFile,
  trackMain: MidiTrack,
  trackResponse: MidiTrack,
  trackSub: MidiTrack,
  startBar: number,
  section: Section,
  config: JumpUpConfig,
  phraseIndex: number
) {
  if (!section.drop && !chance(section.bass * 0.72)) return;
  if (section.stripEvery && startBar % section.stripEvery === section.stripEvery - 2) return;

  const riff = BASS_RIFFS[config.style][phraseIndex % BASS_RIFFS[config.style].length];
  const base = rootMidi(config.scaleRoot, 2);
  const wobbleAmount = clamp01(config.wobble * 0.72 + section.bass * 0.36);
  const energy = clamp01(config.riffEnergy * 0.72 + section.bass * 0.36);
  const startTick = barTick(startBar);
  const phraseShift = config.style === 'rave' && phraseIndex % 4 === 3 ? 12 : 0;

  riff.forEach(hit => {
    if (hit.velocity < 90 && !chance(0.34 + energy * 0.66)) return;

    const hitTick = startTick + stepTick(hit.step);
    const durationTicks = Math.max(STEP_TICKS, stepTick(hit.duration) - 8);
    const channel = hit.lane === 'main' ? CHANNELS.bassMain : CHANNELS.bassResponse;
    const track = hit.lane === 'main' ? trackMain : trackResponse;
    const semitone = hit.semitone + phraseShift;
    const note = keepInRange(base + semitone, 34, 52);
    const subNote = keepInRange(base + (Math.abs(semitone) <= 3 ? semitone : 0), 24, 38);

    addNote(midi, track, channel, note, hit.velocity * energy, hitTick, durationTicks, 3);
    addWobbleAutomation(midi, track, channel, hitTick, durationTicks, hit.cutoff, wobbleAmount);
    addBendGesture(midi, track, channel, hitTick, durationTicks, hit.bend, wobbleAmount);

    if (hit.semitone === 0 || hit.duration >= 4 || chance(0.18 + config.wobble * 0.2)) {
      addNote(midi, trackSub, CHANNELS.sub, subNote, 82 + section.bass * 26, hitTick, durationTicks * 0.94, 2);
    }
  });
}

function scaleAccent(config: JumpUpConfig): number {
  if (config.scaleType === 'phrygian') return 1;
  if (config.scaleType === 'dorian') return 9;
  return 10;
}

function addStabs(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  config: JumpUpConfig,
  phraseIndex: number
) {
  const intensity = clamp01(config.hype * 0.58 + section.stabs * 0.5);
  if (!chance(0.16 + intensity * 0.62)) return;

  const base = rootMidi(config.scaleRoot, 4);
  const shape = STAB_SHAPES[config.style][phraseIndex % STAB_SHAPES[config.style].length];
  const rhythm = config.style === 'rave'
    ? [2, 6, 10, 14, 22, 26]
    : config.style === 'dark'
      ? [6, 14, 22, 30]
      : [6, 10, 22, 26];
  const accent = scaleAccent(config);

  for (let bar = 0; bar < bars; bar += 2) {
    if (bar > 0 && !chance(0.4 + intensity * 0.38)) continue;

    rhythm.forEach((step, index) => {
      if (index > 1 && !section.drop && !chance(intensity * 0.55)) return;
      if (index > 3 && !chance(config.hype * 0.55)) return;

      const semitone = shape[index % shape.length] === 10 ? accent : shape[index % shape.length];
      const note = keepInRange(base + semitone, 58, 84);
      const tick = barTick(startBar + bar) + stepTick(step);
      addNote(midi, track, CHANNELS.stabs, note, 48 + intensity * 42, tick, STEP_TICKS * (config.style === 'rave' ? 1.05 : 0.72), 8);
    });
  }
}

function addFxAndBuilds(
  midi: MidiFile,
  trackFx: MidiTrack,
  trackDrums: MidiTrack,
  startBar: number,
  section: Section,
  config: JumpUpConfig
) {
  const hype = clamp01(config.hype * 0.68 + section.hype * 0.38);
  const startTick = barTick(startBar);
  const endTick = barTick(startBar + section.bars);

  if (!section.drop && section.hype > 0.55) {
    const note = rootMidi(config.scaleRoot, 5) + 12;
    addNote(midi, trackFx, CHANNELS.fx, keepInRange(note, 72, 96), 34 + hype * 34, startTick, Math.max(BAR_TICKS, barTick(section.bars) - STEP_TICKS), 12);
    midi.addControlChange(trackFx, CHANNELS.fx, 74, 28, startTick);
    midi.addControlChange(trackFx, CHANNELS.fx, 74, 112, Math.max(startTick, endTick - BAR_TICKS));

    for (let bar = 1; bar <= Math.min(section.bars, 4); bar++) {
      const rollStart = endTick - barTick(bar);
      for (let step = 0; step < 16; step += Math.max(1, 4 - bar)) {
        if (chance(0.28 + hype * 0.45)) {
          addDrum(midi, trackDrums, DRUM_MAPPING.SNARE, 34 + hype * 32 + bar * 4, rollStart + stepTick(step), STEP_TICKS * 0.3);
        }
      }
    }
  }

  if (section.drop && chance(0.16 + hype * 0.36)) {
    addNote(midi, trackFx, CHANNELS.fx, keepInRange(rootMidi(config.scaleRoot, 5), 72, 94), 34 + hype * 28, startTick, TICKS_PER_BEAT * 1.25, 6);
  }
}

export async function generateJumpUp(
  config: JumpUpConfig,
  onProgress: (status: GenerationStatus) => void
): Promise<Uint8Array> {
  const normalizedConfig: JumpUpConfig = {
    ...config,
    drumSnap: clamp01(config.drumSnap),
    wobble: clamp01(config.wobble),
    riffEnergy: clamp01(config.riffEnergy),
    hype: clamp01(config.hype)
  };
  const midi = new MidiFile(TICKS_PER_BEAT);

  const trackTempo = midi.addTrack('Conductor');
  const trackDrums = midi.addTrack('Snappy Jump Up Drums');
  const trackSub = midi.addTrack('Sub Punch');
  const trackMain = midi.addTrack('Wobble Bass Main');
  const trackResponse = midi.addTrack('Bass Answer');
  const trackStabs = midi.addTrack('Hooks and Rave Stabs');
  const trackFx = midi.addTrack('FX and Hype');

  midi.addTempo(trackTempo, normalizedConfig.bpm, 0);
  configureTrack(midi, trackStabs, CHANNELS.stabs, normalizedConfig.style === 'rave' ? GM_PROGRAMS.squareLead : GM_PROGRAMS.brassStab, 82, 68, 44, 18);
  configureTrack(midi, trackSub, CHANNELS.sub, GM_PROGRAMS.subBass, 108, 64, 6, 4);
  configureTrack(midi, trackMain, CHANNELS.bassMain, GM_PROGRAMS.wobbleBass, 104, 54, 8, 10);
  configureTrack(midi, trackResponse, CHANNELS.bassResponse, GM_PROGRAMS.wobbleBass, 98, 74, 10, 14);
  configureTrack(midi, trackFx, CHANNELS.fx, GM_PROGRAMS.fx, 74, 64, 76, 34);
  setPitchBendRange(midi, trackMain, CHANNELS.bassMain, 2);
  setPitchBendRange(midi, trackResponse, CHANNELS.bassResponse, 2);

  const totalBars = Math.max(1, Math.ceil((normalizedConfig.lengthMinutes * normalizedConfig.bpm) / 4));
  const arrangement = createArrangement(totalBars);

  let currentBar = 0;
  let phraseIndex = 0;

  for (let sectionIndex = 0; sectionIndex < arrangement.length; sectionIndex++) {
    const section = arrangement[sectionIndex];
    const sectionEnd = currentBar + section.bars;

    onProgress({
      isGenerating: true,
      progress: Math.round((sectionIndex / arrangement.length) * 100),
      message: `Arranging ${section.name} (${sectionIndex + 1}/${arrangement.length})`
    });

    await yieldToUi();

    addFxAndBuilds(midi, trackFx, trackDrums, currentBar, section, normalizedConfig);

    for (let bar = currentBar; bar < sectionEnd; bar += 2) {
      const bars = Math.min(2, sectionEnd - bar);
      addJumpUpDrums(midi, trackDrums, bar, bars, section, normalizedConfig, phraseIndex);
      addBassPhrase(midi, trackMain, trackResponse, trackSub, bar, section, normalizedConfig, phraseIndex);
      addStabs(midi, trackStabs, bar, bars, section, normalizedConfig, phraseIndex);
      phraseIndex++;
    }

    currentBar += section.bars;
  }

  onProgress({ isGenerating: false, progress: 100, message: 'Finalizing jump up MIDI...' });
  return midi.generate();
}
