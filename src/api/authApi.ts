import axios from 'axios';
import type { LoginRequest, LoginResponse } from '../types/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export const loginApi = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await axios.post<LoginResponse>(`${API_BASE}/auth/login`, data);
  return response.data;
};