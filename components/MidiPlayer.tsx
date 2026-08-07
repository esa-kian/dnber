import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { INSTRUMENTS, InstrumentGroup, InstrumentId, MidiAudioEngine, TrackSettings, suggestInstrument } from '../services/audioEngine';
import { ParsedMidi, parseMidi } from '../utils/midiParser';
import { estimateWavBytes, pcmFromBuffer, wavFromParts } from '../utils/wav';

type MidiPlayerProps = {
  midiBytes: Uint8Array | null;
  fileName: string;
  accent: string; // tailwind accent-* class for range inputs
  text: string; // tailwind text-* class
  solid: string; // tailwind bg-* class
  button: string;
  shadow: string;
};

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
);

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
);

const WaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h3l2-7 3 14 3-11 2.5 8 2-4H22"/>
  </svg>
);

const LoopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
);

const SpeakerIcon = ({ muted }: { muted: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    {muted
      ? <><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
      : <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>}
  </svg>
);

const INSTRUMENT_GROUPS: InstrumentGroup[] = [
  'Drums',
  'Bass',
  'Acid',
  'Techno',
  'Industrial',
  'Dubstep',
  'Stab',
  'Lead',
  'Pluck',
  'Keys',
  'Pad',
  'Drone',
  'Perc',
  'FX'
];

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, '0')}`;
}

export const MidiPlayer: React.FC<MidiPlayerProps> = ({ midiBytes, fileName, accent, text, solid, button, shadow }) => {
  const engineRef = useRef<MidiAudioEngine | null>(null);
  const [song, setSong] = useState<ParsedMidi | null>(null);
  const [settings, setSettings] = useState<TrackSettings[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [loopBars, setLoopBars] = useState(8);
  const [loop, setLoop] = useState<{ start: number; end: number } | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const seekTimer = useRef<number | null>(null);

  if (engineRef.current === null) {
    engineRef.current = new MidiAudioEngine();
  }
  const engine = engineRef.current;

  useEffect(() => () => engine.dispose(), [engine]);

  // The loop region is re-armed after a recompose when it still fits
  const loopRef = useRef<{ start: number; end: number } | null>(null);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  // Instrument/volume/mute choices survive a recompose, keyed by track name
  const mixRef = useRef(new Map<string, TrackSettings>());
  useEffect(() => {
    settings.forEach((setting, index) => {
      const track = song?.tracks[index];
      if (track) mixRef.current.set(`${track.name}#${index}`, setting);
    });
  }, [settings, song]);

  // Swap in a freshly composed file without interrupting playback
  useEffect(() => {
    setError(null);

    if (!midiBytes) {
      engine.stop();
      setIsPlaying(false);
      setPosition(0);
      setSong(null);
      setSettings([]);
      return;
    }

    try {
      const parsed = parseMidi(midiBytes);
      const nextSettings: TrackSettings[] = parsed.tracks.map((track, index) => {
        const kept = mixRef.current.get(`${track.name}#${index}`);
        return kept
          ? { ...kept }
          : {
              instrument: suggestInstrument(track.name, track.isDrum),
              volume: track.isDrum ? 0.85 : 0.75,
              muted: false
            };
      });

      const wasPlaying = engine.isPlaying;
      const resumeAt = engine.position;
      engine.load(parsed, nextSettings, resumeAt);
      if (loopRef.current && loopRef.current.end <= parsed.duration) {
        engine.setLoop(loopRef.current.start, loopRef.current.end);
      } else if (loopRef.current) {
        setLoop(null);
      }
      engine.setMasterVolume(masterVolume);
      setSong(parsed);
      setSettings(nextSettings);
      setPosition(engine.position);
      if (wasPlaying) void engine.play();
    } catch (e) {
      console.error(e);
      setSong(null);
      setSettings([]);
      setError('Could not read the generated MIDI file.');
    }
    // masterVolume is applied on change by its own handler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiBytes, engine]);

  // Follow the playhead while the engine is running
  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    const update = () => {
      if (!scrubbing) setPosition(engine.position);
      if (!engine.isPlaying) setIsPlaying(false);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [engine, isPlaying, scrubbing]);

  useEffect(() => {
    engine.onEnded = () => {
      setIsPlaying(false);
      setPosition(0);
    };
    return () => {
      engine.onEnded = null;
    };
  }, [engine]);

  const togglePlay = useCallback(async () => {
    if (!song) return;
    if (engine.isPlaying) {
      engine.pause();
      setIsPlaying(false);
      setPosition(engine.position);
    } else {
      await engine.play();
      setIsPlaying(true);
    }
  }, [engine, song]);

  // Dragging fires a stream of changes; commit the seek once the slider settles
  const handleSeekInput = useCallback((value: number) => {
    setScrubbing(true);
    setPosition(value);
    if (seekTimer.current !== null) window.clearTimeout(seekTimer.current);
    seekTimer.current = window.setTimeout(() => {
      seekTimer.current = null;
      engine.seek(value);
      setScrubbing(false);
    }, 140);
  }, [engine]);

  useEffect(() => () => {
    if (seekTimer.current !== null) window.clearTimeout(seekTimer.current);
  }, []);

  const duration = song?.duration ?? 0;
  const barSeconds = song ? (60 / (song.bpm || 120)) * 4 : 2;

  // Loop from the bar the playhead is in, so it locks to the grid
  const toggleLoop = useCallback(() => {
    if (loop) {
      engine.clearLoop();
      setLoop(null);
      return;
    }
    const startBar = Math.floor(engine.position / barSeconds);
    const start = startBar * barSeconds;
    const end = Math.min(duration, start + loopBars * barSeconds);
    engine.setLoop(start, end);
    setLoop(engine.loopRegion);
  }, [barSeconds, duration, engine, loop, loopBars]);

  const changeLoopBars = useCallback((bars: number) => {
    setLoopBars(bars);
    if (!loop) return;
    const end = Math.min(duration, loop.start + bars * barSeconds);
    engine.setLoop(loop.start, end);
    setLoop(engine.loopRegion);
  }, [barSeconds, duration, engine, loop]);

  const handleStop = useCallback(() => {
    engine.stop();
    setIsPlaying(false);
    setPosition(0);
  }, [engine]);

  const exportRange = loop ?? { start: 0, end: duration };
  const exportSeconds = Math.max(0, exportRange.end - exportRange.start);
  const exportMb = estimateWavBytes(exportSeconds + 3) / (1024 * 1024);

  const exportWav = useCallback(async () => {
    if (!song || rendering) return;
    setRendering(true);
    setRenderProgress(0);
    setError(null);
    try {
      const parts: Int16Array[] = [];
      await engine.renderRange(exportRange.start, exportRange.end, (buffer, progress) => {
        parts.push(pcmFromBuffer(buffer));
        setRenderProgress(progress);
      });
      const url = URL.createObjectURL(wavFromParts(parts, 2, 44100));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace(/\.mid$/, '') + (loop ? '_loop' : '') + '.wav';
      link.click();
      // Give the browser a moment to start the download before releasing the blob
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error(e);
      setError('Could not render the audio file.');
    } finally {
      setRendering(false);
    }
  }, [engine, exportRange.end, exportRange.start, fileName, loop, rendering, song]);

  const updateTrack = useCallback((index: number, patch: Partial<TrackSettings>) => {
    setSettings(current => current.map((setting, i) => (i === index ? { ...setting, ...patch } : setting)));
    if (patch.instrument !== undefined) engine.setTrackInstrument(index, patch.instrument);
    if (patch.volume !== undefined) engine.setTrackVolume(index, patch.volume);
    if (patch.muted !== undefined) engine.setTrackMuted(index, patch.muted);
  }, [engine]);

  const groupedInstruments = useMemo(
    () => INSTRUMENT_GROUPS.map(group => ({ group, items: INSTRUMENTS.filter(item => item.group === group) })),
    []
  );

  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-200">Live Player</h3>
        <span className={`text-sm font-semibold ${text}`}>
          {song ? `${song.tracks.length} tracks · ${song.bpm} BPM` : 'Composing...'}
        </span>
      </div>

      {error && <div className="rounded-md border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div>}

      {song && (
        <>
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold transition-all ${button} ${shadow}`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              onClick={handleStop}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition-all hover:border-slate-500 hover:text-slate-100"
              aria-label="Stop"
            >
              <StopIcon />
            </button>

            <div className="min-w-0 flex-1">
              <div className="relative">
                {loop && duration > 0 && (
                  <div
                    className={`pointer-events-none absolute top-0 h-2 rounded-lg ${solid} opacity-30`}
                    style={{
                      left: `${(loop.start / duration) * 100}%`,
                      width: `${((loop.end - loop.start) / duration) * 100}%`
                    }}
                  />
                )}
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration, 0.1)}
                  step={0.05}
                  value={Math.min(position, duration)}
                  onChange={e => handleSeekInput(parseFloat(e.target.value))}
                  className={`relative h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 ${accent}`}
                  aria-label="Playback position"
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>{formatTime(position)} · bar {Math.floor(position / barSeconds) + 1}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={toggleLoop}
              className={`flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors ${
                loop ? `${solid} border-transparent text-slate-950` : 'border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <LoopIcon />
              {loop ? `Looping bars ${Math.round(loop.start / barSeconds) + 1}-${Math.round(loop.end / barSeconds)}` : 'Loop from here'}
            </button>
            {[4, 8, 16, 32].map(bars => (
              <button
                key={bars}
                onClick={() => changeLoopBars(bars)}
                className={`min-h-9 min-w-11 rounded-md border px-2 text-xs font-semibold transition-colors ${
                  loopBars === bars
                    ? `border-slate-500 ${text} bg-slate-950/70`
                    : 'border-slate-800 text-slate-500 hover:border-slate-600'
                }`}
              >
                {bars}
              </button>
            ))}
            <span className="text-xs text-slate-500">bars</span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-slate-500">Master</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={masterVolume}
              onChange={e => {
                const value = parseFloat(e.target.value);
                setMasterVolume(value);
                engine.setMasterVolume(value);
              }}
              className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 ${accent}`}
            />
            <span className="w-10 shrink-0 text-right text-xs text-slate-400">{Math.round(masterVolume * 100)}</span>
          </div>

          <div className="mt-5 space-y-2">
            {song.tracks.map((track, index) => {
              const setting = settings[index];
              if (!setting) return null;
              return (
                <div key={`${track.name}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-100">{track.name}</div>
                      <div className="text-xs text-slate-500">
                        Ch. {track.channel + 1} · {track.notes.length} notes
                      </div>
                    </div>
                    <button
                      onClick={() => updateTrack(index, { muted: !setting.muted })}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        setting.muted
                          ? 'border-slate-700 text-slate-600'
                          : `border-slate-700 ${text} hover:border-slate-500`
                      }`}
                      aria-label={setting.muted ? `Unmute ${track.name}` : `Mute ${track.name}`}
                    >
                      <SpeakerIcon muted={setting.muted} />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={setting.instrument}
                      onChange={e => updateTrack(index, { instrument: e.target.value as InstrumentId })}
                      className="min-h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-500 sm:w-44"
                    >
                      {groupedInstruments.map(({ group, items }) => (
                        <optgroup key={group} label={group}>
                          {items.map(item => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={setting.volume}
                      onChange={e => updateTrack(index, { volume: parseFloat(e.target.value) })}
                      className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 ${accent}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={exportWav}
            disabled={rendering || exportSeconds <= 0}
            className={`mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg font-semibold transition-all ${
              rendering ? 'cursor-wait bg-slate-800 text-slate-400' : `${button} ${shadow}`
            }`}
          >
            <WaveIcon />
            <span>
              {rendering
                ? `Rendering audio... ${Math.round(renderProgress * 100)}%`
                : `Export WAV${loop ? ' (loop)' : ''} · ${formatTime(exportSeconds)} · ~${exportMb.toFixed(0)} MB`}
            </span>
          </button>

          {!loop && exportSeconds > 120 && (
            <p className="mt-2 text-xs text-slate-500">
              Rendering runs at roughly the length of the music. Arm a loop first for a quick bounce.
            </p>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Every control recomposes the track live and keeps playing. Playback uses built-in synth voices; the
            downloaded <span className={solid.replace('bg-', 'text-')}>.mid</span> file keeps the original General MIDI
            program assignments for your DAW.
          </p>
        </>
      )}
    </div>
  );
};
