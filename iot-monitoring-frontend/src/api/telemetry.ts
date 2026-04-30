import client from './client';
import type { TelemetryDto, TelemetryQueryParams } from '../types';

export const telemetryApi = {
  getByDevice: (deviceId: string, params?: TelemetryQueryParams) =>
    client.get<TelemetryDto[]>(`/api/devices/${deviceId}/telemetry`, { params }),
};
