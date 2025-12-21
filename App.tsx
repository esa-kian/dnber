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
    complexity: 0.7
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
      setTimeout(async () => {
        const midiBytes = await generateAmbientDnB(config, setStatus);
        
        // Create Blob
        const blob = new Blob([midiBytes], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setStatus({ isGenerating: false, progress: 100, message: 'Ready to download' });
      }, 100);
    } catch (e) {
      console.error(e);
      setStatus({ isGenerating: false, progress: 0, message: 'Error generating MIDI' });
    }
  }, [config]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 font-sans selection:bg-pink-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center space-x-4 mb-8">
            <div className="p-3 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/30">
                <MusicNoteIcon />
            </div>
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-400">
                    Atmosphere
                </h1>
                <p className="text-slate-400 text-sm">Ambient DnB Algorithmic Composer</p>
            </div>
        </header>

        {/* Visualizer */}
        <Visualizer isGenerating={status.isGenerating} />

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: Settings */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
                <h2 className="text-xl font-semibold mb-6 text-indigo-300">Configuration</h2>
                
                <div className="space-y-6">
                    {/* BPM */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Tempo (BPM): <span className="text-white">{config.bpm}</span>
                        </label>
                        <input 
                            type="range" min="160" max="180" 
                            value={config.bpm}
                            onChange={(e) => setConfig({...config, bpm: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
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
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">Warning: 60 mins might take a few seconds to process.</p>
                    </div>

                    {/* Scale */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-400 mb-2">Key</label>
                             <select 
                                value={config.scaleRoot}
                                onChange={(e) => setConfig({...config, scaleRoot: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
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
                                onChange={(e) => setConfig({...config, scaleType: e.target.value as any})}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                             >
                                <option value="dorian">Dorian (Classic DnB)</option>
                                <option value="minor">Natural Minor</option>
                                <option value="phrygian">Phrygian (Dark)</option>
                                <option value="major">Major (Liquid)</option>
                             </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Action & Info */}
            <div className="flex flex-col space-y-6">
                
                {/* Info Card */}
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex-grow">
                    <h3 className="text-lg font-medium text-slate-200 mb-2">How to use</h3>
                    <ul className="list-disc list-inside text-slate-400 space-y-2 text-sm">
                        <li>Set your desired tempo and length.</li>
                        <li>Click "Generate Composition".</li>
                        <li>Import the <code className="bg-slate-900 px-1 rounded text-indigo-300">.mid</code> file into GarageBand / Logic / Ableton.</li>
                        <li>Assign patches:
                            <ul className="pl-6 mt-1 list-circle text-xs space-y-1">
                                <li>Channel 1: Sub Bass / Reese</li>
                                <li>Channel 2: Atmospheric Pads</li>
                                <li>Channel 3: Plucks / Arps</li>
                                <li>Channel 10: Drum Kit</li>
                            </ul>
                        </li>
                    </ul>
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={status.isGenerating}
                    className={`
                        w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform
                        flex items-center justify-center space-x-2
                        ${status.isGenerating 
                            ? 'bg-slate-700 cursor-wait text-slate-400' 
                            : 'bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 hover:scale-[1.02] text-white shadow-indigo-500/25'}
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
                        <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all">
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
