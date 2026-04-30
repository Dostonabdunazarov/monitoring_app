import client from './client';
import type { UserDto, TenantDto, CreateUserRequest, UpdateUserRequest } from '../types';

export const usersApi = {
  getAll: () =>
    client.get<UserDto[]>('/api/users'),

  getById: (id: string) =>
    client.get<UserDto>(`/api/users/${id}`),

  create: (data: CreateUserRequest) =>
    client.post<UserDto>('/api/users', data),

  update: (id: string, data: UpdateUserRequest) =>
    client.put<UserDto>(`/api/users/${id}`, data),

  deactivate: (id: string) =>
    client.patch(`/api/users/${id}/deactivate`),
};

export const tenantsApi = {
  getAll: () =>
    client.get<TenantDto[]>('/api/tenants'),

  getById: (id: string) =>
    client.get<TenantDto>(`/api/tenants/${id}`),

  create: (data: Partial<TenantDto>) =>
    client.post<TenantDto>('/api/tenants', data),

  update: (id: string, data: Partial<TenantDto>) =>
    client.put<TenantDto>(`/api/tenants/${id}`, data),
};
