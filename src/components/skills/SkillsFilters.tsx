'use client';

import { Search, X } from 'lucide-react';
import { KNOWN_SEASONS, SeasonInfo } from '@/utilities/season-parser';

export interface FilterState {
  seasonId: number;
  search: string;
  grade: string;
  country: string;
  region: string;
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface SkillsFiltersProps {
  state: FilterState;
  onChange: (next: FilterState) => void;
  facets: {
    grades: FacetCount[];
    countries: FacetCount[];
    regions: FacetCount[];
  } | null;
  totalRows: number;
}

export function SkillsFilters({
  state,
  onChange,
  facets,
  totalRows,
}: SkillsFiltersProps) {
  function patch(p: Partial<FilterState>) {
    onChange({ ...state, ...p });
  }

  const hasFilter =
    state.search || state.grade || state.country || state.region;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950 p-3">
      {/* Top row — season + free-text search */}
      <div className="flex flex-wrap items-center gap-2">
        <SeasonSelect
          value={state.seasonId}
          onChange={(id) => patch({ seasonId: id })}
        />

        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={state.search}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="Search team #, name, organization, region…"
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-9 text-sm text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
          />
          {state.search && (
            <button
              onClick={() => patch({ search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Facet selectors */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <FacetSelect
          label="Grade"
          value={state.grade}
          options={facets?.grades || []}
          onChange={(v) => patch({ grade: v })}
        />
        <FacetSelect
          label="Country"
          value={state.country}
          options={facets?.countries || []}
          onChange={(v) => patch({ country: v })}
        />
        <FacetSelect
          label="Region / state"
          value={state.region}
          options={facets?.regions || []}
          onChange={(v) => patch({ region: v })}
        />

        <div className="ml-auto flex items-center gap-3 text-[11px] text-zinc-500">
          <span>{totalRows.toLocaleString()} ranked teams</span>
          {hasFilter && (
            <button
              onClick={() =>
                onChange({
                  ...state,
                  search: '',
                  grade: '',
                  country: '',
                  region: '',
                })
              }
              className="rounded-md border border-white/10 px-2 py-1 text-zinc-300 hover:bg-white/5"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SeasonSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5">
      <span className="text-[10px] uppercase tracking-widest text-zinc-500">
        Season
      </span>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="bg-transparent text-sm text-white focus:outline-none"
      >
        {KNOWN_SEASONS.map((s: SeasonInfo) => (
          <option key={s.id} value={s.id} className="bg-zinc-900 text-white">
            {s.short} ({s.programCode})
          </option>
        ))}
      </select>
    </label>
  );
}

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FacetCount[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5">
      <span className="text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm text-white focus:outline-none"
      >
        <option value="" className="bg-zinc-900 text-white">
          All
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-zinc-900 text-white">
            {o.value} ({o.count})
          </option>
        ))}
      </select>
    </label>
  );
}
