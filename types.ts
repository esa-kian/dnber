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
  complexity: number; // 0-1
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
