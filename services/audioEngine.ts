import { ParsedMidi, ParsedNote } from '../utils/midiParser';
import { createRng } from '../utils/random';

/**
 * A small Web Audio synthesizer that renders parsed MIDI in the browser.
 * Every instrument is synthesized from oscillators and noise, so playback
 * needs no samples, no soundfont and no network access.
 */


export type InstrumentGroup =
  | 'Bass'
  | 'Acid'
  | 'Dubstep'
  | 'Techno'
  | 'Industrial'
  | 'Stab'
  | 'Lead'
  | 'Pluck'
  | 'Keys'
  | 'Pad'
  | 'Drone'
  | 'Perc'
  | 'FX'
  | 'Drums';

export interface InstrumentOption {
  id: InstrumentId;
  label: string;
  group: InstrumentGroup;
}

type OscLayer = {
  type: OscillatorType;
  detune?: number; // cents
  octave?: number;
  gain: number;
};

/**
 * LFO rate is either free running (Hz) or locked to the song tempo (cycles per
 * beat). `sh` is a stepped sample-and-hold shape rather than an oscillator.
 */
type LfoSpec = {
  rate?: number;
  sync?: number;
  depth: number;
  type?: OscillatorType | 'sh';
};

type NoiseColor = 'white' | 'pink' | 'metal';

type Preset = {
  label: string;
  group: InstrumentGroup;
  oscillators: OscLayer[];
  noise?: number; // noise layer gain
  noiseColor?: NoiseColor;
  octave?: number; // whole-instrument transpose
  filterType: BiquadFilterType;
  cutoff: number; // Hz at the envelope floor
  cutoffEnv: number; // Hz added by the filter envelope
  resonance: number;
  highpass?: number; // Hz, thins the body out of a sound
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
  fm?: { ratio: number; index: number; decay?: number }; // index in multiples of the note frequency
  unison?: { voices: number; detune: number; spread?: number }; // detune in cents, spread pans the copies
  formants?: { low: number; high: number; q: number; sweep?: LfoSpec };
  pitchEnv?: { semitones: number; time: number };
  keyTracking?: number; // how much cutoff follows pitch (0-1)
  /**
   * Lowest MIDI note this voice is voiced for. Bright, narrow-band sounds (claves,
   * bells, glassy plucks) are filtered well above their fundamental, so playing one
   * on a bass line would pass nothing. Notes below this are raised by octaves.
   */
  pitchFloor?: number;
  maxDuration?: number;
};

const PRESETS = {
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
    group: 'Acid',
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
    group: 'Stab',
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
    group: 'Stab',
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
    gain: 0.54,
    reverb: 0.35,
    delay: 0.45,
    ringMod: { ratio: 3.02, depth: 0.5 },
    maxDuration: 0.5,
    pitchFloor: 60
  },
  droneAtmos: {
    label: 'Dark Drone',
    group: 'Drone',
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
    group: 'Perc',
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
    maxDuration: 0.4,
    pitchFloor: 65
  },

  // --- Melodic ---
  pluck: {
    label: 'Pluck',
    group: 'Pluck',
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
    maxDuration: 1.2,
    pitchFloor: 48
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
    maxDuration: 2.4,
    pitchFloor: 55
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
    maxDuration: 0.9,
    pitchFloor: 55
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
    vibrato: { rate: 5, depth: 7 },
    pitchFloor: 48
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
  },

  // --- Analogue and modern bass ---
  ladderBass: {
    label: 'Ladder Bass',
    group: 'Bass',
    oscillators: [
      { type: 'sawtooth', gain: 0.55 },
      { type: 'square', detune: -6, gain: 0.3 },
      { type: 'sine', octave: -1, gain: 0.4 }
    ],
    filterType: 'lowpass',
    cutoff: 210,
    cutoffEnv: 1500,
    resonance: 6,
    attack: 0.008,
    decay: 0.32,
    sustain: 0.55,
    release: 0.1,
    gain: 0.5,
    reverb: 0.05,
    drive: 0.2,
    keyTracking: 0.35
  },
  pulseBass: {
    label: 'Pulse Bass',
    group: 'Bass',
    oscillators: [
      { type: 'square', gain: 0.5 },
      { type: 'square', detune: 8, octave: -1, gain: 0.4 }
    ],
    filterType: 'lowpass',
    cutoff: 260,
    cutoffEnv: 1200,
    resonance: 4,
    attack: 0.004,
    decay: 0.2,
    sustain: 0.7,
    release: 0.07,
    gain: 0.48,
    reverb: 0.04
  },
  rubberBass: {
    label: 'Rubber Bass',
    group: 'Bass',
    oscillators: [
      { type: 'sine', gain: 0.7 },
      { type: 'triangle', detune: 7, gain: 0.35 }
    ],
    filterType: 'lowpass',
    cutoff: 160,
    cutoffEnv: 900,
    resonance: 9,
    attack: 0.004,
    decay: 0.14,
    sustain: 0.3,
    release: 0.12,
    gain: 0.62,
    reverb: 0.06,
    keyTracking: 0.3
  },
  fmBass: {
    label: 'FM Bass',
    group: 'Bass',
    oscillators: [{ type: 'sine', gain: 0.9 }],
    filterType: 'lowpass',
    cutoff: 700,
    cutoffEnv: 900,
    resonance: 2,
    attack: 0.004,
    decay: 0.3,
    sustain: 0.6,
    release: 0.1,
    gain: 0.5,
    reverb: 0.05,
    fm: { ratio: 2, index: 3, decay: 0.12 }
  },
  fmGrowlBass: {
    label: 'FM Growl Bass',
    group: 'Bass',
    oscillators: [
      { type: 'sine', gain: 0.7 },
      { type: 'triangle', octave: -1, gain: 0.35 }
    ],
    filterType: 'lowpass',
    cutoff: 500,
    cutoffEnv: 1800,
    resonance: 5,
    attack: 0.006,
    decay: 0.28,
    sustain: 0.55,
    release: 0.1,
    gain: 0.42,
    reverb: 0.07,
    drive: 0.35,
    fm: { ratio: 1.5, index: 6, decay: 0.2 },
    filterLfo: { sync: 2, depth: 500 }
  },
  clickBass: {
    label: 'Click Bass',
    group: 'Bass',
    oscillators: [
      { type: 'sine', gain: 0.85 },
      { type: 'square', octave: 2, gain: 0.1 }
    ],
    noise: 0.12,
    filterType: 'lowpass',
    cutoff: 240,
    cutoffEnv: 2600,
    resonance: 3,
    attack: 0.002,
    decay: 0.08,
    sustain: 0.5,
    release: 0.08,
    gain: 0.6,
    reverb: 0.04
  },
  distortedBass: {
    label: 'Distorted Bass',
    group: 'Bass',
    oscillators: [
      { type: 'sawtooth', detune: -5, gain: 0.45 },
      { type: 'square', detune: 6, gain: 0.35 },
      { type: 'sine', octave: -1, gain: 0.4 }
    ],
    filterType: 'lowpass',
    cutoff: 280,
    cutoffEnv: 1600,
    resonance: 6,
    attack: 0.005,
    decay: 0.3,
    sustain: 0.7,
    release: 0.09,
    gain: 0.5,
    reverb: 0.05,
    drive: 0.7
  },
  detroitBass: {
    label: 'Detroit Bass',
    group: 'Bass',
    oscillators: [
      { type: 'sawtooth', detune: -9, gain: 0.4 },
      { type: 'square', detune: 10, gain: 0.28 },
      { type: 'sine', octave: -1, gain: 0.35 }
    ],
    filterType: 'lowpass',
    cutoff: 300,
    cutoffEnv: 1100,
    resonance: 3.5,
    attack: 0.015,
    decay: 0.45,
    sustain: 0.6,
    release: 0.18,
    gain: 0.46,
    reverb: 0.12,
    keyTracking: 0.25
  },
  deepPluckBass: {
    label: 'Deep Pluck Bass',
    group: 'Bass',
    oscillators: [
      { type: 'triangle', gain: 0.6 },
      { type: 'sine', octave: -1, gain: 0.5 }
    ],
    filterType: 'lowpass',
    cutoff: 200,
    cutoffEnv: 1400,
    resonance: 5,
    attack: 0.004,
    decay: 0.22,
    sustain: 0.08,
    release: 0.2,
    gain: 0.58,
    reverb: 0.14,
    maxDuration: 0.8
  },
  triangleSub: {
    label: 'Triangle Sub',
    group: 'Bass',
    oscillators: [
      { type: 'triangle', gain: 0.9 },
      { type: 'sine', octave: -1, gain: 0.5 }
    ],
    filterType: 'lowpass',
    cutoff: 150,
    cutoffEnv: 180,
    resonance: 0.8,
    attack: 0.02,
    decay: 0.4,
    sustain: 0.9,
    release: 0.14,
    gain: 0.8,
    reverb: 0.03
  },

  // --- Acid ---
  acidSquare: {
    label: 'Acid Square',
    group: 'Acid',
    oscillators: [{ type: 'square', gain: 0.85 }],
    filterType: 'lowpass',
    cutoff: 240,
    cutoffEnv: 3000,
    resonance: 15,
    attack: 0.004,
    decay: 0.26,
    sustain: 0.2,
    release: 0.08,
    gain: 0.4,
    reverb: 0.12,
    drive: 0.25,
    keyTracking: 0.5
  },
  acidSlide: {
    label: 'Acid Slide',
    group: 'Acid',
    oscillators: [{ type: 'sawtooth', gain: 0.9 }],
    filterType: 'lowpass',
    cutoff: 200,
    cutoffEnv: 3600,
    resonance: 18,
    attack: 0.006,
    decay: 0.34,
    sustain: 0.25,
    release: 0.1,
    gain: 0.4,
    reverb: 0.16,
    drive: 0.3,
    pitchEnv: { semitones: -2, time: 0.08 },
    keyTracking: 0.5
  },
  acidScream: {
    label: 'Acid Scream',
    group: 'Acid',
    oscillators: [
      { type: 'sawtooth', gain: 0.6 },
      { type: 'square', detune: 9, gain: 0.3 }
    ],
    filterType: 'lowpass',
    cutoff: 320,
    cutoffEnv: 5200,
    resonance: 22,
    attack: 0.004,
    decay: 0.3,
    sustain: 0.3,
    release: 0.09,
    gain: 0.32,
    reverb: 0.2,
    delay: 0.2,
    drive: 0.55,
    keyTracking: 0.6
  },
  acidSub: {
    label: 'Acid Sub',
    group: 'Acid',
    oscillators: [
      { type: 'sawtooth', gain: 0.6 },
      { type: 'sine', octave: -1, gain: 0.5 }
    ],
    filterType: 'lowpass',
    cutoff: 150,
    cutoffEnv: 1400,
    resonance: 12,
    attack: 0.005,
    decay: 0.3,
    sustain: 0.35,
    release: 0.1,
    gain: 0.55,
    reverb: 0.06,
    drive: 0.2
  },
  acidRandom: {
    label: 'Acid S&H',
    group: 'Acid',
    oscillators: [{ type: 'sawtooth', gain: 0.85 }],
    filterType: 'lowpass',
    cutoff: 300,
    cutoffEnv: 2400,
    resonance: 17,
    attack: 0.004,
    decay: 0.24,
    sustain: 0.3,
    release: 0.09,
    gain: 0.38,
    reverb: 0.22,
    delay: 0.25,
    drive: 0.3,
    filterLfo: { sync: 2, depth: 1800, type: 'sh' }
  },

  // --- Techno tools ---
  berlinBass: {
    label: 'Berlin Bass',
    group: 'Techno',
    oscillators: [
      { type: 'sawtooth', detune: -7, gain: 0.35 },
      { type: 'sine', octave: -1, gain: 0.6 }
    ],
    noise: 0.02,
    noiseColor: 'pink',
    filterType: 'lowpass',
    cutoff: 170,
    cutoffEnv: 700,
    resonance: 4,
    attack: 0.02,
    decay: 0.5,
    sustain: 0.75,
    release: 0.4,
    gain: 0.6,
    reverb: 0.3,
    drive: 0.25,
    filterLfo: { sync: 0.125, depth: 160 }
  },
  tunnelSub: {
    label: 'Tunnel Sub',
    group: 'Techno',
    oscillators: [
      { type: 'sine', gain: 0.95 },
      { type: 'sine', detune: 11, gain: 0.35 }
    ],
    filterType: 'lowpass',
    cutoff: 120,
    cutoffEnv: 260,
    resonance: 2,
    attack: 0.05,
    decay: 0.8,
    sustain: 0.85,
    release: 0.7,
    gain: 0.7,
    reverb: 0.45,
    delay: 0.15
  },
  rollingBass: {
    label: 'Rolling Bass',
    group: 'Techno',
    oscillators: [
      { type: 'square', gain: 0.4 },
      { type: 'sawtooth', detune: -8, gain: 0.3 },
      { type: 'sine', octave: -1, gain: 0.45 }
    ],
    filterType: 'lowpass',
    cutoff: 220,
    cutoffEnv: 1300,
    resonance: 7,
    attack: 0.005,
    decay: 0.16,
    sustain: 0.5,
    release: 0.08,
    gain: 0.5,
    reverb: 0.1,
    drive: 0.3,
    ampLfo: { sync: 2, depth: 0.35, type: 'triangle' }
  },
  hardgrooveBass: {
    label: 'Hardgroove Bass',
    group: 'Techno',
    oscillators: [
      { type: 'sawtooth', gain: 0.5 },
      { type: 'square', detune: 12, gain: 0.28 }
    ],
    filterType: 'lowpass',
    cutoff: 260,
    cutoffEnv: 2000,
    resonance: 9,
    attack: 0.004,
    decay: 0.13,
    sustain: 0.25,
    release: 0.07,
    gain: 0.48,
    reverb: 0.08,
    drive: 0.4,
    keyTracking: 0.3,
    maxDuration: 0.5
  },
  minimalBleep: {
    label: 'Minimal Bleep',
    group: 'Techno',
    oscillators: [{ type: 'sine', gain: 0.8 }],
    filterType: 'bandpass',
    cutoff: 1500,
    cutoffEnv: 1800,
    resonance: 6,
    attack: 0.002,
    decay: 0.07,
    sustain: 0.01,
    release: 0.08,
    gain: 0.4,
    reverb: 0.4,
    delay: 0.5,
    maxDuration: 0.25,
    pitchFloor: 67
  },
  dubChordLong: {
    label: 'Dub Chord Wash',
    group: 'Techno',
    oscillators: [
      { type: 'sawtooth', detune: -12, gain: 0.24 },
      { type: 'triangle', detune: 11, gain: 0.24 },
      { type: 'sine', octave: 1, gain: 0.1 }
    ],
    filterType: 'lowpass',
    cutoff: 420,
    cutoffEnv: 1400,
    resonance: 3,
    attack: 0.06,
    decay: 0.9,
    sustain: 0.25,
    release: 1.2,
    gain: 0.3,
    reverb: 0.8,
    delay: 0.6,
    filterLfo: { rate: 0.09, depth: 220 }
  },
  loopBass: {
    label: 'Loop Bass',
    group: 'Techno',
    oscillators: [
      { type: 'triangle', gain: 0.55 },
      { type: 'square', octave: -1, detune: 5, gain: 0.35 }
    ],
    filterType: 'lowpass',
    cutoff: 190,
    cutoffEnv: 800,
    resonance: 5,
    attack: 0.006,
    decay: 0.24,
    sustain: 0.6,
    release: 0.12,
    gain: 0.52,
    reverb: 0.12,
    filterLfo: { sync: 1, depth: 380, type: 'triangle' }
  },
  psyBass: {
    label: 'Psy Bass',
    group: 'Techno',
    oscillators: [
      { type: 'sawtooth', gain: 0.5 },
      { type: 'sine', octave: -1, gain: 0.55 }
    ],
    filterType: 'lowpass',
    cutoff: 170,
    cutoffEnv: 1500,
    resonance: 8,
    attack: 0.003,
    decay: 0.1,
    sustain: 0.05,
    release: 0.06,
    gain: 0.6,
    reverb: 0.05,
    drive: 0.3,
    maxDuration: 0.22
  },
  trancePluck: {
    label: 'Trance Pluck Bass',
    group: 'Techno',
    oscillators: [
      { type: 'sawtooth', detune: -10, gain: 0.35 },
      { type: 'sawtooth', detune: 11, gain: 0.35 }
    ],
    filterType: 'lowpass',
    cutoff: 300,
    cutoffEnv: 2600,
    resonance: 6,
    attack: 0.003,
    decay: 0.18,
    sustain: 0.02,
    release: 0.16,
    gain: 0.4,
    reverb: 0.3,
    delay: 0.3,
    maxDuration: 0.6
  },

  // --- Industrial and hard ---
  clangBass: {
    label: 'Clang Bass',
    group: 'Industrial',
    oscillators: [
      { type: 'square', gain: 0.45 },
      { type: 'sawtooth', octave: -1, detune: 14, gain: 0.4 }
    ],
    filterType: 'lowpass',
    cutoff: 350,
    cutoffEnv: 2400,
    resonance: 8,
    attack: 0.003,
    decay: 0.2,
    sustain: 0.4,
    release: 0.12,
    gain: 0.4,
    reverb: 0.3,
    drive: 0.65,
    ringMod: { ratio: 3.4, depth: 0.55 }
  },
  distortedStab: {
    label: 'Distorted Stab',
    group: 'Industrial',
    oscillators: [
      { type: 'sawtooth', detune: -9, gain: 0.35 },
      { type: 'square', detune: 8, gain: 0.3 }
    ],
    filterType: 'bandpass',
    cutoff: 900,
    cutoffEnv: 2600,
    resonance: 6,
    attack: 0.003,
    decay: 0.16,
    sustain: 0.05,
    release: 0.2,
    gain: 0.36,
    reverb: 0.45,
    delay: 0.3,
    drive: 0.75,
    maxDuration: 0.5,
    pitchFloor: 43
  },
  noiseHit: {
    label: 'Noise Hit',
    group: 'Industrial',
    oscillators: [{ type: 'square', gain: 0.15 }],
    noise: 0.7,
    filterType: 'bandpass',
    cutoff: 1800,
    cutoffEnv: 3200,
    resonance: 3,
    attack: 0.002,
    decay: 0.14,
    sustain: 0.02,
    release: 0.25,
    gain: 0.32,
    reverb: 0.5,
    drive: 0.4,
    maxDuration: 0.5,
    pitchFloor: 43
  },
  metalScrape: {
    label: 'Metal Scrape',
    group: 'Industrial',
    oscillators: [{ type: 'square', gain: 0.2 }],
    noise: 0.5,
    noiseColor: 'metal',
    filterType: 'bandpass',
    cutoff: 2400,
    cutoffEnv: 3800,
    resonance: 9,
    attack: 0.02,
    decay: 0.5,
    sustain: 0.35,
    release: 0.4,
    gain: 0.26,
    reverb: 0.55,
    delay: 0.25,
    drive: 0.4,
    filterLfo: { sync: 0.5, depth: 1600, type: 'sh' },
    pitchFloor: 48
  },
  distortedRumble: {
    label: 'Distorted Rumble',
    group: 'Industrial',
    oscillators: [
      { type: 'sine', gain: 0.8 },
      { type: 'triangle', detune: 14, gain: 0.35 }
    ],
    noise: 0.06,
    noiseColor: 'pink',
    filterType: 'lowpass',
    cutoff: 140,
    cutoffEnv: 520,
    resonance: 5,
    attack: 0.02,
    decay: 0.6,
    sustain: 0.8,
    release: 0.5,
    gain: 0.55,
    reverb: 0.4,
    drive: 0.6
  },
  screamLead: {
    label: 'Scream Lead',
    group: 'Industrial',
    oscillators: [
      { type: 'sawtooth', detune: -14, gain: 0.3 },
      { type: 'square', detune: 15, gain: 0.28 }
    ],
    octave: 1,
    filterType: 'bandpass',
    cutoff: 1400,
    cutoffEnv: 4200,
    resonance: 16,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.5,
    release: 0.2,
    gain: 0.24,
    reverb: 0.4,
    delay: 0.3,
    drive: 0.7,
    filterLfo: { rate: 6.5, depth: 900 },
    pitchFloor: 60
  },
  gritStab: {
    label: 'Grit Stab',
    group: 'Industrial',
    oscillators: [
      { type: 'square', gain: 0.35 },
      { type: 'square', octave: 1, detune: 22, gain: 0.2 }
    ],
    noise: 0.15,
    filterType: 'highpass',
    cutoff: 700,
    cutoffEnv: 2600,
    resonance: 4,
    attack: 0.002,
    decay: 0.12,
    sustain: 0.03,
    release: 0.14,
    gain: 0.3,
    reverb: 0.35,
    drive: 0.8,
    maxDuration: 0.4,
    pitchFloor: 43
  },
  ebmBass: {
    label: 'EBM Bass',
    group: 'Industrial',
    oscillators: [
      { type: 'square', gain: 0.5 },
      { type: 'sawtooth', detune: -10, gain: 0.35 }
    ],
    filterType: 'lowpass',
    cutoff: 240,
    cutoffEnv: 2200,
    resonance: 11,
    attack: 0.003,
    decay: 0.12,
    sustain: 0.15,
    release: 0.07,
    gain: 0.46,
    reverb: 0.1,
    drive: 0.5,
    keyTracking: 0.4,
    maxDuration: 0.35
  },

  // --- Stabs ---
  organStab: {
    label: 'Organ Stab',
    group: 'Stab',
    oscillators: [
      { type: 'sine', gain: 0.4 },
      { type: 'sine', octave: 1, gain: 0.28 },
      { type: 'square', octave: 2, gain: 0.1 }
    ],
    filterType: 'lowpass',
    cutoff: 1200,
    cutoffEnv: 2200,
    resonance: 2,
    attack: 0.004,
    decay: 0.2,
    sustain: 0.1,
    release: 0.2,
    gain: 0.36,
    reverb: 0.4,
    delay: 0.3,
    maxDuration: 0.7,
    pitchFloor: 43
  },
  housePiano: {
    label: 'House Piano',
    group: 'Stab',
    oscillators: [
      { type: 'triangle', gain: 0.45 },
      { type: 'sawtooth', detune: 6, gain: 0.2 },
      { type: 'sine', octave: 1, gain: 0.16 }
    ],
    filterType: 'lowpass',
    cutoff: 1600,
    cutoffEnv: 3200,
    resonance: 2,
    attack: 0.003,
    decay: 0.5,
    sustain: 0.12,
    release: 0.35,
    gain: 0.4,
    reverb: 0.4,
    delay: 0.2,
    keyTracking: 0.4,
    maxDuration: 1.4,
    pitchFloor: 48
  },
  brassStab: {
    label: 'Brass Stab',
    group: 'Stab',
    oscillators: [
      { type: 'sawtooth', detune: -6, gain: 0.34 },
      { type: 'sawtooth', detune: 7, gain: 0.34 }
    ],
    filterType: 'lowpass',
    cutoff: 500,
    cutoffEnv: 3000,
    resonance: 4,
    attack: 0.03,
    decay: 0.3,
    sustain: 0.45,
    release: 0.2,
    gain: 0.34,
    reverb: 0.35,
    drive: 0.2,
    maxDuration: 1
  },
  glassStab: {
    label: 'Glass Stab',
    group: 'Stab',
    oscillators: [
      { type: 'sine', gain: 0.4 },
      { type: 'triangle', octave: 1, detune: 9, gain: 0.26 }
    ],
    filterType: 'highpass',
    cutoff: 500,
    cutoffEnv: 3400,
    resonance: 3,
    attack: 0.002,
    decay: 0.24,
    sustain: 0.05,
    release: 0.4,
    gain: 0.34,
    reverb: 0.6,
    delay: 0.45,
    fm: { ratio: 3.5, index: 1.2, decay: 0.1 },
    maxDuration: 0.9,
    pitchFloor: 55
  },
  raveChord: {
    label: 'Rave Chord',
    group: 'Stab',
    oscillators: [
      { type: 'sawtooth', detune: -16, gain: 0.28 },
      { type: 'sawtooth', detune: 3, gain: 0.28 },
      { type: 'square', detune: 18, gain: 0.2 }
    ],
    filterType: 'lowpass',
    cutoff: 700,
    cutoffEnv: 3200,
    resonance: 6,
    attack: 0.006,
    decay: 0.26,
    sustain: 0.3,
    release: 0.25,
    gain: 0.32,
    reverb: 0.4,
    delay: 0.25,
    drive: 0.3,
    maxDuration: 1.1
  },
  mutedStab: {
    label: 'Muted Stab',
    group: 'Stab',
    oscillators: [
      { type: 'triangle', gain: 0.5 },
      { type: 'sawtooth', detune: -8, gain: 0.2 }
    ],
    filterType: 'lowpass',
    cutoff: 380,
    cutoffEnv: 900,
    resonance: 3,
    attack: 0.004,
    decay: 0.16,
    sustain: 0.05,
    release: 0.18,
    gain: 0.4,
    reverb: 0.45,
    delay: 0.35,
    maxDuration: 0.6
  },
  filterStab: {
    label: 'Filter Stab',
    group: 'Stab',
    oscillators: [
      { type: 'sawtooth', detune: -11, gain: 0.3 },
      { type: 'sawtooth', detune: 12, gain: 0.3 }
    ],
    filterType: 'bandpass',
    cutoff: 800,
    cutoffEnv: 2800,
    resonance: 9,
    attack: 0.004,
    decay: 0.2,
    sustain: 0.12,
    release: 0.2,
    gain: 0.34,
    reverb: 0.4,
    delay: 0.4,
    filterLfo: { sync: 1, depth: 700 },
    maxDuration: 0.8,
    pitchFloor: 48
  },
  fmStab: {
    label: 'FM Stab',
    group: 'Stab',
    oscillators: [{ type: 'sine', gain: 0.7 }],
    filterType: 'lowpass',
    cutoff: 1400,
    cutoffEnv: 2600,
    resonance: 2,
    attack: 0.002,
    decay: 0.22,
    sustain: 0.06,
    release: 0.3,
    gain: 0.4,
    reverb: 0.45,
    delay: 0.35,
    fm: { ratio: 2.01, index: 4, decay: 0.09 },
    maxDuration: 0.9
  },

  // --- Leads ---
  superSaw: {
    label: 'Supersaw',
    group: 'Lead',
    oscillators: [{ type: 'sawtooth', gain: 0.7 }],
    unison: { voices: 5, detune: 22, spread: 0.6 },
    filterType: 'lowpass',
    cutoff: 800,
    cutoffEnv: 4000,
    resonance: 3,
    attack: 0.02,
    decay: 0.5,
    sustain: 0.65,
    release: 0.3,
    gain: 0.3,
    reverb: 0.35,
    delay: 0.2
  },
  fmLead: {
    label: 'FM Lead',
    group: 'Lead',
    oscillators: [{ type: 'sine', gain: 0.75 }],
    filterType: 'lowpass',
    cutoff: 1800,
    cutoffEnv: 2400,
    resonance: 2,
    attack: 0.01,
    decay: 0.4,
    sustain: 0.55,
    release: 0.2,
    gain: 0.32,
    reverb: 0.3,
    delay: 0.25,
    fm: { ratio: 3, index: 2.2, decay: 0.3 },
    vibrato: { rate: 5.4, depth: 8 }
  },
  sineLead: {
    label: 'Sine Lead',
    group: 'Lead',
    oscillators: [
      { type: 'sine', gain: 0.7 },
      { type: 'sine', octave: 1, gain: 0.14 }
    ],
    filterType: 'lowpass',
    cutoff: 2400,
    cutoffEnv: 1200,
    resonance: 1,
    attack: 0.02,
    decay: 0.3,
    sustain: 0.8,
    release: 0.25,
    gain: 0.36,
    reverb: 0.4,
    delay: 0.3,
    vibrato: { rate: 5, depth: 10 }
  },
  vocalLead: {
    label: 'Vocal Lead',
    group: 'Lead',
    oscillators: [
      { type: 'sawtooth', detune: -7, gain: 0.34 },
      { type: 'triangle', detune: 8, gain: 0.3 }
    ],
    filterType: 'lowpass',
    cutoff: 900,
    cutoffEnv: 1600,
    resonance: 2,
    attack: 0.05,
    decay: 0.5,
    sustain: 0.65,
    release: 0.3,
    gain: 0.34,
    reverb: 0.5,
    delay: 0.25,
    formants: { low: 700, high: 2400, q: 8 },
    vibrato: { rate: 5.6, depth: 9 },
    pitchFloor: 48
  },
  psyLead: {
    label: 'Psy Lead',
    group: 'Lead',
    oscillators: [
      { type: 'sawtooth', detune: -8, gain: 0.35 },
      { type: 'square', detune: 9, gain: 0.25 }
    ],
    filterType: 'bandpass',
    cutoff: 1100,
    cutoffEnv: 3600,
    resonance: 12,
    attack: 0.006,
    decay: 0.24,
    sustain: 0.4,
    release: 0.14,
    gain: 0.3,
    reverb: 0.35,
    delay: 0.4,
    drive: 0.35,
    filterLfo: { sync: 4, depth: 1400, type: 'sh' },
    pitchFloor: 55
  },
  hardLead: {
    label: 'Hard Lead',
    group: 'Lead',
    oscillators: [
      { type: 'sawtooth', detune: -12, gain: 0.34 },
      { type: 'sawtooth', detune: 13, gain: 0.34 },
      { type: 'square', octave: -1, gain: 0.2 }
    ],
    filterType: 'lowpass',
    cutoff: 900,
    cutoffEnv: 3400,
    resonance: 5,
    attack: 0.008,
    decay: 0.4,
    sustain: 0.6,
    release: 0.18,
    gain: 0.28,
    reverb: 0.28,
    drive: 0.55
  },
  whistleLead: {
    label: 'Whistle Lead',
    group: 'Lead',
    oscillators: [{ type: 'sine', gain: 0.8 }],
    noise: 0.03,
    octave: 1,
    filterType: 'bandpass',
    cutoff: 2600,
    cutoffEnv: 2200,
    resonance: 8,
    attack: 0.04,
    decay: 0.3,
    sustain: 0.7,
    release: 0.3,
    gain: 0.3,
    reverb: 0.55,
    delay: 0.35,
    vibrato: { rate: 6, depth: 14 },
    pitchFloor: 72
  },

  // --- Plucks and arps ---
  fmPluck: {
    label: 'FM Pluck',
    group: 'Pluck',
    oscillators: [{ type: 'sine', gain: 0.8 }],
    filterType: 'lowpass',
    cutoff: 1600,
    cutoffEnv: 3000,
    resonance: 2,
    attack: 0.002,
    decay: 0.2,
    sustain: 0.02,
    release: 0.25,
    gain: 0.4,
    reverb: 0.4,
    delay: 0.35,
    fm: { ratio: 4.02, index: 3, decay: 0.06 },
    maxDuration: 0.8
  },
  bellPluck: {
    label: 'Bell Pluck',
    group: 'Pluck',
    oscillators: [
      { type: 'sine', gain: 0.5 },
      { type: 'sine', octave: 2, detune: 7, gain: 0.18 }
    ],
    filterType: 'highpass',
    cutoff: 400,
    cutoffEnv: 2600,
    resonance: 2,
    attack: 0.002,
    decay: 0.5,
    sustain: 0.02,
    release: 0.6,
    gain: 0.46,
    reverb: 0.6,
    delay: 0.4,
    ringMod: { ratio: 2.02, depth: 0.35 },
    maxDuration: 1.4,
    pitchFloor: 60
  },
  nylonPluck: {
    label: 'Nylon Pluck',
    group: 'Pluck',
    oscillators: [
      { type: 'triangle', gain: 0.5 },
      { type: 'sawtooth', detune: 5, gain: 0.16 }
    ],
    noise: 0.05,
    filterType: 'lowpass',
    cutoff: 900,
    cutoffEnv: 2400,
    resonance: 3,
    attack: 0.002,
    decay: 0.3,
    sustain: 0.02,
    release: 0.3,
    gain: 0.4,
    reverb: 0.35,
    keyTracking: 0.5,
    maxDuration: 1,
    pitchFloor: 48
  },
  dubPluck: {
    label: 'Dub Pluck',
    group: 'Pluck',
    oscillators: [
      { type: 'triangle', detune: -6, gain: 0.4 },
      { type: 'sine', octave: 1, gain: 0.16 }
    ],
    filterType: 'lowpass',
    cutoff: 700,
    cutoffEnv: 1800,
    resonance: 4,
    attack: 0.003,
    decay: 0.18,
    sustain: 0.02,
    release: 0.3,
    gain: 0.36,
    reverb: 0.7,
    delay: 0.65,
    maxDuration: 0.6,
    pitchFloor: 48
  },
  glassPluck: {
    label: 'Glass Pluck',
    group: 'Pluck',
    oscillators: [
      { type: 'sine', gain: 0.45 },
      { type: 'triangle', octave: 1, detune: 11, gain: 0.22 }
    ],
    filterType: 'highpass',
    cutoff: 900,
    cutoffEnv: 3200,
    resonance: 3,
    attack: 0.002,
    decay: 0.26,
    sustain: 0.02,
    release: 0.5,
    gain: 0.46,
    reverb: 0.65,
    delay: 0.5,
    maxDuration: 1,
    pitchFloor: 60
  },
  woodPluck: {
    label: 'Wood Pluck',
    group: 'Pluck',
    oscillators: [
      { type: 'sine', gain: 0.6 },
      { type: 'square', octave: 1, gain: 0.1 }
    ],
    noise: 0.08,
    filterType: 'bandpass',
    cutoff: 1200,
    cutoffEnv: 1800,
    resonance: 4,
    attack: 0.001,
    decay: 0.16,
    sustain: 0.01,
    release: 0.15,
    gain: 0.52,
    reverb: 0.3,
    maxDuration: 0.5,
    pitchFloor: 60
  },
  arpSquare: {
    label: 'Arp Square',
    group: 'Pluck',
    oscillators: [
      { type: 'square', gain: 0.4 },
      { type: 'square', detune: 9, octave: 1, gain: 0.16 }
    ],
    filterType: 'lowpass',
    cutoff: 800,
    cutoffEnv: 3200,
    resonance: 7,
    attack: 0.002,
    decay: 0.18,
    sustain: 0.04,
    release: 0.16,
    gain: 0.34,
    reverb: 0.35,
    delay: 0.45,
    keyTracking: 0.5,
    maxDuration: 0.7,
    pitchFloor: 48
  },

  // --- Keys ---
  fmKeys: {
    label: 'FM Keys',
    group: 'Keys',
    oscillators: [{ type: 'sine', gain: 0.75 }],
    filterType: 'lowpass',
    cutoff: 2200,
    cutoffEnv: 1800,
    resonance: 1,
    attack: 0.004,
    decay: 0.8,
    sustain: 0.3,
    release: 0.5,
    gain: 0.4,
    reverb: 0.4,
    fm: { ratio: 1.99, index: 1.6, decay: 0.35 }
  },
  clav: {
    label: 'Clav',
    group: 'Keys',
    oscillators: [
      { type: 'square', gain: 0.42 },
      { type: 'sawtooth', detune: 8, gain: 0.2 }
    ],
    filterType: 'bandpass',
    cutoff: 1400,
    cutoffEnv: 2600,
    resonance: 5,
    attack: 0.002,
    decay: 0.2,
    sustain: 0.05,
    release: 0.18,
    gain: 0.36,
    reverb: 0.25,
    keyTracking: 0.5,
    maxDuration: 0.7,
    pitchFloor: 55
  },
  vibraphone: {
    label: 'Vibraphone',
    group: 'Keys',
    oscillators: [
      { type: 'sine', gain: 0.6 },
      { type: 'sine', octave: 2, detune: 4, gain: 0.14 }
    ],
    filterType: 'lowpass',
    cutoff: 2000,
    cutoffEnv: 1800,
    resonance: 1.2,
    attack: 0.003,
    decay: 0.9,
    sustain: 0.06,
    release: 0.8,
    gain: 0.36,
    reverb: 0.5,
    ampLfo: { rate: 5.5, depth: 0.25, type: 'sine' },
    maxDuration: 2,
    pitchFloor: 55
  },
  musicBox: {
    label: 'Music Box',
    group: 'Keys',
    oscillators: [
      { type: 'sine', gain: 0.5 },
      { type: 'sine', octave: 2, gain: 0.2 },
      { type: 'sine', octave: 3, detune: 9, gain: 0.06 }
    ],
    octave: 1,
    filterType: 'highpass',
    cutoff: 700,
    cutoffEnv: 2400,
    resonance: 1.4,
    attack: 0.002,
    decay: 0.7,
    sustain: 0.02,
    release: 0.7,
    gain: 0.46,
    reverb: 0.6,
    delay: 0.3,
    maxDuration: 1.6,
    pitchFloor: 72
  },
  glassKeys: {
    label: 'Glass Keys',
    group: 'Keys',
    oscillators: [
      { type: 'triangle', gain: 0.45 },
      { type: 'sine', octave: 1, detune: 6, gain: 0.24 }
    ],
    filterType: 'lowpass',
    cutoff: 1800,
    cutoffEnv: 2600,
    resonance: 1.6,
    attack: 0.01,
    decay: 0.7,
    sustain: 0.35,
    release: 0.6,
    gain: 0.34,
    reverb: 0.55,
    delay: 0.25,
    pitchFloor: 48
  },

  // --- Pads ---
  chorusPad: {
    label: 'Chorus Pad',
    group: 'Pad',
    oscillators: [{ type: 'sawtooth', gain: 0.5 }],
    unison: { voices: 4, detune: 16, spread: 0.7 },
    filterType: 'lowpass',
    cutoff: 500,
    cutoffEnv: 1600,
    resonance: 1.6,
    attack: 0.6,
    decay: 1.6,
    sustain: 0.7,
    release: 1.4,
    gain: 0.26,
    reverb: 0.6,
    filterLfo: { rate: 0.13, depth: 220 }
  },
  darkPad: {
    label: 'Dark Pad',
    group: 'Pad',
    oscillators: [
      { type: 'sawtooth', octave: -1, detune: -10, gain: 0.3 },
      { type: 'triangle', detune: 9, gain: 0.26 }
    ],
    filterType: 'lowpass',
    cutoff: 260,
    cutoffEnv: 900,
    resonance: 3,
    attack: 0.8,
    decay: 2,
    sustain: 0.7,
    release: 1.8,
    gain: 0.28,
    reverb: 0.7,
    drive: 0.15,
    filterLfo: { rate: 0.07, depth: 160 }
  },
  detroitStrings: {
    label: 'Detroit Strings',
    group: 'Pad',
    oscillators: [
      { type: 'sawtooth', detune: -14, gain: 0.26 },
      { type: 'sawtooth', detune: 6, gain: 0.26 },
      { type: 'sawtooth', octave: 1, detune: 16, gain: 0.14 }
    ],
    filterType: 'lowpass',
    cutoff: 700,
    cutoffEnv: 1800,
    resonance: 2,
    attack: 0.35,
    decay: 1,
    sustain: 0.7,
    release: 0.8,
    gain: 0.26,
    reverb: 0.6,
    delay: 0.2,
    vibrato: { rate: 4.4, depth: 6 }
  },
  airyPad: {
    label: 'Airy Pad',
    group: 'Pad',
    oscillators: [
      { type: 'sine', gain: 0.3 },
      { type: 'triangle', octave: 1, detune: 7, gain: 0.18 }
    ],
    noise: 0.06,
    noiseColor: 'pink',
    filterType: 'bandpass',
    cutoff: 1600,
    cutoffEnv: 2400,
    resonance: 2,
    attack: 1.1,
    decay: 2.2,
    sustain: 0.65,
    release: 2,
    gain: 0.26,
    reverb: 0.8,
    delay: 0.3,
    pitchFloor: 48
  },
  sweepPad: {
    label: 'Sweep Pad',
    group: 'Pad',
    oscillators: [
      { type: 'sawtooth', detune: -8, gain: 0.28 },
      { type: 'square', detune: 10, gain: 0.2 }
    ],
    filterType: 'lowpass',
    cutoff: 340,
    cutoffEnv: 2600,
    resonance: 7,
    attack: 0.5,
    decay: 1.6,
    sustain: 0.7,
    release: 1.4,
    gain: 0.24,
    reverb: 0.65,
    filterLfo: { sync: 0.0625, depth: 900 }
  },
  analogBrass: {
    label: 'Analog Brass',
    group: 'Pad',
    oscillators: [
      { type: 'sawtooth', detune: -7, gain: 0.3 },
      { type: 'sawtooth', detune: 8, gain: 0.3 }
    ],
    filterType: 'lowpass',
    cutoff: 420,
    cutoffEnv: 2600,
    resonance: 3.5,
    attack: 0.12,
    decay: 0.8,
    sustain: 0.6,
    release: 0.4,
    gain: 0.28,
    reverb: 0.4,
    drive: 0.2
  },

  // --- Drones and atmospheres ---
  subDrone: {
    label: 'Sub Drone',
    group: 'Drone',
    oscillators: [
      { type: 'sine', gain: 0.7 },
      { type: 'sine', detune: 7, octave: -1, gain: 0.4 }
    ],
    filterType: 'lowpass',
    cutoff: 110,
    cutoffEnv: 200,
    resonance: 2,
    attack: 1.5,
    decay: 3,
    sustain: 0.8,
    release: 2.5,
    gain: 0.5,
    reverb: 0.6
  },
  metalDrone: {
    label: 'Metal Drone',
    group: 'Drone',
    oscillators: [{ type: 'triangle', gain: 0.3 }],
    noise: 0.25,
    noiseColor: 'metal',
    filterType: 'bandpass',
    cutoff: 1200,
    cutoffEnv: 1800,
    resonance: 7,
    attack: 1.2,
    decay: 2.4,
    sustain: 0.6,
    release: 2.2,
    gain: 0.24,
    reverb: 0.75,
    delay: 0.3,
    filterLfo: { rate: 0.05, depth: 700 },
    pitchFloor: 43
  },
  noiseBed: {
    label: 'Noise Bed',
    group: 'Drone',
    oscillators: [{ type: 'sine', gain: 0.08 }],
    noise: 0.5,
    noiseColor: 'pink',
    filterType: 'lowpass',
    cutoff: 600,
    cutoffEnv: 1400,
    resonance: 1.4,
    attack: 1.6,
    decay: 3,
    sustain: 0.7,
    release: 2.6,
    gain: 0.22,
    reverb: 0.8
  },
  tapeHiss: {
    label: 'Tape Hiss',
    group: 'Drone',
    oscillators: [{ type: 'sine', gain: 0.04 }],
    noise: 0.42,
    noiseColor: 'pink',
    filterType: 'highpass',
    cutoff: 2200,
    cutoffEnv: 1800,
    resonance: 0.8,
    attack: 0.8,
    decay: 2,
    sustain: 0.6,
    release: 1.6,
    gain: 0.2,
    reverb: 0.5,
    ampLfo: { rate: 0.7, depth: 0.2, type: 'sine' }
  },
  caveDrone: {
    label: 'Cave Drone',
    group: 'Drone',
    oscillators: [
      { type: 'sawtooth', octave: -1, detune: -9, gain: 0.2 },
      { type: 'sine', gain: 0.24 }
    ],
    noise: 0.1,
    filterType: 'lowpass',
    cutoff: 220,
    cutoffEnv: 1100,
    resonance: 8,
    attack: 1.4,
    decay: 3,
    sustain: 0.65,
    release: 2.8,
    gain: 0.26,
    reverb: 0.85,
    delay: 0.4,
    filterLfo: { rate: 0.04, depth: 420 }
  },

  // --- Tuned percussion ---
  woodBlock: {
    label: 'Wood Block',
    group: 'Perc',
    oscillators: [
      { type: 'sine', gain: 0.6 },
      { type: 'square', octave: 1, gain: 0.14 }
    ],
    noise: 0.1,
    filterType: 'bandpass',
    cutoff: 1800,
    cutoffEnv: 1600,
    resonance: 6,
    attack: 0.001,
    decay: 0.09,
    sustain: 0.01,
    release: 0.09,
    gain: 0.5,
    reverb: 0.3,
    maxDuration: 0.3,
    pitchFloor: 67
  },
  tunedTom: {
    label: 'Tuned Tom',
    group: 'Perc',
    oscillators: [
      { type: 'sine', gain: 0.8 },
      { type: 'triangle', detune: 12, gain: 0.2 }
    ],
    filterType: 'lowpass',
    cutoff: 600,
    cutoffEnv: 900,
    resonance: 2,
    attack: 0.002,
    decay: 0.3,
    sustain: 0.02,
    release: 0.25,
    gain: 0.55,
    reverb: 0.35,
    pitchEnv: { semitones: 5, time: 0.1 },
    maxDuration: 0.6
  },
  cowbell: {
    label: 'Cowbell',
    group: 'Perc',
    oscillators: [
      { type: 'square', gain: 0.35 },
      { type: 'square', detune: 40, octave: 1, gain: 0.25 }
    ],
    filterType: 'bandpass',
    cutoff: 2200,
    cutoffEnv: 1200,
    resonance: 5,
    attack: 0.001,
    decay: 0.16,
    sustain: 0.02,
    release: 0.14,
    gain: 0.44,
    reverb: 0.4,
    maxDuration: 0.4,
    pitchFloor: 67
  },
  clave: {
    label: 'Clave',
    group: 'Perc',
    oscillators: [{ type: 'sine', gain: 0.7 }],
    octave: 1,
    filterType: 'bandpass',
    cutoff: 2400,
    cutoffEnv: 1800,
    resonance: 9,
    attack: 0.001,
    decay: 0.06,
    sustain: 0.01,
    release: 0.06,
    gain: 0.42,
    reverb: 0.35,
    maxDuration: 0.2,
    pitchFloor: 72
  },
  bellPerc: {
    label: 'Bell Perc',
    group: 'Perc',
    oscillators: [
      { type: 'sine', gain: 0.4 },
      { type: 'sine', octave: 2, detune: 14, gain: 0.2 }
    ],
    filterType: 'highpass',
    cutoff: 1200,
    cutoffEnv: 2600,
    resonance: 3,
    attack: 0.001,
    decay: 0.35,
    sustain: 0.02,
    release: 0.4,
    gain: 0.44,
    reverb: 0.6,
    delay: 0.4,
    ringMod: { ratio: 5.4, depth: 0.6 },
    maxDuration: 0.9,
    pitchFloor: 72
  },
  rimTone: {
    label: 'Rim Tone',
    group: 'Perc',
    oscillators: [{ type: 'triangle', gain: 0.5 }],
    noise: 0.2,
    filterType: 'bandpass',
    cutoff: 1600,
    cutoffEnv: 2200,
    resonance: 7,
    attack: 0.001,
    decay: 0.05,
    sustain: 0.01,
    release: 0.06,
    gain: 0.4,
    reverb: 0.35,
    delay: 0.25,
    maxDuration: 0.2,
    pitchFloor: 72
  },

  // --- FX ---
  riser: {
    label: 'Riser',
    group: 'FX',
    oscillators: [{ type: 'sawtooth', gain: 0.2 }],
    noise: 0.4,
    filterType: 'bandpass',
    cutoff: 400,
    cutoffEnv: 7000,
    resonance: 6,
    attack: 1.6,
    decay: 0.4,
    sustain: 0.9,
    release: 0.3,
    gain: 0.26,
    reverb: 0.6,
    delay: 0.2,
    pitchEnv: { semitones: -24, time: 2 }
  },
  downlifter: {
    label: 'Downlifter',
    group: 'FX',
    oscillators: [{ type: 'sawtooth', gain: 0.25 }],
    noise: 0.35,
    filterType: 'lowpass',
    cutoff: 6000,
    cutoffEnv: 200,
    resonance: 5,
    attack: 0.01,
    decay: 1.4,
    sustain: 0.2,
    release: 0.8,
    gain: 0.26,
    reverb: 0.6,
    pitchEnv: { semitones: 24, time: 1.4 }
  },
  siren: {
    label: 'Siren',
    group: 'FX',
    oscillators: [
      { type: 'sawtooth', gain: 0.35 },
      { type: 'square', detune: 12, gain: 0.2 }
    ],
    filterType: 'bandpass',
    cutoff: 1400,
    cutoffEnv: 2600,
    resonance: 10,
    attack: 0.1,
    decay: 0.6,
    sustain: 0.7,
    release: 0.5,
    gain: 0.26,
    reverb: 0.55,
    delay: 0.35,
    vibrato: { rate: 1.4, depth: 220 },
    pitchFloor: 55
  },
  impact: {
    label: 'Impact',
    group: 'FX',
    oscillators: [
      { type: 'sine', gain: 0.7 },
      { type: 'triangle', octave: -1, gain: 0.4 }
    ],
    noise: 0.4,
    filterType: 'lowpass',
    cutoff: 1200,
    cutoffEnv: 2600,
    resonance: 3,
    attack: 0.002,
    decay: 0.7,
    sustain: 0.05,
    release: 1.2,
    gain: 0.5,
    reverb: 0.8,
    drive: 0.3,
    pitchEnv: { semitones: 12, time: 0.25 },
    maxDuration: 1.5
  },
  vinylCrackle: {
    label: 'Vinyl Crackle',
    group: 'FX',
    oscillators: [{ type: 'sine', gain: 0.02 }],
    noise: 0.35,
    noiseColor: 'pink',
    filterType: 'highpass',
    cutoff: 3200,
    cutoffEnv: 2600,
    resonance: 1,
    attack: 0.3,
    decay: 1.2,
    sustain: 0.5,
    release: 0.8,
    gain: 0.22,
    reverb: 0.35,
    ampLfo: { rate: 7, depth: 0.5, type: 'sh' }
  },
  reverseSwell: {
    label: 'Reverse Swell',
    group: 'FX',
    oscillators: [
      { type: 'triangle', detune: -8, gain: 0.24 },
      { type: 'sawtooth', detune: 9, gain: 0.18 }
    ],
    noise: 0.2,
    filterType: 'bandpass',
    cutoff: 800,
    cutoffEnv: 4200,
    resonance: 5,
    attack: 1.8,
    decay: 0.3,
    sustain: 0.95,
    release: 0.12,
    gain: 0.26,
    reverb: 0.7,
    delay: 0.3
  },
} satisfies Record<string, Preset>;

type PresetId = keyof typeof PRESETS;
export type InstrumentId = PresetId | DrumKitId;



type DrumKit = {
  label: string;
  kick: { start: number; end: number; glide: number; decay: number; click: number; level: number };
  snare: {
    body: number;
    bodyDecay: number;
    noiseFreq: number;
    noiseDecay: number;
    level: number;
    color?: NoiseColor;
    clap?: boolean; // render the snare as a stacked clap instead of a single burst
  };
  hat: { freq: number; closed: number; open: number; level: number; color?: NoiseColor };
  cymbal: { freq: number; decay: number; color?: NoiseColor };
  tomTune: number;
  drive: number;
  reverb: number; // multiplies the per-hit reverb sends
};

const DRUM_KITS = {
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
  },
  drum808: {
    label: '808 Kit',
    kick: { start: 120, end: 33, glide: 0.13, decay: 1.1, click: 0.3, level: 1 },
    snare: { body: 185, bodyDecay: 0.1, noiseFreq: 1600, noiseDecay: 0.16, level: 0.55 },
    hat: { freq: 9000, closed: 0.028, open: 0.5, level: 0.3, color: 'metal' },
    cymbal: { freq: 5400, decay: 2.4, color: 'metal' },
    tomTune: 0.9,
    drive: 0.08,
    reverb: 1
  },
  drum707: {
    label: '707 Kit',
    kick: { start: 150, end: 50, glide: 0.03, decay: 0.3, click: 0.45, level: 1 },
    snare: { body: 220, bodyDecay: 0.05, noiseFreq: 2600, noiseDecay: 0.1, level: 0.6 },
    hat: { freq: 10500, closed: 0.025, open: 0.24, level: 0.32 },
    cymbal: { freq: 6200, decay: 1.2 },
    tomTune: 1.15,
    drive: 0.1,
    reverb: 0.9
  },
  drum606: {
    label: '606 Kit',
    kick: { start: 140, end: 55, glide: 0.025, decay: 0.26, click: 0.55, level: 0.92 },
    snare: { body: 260, bodyDecay: 0.04, noiseFreq: 3200, noiseDecay: 0.12, level: 0.62 },
    hat: { freq: 11500, closed: 0.03, open: 0.3, level: 0.34, color: 'metal' },
    cymbal: { freq: 7000, decay: 1.1, color: 'metal' },
    tomTune: 1.2,
    drive: 0.15,
    reverb: 0.85
  },
  drumElectro: {
    label: 'Electro Kit',
    kick: { start: 130, end: 40, glide: 0.08, decay: 0.7, click: 0.5, level: 1.05 },
    snare: { body: 200, bodyDecay: 0.07, noiseFreq: 2000, noiseDecay: 0.14, level: 0.7, clap: true },
    hat: { freq: 9800, closed: 0.03, open: 0.36, level: 0.34, color: 'metal' },
    cymbal: { freq: 5800, decay: 1.8, color: 'metal' },
    tomTune: 1,
    drive: 0.18,
    reverb: 1.1
  },
  drumMinimal: {
    label: 'Minimal Click Kit',
    kick: { start: 145, end: 46, glide: 0.03, decay: 0.24, click: 0.7, level: 0.95 },
    snare: { body: 240, bodyDecay: 0.03, noiseFreq: 3600, noiseDecay: 0.06, level: 0.5 },
    hat: { freq: 12000, closed: 0.018, open: 0.14, level: 0.3 },
    cymbal: { freq: 7600, decay: 0.7 },
    tomTune: 1.1,
    drive: 0.05,
    reverb: 0.7
  },
  drumHard: {
    label: 'Hard Techno Kit',
    kick: { start: 190, end: 44, glide: 0.05, decay: 0.55, click: 0.65, level: 1.2 },
    snare: { body: 210, bodyDecay: 0.06, noiseFreq: 2400, noiseDecay: 0.15, level: 0.8, clap: true },
    hat: { freq: 9200, closed: 0.03, open: 0.34, level: 0.4 },
    cymbal: { freq: 5000, decay: 2, color: 'metal' },
    tomTune: 1,
    drive: 0.35,
    reverb: 1.2
  },
  drumIndustrial: {
    label: 'Industrial Kit',
    kick: { start: 110, end: 38, glide: 0.09, decay: 0.7, click: 0.8, level: 1.15 },
    snare: { body: 170, bodyDecay: 0.12, noiseFreq: 1300, noiseDecay: 0.45, level: 0.85, color: 'metal' },
    hat: { freq: 6800, closed: 0.06, open: 0.5, level: 0.42, color: 'metal' },
    cymbal: { freq: 3800, decay: 2.6, color: 'metal' },
    tomTune: 0.8,
    drive: 0.4,
    reverb: 1.4
  },
  drumAcoustic: {
    label: 'Acoustic Kit',
    kick: { start: 120, end: 48, glide: 0.05, decay: 0.4, click: 0.4, level: 1 },
    snare: { body: 195, bodyDecay: 0.1, noiseFreq: 1200, noiseDecay: 0.22, level: 0.75, color: 'pink' },
    hat: { freq: 7600, closed: 0.05, open: 0.36, level: 0.36, color: 'pink' },
    cymbal: { freq: 4400, decay: 1.8, color: 'pink' },
    tomTune: 0.95,
    drive: 0,
    reverb: 1.1
  }
} satisfies Record<string, DrumKit>;

type DrumKitId = keyof typeof DRUM_KITS;

function isDrumKit(id: InstrumentId): id is DrumKitId {
  return id in DRUM_KITS;
}

export const INSTRUMENTS: InstrumentOption[] = [
  ...(Object.keys(PRESETS) as PresetId[]).map(id => ({
    id: id as InstrumentId,
    label: PRESETS[id].label,
    group: PRESETS[id].group as InstrumentGroup
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

// A short lookahead keeps instrument changes audible almost immediately. When the
// tab is hidden the browser clamps timers to ~1s, so the window has to grow or
// playback drops out until the next tick.
const LOOKAHEAD_VISIBLE = 0.25;
const LOOKAHEAD_HIDDEN = 2.5;
const SCHEDULE_INTERVAL_MS = 40;
const STEP_LFO_BASE_HZ = 8; // sample & hold buffer is cut at this rate, then resampled

function midiToFrequency(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

function createNoiseBuffer(ctx: BaseAudioContext, color: NoiseColor): AudioBuffer {
  const noise = createRng(0x9e3d_71b1);
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (color === 'pink') {
    // Paul Kellet's economy pink noise filter: darker, closer to analogue hiss
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = noise() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.32;
    }
  } else if (color === 'metal') {
    // Six detuned square partials: the ringing metallic bed of 808/909 cymbals
    const partials = [1, 1.41, 1.68, 2.11, 2.53, 3.07];
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (const partial of partials) sum += Math.sign(Math.sin(2 * Math.PI * 320 * partial * (i / ctx.sampleRate)));
      data[i] = (sum / partials.length) * 0.9;
    }
  } else {
    for (let i = 0; i < length; i++) data[i] = noise() * 2 - 1;
  }
  return buffer;
}

/** Stepped random values, played back at varying rates to act as a sample & hold LFO. */
function createStepBuffer(ctx: BaseAudioContext): AudioBuffer {
  const stepRng = createRng(0x2545_f491);
  const stepSamples = Math.floor(ctx.sampleRate / STEP_LFO_BASE_HZ);
  const steps = 32;
  const buffer = ctx.createBuffer(1, stepSamples * steps, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let step = 0; step < steps; step++) {
    const value = stepRng() * 2 - 1;
    data.fill(value, step * stepSamples, (step + 1) * stepSamples);
  }
  return buffer;
}

function createReverbBuffer(ctx: BaseAudioContext): AudioBuffer {
  const tailRng = createRng(0x6d2b_79f5);
  const seconds = 2.6;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2.6);
      data[i] = (tailRng() * 2 - 1) * decay;
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
  private ctx: BaseAudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbReturn: GainNode | null = null;
  private delay: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private noiseBuffers: Record<NoiseColor, AudioBuffer> | null = null;
  private stepBuffer: AudioBuffer | null = null;
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
  private humanize = 0.45;
  /** Per-voice imperfection comes from here, so a render can be repeated exactly. */
  private rng = createRng(0x1f35_3cd0);
  private lookahead = LOOKAHEAD_VISIBLE;
  private loop: { start: number; end: number } | null = null;
  /** Scheduling crosses the loop point before the audio does, so the playhead
   *  follows its own copy of the origin, advanced as each wrap actually sounds. */
  private displayStartedAt = 0;
  private wraps: { at: number; startedAt: number }[] = [];

  onEnded: (() => void) | null = null;

  private onVisibility = () => {
    this.lookahead = document.hidden ? LOOKAHEAD_HIDDEN : LOOKAHEAD_VISIBLE;
    if (this.playing) this.tick();
  };

  constructor() {
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onVisibility();
  }

  get duration(): number {
    return this.song?.duration ?? 0;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get position(): number {
    if (!this.playing || !this.ctx) return this.offset;
    this.drainWraps();
    return Math.min(this.duration, this.ctx.currentTime - this.displayStartedAt);
  }

  get loopRegion(): { start: number; end: number } | null {
    return this.loop;
  }

  setLoop(start: number, end: number) {
    const from = Math.max(0, Math.min(this.duration, start));
    const to = Math.max(from + 0.25, Math.min(this.duration, end));
    this.loop = { start: from, end: to };
    if (this.playing) this.reschedule();
  }

  clearLoop() {
    this.loop = null;
    if (this.playing) this.reschedule();
  }

  /** Drops everything queued ahead and re-arms the scheduler from where we are now. */
  private reschedule() {
    if (!this.ctx || !this.playing) return;
    const here = this.position;
    this.killVoices();
    this.setBusLevels(1);
    this.wraps = [];
    this.startedAt = this.ctx.currentTime - here;
    this.displayStartedAt = this.startedAt;
    this.resetCursors(here);
    this.tick();
  }

  private drainWraps() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    while (this.wraps.length && this.wraps[0].at <= now) {
      this.displayStartedAt = this.wraps.shift()!.startedAt;
    }
  }

  private ensureContext(): BaseAudioContext {
    if (!this.ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.buildGraph(new Ctor());
    }
    return this.ctx!;
  }

  /** Builds the mix bus on any context, live or offline. */
  private buildGraph(ctx: BaseAudioContext) {
    {
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
      this.reverbReturn = reverbGain;
      this.delay = delay;
      this.delayFeedback = feedback;
      this.noiseBuffers = {
        white: createNoiseBuffer(ctx, 'white'),
        pink: createNoiseBuffer(ctx, 'pink'),
        metal: createNoiseBuffer(ctx, 'metal')
      };
      this.stepBuffer = createStepBuffer(ctx);
    }
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

  /** `resumeAt` keeps the playhead across a live recompose. */
  load(song: ParsedMidi, settings: TrackSettings[], resumeAt = 0) {
    this.stop();
    this.song = song;
    this.bpm = song.bpm || 120;
    this.settings = settings.map(setting => ({ ...setting }));
    this.offset = Math.max(0, Math.min(song.duration, resumeAt));

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

  /** How much analogue drift each voice gets: detune, cutoff, timing and noise phase. */
  setHumanize(amount: number) {
    this.humanize = Math.max(0, Math.min(1, amount));
  }

  /** Symmetric jitter, scaled by the current feel setting. */
  private drift(range: number): number {
    return (this.rng() * 2 - 1) * range * this.humanize;
  }

  setMasterVolume(volume: number) {
    this.masterVolume = volume;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02);
  }

  async play() {
    if (!this.song || this.playing) return;
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await (ctx as AudioContext).resume();

    if (this.offset >= this.duration) this.offset = 0;
    this.setBusLevels(1);
    this.startedAt = ctx.currentTime - this.offset;
    this.displayStartedAt = this.startedAt;
    this.wraps = [];
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
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.halt();
    (this.ctx as AudioContext | null)?.close?.();
    this.ctx = null;
  }

  /**
   * Renders a stretch of the song through the same voices the live player uses.
   *
   * Long pieces are rendered in windows: one OfflineAudioContext holding twenty
   * minutes of notes never finishes, and the caller gets progress this way. Each
   * window is preceded by a discarded pre-roll so reverb tails and sustained
   * notes carry across the seams.
   */
  async renderChunk(from: number, to: number, preRoll: number, sampleRate: number): Promise<AudioBuffer> {
    const song = this.song;
    if (!song) throw new Error('Nothing to render');

    const windowStart = Math.max(0, from - preRoll);
    const lead = from - windowStart;
    const frames = Math.ceil((to - windowStart) * sampleRate);

    const offline = new OfflineAudioContext(2, frames, sampleRate);
    const renderer = new MidiAudioEngine();
    renderer.dispose(); // only the graph is needed, not the transport or its listeners
    renderer.song = song;
    renderer.bpm = this.bpm;
    renderer.masterVolume = this.masterVolume;
    renderer.settings = this.settings.map(setting => ({ ...setting }));
    renderer.buildGraph(offline);

    song.tracks.forEach((_, index) => {
      const dry = offline.createGain();
      dry.gain.value = renderer.gainFor(index);
      dry.connect(renderer.master!);
      const wet = offline.createGain();
      wet.connect(renderer.reverb!);
      const echo = offline.createGain();
      echo.connect(renderer.delay!);
      renderer.trackDry.push(dry);
      renderer.trackWet.push(wet);
      renderer.trackEcho.push(echo);
    });
    if (renderer.delay) renderer.delay.delayTime.value = (60 / renderer.bpm) * 0.75;

    for (const [index, track] of song.tracks.entries()) {
      if (renderer.settings[index]?.muted) continue;
      for (const note of track.notes) {
        if (note.time >= to) break;
        // Notes already sounding when the window opens start at its edge
        if (note.time + note.duration <= windowStart) continue;
        renderer.spawn(index, note, Math.max(0, note.time - windowStart));
      }
    }

    const rendered = await offline.startRendering();
    if (lead <= 0) return rendered;

    // Trim the pre-roll back off
    const keepFrames = rendered.length - Math.floor(lead * sampleRate);
    const trimmed = new AudioBuffer({ length: keepFrames, numberOfChannels: 2, sampleRate });
    const offset = Math.floor(lead * sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      trimmed.copyToChannel(rendered.getChannelData(channel).subarray(offset, offset + keepFrames), channel);
    }
    return trimmed;
  }

  /** Renders a range as a sequence of windows, reporting progress between them. */
  async renderRange(
    from: number,
    to: number,
    onChunk: (buffer: AudioBuffer, progress: number) => void,
    sampleRate = 44100
  ): Promise<void> {
    const start = Math.max(0, Math.min(this.duration, from));
    const end = Math.max(start + 0.1, Math.min(this.duration, to));
    const tail = 3; // let reverb and delay ring out past the last note
    const chunk = 45;
    const preRoll = 8;
    const total = end + tail - start;

    for (let at = start; at < end + tail; at += chunk) {
      const until = Math.min(end + tail, at + chunk);
      const buffer = await this.renderChunk(at, until, at === start ? 0 : preRoll, sampleRate);
      onChunk(buffer, Math.min(1, (until - start) / total));
      // Yield so the progress paint lands before the next window starts
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  private halt() {
    this.playing = false;
    this.wraps = [];
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.killVoices();
    this.setBusLevels(0);
  }

  /**
   * The reverb and delay are shared, so their tails outlive the voices that fed
   * them. Stopping means silence, so the returns are closed on halt and opened
   * again on play.
   */
  private setBusLevels(scale: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.reverbReturn) {
      this.reverbReturn.gain.cancelScheduledValues(now);
      this.reverbReturn.gain.setTargetAtTime(0.85 * scale, now, 0.02);
    }
    if (this.delayFeedback) {
      this.delayFeedback.gain.cancelScheduledValues(now);
      this.delayFeedback.gain.setTargetAtTime(0.38 * scale, now, 0.02);
    }
  }

  private killVoices() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const voice of this.voices) {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(0, now, 0.01);
        voice.nodes.forEach(node => {
          try {
            node.stop(now + 0.06);
          } catch {
            // Already stopped, or stopped before it ever started
          }
        });
      } catch {
        // Nothing left to clean up on this voice
      }
      // Detach once the fade has finished so nothing can outlive the transport
      window.setTimeout(() => {
        try {
          voice.gain.disconnect();
        } catch {
          // Already detached
        }
      }, 140);
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
    const horizon = ctx.currentTime + this.lookahead;
    const song = this.song;

    // Each pass fills the window up to the loop point; crossing it rewinds the
    // cursors and keeps filling, so the wrap is scheduled ahead like any note.
    for (let pass = 0; pass < 16; pass++) {
      const loopEndTime = this.loop ? this.startedAt + this.loop.end : Infinity;
      const limit = Math.min(horizon, loopEndTime);

      song.tracks.forEach((track, index) => {
        let cursor = this.cursors[index];
        while (cursor < track.notes.length) {
          const note = track.notes[cursor];
          const when = this.startedAt + note.time;
          if (when > limit) break;
          if (!this.settings[index]?.muted) {
            this.spawn(index, note, Math.max(when, ctx.currentTime));
          }
          cursor++;
        }
        this.cursors[index] = cursor;
      });

      if (!this.loop || loopEndTime > horizon) break;

      const nextStartedAt = loopEndTime - this.loop.start;
      this.wraps.push({ at: loopEndTime, startedAt: nextStartedAt });
      this.startedAt = nextStartedAt;
      this.resetCursors(this.loop.start);
    }

    // Drop finished voices so the array does not grow across a long track
    const now = ctx.currentTime;
    this.voices = this.voices.filter(voice => voice.stopAt > now);

    if (!this.loop && this.position >= this.duration) {
      this.stop();
      this.onEnded?.();
    }
  }

  private spawn(trackIndex: number, note: ParsedNote, when: number) {
    const instrument = this.settings[trackIndex]?.instrument;
    if (!instrument) return;
    if (isDrumKit(instrument)) this.spawnDrum(trackIndex, note, when, DRUM_KITS[instrument]);
    else this.spawnSynth(trackIndex, note, when, PRESETS[instrument] as Preset);
  }

  /** Starts an LFO and returns its output gain, already scaled to the requested depth. */
  private startLfo(spec: LfoSpec, depth: number, when: number, stopAt: number, nodes: AudioScheduledSourceNode[]): GainNode {
    const ctx = this.ctx!;
    const amount = ctx.createGain();
    amount.gain.value = depth;

    if (spec.type === 'sh' && this.stepBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = this.stepBuffer;
      source.loop = true;
      source.playbackRate.value = this.lfoRate(spec) / STEP_LFO_BASE_HZ;
      source.connect(amount);
      source.start(when);
      source.stop(stopAt);
      nodes.push(source);
      return amount;
    }

    const lfo = ctx.createOscillator();
    lfo.type = (spec.type ?? 'sine') as OscillatorType;
    lfo.frequency.value = this.lfoRate(spec);
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
    let sourcePitch = note.pitch + (preset.octave ?? 0) * 12;
    if (preset.pitchFloor) {
      while (sourcePitch < preset.pitchFloor) sourcePitch += 12;
    }
    const frequency = midiToFrequency(sourcePitch);

    const nodes: AudioScheduledSourceNode[] = [];

    const amp = ctx.createGain();
    const peak = preset.gain * (0.32 + velocity * 0.68) * (1 + this.drift(0.06));
    const attack = Math.max(0.001, preset.attack * (1 + this.drift(0.12)));
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.linearRampToValueAtTime(peak, when + attack);
    amp.gain.setTargetAtTime(peak * preset.sustain, when + attack, Math.max(0.02, preset.decay / 3));
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
    // A real filter never lands on exactly the same cutoff twice
    const cutoffDrift = 1 + this.drift(0.05);
    const floor = Math.min(16000, (preset.cutoff + tracking) * cutoffDrift);
    const ceiling = Math.min(18000, floor + preset.cutoffEnv * cutoffDrift * (0.4 + velocity * 0.6));
    filter.frequency.setValueAtTime(floor, when);
    filter.frequency.linearRampToValueAtTime(ceiling, when + attack + 0.01);
    filter.frequency.setTargetAtTime(floor + (ceiling - floor) * preset.sustain, when + attack + 0.01, Math.max(0.03, preset.decay / 2));

    // oscillators -> filter -> [highpass] -> [formants] -> [drive] -> amp -> gate -> outputs
    let chainEnd: AudioNode = filter;

    if (preset.highpass) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = preset.highpass;
      hp.Q.value = 0.7;
      chainEnd.connect(hp);
      chainEnd = hp;
    }

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

    let voiceOut: AudioNode = ampOut;
    if (preset.unison?.spread) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = (this.rng() * 2 - 1) * preset.unison.spread;
      ampOut.connect(panner);
      voiceOut = panner;
    }
    voiceOut.connect(dry);

    if (wet && preset.reverb > 0) {
      const send = ctx.createGain();
      send.gain.value = preset.reverb;
      voiceOut.connect(send);
      send.connect(wet);
    }
    if (echo && preset.delay) {
      const send = ctx.createGain();
      send.gain.value = preset.delay;
      voiceOut.connect(send);
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

    // Frequency modulation: one sine drives the pitch of every carrier
    let fmGain: GainNode | null = null;
    if (preset.fm) {
      const modulator = ctx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.value = frequency * preset.fm.ratio;
      fmGain = ctx.createGain();
      const depth = frequency * preset.fm.index;
      fmGain.gain.setValueAtTime(depth, when);
      if (preset.fm.decay) fmGain.gain.setTargetAtTime(depth * 0.08, when, preset.fm.decay);
      modulator.connect(fmGain);
      modulator.start(when);
      modulator.stop(stopAt);
      nodes.push(modulator);
    }

    const copies = Math.max(1, Math.min(5, preset.unison?.voices ?? 1));
    const spreadCents = preset.unison?.detune ?? 0;

    for (const layer of preset.oscillators) {
      for (let copy = 0; copy < copies; copy++) {
        const osc = ctx.createOscillator();
        osc.type = layer.type;
        const layerFrequency = frequency * Math.pow(2, layer.octave ?? 0);
        if (preset.pitchEnv) {
          osc.frequency.setValueAtTime(layerFrequency * Math.pow(2, preset.pitchEnv.semitones / 12), when);
          osc.frequency.exponentialRampToValueAtTime(layerFrequency, when + preset.pitchEnv.time);
        } else {
          osc.frequency.value = layerFrequency;
        }
        const offset = copies > 1 ? (copy / (copies - 1) - 0.5) * 2 * spreadCents : 0;
        // Oscillators always restart at phase zero here, so identical notes would
        // stack up perfectly; a few cents of drift keeps repeats from ringing alike
        osc.detune.value = (layer.detune ?? 0) + offset + this.drift(7);
        if (vibratoGain) vibratoGain.connect(osc.detune);
        fmGain?.connect(osc.frequency);

        const layerGain = ctx.createGain();
        layerGain.gain.value = layer.gain / copies;
        osc.connect(layerGain);
        layerGain.connect(ringInput);
        osc.start(when);
        osc.stop(stopAt);
        nodes.push(osc);
      }
    }

    if (preset.noise && this.noiseBuffers) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffers[preset.noiseColor ?? 'white'];
      noise.loop = true;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = preset.noise;
      noise.connect(noiseGain);
      noiseGain.connect(ringInput);
      noise.start(when, this.humanize > 0 ? this.rng() * noise.buffer.duration : 0);
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

    const velocity = (0.25 + (note.velocity / 127) * 0.75) * (1 + this.drift(0.07));
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
      // Drum machines drift in tuning and decay from hit to hit
      const tune = 1 + this.drift(0.02);
      decay *= 1 + this.drift(0.08);
      osc.frequency.setValueAtTime(from * tune, when);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to * tune), when + glide);
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

    const noise = (
      filterType: BiquadFilterType,
      frequency: number,
      q: number,
      decay: number,
      level: number,
      at = when,
      color: NoiseColor = 'white'
    ) => {
      if (!this.noiseBuffers) return;
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffers[color];
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = frequency * (1 + this.drift(0.04));
      filter.Q.value = q;
      decay *= 1 + this.drift(0.1);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(level, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      // Starting every hit at sample zero is what makes repeated hats sound
      // machine-gunned; each one takes a different slice of the noise instead
      source.start(at, this.humanize > 0 ? this.rng() * source.buffer.duration : 0);
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
      case 40: { // Snare
        const decay = note.pitch === 40 ? kit.snare.noiseDecay * 1.3 : kit.snare.noiseDecay;
        tone('triangle', kit.snare.body, kit.snare.body * 0.8, kit.snare.bodyDecay, 0.4, 0.03);
        if (kit.snare.clap) {
          for (let i = 0; i < 3; i++) {
            noise('bandpass', kit.snare.noiseFreq * 1.4, 2.2, decay * 0.6, kit.snare.level, when + i * 0.011, kit.snare.color ?? 'white');
          }
        } else {
          noise('highpass', kit.snare.noiseFreq, 0.8, decay, kit.snare.level, when, kit.snare.color ?? 'white');
        }
        addSend(0.22);
        break;
      }
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
        noise('highpass', kit.hat.freq, 1, note.pitch === 44 ? kit.hat.closed * 1.3 : kit.hat.closed, kit.hat.level, when, kit.hat.color ?? 'white');
        addSend(0.1);
        break;
      case 46: // Open hat
        noise('highpass', kit.hat.freq * 0.88, 1, kit.hat.open, kit.hat.level * 0.85, when, kit.hat.color ?? 'white');
        addSend(0.18);
        break;
      case 49:
      case 52:
      case 57: // Crash / china
        noise('highpass', kit.cymbal.freq, 0.7, kit.cymbal.decay, 0.34, when, kit.cymbal.color ?? 'white');
        addSend(0.4);
        break;
      case 51:
      case 53:
      case 59: // Ride
        noise('bandpass', kit.cymbal.freq * 1.3, 1.6, kit.cymbal.decay * 0.5, 0.3, when, kit.cymbal.color ?? 'white');
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
