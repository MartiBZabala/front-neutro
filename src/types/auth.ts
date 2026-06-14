export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  rol: 'CAJERO' | 'ADMIN';
  nombre: string;
}

export interface AuthUser {
  token: string;
  rol: 'CAJERO' | 'ADMIN';
  nombre: string;
}