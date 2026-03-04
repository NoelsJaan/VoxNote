import apiClient from './client'

export interface User {
  id: number
  email: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', { email, password })
  return response.data
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register', { email, password })
  return response.data
}

export async function getMe(): Promise<User> {
  const response = await apiClient.get<User>('/auth/me')
  return response.data
}
