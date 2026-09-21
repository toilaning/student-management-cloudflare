'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { PaginationControls } from '@/components/common/PaginationControls';
import { Student } from '@/types/student';
import { ClassEntity } from '@/types/classroom';
import {
  Users,
  Search,
  BookOpen,
  Plus,
  Trash2,
  X,
  Check,
  Zap,
  Copy,
  Edit2,
  HelpCircle,
  Hash,
  ExternalLink,
} from 'lucide-react';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(400);
  const [loading, setLoading] = useState(true);

  // Thông báo hành động
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modal gán lớp cho học viên
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Modal 1-Click Fast Onboarding
  const [showFastModal, setShowFastModal] = useState(false);
  const [fastData, setFastData] = useState({
    name: '',
    phone: '',
    discordId: '',
    discordUsername: '',
  });

  // Modal Kết quả bàn giao tài khoản vừa tạo
  const [createdStudentInfo, setCreatedStudentInfo] = useState<{
    id: string;
    name: string;
    username: string;
    defaultPassword: string;
    phone: string;
    discordId?: string;
  } | null>(null);
  const [copiedHandover, setCopiedHandover] = useState(false);

  // Modal Sửa Discord ID (Snowflake)
  const [editingDiscordStudent, setEditingDiscordStudent] = useState<Student | null>(null);
  const [editDiscordId, setEditDiscordId] = useState('');
  const [editDiscordUsername, setEditDiscordUsername] = useState('');
  const [savingDiscord, setSavingDiscord] = useState(false);

  // Modal Hướng dẫn Discord Snowflake ID
  const [showDiscordGuideModal, setShowDiscordGuideModal] = useState(false);

  // Modal Thêm Học Viên Đầy Đủ (Full Form)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'Nam' as 'Nam' | 'Nữ',
    dateOfBirth: '2008-01-01',
    address: 'TP. Hồ Chí Minh',
    discordId: '',
    discordUsername: '',
    selectedClassIds: [] as string[],
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

  // 1-Click Fast Onboarding Submit
  const handleFastOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastData.name.trim()) {
      alert('Vui lòng nhập họ và tên học viên');
      return;
    }
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fastData.name.trim(),
          phone: fastData.phone.trim(),
          discordId: fastData.discordId.trim() || undefined,
          discordUsername: fastData.discordUsername.trim() || undefined,
          fastOnboarding: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowFastModal(false);
        setCreatedStudentInfo({
          id: data.student.id,
          name: data.student.name,
          username: data.student.id.toLowerCase(),
          defaultPassword: data.defaultPassword || '123456',
          phone: data.student.phone || '',
          discordId: data.student.discordId,
        });
        setFastData({ name: '', phone: '', discordId: '', discordUsername: '' });
        await loadStudents(page, pageSize, searchTerm);
      } else {
        alert(data.error || 'Tạo nhanh học viên thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi kết nối máy chủ');
    }
  };

  // Full Create Student Submit
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentData.name.trim()) {
      alert('Vui lòng nhập họ và tên học viên');
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
          discordId: newStudentData.discordId.trim() || undefined,
          discordUsername: newStudentData.discordUsername.trim() || undefined,
          enrolledClassIds: newStudentData.selectedClassIds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setCreatedStudentInfo({
          id: data.student.id,
          name: data.student.name,
          username: data.student.id.toLowerCase(),
          defaultPassword: data.defaultPassword || '123456',
          phone: data.student.phone || '',
          discordId: data.student.discordId,
        });
        setNewStudentData({
          name: '',
          phone: '',
          email: '',
          gender: 'Nam',
          dateOfBirth: '2008-01-01',
          address: 'TP. Hồ Chí Minh',
          discordId: '',
          discordUsername: '',
          selectedClassIds: [],
        });
        await loadStudents(page, pageSize, searchTerm);
      } else {
        alert(data.error || 'Thêm học viên thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi kết nối máy chủ');
    }
  };

  // Cập nhật Discord ID / Username
  const handleSaveDiscordInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiscordStudent) return;
    setSavingDiscord(true);
    try {
      const res = await fetch(`/api/students/${editingDiscordStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: editDiscordId.trim(),
          discordUsername: editDiscordUsername.trim(),
          actorId: 'ADMIN001',
          actorRole: 'ADMIN',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Đã cập nhật Discord ID cho học viên [${editingDiscordStudent.id}]`);
        setEditingDiscordStudent(null);
        await loadStudents(page, pageSize, searchTerm);
      } else {
        alert(data.error || 'Cập nhật Discord ID thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    } finally {
      setSavingDiscord(false);
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
        setStudents(prev => prev.map(s => (s.id === updatedSt.id ? updatedSt : s)));
      } else {
        alert(data.error || 'Thao tác thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const copyHandoverText = () => {
    if (!createdStudentInfo) return;
    const handoverText = `🎓 THÔNG TIN TÀI KHOẢN HỌC VIÊN
Họ và tên: ${createdStudentInfo.name}
Mã học sinh: ${createdStudentInfo.id}
Tên đăng nhập: ${createdStudentInfo.username}
Mật khẩu mặc định: ${createdStudentInfo.defaultPassword}
Hệ thống học tập: https://student-management.local
Lưu ý: Học viên vui lòng đăng nhập, đổi mật khẩu và liên kết Discord ID (Snowflake) để kích hoạt điểm danh tự động!`;

    navigator.clipboard.writeText(handoverText);
    setCopiedHandover(true);
    setTimeout(() => setCopiedHandover(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header
        title="Quản lý Học viên"
        subtitle="Hồ sơ học sinh chuẩn hóa YYxxx (ví dụ 26001), 1-Click Fast Onboarding & Discord Snowflake ID"
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

        {/* Toolbar Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã YYxxx, họ tên, Discord ID..."
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
            />
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            <div className="text-xs text-slate-500 font-medium hidden md:block">
              Tổng số: <span className="font-bold text-slate-800">{total}</span> học viên
            </div>
            <button
              onClick={() => setShowDiscordGuideModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <HelpCircle size={15} className="text-indigo-600" /> Hướng dẫn Snowflake ID
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus size={15} /> Thêm chi tiết
            </button>
            <button
              onClick={() => setShowFastModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Zap size={15} className="text-amber-300 fill-amber-300" /> 1-Click Tạo Nhanh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Mã Học Sinh</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Họ và tên</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Discord Snowflake ID</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Liên hệ / Email</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Lớp đang theo học</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold">Trạng thái</th>
                  <th className="whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(st => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {st.id}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-slate-800 whitespace-nowrap min-w-[160px]">
                      {st.name}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {st.discordId ? (
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                            <Hash size={12} className="text-indigo-600" />
                            {st.discordId}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa liên kết</span>
                        )}
                        <button
                          onClick={() => {
                            setEditingDiscordStudent(st);
                            setEditDiscordId(st.discordId || '');
                            setEditDiscordUsername(st.discordUsername || '');
                          }}
                          title="Sửa Discord Snowflake ID"
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                      {st.discordUsername && (
                        <div className="text-[10px] text-slate-400 mt-0.5">@{st.discordUsername}</div>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-600 whitespace-nowrap">
                      <div className="font-medium">{st.phone || 'Chưa có SĐT'}</div>
                      <div className="text-[11px] text-slate-400">{st.email}</div>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-indigo-600">
                      <div className="flex flex-wrap gap-1">
                        {(st.enrolledClassIds || []).map(cid => (
                          <span
                            key={cid}
                            className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[11px] font-bold border border-indigo-100 whitespace-nowrap inline-flex"
                          >
                            {cid}
                          </span>
                        ))}
                        {(!st.enrolledClassIds || st.enrolledClassIds.length === 0) && (
                          <span className="text-slate-400 italic whitespace-nowrap">Chưa gán lớp</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold text-[10px] whitespace-nowrap inline-flex shrink-0 ${
                          st.status === 'Đang học'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : st.status === 'Bảo lưu'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right whitespace-nowrap min-w-[120px]">
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

      {/* Modal 1-Click Fast Onboarding */}
      {showFastModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 to-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Zap size={18} className="fill-amber-300 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Tạo Nhanh Học Sinh (1-Click Fast Onboarding)</h3>
                  <p className="text-[11px] text-slate-500">Tự động sinh mã YYxxx & cấp tài khoản</p>
                </div>
              </div>
              <button
                onClick={() => setShowFastModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFastOnboarding} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Họ và tên học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Hoàng Nam"
                  value={fastData.name}
                  onChange={e => setFastData({ ...fastData, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs font-medium"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Số điện thoại <span className="text-slate-400 font-normal">(tùy chọn)</span>
                </label>
                <input
                  type="text"
                  placeholder="0987..."
                  value={fastData.phone}
                  onChange={e => setFastData({ ...fastData, phone: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Discord Snowflake ID</span>
                    <button
                      type="button"
                      onClick={() => setShowDiscordGuideModal(true)}
                      className="text-indigo-600 hover:underline font-normal text-[10px]"
                    >
                      Cách lấy?
                    </button>
                  </label>
                  <input
                    type="text"
                    placeholder="18-19 số (VD: 8520...)"
                    value={fastData.discordId}
                    onChange={e => setFastData({ ...fastData, discordId: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discord Username</label>
                  <input
                    type="text"
                    placeholder="username (tùy chọn)"
                    value={fastData.discordUsername}
                    onChange={e => setFastData({ ...fastData, discordUsername: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                  />
                </div>
              </div>

              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-[11px] text-indigo-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Check size={14} className="text-indigo-600" /> Hệ thống tự động thiết lập:
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                  <li>Mã học sinh tự sinh: <strong>26xxx</strong> (Ví dụ: 26001, 26002)</li>
                  <li>Tài khoản User: username = <strong>26xxx</strong>, mật khẩu = <strong>123456</strong></li>
                  <li>Tự động hiển thị Thẻ Bàn Giao để copy gửi ngay cho học viên</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFastModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5"
                >
                  <Zap size={14} /> Khởi tạo tức thì
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Thẻ Bàn Giao Thông Tin Đăng Nhập Sau Khi Tạo Thành Công */}
      {createdStudentInfo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-emerald-100 bg-emerald-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <Check size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-950 text-sm">Tạo Học Sinh Thành Công!</h3>
                  <p className="text-[11px] text-emerald-700">Thẻ bàn giao thông tin đăng nhập cho học viên</p>
                </div>
              </div>
              <button
                onClick={() => setCreatedStudentInfo(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-sans">Họ và tên:</span>
                  <span className="font-bold text-slate-800 font-sans">{createdStudentInfo.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-sans">Mã học sinh:</span>
                  <span className="font-bold text-indigo-700">{createdStudentInfo.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-sans">Tên đăng nhập:</span>
                  <span className="font-bold text-slate-800">{createdStudentInfo.username}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-sans">Mật khẩu mặc định:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {createdStudentInfo.defaultPassword}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Discord Snowflake:</span>
                  <span className="text-slate-700 font-sans">
                    {createdStudentInfo.discordId || 'Chưa liên kết'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyHandoverText}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                    copiedHandover
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                  }`}
                >
                  {copiedHandover ? <Check size={16} /> : <Copy size={16} />}
                  {copiedHandover ? 'Đã sao chép vào bộ nhớ tạm!' : 'Copy thông tin gửi học sinh'}
                </button>
                <button
                  onClick={() => setCreatedStudentInfo(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa Discord ID (Snowflake) Cho Học Sinh */}
      {editingDiscordStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Cập Nhật Discord Snowflake ID</h3>
                <p className="text-[11px] text-slate-500">
                  Học viên: <strong className="text-slate-800">{editingDiscordStudent.name}</strong> ({editingDiscordStudent.id})
                </p>
              </div>
              <button
                onClick={() => setEditingDiscordStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDiscordInfo} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Discord Snowflake ID</span>
                  <button
                    type="button"
                    onClick={() => setShowDiscordGuideModal(true)}
                    className="text-indigo-600 hover:underline font-normal text-[10px]"
                  >
                    Xem hướng dẫn lấy ID
                  </button>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 852012345678901234 (để trống nếu muốn hủy liên kết)"
                  value={editDiscordId}
                  onChange={e => setEditDiscordId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs font-mono"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Snowflake ID gồm chuỗi 18-19 chữ số được Discord cấp riêng cho từng người dùng.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Discord Username (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: hoangnam_dev"
                  value={editDiscordUsername}
                  onChange={e => setEditDiscordUsername(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDiscordStudent(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingDiscord}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs disabled:opacity-50"
                >
                  {savingDiscord ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bản Hướng Dẫn Lấy Discord Snowflake ID */}
      {showDiscordGuideModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                  <Hash size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Hướng Dẫn Lấy Discord Snowflake ID</h3>
                  <p className="text-[11px] text-slate-500">3 bước đơn giản để kích hoạt điểm danh tự động</p>
                </div>
              </div>
              <button
                onClick={() => setShowDiscordGuideModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Bật Chế Độ Nhà Phát Triển (Developer Mode)</h4>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Mở Discord → Vào <strong>Cài đặt người dùng (User Settings)</strong> (biểu tượng bánh răng ⚙️ ở góc trái) → Chọn mục <strong>Nâng cao (Advanced)</strong> → Bật công tắc <strong>Chế độ nhà phát triển (Developer Mode)</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Sao Chép Snowflake ID Cá Nhân</h4>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Nhấp chuột phải vào avatar hoặc tên tài khoản của bạn (hoặc nhấn giữ trên điện thoại) → Chọn dòng cuối cùng: <strong>"Sao chép ID người dùng" (Copy User ID)</strong>.
                  </p>
                  <p className="text-[11px] text-indigo-600 font-mono mt-1">
                    ID hợp lệ là chuỗi số dài khoảng 18-19 ký tự, ví dụ: <code>852012345678901234</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Dán ID Vào Hệ Thống</h4>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Dán chuỗi số vừa copy vào ô <strong>Discord Snowflake ID</strong> rồi bấm Lưu. Bot Discord của trung tâm sẽ tự động nhận diện và điểm danh khi bạn tham gia phòng học trực tuyến!
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowDiscordGuideModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Học Viên Chi Tiết (Full Form) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">Thêm Học Viên Mới (Chi Tiết)</h3>
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
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discord Snowflake ID</label>
                  <input
                    type="text"
                    placeholder="18-19 chữ số"
                    value={newStudentData.discordId}
                    onChange={e => setNewStudentData({ ...newStudentData, discordId: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discord Username</label>
                  <input
                    type="text"
                    placeholder="username"
                    value={newStudentData.discordUsername}
                    onChange={e => setNewStudentData({ ...newStudentData, discordUsername: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                  />
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
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {cls.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Phòng: {cls.roomId} | Lịch: Thứ {cls.scheduleDays?.join(', ')} (Ca {cls.shiftId})
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
