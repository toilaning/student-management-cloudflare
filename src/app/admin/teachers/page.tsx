'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { Teacher } from '@/types/teacher';
import { UserCheck, Mail, Phone, BookOpen, Coins, Search, Plus, Trash2, X, Check } from 'lucide-react';
import { PaginationControls } from '@/components/common/PaginationControls';

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Modal thêm giảng viên
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    hourlyRate: 350000,
    phone: '',
    email: '',
    bio: ''
  });
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadTeachers = async () => {
    try {
      const res = await fetch('/api/teachers');
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.specialty) {
      alert('Vui lòng điền đủ họ tên, chuyên môn và số điện thoại');
      return;
    }

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message);
        setShowAddModal(false);
        setFormData({ name: '', specialty: '', hourlyRate: 350000, phone: '', email: '', bio: '' });
        await loadTeachers();
      } else {
        alert(data.error || 'Thêm giảng viên thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const handleDeleteTeacher = async (teacher: Teacher) => {
    if (!confirm(`Bạn có chắc chắn muốn xoá giảng viên ${teacher.id} - ${teacher.name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teachers?id=${teacher.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message);
        await loadTeachers();
      } else {
        alert(data.error || 'Xoá giảng viên thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedTeachers = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header 
        title="Quản lý Đội ngũ Giảng viên" 
        subtitle="Hồ sơ giảng viên, hệ số lương và phân công chuyên môn" 
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

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên giảng viên, mã GV, chuyên môn..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
            />
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-xs text-slate-500 font-medium">
              Tổng số: <span className="font-bold text-slate-800">{teachers.length}</span> giảng viên
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={15} /> Thêm Giảng viên
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedTeachers.map(tc => (
            <div key={tc.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-indigo-300 transition space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
                      {tc.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base truncate max-w-[160px]">{tc.name}</h3>
                      <span className="text-[11px] font-semibold text-slate-400">{tc.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                      tc.status === 'Đang dạy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {tc.status}
                    </span>
                    <button
                      onClick={() => handleDeleteTeacher(tc)}
                      title="Xoá giảng viên"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-2 pt-3 mt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-slate-400" />
                    <span>Chuyên môn: <strong className="text-slate-700">{tc.specialty}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins size={14} className="text-slate-400" />
                    <span className="whitespace-nowrap">Đơn giá giờ dạy: <strong className="text-emerald-600 whitespace-nowrap">{tc.hourlyRate.toLocaleString('vi-VN')} đ/giờ</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate whitespace-nowrap">{tc.phone}</span>
                  </div>
                  {tc.bio && (
                    <div className="pt-2 text-slate-500 italic text-[11px]">
                      {tc.bio}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Thanh điều khiển phân trang */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs mt-6">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filtered.length}
            itemLabel="giáo viên"
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[6, 12, 24, 48]}
          />
        </div>
      </main>

      {/* Modal Thêm Giảng viên */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">Thêm Giảng viên Mới</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTeacher} className="p-5 space-y-4 text-xs overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thầy Trần Quang Huy"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bộ môn / Chuyên môn *</label>
                  <input
                    type="text"
                    required
                    placeholder="Toán Nâng Cao, IELTS..."
                    value={formData.specialty}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đơn giá giờ dạy (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    step={10000}
                    value={formData.hourlyRate}
                    onChange={e => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số điện thoại *</label>
                <input
                  type="text"
                  required
                  placeholder="0913..."
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả / Tiểu sử ngắn</label>
                <textarea
                  rows={2}
                  placeholder="Kinh nghiệm giảng dạy, chứng chỉ..."
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Lưu Giảng viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
