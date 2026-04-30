import client from './client';
import type { DeviceDto, CreateDeviceRequest, UpdateDeviceRequest } from '../types';

export const devicesApi = {
  getAll: (params?: { status?: string; tenantId?: string }) =>
    client.get<DeviceDto[]>('/api/devices', { params }),

  getById: (id: string) =>
    client.get<DeviceDto>(`/api/devices/${id}`),

  create: (data: CreateDeviceRequest) =>
    client.post<DeviceDto>('/api/devices', data),

  update: (id: string, data: UpdateDeviceRequest) =>
    client.put<DeviceDto>(`/api/devices/${id}`, data),

  delete: (id: string) =>
    client.delete(`/api/devices/${id}`),
};
