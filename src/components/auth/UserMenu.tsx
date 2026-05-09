'use client';

import { useEffect, useRef, useState } from 'react';
import { LogIn, LogOut, RefreshCcw, Heart, X, Copy, Check, KeyRound } from 'lucide-react';
import { useAuth } from './AuthProvider';
import Link from 'next/link';

type Mode = 'login' | 'register' | 'uid';

export function UserMenu() {
  const { user, loading, logout, resetUid, syncFromUid } = useAuth();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (loading) {
    return <div className="h-8 w-20 animate-pulse rounded-md bg-white/10" />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setAuthOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white"
        >
          <LogIn className="h-3.5 w-3.5" />
          Sign in
        </button>
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      </>
    );
  }

  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-white/5 px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
          {initial}
        </span>
        <span className="hidden md:inline max-w-[120px] truncate">{user.name || user.email}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-white/10 bg-zinc-950 p-3 shadow-2xl">
          <div className="px-2 py-1.5">
            <div className="text-sm font-semibold text-white">{user.name || 'Unnamed'}</div>
            <div className="truncate text-xs text-zinc-500">{user.email}</div>
          </div>
          <UidRow uid={user.uid} onReset={async () => {
            if (!confirm('Reset your UID? This will invalidate the previous one.')) return;
            try {
              const d = await resetUid();
              alert(`New UID: ${d.uid} — ${d.resets_remaining} reset(s) left today`);
            } catch (e: any) {
              alert(e.message);
            }
          }} />
          <SyncRow onSync={async (uid) => {
            try {
              const d = await syncFromUid(uid);
              alert(`Synced. Total notes: ${d.total_notes}, favorites: ${d.total_favorites}`);
            } catch (e: any) {
              alert(e.message);
            }
          }} />
          <Link
            href="/favorites"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-zinc-200 hover:bg-white/5"
          >
            <Heart className="h-4 w-4" /> My favorites
          </Link>
          <button
            onClick={async () => {
              await logout();
              setOpen(false);
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-zinc-200 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function UidRow({ uid, onReset }: { uid: string; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 rounded-md border border-white/10 bg-black/40 p-2">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">Your UID</div>
      <div className="mt-1 flex items-center gap-1.5">
        <code className="flex-1 truncate font-mono text-sm text-white">{uid}</code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(uid);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
          title="Copy UID"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button onClick={onReset} className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white" title="Reset UID">
          <RefreshCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SyncRow({ onSync }: { onSync: (uid: string) => void }) {
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-2 rounded-md border border-white/10 bg-black/40 p-2">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">Sync from another UID</div>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          value={v}
          onChange={(e) => setV(e.target.value.trim())}
          placeholder="ab12cd34"
          className="flex-1 rounded border border-white/10 bg-zinc-900 px-2 py-1 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
        />
        <button
          disabled={!v || busy}
          onClick={async () => {
            setBusy(true);
            await onSync(v);
            setBusy(false);
            setV('');
          }}
          className="rounded bg-white px-2 py-1 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
        >
          Sync
        </button>
      </div>
    </div>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, loginWithUid, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [uid, setUid] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else if (mode === 'register') await register(email.trim(), password, name.trim());
      else if (mode === 'uid') await loginWithUid(uid.trim());
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Sign in with UID'}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex overflow-hidden rounded-lg border border-white/10 text-xs">
          {(['login', 'register', 'uid'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`flex-1 px-3 py-1.5 ${
                mode === m ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/5'
              }`}
            >
              {m === 'login' ? 'Sign in' : m === 'register' ? 'Register' : 'UID'}
            </button>
          ))}
        </div>

        {mode !== 'uid' ? (
          <div className="space-y-2">
            {mode === 'register' && (
              <Field label="Display name (optional)">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="modal-input"
                  placeholder="Marco"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="modal-input"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="modal-input"
              />
            </Field>
          </div>
        ) : (
          <Field label="UID">
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value.trim())}
              className="modal-input font-mono"
              placeholder="8-character UID"
            />
          </Field>
        )}

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={busy || (mode !== 'uid' ? !email || !password : !uid)}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
        >
          {mode === 'uid' ? <KeyRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          {busy
            ? '…'
            : mode === 'login'
            ? 'Sign in'
            : mode === 'register'
            ? 'Create account'
            : 'Continue'}
        </button>

        <style jsx>{`
          .modal-input {
            width: 100%;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgb(15, 15, 17);
            padding: 8px 10px;
            color: white;
            font-size: 14px;
          }
          .modal-input:focus {
            border-color: rgba(255, 255, 255, 0.4);
            outline: none;
          }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
