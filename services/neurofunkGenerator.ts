import { MidiFile } from '../utils/midiEncoder';
import { DRUM_MAPPING, ROOT_NOTES } from '../utils/musicTheory';
import { GenerationStatus, MidiTrack, NeurofunkConfig } from '../types';
import { random } from '../utils/random';
import { yieldToUi } from '../utils/schedule';

const TICKS_PER_BEAT = 480;
const BAR_TICKS = TICKS_PER_BEAT * 4;
const STEP_TICKS = TICKS_PER_BEAT / 4;

const CHANNELS = {
  stabs: 0,
  sub: 1,
  neuroA: 4,
  neuroB: 5,
  fx: 6,
  drums: 9
};

const GM_PROGRAMS = {
  subBass: 38,
  distortedLead: 81,
  brassStab: 62,
  fx: 99
};

type Section = {
  name: string;
  bars: number;
  drums: number;
  bass: number;
  tension: number;
  drop?: boolean;
  stripBassEvery?: number;
};

type BendShape = 'none' | 'scoop' | 'fall' | 'snap' | 'talk';

type BassStep = {
  step: number;
  duration: number;
  semitone: number;
  lane: 'a' | 'b';
  velocity: number;
  bend: BendShape;
  vowel: number;
};

type DrumTemplate = {
  kicks: number[];
  hats: number[];
  ghosts: number[];
  opens: number[];
};

const SEMITONES: Record<NeurofunkConfig['style'], number[]> = {
  rolling: [0, 0, -1, 3, 6, 7, 10],
  techstep: [0, -1, 1, 3, 6, 10],
  dark: [0, -1, 1, 6, 7, 10],
  minimal: [0, -1, 3, 6, 10]
};

const BASS_RIFFS: Record<NeurofunkConfig['style'], BassStep[][]> = {
  rolling: [
    [
      { step: 0, duration: 5, semitone: 0, lane: 'a', velocity: 112, bend: 'scoop', vowel: 34 },
      { step: 6, duration: 2, semitone: -1, lane: 'b', velocity: 86, bend: 'snap', vowel: 78 },
      { step: 10, duration: 4, semitone: 0, lane: 'a', velocity: 108, bend: 'talk', vowel: 58 },
      { step: 15, duration: 1, semitone: 6, lane: 'b', velocity: 72, bend: 'fall', vowel: 96 },
      { step: 16, duration: 4, semitone: 0, lane: 'b', velocity: 108, bend: 'scoop', vowel: 42 },
      { step: 22, duration: 2, semitone: 3, lane: 'a', velocity: 82, bend: 'snap', vowel: 88 },
      { step: 26, duration: 5, semitone: 0, lane: 'b', velocity: 112, bend: 'talk', vowel: 62 }
    ],
    [
      { step: 0, duration: 4, semitone: 0, lane: 'a', velocity: 112, bend: 'scoop', vowel: 40 },
      { step: 5, duration: 1, semitone: 10, lane: 'b', velocity: 76, bend: 'fall', vowel: 92 },
      { step: 7, duration: 2, semitone: -1, lane: 'a', velocity: 84, bend: 'snap', vowel: 70 },
      { step: 10, duration: 4, semitone: 0, lane: 'b', velocity: 110, bend: 'talk', vowel: 54 },
      { step: 16, duration: 5, semitone: 0, lane: 'a', velocity: 110, bend: 'scoop', vowel: 36 },
      { step: 23, duration: 1, semitone: 6, lane: 'b', velocity: 78, bend: 'fall', vowel: 102 },
      { step: 26, duration: 4, semitone: 0, lane: 'b', velocity: 108, bend: 'talk', vowel: 64 }
    ]
  ],
  techstep: [
    [
      { step: 0, duration: 4, semitone: 0, lane: 'a', velocity: 114, bend: 'scoop', vowel: 32 },
      { step: 4, duration: 1, semitone: 1, lane: 'b', velocity: 78, bend: 'snap', vowel: 96 },
      { step: 7, duration: 2, semitone: -1, lane: 'a', velocity: 90, bend: 'fall', vowel: 82 },
      { step: 10, duration: 3, semitone: 0, lane: 'b', velocity: 112, bend: 'talk', vowel: 58 },
      { step: 14, duration: 1, semitone: 6, lane: 'a', velocity: 78, bend: 'snap', vowel: 108 },
      { step: 16, duration: 4, semitone: 0, lane: 'b', velocity: 112, bend: 'scoop', vowel: 36 },
      { step: 21, duration: 1, semitone: -1, lane: 'a', velocity: 84, bend: 'fall', vowel: 74 },
      { step: 24, duration: 2, semitone: 3, lane: 'b', velocity: 90, bend: 'snap', vowel: 96 },
      { step: 27, duration: 4, semitone: 0, lane: 'a', velocity: 112, bend: 'talk', vowel: 62 }
    ],
    [
      { step: 0, duration: 3, semitone: 0, lane: 'a', velocity: 114, bend: 'scoop', vowel: 36 },
      { step: 3, duration: 1, semitone: 6, lane: 'b', velocity: 78, bend: 'fall', vowel: 106 },
      { step: 6, duration: 2, semitone: -1, lane: 'a', velocity: 88, bend: 'snap', vowel: 78 },
      { step: 10, duration: 4, semitone: 0, lane: 'b', velocity: 112, bend: 'talk', vowel: 56 },
      { step: 16, duration: 3, semitone: 0, lane: 'a', velocity: 110, bend: 'scoop', vowel: 40 },
      { step: 22, duration: 2, semitone: 1, lane: 'b', velocity: 86, bend: 'fall', vowel: 98 },
      { step: 26, duration: 4, semitone: 0, lane: 'a', velocity: 112, bend: 'talk', vowel: 60 }
    ]
  ],
  dark: [
    [
      { step: 0, duration: 6, semitone: 0, lane: 'a', velocity: 114, bend: 'scoop', vowel: 28 },
      { step: 8, duration: 2, semitone: -1, lane: 'b', velocity: 88, bend: 'fall', vowel: 82 },
      { step: 10, duration: 4, semitone: 0, lane: 'a', velocity: 112, bend: 'talk', vowel: 48 },
      { step: 16, duration: 5, semitone: 0, lane: 'b', velocity: 110, bend: 'scoop', vowel: 34 },
      { step: 23, duration: 1, semitone: 6, lane: 'a', velocity: 76, bend: 'snap', vowel: 106 },
      { step: 27, duration: 4, semitone: -1, lane: 'b', velocity: 106, bend: 'fall', vowel: 70 }
    ],
    [
      { step: 0, duration: 5, semitone: 0, lane: 'a', velocity: 114, bend: 'scoop', vowel: 30 },
      { step: 7, duration: 2, semitone: 1, lane: 'b', velocity: 86, bend: 'snap', vowel: 96 },
      { step: 10, duration: 4, semitone: 0, lane: 'a', velocity: 112, bend: 'talk', vowel: 52 },
      { step: 16, duration: 5, semitone: 0, lane: 'b', velocity: 110, bend: 'scoop', vowel: 36 },
      { step: 24, duration: 2, semitone: 6, lane: 'a', velocity: 86, bend: 'fall', vowel: 104 },
      { step: 27, duration: 4, semitone: 0, lane: 'b', velocity: 112, bend: 'talk', vowel: 56 }
    ]
  ],
  minimal: [
    [
      { step: 0, duration: 6, semitone: 0, lane: 'a', velocity: 112, bend: 'scoop', vowel: 30 },
      { step: 8, duration: 2, semitone: 6, lane: 'b', velocity: 84, bend: 'fall', vowel: 104 },
      { step: 10, duration: 4, semitone: 0, lane: 'a', velocity: 108, bend: 'talk', vowel: 58 },
      { step: 16, duration: 5, semitone: 0, lane: 'b', velocity: 108, bend: 'scoop', vowel: 36 },
      { step: 24, duration: 2, semitone: 3, lane: 'a', velocity: 84, bend: 'snap', vowel: 88 },
      { step: 27, duration: 5, semitone: 0, lane: 'b', velocity: 110, bend: 'talk', vowel: 62 }
    ],
    [
      { step: 0, duration: 5, semitone: 0, lane: 'a', velocity: 112, bend: 'scoop', vowel: 34 },
      { step: 6, duration: 2, semitone: -1, lane: 'b', velocity: 84, bend: 'fall', vowel: 86 },
      { step: 10, duration: 4, semitone: 0, lane: 'a', velocity: 108, bend: 'talk', vowel: 56 },
      { step: 16, duration: 6, semitone: 0, lane: 'b', velocity: 110, bend: 'scoop', vowel: 38 },
      { step: 26, duration: 5, semitone: 0, lane: 'a', velocity: 110, bend: 'talk', vowel: 64 }
    ]
  ]
};

const DRUM_TEMPLATES: DrumTemplate[] = [
  { kicks: [0, 6, 10, 16, 22, 26], hats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], ghosts: [3, 7, 11, 15, 19, 23, 27, 31], opens: [14, 30] },
  { kicks: [0, 7, 10, 16, 21, 26], hats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], ghosts: [5, 9, 15, 19, 23, 29], opens: [6, 22, 30] },
  { kicks: [0, 5, 10, 16, 24, 27], hats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], ghosts: [3, 11, 15, 21, 27, 31], opens: [14, 22, 30] },
  { kicks: [0, 10, 14, 16, 23, 26], hats: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], ghosts: [7, 11, 19, 25, 29, 31], opens: [14, 30] }
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function chance(probability: number): boolean {
  return random() < clamp01(probability);
}

function pick<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

function randomBetween(min: number, max: number): number {
  return min + random() * (max - min);
}

function barTick(bar: number): number {
  return Math.round(bar * BAR_TICKS);
}

function stepToTick(startTick: number, step: number, humanize: number = 0): number {
  return Math.max(0, Math.round(startTick + step * STEP_TICKS + randomBetween(-humanize, humanize)));
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
  amount: number
) {
  midi.addPitchBend(track, channel, 0, startTick - 4);

  if (shape === 'none') {
    midi.addPitchBend(track, channel, 0, startTick + durationTicks);
    return;
  }

  if (shape === 'scoop') {
    midi.addPitchBend(track, channel, -amount, startTick);
    midi.addPitchBend(track, channel, -amount * 0.45, startTick + durationTicks * 0.22);
    midi.addPitchBend(track, channel, 0, startTick + durationTicks * 0.48);
  }

  if (shape === 'fall') {
    midi.addPitchBend(track, channel, 0, startTick);
    midi.addPitchBend(track, channel, -amount * 0.6, startTick + durationTicks * 0.45);
    midi.addPitchBend(track, channel, -amount, startTick + durationTicks * 0.82);
  }

  if (shape === 'snap') {
    midi.addPitchBend(track, channel, amount * 0.45, startTick);
    midi.addPitchBend(track, channel, -amount * 0.35, startTick + durationTicks * 0.28);
    midi.addPitchBend(track, channel, 0, startTick + durationTicks * 0.55);
  }

  if (shape === 'talk') {
    midi.addPitchBend(track, channel, -amount * 0.35, startTick);
    midi.addPitchBend(track, channel, amount * 0.28, startTick + durationTicks * 0.28);
    midi.addPitchBend(track, channel, -amount * 0.22, startTick + durationTicks * 0.56);
    midi.addPitchBend(track, channel, 0, startTick + durationTicks * 0.84);
  }

  midi.addPitchBend(track, channel, 0, startTick + durationTicks + 2);
}

function addBassCcGesture(
  midi: MidiFile,
  track: MidiTrack,
  channel: number,
  startTick: number,
  durationTicks: number,
  vowel: number,
  config: NeurofunkConfig,
  phraseIndex: number
) {
  const cutoffBase = 24 + config.bassMotion * 38;
  const cutoffTop = clamp(vowel + config.tension * 18, 0, 127);
  const resonance = 46 + config.tension * 42;
  const modDepth = 40 + config.technicality * 62;

  midi.addControlChange(track, channel, 74, cutoffBase, startTick - 3);
  midi.addControlChange(track, channel, 71, resonance, startTick - 3);
  midi.addControlChange(track, channel, 1, phraseIndex % 2 === 0 ? modDepth : modDepth * 0.7, startTick - 3);
  midi.addControlChange(track, channel, 74, cutoffTop, startTick + durationTicks * 0.34);
  midi.addControlChange(track, channel, 1, modDepth * 0.45, startTick + durationTicks * 0.64);
  midi.addControlChange(track, channel, 74, cutoffBase + 8, startTick + durationTicks);
}

function createArrangement(totalBars: number): Section[] {
  if (totalBars <= 64) {
    const introBars = Math.min(totalBars, Math.max(4, Math.floor(totalBars * 0.14)));
    const buildBars = Math.min(totalBars - introBars, Math.max(4, Math.floor(totalBars * 0.16)));
    const outroBars = totalBars - introBars - buildBars > 20 ? 4 : 0;
    const dropBars = totalBars - introBars - buildBars - outroBars;

    return [
      { name: 'cold open', bars: introBars, drums: 0.15, bass: 0.08, tension: 0.9 },
      { name: 'pre-drop pressure', bars: buildBars, drums: 0.48, bass: 0.38, tension: 1 },
      { name: 'neuro drop', bars: dropBars, drums: 1, bass: 1, tension: 0.78, drop: true, stripBassEvery: 16 },
      { name: 'hard stop outro', bars: outroBars, drums: 0.24, bass: 0.12, tension: 0.5 }
    ].filter(section => section.bars > 0);
  }

  const cycle: Section[] = [
    { name: 'cold open', bars: 16, drums: 0.14, bass: 0.08, tension: 0.88 },
    { name: 'pre-drop pressure', bars: 16, drums: 0.5, bass: 0.34, tension: 1 },
    { name: 'neuro drop A', bars: 64, drums: 1, bass: 1, tension: 0.75, drop: true, stripBassEvery: 16 },
    { name: 'mid tune strip', bars: 16, drums: 0.34, bass: 0.22, tension: 0.92 },
    { name: 'neuro drop B', bars: 64, drums: 1, bass: 1, tension: 0.82, drop: true, stripBassEvery: 8 },
    { name: 'hard stop outro', bars: 16, drums: 0.28, bass: 0.12, tension: 0.5 }
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

function shouldStripPhrase(section: Section, localBar: number, config: NeurofunkConfig): boolean {
  if (!section.drop || !section.stripBassEvery) return false;
  const isSwitchPoint = localBar > 0 && localBar % section.stripBassEvery === section.stripBassEvery - 2;
  return isSwitchPoint && chance(0.35 + config.technicality * 0.32);
}

function transposeForPhrase(config: NeurofunkConfig, phraseIndex: number): number {
  const palette = SEMITONES[config.style];
  if (phraseIndex % 8 === 7) return pick(palette.filter(note => note !== 0));
  if (phraseIndex % 16 === 12) return pick([-1, 1, 3, 6]);
  return 0;
}

function addNeuroDrums(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  config: NeurofunkConfig,
  phraseIndex: number
) {
  const template = DRUM_TEMPLATES[phraseIndex % DRUM_TEMPLATES.length];
  const pressure = clamp01(config.drumPressure * 0.75 + section.drums * 0.3);
  const tech = clamp01(config.technicality);
  const startTick = barTick(startBar);
  const totalSteps = bars * 16;

  if (section.drop && startBar % 16 === 0) {
    addDrum(midi, track, DRUM_MAPPING.CRASH, 86 + pressure * 20, startTick, TICKS_PER_BEAT * 1.5);
    addDrum(midi, track, DRUM_MAPPING.KICK, 116, startTick, STEP_TICKS);
  }

  for (let step = 0; step < totalSteps; step++) {
    const localStep = step % 32;
    const tick = stepToTick(startTick, step, 2 + tech * 2);
    const isStrongBeat = step % 8 === 0;

    if (template.kicks.includes(localStep)) {
      addDrum(midi, track, DRUM_MAPPING.KICK, 90 + pressure * (isStrongBeat ? 34 : 24), tick, STEP_TICKS * 0.82);
    }

    if ([4, 12, 20, 28].includes(localStep)) {
      addDrum(midi, track, DRUM_MAPPING.SNARE, 110 + pressure * 16, tick, STEP_TICKS);
      addDrum(midi, track, DRUM_MAPPING.ELECTRIC_SNARE, 62 + pressure * 22, tick + 3, STEP_TICKS * 0.84);
    } else if (template.ghosts.includes(localStep) && chance(0.08 + pressure * 0.15 + tech * 0.08)) {
      addDrum(midi, track, DRUM_MAPPING.SNARE, 18 + pressure * 22, tick, STEP_TICKS * 0.34);
    }

    if (section.drums > 0.24 && template.hats.includes(localStep)) {
      const accent = step % 4 === 0 ? 12 : 0;
      addDrum(midi, track, DRUM_MAPPING.CLOSED_HH, 40 + pressure * 24 + accent, tick, STEP_TICKS * 0.38);
    }

    if (section.drop && template.opens.includes(localStep) && chance(0.2 + pressure * 0.22 + tech * 0.1)) {
      addDrum(midi, track, DRUM_MAPPING.OPEN_HH, 44 + pressure * 24, tick, STEP_TICKS * 0.9);
    }

    if (section.drop && step % 8 === 0 && pressure > 0.84 && chance(0.08 + tech * 0.14)) {
      addDrum(midi, track, DRUM_MAPPING.RIDE, 22 + pressure * 18, tick, STEP_TICKS);
    }
  }

  const phraseEnd = (startBar + bars) % 16 === 0;
  if (phraseEnd && chance(0.22 + tech * 0.28)) {
    const fillStart = barTick(startBar + bars - 1);
    const fill = tech > 0.72 ? [10, 11, 14, 15] : [11, 15];

    fill.forEach((step, index) => {
      addDrum(
        midi,
        track,
        index % 2 === 0 ? DRUM_MAPPING.SNARE : DRUM_MAPPING.ELECTRIC_SNARE,
        46 + pressure * 22 + index * 8,
        stepToTick(fillStart, step, 2),
        STEP_TICKS * 0.34
      );
    });
  }
}

function addSparseIntroDrums(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  config: NeurofunkConfig
) {
  const pressure = clamp01(section.drums * config.drumPressure);

  for (let bar = 0; bar < bars; bar++) {
    const startTick = barTick(startBar + bar);
    for (let step = 0; step < 16; step += 2) {
      if (chance(0.34 + pressure * 0.42)) {
        addDrum(midi, track, DRUM_MAPPING.CLOSED_HH, 26 + pressure * 30, stepToTick(startTick, step, 3), STEP_TICKS * 0.34);
      }
    }

    if (bar % 4 === 3 && chance(0.28 + pressure * 0.6)) {
      addDrum(midi, track, DRUM_MAPPING.SNARE, 42 + pressure * 28, stepToTick(startTick, 15, 3), STEP_TICKS * 0.32);
    }
  }
}

function addBassRiff(
  midi: MidiFile,
  trackSub: MidiTrack,
  trackA: MidiTrack,
  trackB: MidiTrack,
  startBar: number,
  root: number,
  transpose: number,
  section: Section,
  config: NeurofunkConfig,
  phraseIndex: number
) {
  const motif = BASS_RIFFS[config.style][phraseIndex % BASS_RIFFS[config.style].length];
  const startTick = barTick(startBar);
  const bassMotion = clamp01(config.bassMotion * 0.7 + section.bass * 0.35);
  const bendAmount = 1100 + config.bassMotion * 3600 + config.technicality * 1800;
  const subRoot = keepInRange(root, 24, 38);

  motif.forEach(hit => {
    if (hit.semitone !== 0 && !chance(0.52 + bassMotion * 0.38)) return;

    const laneTrack = hit.lane === 'a' ? trackA : trackB;
    const channel = hit.lane === 'a' ? CHANNELS.neuroA : CHANNELS.neuroB;
    const note = keepInRange(root + 12 + transpose + hit.semitone, 36, 58);
    const hitTick = stepToTick(startTick, hit.step, 3);
    const duration = Math.max(STEP_TICKS * 0.7, hit.duration * STEP_TICKS);
    const velocity = hit.velocity * section.bass;

    addBassCcGesture(midi, laneTrack, channel, hitTick, duration, hit.vowel, config, phraseIndex);
    addBendGesture(midi, laneTrack, channel, hitTick, duration, hit.bend, bendAmount);
    addNote(midi, laneTrack, channel, note, velocity, hitTick, duration, 3);

    if (hit.semitone === 0 || hit.step % 8 === 0) {
      addNote(midi, trackSub, CHANNELS.sub, subRoot + transpose, 88 + section.bass * 28, hitTick, Math.max(duration, STEP_TICKS * 2), 2);
    }

    if (config.technicality > 0.68 && hit.duration >= 4 && chance(0.18 + config.technicality * 0.2)) {
      const jabTick = hitTick + STEP_TICKS * pick([1, 2]);
      addBassCcGesture(midi, laneTrack, channel, jabTick, STEP_TICKS * 0.5, 100, config, phraseIndex + 1);
      addBendGesture(midi, laneTrack, channel, jabTick, STEP_TICKS * 0.5, 'snap', bendAmount * 0.6);
      addNote(midi, laneTrack, channel, note + 12, velocity * 0.5, jabTick, STEP_TICKS * 0.48, 2);
    }
  });
}

function addPressureBass(
  midi: MidiFile,
  trackSub: MidiTrack,
  trackA: MidiTrack,
  root: number,
  startBar: number,
  bars: number,
  section: Section,
  config: NeurofunkConfig
) {
  for (let bar = 0; bar < bars; bar += 4) {
    const tick = barTick(startBar + bar);
    const note = keepInRange(root + 12, 36, 50);
    addBassCcGesture(midi, trackA, CHANNELS.neuroA, tick, BAR_TICKS * 2, 42 + config.tension * 36, config, bar);
    addBendGesture(midi, trackA, CHANNELS.neuroA, tick, BAR_TICKS * 2, 'talk', 1200 + config.tension * 2400);
    addNote(midi, trackA, CHANNELS.neuroA, note, 42 + section.bass * 42, tick, BAR_TICKS * 2, 8);
    addNote(midi, trackSub, CHANNELS.sub, keepInRange(root, 24, 38), 48 + section.bass * 42, tick, BAR_TICKS * 2, 8);
  }
}

function addStabsAndCuts(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  root: number,
  section: Section,
  config: NeurofunkConfig
) {
  const stabNotes = [
    keepInRange(root + 24, 48, 72),
    keepInRange(root + 24 + pick([1, 3, 6, 10]), 48, 76)
  ];

  for (let bar = 0; bar < bars; bar += 4) {
    if (!chance(section.drop ? 0.2 + config.tension * 0.24 : 0.14 + section.tension * 0.25)) continue;

    const startTick = barTick(startBar + bar);
    const steps = section.drop ? [0, pick([7, 8, 10])] : [0];

    steps.forEach(step => {
      stabNotes.forEach((note, index) => {
        addNote(
          midi,
          track,
          CHANNELS.stabs,
          note,
          46 + section.tension * 32 - index * 8,
          startTick + step * STEP_TICKS + index * 6,
          STEP_TICKS * (section.drop ? 0.8 : 2.5),
          3
        );
      });
    });
  }
}

function addFx(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  root: number,
  section: Section,
  config: NeurofunkConfig,
  nextSection?: Section
) {
  const tension = clamp01(config.tension * 0.72 + section.tension * 0.36);

  for (let bar = 0; bar < bars; bar += 8) {
    if (!chance(0.12 + tension * 0.28)) continue;

    const tick = barTick(startBar + bar);
    const note = keepInRange(root + 36 + pick([0, 1, 6, 10]), 72, 101);
    addNote(midi, track, CHANNELS.fx, note, 24 + tension * 34, tick + STEP_TICKS * pick([0, 6, 10]), STEP_TICKS * 2.5, 12);
  }

  if (nextSection?.drop && bars >= 2) {
    const tick = barTick(startBar + bars - 2);
    for (let step = 0; step < 32; step += 2) {
      const note = keepInRange(root + 36 + Math.floor(step / 4), 72, 104);
      addNote(midi, track, CHANNELS.fx, note, 24 + step * 1.6 + tension * 20, tick + step * STEP_TICKS, STEP_TICKS * 0.5, 3);
    }
  }
}

export async function generateNeurofunk(
  config: NeurofunkConfig,
  onProgress: (status: GenerationStatus) => void
): Promise<Uint8Array> {
  const normalizedConfig: NeurofunkConfig = {
    ...config,
    drumPressure: clamp01(config.drumPressure),
    bassMotion: clamp01(config.bassMotion),
    technicality: clamp01(config.technicality),
    tension: clamp01(config.tension)
  };
  const midi = new MidiFile(TICKS_PER_BEAT);

  const trackTempo = midi.addTrack('Conductor');
  const trackDrums = midi.addTrack('Neuro Drums');
  const trackSub = midi.addTrack('Clean Sub');
  const trackNeuroA = midi.addTrack('Neuro Bass Main');
  const trackNeuroB = midi.addTrack('Neuro Bass Response');
  const trackStabs = midi.addTrack('Stabs and Cuts');
  const trackFx = midi.addTrack('Risers and FX');

  midi.addTempo(trackTempo, normalizedConfig.bpm, 0);
  configureTrack(midi, trackStabs, CHANNELS.stabs, GM_PROGRAMS.brassStab, 78, 54, 36, 18);
  configureTrack(midi, trackSub, CHANNELS.sub, GM_PROGRAMS.subBass, 112, 64, 4, 4);
  configureTrack(midi, trackNeuroA, CHANNELS.neuroA, GM_PROGRAMS.distortedLead, 104, 48, 16, 38);
  configureTrack(midi, trackNeuroB, CHANNELS.neuroB, GM_PROGRAMS.distortedLead, 98, 78, 18, 46);
  configureTrack(midi, trackFx, CHANNELS.fx, GM_PROGRAMS.fx, 70, 88, 96, 70);
  setPitchBendRange(midi, trackNeuroA, CHANNELS.neuroA, 12);
  setPitchBendRange(midi, trackNeuroB, CHANNELS.neuroB, 12);

  const totalBars = Math.max(1, Math.ceil((normalizedConfig.lengthMinutes * normalizedConfig.bpm) / 4));
  const arrangement = createArrangement(totalBars);
  const root = rootMidi(normalizedConfig.scaleRoot, 2);

  let currentBar = 0;
  let phraseIndex = 0;

  for (let sectionIndex = 0; sectionIndex < arrangement.length; sectionIndex++) {
    const section = arrangement[sectionIndex];
    const sectionEnd = currentBar + section.bars;

    onProgress({
      isGenerating: true,
      progress: Math.round((sectionIndex / arrangement.length) * 100),
      message: `Writing ${section.name} (${sectionIndex + 1}/${arrangement.length})`
    });

    await yieldToUi();

    if (section.drums >= 0.55) {
      for (let bar = currentBar; bar < sectionEnd; bar += 2) {
        addNeuroDrums(midi, trackDrums, bar, Math.min(2, sectionEnd - bar), section, normalizedConfig, phraseIndex);
      }
    } else {
      addSparseIntroDrums(midi, trackDrums, currentBar, section.bars, section, normalizedConfig);
    }

    for (let bar = currentBar; bar < sectionEnd; bar += 2) {
      const localBar = bar - currentBar;
      const transpose = transposeForPhrase(normalizedConfig, phraseIndex);

      if (section.drop && !shouldStripPhrase(section, localBar, normalizedConfig)) {
        addBassRiff(midi, trackSub, trackNeuroA, trackNeuroB, bar, root, transpose, section, normalizedConfig, phraseIndex);
      } else if (section.bass > 0.22 && bar % 4 === 0) {
        addPressureBass(midi, trackSub, trackNeuroA, root + transpose, bar, 2, section, normalizedConfig);
      }

      phraseIndex++;
    }

    addStabsAndCuts(midi, trackStabs, currentBar, section.bars, root, section, normalizedConfig);
    addFx(midi, trackFx, currentBar, section.bars, root, section, normalizedConfig, arrangement[sectionIndex + 1]);

    currentBar += section.bars;
  }

  onProgress({ isGenerating: false, progress: 100, message: 'Finalizing neurofunk MIDI...' });
  return midi.generate();
}
