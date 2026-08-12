import { MidiFile } from '../utils/midiEncoder';
import { GeneratorConfig, GenerationStatus, MidiTrack } from '../types';
import { DRUM_MAPPING, getScaleNotes, getChord } from '../utils/musicTheory';
import { random } from '../utils/random';
import { yieldToUi } from '../utils/schedule';

const TICKS_PER_BEAT = 480;
const BEATS_PER_BAR = 4;
const BAR_TICKS = BEATS_PER_BAR * TICKS_PER_BEAT;
const STEP_TICKS = TICKS_PER_BEAT / 4;

const CHANNELS = {
  pads: 0,
  bass: 1,
  atmosphere: 2,
  reese: 3,
  drums: 9
};

const GM_PROGRAMS = {
  warmPad: 89,
  synthBass: 38,
  crystal: 98,
  darkPad: 91
};

type Section = {
  name: string;
  bars: number;
  drumEnergy: number;
  bassEnergy: number;
  padEnergy: number;
  textureEnergy: number;
  isDrop?: boolean;
};

type StepNote = {
  beat: number;
  duration: number;
  degreeOffset: number;
  velocity: number;
};

const PROGRESSIONS: Record<GeneratorConfig['mood'], number[][]> = {
  liquid: [
    [0, 5, 2, 6],
    [0, 3, 5, 6],
    [0, 6, 5, 3]
  ],
  deep: [
    [0, 3, 5, 4],
    [0, 6, 3, 4],
    [0, 5, 4, 3]
  ],
  dark: [
    [0, 1, 5, 4],
    [0, 6, 1, 4],
    [0, 3, 1, 6]
  ],
  ethereal: [
    [3, 5, 0, 6],
    [0, 2, 5, 6],
    [5, 3, 0, 6]
  ]
};

const BASS_PATTERNS: Record<GeneratorConfig['mood'], StepNote[][]> = {
  liquid: [
    [
      { beat: 0, duration: 1.25, degreeOffset: 0, velocity: 100 },
      { beat: 1.75, duration: 0.5, degreeOffset: 4, velocity: 70 },
      { beat: 2.25, duration: 0.75, degreeOffset: 0, velocity: 92 },
      { beat: 3.25, duration: 0.5, degreeOffset: 6, velocity: 68 }
    ],
    [
      { beat: 0, duration: 1.5, degreeOffset: 0, velocity: 96 },
      { beat: 2, duration: 0.75, degreeOffset: 0, velocity: 90 },
      { beat: 3, duration: 0.75, degreeOffset: 2, velocity: 72 }
    ]
  ],
  deep: [
    [
      { beat: 0, duration: 1.75, degreeOffset: 0, velocity: 98 },
      { beat: 2.25, duration: 0.75, degreeOffset: 0, velocity: 88 },
      { beat: 3.25, duration: 0.5, degreeOffset: -1, velocity: 66 }
    ],
    [
      { beat: 0, duration: 2.75, degreeOffset: 0, velocity: 94 },
      { beat: 3.25, duration: 0.5, degreeOffset: 4, velocity: 66 }
    ]
  ],
  dark: [
    [
      { beat: 0, duration: 1.5, degreeOffset: 0, velocity: 104 },
      { beat: 2, duration: 0.5, degreeOffset: 1, velocity: 74 },
      { beat: 2.5, duration: 1, degreeOffset: 0, velocity: 92 },
      { beat: 3.5, duration: 0.35, degreeOffset: -1, velocity: 66 }
    ],
    [
      { beat: 0, duration: 2, degreeOffset: 0, velocity: 98 },
      { beat: 2.75, duration: 0.75, degreeOffset: 0, velocity: 88 }
    ]
  ],
  ethereal: [
    [
      { beat: 0, duration: 2, degreeOffset: 0, velocity: 88 },
      { beat: 2.5, duration: 0.75, degreeOffset: 4, velocity: 64 },
      { beat: 3.25, duration: 0.5, degreeOffset: 6, velocity: 58 }
    ],
    [
      { beat: 0, duration: 3, degreeOffset: 0, velocity: 86 },
      { beat: 3.25, duration: 0.5, degreeOffset: 2, velocity: 58 }
    ]
  ]
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function randomBetween(min: number, max: number): number {
  return min + random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function chance(probability: number): boolean {
  return random() < clamp01(probability);
}

function pick<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

function tickForBar(bar: number): number {
  return Math.round(bar * BAR_TICKS);
}

function tickForBeat(beat: number): number {
  return Math.round(beat * TICKS_PER_BEAT);
}

function scaleDegree(scale: number[], degree: number, octaveOffset: number = 0): number {
  const scaleLength = scale.length;
  const wrapped = ((degree % scaleLength) + scaleLength) % scaleLength;
  const octave = Math.floor(degree / scaleLength);
  return scale[wrapped] + ((octave + octaveOffset) * 12);
}

function keepInRange(note: number, low: number, high: number): number {
  let result = note;
  while (result < low) result += 12;
  while (result > high) result -= 12;
  return result;
}

function humanizedTick(tick: number, amount: number): number {
  return Math.max(0, Math.round(tick + randomBetween(-amount, amount)));
}

function addHumanNote(
  midi: MidiFile,
  track: MidiTrack,
  channel: number,
  pitch: number,
  velocity: number,
  startTick: number,
  durationTicks: number,
  humanizeTicks: number,
  velocityDrift: number = 4
) {
  midi.addNote(
    track,
    channel,
    pitch,
    clamp(velocity + randomBetween(-velocityDrift, velocityDrift), 1, 127),
    humanizedTick(startTick, humanizeTicks),
    Math.max(1, Math.round(durationTicks + randomBetween(-humanizeTicks, humanizeTicks)))
  );
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

function createArrangement(totalBars: number): Section[] {
  if (totalBars <= 64) {
    const introBars = Math.min(totalBars, Math.max(1, Math.min(8, Math.floor(totalBars * 0.18))));
    const buildBars = Math.min(totalBars - introBars, Math.max(0, Math.min(8, Math.floor(totalBars * 0.18))));
    const outroBars = totalBars - introBars - buildBars > 12 ? 4 : 0;
    const dropBars = totalBars - introBars - buildBars - outroBars;

    return [
      { name: 'mist intro', bars: introBars, drumEnergy: 0.05, bassEnergy: 0.25, padEnergy: 0.9, textureEnergy: 0.9 },
      { name: 'break tease', bars: buildBars, drumEnergy: 0.45, bassEnergy: 0.55, padEnergy: 0.8, textureEnergy: 0.7 },
      { name: 'main roll', bars: dropBars, drumEnergy: 0.9, bassEnergy: 0.95, padEnergy: 0.72, textureEnergy: 0.62, isDrop: true },
      { name: 'drift outro', bars: outroBars, drumEnergy: 0.15, bassEnergy: 0.25, padEnergy: 0.95, textureEnergy: 0.85 }
    ].filter(section => section.bars > 0);
  }

  const cycle: Section[] = [
    { name: 'mist intro', bars: 32, drumEnergy: 0.05, bassEnergy: 0.2, padEnergy: 0.95, textureEnergy: 0.9 },
    { name: 'break tease', bars: 32, drumEnergy: 0.45, bassEnergy: 0.55, padEnergy: 0.84, textureEnergy: 0.72 },
    { name: 'liquid drop', bars: 64, drumEnergy: 0.94, bassEnergy: 1, padEnergy: 0.72, textureEnergy: 0.58, isDrop: true },
    { name: 'afterglow breakdown', bars: 32, drumEnergy: 0.12, bassEnergy: 0.15, padEnergy: 1, textureEnergy: 0.9 },
    { name: 'second drop', bars: 64, drumEnergy: 1, bassEnergy: 1, padEnergy: 0.76, textureEnergy: 0.68, isDrop: true },
    { name: 'drift outro', bars: 32, drumEnergy: 0.2, bassEnergy: 0.3, padEnergy: 0.95, textureEnergy: 0.85 }
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

function buildChordVoicing(
  degree: number,
  scale: number[],
  mood: GeneratorConfig['mood'],
  atmosphere: number
): number[] {
  const chord = getChord(degree, scale, '7th');

  if (atmosphere > 0.45) {
    chord.push(scaleDegree(scale, degree + 8));
  }

  if (mood === 'ethereal' || (mood === 'liquid' && atmosphere > 0.72)) {
    chord.push(scaleDegree(scale, degree + 11));
  }

  const ranged = chord.map(note => keepInRange(note, 48, 81));
  return [...new Set(ranged)].sort((a, b) => a - b);
}

function progressionDegree(
  bar: number,
  progression: number[],
  config: GeneratorConfig
): number {
  const chordIndex = Math.floor(bar / 4);
  const cycleIndex = chordIndex % progression.length;
  let degree = progression[cycleIndex];

  if (cycleIndex === progression.length - 1 && chance(0.18 + config.complexity * 0.16)) {
    degree = config.mood === 'dark' ? 1 : pick([4, 6]);
  }

  return degree;
}

function addPadChord(
  midi: MidiFile,
  trackPads: MidiTrack,
  trackAtmosphere: MidiTrack,
  degree: number,
  startBar: number,
  durationBars: number,
  section: Section,
  scalePads: number[],
  scaleHigh: number[],
  config: GeneratorConfig
) {
  const startTick = tickForBar(startBar);
  const durationTicks = tickForBar(durationBars) + tickForBeat(randomBetween(0.5, 1.5));
  const voicing = buildChordVoicing(degree, scalePads, config.mood, config.atmosphere);
  const velocity = 38 + section.padEnergy * 22 + config.atmosphere * 8;

  voicing.forEach((note, index) => {
    addHumanNote(
      midi,
      trackPads,
      CHANNELS.pads,
      note,
      velocity - index * 2,
      startTick + index * randomBetween(12, 34),
      durationTicks,
      18,
      5
    );
  });

  if (chance(section.textureEnergy * config.atmosphere * 0.72)) {
    const shimmer = keepInRange(scaleDegree(scaleHigh, degree + pick([7, 8, 9, 11])), 72, 96);
    addHumanNote(
      midi,
      trackAtmosphere,
      CHANNELS.atmosphere,
      shimmer,
      28 + config.atmosphere * 18,
      startTick + tickForBeat(randomBetween(0.5, 2)),
      Math.max(tickForBar(2), durationTicks - tickForBeat(1)),
      28,
      8
    );
  }
}

function addBassForChord(
  midi: MidiFile,
  trackBass: MidiTrack,
  trackReese: MidiTrack,
  degree: number,
  startBar: number,
  durationBars: number,
  section: Section,
  scaleBass: number[],
  scaleReese: number[],
  config: GeneratorConfig
) {
  const root = keepInRange(scaleDegree(scaleBass, degree), 24, 42);
  const chordStart = tickForBar(startBar);

  if (section.bassEnergy < 0.45) {
    addHumanNote(
      midi,
      trackBass,
      CHANNELS.bass,
      root,
      58 + section.bassEnergy * 24,
      chordStart,
      tickForBar(durationBars),
      8,
      3
    );
    return;
  }

  const patterns = BASS_PATTERNS[config.mood];

  for (let barOffset = 0; barOffset < durationBars; barOffset++) {
    const barStart = tickForBar(startBar + barOffset);
    const pattern = patterns[(Math.floor((startBar + barOffset) / 2) + barOffset) % patterns.length];

    pattern.forEach(step => {
      if (step.degreeOffset !== 0 && !chance(0.45 + config.complexity * 0.4)) return;

      const pitch = keepInRange(scaleDegree(scaleBass, degree + step.degreeOffset), 24, 43);
      addHumanNote(
        midi,
        trackBass,
        CHANNELS.bass,
        pitch,
        step.velocity * section.bassEnergy,
        barStart + tickForBeat(step.beat),
        tickForBeat(step.duration),
        10,
        6
      );
    });
  }

  if (section.isDrop && chance(0.42 + config.complexity * 0.25)) {
    const reeseRoot = keepInRange(scaleDegree(scaleReese, degree), 40, 59);
    const reeseStart = chordStart + tickForBeat(chance(0.5) ? 0 : 2);
    const reeseDuration = Math.min(tickForBar(durationBars), tickForBar(chance(0.45) ? 2 : 4));
    const fifthOrSeventh = config.mood === 'dark' ? 10 : 7;

    addHumanNote(midi, trackReese, CHANNELS.reese, reeseRoot, 44 + section.bassEnergy * 16, reeseStart, reeseDuration, 12, 5);
    addHumanNote(midi, trackReese, CHANNELS.reese, reeseRoot + fifthOrSeventh, 30 + section.bassEnergy * 12, reeseStart + 8, reeseDuration, 12, 5);
  }
}

function stepTick(startTick: number, step: number, swingTicks: number, humanize: number): number {
  const swing = step % 2 === 1 ? swingTicks : 0;
  return humanizedTick(startTick + step * STEP_TICKS + swing, humanize);
}

function addDrum(
  midi: MidiFile,
  track: MidiTrack,
  note: number,
  velocity: number,
  startTick: number,
  durationTicks: number = STEP_TICKS * 0.8
) {
  midi.addNote(track, CHANNELS.drums, note, velocity, startTick, durationTicks);
}

function addDrumFill(
  midi: MidiFile,
  trackDrums: MidiTrack,
  startBar: number,
  config: GeneratorConfig,
  strength: number
) {
  const barStart = tickForBar(startBar);
  const swingTicks = Math.round(STEP_TICKS * (0.025 + config.complexity * 0.045));
  const fillSteps = config.breakDensity > 0.72 ? [10, 11, 14, 15] : [11, 15];

  fillSteps.forEach((step, index) => {
    const progress = index / fillSteps.length;
    const tick = stepTick(barStart, step, swingTicks, 5);
    const drum = step < 14 ? DRUM_MAPPING.SNARE : DRUM_MAPPING.ELECTRIC_SNARE;
    addDrum(midi, trackDrums, drum, 34 + progress * 36 * strength, tick, STEP_TICKS * 0.42);
  });

  if (config.breakDensity > 0.62) {
    addDrum(midi, trackDrums, DRUM_MAPPING.KICK, 86, stepTick(barStart, 12, swingTicks, 4), STEP_TICKS);
  }
}

function addBreakLoop(
  midi: MidiFile,
  trackDrums: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  config: GeneratorConfig
) {
  const totalSteps = bars * 16;
  const startTick = tickForBar(startBar);
  const density = clamp01(config.breakDensity * 0.55 + section.drumEnergy * 0.25);
  const complexity = clamp01(config.complexity);
  const swingTicks = Math.round(STEP_TICKS * (0.025 + complexity * 0.05));
  const humanize = 3 + complexity * 5;
  const kickTemplates = [
    [0, 10, 16, 26],
    [0, 8, 10, 16, 24, 26],
    [0, 10, 16, 22],
    [0, 10, 16, 24]
  ];
  const kickSteps = pick(kickTemplates);
  const ghostPool = [3, 7, 11, 15, 19, 23, 27, 31];
  const strongSnareSteps = [4, 12, 20, 28];

  if (section.isDrop && startBar % 16 === 0) {
    addDrum(midi, trackDrums, DRUM_MAPPING.CRASH, 70 + section.drumEnergy * 16, startTick, TICKS_PER_BEAT * 1.5);
  }

  for (let step = 0; step < totalSteps; step++) {
    const localStep = step % 32;
    const tick = stepTick(startTick, step, swingTicks, humanize);
    const accent = step % 4 === 0 ? 1 : 0.72;

    if (kickSteps.includes(localStep) || (density > 0.82 && chance(0.025) && !strongSnareSteps.includes(localStep))) {
      addDrum(midi, trackDrums, DRUM_MAPPING.KICK, 84 + section.drumEnergy * 30 * accent, tick, STEP_TICKS * 0.9);
    }

    if (strongSnareSteps.includes(localStep)) {
      addDrum(midi, trackDrums, DRUM_MAPPING.SNARE, 104 + section.drumEnergy * 18, tick, STEP_TICKS);
      if (density > 0.7 && chance(0.14 + density * 0.12)) {
        addDrum(midi, trackDrums, DRUM_MAPPING.RIMSHOT, 24 + density * 22, tick - Math.round(STEP_TICKS * 0.18), STEP_TICKS * 0.35);
      }
    } else if (ghostPool.includes(localStep) && chance(0.08 + density * 0.18)) {
      addDrum(midi, trackDrums, DRUM_MAPPING.SNARE, 18 + density * 22, tick, STEP_TICKS * 0.38);
    }

    if (section.drumEnergy > 0.18 && (step % 2 === 0 || (density > 0.72 && chance(density * 0.16)))) {
      const hatVelocity = 42 + section.drumEnergy * 24 + (step % 4 === 0 ? 10 : 0) + randomBetween(-5, 5);
      addDrum(midi, trackDrums, DRUM_MAPPING.CLOSED_HH, hatVelocity, tick, STEP_TICKS * 0.55);
    }

    if (section.drumEnergy > 0.5 && [14, 30].includes(localStep) && chance(0.22 + density * 0.16)) {
      addDrum(midi, trackDrums, DRUM_MAPPING.OPEN_HH, 42 + density * 24, tick, STEP_TICKS * 1.1);
    }

    if (section.isDrop && density > 0.8 && step % 8 === 0 && chance(0.12 + complexity * 0.12)) {
      addDrum(midi, trackDrums, DRUM_MAPPING.RIDE, 22 + section.drumEnergy * 18, tick, STEP_TICKS * 1.1);
    }

    if (section.drumEnergy > 0.35 && density > 0.7 && chance(0.04 + density * 0.08)) {
      addDrum(midi, trackDrums, DRUM_MAPPING.SHAKER, 18 + density * 18, tick + randomInt(-2, 2), STEP_TICKS * 0.3);
    }
  }

  const isPhraseEnd = (startBar + bars) % 16 === 0;
  if (isPhraseEnd && density > 0.58 && chance(0.16 + complexity * 0.16)) {
    addDrumFill(midi, trackDrums, startBar + bars - 1, config, section.drumEnergy);
  }
}

function addBreakdownPercussion(
  midi: MidiFile,
  trackDrums: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  config: GeneratorConfig
) {
  const swingTicks = Math.round(STEP_TICKS * (0.04 + config.complexity * 0.06));

  for (let bar = 0; bar < bars; bar++) {
    const barStart = tickForBar(startBar + bar);

    for (let step = 0; step < 16; step += 2) {
      if (!chance(section.drumEnergy * 0.74)) continue;
      addDrum(
        midi,
        trackDrums,
        chance(0.7) ? DRUM_MAPPING.CLOSED_HH : DRUM_MAPPING.SHAKER,
        24 + section.drumEnergy * 42,
        stepTick(barStart, step, swingTicks, 5),
        STEP_TICKS * 0.42
      );
    }

    if (bar % 8 === 7 && chance(config.complexity * 0.45)) {
      addDrumFill(midi, trackDrums, startBar + bar, config, section.drumEnergy * 0.75);
    }
  }
}

function addTextureMotifs(
  midi: MidiFile,
  trackAtmosphere: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  scaleArp: number[],
  config: GeneratorConfig
) {
  const motifShape = pick([
    [0, 2, 4, 6],
    [0, 4, 2, 6],
    [2, 4, 7, 6],
    [6, 4, 2, 0]
  ]);
  const rhythm = pick([
    [0.5, 1.75, 2.5, 3.5],
    [0.75, 1.5, 2.75, 3.25],
    [1, 1.75, 2.5, 3.75]
  ]);
  const motifChance = clamp01(0.18 + section.textureEnergy * 0.38 + config.atmosphere * 0.28);

  for (let bar = 0; bar < bars; bar += 2) {
    if (!chance(motifChance)) continue;

    const barStart = tickForBar(startBar + bar);
    const octaveLift = chance(0.5) ? 7 : 0;

    motifShape.forEach((degreeOffset, index) => {
      if (index > 1 && !chance(0.58 + config.complexity * 0.28)) return;

      const pitch = keepInRange(scaleDegree(scaleArp, degreeOffset + octaveLift), 60, 91);
      const noteStart = barStart + tickForBeat(rhythm[index % rhythm.length]);
      const duration = tickForBeat(chance(0.35) ? 0.75 : 0.5);
      const velocity = 34 + section.textureEnergy * 36 + config.atmosphere * 12;

      addHumanNote(midi, trackAtmosphere, CHANNELS.atmosphere, pitch, velocity, noteStart, duration, 16, 8);

      if (chance(0.45 + config.atmosphere * 0.28)) {
        midi.addNote(trackAtmosphere, CHANNELS.atmosphere, pitch, velocity * 0.58, noteStart + tickForBeat(0.75), duration);
      }

      if (chance(0.2 + config.atmosphere * 0.24)) {
        midi.addNote(trackAtmosphere, CHANNELS.atmosphere, pitch + 12, velocity * 0.35, noteStart + tickForBeat(1.5), duration);
      }
    });
  }
}

function addLift(
  midi: MidiFile,
  trackAtmosphere: MidiTrack,
  trackDrums: MidiTrack,
  startBar: number,
  scaleArp: number[],
  config: GeneratorConfig
) {
  const liftStart = tickForBar(startBar);

  for (let step = 0; step < 16; step++) {
    const pitch = keepInRange(scaleDegree(scaleArp, step), 67, 96);
    const velocity = 22 + step * 3 + config.atmosphere * 16;
    midi.addNote(trackAtmosphere, CHANNELS.atmosphere, pitch, velocity, liftStart + step * STEP_TICKS, STEP_TICKS * 0.65);
  }

  for (let step = 8; step < 16; step++) {
    addDrum(
      midi,
      trackDrums,
      DRUM_MAPPING.ELECTRIC_SNARE,
      28 + (step - 8) * 6,
      liftStart + step * STEP_TICKS,
      STEP_TICKS * 0.45
    );
  }
}

export async function generateAmbientDnB(
  config: GeneratorConfig,
  onProgress: (status: GenerationStatus) => void
): Promise<Uint8Array> {
  const normalizedConfig: GeneratorConfig = {
    ...config,
    complexity: clamp01(config.complexity),
    breakDensity: clamp01(config.breakDensity),
    atmosphere: clamp01(config.atmosphere)
  };
  const midi = new MidiFile(TICKS_PER_BEAT);

  const trackTempo = midi.addTrack('Conductor');
  const trackDrums = midi.addTrack('Breaks and Percussion');
  const trackBass = midi.addTrack('Sub Bass');
  const trackReese = midi.addTrack('Reese Bass');
  const trackPads = midi.addTrack('Evolving Pads');
  const trackAtmosphere = midi.addTrack('Atmosphere and Echoes');

  midi.addTempo(trackTempo, normalizedConfig.bpm, 0);
  configureTrack(midi, trackPads, CHANNELS.pads, normalizedConfig.mood === 'dark' ? GM_PROGRAMS.darkPad : GM_PROGRAMS.warmPad, 92, 54, 96, 42);
  configureTrack(midi, trackBass, CHANNELS.bass, GM_PROGRAMS.synthBass, 108, 64, 18, 18);
  configureTrack(midi, trackReese, CHANNELS.reese, GM_PROGRAMS.synthBass, 82, 72, 42, 58);
  configureTrack(midi, trackAtmosphere, CHANNELS.atmosphere, GM_PROGRAMS.crystal, 78, 82, 112, 76);

  const totalBeats = normalizedConfig.lengthMinutes * normalizedConfig.bpm;
  const totalBars = Math.max(1, Math.ceil(totalBeats / BEATS_PER_BAR));
  const arrangement = createArrangement(totalBars);
  const progression = pick(PROGRESSIONS[normalizedConfig.mood]);

  const scaleBass = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 2);
  const scaleReese = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 3);
  const scalePads = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 4);
  const scaleArp = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 5);
  const scaleHigh = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 6);

  let currentBar = 0;

  for (let sectionIndex = 0; sectionIndex < arrangement.length; sectionIndex++) {
    const section = arrangement[sectionIndex];
    const percent = Math.round((sectionIndex / arrangement.length) * 100);

    onProgress({
      isGenerating: true,
      progress: percent,
      message: `Composing ${section.name} (${sectionIndex + 1}/${arrangement.length})`
    });

    await yieldToUi();

    let sectionBar = currentBar;
    const sectionEnd = currentBar + section.bars;

    while (sectionBar < sectionEnd) {
      const remainingBars = sectionEnd - sectionBar;
      const chordBars = Math.min(remainingBars, section.padEnergy > 0.9 && chance(0.35) ? 8 : 4);
      const degree = progressionDegree(sectionBar, progression, normalizedConfig);

      addPadChord(
        midi,
        trackPads,
        trackAtmosphere,
        degree,
        sectionBar,
        chordBars,
        section,
        scalePads,
        scaleHigh,
        normalizedConfig
      );

      addBassForChord(
        midi,
        trackBass,
        trackReese,
        degree,
        sectionBar,
        chordBars,
        section,
        scaleBass,
        scaleReese,
        normalizedConfig
      );

      sectionBar += chordBars;
    }

    if (section.drumEnergy >= 0.5) {
      for (let bar = currentBar; bar < sectionEnd; bar += 2) {
        addBreakLoop(midi, trackDrums, bar, Math.min(2, sectionEnd - bar), section, normalizedConfig);
      }
    } else if (section.drumEnergy > 0.05) {
      addBreakdownPercussion(midi, trackDrums, currentBar, section.bars, section, normalizedConfig);
    }

    addTextureMotifs(midi, trackAtmosphere, currentBar, section.bars, section, scaleArp, normalizedConfig);

    const nextSection = arrangement[sectionIndex + 1];
    if (nextSection?.isDrop && section.bars >= 2) {
      addLift(midi, trackAtmosphere, trackDrums, sectionEnd - 1, scaleArp, normalizedConfig);
    }

    currentBar += section.bars;
  }

  onProgress({ isGenerating: false, progress: 100, message: 'Finalizing MIDI...' });
  return midi.generate();
}
