import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "./api";

export type UserRole = "gerencia" | "administracion" | "ventas" | "compras" | "almacen";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: async (email, password) => {
        const form = new FormData();
        form.append("username", email);
        form.append("password", password);
        const { data } = await api.post("/auth/login", form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        set({ user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token });
      },

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, accessToken: null, refreshToken: null });
      },

      isAuthenticated: () => !!get().user,
    }),
    { name: "freelux-auth", partialize: (s) => ({ user: s.user }) }
  )
);
