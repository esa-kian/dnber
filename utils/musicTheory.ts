export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10], // Natural Minor
  dorian: [0, 2, 3, 5, 7, 9, 10], // Dorian (DnB classic)
  phrygian: [0, 1, 3, 5, 7, 8, 10], // Darker
  major: [0, 2, 4, 5, 7, 9, 11]
};

export const ROOT_NOTES: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
};

export const DRUM_MAPPING = {
  KICK: 36,
  RIMSHOT: 37,
  SNARE: 38,
  ELECTRIC_SNARE: 40,
  LOW_TOM: 45,
  MID_TOM: 47,
  HIGH_TOM: 50,
  CLOSED_HH: 42,
  PEDAL_HH: 44,
  OPEN_HH: 46,
  CRASH: 49,
  RIDE: 51,
  CHINA: 52,
  SHAKER: 70 // Arbitrary percussion
};

export function getScaleNotes(root: string, scaleType: keyof typeof SCALES, octave: number): number[] {
  const rootVal = ROOT_NOTES[root];
  const intervals = SCALES[scaleType];
  return intervals.map(interval => rootVal + interval + (octave * 12));
}

// Get a random note from the scale
export function getRandomNote(scaleNotes: number[]): number {
  return scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
}

// Get a chord (triad or 7th) from the scale degree
export function getChord(degree: number, scaleNotes: number[], type: 'triad' | '7th' = '7th'): number[] {
    const chord: number[] = [];
    // Simple stacking of thirds relative to the scale array
    // We need to extend the scale array to wrap around for higher degrees
    const extendedScale = [...scaleNotes, ...scaleNotes.map(n => n + 12), ...scaleNotes.map(n => n + 24)];
    
    // Valid degree index
    const rootIndex = degree % scaleNotes.length;
    
    chord.push(extendedScale[rootIndex]); // Root
    chord.push(extendedScale[rootIndex + 2]); // 3rd
    chord.push(extendedScale[rootIndex + 4]); // 5th
    if (type === '7th') {
        chord.push(extendedScale[rootIndex + 6]); // 7th
    }
    
    return chord;
}
