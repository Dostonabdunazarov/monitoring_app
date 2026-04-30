import client from './client';
import type { TelemetryDto, TelemetryQueryParams } from '../types';

export const telemetryApi = {
  query: (params: TelemetryQueryParams) =>
    client.get<TelemetryDto[]>('/api/telemetry', { params }),

  getByDevice: (deviceId: string, params?: Omit<TelemetryQueryParams, 'deviceId'>) =>
    client.get<TelemetryDto[]>(`/api/telemetry/${deviceId}`, { params }),
};
