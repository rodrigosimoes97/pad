import { useState } from 'react';
import { padEngine, type PadPresetName, type PadStructure } from './audio/padEngine';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export default function App() {
  const [note, setNote] = useState<string>('C');
  const [octave, setOctave] = useState<number>(3);
  const [structure, setStructure] = useState<PadStructure>('root');
  const [preset, setPreset] = useState<PadPresetName>('warm');
  const [volume, setVolume] = useState<number>(0.7);
  const [reverb, setReverb] = useState<number>(0.35);
  const [brightness, setBrightness] = useState<number>(1);
  const [playing, setPlaying] = useState<boolean>(false);

  const startPad = async () => {
    await padEngine.startOrUpdate(note, octave, structure, preset);
    padEngine.setVolume(volume);
    padEngine.setReverbAmount(reverb);
    padEngine.setBrightness(brightness);
    setPlaying(true);
  };

  const selectPad = async (nextNote: string) => {
    setNote(nextNote);

    if (padEngine.isPlaying) {
      await padEngine.startOrUpdate(nextNote, octave, structure, preset);
      padEngine.setVolume(volume);
      padEngine.setReverbAmount(reverb);
      padEngine.setBrightness(brightness);
      setPlaying(true);
    }
  };

  const stopPad = () => {
    padEngine.stop();
    setPlaying(false);
  };

  const panic = () => {
    padEngine.panic();
    setPlaying(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col p-4">
        <div className="mb-4 rounded-3xl border border-white/10 bg-zinc-900/90 p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Church Pad Player</p>
              <h1 className="text-3xl font-black">{note}</h1>
              <p className="text-sm text-zinc-400">
                {playing ? `Playing • ${preset}` : 'Stopped'}
              </p>
            </div>

            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                playing ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {playing ? 'PLAYING' : 'STOPPED'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {NOTES.map((n) => {
            const active = note === n;
            return (
              <button
                key={n}
                onClick={() => void selectPad(n)}
                className={`h-24 rounded-3xl border text-2xl font-black shadow-lg transition active:scale-[0.98] ${
                  active
                    ? 'border-cyan-300 bg-cyan-400 text-black'
                    : 'border-white/10 bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-3xl border border-white/10 bg-zinc-900/90 p-4 shadow-2xl">
          <div className="grid grid-cols-2 gap-3">
            <select
              className="rounded-2xl bg-zinc-800 p-3"
              value={octave}
              onChange={(e) => setOctave(Number(e.target.value))}
            >
              <option value={2}>Octave 2</option>
              <option value={3}>Octave 3</option>
              <option value={4}>Octave 4</option>
              <option value={5}>Octave 5</option>
            </select>

            <select
              className="rounded-2xl bg-zinc-800 p-3"
              value={structure}
              onChange={(e) => setStructure(e.target.value as PadStructure)}
            >
              <option value="root">Root</option>
              <option value="root-fifth">1 + 5</option>
              <option value="root-fifth-octave">1 + 5 + 8</option>
            </select>

            <select
              className="col-span-2 rounded-2xl bg-zinc-800 p-3"
              value={preset}
              onChange={(e) => setPreset(e.target.value as PadPresetName)}
            >
              <option value="soft">Soft Pad</option>
              <option value="warm">Warm Pad</option>
              <option value="bright">Bright Pad</option>
              <option value="shimmer">Shimmer Pad</option>
              <option value="deep">Deep Pad</option>
            </select>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block text-sm text-zinc-300">
              Volume
              <input
                className="mt-2 w-full"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  padEngine.setVolume(v);
                }}
              />
            </label>

            <label className="block text-sm text-zinc-300">
              Reverb
              <input
                className="mt-2 w-full"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={reverb}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setReverb(v);
                  padEngine.setReverbAmount(v);
                }}
              />
            </label>

            <label className="block text-sm text-zinc-300">
              Brightness
              <input
                className="mt-2 w-full"
                type="range"
                min="0.5"
                max="2"
                step="0.01"
                value={brightness}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBrightness(v);
                  padEngine.setBrightness(v);
                }}
              />
            </label>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <button
              onClick={() => void startPad()}
              className="rounded-2xl bg-emerald-500 p-3 font-bold text-black"
            >
              Start
            </button>
            <button
              onClick={stopPad}
              className="rounded-2xl bg-red-500 p-3 font-bold text-white"
            >
              Stop
            </button>
            <button
              onClick={panic}
              className="rounded-2xl bg-amber-400 p-3 font-bold text-black"
            >
              Panic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
