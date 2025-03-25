'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface User {
  id?: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// For development/demo purposes
const VALID_CREDENTIALS = {
  'sankalp': 'funnelstrike@135',
  'lee': 'funnelstrike@135'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing session on mount
    checkUser();
    
    // Set up listener for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Supabase user logged in
        setUser({
          id: session.user.id,
          username: session.user.email || session.user.id
        });
        setIsLoading(false);
      } else {
        // Fall back to cookie-based auth if Supabase has no session
        checkUser();
      }
    });

    return () => {
      // Clean up subscription
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const checkUser = () => {
    const storedUser = Cookies.get('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        Cookies.remove('user');
        setUser(null);
      }
    }
    setIsLoading(false);
  };

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    
    try {
      // First try to log in with Supabase if credentials appear to be email/password
      if (username.includes('@')) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: username,
          password: password
        });
        
        if (error) throw error;
        
        if (data.user) {
          setUser({
            id: data.user.id,
            username: data.user.email || data.user.id
          });
          router.push('/dashboard');
          return;
        }
      }
      
      // Fall back to demo credentials
      if (VALID_CREDENTIALS[username as keyof typeof VALID_CREDENTIALS] === password) {
        const user = { username };
        setUser(user);
        // Set cookie to expire in 7 days
        Cookies.set('user', JSON.stringify(user), { expires: 7 });
        router.push('/dashboard');
      } else {
        throw new Error('Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear cookie auth
    setUser(null);
    Cookies.remove('user');
    
    setIsLoading(false);
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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