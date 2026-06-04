import React, { useState, useCallback } from 'react';
import { GeneratorConfig, GenerationStatus, NeurofunkConfig } from './types';
import { generateAmbientDnB } from './services/generator';
import { generateNeurofunk } from './services/neurofunkGenerator';
import { Visualizer } from './components/Visualizer';

type AppMode = 'ambient' | 'neurofunk';

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
      const midiBytes = mode === 'ambient'
        ? await generateAmbientDnB(config, setStatus)
        : await generateNeurofunk(neuroConfig, setStatus);

      const blob = new Blob([midiBytes], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus({ isGenerating: false, progress: 100, message: 'Ready to download' });
    } catch (e) {
      console.error(e);
      setStatus({ isGenerating: false, progress: 0, message: 'Error generating MIDI' });
    }
  }, [config, mode, neuroConfig]);

  const activeBpm = mode === 'ambient' ? config.bpm : neuroConfig.bpm;
  const activeRoot = mode === 'ambient' ? config.scaleRoot : neuroConfig.scaleRoot;
  const activeScale = mode === 'ambient' ? config.scaleType : neuroConfig.scaleType;
  const routing = mode === 'ambient'
    ? [
        ['Ch. 1', 'Evolving pads'],
        ['Ch. 2', 'Sub bass'],
        ['Ch. 3', 'Echo plucks'],
        ['Ch. 4', 'Reese bass'],
        ['Ch. 10', 'Break kit'],
        ['Tempo', `${config.bpm} BPM`],
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
    : `neurofunk_${activeBpm}bpm_${activeRoot}${activeScale}_${neuroConfig.style}.mid`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center space-x-4">
          <div className={`p-3 text-slate-950 rounded-lg shadow-lg ${mode === 'ambient' ? 'bg-cyan-500 shadow-cyan-500/20' : 'bg-amber-400 shadow-amber-500/20'}`}>
            <MusicNoteIcon />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-50">Atmosphere</h1>
            <p className="text-slate-400 text-sm">Ambient and neurofunk MIDI composer</p>
          </div>
        </header>

        <Visualizer isGenerating={status.isGenerating} />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-6">
          <div className="bg-slate-900/70 p-5 rounded-lg border border-slate-800 backdrop-blur-sm">
            <h2 className={`text-xl font-semibold mb-5 ${mode === 'ambient' ? 'text-cyan-200' : 'text-amber-200'}`}>Session</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Engine</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'ambient' as AppMode, label: 'Ambient DnB' },
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
                          ? mode === 'ambient'
                            ? 'border-cyan-300 bg-cyan-400 text-slate-950'
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
                    <span className={`font-semibold ${mode === 'ambient' ? 'text-cyan-200' : 'text-amber-200'}`}>{channel}</span>
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
                    : 'bg-amber-400 hover:bg-amber-300 hover:scale-[1.02] text-slate-950 shadow-amber-500/20'}
              `}
            >
              {status.isGenerating ? (
                <span>Generating... {status.progress}%</span>
              ) : (
                <span>{mode === 'ambient' ? 'Generate Ambient Composition' : 'Generate Neurofunk Composition'}</span>
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
