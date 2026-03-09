import { useState } from 'react'
import { padEngine, PadStructure, PadPresetName } from './audio/padEngine'

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export default function App() {

  const [note, setNote] = useState('C')
  const [octave, setOctave] = useState(3)
  const [structure, setStructure] = useState<PadStructure>('root')
  const [preset, setPreset] = useState<PadPresetName>('soft')
  const [volume, setVolume] = useState(0.7)
  const [playing, setPlaying] = useState(false)

  const startPad = async () => {

    await padEngine.startOrUpdate(
      note,
      octave,
      structure,
      preset
    )

    padEngine.setVolume(volume)

    setPlaying(true)
  }

  const stopPad = () => {

    padEngine.stop()

    setPlaying(false)
  }

  const panic = () => {

    padEngine.panic()

    setPlaying(false)
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">

      <div className="bg-zinc-900 p-8 rounded-2xl w-[420px] space-y-6 shadow-xl">

        <h1 className="text-2xl font-bold text-center">
          Church Pad Player
        </h1>

        {/* NOTE */}
        <div>
          <label className="text-sm">Key</label>

          <select
            className="w-full mt-1 p-2 bg-zinc-800 rounded"
            value={note}
            onChange={(e)=>setNote(e.target.value)}
          >
            {NOTES.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* OCTAVE */}
        <div>
          <label className="text-sm">Octave</label>

          <select
            className="w-full mt-1 p-2 bg-zinc-800 rounded"
            value={octave}
            onChange={(e)=>setOctave(Number(e.target.value))}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>

        {/* STRUCTURE */}
        <div>
          <label className="text-sm">Pad Structure</label>

          <select
            className="w-full mt-1 p-2 bg-zinc-800 rounded"
            value={structure}
            onChange={(e)=>setStructure(e.target.value as PadStructure)}
          >
            <option value="root">Root</option>
            <option value="root-fifth">1 + 5</option>
            <option value="root-fifth-octave">1 + 5 + 8</option>
          </select>
        </div>

        {/* PRESET */}
        <div>
          <label className="text-sm">Sound</label>

          <select
            className="w-full mt-1 p-2 bg-zinc-800 rounded"
            value={preset}
            onChange={(e)=>setPreset(e.target.value as PadPresetName)}
          >
            <option value="soft">Soft Pad</option>
            <option value="warm">Warm Pad</option>
            <option value="bright">Bright Pad</option>
          </select>
        </div>

        {/* VOLUME */}
        <div>
          <label className="text-sm">Volume</label>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e)=>{
              const v = Number(e.target.value)
              setVolume(v)
              padEngine.setVolume(v)
            }}
            className="w-full"
          />
        </div>

        {/* STATUS */}
        <div className="text-center text-sm text-zinc-400">
          {playing
            ? `Playing: ${note}`
            : 'Pad stopped'}
        </div>

        {/* CONTROLS */}
        <div className="flex gap-3">

          <button
            onClick={startPad}
            className="flex-1 bg-green-600 hover:bg-green-500 rounded p-2"
          >
            Start
          </button>

          <button
            onClick={stopPad}
            className="flex-1 bg-red-600 hover:bg-red-500 rounded p-2"
          >
            Stop
          </button>

          <button
            onClick={panic}
            className="flex-1 bg-yellow-600 hover:bg-yellow-500 rounded p-2"
          >
            Panic
          </button>

        </div>

      </div>

    </div>
  )
}
