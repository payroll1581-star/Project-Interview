import { createContext } from 'react';
import type { AppUser } from '../types';

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUser: AppUser | null;
  login: (email: string, password: string) => Promise<AppUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
