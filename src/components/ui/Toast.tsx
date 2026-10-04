'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  text: string;
}

interface ToastApi {
  show: (text: string, tone?: ToastTone) => void;
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const config: Record<ToastTone, { icon: React.ReactNode; cls: string }> = {
  success: { icon: <CheckCircle2 size={18} />, cls: 'text-success' },
  error: { icon: <AlertCircle size={18} />, cls: 'text-danger' },
  info: { icon: <Info size={18} />, cls: 'text-info' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (text: string, tone: ToastTone = 'info') => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, tone, text }]);
      setTimeout(() => remove(id), 3600);
    },
    [remove]
  );

  const api: ToastApi = {
    show,
    success: (t) => show(t, 'success'),
    error: (t) => show(t, 'error'),
    info: (t) => show(t, 'info'),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-toast bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-auto sm:max-w-sm pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-2.5 bg-card border border-line shadow-pop rounded-field px-4 py-3 animate-in-up"
            role="status"
          >
            <span className={cn('shrink-0 mt-0.5 [&_svg]:block', config[t.tone].cls)}>
              {config[t.tone].icon}
            </span>
            <p className="text-[13px] font-medium text-foreground flex-1 leading-snug">{t.text}</p>
            <button
              onClick={() => remove(t.id)}
              aria-label="Đóng thông báo"
              className="shrink-0 text-subtle-foreground hover:text-foreground transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải dùng trong ToastProvider');
  return ctx;
}
