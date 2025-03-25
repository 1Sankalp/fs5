'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VALID_CREDENTIALS = {
  'sankalp': 'funnelstrike@135',
  'lee': 'funnelstrike@135'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(() => {
    // Check if user is stored in cookies on initial load
    const storedUser = Cookies.get('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const login = async (username: string, password: string) => {
    // Check if credentials are valid
    if (VALID_CREDENTIALS[username as keyof typeof VALID_CREDENTIALS] === password) {
      const user = { username };
      setUser(user);
      // Set cookie to expire in 7 days
      Cookies.set('user', JSON.stringify(user), { expires: 7 });
      router.push('/dashboard');
    } else {
      throw new Error('Invalid username or password');
    }
  };

  const logout = () => {
    setUser(null);
    Cookies.remove('user');
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 