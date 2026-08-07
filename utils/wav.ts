/** 16-bit PCM WAV writing, built up in pieces so long renders stay streamable. */

const BYTES_PER_SAMPLE = 2;

export function wavHeader(totalFrames: number, channels: number, sampleRate: number): ArrayBuffer {
  const blockAlign = channels * BYTES_PER_SAMPLE;
  const dataBytes = totalFrames * blockAlign;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format: PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * BYTES_PER_SAMPLE, true);
  ascii(36, 'data');
  view.setUint32(40, dataBytes, true);
  return header;
}

/** Interleaves one rendered window into 16-bit samples. */
export function pcmFromBuffer(buffer: AudioBuffer): Int16Array {
  const channels = Math.min(2, buffer.numberOfChannels);
  const frames = buffer.length;
  const samples = new Int16Array(frames * channels);
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < frames; i++) {
      const clamped = Math.max(-1, Math.min(1, data[i]));
      samples[i * channels + channel] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }
  }
  return samples;
}

export function wavFromParts(parts: Int16Array[], channels: number, sampleRate: number): Blob {
  const totalFrames = parts.reduce((sum, part) => sum + part.length / channels, 0);
  return new Blob([wavHeader(totalFrames, channels, sampleRate), ...parts], { type: 'audio/wav' });
}

/** Rough size of the resulting file, for warning before a long render. */
export function estimateWavBytes(seconds: number, sampleRate = 44100): number {
  return Math.ceil(seconds * sampleRate * 2 * BYTES_PER_SAMPLE) + 44;
}
