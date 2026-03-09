type SliderProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

export const Slider = ({ id, label, value, min, max, step = 0.01, onChange }: SliderProps) => (
  <div className="space-y-2">
    <label htmlFor={id} className="flex items-center justify-between text-sm text-slate-200">
      <span>{label}</span>
      <span className="font-semibold text-mint">{Math.round(value * 100)}%</span>
    </label>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-violet-500"
    />
  </div>
);
