import { MidiFile } from '../utils/midiEncoder';
import { GeneratorConfig, GenerationStatus } from '../types';
import { DRUM_MAPPING, getScaleNotes, getChord, getRandomNote } from '../utils/musicTheory';

const TICKS_PER_BEAT = 480;

export async function generateAmbientDnB(
  config: GeneratorConfig,
  onProgress: (status: GenerationStatus) => void
): Promise<Uint8Array> {
  const midi = new MidiFile(TICKS_PER_BEAT);
  
  // -- Setup Tracks --
  const trackTempo = midi.addTrack('Conductor');
  const trackDrums = midi.addTrack('Drums');
  const trackBass = midi.addTrack('Bass');
  const trackPads = midi.addTrack('Pads');
  const trackArp = midi.addTrack('Atmosphere');

  // -- Initial Config --
  midi.addTempo(trackTempo, config.bpm, 0);

  const totalBeats = config.lengthMinutes * config.bpm;
  const bars = Math.ceil(totalBeats / 4);
  const totalTicks = totalBeats * TICKS_PER_BEAT;

  // Scale setup
  const scaleBass = getScaleNotes(config.scaleRoot, config.scaleType, 1); // C1 - B1 range
  const scalePads = getScaleNotes(config.scaleRoot, config.scaleType, 3); // C3 - B3 range
  const scaleArp = getScaleNotes(config.scaleRoot, config.scaleType, 4); // C4 - B4 range

  // -- Generators --

  // 1. DRUMS (The Amen-ish Break)
  // Standard 2-bar loop pattern for DnB
  // 16th notes per bar = 16.
  // Kick: 0, 10 (approx)
  // Snare: 4, 12
  const generateDrumLoop = (startBar: number, intensity: number) => {
    const barTicks = 4 * TICKS_PER_BEAT;
    const startTick = startBar * barTicks;
    
    // Basic DnB Step Sequencer (16 steps per bar)
    // 1 step = TICKS_PER_BEAT / 4
    const stepTicks = TICKS_PER_BEAT / 4;

    for (let i = 0; i < 32; i++) { // 2 bars
      const currentTick = startTick + (i * stepTicks);
      const pos = i % 16; // Position in bar (0-15)

      // Kick
      if (pos === 0 || (pos === 10 && Math.random() > 0.2)) {
        midi.addNote(trackDrums, 9, DRUM_MAPPING.KICK, 100 + Math.random() * 20, currentTick, stepTicks);
      }
      
      // Snare
      if (pos === 4 || pos === 12) {
         midi.addNote(trackDrums, 9, DRUM_MAPPING.SNARE, 110, currentTick, stepTicks);
      } else if ((pos === 15 || pos === 9) && Math.random() > 0.7) {
         // Ghost notes
         midi.addNote(trackDrums, 9, DRUM_MAPPING.SNARE, 40 + Math.random() * 20, currentTick, stepTicks);
      }

      // Hats / Shakers (Fast, driving)
      if (intensity > 0.3) {
          if (i % 2 === 0 || (Math.random() > 0.5 && intensity > 0.6)) {
             midi.addNote(trackDrums, 9, DRUM_MAPPING.CLOSED_HH, 70 + (i % 4 === 0 ? 20 : 0), currentTick, stepTicks);
          }
      }
    }
  };


  // 2. PADS (Ambient Swells)
  // Changes chord every 4 or 8 bars
  const generatePadSection = (startBar: number, numBars: number, intensity: number) => {
    const barTicks = 4 * TICKS_PER_BEAT;
    let currentBar = startBar;
    
    while (currentBar < startBar + numBars) {
        const chordDurationBars = Math.random() > 0.5 ? 4 : 8;
        const durationTicks = chordDurationBars * barTicks;
        
        // Pick a chord degree
        const degree = Math.floor(Math.random() * 7);
        const chord = getChord(degree, scalePads, '7th');

        // Add chord notes
        chord.forEach(note => {
            // Slight strum/humanize
            const offset = Math.random() * 20;
            midi.addNote(trackPads, 0, note, 50 + Math.random() * 20, (currentBar * barTicks) + offset, durationTicks - offset);
        });

        // Add Bass Root
        const bassNote = scaleBass[degree % 7];
        if (bassNote) {
             midi.addNote(trackBass, 1, bassNote, 90, currentBar * barTicks, durationTicks);
        }

        currentBar += chordDurationBars;
    }
  };

  // 3. ARP/TEXTURES (Random ambient sprinkles)
  const generateTexture = (startBar: number, numBars: number) => {
      const barTicks = 4 * TICKS_PER_BEAT;
      const startTick = startBar * barTicks;
      const endTick = (startBar + numBars) * barTicks;

      // 10% chance per 8th note to play a delay pluck
      for (let t = startTick; t < endTick; t += TICKS_PER_BEAT / 2) {
          if (Math.random() > 0.85) {
              const note = getRandomNote(scaleArp);
              // Echo effect by adding multiple notes with decaying velocity
              midi.addNote(trackArp, 2, note, 70, t, TICKS_PER_BEAT);
              midi.addNote(trackArp, 2, note, 50, t + (TICKS_PER_BEAT * 0.75), TICKS_PER_BEAT); // Delay 3/4
          }
      }
  };

  // -- Arrangement (The "20 Minute" Logic) --
  // We break the track into "Sections" to avoid monotony.
  // Intro -> Build -> Drop (Liquid) -> Breakdown -> Drop 2 -> Outro
  // To reach 20 mins, we cycle this or extend sections significantly.

  const SECTION_LENGTH_BARS = 64; // Approx 1.5 mins at 170bpm
  const totalSections = Math.ceil(bars / SECTION_LENGTH_BARS);

  for (let s = 0; s < totalSections; s++) {
      // Update Progress
      const percent = Math.round((s / totalSections) * 100);
      onProgress({ isGenerating: true, progress: percent, message: `Composing section ${s + 1}/${totalSections}` });
      
      // Allow UI to breathe
      await new Promise(resolve => setTimeout(resolve, 10));

      const sectionStartBar = s * SECTION_LENGTH_BARS;
      
      // Determine Intensity based on "Flow"
      // Simple sine wave intensity or random phases
      // Let's do a repeating structure: Intro (Low) -> Build (Med) -> Main (High) -> Main (High) -> Break (Low)
      const phase = s % 5; 
      let intensity = 0; // 0 to 1
      let hasDrums = false;
      let hasBass = false;

      switch(phase) {
          case 0: // Chill / Intro
            intensity = 0.2;
            hasDrums = false;
            hasBass = true;
            break;
          case 1: // Build
            intensity = 0.5;
            hasDrums = true; // Light drums
            hasBass = true;
            break;
          case 2: // Full
          case 3: // Full Cont.
            intensity = 0.9;
            hasDrums = true;
            hasBass = true;
            break;
          case 4: // Breakdown
            intensity = 0.3;
            hasDrums = false;
            hasBass = false; // Just pads
            break;
      }

      // Generate Section Content
      generatePadSection(sectionStartBar, SECTION_LENGTH_BARS, intensity);
      
      if (hasBass) {
          // Bass is handled inside Pad generator for root cohesion, 
          // but we could add extra reese modulation here if we were doing audio.
          // For MIDI, sustain bass is fine.
      }

      if (hasDrums) {
          // Generate drums in 2-bar chunks for variation
          for (let b = 0; b < SECTION_LENGTH_BARS; b += 2) {
             generateDrumLoop(sectionStartBar + b, intensity);
          }
      } else if (phase === 1) {
           // Light perc only during build
           // TODO: Add shakers
      }

      generateTexture(sectionStartBar, SECTION_LENGTH_BARS);
  }

  onProgress({ isGenerating: false, progress: 100, message: 'Finalizing Binary...' });
  return midi.generate();
}
