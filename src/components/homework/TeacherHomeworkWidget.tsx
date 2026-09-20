'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/common/Modal';
import { HomeworkTask, HomeworkSubmission } from '@/types/homework';
import { Plus, BookOpen, Clock, Users, CheckCircle, AlertCircle, ExternalLink, Calendar, ChevronRight } from 'lucide-react';

interface TeacherHomeworkWidgetProps {
  teacherId?: string;
  defaultClassId?: string;
  title?: string;
}

export function TeacherHomeworkWidget({
  teacherId,
  defaultClassId,
  title = 'Quản lý & Giao bài tập vẽ',
}: TeacherHomeworkWidgetProps) {
  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Giao bài
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(defaultClassId || '');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Chi tiết Nộp bài
  const [inspectTask, setInspectTask] = useState<HomeworkTask | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, classesRes, subsRes, studentsRes] = await Promise.all([
        fetch('/api/homework/tasks'),
        fetch('/api/classes'),
        fetch('/api/homework/submissions'),
        fetch('/api/students'),
      ]);

      const tasksData = await tasksRes.json();
      const classesData = await classesRes.json();
      const subsData = await subsRes.json();
      const studentsData = await studentsRes.json();

      const allTasks: HomeworkTask[] = tasksData.data || tasksData.tasks || [];
      const allClasses: any[] = classesData.classes || classesData.data || [];
      const allSubs: HomeworkSubmission[] = subsData.data || subsData.submissions || [];
      const allStudents: any[] = studentsData.students || studentsData.data || [];

      // Filter classes if teacherId provided
      let filteredClasses = allClasses;
      if (teacherId) {
        filteredClasses = allClasses.filter((c: any) => c.teacherId === teacherId);
      }

      // Filter tasks if defaultClassId provided
      let filteredTasks = allTasks;
      if (defaultClassId) {
        filteredTasks = allTasks.filter(t => t.classId === defaultClassId);
      } else if (teacherId) {
        const teacherClassIds = new Set(filteredClasses.map(c => c.id));
        filteredTasks = allTasks.filter(t => teacherClassIds.has(t.classId));
      }

      setClasses(filteredClasses);
      setTasks(filteredTasks);
      setSubmissions(allSubs);
      setStudents(allStudents);

      if (!selectedClassId && filteredClasses.length > 0) {
        setSelectedClassId(filteredClasses[0].id);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu bài tập:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teacherId, defaultClassId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !taskTitle.trim() || !taskDeadline) {
      alert('Vui lòng điền đầy đủ: Lớp học, Tiêu đề bài và Hạn nộp!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/homework/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          deadline: new Date(taskDeadline).toISOString(),
          createdBy: teacherId || 'TEACHER',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Tạo bài tập thất bại');
      }

      setIsModalOpen(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskDeadline('');
      await fetchData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tính tỷ lệ nộp bài của một task
  const getSubmissionStats = (task: HomeworkTask) => {
    const cls = classes.find(c => c.id === task.classId);
    const totalStudents = cls?.studentIds?.length || 0;
    const taskSubs = submissions.filter(s => s.taskId === task.id);
    const submittedCount = taskSubs.filter(s => s.status === 'DA_NOP').length;
    const percentage = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;

    return { totalStudents, submittedCount, percentage, taskSubs };
  };

  const formatDeadline = (deadlineStr: string) => {
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

      return { display: `${time} ${date}`, badge, isOverdue };
    } catch {
      return { display: deadlineStr, badge: '', isOverdue: false };
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Widget */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base">{title}</h2>
            <p className="text-xs text-slate-500">Theo dõi deadline và tiến độ nộp bài vẽ của học viên</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>+ Giao Bài Tập Mới</span>
        </button>
      </div>

      {/* Body Widget */}
      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Đang tải danh sách bài tập...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">Chưa có bài tập nào được giao</p>
            <p className="text-xs text-slate-400 mt-1">Bấm nút "+ Giao Bài Tập Mới" ở trên để bắt đầu giao đề bài vẽ.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => {
              const cls = classes.find(c => c.id === task.classId);
              const stats = getSubmissionStats(task);
              const { display: deadlineText, badge: timeBadge, isOverdue } = formatDeadline(task.deadline);

              return (
                <div
                  key={task.id}
                  className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all bg-white"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {cls ? `${cls.code} - ${cls.name}` : task.classId}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                            isOverdue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {deadlineText} ({timeBadge})
                        </span>
                      </div>

                      <h3 className="font-semibold text-slate-800 text-sm sm:text-base mt-1 line-clamp-1">
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Tiến độ nộp bài & Nút chi tiết */}
                    <div className="w-full md:w-56 flex flex-col justify-between pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-500 font-medium">Tiến độ nộp:</span>
                        <span className="font-bold text-slate-800">
                          {stats.submittedCount}/{stats.totalStudents} ({stats.percentage}%)
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            stats.percentage === 100
                              ? 'bg-emerald-500'
                              : stats.percentage > 50
                              ? 'bg-indigo-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, stats.percentage)}%` }}
                        />
                      </div>

                      <button
                        onClick={() => setInspectTask(task)}
                        className="w-full text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-medium py-1.5 px-2 rounded-lg border border-indigo-200 flex items-center justify-center gap-1 transition"
                      >
                        <span>Xem danh sách nộp ({stats.taskSubs.length})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL GIAO BÀI TẬP MỚI */}
      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)}>
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Giao Bài Tập Vẽ Mới
            </h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-lg font-semibold px-2 py-1"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lớp học áp dụng <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {classes.length === 0 ? (
                  <option value="">Không có lớp học nào</option>
                ) : (
                  classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} ({c.studentIds?.length || 0} học sinh)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tiêu đề bài tập <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
                placeholder="VD: Bài 03: Phác thảo góc nghiêng 3/4"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Yêu cầu & Hướng dẫn chuyên môn
              </label>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={3}
                placeholder="Chất liệu vẽ, khổ giấy, kỹ thuật phân mảng, chú ý sắc độ..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hạn nộp bài (Deadline) <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Đang tạo...' : 'Giao bài ngay'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* MODAL CHI TIẾT NỘP BÀI CỦA TASK */}
      <Modal isOpen={!!inspectTask} onClose={() => setInspectTask(null)}>
        {inspectTask && (
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">{inspectTask.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Danh sách nộp bài của học sinh lớp {inspectTask.classId}</p>
              </div>
              <button
                onClick={() => setInspectTask(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {(() => {
                const cls = classes.find(c => c.id === inspectTask.classId);
                const classStudentIds: string[] = cls?.studentIds || [];
                const taskSubs = submissions.filter(s => s.taskId === inspectTask.id);

                if (classStudentIds.length === 0 && taskSubs.length === 0) {
                  return <p className="text-center text-xs text-slate-400 py-6">Không có dữ liệu học viên trong lớp.</p>;
                }

                // Show all enrolled students
                return classStudentIds.map(stId => {
                  const student = students.find(s => s.id === stId);
                  const sub = taskSubs.find(s => s.studentId === stId);
                  const isSubmitted = sub?.status === 'DA_NOP';
                  const isOverdue = sub?.status === 'QUA_HAN';

                  return (
                    <div
                      key={stId}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs sm:text-sm"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{student?.name || stId}</span>
                        <span className="text-slate-400 ml-2">({stId})</span>
                        {sub?.note && (
                          <p className="text-xs text-slate-500 italic mt-0.5">"{sub.note}"</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isSubmitted ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Đã nộp
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Quá hạn
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Chưa nộp
                          </span>
                        )}

                        {sub?.discordMessageUrl && (
                          <a
                            href={sub.discordMessageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5 font-medium"
                          >
                            <span>Bài vẽ</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => setInspectTask(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
