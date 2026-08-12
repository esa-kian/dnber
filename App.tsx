import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppMode, DancefloorConfig, DnbMode, GeneratorConfig, GenerationStatus, HypnoticConfig, JungleConfig, JumpUpConfig, LiquidConfig, MainGenre, NeurofunkConfig } from './types';
import { generateAmbientDnB } from './services/generator';
import { generateDancefloor } from './services/dancefloorGenerator';
import { generateHypnoticTechno } from './services/hypnoticGenerator';
import { generateJungle } from './services/jungleGenerator';
import { generateJumpUp } from './services/jumpUpGenerator';
import { generateLiquid } from './services/liquidGenerator';
import { generateNeurofunk } from './services/neurofunkGenerator';
import { Visualizer } from './components/Visualizer';
import { MidiPlayer } from './components/MidiPlayer';
import { seedRandom } from './utils/random';
import { setSwing } from './utils/groove';
import { setHumanize } from './utils/humanize';
import { TrackSettings } from './services/audioEngine';
import {
  HistoryEntry,
  HISTORY_LIMIT,
  SavedPreset,
  SessionState,
  STARTERS,
  decodeSession,
  describeSession,
  encodeSession,
  loadHistory,
  loadPresets,
  newId,
  sameSession,
  starterToSession,
  storeHistory,
  storePresets
} from './utils/session';

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const GUIDE_URL = 'https://github.com/esa-kian/dnber/blob/main/README.md';

const MODE_THEMES: Record<AppMode, {
  label: string;
  tag: string;
  text: string;
  solid: string;
  button: string;
  border: string;
  shadow: string;
  accent: string;
  primary: string;
  secondary: string;
}> = {
  ambient: {
    label: 'Ambient DnB',
    tag: 'Atmospheric',
    text: 'text-cyan-200',
    solid: 'bg-cyan-400',
    button: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950',
    border: 'border-cyan-300',
    shadow: 'shadow-cyan-500/20',
    accent: 'accent-cyan-400',
    primary: '#22d3ee',
    secondary: '#67e8f9'
  },
  jungle: {
    label: 'Jungle',
    tag: 'Breaks',
    text: 'text-emerald-200',
    solid: 'bg-emerald-400',
    button: 'bg-emerald-400 hover:bg-emerald-300 text-slate-950',
    border: 'border-emerald-300',
    shadow: 'shadow-emerald-500/20',
    accent: 'accent-emerald-400',
    primary: '#34d399',
    secondary: '#a7f3d0'
  },
  liquid: {
    label: 'Liquid',
    tag: 'Melodic',
    text: 'text-sky-200',
    solid: 'bg-sky-400',
    button: 'bg-sky-400 hover:bg-sky-300 text-slate-950',
    border: 'border-sky-300',
    shadow: 'shadow-sky-500/20',
    accent: 'accent-sky-400',
    primary: '#38bdf8',
    secondary: '#bae6fd'
  },
  dancefloor: {
    label: 'Dancefloor',
    tag: 'Anthemic',
    text: 'text-lime-200',
    solid: 'bg-lime-300',
    button: 'bg-lime-300 hover:bg-lime-200 text-slate-950',
    border: 'border-lime-200',
    shadow: 'shadow-lime-500/20',
    accent: 'accent-lime-300',
    primary: '#bef264',
    secondary: '#f0fdf4'
  },
  jumpup: {
    label: 'Jump Up',
    tag: 'Bouncy',
    text: 'text-rose-200',
    solid: 'bg-rose-400',
    button: 'bg-rose-400 hover:bg-rose-300 text-slate-950',
    border: 'border-rose-300',
    shadow: 'shadow-rose-500/20',
    accent: 'accent-rose-400',
    primary: '#fb7185',
    secondary: '#fecdd3'
  },
  neurofunk: {
    label: 'Neurofunk',
    tag: 'Technical',
    text: 'text-amber-200',
    solid: 'bg-amber-400',
    button: 'bg-amber-400 hover:bg-amber-300 text-slate-950',
    border: 'border-amber-300',
    shadow: 'shadow-amber-500/20',
    accent: 'accent-amber-400',
    primary: '#f59e0b',
    secondary: '#fde68a'
  },
  hypnotic: {
    label: 'Hypnotic Techno',
    tag: 'Techno',
    text: 'text-teal-200',
    solid: 'bg-teal-300',
    button: 'bg-teal-300 hover:bg-teal-200 text-slate-950',
    border: 'border-teal-200',
    shadow: 'shadow-teal-500/20',
    accent: 'accent-teal-300',
    primary: '#5eead4',
    secondary: '#bef264'
  }
};

const DNB_OPTIONS: { value: DnbMode; label: string }[] = [
  { value: 'ambient', label: 'Ambient DnB' },
  { value: 'jungle', label: 'Jungle' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'dancefloor', label: 'Dancefloor' },
  { value: 'jumpup', label: 'Jump Up' },
  { value: 'neurofunk', label: 'Neurofunk' },
];

function formatScale(scale: string): string {
  if (scale === 'minor') return 'Natural Minor';
  if (scale === 'dorian') return 'Dorian';
  if (scale === 'phrygian') return 'Phrygian';
  return 'Major';
}

function formatStyle(style: string): string {
  return style
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const MusicNoteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

const DiceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/></svg>
);

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
);

function timeAgo(at: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const GuideIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>
);

type SliderControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  accent: string;
  displayValue?: string;
  onChange: (value: number) => void;
};

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  accent,
  displayValue,
  onChange
}) => (
  <div>
    <label className="mb-2 flex items-center justify-between text-sm font-medium text-slate-400">
      <span>{label}</span>
      <span className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-xs text-slate-100">{displayValue ?? value}</span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(step ? parseFloat(e.target.value) : parseInt(e.target.value))}
      className={`w-full h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer ${accent}`}
    />
  </div>
);

export default function App() {
  const [mode, setMode] = useState<AppMode>('ambient');
  const [lastDnbMode, setLastDnbMode] = useState<DnbMode>('ambient');
  const [config, setConfig] = useState<GeneratorConfig>({
    bpm: 174,
    lengthMinutes: 20,
    scaleRoot: 'F',
    scaleType: 'dorian',
    mood: 'liquid',
    complexity: 0.72,
    breakDensity: 0.58,
    atmosphere: 0.82
  });
  const [neuroConfig, setNeuroConfig] = useState<NeurofunkConfig>({
    bpm: 174,
    lengthMinutes: 8,
    scaleRoot: 'F',
    scaleType: 'phrygian',
    style: 'techstep',
    drumPressure: 0.82,
    bassMotion: 0.88,
    technicality: 0.78,
    tension: 0.82
  });
  const [jungleConfig, setJungleConfig] = useState<JungleConfig>({
    bpm: 164,
    lengthMinutes: 8,
    scaleRoot: 'F',
    scaleType: 'minor',
    style: 'classic',
    breakEnergy: 0.86,
    chopComplexity: 0.72,
    bassWeight: 0.82,
    dubSpace: 0.62
  });
  const [liquidConfig, setLiquidConfig] = useState<LiquidConfig>({
    bpm: 174,
    lengthMinutes: 8,
    scaleRoot: 'F',
    scaleType: 'dorian',
    style: 'smooth',
    groove: 0.72,
    bassFlow: 0.74,
    melody: 0.68,
    space: 0.72
  });
  const [dancefloorConfig, setDancefloorConfig] = useState<DancefloorConfig>({
    bpm: 174,
    lengthMinutes: 8,
    scaleRoot: 'F',
    scaleType: 'minor',
    style: 'anthem',
    drumDrive: 0.82,
    bassLift: 0.76,
    hookSize: 0.84,
    buildEnergy: 0.78
  });
  const [jumpUpConfig, setJumpUpConfig] = useState<JumpUpConfig>({
    bpm: 174,
    lengthMinutes: 8,
    scaleRoot: 'F',
    scaleType: 'minor',
    style: 'bouncy',
    drumSnap: 0.84,
    wobble: 0.78,
    riffEnergy: 0.86,
    hype: 0.7
  });
  const [hypnoticConfig, setHypnoticConfig] = useState<HypnoticConfig>({
    bpm: 132,
    lengthMinutes: 8,
    scaleRoot: 'F',
    scaleType: 'phrygian',
    style: 'berlin',
    drive: 0.78,
    hypnosis: 0.86,
    percussion: 0.64,
    space: 0.72
  });

  const [status, setStatus] = useState<GenerationStatus>({
    isGenerating: false,
    progress: 0,
    message: ''
  });
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [midiBytes, setMidiBytes] = useState<Uint8Array | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 0xffffffff));
  const [swing, setSwingAmount] = useState(0);
  const [humanize, setHumanizeAmount] = useState(0.45);
  const [mix, setMix] = useState<Record<string, TrackSettings>>({});
  const [mixPreset, setMixPreset] = useState<Record<string, TrackSettings> | null>(null);
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [shareNote, setShareNote] = useState('');

  const selectMainGenre = (genre: MainGenre) => {
    setMode(genre === 'hypnotic' ? 'hypnotic' : lastDnbMode);
  };

  const selectDnbMode = (nextMode: DnbMode) => {
    setMode(nextMode);
    setLastDnbMode(nextMode);
  };

  const session: SessionState = {
    mode,
    configs: {
      ambient: config,
      neurofunk: neuroConfig,
      jungle: jungleConfig,
      liquid: liquidConfig,
      dancefloor: dancefloorConfig,
      jumpup: jumpUpConfig,
      hypnotic: hypnoticConfig
    },
    seed,
    swing,
    humanize,
    mix
  };

  // The live session drives history and presets, but must not retrigger them
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  });

  const applySession = useCallback((next: SessionState) => {
    setMode(next.mode);
    if (next.mode !== 'hypnotic') setLastDnbMode(next.mode);
    setConfig(next.configs.ambient);
    setNeuroConfig(next.configs.neurofunk);
    setJungleConfig(next.configs.jungle);
    setLiquidConfig(next.configs.liquid);
    setDancefloorConfig(next.configs.dancefloor);
    setJumpUpConfig(next.configs.jumpup);
    setHypnoticConfig(next.configs.hypnotic);
    setSeed(next.seed);
    setSwingAmount(next.swing);
    setHumanizeAmount(next.humanize);
    setMix(next.mix);
    // A fresh object each time, so the player always adopts the incoming mix
    setMixPreset({ ...next.mix });
  }, []);

  // Stored presets, past takes, and a session handed over in the link
  useEffect(() => {
    setPresets(loadPresets());
    setHistory(loadHistory());

    const shared = window.location.hash.replace(/^#s=/, '');
    if (shared && shared !== window.location.hash) {
      const restored = decodeSession(shared, sessionRef.current);
      if (restored) applySession(restored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rememberTake = useCallback((state: SessionState) => {
    setHistory(current => {
      if (current[0] && sameSession(current[0].state, state)) return current;
      const next = [{ id: newId(), at: Date.now(), state }, ...current].slice(0, HISTORY_LIMIT);
      storeHistory(next);
      return next;
    });
  }, []);

  const savePreset = useCallback(() => {
    const name = window.prompt('Name this preset', describeSession(sessionRef.current));
    if (!name) return;
    setPresets(current => {
      const next = [{ id: newId(), name: name.slice(0, 60), savedAt: Date.now(), state: sessionRef.current }, ...current];
      storePresets(next);
      return next;
    });
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets(current => {
      const next = current.filter(preset => preset.id !== id);
      storePresets(next);
      return next;
    });
  }, []);

  const copyShareLink = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}#s=${encodeSession(sessionRef.current)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareNote('Link copied');
    } catch {
      window.location.hash = `s=${encodeSession(sessionRef.current)}`;
      setShareNote('Link is in the address bar');
    }
    window.setTimeout(() => setShareNote(''), 2500);
  }, []);

  // One composition at a time; changes that land mid-run are coalesced into a re-run
  const runState = useRef({ running: false, pending: false });
  const downloadUrlRef = useRef<string | null>(null);

  const compose = useCallback(async () => {
    if (runState.current.running) {
      runState.current.pending = true;
      return;
    }
    runState.current.running = true;
    setStatus({ isGenerating: true, progress: 0, message: 'Composing...' });

    try {
      seedRandom(seed);
      setSwing(swing);
      const bpm =
        mode === 'ambient' ? config.bpm
        : mode === 'jungle' ? jungleConfig.bpm
        : mode === 'liquid' ? liquidConfig.bpm
        : mode === 'dancefloor' ? dancefloorConfig.bpm
        : mode === 'jumpup' ? jumpUpConfig.bpm
        : mode === 'hypnotic' ? hypnoticConfig.bpm
        : neuroConfig.bpm;
      setHumanize(humanize, seed, bpm);
      let bytes: Uint8Array;

      if (mode === 'ambient') {
        bytes = await generateAmbientDnB(config, setStatus);
      } else if (mode === 'jungle') {
        bytes = await generateJungle(jungleConfig, setStatus);
      } else if (mode === 'liquid') {
        bytes = await generateLiquid(liquidConfig, setStatus);
      } else if (mode === 'dancefloor') {
        bytes = await generateDancefloor(dancefloorConfig, setStatus);
      } else if (mode === 'jumpup') {
        bytes = await generateJumpUp(jumpUpConfig, setStatus);
      } else if (mode === 'hypnotic') {
        bytes = await generateHypnoticTechno(hypnoticConfig, setStatus);
      } else {
        bytes = await generateNeurofunk(neuroConfig, setStatus);
      }

      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' }));
      downloadUrlRef.current = url;
      setDownloadUrl(url);
      setMidiBytes(bytes);
      rememberTake(sessionRef.current);
      setStatus({ isGenerating: false, progress: 100, message: 'Live' });
    } catch (e) {
      console.error(e);
      setStatus({ isGenerating: false, progress: 0, message: 'Error generating MIDI' });
    } finally {
      runState.current.running = false;
      if (runState.current.pending) {
        runState.current.pending = false;
        void latestCompose.current();
      }
    }
  }, [config, dancefloorConfig, hypnoticConfig, jungleConfig, jumpUpConfig, liquidConfig, mode, neuroConfig, seed, swing, humanize, rememberTake]);

  // A queued re-run must use the newest settings, not the closure that queued it
  const latestCompose = useRef(compose);
  useEffect(() => {
    latestCompose.current = compose;
  }, [compose]);

  // Every control change recomposes; the debounce keeps slider drags cheap
  useEffect(() => {
    const timer = window.setTimeout(() => void compose(), 260);
    return () => window.clearTimeout(timer);
  }, [compose]);

  useEffect(() => () => {
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
  }, []);

  const activeBpm = mode === 'ambient' ? config.bpm : mode === 'jungle' ? jungleConfig.bpm : mode === 'liquid' ? liquidConfig.bpm : mode === 'dancefloor' ? dancefloorConfig.bpm : mode === 'jumpup' ? jumpUpConfig.bpm : mode === 'hypnotic' ? hypnoticConfig.bpm : neuroConfig.bpm;
  const activeRoot = mode === 'ambient' ? config.scaleRoot : mode === 'jungle' ? jungleConfig.scaleRoot : mode === 'liquid' ? liquidConfig.scaleRoot : mode === 'dancefloor' ? dancefloorConfig.scaleRoot : mode === 'jumpup' ? jumpUpConfig.scaleRoot : mode === 'hypnotic' ? hypnoticConfig.scaleRoot : neuroConfig.scaleRoot;
  const activeScale = mode === 'ambient' ? config.scaleType : mode === 'jungle' ? jungleConfig.scaleType : mode === 'liquid' ? liquidConfig.scaleType : mode === 'dancefloor' ? dancefloorConfig.scaleType : mode === 'jumpup' ? jumpUpConfig.scaleType : mode === 'hypnotic' ? hypnoticConfig.scaleType : neuroConfig.scaleType;
  const mainGenre: MainGenre = mode === 'hypnotic' ? 'hypnotic' : 'dnb';
  const modeTheme = MODE_THEMES[mode];
  const mainGenreLabel = mainGenre === 'hypnotic' ? 'Hypnotic Techno' : 'DnB';
  const detailLabel = mainGenre === 'hypnotic' ? 'Style' : 'DnB Style';
  const detailValue = mainGenre === 'hypnotic' ? formatStyle(hypnoticConfig.style) : modeTheme.label;
  const routing = mode === 'ambient'
    ? [
        ['Ch. 1', 'Evolving pads'],
        ['Ch. 2', 'Sub bass'],
        ['Ch. 3', 'Echo plucks'],
        ['Ch. 4', 'Reese bass'],
        ['Ch. 10', 'Break kit'],
        ['Tempo', `${config.bpm} BPM`],
      ]
    : mode === 'jungle'
      ? [
        ['Ch. 1', 'Pads'],
        ['Ch. 2', 'Dub sub'],
        ['Ch. 3', 'Rave/dub stabs'],
        ['Ch. 4', 'FX sirens'],
        ['Ch. 10', 'Chopped breaks'],
        ['Tempo', `${jungleConfig.bpm} BPM`],
      ]
      : mode === 'liquid'
        ? [
        ['Ch. 1', 'Keys/chords'],
        ['Ch. 2', 'Liquid sub'],
        ['Ch. 3', 'Warm pads'],
        ['Ch. 4', 'Hooks/plucks'],
        ['Ch. 10', 'Clean drums'],
        ['Tempo', `${liquidConfig.bpm} BPM`],
      ]
        : mode === 'dancefloor'
          ? [
        ['Ch. 1', 'Lead hook'],
        ['Ch. 2', 'Clean sub'],
        ['Ch. 3', 'Anthem chords'],
        ['Ch. 4', 'Reese bass'],
        ['Ch. 5', 'Plucks/arps'],
        ['Ch. 7', 'Builds/FX'],
        ['Ch. 10', 'Polished drums'],
        ['Tempo', `${dancefloorConfig.bpm} BPM`],
      ]
        : mode === 'jumpup'
          ? [
        ['Ch. 1', 'Hooks/stabs'],
        ['Ch. 2', 'Sub punch'],
        ['Ch. 5', 'Wobble bass'],
        ['Ch. 6', 'Bass answer'],
        ['Ch. 7', 'FX/hype'],
        ['Ch. 10', 'Snappy drums'],
        ['Tempo', `${jumpUpConfig.bpm} BPM`],
      ]
        : mode === 'hypnotic'
          ? [
        ['Ch. 1', 'Dub stabs'],
        ['Ch. 2', 'Rumble sub'],
        ['Ch. 3', 'Low pulse'],
        ['Ch. 4', 'Sequence'],
        ['Ch. 5', 'Percussion'],
        ['Ch. 6', 'Filter FX'],
        ['Ch. 10', '909 drums'],
        ['Tempo', `${hypnoticConfig.bpm} BPM`],
      ]
        : [
        ['Ch. 1', 'Stabs'],
        ['Ch. 2', 'Sub weight'],
        ['Ch. 5', 'Bass main'],
        ['Ch. 6', 'Bass response'],
        ['Ch. 7', 'FX risers'],
        ['Ch. 10', 'Tight drums'],
      ];
  const downloadName = mode === 'ambient'
    ? `dnber_ambient_${activeBpm}bpm_${activeRoot}${activeScale}.mid`
    : mode === 'jungle'
      ? `jungle_${activeBpm}bpm_${activeRoot}${activeScale}_${jungleConfig.style}.mid`
      : mode === 'liquid'
        ? `liquid_${activeBpm}bpm_${activeRoot}${activeScale}_${liquidConfig.style}.mid`
        : mode === 'dancefloor'
          ? `dancefloor_${activeBpm}bpm_${activeRoot}${activeScale}_${dancefloorConfig.style}.mid`
        : mode === 'jumpup'
          ? `jump_up_${activeBpm}bpm_${activeRoot}${activeScale}_${jumpUpConfig.style}.mid`
        : mode === 'hypnotic'
          ? `hypnotic_techno_${activeBpm}bpm_${activeRoot}${activeScale}_${hypnoticConfig.style}.mid`
        : `neurofunk_${activeBpm}bpm_${activeRoot}${activeScale}_${neuroConfig.style}.mid`;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#020617_0%,#0f172a_52%,#020617_100%)] p-4 font-sans text-slate-200 selection:bg-cyan-500 selection:text-slate-950 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 text-slate-950 shadow-lg ${modeTheme.solid} ${modeTheme.shadow}`}>
                <MusicNoteIcon />
              </div>
              <div>
                <div className={`text-sm font-semibold ${modeTheme.text}`}>{modeTheme.tag}</div>
                <h1 className="text-3xl font-bold text-slate-50">DnBer</h1>
                <p className="text-sm text-slate-400">Multi-genre MIDI generator</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Genre', mainGenreLabel],
                  [detailLabel, detailValue],
                  ['Tempo', `${activeBpm} BPM`],
                  ['Key', `${activeRoot} ${formatScale(activeScale)}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <div className="text-xs text-slate-500">{label}</div>
                    <div className="truncate text-sm font-semibold text-slate-100">{value}</div>
                  </div>
                ))}
              </div>
              <a
                href={GUIDE_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Open the dnber guide on GitHub"
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-900 ${modeTheme.shadow}`}
              >
                <GuideIcon />
                <span>Read guide</span>
              </a>
            </div>
          </div>
        </header>

        <Visualizer isGenerating={status.isGenerating} primaryColor={modeTheme.primary} secondaryColor={modeTheme.secondary} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur-sm md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className={`text-xl font-semibold ${modeTheme.text}`}>Session</h2>
              <span className="hidden max-w-[52%] truncate rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1 text-xs text-slate-400 sm:block">{downloadName}</span>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Genre</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'dnb' as MainGenre, label: 'DnB', tag: 'Breaks and bass', theme: MODE_THEMES[lastDnbMode] },
                    { value: 'hypnotic' as MainGenre, label: 'Hypnotic Techno', tag: '4/4 and rumble', theme: MODE_THEMES.hypnotic },
                  ].map(option => {
                    const selected = mainGenre === option.value;
                    const optionTheme = option.theme;
                    return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        selectMainGenre(option.value);
                      }}
                      className={`min-h-16 rounded-lg border px-4 py-3 text-left transition-all ${
                        selected
                          ? `${optionTheme.border} ${optionTheme.solid} text-slate-950 shadow-lg ${optionTheme.shadow}`
                          : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:bg-slate-900'
                      }`}
                    >
                      <span className="block text-base font-semibold">{option.label}</span>
                      <span className={`mt-1 block text-xs ${selected ? 'text-slate-800' : optionTheme.text}`}>{optionTheme.tag}</span>
                    </button>
                    );
                  })}
                </div>
              </div>

              {mainGenre === 'dnb' && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">DnB Style</label>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                    {DNB_OPTIONS.map(option => {
                      const optionTheme = MODE_THEMES[option.value];
                      const selected = mode === option.value;
                      return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          selectDnbMode(option.value);
                        }}
                        className={`min-h-14 rounded-lg border px-3 py-2 text-left transition-all ${
                          selected
                            ? `${optionTheme.border} ${optionTheme.solid} text-slate-950 shadow-lg ${optionTheme.shadow}`
                            : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:bg-slate-900'
                        }`}
                      >
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className={`mt-1 block text-xs ${selected ? 'text-slate-800' : optionTheme.text}`}>{optionTheme.tag}</span>
                      </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <SliderControl
                  label="Swing"
                  value={swing}
                  min={0}
                  max={1}
                  step={0.01}
                  accent={modeTheme.accent}
                  displayValue={swing === 0 ? 'Straight' : `${Math.round(swing * 100)}%`}
                  onChange={setSwingAmount}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Delays every off-beat 16th. Applies to whichever genre is selected.
                </p>
                <div className="mt-4">
                  <SliderControl
                    label="Human feel"
                    value={humanize}
                    min={0}
                    max={1}
                    step={0.01}
                    accent={modeTheme.accent}
                    displayValue={humanize === 0 ? 'Machine' : `${Math.round(humanize * 100)}%`}
                    onChange={setHumanizeAmount}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Loosens timing, varies velocity, rolls stacked chords and drifts each voice.
                  </p>
                </div>
              </div>

              {mode === 'ambient' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Mood</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'liquid', label: 'Liquid' },
                        { value: 'deep', label: 'Deep' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'ethereal', label: 'Ethereal' },
                      ].map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setConfig({...config, mood: option.value as GeneratorConfig['mood']})}
                          className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                            config.mood === option.value
                              ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SliderControl
                    label="Tempo (BPM)"
                    value={config.bpm}
                    min={160}
                    max={180}
                    accent="accent-cyan-400"
                    onChange={(bpm) => setConfig({...config, bpm})}
                  />

                  <SliderControl
                    label="Length (Minutes)"
                    value={config.lengthMinutes}
                    min={1}
                    max={60}
                    accent="accent-cyan-400"
                    onChange={(lengthMinutes) => setConfig({...config, lengthMinutes})}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Key</label>
                      <select
                        value={config.scaleRoot}
                        onChange={(e) => setConfig({...config, scaleRoot: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                      >
                        {KEYS.map(note => <option key={note} value={note}>{note}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Scale Type</label>
                      <select
                        value={config.scaleType}
                        onChange={(e) => setConfig({...config, scaleType: e.target.value as GeneratorConfig['scaleType']})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                      >
                        <option value="dorian">Dorian (Classic DnB)</option>
                        <option value="minor">Natural Minor</option>
                        <option value="phrygian">Phrygian (Dark)</option>
                        <option value="major">Major (Liquid)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <SliderControl
                      label="Breaks"
                      value={config.breakDensity}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-cyan-400"
                      displayValue={`${Math.round(config.breakDensity * 100)}%`}
                      onChange={(breakDensity) => setConfig({...config, breakDensity})}
                    />
                    <SliderControl
                      label="Harmony"
                      value={config.complexity}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-cyan-400"
                      displayValue={`${Math.round(config.complexity * 100)}%`}
                      onChange={(complexity) => setConfig({...config, complexity})}
                    />
                    <SliderControl
                      label="Air"
                      value={config.atmosphere}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-cyan-400"
                      displayValue={`${Math.round(config.atmosphere * 100)}%`}
                      onChange={(atmosphere) => setConfig({...config, atmosphere})}
                    />
                  </div>
                </>
              ) : mode === 'jungle' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Style</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'classic', label: 'Classic' },
                        { value: 'ragga', label: 'Ragga' },
                        { value: 'darkside', label: 'Darkside' },
                        { value: 'atmospheric', label: 'Atmospheric' },
                      ].map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setJungleConfig({...jungleConfig, style: option.value as JungleConfig['style']})}
                          className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                            jungleConfig.style === option.value
                              ? 'border-emerald-300 bg-emerald-400 text-slate-950'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SliderControl
                    label="Tempo (BPM)"
                    value={jungleConfig.bpm}
                    min={150}
                    max={170}
                    accent="accent-emerald-400"
                    onChange={(bpm) => setJungleConfig({...jungleConfig, bpm})}
                  />

                  <SliderControl
                    label="Length (Minutes)"
                    value={jungleConfig.lengthMinutes}
                    min={1}
                    max={45}
                    accent="accent-emerald-400"
                    onChange={(lengthMinutes) => setJungleConfig({...jungleConfig, lengthMinutes})}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Key</label>
                      <select
                        value={jungleConfig.scaleRoot}
                        onChange={(e) => setJungleConfig({...jungleConfig, scaleRoot: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {KEYS.map(note => <option key={note} value={note}>{note}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Scale Type</label>
                      <select
                        value={jungleConfig.scaleType}
                        onChange={(e) => setJungleConfig({...jungleConfig, scaleType: e.target.value as JungleConfig['scaleType']})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="minor">Natural Minor</option>
                        <option value="dorian">Dorian</option>
                        <option value="phrygian">Phrygian (Dark)</option>
                        <option value="major">Major</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <SliderControl
                      label="Breaks"
                      value={jungleConfig.breakEnergy}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-emerald-400"
                      displayValue={`${Math.round(jungleConfig.breakEnergy * 100)}%`}
                      onChange={(breakEnergy) => setJungleConfig({...jungleConfig, breakEnergy})}
                    />
                    <SliderControl
                      label="Chops"
                      value={jungleConfig.chopComplexity}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-emerald-400"
                      displayValue={`${Math.round(jungleConfig.chopComplexity * 100)}%`}
                      onChange={(chopComplexity) => setJungleConfig({...jungleConfig, chopComplexity})}
                    />
                    <SliderControl
                      label="Sub"
                      value={jungleConfig.bassWeight}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-emerald-400"
                      displayValue={`${Math.round(jungleConfig.bassWeight * 100)}%`}
                      onChange={(bassWeight) => setJungleConfig({...jungleConfig, bassWeight})}
                    />
                    <SliderControl
                      label="Dub Space"
                      value={jungleConfig.dubSpace}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-emerald-400"
                      displayValue={`${Math.round(jungleConfig.dubSpace * 100)}%`}
                      onChange={(dubSpace) => setJungleConfig({...jungleConfig, dubSpace})}
                    />
                  </div>
                </>
              ) : mode === 'liquid' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Style</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'smooth', label: 'Smooth' },
                        { value: 'soulful', label: 'Soulful' },
                        { value: 'deep', label: 'Deep' },
                        { value: 'vocal', label: 'Vocal' },
                      ].map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setLiquidConfig({...liquidConfig, style: option.value as LiquidConfig['style']})}
                          className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                            liquidConfig.style === option.value
                              ? 'border-sky-300 bg-sky-400 text-slate-950'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SliderControl
                    label="Tempo (BPM)"
                    value={liquidConfig.bpm}
                    min={168}
                    max={178}
                    accent="accent-sky-400"
                    onChange={(bpm) => setLiquidConfig({...liquidConfig, bpm})}
                  />

                  <SliderControl
                    label="Length (Minutes)"
                    value={liquidConfig.lengthMinutes}
                    min={1}
                    max={45}
                    accent="accent-sky-400"
                    onChange={(lengthMinutes) => setLiquidConfig({...liquidConfig, lengthMinutes})}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Key</label>
                      <select
                        value={liquidConfig.scaleRoot}
                        onChange={(e) => setLiquidConfig({...liquidConfig, scaleRoot: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-sky-500 outline-none"
                      >
                        {KEYS.map(note => <option key={note} value={note}>{note}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Scale Type</label>
                      <select
                        value={liquidConfig.scaleType}
                        onChange={(e) => setLiquidConfig({...liquidConfig, scaleType: e.target.value as LiquidConfig['scaleType']})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-sky-500 outline-none"
                      >
                        <option value="dorian">Dorian</option>
                        <option value="minor">Natural Minor</option>
                        <option value="major">Major</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <SliderControl
                      label="Groove"
                      value={liquidConfig.groove}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-sky-400"
                      displayValue={`${Math.round(liquidConfig.groove * 100)}%`}
                      onChange={(groove) => setLiquidConfig({...liquidConfig, groove})}
                    />
                    <SliderControl
                      label="Bass Flow"
                      value={liquidConfig.bassFlow}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-sky-400"
                      displayValue={`${Math.round(liquidConfig.bassFlow * 100)}%`}
                      onChange={(bassFlow) => setLiquidConfig({...liquidConfig, bassFlow})}
                    />
                    <SliderControl
                      label="Melody"
                      value={liquidConfig.melody}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-sky-400"
                      displayValue={`${Math.round(liquidConfig.melody * 100)}%`}
                      onChange={(melody) => setLiquidConfig({...liquidConfig, melody})}
                    />
                    <SliderControl
                      label="Space"
                      value={liquidConfig.space}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-sky-400"
                      displayValue={`${Math.round(liquidConfig.space * 100)}%`}
                      onChange={(space) => setLiquidConfig({...liquidConfig, space})}
                    />
                  </div>
                </>
              ) : mode === 'dancefloor' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Style</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'anthem', label: 'Anthem' },
                        { value: 'festival', label: 'Festival' },
                        { value: 'vocal', label: 'Vocal' },
                        { value: 'rave', label: 'Rave' },
                      ].map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDancefloorConfig({...dancefloorConfig, style: option.value as DancefloorConfig['style']})}
                          className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                            dancefloorConfig.style === option.value
                              ? 'border-lime-200 bg-lime-300 text-slate-950'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SliderControl
                    label="Tempo (BPM)"
                    value={dancefloorConfig.bpm}
                    min={168}
                    max={178}
                    accent="accent-lime-300"
                    onChange={(bpm) => setDancefloorConfig({...dancefloorConfig, bpm})}
                  />

                  <SliderControl
                    label="Length (Minutes)"
                    value={dancefloorConfig.lengthMinutes}
                    min={1}
                    max={45}
                    accent="accent-lime-300"
                    onChange={(lengthMinutes) => setDancefloorConfig({...dancefloorConfig, lengthMinutes})}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Key</label>
                      <select
                        value={dancefloorConfig.scaleRoot}
                        onChange={(e) => setDancefloorConfig({...dancefloorConfig, scaleRoot: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-lime-400 outline-none"
                      >
                        {KEYS.map(note => <option key={note} value={note}>{note}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Scale Type</label>
                      <select
                        value={dancefloorConfig.scaleType}
                        onChange={(e) => setDancefloorConfig({...dancefloorConfig, scaleType: e.target.value as DancefloorConfig['scaleType']})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-lime-400 outline-none"
                      >
                        <option value="minor">Natural Minor</option>
                        <option value="dorian">Dorian</option>
                        <option value="major">Major</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <SliderControl
                      label="Drums"
                      value={dancefloorConfig.drumDrive}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-lime-300"
                      displayValue={`${Math.round(dancefloorConfig.drumDrive * 100)}%`}
                      onChange={(drumDrive) => setDancefloorConfig({...dancefloorConfig, drumDrive})}
                    />
                    <SliderControl
                      label="Bass Lift"
                      value={dancefloorConfig.bassLift}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-lime-300"
                      displayValue={`${Math.round(dancefloorConfig.bassLift * 100)}%`}
                      onChange={(bassLift) => setDancefloorConfig({...dancefloorConfig, bassLift})}
                    />
                    <SliderControl
                      label="Hook"
                      value={dancefloorConfig.hookSize}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-lime-300"
                      displayValue={`${Math.round(dancefloorConfig.hookSize * 100)}%`}
                      onChange={(hookSize) => setDancefloorConfig({...dancefloorConfig, hookSize})}
                    />
                    <SliderControl
                      label="Builds"
                      value={dancefloorConfig.buildEnergy}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-lime-300"
                      displayValue={`${Math.round(dancefloorConfig.buildEnergy * 100)}%`}
                      onChange={(buildEnergy) => setDancefloorConfig({...dancefloorConfig, buildEnergy})}
                    />
                  </div>
                </>
              ) : mode === 'jumpup' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Style</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'bouncy', label: 'Bouncy' },
                        { value: 'wobble', label: 'Wobble' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'rave', label: 'Rave' },
                      ].map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setJumpUpConfig({...jumpUpConfig, style: option.value as JumpUpConfig['style']})}
                          className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                            jumpUpConfig.style === option.value
                              ? 'border-rose-300 bg-rose-400 text-slate-950'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SliderControl
                    label="Tempo (BPM)"
                    value={jumpUpConfig.bpm}
                    min={170}
                    max={178}
                    accent="accent-rose-400"
                    onChange={(bpm) => setJumpUpConfig({...jumpUpConfig, bpm})}
                  />

                  <SliderControl
                    label="Length (Minutes)"
                    value={jumpUpConfig.lengthMinutes}
                    min={1}
                    max={30}
                    accent="accent-rose-400"
                    onChange={(lengthMinutes) => setJumpUpConfig({...jumpUpConfig, lengthMinutes})}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Key</label>
                      <select
                        value={jumpUpConfig.scaleRoot}
                        onChange={(e) => setJumpUpConfig({...jumpUpConfig, scaleRoot: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        {KEYS.map(note => <option key={note} value={note}>{note}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Scale Type</label>
                      <select
                        value={jumpUpConfig.scaleType}
                        onChange={(e) => setJumpUpConfig({...jumpUpConfig, scaleType: e.target.value as JumpUpConfig['scaleType']})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value="minor">Natural Minor</option>
                        <option value="phrygian">Phrygian (Dark)</option>
                        <option value="dorian">Dorian</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <SliderControl
                      label="Drums"
                      value={jumpUpConfig.drumSnap}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-rose-400"
                      displayValue={`${Math.round(jumpUpConfig.drumSnap * 100)}%`}
                      onChange={(drumSnap) => setJumpUpConfig({...jumpUpConfig, drumSnap})}
                    />
                    <SliderControl
                      label="Wobble"
                      value={jumpUpConfig.wobble}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-rose-400"
                      displayValue={`${Math.round(jumpUpConfig.wobble * 100)}%`}
                      onChange={(wobble) => setJumpUpConfig({...jumpUpConfig, wobble})}
                    />
                    <SliderControl
                      label="Bass Riff"
                      value={jumpUpConfig.riffEnergy}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-rose-400"
                      displayValue={`${Math.round(jumpUpConfig.riffEnergy * 100)}%`}
                      onChange={(riffEnergy) => setJumpUpConfig({...jumpUpConfig, riffEnergy})}
                    />
                    <SliderControl
                      label="Hype"
                      value={jumpUpConfig.hype}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-rose-400"
                      displayValue={`${Math.round(jumpUpConfig.hype * 100)}%`}
                      onChange={(hype) => setJumpUpConfig({...jumpUpConfig, hype})}
                    />
                  </div>
                </>
              ) : mode === 'hypnotic' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Style</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'deep', label: 'Deep' },
                        { value: 'berlin', label: 'Berlin' },
                        { value: 'acid', label: 'Acid' },
                        { value: 'dub', label: 'Dub' },
                      ].map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setHypnoticConfig({...hypnoticConfig, style: option.value as HypnoticConfig['style']})}
                          className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                            hypnoticConfig.style === option.value
                              ? 'border-teal-200 bg-teal-300 text-slate-950'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SliderControl
                    label="Tempo (BPM)"
                    value={hypnoticConfig.bpm}
                    min={124}
                    max={140}
                    accent="accent-teal-300"
                    onChange={(bpm) => setHypnoticConfig({...hypnoticConfig, bpm})}
                  />

                  <SliderControl
                    label="Length (Minutes)"
                    value={hypnoticConfig.lengthMinutes}
                    min={1}
                    max={60}
                    accent="accent-teal-300"
                    onChange={(lengthMinutes) => setHypnoticConfig({...hypnoticConfig, lengthMinutes})}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Key</label>
                      <select
                        value={hypnoticConfig.scaleRoot}
                        onChange={(e) => setHypnoticConfig({...hypnoticConfig, scaleRoot: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-teal-400 outline-none"
                      >
                        {KEYS.map(note => <option key={note} value={note}>{note}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Scale Type</label>
                      <select
                        value={hypnoticConfig.scaleType}
                        onChange={(e) => setHypnoticConfig({...hypnoticConfig, scaleType: e.target.value as HypnoticConfig['scaleType']})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-teal-400 outline-none"
                      >
                        <option value="phrygian">Phrygian (Tense)</option>
                        <option value="minor">Natural Minor</option>
                        <option value="dorian">Dorian</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <SliderControl
                      label="Drive"
                      value={hypnoticConfig.drive}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-teal-300"
                      displayValue={`${Math.round(hypnoticConfig.drive * 100)}%`}
                      onChange={(drive) => setHypnoticConfig({...hypnoticConfig, drive})}
                    />
                    <SliderControl
                      label="Hypnosis"
                      value={hypnoticConfig.hypnosis}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-teal-300"
                      displayValue={`${Math.round(hypnoticConfig.hypnosis * 100)}%`}
                      onChange={(hypnosis) => setHypnoticConfig({...hypnoticConfig, hypnosis})}
                    />
                    <SliderControl
                      label="Percussion"
                      value={hypnoticConfig.percussion}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-teal-300"
                      displayValue={`${Math.round(hypnoticConfig.percussion * 100)}%`}
                      onChange={(percussion) => setHypnoticConfig({...hypnoticConfig, percussion})}
                    />
                    <SliderControl
                      label="Space"
                      value={hypnoticConfig.space}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-teal-300"
                      displayValue={`${Math.round(hypnoticConfig.space * 100)}%`}
                      onChange={(space) => setHypnoticConfig({...hypnoticConfig, space})}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Style</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'rolling', label: 'Rolling' },
                        { value: 'techstep', label: 'Techstep' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'minimal', label: 'Minimal' },
                      ].map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setNeuroConfig({...neuroConfig, style: option.value as NeurofunkConfig['style']})}
                          className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                            neuroConfig.style === option.value
                              ? 'border-amber-300 bg-amber-400 text-slate-950'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SliderControl
                    label="Tempo (BPM)"
                    value={neuroConfig.bpm}
                    min={168}
                    max={178}
                    accent="accent-amber-400"
                    onChange={(bpm) => setNeuroConfig({...neuroConfig, bpm})}
                  />

                  <SliderControl
                    label="Length (Minutes)"
                    value={neuroConfig.lengthMinutes}
                    min={1}
                    max={30}
                    accent="accent-amber-400"
                    onChange={(lengthMinutes) => setNeuroConfig({...neuroConfig, lengthMinutes})}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Key</label>
                      <select
                        value={neuroConfig.scaleRoot}
                        onChange={(e) => setNeuroConfig({...neuroConfig, scaleRoot: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        {KEYS.map(note => <option key={note} value={note}>{note}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Scale Type</label>
                      <select
                        value={neuroConfig.scaleType}
                        onChange={(e) => setNeuroConfig({...neuroConfig, scaleType: e.target.value as NeurofunkConfig['scaleType']})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="phrygian">Phrygian (Tense)</option>
                        <option value="minor">Natural Minor</option>
                        <option value="dorian">Dorian</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <SliderControl
                      label="Drums"
                      value={neuroConfig.drumPressure}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-amber-400"
                      displayValue={`${Math.round(neuroConfig.drumPressure * 100)}%`}
                      onChange={(drumPressure) => setNeuroConfig({...neuroConfig, drumPressure})}
                    />
                    <SliderControl
                      label="Bass Motion"
                      value={neuroConfig.bassMotion}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-amber-400"
                      displayValue={`${Math.round(neuroConfig.bassMotion * 100)}%`}
                      onChange={(bassMotion) => setNeuroConfig({...neuroConfig, bassMotion})}
                    />
                    <SliderControl
                      label="Tech"
                      value={neuroConfig.technicality}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-amber-400"
                      displayValue={`${Math.round(neuroConfig.technicality * 100)}%`}
                      onChange={(technicality) => setNeuroConfig({...neuroConfig, technicality})}
                    />
                    <SliderControl
                      label="Tension"
                      value={neuroConfig.tension}
                      min={0}
                      max={1}
                      step={0.01}
                      accent="accent-amber-400"
                      displayValue={`${Math.round(neuroConfig.tension * 100)}%`}
                      onChange={(tension) => setNeuroConfig({...neuroConfig, tension})}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-6">
            <div className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-200">Presets</h3>
                <span className="text-xs text-slate-500">{shareNote || 'Start here'}</span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STARTERS.map(starter => (
                  <button
                    key={starter.name}
                    type="button"
                    onClick={() => applySession(starterToSession(starter, sessionRef.current))}
                    className="min-h-14 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-left transition-all hover:border-slate-600 hover:bg-slate-900"
                  >
                    <span className="block text-sm font-semibold text-slate-200">{starter.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{starter.hint}</span>
                  </button>
                ))}
              </div>

              {presets.length > 0 && (
                <div className="mt-4 space-y-2">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Saved</span>
                  {presets.map(preset => (
                    <div key={preset.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => applySession(preset.state)}
                        className="flex min-h-11 flex-1 items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 text-left transition-colors hover:border-slate-600"
                      >
                        <span className="truncate text-sm text-slate-200">{preset.name}</span>
                        <span className="ml-2 shrink-0 text-xs text-slate-500">{describeSession(preset.state)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePreset(preset.id)}
                        aria-label={`Delete preset ${preset.name}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-800 text-slate-500 transition-colors hover:border-rose-500/60 hover:text-rose-300"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={savePreset}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
                >
                  <SaveIcon />
                  Save current
                </button>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
                >
                  <LinkIcon />
                  Copy link
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-200">MIDI Routing</h3>
                <span className={`text-sm font-semibold ${modeTheme.text}`}>{modeTheme.label}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {routing.map(([channel, label]) => (
                  <div key={`${channel}-${label}`} className="flex min-h-11 items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <span className={`font-semibold ${modeTheme.text}`}>{channel}</span>
                    <span className="text-slate-400 text-right">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-200">Output</h3>
                <span className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${
                  status.isGenerating
                    ? `${modeTheme.border} ${modeTheme.text}`
                    : midiBytes
                      ? 'border-emerald-400 text-emerald-300'
                      : 'border-slate-700 text-slate-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    status.isGenerating ? `${modeTheme.solid} animate-pulse` : midiBytes ? 'bg-emerald-400' : 'bg-slate-600'
                  }`} />
                  {status.isGenerating ? 'Composing' : midiBytes ? 'Live' : 'Idle'}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${modeTheme.solid}`}
                  style={{ width: `${status.isGenerating || midiBytes ? status.progress : 0}%` }}
                />
              </div>
              <div className="mt-3 min-h-5 text-sm text-slate-400">
                {status.isGenerating ? status.message : downloadName}
              </div>
              <button
                onClick={() => setSeed(Math.floor(Math.random() * 0xffffffff))}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
              >
                <DiceIcon />
                <span>New variation</span>
              </button>

              {history.length > 1 && (
                <div className="mt-4">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Recent takes</span>
                  <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
                    {history.map((entry, index) => {
                      const current = index === 0;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => applySession(entry.state)}
                          className={`flex min-h-11 w-full items-center justify-between rounded-lg border px-3 text-left transition-colors ${
                            current
                              ? `${modeTheme.border} bg-slate-950/70`
                              : 'border-slate-800 bg-slate-950/40 hover:border-slate-600'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className={`block truncate text-sm ${current ? modeTheme.text : 'text-slate-300'}`}>
                              {MODE_THEMES[entry.state.mode].label}
                            </span>
                            <span className="block truncate text-xs text-slate-500">{describeSession(entry.state)}</span>
                          </span>
                          <span className="ml-2 shrink-0 text-right text-xs text-slate-500">
                            <span className="block font-mono">#{entry.state.seed.toString(16).slice(0, 6)}</span>
                            <span className="block">{current ? 'playing' : timeAgo(entry.at)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <MidiPlayer
              midiBytes={midiBytes}
              fileName={downloadName}
              humanize={humanize}
              mixPreset={mixPreset}
              onMixChange={setMix}
              accent={modeTheme.accent}
              text={modeTheme.text}
              solid={modeTheme.solid}
              button={modeTheme.button}
              shadow={modeTheme.shadow}
            />

            {downloadUrl && !status.isGenerating && (
              <a href={downloadUrl} download={downloadName} className="block w-full">
                <button className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg font-semibold shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all">
                  <DownloadIcon />
                  <span>Download MIDI File</span>
                </button>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
