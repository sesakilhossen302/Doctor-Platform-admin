'use client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const ACCESS = 'dp_admin_access';
const REFRESH = 'dp_admin_refresh';
const USER = 'dp_admin_user';

export interface SessionUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const session = {
  get access() {
    return read(ACCESS);
  },
  get refresh() {
    return read(REFRESH);
  },
  get user(): SessionUser | null {
    const raw = read(USER);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  },
  save(data: { accessToken: string; refreshToken: string; user: SessionUser }) {
    localStorage.setItem(ACCESS, data.accessToken);
    localStorage.setItem(REFRESH, data.refreshToken);
    localStorage.setItem(USER, JSON.stringify(data.user));
  },
  clear() {
    [ACCESS, REFRESH, USER].forEach((k) => localStorage.removeItem(k));
  },
};

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time, even when many requests get a 401 together. */
async function refreshTokens(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const token = session.refresh;
      if (!token) return false;
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (!res.ok) return false;
      session.save(await res.json());
      return true;
    })().finally(() => setTimeout(() => (refreshing = null), 0));
  }
  return refreshing;
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; query?: Record<string, unknown> } = {}): Promise<T> {
  const qs = init.query
    ? '?' +
      new URLSearchParams(
        Object.entries(init.query)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : '';

  const doFetch = () =>
    fetch(`${API_URL}${path}${qs}`, {
      method: init.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...(session.access && { authorization: `Bearer ${session.access}` }),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

  let res = await doFetch();
  if (res.status === 401 && session.refresh && (await refreshTokens())) res = await doFetch();
  if (res.status === 401) {
    session.clear();
    if (typeof window !== 'undefined' && !location.pathname.startsWith('/login')) location.href = '/login';
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new ApiError(res.status, msg || `Request failed (${res.status})`);
  }
  return data as T;
}
