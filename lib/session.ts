/**
 * Session marker used by the route gate in `middleware.ts`.
 * The cookie only records that someone signed in on this browser; the account data itself lives in
 * `localStorage` (see `lib/auth.ts`). Replace with server-validated sessions when a backend exists.
 */
export const SESSION_COOKIE = "pulse-session";

export function startSession(remember: boolean) {
  const maxAge = remember ? `; max-age=${60 * 60 * 24 * 30}` : "";
  document.cookie = `${SESSION_COOKIE}=1; path=/; samesite=lax${maxAge}`;
}

export function clearSession() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
