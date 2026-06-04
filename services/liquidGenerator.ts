import { MidiFile } from '../utils/midiEncoder';
import { DRUM_MAPPING, getChord, getScaleNotes } from '../utils/musicTheory';
import { GenerationStatus, LiquidConfig, MidiTrack } from '../types';

const TICKS_PER_BEAT = 480;
const BAR_TICKS = TICKS_PER_BEAT * 4;
const STEP_TICKS = TICKS_PER_BEAT / 4;

const CHANNELS = {
  keys: 0,
  bass: 1,
  pads: 2,
  lead: 3,
  drums: 9
};

const GM_PROGRAMS = {
  electricPiano: 4,
  acousticPiano: 1,
  synthBass: 38,
  warmPad: 89,
  glassLead: 99
};

type Section = {
  name: string;
  bars: number;
  drums: number;
  bass: number;
  harmony: number;
  lead: number;
  drop?: boolean;
};

type BassHit = {
  beat: number;
  duration: number;
  degree: number;
  velocity: number;
};

const PROGRESSIONS: Record<LiquidConfig['style'], number[][]> = {
  smooth: [
    [0, 5, 2, 6],
    [0, 3, 5, 6],
    [0, 6, 5, 3]
  ],
  soulful: [
    [0, 3, 5, 4],
    [0, 5, 3, 6],
    [3, 5, 0, 6]
  ],
  deep: [
    [0, 6, 3, 4],
    [0, 5, 4, 3],
    [0, 3, 6, 5]
  ],
  vocal: [
    [0, 5, 3, 6],
    [0, 2, 5, 6],
    [3, 5, 0, 6]
  ]
};

const BASS_PATTERNS: Record<LiquidConfig['style'], BassHit[][]> = {
  smooth: [
    [
      { beat: 0, duration: 1.25, degree: 0, velocity: 98 },
      { beat: 1.75, duration: 0.5, degree: 4, velocity: 68 },
      { beat: 2.25, duration: 0.85, degree: 0, velocity: 92 },
      { beat: 3.25, duration: 0.5, degree: 6, velocity: 64 }
    ],
    [
      { beat: 0, duration: 1.5, degree: 0, velocity: 96 },
      { beat: 2, duration: 0.75, degree: 0, velocity: 88 },
      { beat: 3, duration: 0.65, degree: 2, velocity: 68 }
    ]
  ],
  soulful: [
    [
      { beat: 0, duration: 1, degree: 0, velocity: 96 },
      { beat: 1.5, duration: 0.5, degree: 2, velocity: 66 },
      { beat: 2.25, duration: 1, degree: 0, velocity: 90 },
      { beat: 3.5, duration: 0.35, degree: 4, velocity: 62 }
    ],
    [
      { beat: 0, duration: 1.75, degree: 0, velocity: 94 },
      { beat: 2.5, duration: 0.75, degree: 4, velocity: 70 },
      { beat: 3.25, duration: 0.5, degree: 5, velocity: 64 }
    ]
  ],
  deep: [
    [
      { beat: 0, duration: 2, degree: 0, velocity: 98 },
      { beat: 2.5, duration: 0.75, degree: 0, velocity: 86 },
      { beat: 3.25, duration: 0.5, degree: -1, velocity: 62 }
    ],
    [
      { beat: 0, duration: 1.5, degree: 0, velocity: 96 },
      { beat: 2.25, duration: 1, degree: 0, velocity: 88 }
    ]
  ],
  vocal: [
    [
      { beat: 0, duration: 1.25, degree: 0, velocity: 96 },
      { beat: 1.75, duration: 0.5, degree: 5, velocity: 66 },
      { beat: 2.5, duration: 0.75, degree: 0, velocity: 88 },
      { beat: 3.25, duration: 0.5, degree: 4, velocity: 64 }
    ],
    [
      { beat: 0, duration: 1.75, degree: 0, velocity: 94 },
      { beat: 2.75, duration: 0.75, degree: 2, velocity: 66 }
    ]
  ]
};

const HOOK_SHAPES: Record<LiquidConfig['style'], number[][]> = {
  smooth: [
    [0, 2, 4, 6],
    [4, 2, 0, 6],
    [0, 4, 5, 4]
  ],
  soulful: [
    [2, 4, 5, 4],
    [0, 2, 4, 2],
    [4, 6, 5, 4]
  ],
  deep: [
    [0, 2, 3, 2],
    [4, 3, 2, 0],
    [0, 4, 3, 0]
  ],
  vocal: [
    [4, 5, 6, 5],
    [2, 4, 6, 4],
    [0, 2, 4, 5]
  ]
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function chance(probability: number): boolean {
  return Math.random() < clamp01(probability);
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
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
  durationTicks: number = STEP_TICKS * 0.72
) {
  midi.addNote(track, CHANNELS.drums, drum, velocity, startTick, durationTicks);
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
    const introBars = Math.min(totalBars, Math.max(4, Math.floor(totalBars * 0.16)));
    const buildBars = Math.min(totalBars - introBars, Math.max(4, Math.floor(totalBars * 0.16)));
    const outroBars = totalBars - introBars - buildBars > 16 ? 4 : 0;
    const dropBars = totalBars - introBars - buildBars - outroBars;

    return [
      { name: 'keys intro', bars: introBars, drums: 0.12, bass: 0.18, harmony: 0.92, lead: 0.45 },
      { name: 'rolling build', bars: buildBars, drums: 0.48, bass: 0.52, harmony: 0.84, lead: 0.58 },
      { name: 'liquid drop', bars: dropBars, drums: 0.92, bass: 0.96, harmony: 0.72, lead: 0.72, drop: true },
      { name: 'soft outro', bars: outroBars, drums: 0.24, bass: 0.22, harmony: 0.9, lead: 0.38 }
    ].filter(section => section.bars > 0);
  }

  const cycle: Section[] = [
    { name: 'keys intro', bars: 16, drums: 0.1, bass: 0.18, harmony: 0.94, lead: 0.48 },
    { name: 'rolling build', bars: 16, drums: 0.5, bass: 0.54, harmony: 0.84, lead: 0.58 },
    { name: 'liquid drop A', bars: 64, drums: 0.92, bass: 0.98, harmony: 0.74, lead: 0.74, drop: true },
    { name: 'piano breakdown', bars: 16, drums: 0.18, bass: 0.22, harmony: 0.96, lead: 0.64 },
    { name: 'liquid drop B', bars: 64, drums: 0.96, bass: 1, harmony: 0.78, lead: 0.78, drop: true },
    { name: 'soft outro', bars: 16, drums: 0.24, bass: 0.24, harmony: 0.9, lead: 0.34 }
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

function progressionDegree(bar: number, progression: number[]): number {
  return progression[Math.floor(bar / 4) % progression.length];
}

function addLiquidDrums(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  config: LiquidConfig,
  phraseIndex: number
) {
  const startTick = barTick(startBar);
  const totalSteps = bars * 16;
  const groove = clamp01(config.groove * 0.68 + section.drums * 0.36);
  const swing = STEP_TICKS * (0.02 + config.groove * 0.045);
  const humanize = 3 + config.groove * 5;
  const kickPatterns = [
    [0, 10, 16, 24, 26],
    [0, 8, 10, 16, 26],
    [0, 10, 16, 22, 26],
    [0, 7, 10, 16, 24, 26]
  ];
  const kicks = kickPatterns[phraseIndex % kickPatterns.length];
  const ghostSteps = [3, 7, 11, 15, 19, 23, 27, 31];

  if (section.drop && startBar % 16 === 0) {
    addDrum(midi, track, DRUM_MAPPING.CRASH, 72 + groove * 20, startTick, TICKS_PER_BEAT * 1.5);
  }

  for (let step = 0; step < totalSteps; step++) {
    const local = step % 32;
    const tick = Math.round(startTick + step * STEP_TICKS + (step % 2 === 1 ? swing : 0) + randomBetween(-humanize, humanize));

    if (kicks.includes(local)) {
      addDrum(midi, track, DRUM_MAPPING.KICK, 78 + groove * 34 + (local === 0 ? 12 : 0), tick, STEP_TICKS * 0.82);
    }

    if ([4, 12, 20, 28].includes(local)) {
      addDrum(midi, track, DRUM_MAPPING.SNARE, 100 + groove * 20, tick, STEP_TICKS * 0.9);
    } else if (ghostSteps.includes(local) && chance(0.08 + groove * 0.22)) {
      addDrum(midi, track, DRUM_MAPPING.SNARE, 18 + groove * 24, tick, STEP_TICKS * 0.34);
    }

    if (section.drums > 0.2 && (step % 2 === 0 || chance(groove * 0.14))) {
      addDrum(midi, track, DRUM_MAPPING.CLOSED_HH, 38 + groove * 28 + (step % 4 === 0 ? 10 : 0), tick, STEP_TICKS * 0.42);
    }

    if (section.drop && [14, 30].includes(local) && chance(0.2 + groove * 0.18)) {
      addDrum(midi, track, DRUM_MAPPING.OPEN_HH, 42 + groove * 24, tick, STEP_TICKS);
    }
  }

  if ((startBar + bars) % 16 === 0 && chance(0.18 + config.groove * 0.22)) {
    const fillTick = barTick(startBar + bars - 1);
    [11, 14, 15].forEach((step, index) => {
      addDrum(midi, track, index === 1 ? DRUM_MAPPING.ELECTRIC_SNARE : DRUM_MAPPING.SNARE, 40 + groove * 26 + index * 8, fillTick + step * STEP_TICKS, STEP_TICKS * 0.36);
    });
  }
}

function addSoftPercussion(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  config: LiquidConfig
) {
  const groove = clamp01(config.groove * section.drums);

  for (let bar = 0; bar < bars; bar++) {
    const startTick = barTick(startBar + bar);
    for (let step = 0; step < 16; step += 2) {
      if (!chance(0.38 + groove * 0.4)) continue;
      addDrum(midi, track, DRUM_MAPPING.CLOSED_HH, 24 + groove * 34, startTick + step * STEP_TICKS, STEP_TICKS * 0.36);
    }
    if (bar % 4 === 3 && chance(groove * 0.8)) {
      addDrum(midi, track, DRUM_MAPPING.SNARE, 38 + groove * 28, startTick + 15 * STEP_TICKS, STEP_TICKS * 0.32);
    }
  }
}

function addKeysChord(
  midi: MidiFile,
  trackKeys: MidiTrack,
  trackPads: MidiTrack,
  degree: number,
  startBar: number,
  bars: number,
  section: Section,
  scaleKeys: number[],
  scalePads: number[],
  config: LiquidConfig
) {
  const startTick = barTick(startBar);
  const duration = barTick(bars);
  const chord = getChord(degree, scaleKeys, '7th').map(note => keepInRange(note, 48, 76));
  const hasNinth = config.style !== 'deep' && config.melody > 0.48;
  const voicing = hasNinth ? [...chord, keepInRange(degreeNote(scaleKeys, degree + 8), 60, 81)] : chord;

  voicing.forEach((note, index) => {
    addNote(midi, trackKeys, CHANNELS.keys, note, 44 + section.harmony * 24 - index * 3, startTick + index * 10, duration * 0.75, 10);
  });

  if (section.harmony > 0.5 || config.space > 0.52) {
    const padChord = getChord(degree, scalePads, '7th').map(note => keepInRange(note, 48, 84));
    padChord.forEach((note, index) => {
      addNote(midi, trackPads, CHANNELS.pads, note, 28 + section.harmony * 20 + config.space * 12 - index * 2, startTick + index * 22, duration + beatTick(1), 18);
    });
  }
}

function addBass(
  midi: MidiFile,
  track: MidiTrack,
  degree: number,
  startBar: number,
  bars: number,
  section: Section,
  scaleBass: number[],
  config: LiquidConfig,
  phraseIndex: number
) {
  const pattern = BASS_PATTERNS[config.style][phraseIndex % BASS_PATTERNS[config.style].length];
  const flow = clamp01(config.bassFlow * 0.7 + section.bass * 0.38);

  for (let bar = 0; bar < bars; bar++) {
    const startTick = barTick(startBar + bar);
    pattern.forEach(hit => {
      if (hit.degree !== 0 && !chance(0.4 + flow * 0.36)) return;

      const note = keepInRange(degreeNote(scaleBass, degree + hit.degree), 24, 43);
      addNote(midi, track, CHANNELS.bass, note, hit.velocity * flow, startTick + beatTick(hit.beat), beatTick(hit.duration), 6);
    });
  }
}

function addLeadHook(
  midi: MidiFile,
  track: MidiTrack,
  degree: number,
  startBar: number,
  bars: number,
  section: Section,
  scaleLead: number[],
  config: LiquidConfig,
  phraseIndex: number
) {
  const hookChance = section.drop ? 0.24 + config.melody * 0.46 : 0.16 + config.melody * 0.3;
  if (!chance(hookChance)) return;

  const shape = HOOK_SHAPES[config.style][phraseIndex % HOOK_SHAPES[config.style].length];
  const rhythm = config.style === 'vocal'
    ? [0.5, 1.25, 2.25, 3.25]
    : config.style === 'deep'
      ? [1, 1.75, 2.75, 3.5]
      : [0.75, 1.5, 2.5, 3.25];
  const startTick = barTick(startBar);

  for (let bar = 0; bar < bars; bar += 2) {
    if (bar > 0 && !chance(0.5 + config.melody * 0.28)) continue;

    shape.forEach((offset, index) => {
      const note = keepInRange(degreeNote(scaleLead, degree + offset), 60, 88);
      const tick = startTick + barTick(bar) + beatTick(rhythm[index % rhythm.length]);
      addNote(midi, track, CHANNELS.lead, note, 42 + section.lead * 36 + config.melody * 16, tick, beatTick(chance(0.35) ? 0.75 : 0.5), 12);

      if (config.space > 0.54 && chance(0.45)) {
        addNote(midi, track, CHANNELS.lead, note, 24 + config.space * 20, tick + beatTick(0.75), beatTick(0.45), 10);
      }
    });
  }
}

export async function generateLiquid(
  config: LiquidConfig,
  onProgress: (status: GenerationStatus) => void
): Promise<Uint8Array> {
  const normalizedConfig: LiquidConfig = {
    ...config,
    groove: clamp01(config.groove),
    bassFlow: clamp01(config.bassFlow),
    melody: clamp01(config.melody),
    space: clamp01(config.space)
  };
  const midi = new MidiFile(TICKS_PER_BEAT);

  const trackTempo = midi.addTrack('Conductor');
  const trackDrums = midi.addTrack('Clean Rolling Drums');
  const trackBass = midi.addTrack('Liquid Sub Bass');
  const trackKeys = midi.addTrack('Keys and Chords');
  const trackPads = midi.addTrack('Warm Pads');
  const trackLead = midi.addTrack('Hooks and Plucks');

  midi.addTempo(trackTempo, normalizedConfig.bpm, 0);
  configureTrack(midi, trackKeys, CHANNELS.keys, normalizedConfig.style === 'soulful' ? GM_PROGRAMS.acousticPiano : GM_PROGRAMS.electricPiano, 88, 58, 52, 24);
  configureTrack(midi, trackBass, CHANNELS.bass, GM_PROGRAMS.synthBass, 108, 64, 10, 8);
  configureTrack(midi, trackPads, CHANNELS.pads, GM_PROGRAMS.warmPad, 78, 48, 96, 48);
  configureTrack(midi, trackLead, CHANNELS.lead, GM_PROGRAMS.glassLead, 76, 78, 82, 58);

  const totalBars = Math.max(1, Math.ceil((normalizedConfig.lengthMinutes * normalizedConfig.bpm) / 4));
  const arrangement = createArrangement(totalBars);
  const progression = pick(PROGRESSIONS[normalizedConfig.style]);
  const scaleBass = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 2);
  const scaleKeys = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 4);
  const scalePads = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 4);
  const scaleLead = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 5);

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

    await new Promise(resolve => setTimeout(resolve, 10));

    if (section.drums > 0.5) {
      for (let bar = currentBar; bar < sectionEnd; bar += 2) {
        addLiquidDrums(midi, trackDrums, bar, Math.min(2, sectionEnd - bar), section, normalizedConfig, phraseIndex);
        phraseIndex++;
      }
    } else {
      addSoftPercussion(midi, trackDrums, currentBar, section.bars, section, normalizedConfig);
    }

    for (let bar = currentBar; bar < sectionEnd; bar += 4) {
      const bars = Math.min(4, sectionEnd - bar);
      const degree = progressionDegree(bar, progression);
      addKeysChord(midi, trackKeys, trackPads, degree, bar, bars, section, scaleKeys, scalePads, normalizedConfig);
      addBass(midi, trackBass, degree, bar, bars, section, scaleBass, normalizedConfig, phraseIndex);
      addLeadHook(midi, trackLead, degree, bar, bars, section, scaleLead, normalizedConfig, phraseIndex);
    }

    currentBar += section.bars;
  }

  onProgress({ isGenerating: false, progress: 100, message: 'Finalizing liquid MIDI...' });
  return midi.generate();
}
