import { describe, expect, it } from 'vitest';
import { estimateWavBytes, pcmFromBuffer, wavFromParts, wavHeader } from '../utils/wav';

/** Minimal stand-in for the rendered buffers the engine hands back. */
function fakeBuffer(frames: number, fill: (channel: number, index: number) => number): AudioBuffer {
  const channels = [0, 1].map(channel => Float32Array.from({ length: frames }, (_, i) => fill(channel, i)));
  return {
    numberOfChannels: 2,
    length: frames,
    sampleRate: 44100,
    getChannelData: (channel: number) => channels[channel]
  } as unknown as AudioBuffer;
}

describe('wav header', () => {
  it('describes a 16-bit stereo file', () => {
    const view = new DataView(wavHeader(1000, 2, 44100));
    const text = (offset: number) =>
      String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));

    expect(text(0)).toBe('RIFF');
    expect(text(8)).toBe('WAVE');
    expect(text(12)).toBe('fmt ');
    expect(text(36)).toBe('data');
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(2); // channels
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint16(34, true)).toBe(16); // bit depth
    expect(view.getUint32(28, true)).toBe(44100 * 4); // byte rate
    expect(view.getUint32(40, true)).toBe(1000 * 4); // data size
    expect(view.getUint32(4, true)).toBe(36 + 1000 * 4); // riff size
  });
});

describe('pcm conversion', () => {
  it('interleaves channels and scales to 16-bit', () => {
    const pcm = pcmFromBuffer(fakeBuffer(3, channel => (channel === 0 ? 1 : -1)));
    expect(pcm).toHaveLength(6);
    expect(pcm[0]).toBe(32767); // left, full scale
    expect(pcm[1]).toBe(-32768); // right, full scale
  });

  it('clamps anything past full scale instead of wrapping', () => {
    const pcm = pcmFromBuffer(fakeBuffer(2, (_, i) => (i === 0 ? 4 : -4)));
    for (const sample of pcm) {
      expect(sample).toBeGreaterThanOrEqual(-32768);
      expect(sample).toBeLessThanOrEqual(32767);
    }
  });
});

describe('assembling a file from render windows', () => {
  it('reports the total frame count across every part', async () => {
    const parts = [pcmFromBuffer(fakeBuffer(100, () => 0.5)), pcmFromBuffer(fakeBuffer(50, () => -0.5))];
    const blob = wavFromParts(parts, 2, 44100);
    const view = new DataView(await blob.arrayBuffer());

    expect(blob.type).toBe('audio/wav');
    expect(view.getUint32(40, true)).toBe(150 * 4);
    expect(blob.size).toBe(44 + 150 * 4);
  });
});

describe('size estimate', () => {
  it('matches what actually gets written', async () => {
    const seconds = 2;
    const blob = wavFromParts([pcmFromBuffer(fakeBuffer(44100 * seconds, () => 0))], 2, 44100);
    expect(estimateWavBytes(seconds)).toBe(blob.size);
  });
});
