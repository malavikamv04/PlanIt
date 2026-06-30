import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type ApiUser } from "./api";

export type { ApiUser as Profile };

/** Hide raw backend errors from the UI */
export const sanitizeError = (msg: string): string => {
  const hide = ["permission denied", "has_role", "rls", "jwt", "relation ", "function ", "schema", "pg_", "pgrst", "duplicate key", "violates"];
  if (hide.some((p) => msg.toLowerCase().includes(p))) return "Something went wrong. Please try again later.";
  return msg;
};

type AuthContextValue = {
  user: ApiUser | null;
  isAdmin: boolean;
  isHost: boolean;
  loading: boolean;
  signIn: (email: string, password: string, expectedRole?: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, role?: string) => Promise<{ error: string | null }>;
  adminSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const token = localStorage.getItem("planit_token");
    if (!token) { setLoading(false); return; }
    try {
      const data = await api.get<{ user: ApiUser }>("/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem("planit_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const saveSession = (token: string, u: ApiUser) => {
    localStorage.setItem("planit_token", token);
    setUser(u);
  };

  const value: AuthContextValue = {
    user,
    isAdmin: user?.role === "admin",
    isHost: user?.role === "host" || user?.role === "admin",
    loading,

    signIn: async (email, password, expectedRole) => {
      try {
        const data = await api.post<{ token: string; user: ApiUser }>("/auth/login", { email, password, expectedRole });
        saveSession(data.token, data.user);
        return { error: null };
      } catch (e: any) { return { error: e.message }; }
    },

    signUp: async (email, password, name, role = "user") => {
      try {
        const data = await api.post<{ token: string; user: ApiUser }>("/auth/register", { email, password, name, role });
        saveSession(data.token, data.user);
        return { error: null };
      } catch (e: any) { return { error: e.message }; }
    },

    adminSignIn: async (email, password) => {
      try {
        const data = await api.post<{ token: string; user: ApiUser }>("/auth/admin/login", { email, password });
        saveSession(data.token, data.user);
        return { error: null };
      } catch (e: any) { return { error: e.message }; }
    },

    signOut: () => {
      localStorage.removeItem("planit_token");
      setUser(null);
    },

    refreshUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
