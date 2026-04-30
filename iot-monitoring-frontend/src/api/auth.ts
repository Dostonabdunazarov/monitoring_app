import client from './client';
import type { LoginRequest, LoginResponse, UserDto } from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<LoginResponse>('/api/auth/login', data),

  me: () =>
    client.get<UserDto>('/api/auth/me'),
};
