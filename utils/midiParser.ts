/**
 * A minimal Standard MIDI File reader.
 * The generators hand back raw bytes, so we parse them back into note events
 * that the in-browser audio engine can schedule.
 */

export interface ParsedNote {
  tick: number;
  durationTicks: number; // exact written length; `duration` is clamped for playback
  time: number; // seconds
  duration: number; // seconds
  pitch: number;
  velocity: number; // 1-127
  channel: number;
}

export interface ParsedTrack {
  name: string;
  channel: number;
  isDrum: boolean;
  program: number | null;
  notes: ParsedNote[];
}

export interface ParsedMidi {
  ticksPerBeat: number;
  bpm: number;
  duration: number; // seconds
  tracks: ParsedTrack[];
}

type TempoPoint = { tick: number; microsecondsPerBeat: number };

class ByteReader {
  private view: DataView;
  pos = 0;

  constructor(private data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  get remaining(): number {
    return this.data.length - this.pos;
  }

  u8(): number {
    return this.data[this.pos++];
  }

  u16(): number {
    const value = this.view.getUint16(this.pos);
    this.pos += 2;
    return value;
  }

  u32(): number {
    const value = this.view.getUint32(this.pos);
    this.pos += 4;
    return value;
  }

  string(length: number): string {
    let out = '';
    for (let i = 0; i < length; i++) out += String.fromCharCode(this.data[this.pos + i]);
    this.pos += length;
    return out;
  }

  skip(length: number) {
    this.pos += length;
  }

  // Variable length quantity, as used for delta times and meta lengths
  vlq(): number {
    let value = 0;
    for (let i = 0; i < 4; i++) {
      const byte = this.u8();
      value = (value << 7) | (byte & 0x7f);
      if ((byte & 0x80) === 0) break;
    }
    return value;
  }
}

type RawEvent =
  | { kind: 'note'; tick: number; channel: number; pitch: number; velocity: number; on: boolean }
  | { kind: 'program'; tick: number; channel: number; program: number }
  | { kind: 'tempo'; tick: number; microsecondsPerBeat: number }
  | { kind: 'name'; tick: number; text: string };

function parseTrackChunk(reader: ByteReader, length: number): RawEvent[] {
  const end = reader.pos + length;
  const events: RawEvent[] = [];
  let tick = 0;
  let runningStatus = 0;

  while (reader.pos < end) {
    tick += reader.vlq();
    let status = reader.u8();

    if (status < 0x80) {
      // Running status: reuse the previous status byte and step back one byte
      reader.pos--;
      status = runningStatus;
    } else if (status < 0xf0) {
      runningStatus = status;
    }

    if (status === 0xff) {
      const type = reader.u8();
      const metaLength = reader.vlq();
      if (type === 0x03 || type === 0x01) {
        events.push({ kind: 'name', tick, text: reader.string(metaLength) });
      } else if (type === 0x51 && metaLength === 3) {
        const microsecondsPerBeat = (reader.u8() << 16) | (reader.u8() << 8) | reader.u8();
        events.push({ kind: 'tempo', tick, microsecondsPerBeat });
      } else {
        reader.skip(metaLength);
      }
      continue;
    }

    if (status === 0xf0 || status === 0xf7) {
      reader.skip(reader.vlq());
      continue;
    }

    const type = status & 0xf0;
    const channel = status & 0x0f;

    switch (type) {
      case 0x80: {
        const pitch = reader.u8();
        reader.u8();
        events.push({ kind: 'note', tick, channel, pitch, velocity: 0, on: false });
        break;
      }
      case 0x90: {
        const pitch = reader.u8();
        const velocity = reader.u8();
        events.push({ kind: 'note', tick, channel, pitch, velocity, on: velocity > 0 });
        break;
      }
      case 0xc0: {
        events.push({ kind: 'program', tick, channel, program: reader.u8() });
        break;
      }
      case 0xd0: {
        reader.u8();
        break;
      }
      default: {
        // Note aftertouch, control change, pitch bend: two data bytes we don't render
        reader.u8();
        reader.u8();
        break;
      }
    }
  }

  reader.pos = end;
  return events;
}

function buildTempoMap(points: TempoPoint[], ticksPerBeat: number) {
  const sorted = [...points].sort((a, b) => a.tick - b.tick);
  if (sorted.length === 0 || sorted[0].tick > 0) {
    sorted.unshift({ tick: 0, microsecondsPerBeat: 500000 });
  }

  // Precompute the elapsed seconds at each tempo change
  const seconds: number[] = [0];
  for (let i = 1; i < sorted.length; i++) {
    const span = sorted[i].tick - sorted[i - 1].tick;
    seconds.push(seconds[i - 1] + (span / ticksPerBeat) * (sorted[i - 1].microsecondsPerBeat / 1e6));
  }

  return (tick: number): number => {
    let index = 0;
    while (index + 1 < sorted.length && sorted[index + 1].tick <= tick) index++;
    const span = tick - sorted[index].tick;
    return seconds[index] + (span / ticksPerBeat) * (sorted[index].microsecondsPerBeat / 1e6);
  };
}

export function parseMidi(bytes: Uint8Array): ParsedMidi {
  const reader = new ByteReader(bytes);

  if (reader.string(4) !== 'MThd') {
    throw new Error('Not a MIDI file');
  }

  const headerLength = reader.u32();
  reader.u16(); // format
  const trackCount = reader.u16();
  const division = reader.u16();
  reader.skip(headerLength - 6);

  // SMPTE time division is never produced by our encoder; fall back to a sane default
  const ticksPerBeat = division & 0x8000 ? 480 : division;

  const rawTracks: RawEvent[][] = [];
  for (let i = 0; i < trackCount && reader.remaining > 8; i++) {
    const id = reader.string(4);
    const length = reader.u32();
    if (id !== 'MTrk') {
      reader.skip(length);
      continue;
    }
    rawTracks.push(parseTrackChunk(reader, length));
  }

  const tempoPoints: TempoPoint[] = [];
  for (const events of rawTracks) {
    for (const event of events) {
      if (event.kind === 'tempo') tempoPoints.push({ tick: event.tick, microsecondsPerBeat: event.microsecondsPerBeat });
    }
  }
  const tickToSeconds = buildTempoMap(tempoPoints, ticksPerBeat);

  const tracks: ParsedTrack[] = [];
  let maxTick = 0;

  rawTracks.forEach((events, index) => {
    const notes: ParsedNote[] = [];
    const open = new Map<number, { tick: number; velocity: number; channel: number }[]>();
    let name = '';
    let program: number | null = null;
    let channel = -1;

    for (const event of events) {
      if (event.kind === 'name' && !name) {
        name = event.text.trim();
      } else if (event.kind === 'program') {
        if (program === null) program = event.program;
        if (channel < 0) channel = event.channel;
      } else if (event.kind === 'note') {
        const key = (event.channel << 8) | event.pitch;
        if (event.on) {
          if (channel < 0 || event.channel === 9) channel = event.channel;
          const stack = open.get(key) ?? [];
          stack.push({ tick: event.tick, velocity: event.velocity, channel: event.channel });
          open.set(key, stack);
        } else {
          const stack = open.get(key);
          const started = stack?.shift();
          if (!started) continue;
          const startTime = tickToSeconds(started.tick);
          notes.push({
            tick: started.tick,
            durationTicks: event.tick - started.tick,
            time: startTime,
            duration: Math.max(0.02, tickToSeconds(event.tick) - startTime),
            pitch: event.pitch,
            velocity: started.velocity,
            channel: started.channel
          });
          if (event.tick > maxTick) maxTick = event.tick;
        }
      }
    }

    if (notes.length === 0) return; // conductor / empty tracks are not playable

    notes.sort((a, b) => a.time - b.time);
    tracks.push({
      name: name || `Track ${index + 1}`,
      channel: channel < 0 ? 0 : channel,
      isDrum: notes.some(note => note.channel === 9),
      program,
      notes
    });
  });

  const firstTempo = tempoPoints.find(point => point.tick === 0) ?? tempoPoints[0];

  return {
    ticksPerBeat,
    bpm: firstTempo ? Math.round(60000000 / firstTempo.microsecondsPerBeat) : 120,
    duration: tickToSeconds(maxTick),
    tracks
  };
}
