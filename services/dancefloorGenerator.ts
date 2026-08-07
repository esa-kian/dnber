import { MidiFile } from '../utils/midiEncoder';
import { DRUM_MAPPING, getChord, getScaleNotes } from '../utils/musicTheory';
import { DancefloorConfig, GenerationStatus, MidiTrack } from '../types';
import { random } from '../utils/random';

const TICKS_PER_BEAT = 480;
const BAR_TICKS = TICKS_PER_BEAT * 4;
const STEP_TICKS = TICKS_PER_BEAT / 4;

const CHANNELS = {
  lead: 0,
  sub: 1,
  chords: 2,
  bass: 3,
  plucks: 4,
  fx: 6,
  drums: 9
};

const GM_PROGRAMS = {
  supersawLead: 81,
  subBass: 38,
  warmPad: 89,
  sawBass: 39,
  pluck: 99,
  fx: 97
};

type Section = {
  name: string;
  bars: number;
  drums: number;
  bass: number;
  chords: number;
  hook: number;
  build: number;
  drop?: boolean;
  breakdown?: boolean;
  stripEvery?: number;
};

type BassHit = {
  beat: number;
  duration: number;
  degree: number;
  velocity: number;
};

const PROGRESSIONS: Record<DancefloorConfig['style'], number[][]> = {
  anthem: [
    [0, 5, 3, 6],
    [0, 6, 5, 3],
    [3, 5, 0, 6]
  ],
  festival: [
    [0, 3, 5, 6],
    [0, 5, 6, 3],
    [5, 6, 3, 0]
  ],
  vocal: [
    [0, 5, 3, 6],
    [3, 5, 0, 6],
    [0, 2, 5, 6]
  ],
  rave: [
    [0, 6, 5, 3],
    [0, 3, 6, 5],
    [0, 0, 5, 6]
  ]
};

const BASS_PATTERNS: Record<DancefloorConfig['style'], BassHit[][]> = {
  anthem: [
    [
      { beat: 0, duration: 1.25, degree: 0, velocity: 104 },
      { beat: 1.75, duration: 0.5, degree: 4, velocity: 72 },
      { beat: 2.5, duration: 0.75, degree: 0, velocity: 98 },
      { beat: 3.25, duration: 0.5, degree: 5, velocity: 74 }
    ],
    [
      { beat: 0, duration: 1.5, degree: 0, velocity: 104 },
      { beat: 2, duration: 0.75, degree: 0, velocity: 96 },
      { beat: 3, duration: 0.65, degree: 2, velocity: 72 }
    ]
  ],
  festival: [
    [
      { beat: 0, duration: 1, degree: 0, velocity: 106 },
      { beat: 1.5, duration: 0.5, degree: 4, velocity: 78 },
      { beat: 2.25, duration: 0.85, degree: 0, velocity: 100 },
      { beat: 3.25, duration: 0.5, degree: 6, velocity: 74 }
    ],
    [
      { beat: 0, duration: 1.25, degree: 0, velocity: 106 },
      { beat: 1.75, duration: 0.5, degree: 5, velocity: 78 },
      { beat: 2.5, duration: 1, degree: 0, velocity: 100 }
    ]
  ],
  vocal: [
    [
      { beat: 0, duration: 1.5, degree: 0, velocity: 98 },
      { beat: 2.25, duration: 0.75, degree: 0, velocity: 92 },
      { beat: 3.25, duration: 0.5, degree: 4, velocity: 68 }
    ],
    [
      { beat: 0, duration: 1, degree: 0, velocity: 96 },
      { beat: 1.75, duration: 0.5, degree: 2, velocity: 68 },
      { beat: 2.5, duration: 0.85, degree: 0, velocity: 92 }
    ]
  ],
  rave: [
    [
      { beat: 0, duration: 0.95, degree: 0, velocity: 108 },
      { beat: 1.5, duration: 0.45, degree: 5, velocity: 82 },
      { beat: 2, duration: 0.75, degree: 0, velocity: 102 },
      { beat: 3, duration: 0.45, degree: 6, velocity: 78 }
    ],
    [
      { beat: 0, duration: 1.1, degree: 0, velocity: 108 },
      { beat: 1.75, duration: 0.45, degree: 4, velocity: 78 },
      { beat: 2.5, duration: 0.8, degree: 0, velocity: 102 },
      { beat: 3.5, duration: 0.35, degree: 5, velocity: 78 }
    ]
  ]
};

const HOOK_SHAPES: Record<DancefloorConfig['style'], number[][]> = {
  anthem: [
    [4, 5, 6, 5, 4, 2, 0, 2],
    [0, 2, 4, 5, 6, 5, 4, 2],
    [6, 5, 4, 2, 4, 5, 4, 2]
  ],
  festival: [
    [0, 2, 4, 7, 6, 5, 4, 2],
    [4, 5, 6, 7, 6, 4, 2, 0],
    [7, 6, 5, 4, 2, 4, 5, 6]
  ],
  vocal: [
    [4, 5, 6, 5, 4, 2, 4, 2],
    [2, 4, 5, 4, 2, 0, 2, 4],
    [6, 5, 4, 5, 4, 2, 0, 2]
  ],
  rave: [
    [0, 4, 7, 4, 0, 4, 7, 6],
    [7, 6, 4, 2, 4, 6, 7, 9],
    [0, 2, 4, 6, 7, 6, 4, 2]
  ]
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
  if (totalBars <= 16) {
    return [
      { name: 'dancefloor loop', bars: totalBars, drums: 0.95, bass: 0.95, chords: 0.82, hook: 0.86, build: 0.35, drop: true }
    ];
  }

  if (totalBars <= 64) {
    const introBars = Math.max(4, Math.min(8, Math.floor(totalBars * 0.16)));
    const buildBars = Math.max(4, Math.min(8, Math.floor(totalBars * 0.16)));
    const outroBars = totalBars > 40 ? 4 : 0;
    const dropBars = Math.max(1, totalBars - introBars - buildBars - outroBars);

    return [
      { name: 'polished intro', bars: introBars, drums: 0.26, bass: 0.16, chords: 0.74, hook: 0.34, build: 0.18 },
      { name: 'hands-up build', bars: buildBars, drums: 0.58, bass: 0.34, chords: 0.9, hook: 0.72, build: 0.86 },
      { name: 'dancefloor drop', bars: dropBars, drums: 0.96, bass: 1, chords: 0.72, hook: 0.92, build: 0.48, drop: true, stripEvery: 16 },
      { name: 'clean outro', bars: outroBars, drums: 0.36, bass: 0.18, chords: 0.55, hook: 0.22, build: 0.12 }
    ].filter(section => section.bars > 0);
  }

  const cycle: Section[] = [
    { name: 'polished intro', bars: 16, drums: 0.28, bass: 0.16, chords: 0.72, hook: 0.34, build: 0.18 },
    { name: 'hands-up build', bars: 16, drums: 0.58, bass: 0.34, chords: 0.9, hook: 0.76, build: 0.9 },
    { name: 'drop A', bars: 32, drums: 0.96, bass: 1, chords: 0.74, hook: 0.92, build: 0.46, drop: true, stripEvery: 16 },
    { name: 'vocal breakdown', bars: 16, drums: 0.16, bass: 0.14, chords: 0.96, hook: 0.78, build: 0.36, breakdown: true },
    { name: 'second build', bars: 8, drums: 0.62, bass: 0.42, chords: 0.9, hook: 0.84, build: 0.96 },
    { name: 'drop B', bars: 32, drums: 1, bass: 1, chords: 0.78, hook: 0.98, build: 0.52, drop: true, stripEvery: 16 },
    { name: 'clean outro', bars: 8, drums: 0.38, bass: 0.18, chords: 0.58, hook: 0.22, build: 0.14 }
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

function addDancefloorDrums(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  config: DancefloorConfig,
  phraseIndex: number
) {
  const startTick = barTick(startBar);
  const drive = clamp01(config.drumDrive * 0.72 + section.drums * 0.36);
  const humanize = 2 + (1 - config.drumDrive) * 5;
  const kickPatterns = [
    [0, 10, 16, 24, 26],
    [0, 8, 10, 16, 26],
    [0, 10, 14, 16, 24, 26],
    [0, 7, 10, 16, 22, 26]
  ];
  const kicks = kickPatterns[phraseIndex % kickPatterns.length];
  const totalSteps = bars * 16;

  if (section.drop && startBar % 16 === 0) {
    addDrum(midi, track, DRUM_MAPPING.CRASH, 88 + drive * 20, startTick, TICKS_PER_BEAT * 1.5);
  }

  for (let step = 0; step < totalSteps; step++) {
    const local = step % 32;
    const tick = Math.round(startTick + step * STEP_TICKS + randomBetween(-humanize, humanize));

    if (kicks.includes(local)) {
      addDrum(midi, track, DRUM_MAPPING.KICK, 88 + drive * 28 + (local === 0 ? 10 : 0), tick, STEP_TICKS * 0.84);
    }

    if ([4, 12, 20, 28].includes(local)) {
      addDrum(midi, track, DRUM_MAPPING.SNARE, 104 + drive * 22, tick, STEP_TICKS * 0.92);
      addDrum(midi, track, DRUM_MAPPING.ELECTRIC_SNARE, 34 + drive * 22, tick + 3, STEP_TICKS * 0.76);
    } else if ([7, 11, 23, 27, 31].includes(local) && section.drop && chance(0.08 + drive * 0.16)) {
      addDrum(midi, track, DRUM_MAPPING.SNARE, 20 + drive * 22, tick, STEP_TICKS * 0.34);
    }

    if (section.drums > 0.22 && (step % 2 === 0 || (section.drop && chance(drive * 0.12)))) {
      addDrum(midi, track, DRUM_MAPPING.CLOSED_HH, 38 + drive * 30 + (local % 4 === 0 ? 10 : 0), tick, STEP_TICKS * 0.42);
    }

    if (section.drop && [14, 30].includes(local) && chance(0.22 + config.buildEnergy * 0.28)) {
      addDrum(midi, track, DRUM_MAPPING.OPEN_HH, 48 + drive * 24, tick, STEP_TICKS);
    }

    if (section.drop && config.style === 'rave' && [6, 22].includes(local) && chance(0.2 + config.buildEnergy * 0.22)) {
      addDrum(midi, track, DRUM_MAPPING.RIDE, 34 + drive * 20, tick, STEP_TICKS * 0.72);
    }
  }

  if ((startBar + bars) % 8 === 0 && chance(0.16 + config.buildEnergy * 0.42)) {
    const fillTick = barTick(startBar + bars - 1);
    [11, 13, 14, 15].forEach((step, index) => {
      addDrum(midi, track, index === 1 ? DRUM_MAPPING.LOW_TOM : DRUM_MAPPING.SNARE, 46 + drive * 26 + index * 7, fillTick + step * STEP_TICKS, STEP_TICKS * 0.34);
    });
  }
}

function addChords(
  midi: MidiFile,
  track: MidiTrack,
  degree: number,
  startBar: number,
  bars: number,
  section: Section,
  scale: number[],
  config: DancefloorConfig
) {
  const startTick = barTick(startBar);
  const energy = clamp01(section.chords * 0.7 + config.hookSize * 0.28);
  const chordType = config.style === 'rave' ? 'triad' : '7th';
  const chord = getChord(degree, scale, chordType).map(note => keepInRange(note, 48, 78));

  if (section.drop) {
    for (let bar = 0; bar < bars; bar++) {
      const barStart = barTick(startBar + bar);
      [0, 1.5, 2.5].forEach((beat, beatIndex) => {
        if (beatIndex > 0 && !chance(0.38 + energy * 0.36)) return;
        chord.forEach((note, index) => {
          addNote(midi, track, CHANNELS.chords, note + (beatIndex === 1 && config.style === 'festival' ? 12 : 0), 42 + energy * 32 - index * 3, barStart + beatTick(beat) + index * 8, beatTick(0.85), 8);
        });
      });
    }
    return;
  }

  chord.forEach((note, index) => {
    addNote(midi, track, CHANNELS.chords, note, 36 + energy * 34 - index * 3, startTick + index * 14, barTick(bars) + beatTick(section.breakdown ? 1.5 : 0.5), 12);
  });
}

function addBass(
  midi: MidiFile,
  trackSub: MidiTrack,
  trackBass: MidiTrack,
  degree: number,
  startBar: number,
  bars: number,
  section: Section,
  scale: number[],
  config: DancefloorConfig,
  phraseIndex: number
) {
  if (!section.drop && !chance(section.bass * 0.7)) return;
  if (section.stripEvery && startBar % section.stripEvery === section.stripEvery - 4) return;

  const pattern = BASS_PATTERNS[config.style][phraseIndex % BASS_PATTERNS[config.style].length];
  const lift = clamp01(config.bassLift * 0.72 + section.bass * 0.36);
  const filterStart = 48 + lift * 22;
  const filterPeak = 76 + lift * 32;

  for (let bar = 0; bar < bars; bar++) {
    const barStart = barTick(startBar + bar);
    const root = keepInRange(degreeNote(scale, degree), 24, 40);
    addNote(midi, trackSub, CHANNELS.sub, root, 78 + lift * 26, barStart, section.drop ? beatTick(1.45) : barTick(1), 2);

    pattern.forEach(hit => {
      if (hit.degree !== 0 && !chance(0.34 + lift * 0.44)) return;
      const note = keepInRange(degreeNote(scale, degree + hit.degree), 36, 55);
      const tick = barStart + beatTick(hit.beat);
      const duration = beatTick(hit.duration);
      addNote(midi, trackBass, CHANNELS.bass, note, hit.velocity * lift, tick, duration, 4);
      midi.addControlChange(trackBass, CHANNELS.bass, 74, filterStart, tick);
      midi.addControlChange(trackBass, CHANNELS.bass, 74, filterPeak, tick + Math.round(duration * 0.45));
      midi.addControlChange(trackBass, CHANNELS.bass, 74, filterStart, tick + duration);

      if (hit.degree === 0 || hit.duration > 0.75) {
        addNote(midi, trackSub, CHANNELS.sub, keepInRange(note - 12, 24, 40), 68 + lift * 22, tick, duration * 0.92, 2);
      }
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
  scale: number[],
  config: DancefloorConfig,
  phraseIndex: number
) {
  const hook = clamp01(config.hookSize * 0.7 + section.hook * 0.36);
  if (!section.drop && !section.breakdown && !chance(0.18 + hook * 0.55)) return;

  const shape = HOOK_SHAPES[config.style][phraseIndex % HOOK_SHAPES[config.style].length];
  const rhythm = config.style === 'vocal'
    ? [0.5, 1, 1.5, 2.25, 2.75, 3.25, 3.5, 3.75]
    : config.style === 'rave'
      ? [0, 0.75, 1, 1.5, 2, 2.5, 3, 3.5]
      : [0.5, 1.25, 1.75, 2.5, 3, 3.25, 3.5, 3.75];

  for (let bar = 0; bar < bars; bar += 2) {
    if (bar > 0 && !chance(0.42 + hook * 0.42)) continue;

    shape.forEach((offset, index) => {
      if (index > 5 && !section.drop && !chance(hook * 0.65)) return;
      const note = keepInRange(degreeNote(scale, degree + offset), 60, 88);
      const tick = barTick(startBar + bar) + beatTick(rhythm[index % rhythm.length]);
      const duration = beatTick(config.style === 'vocal' && index % 2 === 0 ? 0.65 : 0.42);
      addNote(midi, track, CHANNELS.lead, note, 50 + hook * 42, tick, duration, 10);

      if (section.drop && config.style !== 'vocal' && index % 4 === 0 && chance(0.3 + hook * 0.32)) {
        addNote(midi, track, CHANNELS.lead, note + 12, 28 + hook * 24, tick, duration * 0.8, 8);
      }
    });
  }
}

function addPlucks(
  midi: MidiFile,
  track: MidiTrack,
  degree: number,
  startBar: number,
  bars: number,
  section: Section,
  scale: number[],
  config: DancefloorConfig
) {
  const amount = clamp01(config.hookSize * 0.45 + config.buildEnergy * 0.4 + section.build * 0.28);
  if (!chance(0.14 + amount * 0.5)) return;

  const pattern = config.style === 'rave' ? [0, 2, 4, 7, 4, 2, 0, 4] : [0, 2, 4, 5, 4, 2, 0, 2];

  for (let bar = 0; bar < bars; bar++) {
    if (section.drop && bar % 2 === 1 && !chance(amount * 0.55)) continue;
    const barStart = barTick(startBar + bar);
    pattern.forEach((offset, index) => {
      if (index > 3 && !chance(0.32 + amount * 0.36)) return;
      const note = keepInRange(degreeNote(scale, degree + offset), 64, 92);
      addNote(midi, track, CHANNELS.plucks, note, 30 + amount * 34, barStart + index * STEP_TICKS * 2, STEP_TICKS * 1.2, 8);
    });
  }
}

function addBuildFx(
  midi: MidiFile,
  trackFx: MidiTrack,
  trackDrums: MidiTrack,
  startBar: number,
  section: Section,
  config: DancefloorConfig,
  scale: number[]
) {
  const build = clamp01(config.buildEnergy * 0.66 + section.build * 0.42);
  const startTick = barTick(startBar);
  const endTick = barTick(startBar + section.bars);

  if (!section.drop && section.build > 0.55) {
    const riserNote = keepInRange(scale[0] + 36, 72, 96);
    addNote(midi, trackFx, CHANNELS.fx, riserNote, 34 + build * 34, startTick, Math.max(BAR_TICKS, barTick(section.bars) - STEP_TICKS), 12);
    midi.addControlChange(trackFx, CHANNELS.fx, 74, 26, startTick);
    midi.addControlChange(trackFx, CHANNELS.fx, 74, 116, Math.max(startTick, endTick - BAR_TICKS));

    for (let bar = 1; bar <= Math.min(section.bars, 4); bar++) {
      const rollStart = endTick - barTick(bar);
      const stepSize = Math.max(1, 5 - bar);
      for (let step = 0; step < 16; step += stepSize) {
        if (chance(0.24 + build * 0.52)) {
          addDrum(midi, trackDrums, DRUM_MAPPING.SNARE, 34 + build * 36 + bar * 4, rollStart + step * STEP_TICKS, STEP_TICKS * 0.3);
        }
      }
    }
  }

  if (section.drop) {
    addNote(midi, trackFx, CHANNELS.fx, keepInRange(scale[0] + 24, 60, 84), 36 + build * 30, startTick, TICKS_PER_BEAT * 1.25, 6);
  }
}

export async function generateDancefloor(
  config: DancefloorConfig,
  onProgress: (status: GenerationStatus) => void
): Promise<Uint8Array> {
  const normalizedConfig: DancefloorConfig = {
    ...config,
    drumDrive: clamp01(config.drumDrive),
    bassLift: clamp01(config.bassLift),
    hookSize: clamp01(config.hookSize),
    buildEnergy: clamp01(config.buildEnergy)
  };
  const midi = new MidiFile(TICKS_PER_BEAT);

  const trackTempo = midi.addTrack('Conductor');
  const trackDrums = midi.addTrack('Polished Dancefloor Drums');
  const trackSub = midi.addTrack('Clean Sub Bass');
  const trackBass = midi.addTrack('Lifted Reese Bass');
  const trackChords = midi.addTrack('Anthem Chords');
  const trackLead = midi.addTrack('Lead Hook');
  const trackPlucks = midi.addTrack('Plucks and Arps');
  const trackFx = midi.addTrack('Builds and FX');

  midi.addTempo(trackTempo, normalizedConfig.bpm, 0);
  configureTrack(midi, trackLead, CHANNELS.lead, GM_PROGRAMS.supersawLead, 88, 70, 54, 28);
  configureTrack(midi, trackSub, CHANNELS.sub, GM_PROGRAMS.subBass, 108, 64, 8, 4);
  configureTrack(midi, trackChords, CHANNELS.chords, normalizedConfig.style === 'rave' ? GM_PROGRAMS.supersawLead : GM_PROGRAMS.warmPad, 86, 50, 76, 44);
  configureTrack(midi, trackBass, CHANNELS.bass, GM_PROGRAMS.sawBass, 98, 64, 14, 12);
  configureTrack(midi, trackPlucks, CHANNELS.plucks, GM_PROGRAMS.pluck, 72, 82, 72, 50);
  configureTrack(midi, trackFx, CHANNELS.fx, GM_PROGRAMS.fx, 72, 64, 88, 34);

  const totalBars = Math.max(1, Math.ceil((normalizedConfig.lengthMinutes * normalizedConfig.bpm) / 4));
  const arrangement = createArrangement(totalBars);
  const progression = pick(PROGRESSIONS[normalizedConfig.style]);
  const scaleBass = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 2);
  const scaleChords = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 4);
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
    addBuildFx(midi, trackFx, trackDrums, currentBar, section, normalizedConfig, scaleLead);

    for (let bar = currentBar; bar < sectionEnd; bar += 2) {
      const bars = Math.min(2, sectionEnd - bar);
      addDancefloorDrums(midi, trackDrums, bar, bars, section, normalizedConfig, phraseIndex);
      phraseIndex++;
    }

    for (let bar = currentBar; bar < sectionEnd; bar += 4) {
      const bars = Math.min(4, sectionEnd - bar);
      const degree = progressionDegree(bar, progression);
      addChords(midi, trackChords, degree, bar, bars, section, scaleChords, normalizedConfig);
      addBass(midi, trackSub, trackBass, degree, bar, bars, section, scaleBass, normalizedConfig, phraseIndex);
      addLeadHook(midi, trackLead, degree, bar, bars, section, scaleLead, normalizedConfig, phraseIndex);
      addPlucks(midi, trackPlucks, degree, bar, bars, section, scaleLead, normalizedConfig);
    }

    currentBar += section.bars;
  }

  onProgress({ isGenerating: false, progress: 100, message: 'Finalizing dancefloor MIDI...' });
  return midi.generate();
}
