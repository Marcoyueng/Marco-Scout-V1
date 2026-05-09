'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { VEX_CATEGORIES, VEX_PARTS } from '@/lib/vexParts';

type Quantities = Record<string, number>;

const G_TO_LBS = 0.00220462;
const G_TO_KG = 0.001;

function decodeQuantities(b64: string | null): Quantities {
  if (!b64) return {};
  try {
    const json = atob(b64);
    const obj = JSON.parse(json);
    if (obj && typeof obj === 'object') return obj as Quantities;
  } catch {}
  return {};
}

function WeightCalculator() {
  const searchParams = useSearchParams();
  const initial = useMemo(() => decodeQuantities(searchParams.get('parts')), [searchParams]);

  const [quantities, setQuantities] = useState<Quantities>(initial);
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const totals = useMemo(() => {
    let count = 0;
    let grams = 0;
    for (const part of VEX_PARTS) {
      const q = quantities[part.name] || 0;
      count += q;
      grams += q * part.weight;
    }
    return { count, grams };
  }, [quantities]);

  const factor = unit === 'lbs' ? G_TO_LBS : G_TO_KG;
  const display = totals.grams * factor;

  const setQty = (name: string, val: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      const v = Math.max(0, val);
      if (v === 0) delete next[name];
      else next[name] = v;
      return next;
    });
  };

  const adjust = (name: string, delta: number) => {
    setQty(name, (quantities[name] || 0) + delta);
  };

  const reset = () => setQuantities({});

  const share = async () => {
    try {
      const b64 = btoa(JSON.stringify(quantities));
      const url = `${window.location.origin}/weight?parts=${b64}`;
      await navigator.clipboard.writeText(url);
      setToast('Share link copied!');
    } catch {
      setToast('Failed to copy link');
    }
    setTimeout(() => setToast(null), 1500);
  };

  useEffect(() => {
    if (Object.keys(initial).length > 0) setQuantities(initial);
  }, [initial]);

  const filteredParts = useMemo(() => {
    if (!filter.trim()) return VEX_PARTS;
    const q = filter.toLowerCase();
    return VEX_PARTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [filter]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-10 lg:grid-cols-[420px_1fr]">
        {/* Parts list */}
        <aside className="lg:order-1">
          <div className="sticky top-6 rounded-xl border border-white/10 bg-zinc-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Parts List</h2>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="rounded-md border border-white/10 px-3 py-1 text-xs text-zinc-400 hover:bg-white/5"
                >
                  Reset
                </button>
                <button
                  onClick={share}
                  className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-zinc-200"
                >
                  Share
                </button>
              </div>
            </div>

            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter parts…"
              className="mb-4 w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
            />

            <div className="max-h-[65vh] space-y-3 overflow-auto pr-1">
              {VEX_CATEGORIES.map((cat) => {
                const partsInCat = filteredParts.filter((p) => p.category === cat);
                if (partsInCat.length === 0) return null;
                return (
                  <div key={cat} className="rounded-lg border border-white/10 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-zinc-300">{cat}</h3>
                    <div className="space-y-1">
                      {partsInCat.map((part) => {
                        const q = quantities[part.name] || 0;
                        return (
                          <div
                            key={part.name}
                            className="flex items-center justify-between gap-2 text-xs text-zinc-400 hover:text-white"
                          >
                            <span className="flex-1 truncate">{part.name}</span>
                            <span className="w-12 text-right font-mono text-zinc-500">
                              {part.weight}g
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => adjust(part.name, -1)}
                                className="h-6 w-6 rounded border border-white/10 text-white hover:bg-white/10"
                                aria-label={`Remove one ${part.name}`}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={q}
                                onChange={(e) =>
                                  setQty(part.name, parseInt(e.target.value) || 0)
                                }
                                onFocus={(e) => e.currentTarget.select()}
                                className="h-6 w-10 rounded border border-white/10 bg-black text-center font-mono text-white focus:border-white/40 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <button
                                onClick={() => adjust(part.name, 1)}
                                className="h-6 w-6 rounded border border-white/10 text-white hover:bg-white/10"
                                aria-label={`Add one ${part.name}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Display */}
        <section className="flex flex-col items-center justify-center">
          <header className="mb-12 text-center">
            <h1 className="text-7xl font-black tracking-tighter">heavy?</h1>
            <p className="mt-2 italic text-zinc-500">a robot weight calculator</p>
          </header>

          <div className="text-center">
            <div className="font-mono text-8xl font-bold tracking-tighter sm:text-9xl">
              {display.toPrecision(3)}
              <button
                onClick={() => setUnit(unit === 'lbs' ? 'kg' : 'lbs')}
                className="ml-3 italic text-zinc-500 hover:text-white"
                aria-label="Toggle unit"
              >
                {unit}
              </button>
            </div>
            <div className="mt-4 italic text-zinc-500">
              {totals.count} part{totals.count !== 1 ? 's' : ''} added
            </div>
            <div className="mt-2 font-mono text-xs text-zinc-700">
              {totals.grams.toFixed(1)} g
            </div>
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-950 px-5 py-2 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function WeightPage() {
  return (
    <Suspense fallback={<div className="bg-black p-10 text-white">Loading…</div>}>
      <WeightCalculator />
    </Suspense>
  );
}
