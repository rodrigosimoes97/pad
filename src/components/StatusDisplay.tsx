type StatusDisplayProps = {
  isPlaying: boolean;
  currentLabel: string;
};

export const StatusDisplay = ({ isPlaying, currentLabel }: StatusDisplayProps) => (
  <div
    className={`rounded-xl border px-4 py-3 text-sm transition ${
      isPlaying ? 'border-mint/60 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-900/70 text-slate-300'
    }`}
  >
    <p className="font-medium">{isPlaying ? `Playing: ${currentLabel}` : 'Pad parado'}</p>
  </div>
);
