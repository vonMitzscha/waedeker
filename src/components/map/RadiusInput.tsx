'use client';

import { useState, useEffect } from 'react';

export interface RadiusInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;     // 1 for integers (radius), 0.1 for floats (buffer)
  label?: string;    // default 'km'
  onLiveChange?: (v: number) => void;
  onCommit: (v: number) => void;
}

export default function RadiusInput({
  value,
  min = 1,
  max = 500,
  step = 1,
  label = 'km',
  onLiveChange,
  onCommit,
}: RadiusInputProps) {
  const decimals = step < 1 ? (String(step).split('.')[1]?.length ?? 1) : 0;
  const fmt = (n: number) => parseFloat(n.toFixed(decimals)).toString();

  const [raw, setRaw] = useState(fmt(value));

  // Sync when external value changes
  useEffect(() => { setRaw(fmt(value)); }, [value]); // eslint-disable-line

  const parse = (s: string) => (decimals > 0 ? parseFloat(s) : parseInt(s, 10));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRaw(val);
    const n = parse(val);
    if (!isNaN(n) && n >= min && n <= max) onLiveChange?.(n);
  };

  const handleCommit = (v: string) => {
    const n = parse(v);
    if (!isNaN(n)) {
      const clamped = Math.max(min, Math.min(max, n));
      const rounded = parseFloat(clamped.toFixed(decimals));
      setRaw(fmt(rounded));
      onCommit(rounded);
    } else {
      setRaw(fmt(value));
    }
  };

  const stepFn = (delta: number) => {
    const next = parseFloat(Math.max(min, Math.min(max, value + delta * step)).toFixed(decimals));
    setRaw(fmt(next));
    onCommit(next);
  };

  const btnClass =
    'w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg bg-[#EDE0CE] border border-[#c4a882] text-[#700700] text-lg font-medium hover:bg-[#d8cdb8] active:scale-95 transition-all select-none touch-manipulation';

  return (
    <div className="flex items-center gap-1.5">
      <button className={btnClass} onClick={() => stepFn(-1)} aria-label="Verringern">−</button>
      <input
        type="number"
        value={raw}
        min={min}
        max={max}
        step={step}
        onChange={handleChange}
        onBlur={(e) => handleCommit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleCommit(raw)}
        className="w-16 md:w-20 h-8 md:h-9 text-center rounded-lg border border-[#c4a882] bg-[#F9F3EA] text-[#700700] font-semibold text-sm md:text-base outline-none focus:border-[#700700] transition-colors"
      />
      <button className={btnClass} onClick={() => stepFn(1)} aria-label="Vergrößern">+</button>
      <span className="text-sm text-[#700700]/60 font-medium">{label}</span>
    </div>
  );
}
