// Generic paged fetch helpers built on top of the rate-limit-safe
// RobotEventsAPI.raw() escape hatch. Used to walk every page of any v2
// endpoint without overrunning the upstream rate limit.

import { robotevents } from '@/lib/robotevents';

interface V2Meta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface V2Page<T> {
  data: T[];
  meta: V2Meta;
}

export type StopFn<T> = (
  items: T[],
  meta: V2Meta,
  pageIndex: number
) => boolean | Promise<boolean>;

interface PaginateOptions<T> {
  /** v2 path like `seasons/197/events` (no leading slash, no page/per_page). */
  path: string;
  /** Items per page. RE caps at 250. */
  perPage?: number;
  /** Hard cap on pages to read. Useful as a safety net. */
  maxPages?: number;
  /** Optional callback invoked after each page. Return true to stop early. */
  stopWhen?: StopFn<T>;
  /** Optional callback for progress reporting (page index, last meta). */
  onPage?: (pageIndex: number, meta: V2Meta, items: T[]) => void;
}

function joinQuery(path: string, query: Record<string, string | number>) {
  const has = path.includes('?');
  const qs = Object.entries(query)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${path}${has ? '&' : '?'}${qs}`;
}

/**
 * Fetch a single page of a v2 endpoint with full meta intact.
 */
export async function fetchPage<T>(
  path: string,
  page: number,
  perPage = 250
): Promise<V2Page<T>> {
  const url = joinQuery(path, { page, per_page: perPage });
  const raw = await robotevents.raw<{ data: T[]; meta: V2Meta }>(url);
  return {
    data: Array.isArray(raw?.data) ? raw.data : [],
    meta: raw?.meta || {
      current_page: page,
      last_page: page,
      total: raw?.data?.length || 0,
      per_page: perPage,
    },
  };
}

/**
 * Walk every page of a v2 endpoint, optionally stopping early.
 */
export async function paginate<T>(opts: PaginateOptions<T>): Promise<T[]> {
  const perPage = opts.perPage ?? 250;
  const maxPages = opts.maxPages ?? 200;
  const out: T[] = [];

  // First page tells us how many pages exist.
  const first = await fetchPage<T>(opts.path, 1, perPage);
  out.push(...first.data);
  opts.onPage?.(1, first.meta, first.data);
  if (await opts.stopWhen?.(out, first.meta, 1)) return out;

  const last = Math.min(first.meta.last_page || 1, maxPages);
  for (let p = 2; p <= last; p++) {
    const page = await fetchPage<T>(opts.path, p, perPage);
    out.push(...page.data);
    opts.onPage?.(p, page.meta, page.data);
    if (await opts.stopWhen?.(out, page.meta, p)) break;
    if (page.data.length < perPage) break;
  }
  return out;
}
