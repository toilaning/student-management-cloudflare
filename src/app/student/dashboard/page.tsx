'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import {
  Video,
  ExternalLink,
  CalendarDays,
  FileCheck,
  Receipt,
  Inbox,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Headphones,
  Hash,
  Edit2,
  HelpCircle,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboardPage() {
  const { currentUser, isReady } = useApp();
  const [student, setStudent] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [financeSummary, setFinanceSummary] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quản lý Discord ID của học sinh
  const [showEditDiscord, setShowEditDiscord] = useState(false);
  const [discordInput, setDiscordInput] = useState('');
  const [discordUsernameInput, setDiscordUsernameInput] = useState('');
  const [showDiscordGuide, setShowDiscordGuide] = useState(false);
  const [discordMsg, setDiscordMsg] = useState<string | null>(null);
  const [savingDiscord, setSavingDiscord] = useState(false);

  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function load() {
      try {
        const fetchSafe = async (url: string) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return {};
            return await res.json();
          } catch (e) {
            return {};
          }
        };

        const [stData, slotsData, attData, finData, reqData] = await Promise.all([
          fetchSafe(`/api/students?id=${currentUser?.id || ''}`),
          fetchSafe(`/api/schedule?studentId=${currentUser?.id || ''}`),
          fetchSafe(`/api/attendance?studentId=${currentUser?.id || ''}`),
          fetchSafe(`/api/finance?studentId=${currentUser?.id || ''}&summary=true`),
          fetchSafe(`/api/requests?studentId=${currentUser?.id || ''}`),
        ]);

        const st = stData.student || null;
        setStudent(st);
        if (st) {
          setDiscordInput(st.discordId || '');
          setDiscordUsernameInput(st.discordUsername || '');
        }
        setSlots(slotsData.slots || []);
        setAttendance(attData.records || []);
        setFinanceSummary(finData || null);
        setRequests(reqData.requests || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser, isReady]);

  const handleUpdateDiscord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setSavingDiscord(true);
    try {
      const res = await fetch(`/api/students/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: discordInput.trim(),
          discordUsername: discordUsernameInput.trim(),
          actorId: currentUser.id,
          actorRole: 'STUDENT',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStudent(data.student);
        setShowEditDiscord(false);
        setDiscordMsg('Cập nhật Discord ID thành công! Bạn đã sẵn sàng để bot điểm danh tự động.');
        setTimeout(() => setDiscordMsg(null), 5000);
      } else {
        alert(data.error || 'Cập nhật thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    } finally {
      setSavingDiscord(false);
    }
  };

  const presentCount = attendance.filter(a => a.status === 'Có mặt').length;
  const absentCount = attendance.filter(a => a.status.includes('Vắng')).length;
  const attendanceRate =
    attendance.length > 0 ? ((presentCount / attendance.length) * 100).toFixed(0) : 100;

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header
          title={`Góc Học Tập: ${currentUser?.name || ''}`}
          subtitle={`Mã học viên: ${currentUser?.id || ''} • Theo dõi tiến độ & chuyên cần cá nhân`}
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {discordMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600" />
                <span>{discordMsg}</span>
              </div>
              <button onClick={() => setDiscordMsg(null)} className="text-emerald-600 font-bold hover:underline">
                Đóng
              </button>
            </div>
          )}

          {/* Banner Welcome & Thẻ liên kết Discord */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                Học kỳ Tháng 09/2026
              </span>
              <h2 className="text-2xl font-bold">Xin chào, {currentUser?.name}!</h2>
              <p className="text-emerald-100 text-xs">
                Bạn đang theo học{' '}
                <strong className="text-white">{student?.enrolledClassIds?.length || 1} lớp</strong> tại trung tâm. Hãy
                kiểm tra thời khóa biểu và hoàn thành đúng hạn nhé.
              </p>
            </div>

            {/* Widget Discord Link Status */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 w-full lg:w-auto justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-xs">
                  <Hash size={20} />
                </div>
                <div>
                  <div className="text-[11px] text-emerald-100 uppercase tracking-wide font-semibold">
                    Discord Snowflake ID
                  </div>
                  <div className="font-mono text-sm font-bold text-white">
                    {student?.discordId ? student.discordId : <span className="text-amber-200">Chưa liên kết</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setShowDiscordGuide(true)}
                  title="Hướng dẫn lấy Snowflake ID"
                  className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <HelpCircle size={14} /> Hướng dẫn
                </button>
                <button
                  onClick={() => {
                    setDiscordInput(student?.discordId || '');
                    setDiscordUsernameInput(student?.discordUsername || '');
                    setShowEditDiscord(true);
                  }}
                  className="px-3 py-1.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs"
                >
                  <Edit2 size={13} /> {student?.discordId ? 'Sửa ID' : 'Liên kết ngay'}
                </button>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tỉ lệ chuyên cần</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 size={20} />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold text-emerald-600">{attendanceRate}%</div>
              <p className="text-xs text-slate-400 mt-1">
                Có mặt {presentCount} / {attendance.length} buổi
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số buổi vắng</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Clock size={20} />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold text-amber-600">{absentCount} Buổi</div>
              <p className="text-xs text-slate-400 mt-1">Mức cảnh báo tối đa: 3 buổi</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Công nợ học phí</span>
                <span className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <Receipt size={20} />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold text-rose-600 whitespace-nowrap">
                {financeSummary ? (financeSummary.totalDebt / 1_000_000).toFixed(1) : 0} Tr
              </div>
              <p className="text-xs text-slate-400 mt-1 whitespace-nowrap">
                Đã nộp: {financeSummary ? (financeSummary.totalPaid / 1_000_000).toFixed(1) : 0} triệu đ
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn đã gửi</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Inbox size={20} />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold text-blue-600">{requests.length} Đơn</div>
              <p className="text-xs text-slate-400 mt-1">Xin nghỉ / Đề xuất đổi ca</p>
            </div>
          </div>

          {/* Lịch học & Đơn từ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="text-emerald-600" size={20} />
                  <h2 className="font-bold text-slate-800 text-base">Buổi học sắp tới (Tháng 09/2026)</h2>
                </div>
                <Link
                  href="/student/schedule"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                >
                  Toàn bộ lịch <ArrowRight size={14} />
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {slots.slice(0, 5).map(slot => (
                  <div key={slot.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-emerald-700">
                        <span className="text-[10px] font-bold">Ca {slot.shiftId}</span>
                        <span className="text-[9px] text-emerald-600">{slot.date.slice(8)}/09</span>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800">
                          {slot.subject} ({slot.classId})
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                          <span className="whitespace-nowrap">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="whitespace-nowrap">
                            GV: <strong className="text-slate-700">{slot.teacherId}</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          {slot.meetingLink ? (
                            <a
                              href={slot.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-emerald-600 hover:text-emerald-700 underline inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <Headphones size={12} className="shrink-0" /> Vào phòng học Discord{' '}
                              <ExternalLink size={10} className="shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic whitespace-nowrap">Chưa gắn link</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap shrink-0 ${
                        slot.status === 'Đã hoàn thành'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {slot.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800 text-base">Trạng thái đơn từ</h2>
                <Link href="/student/requests" className="text-xs font-semibold text-emerald-600 hover:text-emerald-800">
                  Gửi đơn mới
                </Link>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {requests.slice(0, 4).map(req => (
                  <div key={req.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {req.type === 'XIN_NGHI' ? 'Nghỉ học' : 'Đổi lịch'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === 'ĐÃ_DUYỆT'
                            ? 'bg-emerald-100 text-emerald-700'
                            : req.status === 'TỪ_CHỐI'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-2">{req.reason}</p>
                    {req.reviewNote && (
                      <p className="text-[11px] text-indigo-600 italic bg-white p-1.5 rounded border border-slate-100">
                        Thầy/cô: {req.reviewNote}
                      </p>
                    )}
                  </div>
                ))}

                {requests.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">Chưa gửi đơn xin phép nào.</div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Modal Cập Nhật Discord ID Của Học Sinh */}
        {showEditDiscord && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                    <Hash size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Liên Kết Discord Cá Nhân</h3>
                    <p className="text-[11px] text-slate-500">Kích hoạt tính năng bot điểm danh tự động</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditDiscord(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateDiscord} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Discord Snowflake ID *</span>
                    <button
                      type="button"
                      onClick={() => setShowDiscordGuide(true)}
                      className="text-emerald-700 hover:underline font-normal text-[10px]"
                    >
                      Hướng dẫn lấy ID
                    </button>
                  </label>
                  <input
                    type="text"
                    placeholder="Chuỗi 18-19 số (VD: 852012345678901234)"
                    value={discordInput}
                    onChange={e => setDiscordInput(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-emerald-600 text-xs font-mono"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Để trống nếu muốn hủy liên kết tài khoản Discord hiện tại.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discord Username (Tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="Tên tài khoản Discord của bạn (VD: hoangnam_dev)"
                    value={discordUsernameInput}
                    onChange={e => setDiscordUsernameInput(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-emerald-600 text-xs"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditDiscord(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={savingDiscord}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs disabled:opacity-50"
                  >
                    {savingDiscord ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Hướng Dẫn Lấy Snowflake ID Cho Học Sinh */}
        {showDiscordGuide && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
                    <Hash size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Hướng Dẫn Lấy Discord Snowflake ID</h3>
                    <p className="text-[11px] text-slate-500">3 bước đơn giản để kích hoạt điểm danh tự động</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDiscordGuide(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs overflow-y-auto">
                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Bật Chế Độ Nhà Phát Triển (Developer Mode)</h4>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      Mở ứng dụng Discord → Vào <strong>Cài đặt người dùng (User Settings)</strong> (biểu tượng bánh răng ⚙️ ở dưới cùng bên trái) → Chọn mục <strong>Nâng cao (Advanced)</strong> → Bật <strong>Chế độ nhà phát triển (Developer Mode)</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Sao Chép Snowflake ID Cá Nhân</h4>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      Nhấp chuột phải vào ảnh đại diện (avatar) hoặc tên của bạn trên Discord → Chọn dòng cuối cùng:{' '}
                      <strong>"Sao chép ID người dùng" (Copy User ID)</strong>.
                    </p>
                    <p className="text-[11px] text-emerald-700 font-mono mt-1">
                      Snowflake ID là chuỗi số dài khoảng 18-19 số, ví dụ: <code>852012345678901234</code>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Dán ID Vào Ô Liên Kết</h4>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      Dán chuỗi số vừa sao chép vào mục <strong>Discord Snowflake ID</strong> rồi nhấn <strong>Lưu Thay Đổi</strong>. Bot học tập sẽ tự động điểm danh khi bạn tham gia kênh thoại lớp học!
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setShowDiscordGuide(false)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
