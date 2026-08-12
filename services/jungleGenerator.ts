import { MidiFile } from '../utils/midiEncoder';
import { DRUM_MAPPING, getChord, getScaleNotes } from '../utils/musicTheory';
import { GenerationStatus, JungleConfig, MidiTrack } from '../types';
import { random } from '../utils/random';
import { yieldToUi } from '../utils/schedule';

const TICKS_PER_BEAT = 480;
const BAR_TICKS = TICKS_PER_BEAT * 4;
const STEP_TICKS = TICKS_PER_BEAT / 4;

const CHANNELS = {
  pads: 0,
  sub: 1,
  stabs: 2,
  fx: 3,
  drums: 9
};

const GM_PROGRAMS = {
  warmPad: 89,
  darkPad: 91,
  subBass: 38,
  piano: 1,
  voice: 53,
  fx: 99
};

type JungleSection = {
  name: string;
  bars: number;
  drums: number;
  bass: number;
  pads: number;
  stabs: number;
  drop?: boolean;
  stripEvery?: number;
};

type BreakHit = {
  step: number;
  drum: number;
  velocity: number;
  duration?: number;
  probability?: number;
};

type BassHit = {
  beat: number;
  duration: number;
  degree: number;
  velocity: number;
};

const PROGRESSIONS: Record<JungleConfig['style'], number[][]> = {
  classic: [
    [0, 5, 3, 6],
    [0, 6, 5, 3],
    [0, 0, 5, 6]
  ],
  ragga: [
    [0, 3, 5, 0],
    [0, 6, 3, 5],
    [0, 5, 6, 3]
  ],
  darkside: [
    [0, 1, 0, 6],
    [0, 6, 1, 0],
    [0, 1, 5, 1]
  ],
  atmospheric: [
    [0, 5, 3, 6],
    [3, 5, 0, 6],
    [0, 2, 5, 6]
  ]
};

const BASS_PATTERNS: Record<JungleConfig['style'], BassHit[][]> = {
  classic: [
    [
      { beat: 0, duration: 1.5, degree: 0, velocity: 104 },
      { beat: 2.5, duration: 0.75, degree: 0, velocity: 96 },
      { beat: 3.25, duration: 0.5, degree: 4, velocity: 78 }
    ],
    [
      { beat: 0, duration: 1, degree: 0, velocity: 104 },
      { beat: 1.75, duration: 0.5, degree: 5, velocity: 80 },
      { beat: 2.5, duration: 1, degree: 0, velocity: 98 }
    ]
  ],
  ragga: [
    [
      { beat: 0, duration: 1, degree: 0, velocity: 106 },
      { beat: 1.5, duration: 0.5, degree: 4, velocity: 80 },
      { beat: 2.25, duration: 1.25, degree: 0, velocity: 102 },
      { beat: 3.5, duration: 0.35, degree: 6, velocity: 76 }
    ],
    [
      { beat: 0, duration: 1.5, degree: 0, velocity: 106 },
      { beat: 2, duration: 0.5, degree: 3, velocity: 84 },
      { beat: 2.75, duration: 0.75, degree: 0, velocity: 98 }
    ]
  ],
  darkside: [
    [
      { beat: 0, duration: 2, degree: 0, velocity: 108 },
      { beat: 2.75, duration: 0.75, degree: 1, velocity: 88 },
      { beat: 3.5, duration: 0.35, degree: -1, velocity: 72 }
    ],
    [
      { beat: 0, duration: 1.5, degree: 0, velocity: 108 },
      { beat: 2.5, duration: 1, degree: 0, velocity: 98 }
    ]
  ],
  atmospheric: [
    [
      { beat: 0, duration: 2.5, degree: 0, velocity: 96 },
      { beat: 3.25, duration: 0.5, degree: 4, velocity: 72 }
    ],
    [
      { beat: 0, duration: 1.5, degree: 0, velocity: 96 },
      { beat: 2.5, duration: 1, degree: 0, velocity: 90 }
    ]
  ]
};

const AMEN_BREAK: BreakHit[] = [
  { step: 0, drum: DRUM_MAPPING.KICK, velocity: 110 },
  { step: 2, drum: DRUM_MAPPING.CLOSED_HH, velocity: 58 },
  { step: 3, drum: DRUM_MAPPING.SNARE, velocity: 34, duration: 0.35, probability: 0.7 },
  { step: 4, drum: DRUM_MAPPING.SNARE, velocity: 112 },
  { step: 6, drum: DRUM_MAPPING.KICK, velocity: 82 },
  { step: 7, drum: DRUM_MAPPING.SNARE, velocity: 42, duration: 0.35 },
  { step: 8, drum: DRUM_MAPPING.CLOSED_HH, velocity: 60 },
  { step: 10, drum: DRUM_MAPPING.KICK, velocity: 96 },
  { step: 11, drum: DRUM_MAPPING.SNARE, velocity: 36, duration: 0.35 },
  { step: 12, drum: DRUM_MAPPING.SNARE, velocity: 110 },
  { step: 14, drum: DRUM_MAPPING.OPEN_HH, velocity: 66, duration: 1.1 },
  { step: 15, drum: DRUM_MAPPING.SNARE, velocity: 48, duration: 0.3 },
  { step: 16, drum: DRUM_MAPPING.KICK, velocity: 106 },
  { step: 18, drum: DRUM_MAPPING.CLOSED_HH, velocity: 54 },
  { step: 19, drum: DRUM_MAPPING.SNARE, velocity: 38, duration: 0.35 },
  { step: 20, drum: DRUM_MAPPING.SNARE, velocity: 112 },
  { step: 22, drum: DRUM_MAPPING.KICK, velocity: 86 },
  { step: 23, drum: DRUM_MAPPING.SNARE, velocity: 40, duration: 0.35 },
  { step: 24, drum: DRUM_MAPPING.KICK, velocity: 88, probability: 0.72 },
  { step: 26, drum: DRUM_MAPPING.CLOSED_HH, velocity: 56 },
  { step: 27, drum: DRUM_MAPPING.SNARE, velocity: 38, duration: 0.35 },
  { step: 28, drum: DRUM_MAPPING.SNARE, velocity: 110 },
  { step: 30, drum: DRUM_MAPPING.MID_TOM, velocity: 62, duration: 0.45, probability: 0.6 },
  { step: 31, drum: DRUM_MAPPING.SNARE, velocity: 52, duration: 0.3 }
];

const THINK_BREAK: BreakHit[] = [
  { step: 0, drum: DRUM_MAPPING.KICK, velocity: 104 },
  { step: 2, drum: DRUM_MAPPING.CLOSED_HH, velocity: 54 },
  { step: 4, drum: DRUM_MAPPING.SNARE, velocity: 106 },
  { step: 5, drum: DRUM_MAPPING.SNARE, velocity: 32, duration: 0.3 },
  { step: 7, drum: DRUM_MAPPING.KICK, velocity: 78 },
  { step: 8, drum: DRUM_MAPPING.CLOSED_HH, velocity: 58 },
  { step: 10, drum: DRUM_MAPPING.KICK, velocity: 92 },
  { step: 11, drum: DRUM_MAPPING.SNARE, velocity: 36, duration: 0.3 },
  { step: 12, drum: DRUM_MAPPING.SNARE, velocity: 108 },
  { step: 14, drum: DRUM_MAPPING.CLOSED_HH, velocity: 56 },
  { step: 15, drum: DRUM_MAPPING.SNARE, velocity: 40, duration: 0.3 },
  { step: 16, drum: DRUM_MAPPING.KICK, velocity: 100 },
  { step: 19, drum: DRUM_MAPPING.SNARE, velocity: 34, duration: 0.3 },
  { step: 20, drum: DRUM_MAPPING.SNARE, velocity: 106 },
  { step: 22, drum: DRUM_MAPPING.KICK, velocity: 82 },
  { step: 23, drum: DRUM_MAPPING.SNARE, velocity: 34, duration: 0.3 },
  { step: 25, drum: DRUM_MAPPING.KICK, velocity: 78, probability: 0.66 },
  { step: 27, drum: DRUM_MAPPING.SNARE, velocity: 38, duration: 0.3 },
  { step: 28, drum: DRUM_MAPPING.SNARE, velocity: 108 },
  { step: 30, drum: DRUM_MAPPING.OPEN_HH, velocity: 58, duration: 0.9 }
];

const APACHE_BREAK: BreakHit[] = [
  { step: 0, drum: DRUM_MAPPING.KICK, velocity: 108 },
  { step: 3, drum: DRUM_MAPPING.SNARE, velocity: 34, duration: 0.3 },
  { step: 4, drum: DRUM_MAPPING.SNARE, velocity: 108 },
  { step: 6, drum: DRUM_MAPPING.KICK, velocity: 84 },
  { step: 8, drum: DRUM_MAPPING.CLOSED_HH, velocity: 56 },
  { step: 10, drum: DRUM_MAPPING.KICK, velocity: 92 },
  { step: 12, drum: DRUM_MAPPING.SNARE, velocity: 108 },
  { step: 14, drum: DRUM_MAPPING.OPEN_HH, velocity: 62, duration: 1 },
  { step: 15, drum: DRUM_MAPPING.SNARE, velocity: 42, duration: 0.3 },
  { step: 16, drum: DRUM_MAPPING.KICK, velocity: 100 },
  { step: 18, drum: DRUM_MAPPING.LOW_TOM, velocity: 58, duration: 0.45, probability: 0.55 },
  { step: 20, drum: DRUM_MAPPING.SNARE, velocity: 110 },
  { step: 22, drum: DRUM_MAPPING.KICK, velocity: 88 },
  { step: 24, drum: DRUM_MAPPING.CLOSED_HH, velocity: 54 },
  { step: 27, drum: DRUM_MAPPING.SNARE, velocity: 38, duration: 0.3 },
  { step: 28, drum: DRUM_MAPPING.SNARE, velocity: 108 },
  { step: 30, drum: DRUM_MAPPING.MID_TOM, velocity: 58, duration: 0.45 },
  { step: 31, drum: DRUM_MAPPING.SNARE, velocity: 44, duration: 0.3 }
];

const BREAKS_BY_STYLE: Record<JungleConfig['style'], BreakHit[][]> = {
  classic: [AMEN_BREAK, THINK_BREAK, AMEN_BREAK],
  ragga: [AMEN_BREAK, APACHE_BREAK, THINK_BREAK],
  darkside: [AMEN_BREAK, AMEN_BREAK, APACHE_BREAK],
  atmospheric: [THINK_BREAK, AMEN_BREAK, APACHE_BREAK]
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

function pick<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

function randomBetween(min: number, max: number): number {
  return min + random() * (max - min);
}

function barTick(bar: number): number {
  return Math.round(bar * BAR_TICKS);
}

function beatTick(beat: number): number {
  return Math.round(beat * TICKS_PER_BEAT);
}

function degreeNote(scale: number[], degree: number): number {
  const scaleLength = scale.length;
  const wrapped = ((degree % scaleLength) + scaleLength) % scaleLength;
  const octave = Math.floor(degree / scaleLength);
  return scale[wrapped] + octave * 12;
}

function keepInRange(note: number, low: number, high: number): number {
  let result = note;
  while (result < low) result += 12;
  while (result > high) result -= 12;
  return result;
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
    clamp(velocity + randomBetween(-4, 4), 1, 127),
    Math.max(0, Math.round(startTick + randomBetween(-humanize, humanize))),
    Math.max(1, Math.round(durationTicks + randomBetween(-humanize, humanize)))
  );
}

function addDrum(
  midi: MidiFile,
  track: MidiTrack,
  drum: number,
  velocity: number,
  startTick: number,
  durationTicks: number
) {
  midi.addNote(track, CHANNELS.drums, drum, velocity, startTick, durationTicks);
}

function createArrangement(totalBars: number): JungleSection[] {
  if (totalBars <= 64) {
    const introBars = Math.min(totalBars, Math.max(4, Math.floor(totalBars * 0.18)));
    const buildBars = Math.min(totalBars - introBars, Math.max(4, Math.floor(totalBars * 0.16)));
    const outroBars = totalBars - introBars - buildBars > 16 ? 4 : 0;
    const dropBars = totalBars - introBars - buildBars - outroBars;

    return [
      { name: 'dub intro', bars: introBars, drums: 0.22, bass: 0.24, pads: 0.82, stabs: 0.2 },
      { name: 'break tease', bars: buildBars, drums: 0.58, bass: 0.48, pads: 0.7, stabs: 0.35 },
      { name: 'jungle drop', bars: dropBars, drums: 1, bass: 0.95, pads: 0.42, stabs: 0.62, drop: true, stripEvery: 16 },
      { name: 'dub outro', bars: outroBars, drums: 0.34, bass: 0.28, pads: 0.8, stabs: 0.2 }
    ].filter(section => section.bars > 0);
  }

  const cycle: JungleSection[] = [
    { name: 'dub intro', bars: 16, drums: 0.18, bass: 0.22, pads: 0.9, stabs: 0.15 },
    { name: 'break tease', bars: 16, drums: 0.56, bass: 0.46, pads: 0.7, stabs: 0.34 },
    { name: 'jungle drop A', bars: 64, drums: 1, bass: 0.98, pads: 0.42, stabs: 0.58, drop: true, stripEvery: 16 },
    { name: 'dub breakdown', bars: 16, drums: 0.28, bass: 0.28, pads: 0.82, stabs: 0.28 },
    { name: 'jungle drop B', bars: 64, drums: 1, bass: 1, pads: 0.46, stabs: 0.66, drop: true, stripEvery: 8 },
    { name: 'dub outro', bars: 16, drums: 0.34, bass: 0.3, pads: 0.86, stabs: 0.18 }
  ];

  const arrangement: JungleSection[] = [];
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

function progressionDegree(bar: number, progression: number[]): number {
  return progression[Math.floor(bar / 4) % progression.length];
}

function addChopEdit(
  midi: MidiFile,
  track: MidiTrack,
  startTick: number,
  step: number,
  config: JungleConfig,
  section: JungleSection
) {
  const editChance = section.drop ? 0.12 + config.chopComplexity * 0.32 : config.chopComplexity * 0.16;
  if (!chance(editChance)) return;

  const tick = startTick + step * STEP_TICKS;
  const rollDrum = chance(0.45) ? DRUM_MAPPING.SNARE : DRUM_MAPPING.CLOSED_HH;
  const repeats = config.chopComplexity > 0.72 ? 4 : 2;
  const repeatTicks = STEP_TICKS / repeats;

  for (let i = 0; i < repeats; i++) {
    addDrum(midi, track, rollDrum, 32 + i * 8 + config.breakEnergy * 30, tick + i * repeatTicks, repeatTicks * 0.62);
  }
}

function addBreakPhrase(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  section: JungleSection,
  config: JungleConfig,
  phraseIndex: number
) {
  const startTick = barTick(startBar);
  const energy = clamp01(config.breakEnergy * 0.72 + section.drums * 0.36);
  const chop = clamp01(config.chopComplexity);
  const breakPool = BREAKS_BY_STYLE[config.style];
  const phrase = breakPool[phraseIndex % breakPool.length];
  const totalSteps = bars * 16;
  const swing = STEP_TICKS * (0.025 + chop * 0.055);
  const humanize = 3 + chop * 7;

  if (section.drop && startBar % 16 === 0) {
    addDrum(midi, track, DRUM_MAPPING.CRASH, 72 + energy * 26, startTick, TICKS_PER_BEAT * 1.5);
  }

  for (let step = 0; step < totalSteps; step++) {
    const localStep = step % 32;
    const hits = phrase.filter(hit => hit.step === localStep);

    hits.forEach(hit => {
      if (hit.probability !== undefined && !chance(hit.probability + energy * 0.2)) return;

      const swung = step % 2 === 1 ? swing : 0;
      const tick = Math.max(0, Math.round(startTick + step * STEP_TICKS + swung + randomBetween(-humanize, humanize)));
      const duration = (hit.duration ?? 0.72) * STEP_TICKS;
      const accent = [0, 4, 12, 16, 20, 28].includes(localStep) ? 1 : 0.78;
      addDrum(midi, track, hit.drum, hit.velocity * energy * accent, tick, duration);
    });

    if (step % 2 === 0 && section.drums > 0.45 && chance(0.18 + energy * 0.2)) {
      const tick = Math.round(startTick + step * STEP_TICKS + randomBetween(-humanize, humanize));
      addDrum(midi, track, DRUM_MAPPING.RIDE, 18 + energy * 22, tick, STEP_TICKS * 0.55);
    }

    if ([15, 31].includes(localStep)) {
      addChopEdit(midi, track, startTick, step, config, section);
    }
  }

  const phraseEnd = (startBar + bars) % 16 === 0;
  if (phraseEnd && chance(0.22 + chop * 0.44)) {
    const fillTick = barTick(startBar + bars - 1);
    const fillSteps = chop > 0.72 ? [10, 11, 12, 14, 15] : [11, 14, 15];
    fillSteps.forEach((step, index) => {
      const drum = index % 3 === 0 ? DRUM_MAPPING.SNARE : pick([DRUM_MAPPING.SNARE, DRUM_MAPPING.MID_TOM, DRUM_MAPPING.HIGH_TOM]);
      addDrum(midi, track, drum, 42 + index * 10 + energy * 20, fillTick + step * STEP_TICKS, STEP_TICKS * 0.36);
    });
  }
}

function addSparseBreaks(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  section: JungleSection,
  config: JungleConfig,
  phraseIndex: number
) {
  const ghostSection = { ...section, drums: section.drums * 0.85 };
  for (let bar = 0; bar < bars; bar += 2) {
    if (bar % 4 === 0 || chance(config.breakEnergy * 0.5)) {
      addBreakPhrase(midi, track, startBar + bar, Math.min(2, bars - bar), ghostSection, config, phraseIndex + bar);
    }
  }
}

function addSubBass(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  degree: number,
  section: JungleSection,
  scaleBass: number[],
  config: JungleConfig,
  phraseIndex: number
) {
  const patterns = BASS_PATTERNS[config.style];
  const pattern = patterns[phraseIndex % patterns.length];
  const weight = clamp01(config.bassWeight * 0.72 + section.bass * 0.38);

  for (let bar = 0; bar < bars; bar++) {
    const barStart = barTick(startBar + bar);

    pattern.forEach(hit => {
      if (hit.degree !== 0 && !chance(0.44 + config.bassWeight * 0.35)) return;

      const note = keepInRange(degreeNote(scaleBass, degree + hit.degree), 24, 43);
      const tick = barStart + beatTick(hit.beat);
      const duration = beatTick(hit.duration);
      addNote(midi, track, CHANNELS.sub, note, hit.velocity * weight, tick, duration, 6);

      if (hit.duration >= 1 && chance(0.22 + config.bassWeight * 0.28)) {
        midi.addPitchBend(track, CHANNELS.sub, -900, tick);
        midi.addPitchBend(track, CHANNELS.sub, 0, tick + duration * 0.35);
        midi.addPitchBend(track, CHANNELS.sub, 0, tick + duration + 2);
      }
    });
  }
}

function addPads(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  degree: number,
  section: JungleSection,
  scalePads: number[],
  config: JungleConfig
) {
  if (section.pads <= 0.2 && !chance(config.dubSpace * 0.3)) return;

  const startTick = barTick(startBar);
  const duration = barTick(bars) + beatTick(1);
  const chord = getChord(degree, scalePads, config.style === 'darkside' ? 'triad' : '7th')
    .map(note => keepInRange(note, 48, 78));
  const velocity = 30 + section.pads * 24 + config.dubSpace * 14;

  chord.forEach((note, index) => {
    addNote(midi, track, CHANNELS.pads, note, velocity - index * 3, startTick + index * 18, duration, 18);
  });
}

function addStabs(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  degree: number,
  section: JungleSection,
  scaleStabs: number[],
  config: JungleConfig
) {
  const stabChance = section.drop ? 0.18 + section.stabs * 0.4 : section.stabs * 0.28;
  const chord = getChord(degree, scaleStabs, 'triad').map(note => keepInRange(note, 48, 76));

  for (let bar = 0; bar < bars; bar += 2) {
    if (!chance(stabChance)) continue;

    const startTick = barTick(startBar + bar);
    const steps = config.style === 'ragga' ? [0, 6, 10] : config.style === 'classic' ? [0, 10] : [0];

    steps.forEach(step => {
      if (step !== 0 && !chance(0.4 + config.chopComplexity * 0.24)) return;
      chord.forEach((note, index) => {
        const duration = STEP_TICKS * (config.style === 'ragga' ? 0.9 : 1.35);
        addNote(midi, track, CHANNELS.stabs, note, 44 + section.stabs * 34 - index * 5, startTick + step * STEP_TICKS + index * 8, duration, 5);
      });
    });
  }
}

function addFx(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  degree: number,
  section: JungleSection,
  scaleFx: number[],
  config: JungleConfig,
  nextSection?: JungleSection
) {
  const space = clamp01(config.dubSpace * 0.7 + section.pads * 0.35);

  for (let bar = 0; bar < bars; bar += 4) {
    if (!chance(0.12 + space * 0.26)) continue;

    const startTick = barTick(startBar + bar);
    const note = keepInRange(degreeNote(scaleFx, degree + pick([0, 3, 4, 6])), 72, 96);
    addNote(midi, track, CHANNELS.fx, note, 24 + space * 34, startTick + beatTick(pick([0.5, 2, 3])), beatTick(1.5), 20);
  }

  if (nextSection?.drop && bars >= 2) {
    const riseTick = barTick(startBar + bars - 2);
    for (let step = 0; step < 32; step += 2) {
      const note = keepInRange(degreeNote(scaleFx, degree + Math.floor(step / 4)), 72, 103);
      addNote(midi, track, CHANNELS.fx, note, 22 + step * 1.6 + space * 18, riseTick + step * STEP_TICKS, STEP_TICKS * 0.5, 4);
    }
  }
}

export async function generateJungle(
  config: JungleConfig,
  onProgress: (status: GenerationStatus) => void
): Promise<Uint8Array> {
  const normalizedConfig: JungleConfig = {
    ...config,
    breakEnergy: clamp01(config.breakEnergy),
    chopComplexity: clamp01(config.chopComplexity),
    bassWeight: clamp01(config.bassWeight),
    dubSpace: clamp01(config.dubSpace)
  };
  const midi = new MidiFile(TICKS_PER_BEAT);

  const trackTempo = midi.addTrack('Conductor');
  const trackDrums = midi.addTrack('Chopped Breaks');
  const trackSub = midi.addTrack('Dub Sub Bass');
  const trackPads = midi.addTrack('Pads');
  const trackStabs = midi.addTrack('Rave and Dub Stabs');
  const trackFx = midi.addTrack('FX and Sirens');

  midi.addTempo(trackTempo, normalizedConfig.bpm, 0);
  configureTrack(midi, trackPads, CHANNELS.pads, normalizedConfig.style === 'darkside' ? GM_PROGRAMS.darkPad : GM_PROGRAMS.warmPad, 84, 54, 92, 42);
  configureTrack(midi, trackSub, CHANNELS.sub, GM_PROGRAMS.subBass, 112, 64, 10, 6);
  configureTrack(midi, trackStabs, CHANNELS.stabs, normalizedConfig.style === 'ragga' ? GM_PROGRAMS.voice : GM_PROGRAMS.piano, 88, 70, 48, 24);
  configureTrack(midi, trackFx, CHANNELS.fx, GM_PROGRAMS.fx, 72, 84, 110, 66);
  midi.addControlChange(trackSub, CHANNELS.sub, 101, 0, 0);
  midi.addControlChange(trackSub, CHANNELS.sub, 100, 0, 0);
  midi.addControlChange(trackSub, CHANNELS.sub, 6, 2, 0);

  const totalBars = Math.max(1, Math.ceil((normalizedConfig.lengthMinutes * normalizedConfig.bpm) / 4));
  const arrangement = createArrangement(totalBars);
  const progression = pick(PROGRESSIONS[normalizedConfig.style]);
  const scaleBass = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 2);
  const scalePads = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 4);
  const scaleStabs = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 4);
  const scaleFx = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 5);

  let currentBar = 0;
  let phraseIndex = 0;

  for (let sectionIndex = 0; sectionIndex < arrangement.length; sectionIndex++) {
    const section = arrangement[sectionIndex];
    const sectionEnd = currentBar + section.bars;

    onProgress({
      isGenerating: true,
      progress: Math.round((sectionIndex / arrangement.length) * 100),
      message: `Chopping ${section.name} (${sectionIndex + 1}/${arrangement.length})`
    });

    await yieldToUi();

    for (let bar = currentBar; bar < sectionEnd; bar += 2) {
      const localBar = bar - currentBar;
      const bars = Math.min(2, sectionEnd - bar);
      const stripBreak = section.drop && section.stripEvery && localBar > 0 && localBar % section.stripEvery === section.stripEvery - 2;

      if (section.drop && !stripBreak) {
        addBreakPhrase(midi, trackDrums, bar, bars, section, normalizedConfig, phraseIndex);
      } else {
        addSparseBreaks(midi, trackDrums, bar, bars, section, normalizedConfig, phraseIndex);
      }

      const degree = progressionDegree(bar, progression);
      if (section.bass > 0.18) {
        addSubBass(midi, trackSub, bar, bars, degree, section, scaleBass, normalizedConfig, phraseIndex);
      }

      if (bar % 4 === 0) {
        addPads(midi, trackPads, bar, Math.min(4, sectionEnd - bar), degree, section, scalePads, normalizedConfig);
        addStabs(midi, trackStabs, bar, Math.min(4, sectionEnd - bar), degree, section, scaleStabs, normalizedConfig);
      }

      phraseIndex++;
    }

    addFx(midi, trackFx, currentBar, section.bars, progressionDegree(currentBar, progression), section, scaleFx, normalizedConfig, arrangement[sectionIndex + 1]);
    currentBar += section.bars;
  }

  onProgress({ isGenerating: false, progress: 100, message: 'Finalizing jungle MIDI...' });
  return midi.generate();
}
