'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, UserRole } from '../api/types-v2';
import { backendClient, setStoredToken } from '../api/backend-client';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: UserRole;
  }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  getDestinationForRole: (role: UserRole) => string;
  getRedirectForRole: (role: UserRole) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'bakeconnect_token_v1';
const USER_KEY = 'bakeconnect_user_v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getDestinationForRole = useCallback((role: UserRole): string => {
    const staffPrefix = process.env.NEXT_PUBLIC_STAFF_PREFIX || 'staff-mgmt-9a4c1f7b';
    switch (role) {
      case 'BAKERY_ADMIN':
        return `/${staffPrefix}/admin`;
      case 'BAKERY_MANAGER':
        return `/${staffPrefix}/bakery-manager`;
      case 'RETAILER':
        return '/retailer';
      case 'DIRECT_CUSTOMER':
      default:
        return '/shop';
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await backendClient.getMe();
      setUser(me);
      localStorage.setItem(USER_KEY, JSON.stringify(me));
    } catch {
      // If token expired, clear session
      setUser(null);
      setToken(null);
      setStoredToken(null);
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken) {
        setToken(storedToken);
        setStoredToken(storedToken);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        // Background refresh to confirm validity
        backendClient
          .getMe()
          .then((me) => {
            setUser(me);
            localStorage.setItem(USER_KEY, JSON.stringify(me));
          })
          .catch(() => {
            // Expired token fallback
            setUser(null);
            setToken(null);
            setStoredToken(null);
            localStorage.removeItem(USER_KEY);
          });
      }
    } catch {
      // Ignore localStorage parse error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await backendClient.login({ email, password });
      setStoredToken(res.token);
      setToken(res.token);
      const userObj: User = {
        id: res.id || (res as any).userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
        isActive: true,
        isEmailVerified: true,
      };
      setUser(userObj);
      localStorage.setItem(USER_KEY, JSON.stringify(userObj));
      return userObj;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: UserRole;
  }): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await backendClient.register(data);
      setStoredToken(res.token);
      setToken(res.token);
      const userObj: User = {
        id: res.id || (res as any).userId,
        email: res.email,
        fullName: res.fullName,
        phone: data.phone,
        role: res.role,
        isActive: true,
        isEmailVerified: false,
      };
      setUser(userObj);
      localStorage.setItem(USER_KEY, JSON.stringify(userObj));
      return userObj;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (user?.id) {
      localStorage.removeItem(`bakeconnect_cart_${user.id}`);
    }
    localStorage.removeItem('bakeconnect_cart_guest');
    localStorage.removeItem('bakeconnect_cart_v2');
    setUser(null);
    setToken(null);
    setStoredToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('bakeconnect_logout'));
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        getDestinationForRole,
        getRedirectForRole: getDestinationForRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
