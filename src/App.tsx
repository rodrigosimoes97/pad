import { useMemo, useState } from 'react';
import { padEngine, type PadPresetName, type PadStructure } from './audio/padEngine';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const estruturas: Array<{ value: PadStructure; label: string }> = [
  { value: 'root', label: '1' },
  { value: 'root-fifth', label: '1 + 5' },
  { value: 'root-fifth-octave', label: '1 + 5 + 8' },
];

export default function App() {
  const [note, setNote] = useState<string>('C');
  const [octave, setOctave] = useState<number>(3);
  const [structure, setStructure] = useState<PadStructure>('root');
  const [preset, setPreset] = useState<PadPresetName>('warm');
  const [volume, setVolume] = useState<number>(0.7);
  const [reverb, setReverb] = useState<number>(0.35);
  const [brightness, setBrightness] = useState<number>(1);
  const [playing, setPlaying] = useState<boolean>(false);
  const [audioHintVisible, setAudioHintVisible] = useState(true);

  const statusText = useMemo(() => (playing ? 'Tocando' : 'Parado'), [playing]);

  const handleNoteTouch = async (nextNote: string) => {
    await padEngine.ensureStartedFromGesture();
    setAudioHintVisible(false);

    const isPlaying = await padEngine.toggleOrSwitchPad(nextNote);
    setPlaying(isPlaying);

    if (isPlaying) {
      setNote(nextNote);
    }
  };

  const handlePresetChange = async (nextPreset: PadPresetName) => {
    setPreset(nextPreset);
    await padEngine.updateSettings({ preset: nextPreset });
  };

  const handleOctaveChange = async (nextOctave: number) => {
    setOctave(nextOctave);
    await padEngine.updateSettings({ octave: nextOctave });
  };

  const handleStructureChange = async (nextStructure: PadStructure) => {
    setStructure(nextStructure);
    await padEngine.updateSettings({ structure: nextStructure });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-3 pb-5 pt-3 sm:pt-4">
        <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-3 shadow-2xl">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Church Pad Player</p>
              <h1 className="text-4xl font-black leading-none">{note}</h1>
              <p className="mt-1 text-sm text-zinc-300">Tom atual</p>
            </div>

            <div className="text-right">
              <p
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                  playing ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {statusText}
              </p>
              <p className="mt-2 text-xs text-zinc-400">Preset</p>
              <p className="text-sm font-semibold text-zinc-200">{preset === 'warm' ? 'Warm Pad' : preset === 'soft' ? 'Soft Pad' : preset === 'bright' ? 'Bright Pad' : preset === 'shimmer' ? 'Shimmer Pad' : 'Deep Pad'}</p>
            </div>
          </div>

          {audioHintVisible && (
            <p className="rounded-xl border border-violet-300/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
              Toque em um tom para ativar o áudio.
            </p>
          )}
        </section>

        <section className="grid grid-cols-4 gap-2">
          {NOTES.map((n) => {
            const active = note === n && playing;
            return (
              <button
                key={n}
                onClick={() => void handleNoteTouch(n)}
                className={`h-16 rounded-2xl border text-lg font-black shadow-lg transition active:scale-[0.98] ${
                  active
                    ? 'border-cyan-200 bg-cyan-300 text-black shadow-[0_0_28px_rgba(34,211,238,0.42)]'
                    : 'border-white/10 bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                {n}
              </button>
            );
          })}
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-3 shadow-2xl">
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Oitava</p>
              <div className="grid grid-cols-4 gap-2">
                {[2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => void handleOctaveChange(value)}
                    className={`rounded-xl px-2 py-2 text-sm font-semibold transition ${
                      octave === value
                        ? 'bg-violet-500 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Estrutura</p>
              <div className="grid grid-cols-3 gap-2">
                {estruturas.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => void handleStructureChange(item.value)}
                    className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
                      structure === item.value
                        ? 'bg-violet-500 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-sm text-zinc-300">
              Timbre
              <select
                className="mt-1 w-full rounded-xl bg-zinc-800 p-2.5"
                value={preset}
                onChange={(e) => void handlePresetChange(e.target.value as PadPresetName)}
              >
                <option value="soft">Soft Pad</option>
                <option value="warm">Warm Pad</option>
                <option value="bright">Bright Pad</option>
                <option value="shimmer">Shimmer Pad</option>
                <option value="deep">Deep Pad</option>
              </select>
            </label>

            <label className="block text-sm text-zinc-300">
              Volume
              <input
                className="mt-1 w-full"
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
                className="mt-1 w-full"
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
              Brilho
              <input
                className="mt-1 w-full"
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
        </section>
      </div>
    </div>
  );
}
