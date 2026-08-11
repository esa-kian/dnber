import { describe, expect, it } from 'vitest';
import { GENRE_NAMES, buildParsed } from './helpers';
import { INSTRUMENTS, suggestInstrument } from '../services/audioEngine';
import { swingTick } from '../utils/groove';
import { setSwing } from '../utils/groove';

/** The channel layout the UI documents and DAW users rely on. */
const EXPECTED_TRACKS: Record<string, { drums: string[]; melodic: string[] }> = {
  ambient: { drums: ['Breaks and Percussion'], melodic: ['Sub Bass', 'Reese Bass', 'Evolving Pads', 'Atmosphere and Echoes'] },
  jungle: { drums: ['Chopped Breaks'], melodic: ['Dub Sub Bass', 'Pads'] },
  liquid: { drums: ['Clean Rolling Drums'], melodic: ['Liquid Sub Bass', 'Keys and Chords', 'Warm Pads'] },
  dancefloor: { drums: ['Polished Dancefloor Drums'], melodic: ['Clean Sub Bass', 'Anthem Chords'] },
  jumpup: { drums: ['Snappy Jump Up Drums'], melodic: ['Sub Punch', 'Wobble Bass Main'] },
  neurofunk: { drums: ['Neuro Drums'], melodic: ['Clean Sub', 'Neuro Bass Main'] },
  hypnotic: { drums: ['909 Kick and Hats'], melodic: ['Rumble Sub', 'Low Pulse'] }
};

describe('track and channel layout', () => {
  it.each(GENRE_NAMES)('%s writes its expected tracks', async genre => {
    const song = await buildParsed(genre, 2);
    const names = song.tracks.map(t => t.name);
    const expected = EXPECTED_TRACKS[genre];

    for (const name of [...expected.drums, ...expected.melodic]) {
      expect(names).toContain(name);
    }
  });

  it.each(GENRE_NAMES)('%s keeps drums on channel 10 and melody off it', async genre => {
    const song = await buildParsed(genre, 2);
    const expected = EXPECTED_TRACKS[genre];

    for (const track of song.tracks) {
      if (expected.drums.includes(track.name)) {
        expect(track.isDrum).toBe(true);
        expect(track.channel).toBe(9); // channel 10, counting from one
      } else if (expected.melodic.includes(track.name)) {
        expect(track.isDrum).toBe(false);
        expect(track.channel).not.toBe(9);
      }
    }
  });

  it.each(GENRE_NAMES)('%s suggests a real instrument for every track', async genre => {
    const song = await buildParsed(genre, 2);
    const ids = new Set(INSTRUMENTS.map(i => i.id));

    for (const track of song.tracks) {
      const suggestion = suggestInstrument(track.name, track.isDrum);
      expect(ids).toContain(suggestion);
      if (track.isDrum) expect(suggestion.startsWith('drum')).toBe(true);
    }
  });

  it.each(GENRE_NAMES)('%s produces a sensible length', async genre => {
    const song = await buildParsed(genre, 1);
    expect(song.duration).toBeGreaterThan(45);
    expect(song.duration).toBeLessThan(75);
  });
});

describe('swing', () => {
  it('delays off-beat sixteenths and leaves downbeats alone', () => {
    setSwing(0.6, 480);
    expect(swingTick(0)).toBe(0); // downbeat
    expect(swingTick(240)).toBe(240); // eighth
    expect(swingTick(120)).toBeCloseTo(120 + (0.6 * 120) / 3, 5); // off-beat sixteenth
    expect(swingTick(360)).toBeCloseTo(360 + (0.6 * 120) / 3, 5);
    setSwing(0, 480);
  });

  it('is a no-op when straight', () => {
    setSwing(0, 480);
    for (const tick of [0, 60, 120, 180, 240, 470, 961]) {
      expect(swingTick(tick)).toBe(tick);
    }
  });

  it('never moves a note backwards', () => {
    setSwing(1, 480);
    for (let tick = 0; tick < 2000; tick += 7) {
      expect(swingTick(tick)).toBeGreaterThanOrEqual(tick);
    }
    setSwing(0, 480);
  });
});
