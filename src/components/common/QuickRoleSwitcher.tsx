'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Role, User } from '@/types/auth';
import { ShieldCheck, GraduationCap, UserCheck, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';

/** Chỉ dùng khi phát triển: đổi nhanh tài khoản để kiểm thử 3 cổng. */
export const QuickRoleSwitcher: React.FC = () => {
  const { currentUser, setCurrentUser, availableUsers } = useApp();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Role>(currentUser?.role || 'ADMIN');

  if (!currentUser) return null;

  const list = availableUsers.filter((u) => u.role === tab);

  const roleIcon: Record<Role, React.ReactNode> = {
    ADMIN: <ShieldCheck size={13} />,
    TEACHER: <UserCheck size={13} />,
    STUDENT: <GraduationCap size={13} />,
  };

  const pick = (user: User) => {
    setCurrentUser(user);
    setIsOpen(false);
    const path =
      user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard';
    router.push(path);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-9 px-3 rounded-pill bg-foreground text-white text-[12px] font-semibold hover:opacity-90 transition cursor-pointer"
      >
        {roleIcon[currentUser.role]}
        <span className="hidden sm:inline max-w-[110px] truncate">{currentUser.name}</span>
        <ChevronDown size={14} className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}

      {isOpen && (
        <div className="fixed sm:absolute right-3 left-3 sm:left-auto sm:right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-card rounded-card shadow-pop border border-line z-50 overflow-hidden animate-in-up">
          <div className="p-2.5 border-b border-line">
            <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-pill">
              {(['ADMIN', 'TEACHER', 'STUDENT'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setTab(r)}
                  className={cn(
                    'h-8 rounded-pill text-[12px] font-semibold transition cursor-pointer',
                    tab === r ? 'bg-card text-primary shadow-soft' : 'text-muted-foreground'
                  )}
                >
                  {r === 'ADMIN' ? 'Quản trị' : r === 'TEACHER' ? 'Giáo viên' : 'Học viên'}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {list.map((u) => (
              <button
                key={u.id}
                onClick={() => pick(u)}
                className={cn(
                  'w-full flex items-center gap-2.5 p-2 rounded-field text-left transition cursor-pointer',
                  currentUser.id === u.id ? 'bg-primary-soft' : 'hover:bg-muted'
                )}
              >
                <Avatar name={u.name} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-foreground truncate">{u.name}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">{u.id}</span>
                </span>
                {currentUser.id === u.id && <Check size={15} className="text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
