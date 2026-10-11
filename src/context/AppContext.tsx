'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '@/types/auth';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  availableUsers: User[];
  setAvailableUsers: (users: User[]) => void;
  isLoading: boolean;
  isReady: boolean;
  refreshUsers: () => Promise<void>;
  login: (user: User) => void;
  logout: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const currentUserRef = useRef<User | null>(null);

  const applyUser = (user: User | null) => {
    currentUserRef.current = user;
    setCurrentUserState(user);
  };

  // Khởi tạo nhanh từ localStorage ngay khi mount ở client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUserJson = localStorage.getItem('active_user');
        if (savedUserJson) {
          const parsedUser = JSON.parse(savedUserJson);
          if (parsedUser && parsedUser.id && parsedUser.role) {
            applyUser(parsedUser);
          } else {
            applyUser(null);
          }
        } else {
          applyUser(null);
        }
      } catch (err) {
        console.error('Lỗi khi đọc user từ localStorage:', err);
        applyUser(null);
      } finally {
        setIsReady(true);
        setIsLoading(false);
      }
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        const users: User[] = data.users || [];
        setAvailableUsers(users);

        if (!currentUserRef.current && typeof window !== 'undefined') {
          const savedUserId = localStorage.getItem('active_user_id');
          const savedUserJson = localStorage.getItem('active_user');
          let targetUser: User | undefined;

          if (savedUserJson) {
            try {
              const parsed = JSON.parse(savedUserJson);
              if (parsed?.id) {
                targetUser = users.find(u => u.id === parsed.id);
              }
            } catch (e) {
              // ignore
            }
          }

          if (!targetUser && savedUserId) {
            targetUser = users.find(u => u.id === savedUserId);
          }

          if (targetUser) {
            applyUser(targetUser);
            localStorage.setItem('active_user_id', targetUser.id);
            localStorage.setItem('active_user', JSON.stringify(targetUser));
          }
          // Tuyệt đối không fallback users[0] hay tự ý gán Admin
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const login = (user: User) => {
    applyUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_user_id', user.id);
      localStorage.setItem('active_user', JSON.stringify(user));
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('active_user_id');
      localStorage.removeItem('active_user');
      localStorage.removeItem('auth_token');
      applyUser(null);
      window.location.href = '/login';
    }
  };

  const handleSetCurrentUser = (user: User | null) => {
    applyUser(user);
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('active_user_id', user.id);
        localStorage.setItem('active_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('active_user_id');
        localStorage.removeItem('active_user');
        localStorage.removeItem('auth_token');
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetCurrentUser,
        availableUsers,
        setAvailableUsers,
        isLoading,
        isReady,
        refreshUsers: fetchUsers,
        login,
        logout,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
