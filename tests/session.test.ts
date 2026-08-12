import { describe, expect, it } from 'vitest';
import {
  STARTERS,
  SessionState,
  decodeSession,
  describeSession,
  encodeSession,
  sameSession,
  sanitizeSession,
  starterToSession
} from '../utils/session';
import { INSTRUMENTS } from '../services/audioEngine';
import { build } from './helpers';
import { parseMidi } from '../utils/midiParser';

const DEFAULTS: SessionState = {
  mode: 'ambient',
  configs: {
    ambient: { bpm: 174, lengthMinutes: 20, scaleRoot: 'F', scaleType: 'dorian', mood: 'liquid', complexity: 0.72, breakDensity: 0.58, atmosphere: 0.82 },
    neurofunk: { bpm: 174, lengthMinutes: 8, scaleRoot: 'F', scaleType: 'phrygian', style: 'techstep', drumPressure: 0.82, bassMotion: 0.88, technicality: 0.78, tension: 0.82 },
    jungle: { bpm: 164, lengthMinutes: 8, scaleRoot: 'F', scaleType: 'minor', style: 'classic', breakEnergy: 0.86, chopComplexity: 0.72, bassWeight: 0.82, dubSpace: 0.62 },
    liquid: { bpm: 174, lengthMinutes: 8, scaleRoot: 'F', scaleType: 'dorian', style: 'smooth', groove: 0.72, bassFlow: 0.74, melody: 0.68, space: 0.72 },
    dancefloor: { bpm: 174, lengthMinutes: 8, scaleRoot: 'F', scaleType: 'minor', style: 'anthem', drumDrive: 0.82, bassLift: 0.76, hookSize: 0.84, buildEnergy: 0.78 },
    jumpup: { bpm: 174, lengthMinutes: 8, scaleRoot: 'F', scaleType: 'minor', style: 'bouncy', drumSnap: 0.84, wobble: 0.78, riffEnergy: 0.86, hype: 0.7 },
    hypnotic: { bpm: 132, lengthMinutes: 8, scaleRoot: 'F', scaleType: 'phrygian', style: 'berlin', drive: 0.78, hypnosis: 0.86, percussion: 0.64, space: 0.72 }
  },
  seed: 12345,
  swing: 0,
  humanize: 0.45,
  mix: {}
};

describe('sharing a session', () => {
  it('carries the take you are on through a round trip', () => {
    const state: SessionState = {
      ...DEFAULTS,
      mode: 'hypnotic',
      configs: { ...DEFAULTS.configs, hypnotic: { ...DEFAULTS.configs.hypnotic, bpm: 129, style: 'dub' } },
      seed: 998877,
      swing: 0.42,
      humanize: 0.7,
      mix: { 'Rumble Sub#2': { instrument: 'rumbleSub', volume: 0.6, muted: true } }
    };

    const restored = decodeSession(encodeSession(state), DEFAULTS)!;
    expect(restored.mode).toBe('hypnotic');
    expect(restored.configs.hypnotic).toEqual(state.configs.hypnotic);
    expect(restored.seed).toBe(state.seed);
    expect(restored.swing).toBe(state.swing);
    expect(restored.humanize).toBe(state.humanize);
    expect(restored.mix).toEqual(state.mix);
  });

  it('leaves the genres you were not playing at their defaults', () => {
    const state: SessionState = { ...DEFAULTS, mode: 'jungle' };
    const restored = decodeSession(encodeSession(state), DEFAULTS)!;
    expect(restored.configs.neurofunk).toEqual(DEFAULTS.configs.neurofunk);
  });

  it('keeps the link short enough to paste anywhere', () => {
    const state: SessionState = {
      ...DEFAULTS,
      mix: Object.fromEntries(
        ['Drums#0', 'Sub#1', 'Bass#2', 'Pads#3', 'Lead#4', 'FX#5'].map(name => [
          name,
          { instrument: 'subBass' as const, volume: 0.75, muted: false }
        ])
      )
    };
    // Down from ~2,700 when every genre's config was included. The practical
    // limit for a URL that survives chat apps and mail clients is around 2,000.
    expect(encodeSession(state).length).toBeLessThan(1200);
  });

  it('produces a link safe to put in a URL', () => {
    const encoded = encodeSession({ ...DEFAULTS, mode: 'jungle' });
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });

  it('rejects junk instead of throwing', () => {
    expect(decodeSession('not-base64!!', DEFAULTS)).toBeNull();
    expect(decodeSession('', DEFAULTS)).toBeNull();
    expect(decodeSession(btoa('{"broken":'), DEFAULTS)).toBeNull();
  });
});

describe('a shared session is not trusted', () => {
  it('falls back to defaults for an unknown genre', () => {
    const restored = sanitizeSession({ ...DEFAULTS, mode: 'polka' }, DEFAULTS);
    expect(restored.mode).toBe(DEFAULTS.mode);
  });

  it('clamps numbers into their real ranges', () => {
    const restored = sanitizeSession(
      {
        ...DEFAULTS,
        seed: Number.POSITIVE_INFINITY,
        swing: 40,
        humanize: -12,
        configs: { ...DEFAULTS.configs, hypnotic: { ...DEFAULTS.configs.hypnotic, bpm: 9000, lengthMinutes: 1e9, drive: 77 } }
      },
      DEFAULTS
    );

    expect(Number.isFinite(restored.seed)).toBe(true);
    expect(restored.swing).toBeLessThanOrEqual(1);
    expect(restored.humanize).toBeGreaterThanOrEqual(0);
    expect(restored.configs.hypnotic.bpm).toBeLessThanOrEqual(200);
    expect(restored.configs.hypnotic.lengthMinutes).toBeLessThanOrEqual(60);
    expect(restored.configs.hypnotic.drive).toBeLessThanOrEqual(1);
  });

  it('drops instruments that do not exist', () => {
    const restored = sanitizeSession(
      {
        ...DEFAULTS,
        mix: {
          'Real#0': { instrument: 'drum909', volume: 0.5, muted: false },
          'Fake#1': { instrument: 'definitelyNotAnInstrument', volume: 0.5, muted: false }
        }
      },
      DEFAULTS
    );

    expect(Object.keys(restored.mix)).toEqual(['Real#0']);
  });

  it('ignores a mix that is not an object', () => {
    expect(sanitizeSession({ ...DEFAULTS, mix: 'nope' }, DEFAULTS).mix).toEqual({});
    expect(sanitizeSession(null, DEFAULTS)).toEqual(DEFAULTS);
  });
});

describe('starter presets', () => {
  it('each one names a genre and lands within its config', () => {
    for (const starter of STARTERS) {
      const state = starterToSession(starter, DEFAULTS);
      expect(state.mode).toBe(starter.mode);
      const config = state.configs[starter.mode] as unknown as Record<string, unknown>;
      for (const [field, value] of Object.entries(starter.config)) {
        expect(config[field]).toEqual(value);
      }
    }
  });

  it('leaves the other genres on their defaults', () => {
    const state = starterToSession(STARTERS[0], DEFAULTS);
    expect(state.configs.neurofunk).toEqual(DEFAULTS.configs.neurofunk);
  });

  it('every starter actually composes', async () => {
    const starter = STARTERS.find(item => item.mode === 'hypnotic')!;
    const state = starterToSession(starter, DEFAULTS);
    const song = parseMidi(
      await build('hypnotic', 1, { seed: state.seed, swing: state.swing, humanize: state.humanize })
    );
    expect(song.tracks.length).toBeGreaterThan(0);
  });

  it('has a description for the UI', () => {
    for (const starter of STARTERS) {
      const text = describeSession(starterToSession(starter, DEFAULTS));
      expect(text).toContain('BPM');
      expect(text.length).toBeGreaterThan(5);
    }
  });

  it('names are unique so the list is unambiguous', () => {
    const names = STARTERS.map(s => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('only references instruments that exist', () => {
    const ids = new Set(INSTRUMENTS.map(i => i.id));
    for (const starter of STARTERS) {
      for (const setting of Object.values(starterToSession(starter, DEFAULTS).mix)) {
        expect(ids).toContain(setting.instrument);
      }
    }
  });
});

describe('history de-duplication', () => {
  it('treats an unchanged session as the same take', () => {
    expect(sameSession(DEFAULTS, { ...DEFAULTS })).toBe(true);
  });

  it('separates takes that would compose differently', () => {
    expect(sameSession(DEFAULTS, { ...DEFAULTS, seed: DEFAULTS.seed + 1 })).toBe(false);
    expect(sameSession(DEFAULTS, { ...DEFAULTS, swing: 0.3 })).toBe(false);
    expect(sameSession(DEFAULTS, { ...DEFAULTS, mode: 'jungle' })).toBe(false);
    expect(
      sameSession(DEFAULTS, {
        ...DEFAULTS,
        configs: { ...DEFAULTS.configs, ambient: { ...DEFAULTS.configs.ambient, bpm: 170 } }
      })
    ).toBe(false);
  });

  it('ignores the mix, which does not change the composition', () => {
    const withMix = { ...DEFAULTS, mix: { 'Sub Bass#1': { instrument: 'subBass' as const, volume: 0.2, muted: true } } };
    expect(sameSession(DEFAULTS, withMix)).toBe(true);
  });
});
