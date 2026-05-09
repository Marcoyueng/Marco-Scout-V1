'use client';

import { V5RC_SEASONS } from '@/lib/constants';

export function SeasonSelect({
  value,
  onChange,
  className = '',
}: {
  value: number;
  onChange: (seasonId: number) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className={`rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none ${className}`}
    >
      {V5RC_SEASONS.map((s) => (
        <option key={s.id} value={s.id}>
          {s.short}
        </option>
      ))}
    </select>
  );
}
