type TransportButtonsProps = {
  isPlaying: boolean;
  onStart: () => void;
  onStop: () => void;
  onPanic: () => void;
};

export const TransportButtons = ({ isPlaying, onStart, onStop, onPanic }: TransportButtonsProps) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <button
      type="button"
      onClick={onStart}
      className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
      aria-label="Iniciar pad"
    >
      Start Pad
    </button>
    <button
      type="button"
      onClick={onStop}
      disabled={!isPlaying}
      className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Parar pad"
    >
      Stop Pad
    </button>
    <button
      type="button"
      onClick={onPanic}
      className="rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
      aria-label="Reiniciar áudio"
    >
      Panic / Reset
    </button>
  </div>
);
