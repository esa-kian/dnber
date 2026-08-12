import {
  AppMode,
  DancefloorConfig,
  GeneratorConfig,
  HypnoticConfig,
  JumpUpConfig,
  JungleConfig,
  LiquidConfig,
  NeurofunkConfig
} from '../types';
import { INSTRUMENTS, InstrumentId, TrackSettings } from '../services/audioEngine';

/**
 * A session is everything that decides what you hear: the genre and its
 * settings, the seed, the feel, and which instrument each track plays. Because
 * generation is seeded, restoring one reproduces the composition exactly.
 */

export const MODES: AppMode[] = ['ambient', 'jungle', 'liquid', 'dancefloor', 'jumpup', 'neurofunk', 'hypnotic'];

export type SessionConfigs = {
  ambient: GeneratorConfig;
  neurofunk: NeurofunkConfig;
  jungle: JungleConfig;
  liquid: LiquidConfig;
  dancefloor: DancefloorConfig;
  jumpup: JumpUpConfig;
  hypnotic: HypnoticConfig;
};

export type SessionState = {
  mode: AppMode;
  configs: SessionConfigs;
  seed: number;
  swing: number;
  humanize: number;
  /** Track name to instrument choice, so a restored session sounds the same. */
  mix: Record<string, TrackSettings>;
};

export type SavedPreset = {
  id: string;
  name: string;
  savedAt: number;
  state: SessionState;
};

export type HistoryEntry = {
  id: string;
  at: number;
  state: SessionState;
};

const PRESET_KEY = 'dnber.presets.v1';
const HISTORY_KEY = 'dnber.history.v1';
export const HISTORY_LIMIT = 12;

const INSTRUMENT_IDS = new Set(INSTRUMENTS.map(item => item.id));

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, number));
}

/**
 * Sessions can arrive from a shared link, so nothing from outside is trusted:
 * unknown fields fall back to the defaults handed in.
 */
export function sanitizeSession(input: unknown, defaults: SessionState): SessionState {
  if (!input || typeof input !== 'object') return defaults;
  const raw = input as Partial<SessionState>;

  const mode = MODES.includes(raw.mode as AppMode) ? (raw.mode as AppMode) : defaults.mode;

  // Written through a loose record: indexing a union of config shapes by a
  // union of keys collapses to never in the type checker
  const configs = { ...defaults.configs } as unknown as Record<string, unknown>;
  const rawConfigs = (raw.configs ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(defaults.configs) as (keyof SessionConfigs)[]) {
    const fallback = defaults.configs[key] as unknown as Record<string, unknown>;

    const candidate = rawConfigs[key];
    if (!candidate || typeof candidate !== 'object') continue;

    const merged: Record<string, unknown> = { ...fallback };
    for (const [field, fallbackValue] of Object.entries(fallback)) {
      const value = (candidate as Record<string, unknown>)[field];
      if (typeof fallbackValue === 'number') {
        // Tempo and length have their own sane ranges; the rest are 0-1 amounts
        const [min, max] = field === 'bpm' ? [60, 200] : field === 'lengthMinutes' ? [1, 60] : [0, 1];
        merged[field] = clamp(value, min, max, fallbackValue);
      } else if (typeof value === 'string' && value.length <= 24) {
        merged[field] = value;
      }
    }
    configs[key] = merged;
  }

  const mix: Record<string, TrackSettings> = {};
  const rawMix = raw.mix;
  if (rawMix && typeof rawMix === 'object') {
    for (const [track, setting] of Object.entries(rawMix as Record<string, unknown>)) {
      if (typeof track !== 'string' || track.length > 80 || !setting || typeof setting !== 'object') continue;
      const entry = setting as Partial<TrackSettings>;
      if (!INSTRUMENT_IDS.has(entry.instrument as InstrumentId)) continue;
      mix[track] = {
        instrument: entry.instrument as InstrumentId,
        volume: clamp(entry.volume, 0, 1, 0.75),
        muted: entry.muted === true
      };
    }
  }

  return {
    mode,
    configs: configs as unknown as SessionConfigs,
    seed: Math.floor(clamp(raw.seed, 0, 0xffffffff, defaults.seed)),
    swing: clamp(raw.swing, 0, 1, defaults.swing),
    humanize: clamp(raw.humanize, 0, 1, defaults.humanize),
    mix
  };
}

/**
 * URL-safe base64 of the session, for sharing a link.
 *
 * Only the genre being played is carried. Sending all seven config blocks made
 * for a 2,700 character URL, and the others are just the defaults anyway.
 */
export function encodeSession(state: SessionState): string {
  const payload = {
    mode: state.mode,
    config: state.configs[state.mode],
    seed: state.seed,
    swing: state.swing,
    humanize: state.humanize,
    mix: state.mix
  };
  const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSession(text: string, defaults: SessionState): SessionState | null {
  try {
    const padded = text.replace(/-/g, '+').replace(/_/g, '/');
    const raw = JSON.parse(decodeURIComponent(escape(atob(padded)))) as Record<string, unknown>;
    const mode = MODES.includes(raw.mode as AppMode) ? (raw.mode as AppMode) : defaults.mode;
    const configs = { ...defaults.configs } as unknown as Record<string, unknown>;
    if (raw.config) configs[mode] = raw.config;
    return sanitizeSession({ ...raw, mode, configs }, defaults);
  } catch {
    return null;
  }
}

function readStore<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full or disabled store just means presets do not persist
  }
}

export function loadPresets(): SavedPreset[] {
  return readStore<SavedPreset>(PRESET_KEY);
}

export function storePresets(presets: SavedPreset[]) {
  writeStore(PRESET_KEY, presets);
}

export function loadHistory(): HistoryEntry[] {
  return readStore<HistoryEntry>(HISTORY_KEY);
}

export function storeHistory(entries: HistoryEntry[]) {
  writeStore(HISTORY_KEY, entries.slice(0, HISTORY_LIMIT));
}

/** Two sessions that would compose the same music. */
export function sameSession(a: SessionState, b: SessionState): boolean {
  return (
    a.mode === b.mode &&
    a.seed === b.seed &&
    a.swing === b.swing &&
    a.humanize === b.humanize &&
    JSON.stringify(a.configs[a.mode]) === JSON.stringify(b.configs[b.mode])
  );
}

export function describeSession(state: SessionState): string {
  const config = state.configs[state.mode];
  const style = 'style' in config ? config.style : 'mood' in config ? config.mood : '';
  const parts = [config.scaleRoot + ' ' + config.scaleType, `${config.bpm} BPM`];
  if (style) parts.unshift(String(style));
  return parts.join(' · ');
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Ready-made starting points, applied on top of the app's default settings. */
export type Starter = {
  name: string;
  hint: string;
  mode: AppMode;
  seed: number;
  swing: number;
  humanize: number;
  config: Record<string, unknown>;
};

export const STARTERS: Starter[] = [
  {
    name: 'Berlin Basement',
    hint: 'Hypnotic techno, rolling and dark',
    mode: 'hypnotic',
    seed: 0xbe111,
    swing: 0.1,
    humanize: 0.5,
    config: { bpm: 132, lengthMinutes: 4, scaleRoot: 'C', scaleType: 'minor', style: 'berlin', drive: 0.8, hypnosis: 0.9, percussion: 0.62, space: 0.6 }
  },
  {
    name: 'Acid Rinse',
    hint: 'Faster techno with a 303 running through it',
    mode: 'hypnotic',
    seed: 303303,
    swing: 0.24,
    humanize: 0.5,
    config: { bpm: 138, lengthMinutes: 4, scaleRoot: 'A', scaleType: 'phrygian', style: 'acid', drive: 0.86, hypnosis: 0.7, percussion: 0.72, space: 0.38 }
  },
  {
    name: 'Dub Chamber',
    hint: 'Slow, wide and mostly reverb',
    mode: 'hypnotic',
    seed: 8825,
    swing: 0.05,
    humanize: 0.62,
    config: { bpm: 124, lengthMinutes: 4, scaleRoot: 'D', scaleType: 'minor', style: 'dub', drive: 0.45, hypnosis: 0.82, percussion: 0.45, space: 0.96 }
  },
  {
    name: 'Deep Liquid Roller',
    hint: 'Smooth rolling drum and bass',
    mode: 'liquid',
    seed: 174174,
    swing: 0.18,
    humanize: 0.55,
    config: { bpm: 174, lengthMinutes: 4, scaleRoot: 'F', scaleType: 'dorian', style: 'smooth', groove: 0.8, bassFlow: 0.72, melody: 0.64, space: 0.8 }
  },
  {
    name: 'Darkside Jungle',
    hint: 'Chopped breaks, heavy sub',
    mode: 'jungle',
    seed: 1994,
    swing: 0.12,
    humanize: 0.6,
    config: { bpm: 164, lengthMinutes: 4, scaleRoot: 'F', scaleType: 'minor', style: 'darkside', breakEnergy: 0.9, chopComplexity: 0.82, bassWeight: 0.86, dubSpace: 0.5 }
  },
  {
    name: 'Techstep Pressure',
    hint: 'Tight neurofunk, maximum drive',
    mode: 'neurofunk',
    seed: 6161,
    swing: 0,
    humanize: 0.4,
    config: { bpm: 174, lengthMinutes: 4, scaleRoot: 'F', scaleType: 'phrygian', style: 'techstep', drumPressure: 0.9, bassMotion: 0.86, technicality: 0.82, tension: 0.86 }
  },
  {
    name: 'Festival Drop',
    hint: 'Big dancefloor hooks',
    mode: 'dancefloor',
    seed: 2024,
    swing: 0,
    humanize: 0.4,
    config: { bpm: 174, lengthMinutes: 4, scaleRoot: 'B', scaleType: 'minor', style: 'festival', drumDrive: 0.9, bassLift: 0.8, hookSize: 0.92, buildEnergy: 0.86 }
  },
  {
    name: 'Night Drive',
    hint: 'Ambient drum and bass, mostly atmosphere',
    mode: 'ambient',
    seed: 3300,
    swing: 0.08,
    humanize: 0.65,
    config: { bpm: 172, lengthMinutes: 4, scaleRoot: 'A', scaleType: 'minor', mood: 'deep', complexity: 0.5, breakDensity: 0.34, atmosphere: 0.96 }
  }
];

/** Turns a starter into a full session by layering it onto the current defaults. */
export function starterToSession(starter: Starter, defaults: SessionState): SessionState {
  const configs = { ...defaults.configs } as unknown as Record<string, unknown>;
  configs[starter.mode] = { ...(configs[starter.mode] as object), ...starter.config };
  return sanitizeSession(
    {
      mode: starter.mode,
      configs,
      seed: starter.seed,
      swing: starter.swing,
      humanize: starter.humanize,
      mix: {}
    },
    defaults
  );
}
