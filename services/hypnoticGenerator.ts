import { MidiFile } from '../utils/midiEncoder';
import { DRUM_MAPPING, getChord, getScaleNotes } from '../utils/musicTheory';
import { GenerationStatus, HypnoticConfig, MidiTrack } from '../types';

const TICKS_PER_BEAT = 480;
const BAR_TICKS = TICKS_PER_BEAT * 4;
const STEP_TICKS = TICKS_PER_BEAT / 4;

const CHANNELS = {
  stabs: 0,
  rumble: 1,
  pulse: 2,
  sequence: 3,
  percussion: 4,
  fx: 5,
  drums: 9
};

const GM_PROGRAMS = {
  stab: 88,
  rumble: 38,
  pulse: 39,
  sequence: 81,
  percussion: 118,
  fx: 97
};

type Section = {
  name: string;
  bars: number;
  drums: number;
  rumble: number;
  sequence: number;
  stabs: number;
  space: number;
  break?: boolean;
  peak?: boolean;
};

type StepHit = {
  step: number;
  duration: number;
  degree: number;
  octave: number;
  velocity: number;
  probability?: number;
};

const SEQUENCES: Record<HypnoticConfig['style'], StepHit[][]> = {
  deep: [
    [
      { step: 0, duration: 2, degree: 0, octave: 3, velocity: 72 },
      { step: 6, duration: 1, degree: 2, octave: 3, velocity: 54, probability: 0.62 },
      { step: 10, duration: 2, degree: 0, octave: 3, velocity: 68 },
      { step: 14, duration: 1, degree: 4, octave: 3, velocity: 52, probability: 0.5 }
    ],
    [
      { step: 2, duration: 2, degree: 0, octave: 3, velocity: 66 },
      { step: 8, duration: 2, degree: 3, octave: 3, velocity: 58, probability: 0.65 },
      { step: 12, duration: 2, degree: 0, octave: 3, velocity: 70 }
    ]
  ],
  berlin: [
    [
      { step: 0, duration: 1, degree: 0, octave: 3, velocity: 78 },
      { step: 3, duration: 1, degree: 2, octave: 3, velocity: 60, probability: 0.6 },
      { step: 6, duration: 2, degree: 0, octave: 3, velocity: 72 },
      { step: 11, duration: 1, degree: 4, octave: 3, velocity: 62, probability: 0.72 },
      { step: 14, duration: 1, degree: 0, octave: 4, velocity: 54, probability: 0.5 }
    ],
    [
      { step: 1, duration: 1, degree: 0, octave: 3, velocity: 72 },
      { step: 5, duration: 2, degree: 3, octave: 3, velocity: 64, probability: 0.66 },
      { step: 9, duration: 1, degree: 0, octave: 3, velocity: 70 },
      { step: 13, duration: 1, degree: 5, octave: 3, velocity: 60, probability: 0.58 }
    ]
  ],
  acid: [
    [
      { step: 0, duration: 1, degree: 0, octave: 3, velocity: 82 },
      { step: 2, duration: 1, degree: 1, octave: 3, velocity: 56, probability: 0.52 },
      { step: 4, duration: 1, degree: 3, octave: 3, velocity: 66 },
      { step: 7, duration: 1, degree: 0, octave: 4, velocity: 58, probability: 0.72 },
      { step: 10, duration: 2, degree: 0, octave: 3, velocity: 78 },
      { step: 14, duration: 1, degree: 5, octave: 3, velocity: 58, probability: 0.58 }
    ],
    [
      { step: 0, duration: 1, degree: 0, octave: 3, velocity: 80 },
      { step: 3, duration: 1, degree: 2, octave: 3, velocity: 60, probability: 0.7 },
      { step: 6, duration: 1, degree: 4, octave: 3, velocity: 66 },
      { step: 9, duration: 1, degree: 0, octave: 4, velocity: 58, probability: 0.64 },
      { step: 12, duration: 2, degree: 0, octave: 3, velocity: 78 }
    ]
  ],
  dub: [
    [
      { step: 2, duration: 2, degree: 0, octave: 3, velocity: 62 },
      { step: 8, duration: 2, degree: 4, octave: 3, velocity: 54, probability: 0.55 },
      { step: 14, duration: 1, degree: 2, octave: 3, velocity: 48, probability: 0.42 }
    ],
    [
      { step: 0, duration: 3, degree: 0, octave: 3, velocity: 64 },
      { step: 10, duration: 2, degree: 3, octave: 3, velocity: 52, probability: 0.5 }
    ]
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

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function barTick(bar: number): number {
  return Math.round(bar * BAR_TICKS);
}

function beatTick(beat: number): number {
  return Math.round(beat * TICKS_PER_BEAT);
}

function stepTick(step: number): number {
  return Math.round(step * STEP_TICKS);
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
  if (totalBars <= 32) {
    return [
      { name: 'locked groove', bars: totalBars, drums: 0.9, rumble: 0.9, sequence: 0.85, stabs: 0.34, space: 0.45, peak: true }
    ];
  }

  const cycle: Section[] = [
    { name: 'machine intro', bars: 16, drums: 0.42, rumble: 0.28, sequence: 0.35, stabs: 0.12, space: 0.42 },
    { name: 'low pressure', bars: 32, drums: 0.78, rumble: 0.78, sequence: 0.72, stabs: 0.2, space: 0.45 },
    { name: 'phase peak', bars: 32, drums: 0.96, rumble: 0.95, sequence: 0.95, stabs: 0.42, space: 0.56, peak: true },
    { name: 'filter break', bars: 16, drums: 0.18, rumble: 0.28, sequence: 0.52, stabs: 0.5, space: 0.82, break: true },
    { name: 'return peak', bars: 32, drums: 1, rumble: 1, sequence: 1, stabs: 0.48, space: 0.62, peak: true },
    { name: 'tape outro', bars: 16, drums: 0.46, rumble: 0.3, sequence: 0.32, stabs: 0.2, space: 0.72 }
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

function addDrumMachine(
  midi: MidiFile,
  trackDrums: MidiTrack,
  trackPerc: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  config: HypnoticConfig
) {
  const drive = clamp01(config.drive * 0.72 + section.drums * 0.36);
  const perc = clamp01(config.percussion * 0.7 + section.drums * 0.28);

  for (let bar = 0; bar < bars; bar++) {
    const barStart = barTick(startBar + bar);

    for (let beat = 0; beat < 4; beat++) {
      addDrum(midi, trackDrums, DRUM_MAPPING.KICK, 92 + drive * 30, barStart + beatTick(beat), STEP_TICKS * 1.25);
    }

    if (!section.break && chance(0.22 + drive * 0.34)) {
      addDrum(midi, trackDrums, DRUM_MAPPING.RIMSHOT, 34 + drive * 28, barStart + beatTick(1), STEP_TICKS * 0.42);
      addDrum(midi, trackDrums, DRUM_MAPPING.RIMSHOT, 30 + drive * 24, barStart + beatTick(3), STEP_TICKS * 0.42);
    }

    for (let step = 2; step < 16; step += 4) {
      if (chance(0.5 + perc * 0.42)) {
        addDrum(midi, trackDrums, DRUM_MAPPING.OPEN_HH, 42 + perc * 30, barStart + stepTick(step), STEP_TICKS * 0.86);
      }
    }

    for (let step = 0; step < 16; step++) {
      if (step % 4 === 0) continue;
      if (chance(0.1 + perc * 0.34 + (section.peak ? 0.08 : 0))) {
        addDrum(midi, trackPerc, step % 2 === 0 ? DRUM_MAPPING.CLOSED_HH : DRUM_MAPPING.SHAKER, 18 + perc * 34, barStart + stepTick(step), STEP_TICKS * 0.34);
      }
    }

    if (section.peak && bar % 8 === 7 && chance(0.24 + config.percussion * 0.34)) {
      [12, 13, 14, 15].forEach((step, index) => {
        addDrum(midi, trackDrums, index % 2 === 0 ? DRUM_MAPPING.LOW_TOM : DRUM_MAPPING.MID_TOM, 42 + drive * 26 + index * 4, barStart + stepTick(step), STEP_TICKS * 0.42);
      });
    }
  }
}

function addRumble(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  scale: number[],
  config: HypnoticConfig
) {
  const amount = clamp01(config.drive * 0.54 + section.rumble * 0.48);
  const root = keepInRange(scale[0], 24, 36);

  for (let bar = 0; bar < bars; bar++) {
    const barStart = barTick(startBar + bar);
    for (let beat = 0; beat < 4; beat++) {
      const tick = barStart + beatTick(beat + 0.18);
      const duration = beatTick(config.style === 'dub' ? 0.72 : 0.58);
      addNote(midi, track, CHANNELS.rumble, root, 50 + amount * 42, tick, duration, 2);
      midi.addControlChange(track, CHANNELS.rumble, 74, 34 + amount * 18, tick);
      midi.addControlChange(track, CHANNELS.rumble, 74, 66 + amount * 34, tick + Math.round(duration * 0.45));
      midi.addControlChange(track, CHANNELS.rumble, 74, 28 + amount * 12, tick + duration);
    }
  }
}

function addPulse(
  midi: MidiFile,
  trackPulse: MidiTrack,
  trackSequence: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  scale: number[],
  config: HypnoticConfig,
  phraseIndex: number
) {
  const hypnosis = clamp01(config.hypnosis * 0.7 + section.sequence * 0.34);
  const patterns = SEQUENCES[config.style];
  const pattern = patterns[phraseIndex % patterns.length];

  for (let bar = 0; bar < bars; bar++) {
    const barStart = barTick(startBar + bar);
    const mutation = (startBar + bar) % 16 === 12 && chance(hypnosis * 0.5) ? 1 : 0;

    pattern.forEach(hit => {
      if (!chance((hit.probability ?? 1) * (0.45 + hypnosis * 0.72))) return;
      const note = keepInRange(degreeNote(scale, hit.degree + mutation) + (hit.octave - 3) * 12, 36, 74);
      const channel = hit.octave <= 3 ? CHANNELS.pulse : CHANNELS.sequence;
      const track = hit.octave <= 3 ? trackPulse : trackSequence;
      const tick = barStart + stepTick((hit.step + phraseIndex) % 16);
      const duration = stepTick(hit.duration);

      addNote(midi, track, channel, note, hit.velocity + hypnosis * 20, tick, duration, 4);
      midi.addControlChange(track, channel, 74, 44 + hypnosis * 20, tick);
      midi.addControlChange(track, channel, 74, 78 + hypnosis * 34, tick + Math.round(duration * 0.55));
      midi.addControlChange(track, channel, 71, 38 + hypnosis * 44, tick);
    });
  }
}

function addStabs(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  bars: number,
  section: Section,
  scale: number[],
  config: HypnoticConfig
) {
  const space = clamp01(config.space * 0.68 + section.space * 0.4);
  if (!chance(0.12 + section.stabs * 0.7 + (config.style === 'dub' ? 0.24 : 0))) return;

  for (let bar = 0; bar < bars; bar += config.style === 'dub' ? 2 : 4) {
    const barStart = barTick(startBar + bar);
    const degree = config.scaleType === 'phrygian' ? 1 : 0;
    const chordType: 'triad' | '7th' = config.style === 'dub' ? '7th' : 'triad';
    const chord = getChord(degree, scale, chordType).map(note => keepInRange(note, 48, 76));
    const beat = config.style === 'dub' ? 1.5 : 2.5;

    chord.forEach((note, index) => {
      addNote(midi, track, CHANNELS.stabs, note, 32 + space * 38 - index * 3, barStart + beatTick(beat) + index * 8, beatTick(config.style === 'dub' ? 1.2 : 0.55), 10);
    });
    midi.addControlChange(track, CHANNELS.stabs, 91, 70 + space * 46, barStart);
    midi.addControlChange(track, CHANNELS.stabs, 74, 42 + space * 62, barStart);
  }
}

function addFx(
  midi: MidiFile,
  track: MidiTrack,
  startBar: number,
  section: Section,
  scale: number[],
  config: HypnoticConfig
) {
  const space = clamp01(config.space * 0.65 + section.space * 0.42);
  const startTick = barTick(startBar);
  const endTick = barTick(startBar + section.bars);

  if (section.break || section.peak || chance(space * 0.35)) {
    const note = keepInRange(scale[0] + 36, 72, 96);
    addNote(midi, track, CHANNELS.fx, note, 24 + space * 36, startTick, Math.max(BAR_TICKS, barTick(section.bars) - STEP_TICKS), 18);
    midi.addControlChange(track, CHANNELS.fx, 74, section.break ? 24 : 40, startTick);
    midi.addControlChange(track, CHANNELS.fx, 74, 84 + space * 32, Math.max(startTick, endTick - BAR_TICKS * 2));
    midi.addControlChange(track, CHANNELS.fx, 91, 86 + space * 32, startTick);
  }
}

export async function generateHypnoticTechno(
  config: HypnoticConfig,
  onProgress: (status: GenerationStatus) => void
): Promise<Uint8Array> {
  const normalizedConfig: HypnoticConfig = {
    ...config,
    drive: clamp01(config.drive),
    hypnosis: clamp01(config.hypnosis),
    percussion: clamp01(config.percussion),
    space: clamp01(config.space)
  };
  const midi = new MidiFile(TICKS_PER_BEAT);

  const trackTempo = midi.addTrack('Conductor');
  const trackDrums = midi.addTrack('909 Kick and Hats');
  const trackPercussion = midi.addTrack('Shakers and Percussion');
  const trackRumble = midi.addTrack('Rumble Sub');
  const trackPulse = midi.addTrack('Low Pulse');
  const trackSequence = midi.addTrack('Hypnotic Sequence');
  const trackStabs = midi.addTrack('Dub Stabs');
  const trackFx = midi.addTrack('Filter FX');

  midi.addTempo(trackTempo, normalizedConfig.bpm, 0);
  configureTrack(midi, trackStabs, CHANNELS.stabs, GM_PROGRAMS.stab, 78, 72, 92, 34);
  configureTrack(midi, trackRumble, CHANNELS.rumble, GM_PROGRAMS.rumble, 104, 64, 18, 6);
  configureTrack(midi, trackPulse, CHANNELS.pulse, GM_PROGRAMS.pulse, 90, 58, 28, 10);
  configureTrack(midi, trackSequence, CHANNELS.sequence, normalizedConfig.style === 'acid' ? 38 : GM_PROGRAMS.sequence, 82, 78, 58, 34);
  configureTrack(midi, trackPercussion, CHANNELS.percussion, GM_PROGRAMS.percussion, 76, 44, 48, 16);
  configureTrack(midi, trackFx, CHANNELS.fx, GM_PROGRAMS.fx, 68, 64, 108, 42);

  const totalBars = Math.max(1, Math.ceil((normalizedConfig.lengthMinutes * normalizedConfig.bpm) / 4));
  const arrangement = createArrangement(totalBars);
  const scaleLow = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 2);
  const scaleMid = getScaleNotes(normalizedConfig.scaleRoot, normalizedConfig.scaleType, 4);

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

    addFx(midi, trackFx, currentBar, section, scaleMid, normalizedConfig);

    for (let bar = currentBar; bar < sectionEnd; bar += 4) {
      const bars = Math.min(4, sectionEnd - bar);
      addDrumMachine(midi, trackDrums, trackPercussion, bar, bars, section, normalizedConfig);
      addRumble(midi, trackRumble, bar, bars, section, scaleLow, normalizedConfig);
      addPulse(midi, trackPulse, trackSequence, bar, bars, section, scaleMid, normalizedConfig, phraseIndex);
      addStabs(midi, trackStabs, bar, bars, section, scaleMid, normalizedConfig);
      phraseIndex++;
    }

    currentBar += section.bars;
  }

  onProgress({ isGenerating: false, progress: 100, message: 'Finalizing hypnotic techno MIDI...' });
  return midi.generate();
}
