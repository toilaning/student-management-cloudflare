'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { PaginationControls } from '@/components/common/PaginationControls';
import { Student } from '@/types/student';
import { ClassEntity } from '@/types/classroom';
import { Users, Search, BookOpen, Plus, Trash2, X, Check } from 'lucide-react';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(400);
  const [loading, setLoading] = useState(true);

  // Modal gán lớp cho học viên
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modal thêm học viên mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'Nam' as 'Nam' | 'Nữ',
    dateOfBirth: '2008-01-01',
    address: 'TP. Hồ Chí Minh',
    selectedClassIds: [] as string[]
  });

  const loadStudents = async (p = 1, limit = 20, search = '') => {
    setLoading(true);
    try {
      const [stRes, clsRes] = await Promise.all([
        fetch(`/api/students?page=${p}&limit=${limit}&search=${encodeURIComponent(search)}`),
        fetch('/api/classes'),
      ]);
      const stData = await stRes.json();
      const clsData = await clsRes.json();
      setStudents(stData.students || []);
      setTotalPages(stData.totalPages || 1);
      setTotal(stData.total || 400);
      setClasses(clsData.classes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents(page, pageSize, searchTerm);
  }, [page, pageSize, searchTerm]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentData.name || !newStudentData.phone) {
      alert('Vui lòng nhập họ tên và số điện thoại học viên');
      return;
    }
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudentData.name,
          phone: newStudentData.phone,
          email: newStudentData.email,
          gender: newStudentData.gender,
          dateOfBirth: newStudentData.dateOfBirth,
          address: newStudentData.address,
          enrolledClassIds: newStudentData.selectedClassIds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message);
        setShowAddModal(false);
        setNewStudentData({
          name: '',
          phone: '',
          email: '',
          gender: 'Nam',
          dateOfBirth: '2008-01-01',
          address: 'TP. Hồ Chí Minh',
          selectedClassIds: []
        });
        await loadStudents(page, pageSize, searchTerm);
      } else {
        alert(data.error || 'Thêm học viên thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const handleDeleteStudent = async (st: Student) => {
    if (!confirm(`Bạn có chắc chắn muốn xoá học viên ${st.id} - ${st.name}? Học viên sẽ bị xoá khỏi các lớp học liên quan.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/students?id=${st.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message);
        await loadStudents(page, pageSize, searchTerm);
      } else {
        alert(data.error || 'Xoá học viên thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const handleEnrollChange = async (classId: string, action: 'ENROLL' | 'UNENROLL') => {
    if (!selectedStudent) return;
    try {
      const res = await fetch('/api/classes/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          studentId: selectedStudent.id,
          action,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message);
        let updatedClasses = [...(selectedStudent.enrolledClassIds || [])];
        if (action === 'ENROLL') {
          updatedClasses.push(classId);
        } else {
          updatedClasses = updatedClasses.filter(id => id !== classId);
        }
        const updatedSt = { ...selectedStudent, enrolledClassIds: updatedClasses };
        setSelectedStudent(updatedSt);
        setStudents(prev => prev.map(s => s.id === updatedSt.id ? updatedSt : s));
      } else {
        alert(data.error || 'Thao tác thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header 
        title="Quản lý Học viên" 
        subtitle="Hồ sơ 400 học viên (ST001 - ST400), phân lớp và trạng thái học tập" 
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
              placeholder="Tìm theo mã ST, họ tên, SĐT..."
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
            />
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-xs text-slate-500 font-medium">
              Tổng số: <span className="font-bold text-slate-800">{total}</span> học viên
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={15} /> Thêm Học viên
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Mã SV</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Họ và tên</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Giới tính</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Ngày sinh</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Liên hệ</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Lớp đang theo học</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Trạng thái</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(st => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-mono font-bold text-slate-800 whitespace-nowrap">{st.id}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-slate-800 whitespace-nowrap min-w-[160px]">{st.name}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">{st.gender}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">{st.dateOfBirth}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-600 whitespace-nowrap">
                      <div className="font-medium">{st.phone}</div>
                      
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-indigo-600">
                      <div className="flex flex-wrap gap-1">
                        {(st.enrolledClassIds || []).map(cid => (
                          <span key={cid} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[11px] font-bold border border-indigo-100 whitespace-nowrap inline-flex">
                            {cid}
                          </span>
                        ))}
                        {(!st.enrolledClassIds || st.enrolledClassIds.length === 0) && (
                          <span className="text-slate-400 italic whitespace-nowrap">Chưa gán lớp</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] whitespace-nowrap inline-flex shrink-0 ${
                        st.status === 'Đang học'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : st.status === 'Bảo lưu'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {st.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right whitespace-nowrap min-w-[110px]">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => {
                            setSelectedStudent(st);
                            setActionMessage(null);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-bold text-[11px] transition inline-flex items-center gap-1 border border-indigo-100 whitespace-nowrap shrink-0"
                        >
                          <BookOpen size={12} /> Gán lớp
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(st)}
                          title="Xoá học viên"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 20, 25, 50, 100]}
            itemLabel="học viên"
          />
        </div>
      </main>

      {/* Modal Thêm Học Viên */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">Thêm Học Viên Mới</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-5 space-y-4 text-xs overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lê Minh Hoàng"
                  value={newStudentData.name}
                  onChange={e => setNewStudentData({ ...newStudentData, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    placeholder="0987..."
                    value={newStudentData.phone}
                    onChange={e => setNewStudentData({ ...newStudentData, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giới tính</label>
                  <select
                    value={newStudentData.gender}
                    onChange={e => setNewStudentData({ ...newStudentData, gender: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs bg-white"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ngày sinh</label>
                <input
                  type="date"
                  value={newStudentData.dateOfBirth}
                  onChange={e => setNewStudentData({ ...newStudentData, dateOfBirth: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={newStudentData.address}
                  onChange={e => setNewStudentData({ ...newStudentData, address: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gán vào lớp học ban đầu</label>
                <div className="border border-slate-200 rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1.5">
                  {classes.map(cls => (
                    <label key={cls.id} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newStudentData.selectedClassIds.includes(cls.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewStudentData(prev => ({
                              ...prev,
                              selectedClassIds: [...prev.selectedClassIds, cls.id],
                            }));
                          } else {
                            setNewStudentData(prev => ({
                              ...prev,
                              selectedClassIds: prev.selectedClassIds.filter(id => id !== cls.id),
                            }));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-bold text-slate-800">{cls.id}</span>
                      <span className="text-slate-500">- {cls.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  Xác Nhận Thêm Học Viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gán Lớp Cho Học Viên */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Phân Lớp & Ghi Danh Học Viên</h3>
                <p className="text-xs text-slate-500">
                  Học viên: <strong className="text-slate-800">{selectedStudent.name}</strong> ({selectedStudent.id})
                </p>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">
                Danh sách lớp học hiện có trong hệ thống:
              </div>
              {classes.map(cls => {
                const isEnrolled = (selectedStudent.enrolledClassIds || []).includes(cls.id);
                return (
                  <div
                    key={cls.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition ${
                      isEnrolled ? 'bg-indigo-50/60 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                        <span>{cls.name}</span>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{cls.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Phòng: {cls.roomId} | Lịch: Thứ {cls.scheduleDays?.join(", ")} (Ca {cls.shiftId})
                      </div>
                    </div>
                    {isEnrolled ? (
                      <button
                        onClick={() => handleEnrollChange(cls.id, 'UNENROLL')}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition border border-rose-200"
                      >
                        Hủy đăng ký
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnrollChange(cls.id, 'ENROLL')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
                      >
                        Đăng ký lớp
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
