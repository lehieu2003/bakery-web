/**
 * Auth Provider
 * Centralized authentication state management
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { authToken } from '@/lib/auth-token';
import { authService } from '@/services/auth.service';
import type { User } from '@/types/api.types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore user from token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = authToken.get();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const apiUser = await authService.me();
        setUser(apiUser);
      } catch {
        authToken.remove();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    authToken.remove();
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    setUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
