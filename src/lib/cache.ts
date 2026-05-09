import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), '.cache');

if (typeof window === 'undefined') {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch {}
}

interface Entry<T> {
  expiresAt: number;
  data: T;
}

const memory = new Map<string, Entry<any>>();

function keyToFile(key: string): string {
  const hash = crypto.createHash('sha1').update(key).digest('hex');
  return path.join(CACHE_DIR, `${hash}.json`);
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();

  const mem = memory.get(key);
  if (mem && mem.expiresAt > now) return mem.data as T;

  // try filesystem cache
  try {
    const file = keyToFile(key);
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as Entry<T>;
      if (raw.expiresAt > now) {
        memory.set(key, raw);
        return raw.data;
      }
    }
  } catch {}

  const data = await loader();
  const entry: Entry<T> = { expiresAt: now + ttlSeconds * 1000, data };
  memory.set(key, entry);
  try {
    fs.writeFileSync(keyToFile(key), JSON.stringify(entry));
  } catch {}
  return data;
}

export function invalidate(key: string) {
  memory.delete(key);
  try {
    const file = keyToFile(key);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {}
}

/**
 * Read any cached value (memory or disk) regardless of expiration. Useful
 * for serving stale data when an upstream request fails.
 */
export function getStale<T>(key: string): T | null {
  const mem = memory.get(key);
  if (mem) return mem.data as T;
  try {
    const file = keyToFile(key);
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as Entry<T>;
      memory.set(key, raw);
      return raw.data;
    }
  } catch {}
  return null;
}

/** Write a cache entry directly (used after a successful fetch). */
export function putCache<T>(key: string, ttlSeconds: number, data: T) {
  const entry: Entry<T> = { expiresAt: Date.now() + ttlSeconds * 1000, data };
  memory.set(key, entry);
  try {
    fs.writeFileSync(keyToFile(key), JSON.stringify(entry));
  } catch {}
}
