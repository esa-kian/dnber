import { describe, expect, it } from 'vitest';
import { GENRE_NAMES, build, buildParsed } from './helpers';
import { parseMidi } from '../utils/midiParser';
import { MidiFile } from '../utils/midiEncoder';
import { setSwing } from '../utils/groove';
import { setHumanize } from '../utils/humanize';

const FEELS = [
  { label: 'straight', feel: { swing: 0, humanize: 0 } },
  { label: 'default feel', feel: { swing: 0, humanize: 0.45 } },
  { label: 'extreme swing and feel', feel: { swing: 1, humanize: 1 } }
];

describe('the written file is valid MIDI', () => {
  it.each(GENRE_NAMES)('%s starts with a well formed header', async genre => {
    const bytes = await build(genre);
    const text = String.fromCharCode(...bytes.slice(0, 4));
    expect(text).toBe('MThd');

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(4)).toBe(6); // header length
    expect(view.getUint16(8)).toBe(1); // format 1
    expect(view.getUint16(10)).toBeGreaterThan(0); // track count
    expect(view.getUint16(12)).toBe(480); // ticks per beat
  });

  it.each(GENRE_NAMES)('%s parses back to playable notes', async genre => {
    const song = await buildParsed(genre);
    expect(song.tracks.length).toBeGreaterThan(0);
    expect(song.duration).toBeGreaterThan(0);
    expect(song.bpm).toBeGreaterThan(20);

    for (const track of song.tracks) {
      expect(track.notes.length).toBeGreaterThan(0);
      for (const note of track.notes) {
        expect(note.pitch).toBeGreaterThanOrEqual(0);
        expect(note.pitch).toBeLessThanOrEqual(127);
        expect(note.velocity).toBeGreaterThanOrEqual(1);
        expect(note.velocity).toBeLessThanOrEqual(127);
        expect(note.channel).toBeGreaterThanOrEqual(0);
        expect(note.channel).toBeLessThanOrEqual(15);
        expect(note.time).toBeGreaterThanOrEqual(0);
        expect(note.duration).toBeGreaterThan(0);
      }
    }
  });

  it('every track chunk declares its true length', async () => {
    const bytes = await build('neurofunk');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const trackCount = view.getUint16(10);

    let offset = 14;
    for (let i = 0; i < trackCount; i++) {
      expect(String.fromCharCode(...bytes.slice(offset, offset + 4))).toBe('MTrk');
      const length = view.getUint32(offset + 4);
      const end = offset + 8 + length;
      expect(end).toBeLessThanOrEqual(bytes.length);
      // the chunk must finish on an end-of-track meta event
      expect([...bytes.slice(end - 3, end)]).toEqual([0xff, 0x2f, 0x00]);
      offset = end;
    }
    expect(offset).toBe(bytes.length);
  });
});

describe('note handover', () => {
  // Swing and humanisation move notes independently, which used to let a long
  // note outlive the next strike of the same key
  for (const { label, feel } of FEELS) {
    it.each(GENRE_NAMES)(`%s never stacks a pitch on itself (${label})`, async genre => {
      const song = await buildParsed(genre, 2, feel);

      for (const track of song.tracks) {
        const open = new Map<number, number>();
        for (const note of [...track.notes].sort((a, b) => a.tick - b.tick)) {
          const key = (note.channel << 8) | note.pitch;
          const previousEnd = open.get(key);
          if (previousEnd !== undefined) {
            expect(note.tick).toBeGreaterThanOrEqual(previousEnd);
          }
          open.set(key, note.tick + note.durationTicks);
        }
      }
    });
  }

  it('a note that would outlive its successor is shortened, not dropped', () => {
    // Generation state is module level, so pin it before writing notes by hand
    setSwing(0, 480);
    setHumanize(0, 1, 120);

    // Two overlapping notes of the same pitch, written by hand
    const bytes = (() => {
      const midi = new MidiFile(480);
      const track = midi.addTrack('Test');
      midi.addTempo(track, 120, 0);
      midi.addNote(track, 0, 60, 100, 0, 2000); // very long
      midi.addNote(track, 0, 60, 100, 480, 240); // retriggers well before it ends
      return midi.generate();
    })();

    const song = parseMidi(bytes);
    const notes = song.tracks[0].notes.sort((a, b) => a.tick - b.tick);
    expect(notes).toHaveLength(2);
    expect(notes[0].tick).toBe(0);
    expect(notes[1].tick).toBe(480);

    expect(notes[0].tick + notes[0].durationTicks).toBeLessThanOrEqual(notes[1].tick);
    expect(notes[0].durationTicks).toBeGreaterThan(0);
  });
});
