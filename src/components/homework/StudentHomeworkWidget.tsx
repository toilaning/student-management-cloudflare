'use client';

import React, { useState, useEffect } from 'react';
import { HomeworkTask, HomeworkSubmission } from '@/types/homework';
import { BookOpen, Clock, CheckCircle, AlertCircle, ExternalLink, MessageSquare, Info } from 'lucide-react';

interface StudentHomeworkWidgetProps {
  studentId: string;
}

export function StudentHomeworkWidget({ studentId }: StudentHomeworkWidgetProps) {
  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        // Lấy thông tin lớp học của học sinh
        const studentRes = await fetch(`/api/students?id=${studentId}`);
        const studentData = await studentRes.json();
        const student = studentData.student || studentData.data;
        const enrolledClassIds: string[] = student?.enrolledClassIds || [];

        // Lấy tất cả bài tập và submissions của học sinh
        const [tasksRes, subsRes, classesRes] = await Promise.all([
          fetch('/api/homework/tasks'),
          fetch(`/api/homework/submissions?studentId=${studentId}`),
          fetch('/api/classes'),
        ]);

        const tasksData = await tasksRes.json();
        const subsData = await subsRes.json();
        const classesData = await classesRes.json();

        const allTasks: HomeworkTask[] = tasksData.data || tasksData.tasks || [];
        const mySubs: HomeworkSubmission[] = subsData.data || subsData.submissions || [];
        const allClasses: any[] = classesData.classes || classesData.data || [];

        // Lọc bài tập thuộc các lớp học sinh theo học
        const myTasks = allTasks.filter(t => enrolledClassIds.includes(t.classId));

        setTasks(myTasks);
        setSubmissions(mySubs);
        setClasses(allClasses);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu bài tập học sinh:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  const formatCountdown = (deadlineStr: string) => {
    try {
      const d = new Date(deadlineStr);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

      const now = new Date();
      const diffMs = d.getTime() - now.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      let badge = '';
      let isOverdue = false;

      if (diffMs < 0) {
        isOverdue = true;
        const pastDays = Math.abs(diffDays);
        badge = pastDays === 0 ? 'Đã quá hạn vài giờ' : `Đã quá hạn ${pastDays} ngày`;
      } else if (diffDays >= 1) {
        badge = `Còn ${diffDays} ngày`;
      } else {
        badge = `Còn ${Math.max(1, diffHours)} giờ`;
      }

      return { full: `Hạn: ${time} ${date}`, countdown: badge, isOverdue };
    } catch {
      return { full: `Hạn: ${deadlineStr}`, countdown: '', isOverdue: false };
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base">Bài tập vẽ cần hoàn thành</h2>
            <p className="text-xs text-slate-500">Danh sách bài tập và deadline từ giáo viên</p>
          </div>
        </div>
      </div>

      {/* Banner hướng dẫn nộp bài Discord */}
      <div className="mx-4 sm:mx-5 mt-4 p-3.5 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 rounded-xl flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          🎨
        </div>
        <div className="text-xs sm:text-sm text-slate-700">
          <p className="font-semibold text-indigo-950">Hướng dẫn nộp bài vẽ:</p>
          <p className="text-slate-600 mt-0.5">
            Gửi ảnh bài vẽ vào kênh <span className="font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-200">#nop-bai-tap</span> trên máy chủ Discord lớp học để được thầy cô nhận xét, chấm điểm và điểm danh bài tập.
          </p>
        </div>
      </div>

      {/* Body List */}
      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Đang tải bài tập...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs sm:text-sm font-medium text-slate-600">Hiện tại bạn không có bài tập nào cần làm</p>
            <p className="text-xs text-slate-400 mt-0.5">Tuyệt vời! Hãy tiếp tục duy trì phong độ rèn luyện vẽ nhé.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {tasks.map(task => {
              const cls = classes.find(c => c.id === task.classId);
              const sub = submissions.find(s => s.taskId === task.id);
              const { full: deadlineFull, countdown, isOverdue } = formatCountdown(task.deadline);

              // Xác định status badge
              let statusBadge: { text: string; bg: string; icon: React.ReactNode };
              if (sub?.status === 'DA_NOP') {
                statusBadge = {
                  text: 'Đã nộp ✅',
                  bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
                };
              } else if (isOverdue || sub?.status === 'QUA_HAN') {
                statusBadge = {
                  text: 'Quá hạn ⚠️',
                  bg: 'bg-rose-50 text-rose-700 border-rose-200',
                  icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
                };
              } else {
                statusBadge = {
                  text: 'Chưa nộp ⏳',
                  bg: 'bg-amber-50 text-amber-700 border-amber-200',
                  icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
                };
              }

              return (
                <div
                  key={task.id}
                  className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all bg-white"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {cls ? `${cls.code} - ${cls.name}` : task.classId}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">#{task.id}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.bg}`}
                      >
                        {statusBadge.icon}
                        <span>{statusBadge.text}</span>
                      </span>
                    </div>
                  </div>

                  <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs sm:text-sm text-slate-600 mt-1.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      {task.description}
                    </p>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{deadlineFull}</span>
                      <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`}>
                        ({countdown})
                      </span>
                    </div>

                    {sub?.discordMessageUrl ? (
                      <a
                        href={sub.discordMessageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition"
                      >
                        <span>Xem bài đã nộp trên Discord</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">
                        Chưa có link bài nộp
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
