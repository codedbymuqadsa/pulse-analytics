import type { Result } from "@/types/analytics";
import { preferencesStore } from "@/lib/stores";
import { clearSession, startSession } from "@/lib/session";

/**
 * Front-end-only accounts.
 *
 * Accounts are stored in this browser's localStorage with a salted PBKDF2 password hash. This gives a
 * complete sign-up / sign-in experience without a backend, but it is NOT server-side security: anyone with
 * access to the browser profile can read or delete the stored accounts. Swap this module for a real
 * auth provider when a backend is available; the rest of the UI only depends on the functions below.
 */
export interface Account {
  id: string;
  name: string;
  email: string;
  workspace: string;
  salt: string;
  hash: string;
  createdAt: string;
}

export type PublicAccount = Omit<Account, "salt" | "hash">;

const ACCOUNTS_KEY = "pulse.accounts.v1";
const CURRENT_KEY = "pulse.current-user.v1";
const ITERATIONS = 120_000;

const normEmail = (e: string) => e.trim().toLowerCase();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const toHex = (buf: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(buf as ArrayBuffer), (b) => b.toString(16).padStart(2, "0")).join("");

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: ITERATIONS }, key, 256);
    return toHex(bits);
  }
  // Insecure-context fallback (Web Crypto is unavailable over plain http on non-localhost origins).
  let h = 2166136261;
  for (const c of salt + password) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return `fallback-${h.toString(16)}`;
}

const accounts = () => read<Account[]>(ACCOUNTS_KEY, []);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const strip = ({ salt: _s, hash: _h, ...rest }: Account): PublicAccount => rest;

export function getCurrentAccount(): PublicAccount | null {
  const email = read<string | null>(CURRENT_KEY, null);
  if (!email) return null;
  const found = accounts().find((a) => a.email === email);
  return found ? strip(found) : null;
}

function applyProfile(a: PublicAccount) {
  preferencesStore.set((p) => ({
    ...p,
    workspaceName: a.workspace,
    profile: { ...p.profile, displayName: a.name, email: a.email },
  }));
}

function begin(a: Account, remember: boolean) {
  write(CURRENT_KEY, a.email);
  startSession(remember);
  applyProfile(strip(a));
}

export interface SignUpInput { name: string; email: string; password: string; workspace?: string }

export async function signUp(input: SignUpInput, remember = true): Promise<Result<PublicAccount>> {
  const email = normEmail(input.email);
  const list = accounts();
  if (list.some((a) => a.email === email)) return { ok: false, error: "An account with this email already exists." };
  const salt = randomSalt();
  const name = input.name.trim();
  const account: Account = {
    id: `usr_${Date.now().toString(36)}${salt.slice(0, 4)}`,
    name,
    email,
    workspace: input.workspace?.trim() || `${name.split(/\s+/)[0]}'s Workspace`,
    salt,
    hash: await hashPassword(input.password, salt),
    createdAt: new Date().toISOString(),
  };
  if (!write(ACCOUNTS_KEY, [...list, account])) {
    return { ok: false, error: "Your browser blocked saving the account. Check that storage is enabled and try again." };
  }
  // A new account starts with a clean preferences profile.
  preferencesStore.reset();
  begin(account, remember);
  return { ok: true, data: strip(account) };
}

export async function signIn(emailInput: string, password: string, remember = true): Promise<Result<PublicAccount>> {
  const email = normEmail(emailInput);
  const account = accounts().find((a) => a.email === email);
  const invalid = { ok: false as const, error: "Incorrect email or password." };
  if (!account) {
    await hashPassword(password, "00000000"); // keep timing similar whether or not the email exists
    return invalid;
  }
  const hash = await hashPassword(password, account.salt);
  if (hash !== account.hash) return invalid;
  begin(account, remember);
  return { ok: true, data: strip(account) };
}

export function signOut() {
  try { window.localStorage.removeItem(CURRENT_KEY); } catch { /* ignore */ }
  clearSession();
}

/** Keep the stored account in step with profile edits made in Settings. */
export function updateCurrentAccount(patch: { name?: string; email?: string; workspace?: string }): Result<PublicAccount> {
  const current = read<string | null>(CURRENT_KEY, null);
  const list = accounts();
  const idx = list.findIndex((a) => a.email === current);
  if (idx < 0) return { ok: false, error: "No signed-in account." };
  const nextEmail = patch.email ? normEmail(patch.email) : list[idx].email;
  if (nextEmail !== list[idx].email && list.some((a) => a.email === nextEmail)) return { ok: false, error: "Another account already uses this email." };
  const next: Account = { ...list[idx], name: patch.name?.trim() || list[idx].name, email: nextEmail, workspace: patch.workspace?.trim() || list[idx].workspace };
  list[idx] = next;
  if (!write(ACCOUNTS_KEY, list)) return { ok: false, error: "Could not save to this browser." };
  write(CURRENT_KEY, next.email);
  return { ok: true, data: strip(next) };
}
