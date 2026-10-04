export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  roles: string[];
  companyName: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  code?: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export type RegisterField = 'firstName' | 'lastName' | 'username' | 'password' | 'confirmPassword';
