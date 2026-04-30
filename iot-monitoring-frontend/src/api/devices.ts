import client from './client';
import type { DeviceDto, CreateDeviceRequest, UpdateDeviceRequest, DeviceTokenDto } from '../types';

export const devicesApi = {
  getAll: () =>
    client.get<DeviceDto[]>('/api/devices'),

  create: (data: CreateDeviceRequest) =>
    client.post<DeviceDto>('/api/devices', data),

  update: (id: string, data: UpdateDeviceRequest) =>
    client.put<DeviceDto>(`/api/devices/${id}`, data),

  delete: (id: string) =>
    client.delete(`/api/devices/${id}`),

  issueToken: (id: string) =>
    client.post<DeviceTokenDto>(`/api/devices/${id}/tokens`),
};
