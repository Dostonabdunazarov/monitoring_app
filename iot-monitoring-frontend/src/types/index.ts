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
  status: 'Active' | 'Inactive' | 'Offline';
  createdAt: string;
}

export interface TelemetryDto {
  deviceId: string;
  messageId: string;
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  payload: unknown;
}

export interface TelemetryQueryParams {
  from?: string;
  to?: string;
  limit?: number;
}

export interface DeviceTokenDto {
  token: string;
  tokenId: string;
  createdAt: string;
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
}

export interface UpdateDeviceRequest {
  name?: string;
  type?: string;
  status?: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: UserDto['role'];
  tenantId: string;
}

export type UpdateUserRequest = Partial<Omit<CreateUserRequest, 'password'>>;
