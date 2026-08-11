import { describe, expect, it } from 'vitest';
import { GENRE_NAMES, build, buildParsed, bytesEqual } from './helpers';

describe('reproducibility', () => {
  it.each(GENRE_NAMES)('%s gives identical bytes for the same seed', async genre => {
    const first = await build(genre, 1, { seed: 4242 });
    const second = await build(genre, 1, { seed: 4242 });
    expect(bytesEqual(first, second)).toBe(true);
  });

  it.each(GENRE_NAMES)('%s gives different music for a different seed', async genre => {
    const first = await build(genre, 1, { seed: 1 });
    const second = await build(genre, 1, { seed: 2 });
    expect(bytesEqual(first, second)).toBe(false);
  });

  it('swing and feel settings are part of the reproducible state', async () => {
    const a = await build('hypnotic', 1, { seed: 7, swing: 0.4, humanize: 0.6 });
    const b = await build('hypnotic', 1, { seed: 7, swing: 0.4, humanize: 0.6 });
    expect(bytesEqual(a, b)).toBe(true);
  });
});

describe('feel is a performance, not a re-roll', () => {
  it.each(GENRE_NAMES)('%s keeps the same notes at any human feel', async genre => {
    const straight = await buildParsed(genre, 1, { seed: 99, humanize: 0 });
    const loose = await buildParsed(genre, 1, { seed: 99, humanize: 0.9 });

    expect(loose.tracks.length).toBe(straight.tracks.length);
    straight.tracks.forEach((track, index) => {
      const other = loose.tracks[index];
      expect(other.name).toBe(track.name);

      // Same material, played differently: identical pitch content, and counts
      // that only move where a generator wrote the same pitch twice on one tick.
      // Those collapse into one note when the timing is exact and survive as two
      // once feel separates them.
      const pitchSet = (notes: { pitch: number }[]) => [...new Set(notes.map(n => n.pitch))].sort((a, b) => a - b);
      expect(pitchSet(other.notes)).toEqual(pitchSet(track.notes));

      const drift = Math.abs(other.notes.length - track.notes.length);
      expect(drift).toBeLessThanOrEqual(Math.max(4, Math.round(track.notes.length * 0.05)));
    });
  });

  it('that invariant is not vacuous: a different seed does change the notes', async () => {
    const first = await buildParsed('dancefloor', 1, { seed: 99, humanize: 0 });
    const second = await buildParsed('dancefloor', 1, { seed: 100, humanize: 0 });

    const pitchList = (song: typeof first) =>
      song.tracks.map(t => t.notes.map(n => n.pitch).sort((a, b) => a - b).join(','));
    expect(pitchList(second)).not.toEqual(pitchList(first));
  });

  it('human feel actually moves notes off the grid', async () => {
    const straight = await buildParsed('hypnotic', 1, { seed: 5, humanize: 0 });
    const loose = await buildParsed('hypnotic', 1, { seed: 5, humanize: 1 });

    const onGrid = (song: typeof straight) => {
      const notes = song.tracks.flatMap(t => t.notes);
      return notes.filter(n => n.tick % (song.ticksPerBeat / 4) === 0).length / notes.length;
    };

    expect(onGrid(straight)).toBeGreaterThan(0.4);
    expect(onGrid(loose)).toBeLessThan(onGrid(straight) / 2);
  });

  it('human feel widens the velocity range', async () => {
    const straight = await buildParsed('hypnotic', 1, { seed: 5, humanize: 0 });
    const loose = await buildParsed('hypnotic', 1, { seed: 5, humanize: 1 });

    const spread = (song: typeof straight) =>
      new Set(song.tracks.flatMap(t => t.notes).map(n => n.velocity)).size;

    expect(spread(loose)).toBeGreaterThan(spread(straight) * 1.5);
  });
});
