'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Role, User } from '@/types/auth';
import { ShieldCheck, GraduationCap, UserCheck, ChevronDown, Check } from 'lucide-react';

export const QuickRoleSwitcher: React.FC = () => {
  const { currentUser, setCurrentUser, availableUsers } = useApp();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoleTab, setSelectedRoleTab] = useState<Role>(currentUser?.role || 'ADMIN');

  if (!currentUser) {
    return null;
  }

  const admins = availableUsers.filter(u => u.role === 'ADMIN');
  const teachers = availableUsers.filter(u => u.role === 'TEACHER');
  const students = availableUsers.filter(u => u.role === 'STUDENT');

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setIsOpen(false);
    if (user.role === 'ADMIN') router.push('/admin/dashboard');
    else if (user.role === 'TEACHER') router.push('/teacher/dashboard');
    else if (user.role === 'STUDENT') router.push('/student/dashboard');
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 whitespace-nowrap"><ShieldCheck size={12} /> Quản trị</span>;
      case 'TEACHER':
        return <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 whitespace-nowrap"><UserCheck size={12} /> Giáo viên</span>;
      case 'STUDENT':
        return <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 whitespace-nowrap"><GraduationCap size={12} /> Học viên</span>;
    }
  };

  return (
    <div className="relative inline-block text-left z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm border border-slate-700 text-sm shrink-0"
      >
        <span className="flex items-center gap-1.5 font-medium min-w-0">
          {getRoleBadge(currentUser.role)}
          <span className="hidden sm:inline font-semibold truncate max-w-[120px] md:max-w-none">{currentUser.name}</span>
          <span className="hidden md:inline text-slate-400 text-xs whitespace-nowrap">({currentUser.id})</span>
        </span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
      )}

      {isOpen && (
        <div className="fixed sm:absolute right-3 left-3 sm:left-auto sm:right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chuyển đổi vai trò nhanh (Quick Switcher)</p>
            <div className="grid grid-cols-3 gap-1 bg-slate-200 p-1 rounded-lg">
              <button
                onClick={() => setSelectedRoleTab('ADMIN')}
                className={`py-1 px-1 text-[11px] sm:text-xs whitespace-nowrap font-semibold rounded-md transition ${selectedRoleTab === 'ADMIN' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Quản trị (1)
              </button>
              <button
                onClick={() => setSelectedRoleTab('TEACHER')}
                className={`py-1 px-1 text-[11px] sm:text-xs whitespace-nowrap font-semibold rounded-md transition ${selectedRoleTab === 'TEACHER' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Giáo viên (20)
              </button>
              <button
                onClick={() => setSelectedRoleTab('STUDENT')}
                className={`py-1 px-1 text-[11px] sm:text-xs whitespace-nowrap font-semibold rounded-md transition ${selectedRoleTab === 'STUDENT' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Học viên (400)
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
            {selectedRoleTab === 'ADMIN' && admins.map(u => (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition ${currentUser.id === u.id ? 'bg-purple-50 text-purple-900' : 'hover:bg-slate-50'}`}
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-sm text-slate-800 truncate max-w-[180px] sm:max-w-xs">{u.name}</div>
                  <div className="text-xs text-slate-500 truncate max-w-[180px] sm:max-w-xs">Mã: {u.id} • {u.email}</div>
                </div>
                {currentUser.id === u.id && <Check size={16} className="text-purple-600 shrink-0" />}
              </div>
            ))}

            {selectedRoleTab === 'TEACHER' && teachers.map(u => (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition ${currentUser.id === u.id ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50'}`}
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-sm text-slate-800 truncate max-w-[180px] sm:max-w-xs">{u.name}</div>
                  <div className="text-xs text-slate-500 truncate max-w-[180px] sm:max-w-xs">Mã: {u.id} • {u.email}</div>
                </div>
                {currentUser.id === u.id && <Check size={16} className="text-blue-600 shrink-0" />}
              </div>
            ))}

            {selectedRoleTab === 'STUDENT' && (
              <>
                <div className="px-2 py-1 text-[11px] text-slate-400">Hiển thị đại diện danh sách 400 học viên:</div>
                {students.slice(0, 30).map(u => (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${currentUser.id === u.id ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50'}`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-medium text-sm text-slate-800 truncate max-w-[180px] sm:max-w-xs">{u.name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[180px] sm:max-w-xs">Mã: {u.id} • {u.email}</div>
                    </div>
                    {currentUser.id === u.id && <Check size={16} className="text-emerald-600 shrink-0" />}
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
            Hệ thống Quản lý Đào tạo • Môi trường Phát triển
          </div>
        </div>
      )}
    </div>
  );
};
