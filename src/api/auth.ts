import type { User, ApiResponse } from '@shared/types';
import { post, setToken, removeToken } from './client';
import { mockUsers, delay } from '../utils/mock';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  try {
    return await post<LoginResponse>('/auth/login', data);
  } catch {
    const user = mockUsers.find(u => u.username === data.username);
    if (user) {
      const token = `mock_token_${Date.now()}`;
      setToken(token);
      return delay({ token, user });
    }
    throw new Error('用户名或密码错误');
  }
};

export const logout = async (): Promise<void> => {
  try {
    await post<void>('/auth/logout');
  } finally {
    removeToken();
  }
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    return await post<User>('/auth/me');
  } catch {
    return delay(mockUsers[0]);
  }
};

export const changePassword = async (data: { oldPassword: string; newPassword: string }): Promise<void> => {
  try {
    await post<void>('/auth/change-password', data);
  } catch {
    return delay(undefined);
  }
};
