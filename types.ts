export enum NoteDuration {
  Whole = 1,
  Half = 0.5,
  Quarter = 0.25,
  Eighth = 0.125,
  Sixteenth = 0.0625,
}

export interface GeneratorConfig {
  bpm: number;
  lengthMinutes: number;
  scaleRoot: string;
  scaleType: 'minor' | 'dorian' | 'phrygian' | 'major';
  mood: 'liquid' | 'deep' | 'dark' | 'ethereal';
  complexity: number; // 0-1
  breakDensity: number; // 0-1
  atmosphere: number; // 0-1
}

export interface NeurofunkConfig {
  bpm: number;
  lengthMinutes: number;
  scaleRoot: string;
  scaleType: 'minor' | 'dorian' | 'phrygian';
  style: 'rolling' | 'techstep' | 'dark' | 'minimal';
  drumPressure: number; // 0-1
  bassMotion: number; // 0-1
  technicality: number; // 0-1
  tension: number; // 0-1
}

export interface JungleConfig {
  bpm: number;
  lengthMinutes: number;
  scaleRoot: string;
  scaleType: 'minor' | 'dorian' | 'phrygian' | 'major';
  style: 'classic' | 'ragga' | 'darkside' | 'atmospheric';
  breakEnergy: number; // 0-1
  chopComplexity: number; // 0-1
  bassWeight: number; // 0-1
  dubSpace: number; // 0-1
}

export interface MidiEvent {
  deltaTime: number;
  type: number;
  channel: number;
  param1: number;
  param2?: number;
}

export interface MidiTrack {
  name: string;
  events: MidiEvent[];
}

export interface GenerationStatus {
  isGenerating: boolean;
  progress: number; // 0-100
  message: string;
}
