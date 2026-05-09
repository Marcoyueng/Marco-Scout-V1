'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

export function FavoriteButton({
  team,
  className,
  size = 'md',
}: {
  team: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const { user, apiFetch } = useAuth();
  const [fav, setFav] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !team) {
      setFav(null);
      return;
    }
    let cancel = false;
    apiFetch(`/api/favorites/${encodeURIComponent(team)}`)
      .then((r) => r.json())
      .then((d) => !cancel && setFav(!!d.is_favorite))
      .catch(() => !cancel && setFav(false));
    return () => {
      cancel = true;
    };
  }, [team, user, apiFetch]);

  if (!user) return null;

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    const prev = fav;
    setFav(!prev);
    try {
      const r = await apiFetch(`/api/favorites/${encodeURIComponent(team)}`, {
        method: 'POST',
      });
      const d = await r.json();
      setFav(!!d.is_favorite);
    } catch {
      setFav(prev);
    } finally {
      setBusy(false);
    }
  };

  const dim = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <button
      onClick={onClick}
      disabled={busy || fav === null}
      title={fav ? 'Remove from favorites' : 'Add to favorites'}
      className={
        'inline-flex items-center justify-center rounded-md border border-white/10 bg-zinc-950/60 p-1.5 transition-colors hover:bg-white/10 disabled:opacity-40 ' +
        (className || '')
      }
    >
      <Heart
        className={
          dim +
          ' ' +
          (fav
            ? 'fill-red-500 stroke-red-500'
            : 'fill-transparent stroke-zinc-300')
        }
      />
    </button>
  );
}
