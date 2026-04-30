import { create } from 'zustand';
import type { UserDto } from '../types';

interface AuthState {
  accessToken: string | null;
  user: UserDto | null;
  setAccessToken: (token: string) => void;
  login: (token: string, user: UserDto) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,

  setAccessToken: (token) => set({ accessToken: token }),

  login: (token, user) => set({ accessToken: token, user }),

  logout: () => set({ accessToken: null, user: null }),
}));
