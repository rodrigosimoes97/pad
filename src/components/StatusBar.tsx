type StatusBarProps = {
  title: string;
  subtitle: string;
  status: 'PLAYING' | 'STOPPED';
};

export const StatusBar = ({ title, subtitle, status }: StatusBarProps) => (
  <header className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Church Pad Player</p>
        <h1 className="mt-1 text-2xl font-bold leading-none text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          status === 'PLAYING' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-600/40 text-slate-300'
        }`}
      >
        {status}
      </span>
    </div>
  </header>
);
