import { MidiTrack } from '../types';

/**
 * A TypeScript implementation of a MIDI encoder.
 * This replaces the need for Python's MIDIFile library by generating the binary directly in the browser.
 */

function stringToBytes(str: string): number[] {
  return str.split('').map(char => char.charCodeAt(0));
}

function numberToBytes(number: number, bytes: number): number[] {
  const result: number[] = [];
  for (let i = bytes - 1; i >= 0; i--) {
    result.push((number >> (8 * i)) & 0xFF);
  }
  return result;
}

function variableLengthQuantity(number: number): number[] {
  let buffer = number & 0x7F;
  const result = [buffer];
  number = number >> 7;
  while (number > 0) {
    buffer = (number & 0x7F) | 0x80;
    result.unshift(buffer);
    number = number >> 7;
  }
  return result;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function eventPriority(type: number): number {
  if (type === 0xFF) return 0;
  if (type === 0xC0 || type === 0xB0 || type === 0xE0) return 1;
  if (type === 0x80) return 2;
  if (type === 0x90) return 3;
  return 4;
}

export class MidiFile {
  tracks: MidiTrack[] = [];
  ticksPerBeat: number;

  constructor(ticksPerBeat: number = 480) {
    this.ticksPerBeat = ticksPerBeat;
  }

  addTrack(name: string): MidiTrack {
    const track: MidiTrack = { name, events: [] };
    this.tracks.push(track);
    return track;
  }

  // Helper to add Note On and Note Off pair
  addNote(track: MidiTrack, channel: number, pitch: number, velocity: number, startTick: number, durationTicks: number) {
    const safeStartTick = clampInt(startTick, 0, Number.MAX_SAFE_INTEGER);
    const safeDurationTicks = Math.max(1, clampInt(durationTicks, 1, Number.MAX_SAFE_INTEGER));
    const safePitch = clampInt(pitch, 0, 127);
    const safeVelocity = clampInt(velocity, 1, 127);

    // We insert events raw; sorting happens at build time
    track.events.push({
      deltaTime: safeStartTick, // Temporarily store absolute tick here
      type: 0x90, // Note On
      channel,
      param1: safePitch,
      param2: safeVelocity
    });

    track.events.push({
      deltaTime: safeStartTick + safeDurationTicks, // Temporarily store absolute tick here
      type: 0x80, // Note Off
      channel,
      param1: safePitch,
      param2: 0 // Velocity 0 for note off
    });
  }

  addControlChange(track: MidiTrack, channel: number, controller: number, value: number, startTick: number = 0) {
    track.events.push({
      deltaTime: clampInt(startTick, 0, Number.MAX_SAFE_INTEGER),
      type: 0xB0,
      channel,
      param1: clampInt(controller, 0, 127),
      param2: clampInt(value, 0, 127)
    });
  }

  addProgramChange(track: MidiTrack, channel: number, program: number, startTick: number = 0) {
    track.events.push({
      deltaTime: clampInt(startTick, 0, Number.MAX_SAFE_INTEGER),
      type: 0xC0,
      channel,
      param1: clampInt(program, 0, 127)
    });
  }

  addPitchBend(track: MidiTrack, channel: number, value: number, startTick: number = 0) {
    const bend = clampInt(value + 8192, 0, 16383);
    track.events.push({
      deltaTime: clampInt(startTick, 0, Number.MAX_SAFE_INTEGER),
      type: 0xE0,
      channel,
      param1: bend & 0x7F,
      param2: (bend >> 7) & 0x7F
    });
  }

  addTempo(track: MidiTrack, bpm: number, startTick: number) {
    const microsecondsPerBeat = Math.round(60000000 / bpm);
    // Tempo is a meta event: FF 51 03 tttttt
    // We handle meta events slightly differently in binary generation, but for our struct:
    track.events.push({
      deltaTime: startTick,
      type: 0xFF, // Meta
      channel: 0x51, // Tempo subtype
      param1: microsecondsPerBeat // We'll handle the 3-byte split in generation
    });
  }

  generate(): Uint8Array {
    const headerChunk = [
      ...stringToBytes('MThd'),
      ...numberToBytes(6, 4), // Header length
      ...numberToBytes(1, 2), // Format 1 (multiple tracks)
      ...numberToBytes(this.tracks.length, 2),
      ...numberToBytes(this.ticksPerBeat, 2)
    ];

    const trackChunks: number[] = [];

    for (const track of this.tracks) {
      // 1. Sort events by absolute time
      track.events.sort((a, b) => {
        if (a.deltaTime !== b.deltaTime) return a.deltaTime - b.deltaTime;
        return eventPriority(a.type) - eventPriority(b.type);
      });

      const trackBytes: number[] = [];
      
      // Track Name Meta Event: FF 03 len text
      trackBytes.push(0, 0xFF, 0x03, track.name.length, ...stringToBytes(track.name));

      let lastTick = 0;

      for (const event of track.events) {
        const delta = event.deltaTime - lastTick;
        lastTick = event.deltaTime;

        trackBytes.push(...variableLengthQuantity(delta));

        if (event.type === 0xFF) {
            // Meta Event Handling
            if (event.channel === 0x51) {
                // Tempo
                trackBytes.push(0xFF, 0x51, 0x03, ...numberToBytes(event.param1, 3));
            }
        } else {
            // MIDI Channel Event
            // Status byte: Type (high nibble) + Channel (low nibble)
            const status = (event.type & 0xF0) | (event.channel & 0x0F);
            trackBytes.push(status);
            trackBytes.push(event.param1);
            if (event.param2 !== undefined) {
                trackBytes.push(event.param2);
            }
        }
      }

      // End of Track Meta Event: FF 2F 00
      trackBytes.push(0, 0xFF, 0x2F, 0x00);

      // Add Track Chunk Header
      trackChunks.push(...stringToBytes('MTrk'));
      trackChunks.push(...numberToBytes(trackBytes.length, 4));
      trackChunks.push(...trackBytes);
    }

    const fileBytes = [...headerChunk, ...trackChunks];
    return new Uint8Array(fileBytes);
  }
}
