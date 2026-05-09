'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

type FavRow = { team_number: string; created_at: string };

type NoteRow = { team_number: string; note: string; updated_at: string };

export default function FavoritesPage() {
  const { user, apiFetch, loading: authLoading } = useAuth();
  const [favs, setFavs] = useState<FavRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      apiFetch('/api/favorites').then((r) => r.json()),
      apiFetch('/api/notes').then((r) => r.json()),
    ])
      .then(([fav, note]) => {
        setFavs(fav.favorites || []);
        setNotes(note.notes || []);
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, apiFetch]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Heart className="mx-auto h-10 w-10 text-zinc-700" />
        <h1 className="mt-3 text-2xl font-bold text-white">Sign in to use favorites</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Save teams across devices and pair them with private notes.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight text-white">My favorites</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Quick links to your saved teams and any private notes you’ve written.
      </p>

      {/* Favorites grid */}
      <section className="mt-8">
        <h2 className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
          Saved teams ({favs.length})
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : favs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-zinc-950/40 p-6 text-center text-sm text-zinc-500">
            No favorites yet. Tap the heart on any team page to add it.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {favs.map((f) => (
              <Link
                key={f.team_number}
                href={`/search?q=${encodeURIComponent(f.team_number)}`}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/60 p-3 hover:border-white/30 hover:bg-white/5"
              >
                <div>
                  <div className="font-mono text-lg font-bold text-white">
                    {f.team_number}
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-widest text-zinc-500">
                    Saved {new Date(f.created_at).toLocaleDateString()}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-zinc-600 group-hover:text-white" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Notes list */}
      <section className="mt-10">
        <h2 className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
          Notes ({notes.length})
        </h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-zinc-950/40 p-6 text-center text-sm text-zinc-500">
            No notes yet. Open a team and start typing in the notes box.
          </div>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li
                key={n.team_number}
                className="rounded-xl border border-white/10 bg-zinc-950/60 p-4"
              >
                <div className="flex items-baseline justify-between">
                  <Link
                    href={`/search?q=${encodeURIComponent(n.team_number)}`}
                    className="font-mono text-base font-bold text-white hover:text-zinc-300"
                  >
                    {n.team_number}
                  </Link>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(n.updated_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{n.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
