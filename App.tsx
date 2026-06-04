import React, { useState, useCallback } from 'react';
import { GeneratorConfig, GenerationStatus, JungleConfig, JumpUpConfig, LiquidConfig, NeurofunkConfig } from './types';
import { generateAmbientDnB } from './services/generator';
import { generateJungle } from './services/jungleGenerator';
import { generateJumpUp } from './services/jumpUpGenerator';
import { generateLiquid } from './services/liquidGenerator';
import { generateNeurofunk } from './services/neurofunkGenerator';
import { Visualizer } from './components/Visualizer';

type AppMode = 'ambient' | 'jungle' | 'liquid' | 'jumpup' | 'neurofunk';

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const MusicNoteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
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
    <label className="block text-sm font-medium text-slate-400 mb-2">
      {label}: <span className="text-white">{displayValue ?? value}</span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(step ? parseFloat(e.target.value) : parseInt(e.target.value))}
      className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer ${accent}`}
    />
  </div>
);

export default function App() {
  const [mode, setMode] = useState<AppMode>('ambient');
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

  const [status, setStatus] = useState<GenerationStatus>({
    isGenerating: false,
    progress: 0,
    message: ''
  });
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setDownloadUrl(null);
    setStatus({ isGenerating: true, progress: 0, message: 'Initializing generator...' });

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      let midiBytes: Uint8Array;

      if (mode === 'ambient') {
        midiBytes = await generateAmbientDnB(config, setStatus);
      } else if (mode === 'jungle') {
        midiBytes = await generateJungle(jungleConfig, setStatus);
      } else if (mode === 'liquid') {
        midiBytes = await generateLiquid(liquidConfig, setStatus);
      } else if (mode === 'jumpup') {
        midiBytes = await generateJumpUp(jumpUpConfig, setStatus);
      } else {
        midiBytes = await generateNeurofunk(neuroConfig, setStatus);
      }

      const blob = new Blob([midiBytes], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus({ isGenerating: false, progress: 100, message: 'Ready to download' });
    } catch (e) {
      console.error(e);
      setStatus({ isGenerating: false, progress: 0, message: 'Error generating MIDI' });
    }
  }, [config, jungleConfig, jumpUpConfig, liquidConfig, mode, neuroConfig]);

  const activeBpm = mode === 'ambient' ? config.bpm : mode === 'jungle' ? jungleConfig.bpm : mode === 'liquid' ? liquidConfig.bpm : mode === 'jumpup' ? jumpUpConfig.bpm : neuroConfig.bpm;
  const activeRoot = mode === 'ambient' ? config.scaleRoot : mode === 'jungle' ? jungleConfig.scaleRoot : mode === 'liquid' ? liquidConfig.scaleRoot : mode === 'jumpup' ? jumpUpConfig.scaleRoot : neuroConfig.scaleRoot;
  const activeScale = mode === 'ambient' ? config.scaleType : mode === 'jungle' ? jungleConfig.scaleType : mode === 'liquid' ? liquidConfig.scaleType : mode === 'jumpup' ? jumpUpConfig.scaleType : neuroConfig.scaleType;
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
        : [
        ['Ch. 1', 'Stabs'],
        ['Ch. 2', 'Sub weight'],
        ['Ch. 5', 'Bass main'],
        ['Ch. 6', 'Bass response'],
        ['Ch. 7', 'FX risers'],
        ['Ch. 10', 'Tight drums'],
      ];
  const downloadName = mode === 'ambient'
    ? `atmosphere_dnb_${activeBpm}bpm_${activeRoot}${activeScale}.mid`
    : mode === 'jungle'
      ? `jungle_${activeBpm}bpm_${activeRoot}${activeScale}_${jungleConfig.style}.mid`
      : mode === 'liquid'
        ? `liquid_${activeBpm}bpm_${activeRoot}${activeScale}_${liquidConfig.style}.mid`
        : mode === 'jumpup'
          ? `jump_up_${activeBpm}bpm_${activeRoot}${activeScale}_${jumpUpConfig.style}.mid`
        : `neurofunk_${activeBpm}bpm_${activeRoot}${activeScale}_${neuroConfig.style}.mid`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center space-x-4">
          <div className={`p-3 text-slate-950 rounded-lg shadow-lg ${
            mode === 'ambient'
              ? 'bg-cyan-500 shadow-cyan-500/20'
              : mode === 'jungle'
                ? 'bg-emerald-400 shadow-emerald-500/20'
                : mode === 'liquid'
                  ? 'bg-sky-400 shadow-sky-500/20'
                  : mode === 'jumpup'
                    ? 'bg-rose-400 shadow-rose-500/20'
                : 'bg-amber-400 shadow-amber-500/20'
          }`}>
            <MusicNoteIcon />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-50">Atmosphere</h1>
            <p className="text-slate-400 text-sm">Ambient, jungle, liquid, jump up, and neurofunk MIDI composer</p>
          </div>
        </header>

        <Visualizer isGenerating={status.isGenerating} />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-6">
          <div className="bg-slate-900/70 p-5 rounded-lg border border-slate-800 backdrop-blur-sm">
            <h2 className={`text-xl font-semibold mb-5 ${
              mode === 'ambient' ? 'text-cyan-200' : mode === 'jungle' ? 'text-emerald-200' : mode === 'liquid' ? 'text-sky-200' : mode === 'jumpup' ? 'text-rose-200' : 'text-amber-200'
            }`}>Session</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Engine</label>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                  {[
                    { value: 'ambient' as AppMode, label: 'Ambient DnB' },
                    { value: 'jungle' as AppMode, label: 'Jungle' },
                    { value: 'liquid' as AppMode, label: 'Liquid' },
                    { value: 'jumpup' as AppMode, label: 'Jump Up' },
                    { value: 'neurofunk' as AppMode, label: 'Neurofunk' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setMode(option.value);
                        setDownloadUrl(null);
                      }}
                      className={`h-11 rounded-lg border text-sm font-semibold transition-colors ${
                        mode === option.value
                          ? option.value === 'ambient'
                            ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                            : option.value === 'jungle'
                              ? 'border-emerald-300 bg-emerald-400 text-slate-950'
                              : option.value === 'liquid'
                                ? 'border-sky-300 bg-sky-400 text-slate-950'
                                : option.value === 'jumpup'
                                  ? 'border-rose-300 bg-rose-400 text-slate-950'
                              : 'border-amber-300 bg-amber-400 text-slate-950'
                          : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
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
            <div className="bg-slate-900/70 p-5 rounded-lg border border-slate-800 flex-grow">
              <h3 className="text-lg font-medium text-slate-200 mb-3">MIDI Routing</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {routing.map(([channel, label]) => (
                  <div key={`${channel}-${label}`} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                    <span className={`font-semibold ${
                      mode === 'ambient' ? 'text-cyan-200' : mode === 'jungle' ? 'text-emerald-200' : mode === 'liquid' ? 'text-sky-200' : mode === 'jumpup' ? 'text-rose-200' : 'text-amber-200'
                    }`}>{channel}</span>
                    <span className="text-slate-400 text-right">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={status.isGenerating}
              className={`
                w-full py-4 rounded-lg font-bold text-lg shadow-lg transition-all transform
                flex items-center justify-center space-x-2
                ${status.isGenerating
                  ? 'bg-slate-700 cursor-wait text-slate-400'
                  : mode === 'ambient'
                    ? 'bg-cyan-400 hover:bg-cyan-300 hover:scale-[1.02] text-slate-950 shadow-cyan-500/20'
                    : mode === 'jungle'
                      ? 'bg-emerald-400 hover:bg-emerald-300 hover:scale-[1.02] text-slate-950 shadow-emerald-500/20'
                    : mode === 'liquid'
                      ? 'bg-sky-400 hover:bg-sky-300 hover:scale-[1.02] text-slate-950 shadow-sky-500/20'
                      : mode === 'jumpup'
                        ? 'bg-rose-400 hover:bg-rose-300 hover:scale-[1.02] text-slate-950 shadow-rose-500/20'
                      : 'bg-amber-400 hover:bg-amber-300 hover:scale-[1.02] text-slate-950 shadow-amber-500/20'}
              `}
            >
              {status.isGenerating ? (
                <span>Generating... {status.progress}%</span>
              ) : (
                <span>{
                  mode === 'ambient'
                    ? 'Generate Ambient Composition'
                    : mode === 'jungle'
                      ? 'Generate Jungle Composition'
                      : mode === 'liquid'
                        ? 'Generate Liquid Composition'
                        : mode === 'jumpup'
                          ? 'Generate Jump Up Composition'
                      : 'Generate Neurofunk Composition'
                }</span>
              )}
            </button>

            {downloadUrl && !status.isGenerating && (
              <a href={downloadUrl} download={downloadName} className="block w-full">
                <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-semibold shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all">
                  <DownloadIcon />
                  <span>Download MIDI File</span>
                </button>
              </a>
            )}

            {status.message && (
              <div className="text-center text-sm text-slate-500 animate-pulse">
                {status.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
