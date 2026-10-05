"use client";

import * as React from "react";
import {
  clearStoredAuth,
  extractJwt,
  extractUser,
  getStoredJwt,
  getStoredUser,
  isJwtExpired,
  persistAuth,
  type UrbalyUser,
} from "@/lib/auth";
import { authWithGoogle, validarJwt } from "@/app/actions/auth";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: UrbalyUser | null;
  jwt: string | null;
  status: AuthStatus;
  error: string | null;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UrbalyUser | null>(null);
  const [jwt, setJwt] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [error, setError] = React.useState<string | null>(null);

  const logout = React.useCallback(() => {
    clearStoredAuth();
    setUser(null);
    setJwt(null);
    setError(null);
    setStatus("anonymous");
  }, []);

  const refresh = React.useCallback(async () => {
    const storedJwt = getStoredJwt();
    if (!storedJwt || isJwtExpired(storedJwt)) {
      logout();
      return;
    }
    setStatus("loading");
    const result = await validarJwt(storedJwt);
    if (!result.ok) {
      logout();
      if (result.status === 401 || result.status === 403) {
        setError("Sessão expirada. Entre novamente.");
      }
      return;
    }
    const validatedUser = extractUser(result.data) ?? getStoredUser();
    setUser(validatedUser);
    setJwt(storedJwt);
    if (validatedUser) {
      try {
        persistAuth(storedJwt, validatedUser);
      } catch {
        // localStorage indisponível: mantém só em memória.
      }
    }
    setStatus("authenticated");
  }, [logout]);

  // Hidrata a sessão salva (localStorage) validando o JWT no backend.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const loginWithGoogle = React.useCallback(async (idToken: string) => {
    setError(null);
    setStatus("loading");
    const result = await authWithGoogle(idToken);
    if (!result.ok) {
      setStatus("anonymous");
      const message =
        typeof result.error === "string" && result.error.trim()
          ? result.error
          : "Não foi possível entrar com o Google.";
      setError(message);
      throw new Error(message);
    }
    const token = extractJwt(result.data);
    if (!token) {
      const message = "O servidor não retornou um token válido.";
      setStatus("anonymous");
      setError(message);
      throw new Error(message);
    }
    // Valida o JWT recém-criado para obter o usuário canônico.
    const validated = await validarJwt(token);
    const validatedUser = validated.ok
      ? (extractUser(validated.data) ?? extractUser(result.data))
      : extractUser(result.data);
    try {
      persistAuth(token, validatedUser);
    } catch {
      // Segue em memória mesmo sem localStorage.
    }
    setJwt(token);
    setUser(validatedUser);
    setStatus("authenticated");
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, jwt, status, error, loginWithGoogle, logout, refresh }),
    [user, jwt, status, error, loginWithGoogle, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return ctx;
}
