'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { PaginationControls } from '@/components/common/PaginationControls';
import { Student } from '@/types/student';
import { ClassEntity } from '@/types/classroom';
import {
  Search,
  BookOpen,
  Plus,
  Trash2,
  X,
  Check,
  Zap,
  Copy,
  Edit3,
  Minus,
  FolderKanban,
  SlidersHorizontal,
  UserCheck,
  Sparkles,
  School,
  GraduationCap,
} from 'lucide-react';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [statusTab, setStatusTab] = useState<'ALL' | 'Đang học' | 'Tạm dừng' | 'Đã nghỉ học'>('Đang học');
  const [targetUniFilter, setTargetUniFilter] = useState<string>('ALL');
  const [quickActionId, setQuickActionId] = useState<string>('');
  const [editingSessionStudent, setEditingSessionStudent] = useState<Student | null>(null);
  const [editSessionInput, setEditSessionInput] = useState<number>(12);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
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
  });

  // Modal Kết quả bàn giao tài khoản vừa tạo
  const [createdStudentInfo, setCreatedStudentInfo] = useState<{
    id: string;
    name: string;
    username: string;
    defaultPassword: string;
    phone: string;
  } | null>(null);
  const [copiedHandover, setCopiedHandover] = useState(false);

  // Modal Thêm Học Viên Đầy Đủ (Full Form)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'Nam' as 'Nam' | 'Nữ',
    dateOfBirth: '2008-01-01',
    address: 'TP. Hà Nội',
    selectedClassIds: [] as string[],
    parentPhone: '',
    homeTown: '',
    gradeLevel: 'Lớp 12',
    targetUniversity: 'HAU',
    customUniversity: '',
    examBlock: 'KHOI_V' as 'KHOI_V' | 'KHOI_H',
    studyGoal: 'Thi Đại Học',
    facebookUrl: '',
    otherNotes: '',
    totalSessionsInMonth: 12,
    remainingSessions: 12,
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

  
  const handleRowStatusChange = async (student: Student, newStatus: Student['status']) => {
    if (!student || !newStatus || newStatus === student.status) return;
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setStudents(prev =>
          prev.map(s => (s.id === student.id ? { ...s, status: newStatus } : s))
        );
        setActionMessage(`Đã chuyển học viên ${student.name} [${student.id}] sang trạng thái "${newStatus}"!`);
      } else {
        alert(data.error || 'Thao tác thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const handleQuickStatusChange = async (targetStatus: 'Tạm dừng' | 'Đã nghỉ học') => {
    if (!quickActionId.trim()) {
      alert('Vui lòng nhập Mã học viên cần thao tác');
      return;
    }
    const cleanId = quickActionId.trim();
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/students/${cleanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Đã chuyển học viên [${cleanId}] sang trạng thái "${targetStatus}" thành công!`);
        setQuickActionId('');
        await loadStudents(page, pageSize, searchTerm);
      } else {
        alert(data.error || 'Thao tác thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleQuickAdjustSessions = async (st: Student, delta: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const current = st.remainingSessions ?? st.totalSessionsInMonth ?? 12;
    const nextVal = Math.max(0, current + delta);
    try {
      const res = await fetch(`/api/students/${st.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remainingSessions: nextVal })
      });
      const data = await res.json();
      if (res.ok) {
        setStudents(prev => prev.map(s => s.id === st.id ? { ...s, remainingSessions: nextVal } : s));
        setActionMessage(`Đã điều chỉnh số buổi của ${st.name} [${st.id}] thành ${nextVal} buổi!`);
      } else {
        alert(data.error || 'Thao tác thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const handleUpdateRemainingSessions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSessionStudent) return;
    try {
      const res = await fetch(`/api/students/${editingSessionStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remainingSessions: editSessionInput })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Đã cập nhật số buổi còn lại của học viên ${editingSessionStudent.name} thành ${editSessionInput} buổi!`);
        setEditingSessionStudent(null);
        await loadStudents(page, pageSize, searchTerm);
      } else {
        alert(data.error || 'Cập nhật thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

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
        });
        setFastData({ name: '', phone: '' });
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
          enrolledClassIds: newStudentData.selectedClassIds,
          parentPhone: newStudentData.parentPhone,
          homeTown: newStudentData.homeTown,
          gradeLevel: newStudentData.gradeLevel,
          targetUniversity: newStudentData.targetUniversity,
          customUniversity: newStudentData.customUniversity,
          examBlock: newStudentData.examBlock,
          studyGoal: newStudentData.studyGoal,
          facebookUrl: newStudentData.facebookUrl,
          otherNotes: newStudentData.otherNotes,
          totalSessionsInMonth: newStudentData.totalSessionsInMonth,
          remainingSessions: newStudentData.remainingSessions,
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
        });
        setNewStudentData({
          name: '',
          phone: '',
          email: '',
          gender: 'Nam',
          dateOfBirth: '2008-01-01',
          address: 'TP. Hà Nội',
          selectedClassIds: [],
          parentPhone: '',
          homeTown: '',
          gradeLevel: 'Lớp 12',
          targetUniversity: 'HAU',
          customUniversity: '',
          examBlock: 'KHOI_V',
          studyGoal: 'Thi Đại Học',
          facebookUrl: '',
          otherNotes: '',
          totalSessionsInMonth: 12,
          remainingSessions: 12,
        });
        await loadStudents(page, pageSize, searchTerm);
      } else {
        alert(data.error || 'Thêm học viên thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi kết nối máy chủ');
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
Lưu ý: Học viên vui lòng đăng nhập và đổi mật khẩu lần đầu để bảo mật tài khoản!`;

    navigator.clipboard.writeText(handoverText);
    setCopiedHandover(true);
    setTimeout(() => setCopiedHandover(false), 2500);
  };

  
  const filteredStudents = students.filter(st => {
    // 1. Lọc theo Tab trạng thái
    if (statusTab !== 'ALL' && st.status !== statusTab) {
      return false;
    }
    // 2. Lọc theo trường & khối thi
    if (targetUniFilter !== 'ALL') {
      if (targetUniFilter === 'HAU_V') return st.targetUniversity === 'HAU' && st.examBlock === 'KHOI_V';
      if (targetUniFilter === 'HAU_H') return st.targetUniversity === 'HAU' && st.examBlock === 'KHOI_H';
      if (targetUniFilter === 'HUCE_V') return st.targetUniversity === 'HUCE' && st.examBlock === 'KHOI_V';
      if (targetUniFilter === 'HUCE_H') return st.targetUniversity === 'HUCE' && st.examBlock === 'KHOI_H';
      if (targetUniFilter === 'MTCN_V') return st.targetUniversity === 'MTCN' && st.examBlock === 'KHOI_V';
      if (targetUniFilter === 'MTCN_H') return st.targetUniversity === 'MTCN' && st.examBlock === 'KHOI_H';
      if (targetUniFilter === 'NUAE') return st.targetUniversity === 'NUAE';
      if (targetUniFilter === 'HNUE') return st.targetUniversity === 'HNUE';
      if (targetUniFilter === 'VNUFA') return st.targetUniversity === 'VNUFA';
      if (targetUniFilter === 'HOU') return st.targetUniversity === 'HOU';
      if (targetUniFilter === 'VNU-SIS') return st.targetUniversity === 'VNU-SIS';
      if (targetUniFilter === 'KHAC') return st.targetUniversity === 'KHAC' || !!st.customUniversity;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header
        title="Quản lý Học viên"
        subtitle="Hồ sơ học sinh chuẩn hóa YYxxx (ví dụ 26001) & 1-Click Fast Onboarding"
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

        
        {/* THANH THAO TÁC NHANH ĐẦU TRANG - TONE ẤM ATELIER */}
        <section className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap flex items-center gap-1.5">
              <SlidersHorizontal size={14} className="text-slate-400" />
              Chuyển trạng thái nhanh:
            </span>
            <input
              type="text"
              placeholder="Nhập Mã học viên (VD: 26001, ST001)..."
              value={quickActionId}
              onChange={e => setQuickActionId(e.target.value)}
              className="px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-mono font-bold w-full sm:w-64 focus:bg-white focus:outline-slate-800 transition-colors placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => handleQuickStatusChange('Tạm dừng')}
              className="px-4 py-2 bg-amber-50/80 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <span>⏸️</span> Tạm nghỉ
            </button>
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => handleQuickStatusChange('Đã nghỉ học')}
              className="px-4 py-2 bg-rose-50/80 hover:bg-rose-100 text-rose-900 border border-rose-300/80 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <span>⛔</span> Dừng học
            </button>
          </div>
        </section>

        {/* 3 TAB TRẠNG THÁI HỌC TẬP - PHONG CÁCH HỒ SƠ ARCHITECTURAL ATELIER */}
        <section className="flex items-center gap-2 border-b border-slate-200/90 pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusTab('Đang học')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
              statusTab === 'Đang học'
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200/80'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Đang học
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('Tạm dừng')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
              statusTab === 'Tạm dừng'
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200/80'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Tạm nghỉ
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('Đã nghỉ học')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
              statusTab === 'Đã nghỉ học'
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200/80'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Đã nghỉ
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
              statusTab === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200/80'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Tất cả trạng thái
          </button>
        </section>

        {/* BỘ LỌC THEO TRƯỜNG ĐH & KHỐI THI: DANH MỤC HỒ SƠ ĐỒ ÁN (ARCHIVED FOLDERS) */}
        <section className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FolderKanban size={14} className="text-slate-400" />
              Thư mục mục tiêu Đại học & Khối thi (Khối V / Khối H):
            </span>
            <span className="text-[11px] text-slate-400 font-mono">1-click lọc hồ sơ</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {[
              { id: 'ALL', label: 'Tất cả trường & khối', highlight: false },
              { id: 'HAU_V', label: 'HAU (Kiến Trúc) - Khối V', highlight: true },
              { id: 'HAU_H', label: 'HAU (Kiến Trúc) - Khối H', highlight: true },
              { id: 'HUCE_V', label: 'HUCE (Xây Dựng) - Khối V', highlight: true },
              { id: 'HUCE_H', label: 'HUCE (Xây Dựng) - Khối H', highlight: true },
              { id: 'MTCN_V', label: 'MTCN (Mỹ Thuật CN) - Khối V', highlight: true },
              { id: 'MTCN_H', label: 'MTCN (Mỹ Thuật CN) - Khối H', highlight: true },
              { id: 'NUAE', label: 'NUAE (Nghệ Thuật TW)', highlight: false },
              { id: 'HNUE', label: 'HNUE (Sư Phạm HN)', highlight: false },
              { id: 'VNUFA', label: 'VNUFA (Mỹ Thuật VN)', highlight: false },
              { id: 'HOU', label: 'HOU (Viện Mở)', highlight: false },
              { id: 'VNU-SIS', label: 'VNU-SIS (Khoa học LN)', highlight: false },
              { id: 'KHAC', label: 'Trường khác', highlight: false },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTargetUniFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  targetUniFilter === f.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Toolbar Header - Atelier Minimalist */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã YYxxx, họ tên, SĐT..."
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-slate-800 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            <div className="text-xs text-slate-500 font-medium hidden md:block">
              Tổng số: <span className="font-bold font-mono text-slate-900">{total}</span> hồ sơ
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200/60"
            >
              <Plus size={14} /> Hồ sơ chi tiết
            </button>
            <button
              onClick={() => setShowFastModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Zap size={14} className="text-amber-300 fill-amber-300" /> 1-Click Ghi Danh Nhanh
            </button>
          </div>
        </div>

        {/* Table - Atelier Clean Studio Grid */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 uppercase font-bold border-b border-slate-200/80 text-[11px] tracking-wider">
                <tr>
                  <th className="whitespace-nowrap py-3.5 px-4">Mã Học Viên</th>
                  <th className="whitespace-nowrap py-3.5 px-4">Họ và Tên</th>
                  <th className="whitespace-nowrap py-3.5 px-4">Liên hệ</th>
                  <th className="whitespace-nowrap py-3.5 px-4">Khối Thi & Mục Tiêu ĐH</th>
                  <th className="whitespace-nowrap py-3.5 px-4">Lớp Đang Học</th>
                  <th className="whitespace-nowrap py-3.5 px-4 text-center">Số Buổi Còn Lại</th>
                  <th className="whitespace-nowrap py-3.5 px-4">Trạng Thái</th>
                  <th className="whitespace-nowrap py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                      Không tìm thấy học viên nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(st => {
                    const remaining = st.remainingSessions ?? st.totalSessionsInMonth ?? 12;
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* 1. Mã Học Viên */}
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {st.id}
                        </td>

                        {/* 2. Họ và Tên */}
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap min-w-[160px]">
                          {st.name}
                          {st.gradeLevel && (
                            <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                              {st.gradeLevel}
                            </span>
                          )}
                        </td>

                        {/* 3. Liên hệ */}
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                          <div>{st.phone || '—'}</div>
                        </td>

                        {/* 4. Khối thi & Mục tiêu ĐH */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              st.examBlock === 'KHOI_H' 
                                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {st.examBlock === 'KHOI_H' ? 'Khối H' : 'Khối V'}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              {st.targetUniversity === 'KHAC' ? (st.customUniversity || 'Trường khác') : (st.targetUniversity || '—')}
                            </span>
                          </div>
                        </td>

                        {/* 5. Lớp đang học */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(st.enrolledClassIds || []).map(cid => (
                              <span
                                key={cid}
                                className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-slate-200 whitespace-nowrap inline-flex"
                              >
                                {cid}
                              </span>
                            ))}
                            {(!st.enrolledClassIds || st.enrolledClassIds.length === 0) && (
                              <span className="text-slate-400 italic text-[11px] whitespace-nowrap">Chưa gán lớp</span>
                            )}
                          </div>
                        </td>

                        {/* 6. Số buổi còn lại (badge màu dịu, bấm sửa nhanh số buổi thủ công với nút + / -) */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdjustSessions(st, -1, e)}
                              title="Giảm 1 buổi"
                              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors"
                            >
                              <Minus size={11} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingSessionStudent(st);
                                setEditSessionInput(remaining);
                              }}
                              title="Bấm để nhập số buổi thủ công"
                              className={`px-2 py-0.5 rounded font-mono font-bold text-xs transition-colors hover:ring-1 hover:ring-slate-400 ${
                                remaining >= 4
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                                  : remaining > 0
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200/80 animate-pulse'
                              }`}
                            >
                              {remaining} buổi
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleQuickAdjustSessions(st, 1, e)}
                              title="Thêm 1 buổi"
                              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors"
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </td>

                        {/* 7. Trạng thái */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold text-[10px] inline-flex shrink-0 ${
                                st.status === 'Đang học'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : st.status === 'Tạm dừng'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {st.status}
                            </span>
                            <select
                              value={st.status}
                              onChange={e => handleRowStatusChange(st, e.target.value as Student['status'])}
                              title="Chuyển trạng thái"
                              className="p-1 border border-slate-200 rounded text-[10px] font-medium text-slate-600 bg-white focus:outline-slate-800 cursor-pointer hover:border-slate-300 transition-colors"
                            >
                              <option value="Đang học">Đang học</option>
                              <option value="Tạm dừng">Tạm dừng</option>
                              <option value="Đã nghỉ học">Đã nghỉ học</option>
                              <option value="Bảo lưu">Bảo lưu</option>
                            </select>
                          </div>
                        </td>

                        {/* 8. Thao tác */}
                        <td className="px-4 py-3 text-right whitespace-nowrap min-w-[120px]">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => {
                                setSelectedStudent(st);
                                setActionMessage(null);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px] transition-colors inline-flex items-center gap-1 border border-slate-200 whitespace-nowrap shrink-0"
                            >
                              <BookOpen size={12} /> Gán lớp
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(st)}
                              title="Xoá học viên"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
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

      {/* Modal Sửa Số Buổi Còn Lại Thủ Công */}
      {editingSessionStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <Edit3 size={15} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Điều Chỉnh Số Buổi Học</h3>
                  <p className="text-[11px] text-slate-500">{editingSessionStudent.name} ({editingSessionStudent.id})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSessionStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateRemainingSessions} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Số buổi học còn lại trong tháng:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditSessionInput(prev => Math.max(0, prev - 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={editSessionInput}
                    onChange={e => setEditSessionInput(parseInt(e.target.value) || 0)}
                    className="flex-1 p-2 border border-slate-200 rounded-lg font-mono font-bold text-center text-sm focus:outline-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setEditSessionInput(prev => prev + 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                  >
                    +1
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Số buổi này được dùng để đối soát điểm danh và báo nạp phí kỳ tiếp theo.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSessionStudent(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-2xs transition-colors"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <label className="block font-bold text-slate-700 mb-1">Địa chỉ thường trú / Chỗ ở hiện tại</label>
                <input
                  type="text"
                  value={newStudentData.address}
                  onChange={e => setNewStudentData({ ...newStudentData, address: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quê quán / Tỉnh thành</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nam Định, Hải Dương, Hà Nội..."
                    value={newStudentData.homeTown}
                    onChange={e => setNewStudentData({ ...newStudentData, homeTown: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SĐT / Zalo Phụ huynh</label>
                  <input
                    type="tel"
                    placeholder="0987..."
                    value={newStudentData.parentPhone}
                    onChange={e => setNewStudentData({ ...newStudentData, parentPhone: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lớp mấy hiện tại *</label>
                  <select
                    value={newStudentData.gradeLevel}
                    onChange={e => setNewStudentData({ ...newStudentData, gradeLevel: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-indigo-600 font-semibold"
                  >
                    <option value="Lớp 10">Lớp 10</option>
                    <option value="Lớp 11">Lớp 11</option>
                    <option value="Lớp 12">Lớp 12 (Thi năm nay)</option>
                    <option value="Thí sinh tự do">Thí sinh tự do</option>
                    <option value="Học năng khiếu">Học năng khiếu / Đi làm</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khối thi đại học *</label>
                  <select
                    value={newStudentData.examBlock}
                    onChange={e => setNewStudentData({ ...newStudentData, examBlock: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-indigo-600 font-bold text-indigo-700"
                  >
                    <option value="KHOI_V">Khối V (Vẽ Mỹ thuật / Tượng)</option>
                    <option value="KHOI_H">Khối H (Vẽ Bố cục màu / Người)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trường ĐH mục tiêu *</label>
                  <select
                    value={newStudentData.targetUniversity}
                    onChange={e => setNewStudentData({ ...newStudentData, targetUniversity: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-indigo-600 font-semibold"
                  >
                    <option value="HAU">ĐH Kiến Trúc Hà Nội (HAU)</option>
                    <option value="HUCE">ĐH Xây Dựng (HUCE)</option>
                    <option value="MTCN">ĐH Mỹ Thuật Công Nghiệp (MTCN)</option>
                    <option value="NUAE">ĐH Sư Phạm Nghệ Thuật TW (NUAE)</option>
                    <option value="HNUE">ĐH Sư Phạm Hà Nội (HNUE)</option>
                    <option value="VNUFA">ĐH Mỹ Thuật Việt Nam (VNUFA)</option>
                    <option value="HOU">Viện ĐH Mở Hà Nội (HOU)</option>
                    <option value="VNU-SIS">ĐHQGHN (VNU-SIS)</option>
                    <option value="KHAC">-- Trường khác --</option>
                  </select>
                </div>
              </div>

              {newStudentData.targetUniversity === 'KHAC' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nhập tên Trường Đại học mục tiêu khác *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: ĐH Bách Khoa, ĐH Tôn Đức Thắng, Du học..."
                    value={newStudentData.customUniversity}
                    onChange={e => setNewStudentData({ ...newStudentData, customUniversity: e.target.value })}
                    className="w-full p-2.5 border border-indigo-300 bg-indigo-50/40 rounded-lg text-xs font-bold text-indigo-900 focus:outline-indigo-600"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mục đích học</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Thi Đại học, Rèn luyện kỹ năng..."
                    value={newStudentData.studyGoal}
                    onChange={e => setNewStudentData({ ...newStudentData, studyGoal: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số buổi đăng ký ban đầu</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newStudentData.remainingSessions}
                    onChange={e => setNewStudentData({ ...newStudentData, remainingSessions: Number(e.target.value), totalSessionsInMonth: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Link Facebook cá nhân</label>
                <input
                  type="url"
                  placeholder="https://facebook.com/..."
                  value={newStudentData.facebookUrl}
                  onChange={e => setNewStudentData({ ...newStudentData, facebookUrl: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Trường thông tin khác (Ghi chú tự do của học viên)</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về năng khiếu, mục tiêu thi cử, nguyện vọng đặc biệt..."
                  value={newStudentData.otherNotes}
                  onChange={e => setNewStudentData({ ...newStudentData, otherNotes: e.target.value })}
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
