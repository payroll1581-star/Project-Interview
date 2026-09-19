import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext } from './authContext';
import { useAppData } from './useAppData';
import { api, getToken, setToken } from '../lib/api';
import type { AppUser } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { refresh, clear } = useAppData();
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(() => getToken() !== null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api
      .get<{ user: AppUser }>('/auth/me')
      .then(async ({ user }) => {
        setCurrentUser(user);
        // A failed data refresh (e.g. the API is temporarily unreachable) shouldn't log
        // out an otherwise-valid session -- AppDataContext surfaces that failure itself.
        await refresh().catch(() => {});
      })
      .catch(() => {
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, [refresh]);

  const value = useMemo(
    () => ({
      isAuthenticated: currentUser !== null,
      isLoading,
      currentUser,
      login: async (email: string, password: string) => {
        const { token, user } = await api.post<{ token: string; user: AppUser }>('/auth/login', {
          email,
          password,
        });
        setToken(token);
        setCurrentUser(user);
        await refresh().catch(() => {});
        return user;
      },
      logout: async () => {
        await api.post('/auth/logout').catch(() => {});
        setToken(null);
        setCurrentUser(null);
        clear();
      },
      changePassword: async (currentPassword: string, newPassword: string) => {
        await api.patch('/users/me/password', { currentPassword, newPassword });
      },
    }),
    [currentUser, isLoading, refresh, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
