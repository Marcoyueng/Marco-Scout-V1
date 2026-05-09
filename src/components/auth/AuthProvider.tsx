'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  uid: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
};

type AuthCtx = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  loginWithUid: (uid: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  registerVerified: (
    email: string,
    password: string,
    code: string,
    name?: string
  ) => Promise<void>;
  sendVerifyCode: (email: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  resetUid: () => Promise<{ uid: string; resets_remaining: number }>;
  syncFromUid: (uid: string) => Promise<{ total_notes: number; total_favorites: number }>;
  /** Authenticated fetch — adds Bearer token if logged in. */
  apiFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
};

const Ctx = createContext<AuthCtx | null>(null);

const TOKEN_KEY = 'marco-scout-token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  const apiFetch = useCallback(
    async (input: RequestInfo, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      const tok =
        state.token ||
        (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
      if (tok) headers.set('authorization', `Bearer ${tok}`);
      if (!headers.has('content-type') && init.body)
        headers.set('content-type', 'application/json');
      return fetch(input, { ...init, headers });
    },
    [state.token]
  );

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setState({ user: null, token: null, loading: false });
      return;
    }
    fetch('/api/auth/me', {
      headers: { authorization: `Bearer ${t}` },
    })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.text())))
      .then((d) => setState({ user: d.user, token: t, loading: false }))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const persist = (token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    setState({ token, user, loading: false });
  };

  async function login(email: string, password: string) {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Login failed');
    persist(d.token, d.user);
  }

  async function loginWithUid(uid: string) {
    const r = await fetch('/api/auth/uid-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'UID login failed');
    persist(d.token, d.user);
  }

  async function register(email: string, password: string, name?: string) {
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Registration failed');
    persist(d.token, d.user);
  }

  async function registerVerified(
    email: string,
    password: string,
    code: string,
    name?: string
  ) {
    const r = await fetch('/api/auth/register-verified', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, name, code }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Verification failed');
    persist(d.token, d.user);
  }

  async function sendVerifyCode(email: string) {
    const r = await fetch('/api/auth/send-verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Could not send verification code');
  }

  async function loginWithGoogle(credential: string) {
    const r = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Google login failed');
    persist(d.token, d.user);
  }

  async function logout() {
    if (state.token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { authorization: `Bearer ${state.token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, loading: false });
  }

  async function resetUid() {
    const r = await apiFetch('/api/auth/reset-uid', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Reset failed');
    if (state.user)
      setState((s) => ({ ...s, user: s.user ? { ...s.user, uid: d.uid } : s.user }));
    return d;
  }

  async function syncFromUid(uid: string) {
    const r = await apiFetch('/api/auth/sync-uid', {
      method: 'POST',
      body: JSON.stringify({ uid }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Sync failed');
    return d;
  }

  return (
    <Ctx.Provider
      value={{
        ...state,
        login,
        loginWithUid,
        register,
        registerVerified,
        sendVerifyCode,
        loginWithGoogle,
        logout,
        resetUid,
        syncFromUid,
        apiFetch,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
