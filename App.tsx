import React, { useState, useCallback } from 'react';
import { GeneratorConfig, GenerationStatus } from './types';
import { generateAmbientDnB } from './services/generator';
import { Visualizer } from './components/Visualizer';

// Icons
const MusicNoteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

export default function App() {
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
      // Small delay to allow UI to update before heavy calculation
      await new Promise(resolve => setTimeout(resolve, 100));
      const midiBytes = await generateAmbientDnB(config, setStatus);

      // Create Blob
      const blob = new Blob([midiBytes], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus({ isGenerating: false, progress: 100, message: 'Ready to download' });
    } catch (e) {
      console.error(e);
      setStatus({ isGenerating: false, progress: 0, message: 'Error generating MIDI' });
    }
  }, [config]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center space-x-4">
            <div className="p-3 bg-cyan-500 text-slate-950 rounded-lg shadow-lg shadow-cyan-500/20">
                <MusicNoteIcon />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-50">
                    Atmosphere
                </h1>
                <p className="text-slate-400 text-sm">Ambient DnB MIDI composer</p>
            </div>
        </header>

        {/* Visualizer */}
        <Visualizer isGenerating={status.isGenerating} />

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-6">
            
            {/* Left Column: Settings */}
            <div className="bg-slate-900/70 p-5 rounded-lg border border-slate-800 backdrop-blur-sm">
                <h2 className="text-xl font-semibold mb-5 text-cyan-200">Session</h2>
                
                <div className="space-y-5">
                    {/* Mood */}
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

                    {/* BPM */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Tempo (BPM): <span className="text-white">{config.bpm}</span>
                        </label>
                        <input 
                            type="range" min="160" max="180" 
                            value={config.bpm}
                            onChange={(e) => setConfig({...config, bpm: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />
                    </div>

                    {/* Length */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Length (Minutes): <span className="text-white">{config.lengthMinutes}</span>
                        </label>
                        <input 
                            type="range" min="1" max="60" 
                            value={config.lengthMinutes}
                            onChange={(e) => setConfig({...config, lengthMinutes: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />
                    </div>

                    {/* Scale */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-400 mb-2">Key</label>
                             <select 
                                value={config.scaleRoot}
                                onChange={(e) => setConfig({...config, scaleRoot: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                             >
                                {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
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

                    {/* Realism Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Breaks: <span className="text-white">{Math.round(config.breakDensity * 100)}%</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={config.breakDensity}
                                onChange={(e) => setConfig({...config, breakDensity: parseFloat(e.target.value)})}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Harmony: <span className="text-white">{Math.round(config.complexity * 100)}%</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={config.complexity}
                                onChange={(e) => setConfig({...config, complexity: parseFloat(e.target.value)})}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Air: <span className="text-white">{Math.round(config.atmosphere * 100)}%</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={config.atmosphere}
                                onChange={(e) => setConfig({...config, atmosphere: parseFloat(e.target.value)})}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Action & Info */}
            <div className="flex flex-col space-y-6">
                
                {/* Info Card */}
                <div className="bg-slate-900/70 p-5 rounded-lg border border-slate-800 flex-grow">
                    <h3 className="text-lg font-medium text-slate-200 mb-3">MIDI Routing</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                            ['Ch. 1', 'Evolving pads'],
                            ['Ch. 2', 'Sub bass'],
                            ['Ch. 3', 'Echo plucks'],
                            ['Ch. 4', 'Reese bass'],
                            ['Ch. 10', 'Break kit'],
                            ['Tempo', `${config.bpm} BPM`],
                        ].map(([channel, label]) => (
                            <div key={`${channel}-${label}`} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                                <span className="font-semibold text-cyan-200">{channel}</span>
                                <span className="text-slate-400 text-right">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={status.isGenerating}
                    className={`
                        w-full py-4 rounded-lg font-bold text-lg shadow-lg transition-all transform
                        flex items-center justify-center space-x-2
                        ${status.isGenerating 
                            ? 'bg-slate-700 cursor-wait text-slate-400' 
                            : 'bg-cyan-400 hover:bg-cyan-300 hover:scale-[1.02] text-slate-950 shadow-cyan-500/20'}
                    `}
                >
                   {status.isGenerating ? (
                       <span>Generating... {status.progress}%</span>
                   ) : (
                       <span>Generate Composition</span>
                   )}
                </button>

                {/* Download Area */}
                {downloadUrl && !status.isGenerating && (
                    <a 
                        href={downloadUrl}
                        download={`atmosphere_dnb_${config.bpm}bpm_${config.scaleRoot}${config.scaleType}.mid`}
                        className="block w-full"
                    >
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
