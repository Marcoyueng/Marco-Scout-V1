'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Save, Lock, StickyNote } from 'lucide-react';

export function NotesEditor({ team }: { team: string }) {
  const { user, apiFetch } = useAuth();
  const [note, setNote] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !team) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(`/api/notes/${encodeURIComponent(team)}`)
      .then((r) => r.json())
      .then((d) => {
        setNote(d.note || '');
        setSavedAt(d.updated_at || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [team, user, apiFetch]);

  async function save(value: string) {
    setSaving(true);
    try {
      await apiFetch(`/api/notes/${encodeURIComponent(team)}`, {
        method: 'PUT',
        body: JSON.stringify({ note: value }),
      });
      setSavedAt(new Date().toISOString());
    } finally {
      setSaving(false);
    }
  }

  function onChange(v: string) {
    setNote(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(v), 800);
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 text-sm text-zinc-400">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
          <Lock className="h-3 w-3" /> My notes
        </div>
        Sign in to keep private scouting notes per team.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
          <StickyNote className="h-3 w-3" /> My notes for {team}
        </div>
        <div className="text-[10px] text-zinc-500">
          {saving ? (
            <span className="inline-flex items-center gap-1">
              <Save className="h-3 w-3 animate-pulse" /> Saving…
            </span>
          ) : savedAt ? (
            <span>Saved {new Date(savedAt).toLocaleTimeString()}</span>
          ) : (
            ''
          )}
        </div>
      </div>
      <textarea
        value={note}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        placeholder="Strengths, weaknesses, programming style, robot specs, partner notes…"
        className="h-32 w-full resize-y rounded-md border border-white/10 bg-black/40 p-2 text-sm text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
      />
    </div>
  );
}
