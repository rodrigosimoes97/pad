type SliderControlProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export const SliderControl = ({ label, value, onChange }: SliderControlProps) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-300">
      <span>{label}</span>
      <span>{Math.round(value * 100)}%</span>
    </div>
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-violet-500"
      aria-label={label}
    />
  </div>
);
