import { create } from 'zustand';
import type { User } from '@shared/types';
import * as authApi from '../api/auth';
import { removeToken } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await authApi.login({ username, password });
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '登录失败',
        loading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await authApi.logout();
    } finally {
      removeToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  },

  getCurrentUser: async () => {
    set({ loading: true, error: null });
    try {
      const user = await authApi.getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      removeToken();
      set({
        user: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : '获取用户信息失败',
        loading: false,
      });
      throw error;
    }
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    set({ loading: true, error: null });
    try {
      await authApi.changePassword({ oldPassword, newPassword });
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '修改密码失败',
        loading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },
}));
