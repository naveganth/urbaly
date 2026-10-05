export interface UrbalyUser {
  id: number;
  nome?: string;
  name?: string;
  email?: string;
  foto?: string;
  picture?: string;
  [key: string]: unknown;
}

export const JWT_STORAGE_KEY = "urbaly:jwt";
export const USER_STORAGE_KEY = "urbaly:user";

/** 5 minutos de tolerância no passado, conforme backend. */
const EXP_SKEW_SECONDS = 5 * 60;

export function getDisplayName(user: UrbalyUser | null): string {
  if (!user) return "";
  const raw =
    (typeof user.nome === "string" && user.nome) ||
    (typeof user.name === "string" && user.name) ||
    (typeof user.email === "string" && user.email) ||
    "";
  return raw.trim();
}

export function getAvatarUrl(user: UrbalyUser | null): string | undefined {
  if (!user) return undefined;
  if (typeof user.foto === "string" && user.foto.trim()) return user.foto.trim();
  if (typeof user.picture === "string" && user.picture.trim())
    return user.picture.trim();
  return undefined;
}

export function getInitials(user: UrbalyUser | null): string {
  const name = getDisplayName(user);
  if (!name) return "UR";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function decodePayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getJwtExp(token: string): number | null {
  const payload = decodePayload(token);
  const exp = payload?.exp;
  return typeof exp === "number" ? exp : null;
}

/** true se o JWT já expirou (com tolerância de 5min no passado). */
export function isJwtExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  const exp = getJwtExp(token);
  if (exp === null) return false; // sem claim exp: deixa o backend decidir via /validar
  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp + EXP_SKEW_SECONDS < nowSeconds;
}

export function getStoredJwt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(JWT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): UrbalyUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UrbalyUser;
  } catch {
    return null;
  }
}

export function persistAuth(jwt: string, user: UrbalyUser | null): void {
  window.localStorage.setItem(JWT_STORAGE_KEY, jwt);
  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function clearStoredAuth(): void {
  window.localStorage.removeItem(JWT_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

/** Extrai o JWT de formatos variados que o backend pode retornar. */
export function extractJwt(data: unknown): string | null {
  if (typeof data === "string" && data.split(".").length === 3) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["token", "jwt", "access_token", "accessToken", "id_token"]) {
      const value = obj[key];
      if (typeof value === "string" && value.length > 10) return value;
    }
    if (obj.data) return extractJwt(obj.data);
  }
  return null;
}

/** Extrai o usuário de formatos variados que o backend pode retornar. */
export function extractUser(data: unknown): UrbalyUser | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const candidates: unknown[] = [
    obj.usuario,
    obj.user,
    obj.dados,
    obj.data,
    obj,
  ];
  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === "object" &&
      typeof (candidate as Record<string, unknown>).id !== "undefined"
    ) {
      const c = candidate as Record<string, unknown>;
      const id = Number(c.id);
      if (!Number.isNaN(id)) return { ...(c as object), id } as UrbalyUser;
    }
  }
  return null;
}
