import { ParsedMidi, ParsedNote } from '../utils/midiParser';

/**
 * A small Web Audio synthesizer that renders parsed MIDI in the browser.
 * Every instrument is synthesized from oscillators and noise, so playback
 * needs no samples, no soundfont and no network access.
 */

export type InstrumentId =
  | 'subBass'
  | 'reeseBass'
  | 'wobbleBass'
  | 'growlBass'
  | 'acidBass'
  | 'riddimBass'
  | 'talkingBass'
  | 'screechBass'
  | 'metalBass'
  | 'hooverBass'
  | 'bass808'
  | 'laserBass'
  | 'rumbleSub'
  | 'dubStab'
  | 'analogStab'
  | 'blipSeq'
  | 'droneAtmos'
  | 'metalPerc'
  | 'pluck'
  | 'sawLead'
  | 'squareLead'
  | 'ePiano'
  | 'organ'
  | 'bell'
  | 'marimba'
  | 'warmPad'
  | 'glassPad'
  | 'strings'
  | 'choir'
  | 'sweepFx'
  | 'drumKit'
  | 'drum909'
  | 'drumRiddim';

export interface InstrumentOption {
  id: InstrumentId;
  label: string;
  group: 'Bass' | 'Dubstep' | 'Techno' | 'Lead' | 'Keys' | 'Pad' | 'FX' | 'Drums';
}

type OscLayer = {
  type: OscillatorType;
  detune?: number; // cents
  octave?: number;
  gain: number;
};

/** LFO rate is either free running (Hz) or locked to the song tempo (cycles per beat). */
type LfoSpec = {
  rate?: number;
  sync?: number;
  depth: number;
  type?: OscillatorType;
};

type Preset = {
  label: string;
  group: InstrumentOption['group'];
  oscillators: OscLayer[];
  noise?: number; // noise layer gain
  octave?: number; // whole-instrument transpose
  filterType: BiquadFilterType;
  cutoff: number; // Hz at the envelope floor
  cutoffEnv: number; // Hz added by the filter envelope
  resonance: number;
  attack: number;
  decay: number;
  sustain: number; // 0-1
  release: number;
  gain: number;
  reverb: number; // 0-1 send amount
  delay?: number; // 0-1 send amount into the tempo delay
  drive?: number; // waveshaper amount, 0-1
  vibrato?: { rate: number; depth: number };
  filterLfo?: LfoSpec;
  ampLfo?: LfoSpec; // gates and tremolo; square waves give the riddim chop
  ringMod?: { ratio: number; depth: number };
  formants?: { low: number; high: number; q: number; sweep?: LfoSpec };
  pitchEnv?: { semitones: number; time: number };
  keyTracking?: number; // how much cutoff follows pitch (0-1)
  maxDuration?: number;
};

const PRESETS: Record<Exclude<InstrumentId, DrumKitId>, Preset> = {
  subBass: {
    label: 'Sub Bass',
    group: 'Bass',
    oscillators: [
      { type: 'sine', gain: 1 },
      { type: 'sine', octave: 1, gain: 0.18 }
    ],
    filterType: 'lowpass',
    cutoff: 180,
    cutoffEnv: 240,
    resonance: 0.6,
    attack: 0.012,
    decay: 0.25,
    sustain: 0.85,
    release: 0.09,
    gain: 0.85,
    reverb: 0.02
  },
  reeseBass: {
    label: 'Reese Bass',
    group: 'Bass',
    oscillators: [
      { type: 'sawtooth', detune: -14, gain: 0.5 },
      { type: 'sawtooth', detune: 16, gain: 0.5 },
      { type: 'sine', octave: -1, gain: 0.5 }
    ],
    filterType: 'lowpass',
    cutoff: 240,
    cutoffEnv: 900,
    resonance: 5,
    attack: 0.02,
    decay: 0.4,
    sustain: 0.7,
    release: 0.12,
    gain: 0.5,
    reverb: 0.06,
    filterLfo: { rate: 0.9, depth: 260 }
  },
  wobbleBass: {
    label: 'Wobble Bass',
    group: 'Bass',
    oscillators: [
      { type: 'sawtooth', detune: -8, gain: 0.55 },
      { type: 'square', detune: 9, gain: 0.35 },
      { type: 'sine', octave: -1, gain: 0.45 }
    ],
    filterType: 'lowpass',
    cutoff: 190,
    cutoffEnv: 1800,
    resonance: 11,
    attack: 0.008,
    decay: 0.3,
    sustain: 0.8,
    release: 0.08,
    gain: 0.44,
    reverb: 0.05,
    filterLfo: { sync: 2, depth: 900 }
  },
  growlBass: {
    label: 'Neuro Growl',
    group: 'Bass',
    oscillators: [
      { type: 'square', detune: -6, gain: 0.4 },
      { type: 'sawtooth', detune: 11, gain: 0.45 },
      { type: 'triangle', octave: -1, gain: 0.4 }
    ],
    noise: 0.05,
    filterType: 'bandpass',
    cutoff: 260,
    cutoffEnv: 2600,
    resonance: 9,
    attack: 0.006,
    decay: 0.22,
    sustain: 0.62,
    release: 0.09,
    gain: 0.5,
    reverb: 0.07,
    drive: 0.35,
    filterLfo: { sync: 4, depth: 1100 }
  },
  acidBass: {
    label: 'Acid 303',
    group: 'Bass',
    oscillators: [{ type: 'sawtooth', gain: 0.9 }],
    filterType: 'lowpass',
    cutoff: 220,
    cutoffEnv: 3200,
    resonance: 16,
    attack: 0.004,
    decay: 0.28,
    sustain: 0.18,
    release: 0.08,
    gain: 0.48,
    reverb: 0.12,
    drive: 0.25,
    keyTracking: 0.5
  },

  // --- Dubstep / riddim / neuro ---
  riddimBass: {
    label: 'Riddim Gate',
    group: 'Dubstep',
    oscillators: [
      { type: 'square', detune: -7, gain: 0.4 },
      { type: 'sawtooth', detune: 8, gain: 0.4 },
      { type: 'sine', octave: -1, gain: 0.5 }
    ],
    filterType: 'lowpass',
    cutoff: 170,
    cutoffEnv: 2400,
    resonance: 12,
    attack: 0.004,
    decay: 0.18,
    sustain: 0.9,
    release: 0.06,
    gain: 0.6,
    reverb: 0.04,
    drive: 0.55,
    ampLfo: { sync: 3, depth: 0.5, type: 'square' },
    filterLfo: { sync: 3, depth: 1200, type: 'square' }
  },
  talkingBass: {
    label: 'Talking Growl',
    group: 'Dubstep',
    oscillators: [
      { type: 'sawtooth', detune: -9, gain: 0.45 },
      { type: 'square', detune: 10, gain: 0.35 },
      { type: 'sine', octave: -1, gain: 0.4 }
    ],
    filterType: 'lowpass',
    cutoff: 320,
    cutoffEnv: 1400,
    resonance: 4,
    attack: 0.008,
    decay: 0.25,
    sustain: 0.8,
    release: 0.08,
    gain: 0.62,
    reverb: 0.08,
    drive: 0.45,
    formants: { low: 620, high: 1900, q: 7, sweep: { sync: 1, depth: 900 } }
  },
  screechBass: {
    label: 'Screech',
    group: 'Dubstep',
    oscillators: [
      { type: 'sawtooth', detune: -12, gain: 0.34 },
      { type: 'sawtooth', detune: 13, gain: 0.34 },
      { type: 'square', octave: 1, gain: 0.2 }
    ],
    octave: 1,
    filterType: 'bandpass',
    cutoff: 900,
    cutoffEnv: 5200,
    resonance: 14,
    attack: 0.01,
    decay: 0.4,
    sustain: 0.55,
    release: 0.14,
    gain: 0.38,
    reverb: 0.18,
    delay: 0.15,
    drive: 0.5,
    filterLfo: { sync: 0.5, depth: 2200 }
  },
  metalBass: {
    label: 'Metal Ring',
    group: 'Dubstep',
    oscillators: [
      { type: 'square', gain: 0.5 },
      { type: 'triangle', octave: -1, gain: 0.4 }
    ],
    filterType: 'lowpass',
    cutoff: 400,
    cutoffEnv: 3000,
    resonance: 7,
    attack: 0.004,
    decay: 0.22,
    sustain: 0.45,
    release: 0.1,
    gain: 0.5,
    reverb: 0.12,
    drive: 0.4,
    ringMod: { ratio: 2.51, depth: 0.7 }
  },
  hooverBass: {
    label: 'Hoover',
    group: 'Dubstep',
    oscillators: [
      { type: 'sawtooth', detune: -18, gain: 0.3 },
      { type: 'sawtooth', detune: 4, gain: 0.3 },
      { type: 'square', detune: 20, gain: 0.24 }
    ],
    filterType: 'lowpass',
    cutoff: 380,
    cutoffEnv: 3400,
    resonance: 8,
    attack: 0.012,
    decay: 0.5,
    sustain: 0.6,
    release: 0.16,
    gain: 0.42,
    reverb: 0.2,
    drive: 0.3,
    pitchEnv: { semitones: 7, time: 0.14 },
    vibrato: { rate: 5.5, depth: 12 }
  },
  bass808: {
    label: '808 Drop',
    group: 'Dubstep',
    oscillators: [
      { type: 'sine', gain: 1 },
      { type: 'triangle', gain: 0.12 }
    ],
    filterType: 'lowpass',
    cutoff: 220,
    cutoffEnv: 320,
    resonance: 1.2,
    attack: 0.005,
    decay: 0.9,
    sustain: 0.55,
    release: 0.35,
    gain: 0.9,
    reverb: 0.03,
    drive: 0.18,
    pitchEnv: { semitones: 14, time: 0.07 }
  },
  laserBass: {
    label: 'Laser Wub',
    group: 'Dubstep',
    oscillators: [
      { type: 'sawtooth', detune: -6, gain: 0.42 },
      { type: 'square', detune: 7, gain: 0.32 },
      { type: 'sine', octave: -1, gain: 0.45 }
    ],
    filterType: 'lowpass',
    cutoff: 200,
    cutoffEnv: 2600,
    resonance: 15,
    attack: 0.005,
    decay: 0.2,
    sustain: 0.85,
    release: 0.07,
    gain: 0.5,
    reverb: 0.06,
    drive: 0.4,
    pitchEnv: { semitones: 5, time: 0.09 },
    filterLfo: { sync: 6, depth: 1500 }
  },

  // --- Hypnotic techno ---
  rumbleSub: {
    label: 'Techno Rumble',
    group: 'Techno',
    oscillators: [
      { type: 'sine', gain: 0.9 },
      { type: 'triangle', detune: 9, gain: 0.3 },
      { type: 'sine', octave: 1, detune: -6, gain: 0.12 }
    ],
    noise: 0.03,
    filterType: 'lowpass',
    cutoff: 130,
    cutoffEnv: 420,
    resonance: 3.4,
    attack: 0.03,
    decay: 0.6,
    sustain: 0.8,
    release: 0.55,
    gain: 0.7,
    reverb: 0.3,
    drive: 0.2,
    filterLfo: { sync: 0.25, depth: 90 }
  },
  dubStab: {
    label: 'Dub Chord Stab',
    group: 'Techno',
    oscillators: [
      { type: 'sawtooth', detune: -10, gain: 0.3 },
      { type: 'square', detune: 9, gain: 0.24 },
      { type: 'triangle', octave: 1, gain: 0.12 }
    ],
    filterType: 'lowpass',
    cutoff: 520,
    cutoffEnv: 2200,
    resonance: 5,
    attack: 0.006,
    decay: 0.24,
    sustain: 0.03,
    release: 0.3,
    gain: 0.3,
    reverb: 0.6,
    delay: 0.55,
    maxDuration: 0.6
  },
  analogStab: {
    label: 'Analog Stab',
    group: 'Techno',
    oscillators: [
      { type: 'sawtooth', detune: -8, gain: 0.34 },
      { type: 'sawtooth', detune: 9, gain: 0.34 },
      { type: 'square', octave: -1, gain: 0.18 }
    ],
    filterType: 'lowpass',
    cutoff: 640,
    cutoffEnv: 2800,
    resonance: 6,
    attack: 0.008,
    decay: 0.32,
    sustain: 0.35,
    release: 0.18,
    gain: 0.38,
    reverb: 0.3,
    delay: 0.2,
    drive: 0.2,
    keyTracking: 0.4
  },
  blipSeq: {
    label: 'FM Blip',
    group: 'Techno',
    oscillators: [
      { type: 'sine', gain: 0.6 },
      { type: 'triangle', octave: 1, gain: 0.2 }
    ],
    filterType: 'bandpass',
    cutoff: 1200,
    cutoffEnv: 2600,
    resonance: 3,
    attack: 0.002,
    decay: 0.16,
    sustain: 0.02,
    release: 0.14,
    gain: 0.44,
    reverb: 0.35,
    delay: 0.45,
    ringMod: { ratio: 3.02, depth: 0.5 },
    maxDuration: 0.5
  },
  droneAtmos: {
    label: 'Dark Drone',
    group: 'Techno',
    oscillators: [
      { type: 'sawtooth', octave: -1, detune: -7, gain: 0.22 },
      { type: 'triangle', detune: 8, gain: 0.2 }
    ],
    noise: 0.16,
    filterType: 'lowpass',
    cutoff: 300,
    cutoffEnv: 1400,
    resonance: 6,
    attack: 0.9,
    decay: 2.2,
    sustain: 0.7,
    release: 2,
    gain: 0.4,
    reverb: 0.75,
    delay: 0.25,
    filterLfo: { sync: 0.0625, depth: 500 }
  },
  metalPerc: {
    label: 'Metal Perc',
    group: 'Techno',
    oscillators: [
      { type: 'square', gain: 0.4 },
      { type: 'square', detune: 31, octave: 1, gain: 0.24 }
    ],
    filterType: 'highpass',
    cutoff: 1400,
    cutoffEnv: 3200,
    resonance: 2,
    attack: 0.001,
    decay: 0.12,
    sustain: 0.01,
    release: 0.12,
    gain: 0.36,
    reverb: 0.45,
    delay: 0.35,
    ringMod: { ratio: 4.7, depth: 0.8 },
    maxDuration: 0.4
  },

  // --- Melodic ---
  pluck: {
    label: 'Pluck',
    group: 'Lead',
    oscillators: [
      { type: 'sawtooth', detune: -7, gain: 0.4 },
      { type: 'triangle', detune: 7, gain: 0.4 }
    ],
    filterType: 'lowpass',
    cutoff: 700,
    cutoffEnv: 4200,
    resonance: 4,
    attack: 0.003,
    decay: 0.28,
    sustain: 0.02,
    release: 0.22,
    gain: 0.36,
    reverb: 0.3,
    keyTracking: 0.6,
    maxDuration: 1.2
  },
  sawLead: {
    label: 'Saw Lead',
    group: 'Lead',
    oscillators: [
      { type: 'sawtooth', detune: -11, gain: 0.35 },
      { type: 'sawtooth', detune: 12, gain: 0.35 },
      { type: 'sawtooth', octave: 1, gain: 0.16 }
    ],
    filterType: 'lowpass',
    cutoff: 900,
    cutoffEnv: 3800,
    resonance: 3,
    attack: 0.02,
    decay: 0.5,
    sustain: 0.6,
    release: 0.2,
    gain: 0.3,
    reverb: 0.22,
    vibrato: { rate: 5.2, depth: 6 },
    keyTracking: 0.5
  },
  squareLead: {
    label: 'Square Lead',
    group: 'Lead',
    oscillators: [
      { type: 'square', detune: -5, gain: 0.4 },
      { type: 'square', detune: 6, gain: 0.3 }
    ],
    filterType: 'lowpass',
    cutoff: 800,
    cutoffEnv: 3000,
    resonance: 4,
    attack: 0.012,
    decay: 0.4,
    sustain: 0.55,
    release: 0.16,
    gain: 0.28,
    reverb: 0.24,
    keyTracking: 0.5
  },
  ePiano: {
    label: 'Electric Piano',
    group: 'Keys',
    oscillators: [
      { type: 'sine', gain: 0.6 },
      { type: 'sine', octave: 1, gain: 0.22 },
      { type: 'triangle', octave: 2, gain: 0.08 }
    ],
    filterType: 'lowpass',
    cutoff: 1400,
    cutoffEnv: 2600,
    resonance: 1,
    attack: 0.005,
    decay: 0.9,
    sustain: 0.25,
    release: 0.5,
    gain: 0.42,
    reverb: 0.3,
    keyTracking: 0.4
  },
  organ: {
    label: 'Organ',
    group: 'Keys',
    oscillators: [
      { type: 'sine', gain: 0.5 },
      { type: 'sine', octave: 1, gain: 0.3 },
      { type: 'sine', octave: 2, detune: 4, gain: 0.16 }
    ],
    filterType: 'lowpass',
    cutoff: 2200,
    cutoffEnv: 1200,
    resonance: 0.8,
    attack: 0.015,
    decay: 0.15,
    sustain: 0.9,
    release: 0.12,
    gain: 0.32,
    reverb: 0.25
  },
  bell: {
    label: 'Bell',
    group: 'Keys',
    oscillators: [
      { type: 'sine', gain: 0.5 },
      { type: 'sine', octave: 1, detune: 6, gain: 0.3 },
      { type: 'sine', octave: 2, detune: -8, gain: 0.14 }
    ],
    filterType: 'lowpass',
    cutoff: 2600,
    cutoffEnv: 2600,
    resonance: 1,
    attack: 0.002,
    decay: 1.4,
    sustain: 0.05,
    release: 1.1,
    gain: 0.3,
    reverb: 0.45,
    maxDuration: 2.4
  },
  marimba: {
    label: 'Marimba',
    group: 'Keys',
    oscillators: [
      { type: 'sine', gain: 0.7 },
      { type: 'triangle', octave: 2, gain: 0.12 }
    ],
    filterType: 'lowpass',
    cutoff: 1800,
    cutoffEnv: 2200,
    resonance: 1.4,
    attack: 0.002,
    decay: 0.34,
    sustain: 0.01,
    release: 0.22,
    gain: 0.44,
    reverb: 0.28,
    maxDuration: 0.9
  },
  warmPad: {
    label: 'Warm Pad',
    group: 'Pad',
    oscillators: [
      { type: 'sawtooth', detune: -9, gain: 0.3 },
      { type: 'sawtooth', detune: 10, gain: 0.3 },
      { type: 'triangle', octave: -1, gain: 0.25 }
    ],
    filterType: 'lowpass',
    cutoff: 420,
    cutoffEnv: 1500,
    resonance: 1.6,
    attack: 0.5,
    decay: 1.4,
    sustain: 0.7,
    release: 1.3,
    gain: 0.26,
    reverb: 0.55,
    filterLfo: { rate: 0.11, depth: 200 }
  },
  glassPad: {
    label: 'Glass Pad',
    group: 'Pad',
    oscillators: [
      { type: 'triangle', detune: -6, gain: 0.3 },
      { type: 'sine', octave: 1, detune: 8, gain: 0.24 },
      { type: 'sine', octave: 2, gain: 0.08 }
    ],
    noise: 0.02,
    filterType: 'lowpass',
    cutoff: 900,
    cutoffEnv: 2400,
    resonance: 2.2,
    attack: 0.7,
    decay: 1.8,
    sustain: 0.6,
    release: 1.8,
    gain: 0.24,
    reverb: 0.7,
    filterLfo: { rate: 0.16, depth: 320 }
  },
  strings: {
    label: 'Strings',
    group: 'Pad',
    oscillators: [
      { type: 'sawtooth', detune: -13, gain: 0.28 },
      { type: 'sawtooth', detune: 5, gain: 0.28 },
      { type: 'sawtooth', detune: 15, gain: 0.22 }
    ],
    filterType: 'lowpass',
    cutoff: 600,
    cutoffEnv: 1600,
    resonance: 1.2,
    attack: 0.28,
    decay: 1.1,
    sustain: 0.75,
    release: 0.7,
    gain: 0.24,
    reverb: 0.5,
    vibrato: { rate: 4.6, depth: 5 }
  },
  choir: {
    label: 'Choir',
    group: 'Pad',
    oscillators: [
      { type: 'triangle', detune: -8, gain: 0.32 },
      { type: 'triangle', detune: 9, gain: 0.32 },
      { type: 'sine', octave: 1, gain: 0.14 }
    ],
    noise: 0.015,
    filterType: 'bandpass',
    cutoff: 700,
    cutoffEnv: 900,
    resonance: 2.6,
    attack: 0.45,
    decay: 1.2,
    sustain: 0.72,
    release: 1.1,
    gain: 0.3,
    reverb: 0.65,
    vibrato: { rate: 5, depth: 7 }
  },
  sweepFx: {
    label: 'Noise Sweep',
    group: 'FX',
    oscillators: [{ type: 'sawtooth', gain: 0.12 }],
    noise: 0.55,
    filterType: 'bandpass',
    cutoff: 500,
    cutoffEnv: 6000,
    resonance: 4,
    attack: 0.25,
    decay: 1.2,
    sustain: 0.5,
    release: 0.6,
    gain: 0.24,
    reverb: 0.6
  }
};

type DrumKitId = 'drumKit' | 'drum909' | 'drumRiddim';

type DrumKit = {
  label: string;
  kick: { start: number; end: number; glide: number; decay: number; click: number; level: number };
  snare: { body: number; bodyDecay: number; noiseFreq: number; noiseDecay: number; level: number };
  hat: { freq: number; closed: number; open: number; level: number };
  cymbal: { freq: number; decay: number };
  tomTune: number;
  drive: number;
  reverb: number; // multiplies the per-hit reverb sends
};

const DRUM_KITS: Record<DrumKitId, DrumKit> = {
  drumKit: {
    label: 'Break Kit',
    kick: { start: 130, end: 44, glide: 0.06, decay: 0.36, click: 0.35, level: 1 },
    snare: { body: 210, bodyDecay: 0.09, noiseFreq: 1400, noiseDecay: 0.17, level: 0.7 },
    hat: { freq: 8200, closed: 0.045, open: 0.32, level: 0.4 },
    cymbal: { freq: 4800, decay: 1.5 },
    tomTune: 1,
    drive: 0,
    reverb: 1
  },
  drum909: {
    label: '909 Techno Kit',
    kick: { start: 175, end: 42, glide: 0.045, decay: 0.52, click: 0.5, level: 1.1 },
    snare: { body: 190, bodyDecay: 0.06, noiseFreq: 2200, noiseDecay: 0.13, level: 0.62 },
    hat: { freq: 9600, closed: 0.032, open: 0.42, level: 0.36 },
    cymbal: { freq: 5600, decay: 1.9 },
    tomTune: 1.1,
    drive: 0.12,
    reverb: 1.3
  },
  drumRiddim: {
    label: 'Dubstep / Riddim Kit',
    kick: { start: 95, end: 36, glide: 0.1, decay: 0.5, click: 0.6, level: 1.05 },
    snare: { body: 240, bodyDecay: 0.13, noiseFreq: 1100, noiseDecay: 0.32, level: 0.85 },
    hat: { freq: 7000, closed: 0.05, open: 0.26, level: 0.44 },
    cymbal: { freq: 4200, decay: 2.1 },
    tomTune: 0.85,
    drive: 0.22,
    reverb: 0.8
  }
};

function isDrumKit(id: InstrumentId): id is DrumKitId {
  return id in DRUM_KITS;
}

export const INSTRUMENTS: InstrumentOption[] = [
  ...(Object.keys(PRESETS) as Exclude<InstrumentId, DrumKitId>[]).map(id => ({
    id: id as InstrumentId,
    label: PRESETS[id].label,
    group: PRESETS[id].group
  })),
  ...(Object.keys(DRUM_KITS) as DrumKitId[]).map(id => ({
    id: id as InstrumentId,
    label: DRUM_KITS[id].label,
    group: 'Drums' as const
  }))
];

/** Picks a sensible starting instrument from the generator's track name. */
export function suggestInstrument(trackName: string, isDrum: boolean): InstrumentId {
  const name = trackName.toLowerCase();

  if (isDrum) {
    if (name.includes('909') || name.includes('techno') || name.includes('shaker')) return 'drum909';
    return 'drumKit';
  }

  if (name.includes('rumble')) return 'rumbleSub';
  if (name.includes('sub') || name.includes('pulse')) return 'subBass';
  if (name.includes('wobble')) return 'riddimBass';
  if (name.includes('neuro') && (name.includes('response') || name.includes('answer'))) return 'talkingBass';
  if (name.includes('neuro') && name.includes('bass')) return 'growlBass';
  if (name.includes('answer') || name.includes('response')) return 'metalBass';
  if (name.includes('reese')) return 'reeseBass';
  if (name.includes('acid') || name.includes('sequence')) return 'acidBass';
  if (name.includes('bass')) return 'reeseBass';
  if (name.includes('dub') && name.includes('stab')) return 'dubStab';
  if (name.includes('rave')) return 'hooverBass';
  if (name.includes('pad')) return 'warmPad';
  if (name.includes('atmosphere') || name.includes('choir')) return 'glassPad';
  if (name.includes('key') || name.includes('chord')) return 'ePiano';
  if (name.includes('pluck') || name.includes('arp')) return 'pluck';
  if (name.includes('cut') || name.includes('stab')) return 'analogStab';
  if (name.includes('hook') || name.includes('lead')) return 'sawLead';
  if (name.includes('filter') || name.includes('fx') || name.includes('riser') || name.includes('siren') || name.includes('build')) {
    return name.includes('filter') ? 'droneAtmos' : 'sweepFx';
  }
  if (name.includes('perc') || name.includes('shaker')) return 'metalPerc';
  return 'pluck';
}

export interface TrackSettings {
  instrument: InstrumentId;
  volume: number; // 0-1
  muted: boolean;
}

type Voice = {
  stopAt: number;
  nodes: AudioScheduledSourceNode[];
  gain: GainNode;
};

const LOOKAHEAD_SECONDS = 0.25;
const SCHEDULE_INTERVAL_MS = 40;

function midiToFrequency(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function createReverbBuffer(ctx: AudioContext): AudioBuffer {
  const seconds = 2.6;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2.6);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  return buffer;
}

function createDistortionCurve(amount: number): Float32Array {
  const samples = 1024;
  const curve = new Float32Array(samples);
  const k = amount * 60;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

export class MidiAudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private delay: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private curves = new Map<number, Float32Array>();

  private trackDry: GainNode[] = [];
  private trackWet: GainNode[] = [];
  private trackEcho: GainNode[] = [];
  private settings: TrackSettings[] = [];
  private cursors: number[] = [];
  private voices: Voice[] = [];

  private song: ParsedMidi | null = null;
  private bpm = 120;
  private timer: number | null = null;
  private startedAt = 0; // context time that maps to position 0
  private offset = 0; // seconds into the song when paused/stopped
  private playing = false;
  private masterVolume = 0.8;

  onEnded: (() => void) | null = null;

  get duration(): number {
    return this.song?.duration ?? 0;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get position(): number {
    if (!this.playing || !this.ctx) return this.offset;
    return Math.min(this.duration, this.ctx.currentTime - this.startedAt);
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();

      // Leave headroom after the limiter: driven bass presets stack up fast
      const outputTrim = ctx.createGain();
      outputTrim.gain.value = 0.8;
      outputTrim.connect(ctx.destination);

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 6;
      limiter.ratio.value = 16;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.18;
      limiter.connect(outputTrim);

      const master = ctx.createGain();
      master.gain.value = this.masterVolume;
      master.connect(limiter);

      const reverb = ctx.createConvolver();
      reverb.buffer = createReverbBuffer(ctx);
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.85;
      reverb.connect(reverbGain);
      reverbGain.connect(master);

      // Dub-style feedback delay, timed against the song in load()
      const delay = ctx.createDelay(2);
      delay.delayTime.value = 0.35;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.38;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2600;
      delay.connect(damp);
      damp.connect(feedback);
      feedback.connect(delay);
      damp.connect(master);
      damp.connect(reverb);

      this.ctx = ctx;
      this.master = master;
      this.reverb = reverb;
      this.delay = delay;
      this.delayFeedback = feedback;
      this.noiseBuffer = createNoiseBuffer(ctx);
    }
    return this.ctx;
  }

  private curveFor(amount: number): Float32Array {
    const key = Math.round(amount * 20) / 20;
    let curve = this.curves.get(key);
    if (!curve) {
      curve = createDistortionCurve(key);
      this.curves.set(key, curve);
    }
    return curve;
  }

  /** LFO speed in Hz, either free running or locked to the song tempo. */
  private lfoRate(spec: LfoSpec): number {
    if (spec.sync) return (this.bpm / 60) * spec.sync;
    return spec.rate ?? 1;
  }

  load(song: ParsedMidi, settings: TrackSettings[]) {
    this.stop();
    this.song = song;
    this.bpm = song.bpm || 120;
    this.settings = settings.map(setting => ({ ...setting }));
    this.offset = 0;

    const ctx = this.ensureContext();
    if (this.delay) this.delay.delayTime.value = (60 / this.bpm) * 0.75; // dotted eighth

    this.trackDry.forEach(node => node.disconnect());
    this.trackWet.forEach(node => node.disconnect());
    this.trackEcho.forEach(node => node.disconnect());
    this.trackDry = [];
    this.trackWet = [];
    this.trackEcho = [];

    song.tracks.forEach((_, index) => {
      const dry = ctx.createGain();
      dry.gain.value = this.gainFor(index);
      dry.connect(this.master!);

      const wet = ctx.createGain();
      wet.gain.value = 1;
      wet.connect(this.reverb!);

      const echo = ctx.createGain();
      echo.gain.value = 1;
      echo.connect(this.delay!);

      this.trackDry.push(dry);
      this.trackWet.push(wet);
      this.trackEcho.push(echo);
    });

    this.cursors = song.tracks.map(() => 0);
  }

  private gainFor(index: number): number {
    const setting = this.settings[index];
    if (!setting || setting.muted) return 0;
    return setting.volume;
  }

  setTrackInstrument(index: number, instrument: InstrumentId) {
    if (!this.settings[index]) return;
    this.settings[index].instrument = instrument;
  }

  setTrackVolume(index: number, volume: number) {
    if (!this.settings[index]) return;
    this.settings[index].volume = volume;
    const node = this.trackDry[index];
    if (node && this.ctx) node.gain.setTargetAtTime(this.gainFor(index), this.ctx.currentTime, 0.02);
  }

  setTrackMuted(index: number, muted: boolean) {
    if (!this.settings[index]) return;
    this.settings[index].muted = muted;
    const node = this.trackDry[index];
    if (node && this.ctx) node.gain.setTargetAtTime(this.gainFor(index), this.ctx.currentTime, 0.02);
  }

  setMasterVolume(volume: number) {
    this.masterVolume = volume;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02);
  }

  async play() {
    if (!this.song || this.playing) return;
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();

    if (this.offset >= this.duration) this.offset = 0;
    this.startedAt = ctx.currentTime - this.offset;
    this.playing = true;
    this.resetCursors(this.offset);
    this.tick();
    this.timer = window.setInterval(() => this.tick(), SCHEDULE_INTERVAL_MS);
  }

  pause() {
    if (!this.playing) return;
    this.offset = this.position;
    this.halt();
  }

  stop() {
    this.offset = 0;
    this.halt();
  }

  seek(seconds: number) {
    const target = Math.max(0, Math.min(this.duration, seconds));
    const wasPlaying = this.playing;
    this.halt();
    this.offset = target;
    if (wasPlaying) void this.play();
  }

  dispose() {
    this.halt();
    this.ctx?.close();
    this.ctx = null;
  }

  private halt() {
    this.playing = false;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.killVoices();
  }

  private killVoices() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const voice of this.voices) {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(0, now, 0.01);
        voice.nodes.forEach(node => node.stop(now + 0.06));
      } catch {
        // A node may already have stopped; nothing to clean up
      }
    }
    this.voices = [];
  }

  private resetCursors(position: number) {
    if (!this.song) return;
    this.cursors = this.song.tracks.map(track => {
      let low = 0;
      let high = track.notes.length;
      while (low < high) {
        const mid = (low + high) >> 1;
        if (track.notes[mid].time < position) low = mid + 1;
        else high = mid;
      }
      return low;
    });
  }

  private tick() {
    if (!this.song || !this.ctx || !this.playing) return;
    const ctx = this.ctx;
    const horizon = ctx.currentTime + LOOKAHEAD_SECONDS;

    this.song.tracks.forEach((track, index) => {
      let cursor = this.cursors[index];
      while (cursor < track.notes.length) {
        const note = track.notes[cursor];
        const when = this.startedAt + note.time;
        if (when > horizon) break;
        if (!this.settings[index]?.muted) {
          this.spawn(index, note, Math.max(when, ctx.currentTime));
        }
        cursor++;
      }
      this.cursors[index] = cursor;
    });

    // Drop finished voices so the array does not grow across a long track
    const now = ctx.currentTime;
    this.voices = this.voices.filter(voice => voice.stopAt > now);

    if (this.position >= this.duration) {
      this.stop();
      this.onEnded?.();
    }
  }

  private spawn(trackIndex: number, note: ParsedNote, when: number) {
    const instrument = this.settings[trackIndex]?.instrument;
    if (!instrument) return;
    if (isDrumKit(instrument)) this.spawnDrum(trackIndex, note, when, DRUM_KITS[instrument]);
    else this.spawnSynth(trackIndex, note, when, PRESETS[instrument]);
  }

  /** Starts an LFO and returns its output gain, already scaled to the requested depth. */
  private startLfo(spec: LfoSpec, depth: number, when: number, stopAt: number, nodes: AudioScheduledSourceNode[]): GainNode {
    const ctx = this.ctx!;
    const lfo = ctx.createOscillator();
    lfo.type = spec.type ?? 'sine';
    lfo.frequency.value = this.lfoRate(spec);
    const amount = ctx.createGain();
    amount.gain.value = depth;
    lfo.connect(amount);
    lfo.start(when);
    lfo.stop(stopAt);
    nodes.push(lfo);
    return amount;
  }

  private spawnSynth(trackIndex: number, note: ParsedNote, when: number, preset: Preset) {
    const ctx = this.ctx!;
    const dry = this.trackDry[trackIndex];
    const wet = this.trackWet[trackIndex];
    const echo = this.trackEcho[trackIndex];
    if (!dry) return;

    const velocity = note.velocity / 127;
    const held = preset.maxDuration ? Math.min(note.duration, preset.maxDuration) : note.duration;
    const endAt = when + held;
    const stopAt = endAt + preset.release + 0.05;
    const frequency = midiToFrequency(note.pitch + (preset.octave ?? 0) * 12);

    const nodes: AudioScheduledSourceNode[] = [];

    const amp = ctx.createGain();
    const peak = preset.gain * (0.32 + velocity * 0.68);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.linearRampToValueAtTime(peak, when + preset.attack);
    amp.gain.setTargetAtTime(peak * preset.sustain, when + preset.attack, Math.max(0.02, preset.decay / 3));
    amp.gain.setTargetAtTime(0.0001, endAt, Math.max(0.02, preset.release / 3));

    // Optional rhythmic gate between the amp envelope and the output
    let ampOut: GainNode = amp;
    if (preset.ampLfo) {
      const gate = ctx.createGain();
      gate.gain.value = 1 - preset.ampLfo.depth;
      this.startLfo(preset.ampLfo, preset.ampLfo.depth, when, stopAt, nodes).connect(gate.gain);
      amp.connect(gate);
      ampOut = gate;
    }

    const filter = ctx.createBiquadFilter();
    filter.type = preset.filterType;
    filter.Q.value = preset.resonance;
    const tracking = preset.keyTracking ? frequency * preset.keyTracking * 2 : 0;
    const floor = Math.min(16000, preset.cutoff + tracking);
    const ceiling = Math.min(18000, floor + preset.cutoffEnv * (0.4 + velocity * 0.6));
    filter.frequency.setValueAtTime(floor, when);
    filter.frequency.linearRampToValueAtTime(ceiling, when + preset.attack + 0.01);
    filter.frequency.setTargetAtTime(floor + (ceiling - floor) * preset.sustain, when + preset.attack + 0.01, Math.max(0.03, preset.decay / 2));

    // oscillators -> filter -> [formants] -> [drive] -> amp -> gate -> outputs
    let chainEnd: AudioNode = filter;

    if (preset.formants) {
      const merge = ctx.createGain();
      merge.gain.value = 0.6;
      const sweep = preset.formants.sweep
        ? this.startLfo(preset.formants.sweep, preset.formants.sweep.depth, when, stopAt, nodes)
        : null;
      for (const peakHz of [preset.formants.low, preset.formants.high]) {
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = peakHz;
        band.Q.value = preset.formants.q;
        sweep?.connect(band.frequency);
        chainEnd.connect(band);
        band.connect(merge);
      }
      chainEnd = merge;
    }

    if (preset.drive) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.curveFor(preset.drive);
      shaper.oversample = '2x';
      const trim = ctx.createGain();
      trim.gain.value = 1 / (1 + preset.drive);
      chainEnd.connect(shaper);
      shaper.connect(trim);
      chainEnd = trim;
    }

    chainEnd.connect(amp);
    ampOut.connect(dry);

    if (wet && preset.reverb > 0) {
      const send = ctx.createGain();
      send.gain.value = preset.reverb;
      ampOut.connect(send);
      send.connect(wet);
    }
    if (echo && preset.delay) {
      const send = ctx.createGain();
      send.gain.value = preset.delay;
      ampOut.connect(send);
      send.connect(echo);
    }

    let vibratoGain: GainNode | null = null;
    if (preset.vibrato) {
      vibratoGain = ctx.createGain();
      vibratoGain.gain.setValueAtTime(0, when);
      vibratoGain.gain.linearRampToValueAtTime(preset.vibrato.depth, when + 0.35);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = preset.vibrato.rate;
      lfo.connect(vibratoGain);
      lfo.start(when);
      lfo.stop(stopAt);
      nodes.push(lfo);
    }

    if (preset.filterLfo) {
      this.startLfo(preset.filterLfo, preset.filterLfo.depth, when, stopAt, nodes).connect(filter.frequency);
    }

    // Ring modulator: the carrier is multiplied by a second oscillator
    let ringInput: AudioNode = filter;
    if (preset.ringMod) {
      const ring = ctx.createGain();
      ring.gain.value = 1 - preset.ringMod.depth;
      const modulator = ctx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.value = frequency * preset.ringMod.ratio;
      const modDepth = ctx.createGain();
      modDepth.gain.value = preset.ringMod.depth;
      modulator.connect(modDepth);
      modDepth.connect(ring.gain);
      modulator.start(when);
      modulator.stop(stopAt);
      nodes.push(modulator);
      ring.connect(filter);
      ringInput = ring;
    }

    for (const layer of preset.oscillators) {
      const osc = ctx.createOscillator();
      osc.type = layer.type;
      const layerFrequency = frequency * Math.pow(2, layer.octave ?? 0);
      if (preset.pitchEnv) {
        osc.frequency.setValueAtTime(layerFrequency * Math.pow(2, preset.pitchEnv.semitones / 12), when);
        osc.frequency.exponentialRampToValueAtTime(layerFrequency, when + preset.pitchEnv.time);
      } else {
        osc.frequency.value = layerFrequency;
      }
      if (layer.detune) osc.detune.value = layer.detune;
      if (vibratoGain) vibratoGain.connect(osc.detune);

      const layerGain = ctx.createGain();
      layerGain.gain.value = layer.gain;
      osc.connect(layerGain);
      layerGain.connect(ringInput);
      osc.start(when);
      osc.stop(stopAt);
      nodes.push(osc);
    }

    if (preset.noise && this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = preset.noise;
      noise.connect(noiseGain);
      noiseGain.connect(ringInput);
      noise.start(when);
      noise.stop(stopAt);
      nodes.push(noise);
    }

    this.voices.push({ stopAt, nodes, gain: amp });
  }

  private spawnDrum(trackIndex: number, note: ParsedNote, when: number, kit: DrumKit) {
    const ctx = this.ctx!;
    const dry = this.trackDry[trackIndex];
    const wet = this.trackWet[trackIndex];
    if (!dry) return;

    const velocity = 0.25 + (note.velocity / 127) * 0.75;
    const out = ctx.createGain();
    out.gain.value = velocity;

    let sink: AudioNode = out;
    if (kit.drive) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.curveFor(kit.drive);
      shaper.oversample = '2x';
      const trim = ctx.createGain();
      trim.gain.value = 1 / (1 + kit.drive * 1.4);
      out.connect(shaper);
      shaper.connect(trim);
      sink = trim;
    }
    sink.connect(dry);

    const nodes: AudioScheduledSourceNode[] = [];
    let tail = 0.3;

    const addSend = (amount: number) => {
      if (!wet || amount <= 0) return;
      const send = ctx.createGain();
      send.gain.value = amount * kit.reverb;
      sink.connect(send);
      send.connect(wet);
    };

    const tone = (type: OscillatorType, from: number, to: number, decay: number, level: number, glide: number) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(from, when);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), when + glide);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(level, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      osc.connect(gain);
      gain.connect(out);
      osc.start(when);
      osc.stop(when + decay + 0.02);
      nodes.push(osc);
      tail = Math.max(tail, decay);
    };

    const noise = (filterType: BiquadFilterType, frequency: number, q: number, decay: number, level: number, at = when) => {
      if (!this.noiseBuffer) return;
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = frequency;
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(level, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      source.start(at);
      source.stop(at + decay + 0.02);
      nodes.push(source);
      tail = Math.max(tail, at - when + decay);
    };

    switch (note.pitch) {
      case 35:
      case 36: // Kick
        tone('sine', kit.kick.start, kit.kick.end, kit.kick.decay, kit.kick.level, kit.kick.glide);
        noise('lowpass', 1800, 1, 0.02, kit.kick.click);
        addSend(0.03);
        break;
      case 37: // Rimshot
        tone('triangle', 620, 380, 0.05, 0.5, 0.02);
        noise('bandpass', 2200, 6, 0.05, 0.45);
        addSend(0.18);
        break;
      case 39: // Clap
        for (let i = 0; i < 3; i++) {
          noise('bandpass', 1500, 2.4, 0.14, 0.6, when + i * 0.013);
        }
        addSend(0.25);
        break;
      case 38:
      case 40: // Snare
        tone('triangle', kit.snare.body, kit.snare.body * 0.8, kit.snare.bodyDecay, 0.4, 0.03);
        noise(
          'highpass',
          kit.snare.noiseFreq,
          0.8,
          note.pitch === 40 ? kit.snare.noiseDecay * 1.3 : kit.snare.noiseDecay,
          kit.snare.level
        );
        addSend(0.22);
        break;
      case 41:
      case 45: // Low tom
        tone('sine', 150 * kit.tomTune, 80 * kit.tomTune, 0.35, 0.75, 0.14);
        addSend(0.15);
        break;
      case 43:
      case 47: // Mid tom
        tone('sine', 200 * kit.tomTune, 110 * kit.tomTune, 0.3, 0.72, 0.12);
        addSend(0.15);
        break;
      case 48:
      case 50: // High tom
        tone('sine', 270 * kit.tomTune, 150 * kit.tomTune, 0.26, 0.7, 0.1);
        addSend(0.15);
        break;
      case 42:
      case 44: // Closed hat
        noise('highpass', kit.hat.freq, 1, note.pitch === 44 ? kit.hat.closed * 1.3 : kit.hat.closed, kit.hat.level);
        addSend(0.1);
        break;
      case 46: // Open hat
        noise('highpass', kit.hat.freq * 0.88, 1, kit.hat.open, kit.hat.level * 0.85);
        addSend(0.18);
        break;
      case 49:
      case 52:
      case 57: // Crash / china
        noise('highpass', kit.cymbal.freq, 0.7, kit.cymbal.decay, 0.34);
        addSend(0.4);
        break;
      case 51:
      case 53:
      case 59: // Ride
        noise('bandpass', kit.cymbal.freq * 1.3, 1.6, kit.cymbal.decay * 0.5, 0.3);
        tone('square', 880, 820, 0.2, 0.06, 0.1);
        addSend(0.3);
        break;
      case 69:
      case 70:
      case 82: // Shaker / maracas
        noise('highpass', 6800, 1, 0.09, 0.28);
        addSend(0.14);
        break;
      case 75:
      case 76:
      case 77: // Clicky percussion
        tone('square', 1000, 900, 0.05, 0.3, 0.02);
        addSend(0.2);
        break;
      default:
        noise('bandpass', 3000, 2, 0.12, 0.34);
        addSend(0.2);
        break;
    }

    this.voices.push({ stopAt: when + tail + 0.1, nodes, gain: out });
  }
}
