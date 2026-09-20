'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { PaginationControls } from '@/components/common/PaginationControls';
import { User } from '@/types/auth';
import { KeyRound, Search, Plus, ShieldCheck, UserCheck, Users, Check, X, Lock, RefreshCw, AlertCircle, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function AdminAccountsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Modal đổi mật khẩu
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // App context to know current user
  const { currentUser } = useApp();

  // Modal xác nhận xóa người dùng
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Modal tạo tài khoản mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserFormData, setNewUserFormData] = useState({
    username: '',
    name: '',
    role: 'STUDENT' as User['role'],
    email: '',
    password: 'password123',
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!editingUser) return;

    if (newPassword.length < 6) {
      setModalError('Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setModalError('Xác nhận mật khẩu mới không khớp');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Đã đổi mật khẩu cho tài khoản ${editingUser.name} (${editingUser.id}) thành công!`);
        setEditingUser(null);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setModalError(data.error || 'Đổi mật khẩu thất bại');
      }
    } catch (err: any) {
      setModalError(err.message || 'Lỗi mạng');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/users?id=${deleteConfirmUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        setActionMessage(data.message || `Đã xóa tài khoản [${deleteConfirmUser.id}] thành công!`);
        setDeleteConfirmUser(null);
        await loadUsers();
      } else {
        setDeleteError(data.error || 'Xóa tài khoản thất bại');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Lỗi kết nối');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserFormData),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || 'Đã tạo tài khoản thành công!');
        setShowCreateModal(false);
        setNewUserFormData({ username: '', name: '', role: 'STUDENT', email: '', password: 'password123' });
        await loadUsers();
      } else {
        alert(data.error || 'Tạo tài khoản thất bại');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi mạng');
    }
  };

  const filtered = users.filter(u => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        u.id.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedUsers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (role: string) => {
    setRoleFilter(role);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header
        title="Quản trị Tài khoản & Phân quyền"
        subtitle="Quản lý thông tin đăng nhập, thêm tài khoản và đổi mật khẩu cho tất cả người dùng"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {actionMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-emerald-600" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-emerald-600 font-bold hover:underline">
              Đóng
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã định danh, tên, email..."
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
              />
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => handleRoleFilterChange('ALL')}
                className={`px-3 py-1.5 rounded-md transition ${roleFilter === 'ALL' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-600'}`}
              >
                Tất cả ({users.length})
              </button>
              <button
                onClick={() => handleRoleFilterChange('ADMIN')}
                className={`px-3 py-1.5 rounded-md transition ${roleFilter === 'ADMIN' ? 'bg-white shadow-xs text-purple-700' : 'text-slate-600'}`}
              >
                Admin
              </button>
              <button
                onClick={() => handleRoleFilterChange('TEACHER')}
                className={`px-3 py-1.5 rounded-md transition ${roleFilter === 'TEACHER' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600'}`}
              >
                Giáo viên
              </button>
              <button
                onClick={() => handleRoleFilterChange('STUDENT')}
                className={`px-3 py-1.5 rounded-md transition ${roleFilter === 'STUDENT' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-600'}`}
              >
                Học viên
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Plus size={15} /> Thêm tài khoản mới
          </button>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã ID / Username</th>
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3">Email liên kết</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Bảo mật mật khẩu</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-bold text-slate-800">
                      <div>{u.id}</div>
                      <div className="text-[10px] text-slate-400 font-mono">@{u.username}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{u.name}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : u.role === 'TEACHER'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {u.role === 'ADMIN' ? 'Quản trị viên' : u.role === 'TEACHER' ? 'Giảng viên' : 'Học viên'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-400 font-mono">•••••••• (SHA-256)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-emerald-50 text-emerald-700">
                        Hoạt động
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setNewPassword('');
                            setConfirmPassword('');
                            setModalError(null);
                          }}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 border border-indigo-100"
                        >
                          <KeyRound size={12} /> Đổi mật khẩu
                        </button>

                        {u.id.toUpperCase() !== 'ADMIN001' && u.username.toLowerCase() !== 'admin' ? (
                          <button
                            onClick={() => {
                              setDeleteConfirmUser(u);
                              setDeleteError(null);
                            }}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 border border-rose-100"
                            title="Xóa tài khoản"
                          >
                            <Trash2 size={12} /> Xóa
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-400 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 border border-slate-200 cursor-not-allowed opacity-60"
                            title="Không thể xóa Super Admin"
                          >
                            <Trash2 size={12} /> Cố định
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang đầy đủ */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 25, 50, 100]}
            itemLabel="tài khoản"
          />
        </div>
      </main>

      {/* Modal Đổi Mật Khẩu */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Đổi Mật Khẩu Tài Khoản</h3>
                  <p className="text-xs text-slate-500">Người dùng: <strong className="text-slate-800">{editingUser.name}</strong> ({editingUser.id})</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu mới</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-indigo-600"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition"
                >
                  Lưu Mật Khẩu Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tạo Tài Khoản Mới */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Thêm Tài Khoản Mới</h3>
                  <p className="text-xs text-slate-500">Tạo tài khoản đăng nhập và phân quyền hệ thống</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên đăng nhập (Username) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: gv_nguyenvanan"
                  value={newUserFormData.username}
                  onChange={e => setNewUserFormData({ ...newUserFormData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên hiển thị *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={newUserFormData.name}
                  onChange={e => setNewUserFormData({ ...newUserFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email liên kết *</label>
                <input
                  type="email"
                  required
                  placeholder="Ví dụ: an.nv@edulocal.edu.vn"
                  value={newUserFormData.email}
                  onChange={e => setNewUserFormData({ ...newUserFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vai trò hệ thống *</label>
                <select
                  value={newUserFormData.role}
                  onChange={e => setNewUserFormData({ ...newUserFormData, role: e.target.value as User['role'] })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-indigo-600 bg-white"
                >
                  <option value="STUDENT">Học viên (Student)</option>
                  <option value="TEACHER">Giáo viên (Teacher)</option>
                  <option value="ADMIN">Quản trị viên (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu khởi tạo *</label>
                <input
                  type="text"
                  required
                  value={newUserFormData.password}
                  onChange={e => setNewUserFormData({ ...newUserFormData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-indigo-600 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Mặc định: password123 (Người dùng có thể đổi sau)</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Tài Khoản */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-600">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-rose-800 text-base">Xác Nhận Xóa Tài Khoản</h3>
                  <p className="text-xs text-rose-600">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <button 
                disabled={isDeleting}
                onClick={() => setDeleteConfirmUser(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="text-slate-500">Thông tin tài khoản:</div>
                <div className="font-bold text-slate-800 text-sm">{deleteConfirmUser.name}</div>
                <div className="text-slate-600 font-mono text-[11px]">Mã ID: {deleteConfirmUser.id} (@{deleteConfirmUser.username})</div>
                <div className="text-slate-600 text-[11px]">Email: {deleteConfirmUser.email}</div>
                <div className="text-slate-600 text-[11px]">
                  Vai trò: <span className="font-semibold text-indigo-700">{deleteConfirmUser.role === 'ADMIN' ? 'Quản trị viên' : deleteConfirmUser.role === 'TEACHER' ? 'Giảng viên' : 'Học viên'}</span>
                </div>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200 text-rose-800 rounded-lg text-[11px] leading-relaxed">
                ⚠️ <strong>Cảnh báo:</strong> Bạn có chắc chắn muốn xóa tài khoản <strong>[{deleteConfirmUser.id}] - [{deleteConfirmUser.name}]</strong> ({deleteConfirmUser.role}) khỏi hệ thống? Thao tác này sẽ xóa vĩnh viễn quyền truy cập của người dùng này và không thể hoàn tác.
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirmUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-70"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Đang xóa...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Xóa tài khoản vĩnh viễn
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
