import { cn } from '../utils/cn';

type PadButtonProps = {
  note: string;
  active: boolean;
  onClick: () => void;
};

const COLORS = [
  'from-fuchsia-600/80 to-violet-700/80',
  'from-purple-600/80 to-indigo-700/80',
  'from-indigo-500/80 to-blue-700/80',
  'from-blue-500/80 to-cyan-700/80',
  'from-cyan-500/80 to-teal-700/80',
  'from-emerald-500/80 to-green-700/80',
  'from-green-500/80 to-lime-700/80',
  'from-amber-500/80 to-orange-700/80',
  'from-orange-500/80 to-rose-700/80',
  'from-rose-500/80 to-pink-700/80',
  'from-pink-500/80 to-fuchsia-700/80',
  'from-violet-600/80 to-purple-700/80'
];

export const PadButton = ({ note, active, onClick }: PadButtonProps) => {
  const index = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(note);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Selecionar tom ${note}`}
      className={cn(
        'relative h-20 rounded-2xl border text-xl font-black tracking-wide text-white transition active:scale-[0.98] sm:h-24',
        `bg-gradient-to-br ${COLORS[Math.max(index, 0)]}`,
        active
          ? 'border-white/80 shadow-[0_0_0_1px_rgba(255,255,255,0.7),0_0_24px_rgba(139,92,246,0.7)]'
          : 'border-white/15 opacity-90 hover:opacity-100'
      )}
    >
      <span className={cn('absolute inset-0 rounded-2xl transition', active && 'animate-pulse bg-white/10')} />
      <span className="relative">{note}</span>
    </button>
  );
};
