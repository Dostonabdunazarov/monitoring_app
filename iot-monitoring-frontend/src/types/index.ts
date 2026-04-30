export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer';
  tenantId: string;
  tenantName?: string;
  isActive: boolean;
}

export interface TenantDto {
  id: string;
  name: string;
  createdAt: string;
}

export interface DeviceDto {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  tenantId: string;
}

export interface TelemetryDto {
  id: string;
  deviceId: string;
  timestamp: string;
  metric: string;
  value: number;
  unit?: string;
}

export interface TelemetryQueryParams {
  deviceId?: string;
  metric?: string;
  from?: string;
  to?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt?: string;
  user: UserDto;
}

export interface CreateDeviceRequest {
  name: string;
  type: string;
  tenantId: string;
}

export type UpdateDeviceRequest = Partial<CreateDeviceRequest>;

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: UserDto['role'];
  tenantId: string;
}

export type UpdateUserRequest = Partial<Omit<CreateUserRequest, 'password'>>;
