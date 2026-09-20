import { HomeworkTask, HomeworkSubmission } from '@/types/homework';
import { AppNotification } from '@/types/notification';
import { IRepository } from './IRepository';
import { User } from '@/types/auth';
import { Student } from '@/types/student';
import { Teacher } from '@/types/teacher';
import { Classroom, ClassEntity } from '@/types/classroom';
import { ScheduleSlot, ClassRequest } from '@/types/schedule';
import { AttendanceRecord } from '@/types/attendance';
import { TuitionInvoice, PayrollRecord } from '@/types/finance';
import { AuditLog } from '@/types/audit';
import { generateSeedData } from './seeds/seedData';

export class LocalRepository implements IRepository {
  private static instance: LocalRepository;

  private users: Map<string, User> = new Map();
  private students: Map<string, Student> = new Map();
  private teachers: Map<string, Teacher> = new Map();
  private classrooms: Map<string, Classroom> = new Map();
  private classes: Map<string, ClassEntity> = new Map();
  private scheduleSlots: Map<string, ScheduleSlot> = new Map();
  private attendanceRecords: Map<string, AttendanceRecord> = new Map();
  private classRequests: Map<string, ClassRequest> = new Map();
  private tuitionInvoices: Map<string, TuitionInvoice> = new Map();
  private payrollRecords: Map<string, PayrollRecord> = new Map();
  private auditLogs: AuditLog[] = [];
  private notifications: Map<string, AppNotification> = new Map();
  private homeworkTasks: Map<string, HomeworkTask> = new Map();
  private homeworkSubmissions: Map<string, HomeworkSubmission> = new Map();

  private isInitialized = false;

  private constructor() {
    this.init();
  }

  public static getInstance(): LocalRepository {
    if (!LocalRepository.instance) {
      LocalRepository.instance = new LocalRepository();
    }
    return LocalRepository.instance;
  }

  private init() {
    if (this.isInitialized) return;
    const seed = generateSeedData();

    seed.users.forEach(u => this.users.set(u.id, u));
    seed.students.forEach(s => this.students.set(s.id, s));
    seed.teachers.forEach(t => this.teachers.set(t.id, t));
    seed.classrooms.forEach(c => this.classrooms.set(c.id, c));
    seed.classes.forEach(cl => this.classes.set(cl.id, cl));
    seed.scheduleSlots.forEach(ss => this.scheduleSlots.set(ss.id, ss));
    seed.attendanceRecords.forEach(ar => this.attendanceRecords.set(ar.id, ar));
    seed.classRequests.forEach(cr => this.classRequests.set(cr.id, cr));
    seed.tuitionInvoices.forEach(ti => this.tuitionInvoices.set(ti.id, ti));
    seed.payrollRecords.forEach(pr => this.payrollRecords.set(pr.id, pr));
    this.auditLogs = [...seed.auditLogs];


    this.seedHomework();
    this.isInitialized = true;
  }

  public async resetData(): Promise<void> {
    this.users.clear();
    this.students.clear();
    this.teachers.clear();
    this.classrooms.clear();
    this.classes.clear();
    this.scheduleSlots.clear();
    this.attendanceRecords.clear();
    this.classRequests.clear();
    this.tuitionInvoices.clear();
    this.payrollRecords.clear();
    this.auditLogs = [];
    this.isInitialized = false;
    this.init();
  }

  // Users
  public async getUserById(id: string): Promise<User | null> {
    const clean = id.trim().toUpperCase();
    if (this.users.has(clean)) return this.users.get(clean) || null;
    for (const u of this.users.values()) {
      if (u.id.toUpperCase() === clean || u.username.toUpperCase() === clean) {
        return u;
      }
    }
    return null;
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    const clean = username.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === clean || u.id.toLowerCase() === clean) {
        return u;
      }
    }
    return null;
  }

  public async authenticate(username: string, passwordHash: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user || !user.isActive) return null;
    if (user.passwordHash === passwordHash) {
      return user;
    }
    return null;
  }

  public async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  public async updateUser(user: User): Promise<User> {
    this.users.set(user.id, { ...user });
    return user;
  }

  public async createUser(user: User): Promise<User> {
    this.users.set(user.id, { ...user });
    return user;
  }

  public async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Students
  public async getStudentById(id: string): Promise<Student | null> {
    return this.students.get(id) || null;
  }

  public async getAllStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  public async updateStudent(student: Student): Promise<Student> {
    this.students.set(student.id, { ...student });
    return student;
  }

  public async createStudent(student: Student): Promise<Student> {
    this.students.set(student.id, { ...student });
    return student;
  }

  public async deleteStudent(id: string): Promise<boolean> {
    return this.students.delete(id);
  }

  // Teachers
  public async getTeacherById(id: string): Promise<Teacher | null> {
    return this.teachers.get(id) || null;
  }

  public async getAllTeachers(): Promise<Teacher[]> {
    return Array.from(this.teachers.values());
  }

  public async updateTeacher(teacher: Teacher): Promise<Teacher> {
    this.teachers.set(teacher.id, { ...teacher });
    return teacher;
  }

  public async createTeacher(teacher: Teacher): Promise<Teacher> {
    this.teachers.set(teacher.id, { ...teacher });
    return teacher;
  }

  public async deleteTeacher(id: string): Promise<boolean> {
    return this.teachers.delete(id);
  }

  // Classrooms & Classes
  public async getAllClassrooms(): Promise<Classroom[]> {
    return Array.from(this.classrooms.values());
  }

  public async getClassroomById(id: string): Promise<Classroom | null> {
    return this.classrooms.get(id) || null;
  }

  public async getAllClasses(): Promise<ClassEntity[]> {
    return Array.from(this.classes.values());
  }

  public async getClassById(id: string): Promise<ClassEntity | null> {
    return this.classes.get(id) || null;
  }

  public async getClassesByTeacherId(teacherId: string): Promise<ClassEntity[]> {
    return Array.from(this.classes.values()).filter(c => c.teacherId === teacherId);
  }

  public async getClassesByStudentId(studentId: string): Promise<ClassEntity[]> {
    return Array.from(this.classes.values()).filter(c => c.studentIds.includes(studentId));
  }

  public async updateClass(classEntity: ClassEntity): Promise<ClassEntity> {
    this.classes.set(classEntity.id, { ...classEntity });
    return classEntity;
  }

  public async createClass(classEntity: ClassEntity): Promise<ClassEntity> {
    this.classes.set(classEntity.id, { ...classEntity });
    return classEntity;
  }

  // Schedule
  public async getAllScheduleSlots(): Promise<ScheduleSlot[]> {
    return Array.from(this.scheduleSlots.values());
  }

  public async getScheduleSlotById(id: string): Promise<ScheduleSlot | null> {
    return this.scheduleSlots.get(id) || null;
  }

  public async getScheduleSlotsByTeacherId(teacherId: string): Promise<ScheduleSlot[]> {
    return Array.from(this.scheduleSlots.values()).filter(s => s.teacherId === teacherId);
  }

  public async getScheduleSlotsByClassId(classId: string): Promise<ScheduleSlot[]> {
    return Array.from(this.scheduleSlots.values()).filter(s => s.classId === classId);
  }

  public async getScheduleSlotsByStudentId(studentId: string): Promise<ScheduleSlot[]> {
    const studentClasses = await this.getClassesByStudentId(studentId);
    const classIds = new Set(studentClasses.map(c => c.id));
    return Array.from(this.scheduleSlots.values()).filter(s => classIds.has(s.classId));
  }

  public async createScheduleSlot(slot: ScheduleSlot): Promise<ScheduleSlot> {
    this.scheduleSlots.set(slot.id, { ...slot });
    return slot;
  }

  public async updateScheduleSlot(slot: ScheduleSlot): Promise<ScheduleSlot> {
    this.scheduleSlots.set(slot.id, { ...slot });
    return slot;
  }

  // Attendance
  public async getAttendanceBySlotId(slotId: string): Promise<AttendanceRecord[]> {
    return Array.from(this.attendanceRecords.values()).filter(a => a.scheduleSlotId === slotId);
  }

  public async getAttendanceByStudentId(studentId: string): Promise<AttendanceRecord[]> {
    return Array.from(this.attendanceRecords.values()).filter(a => a.studentId === studentId);
  }

  public async getAttendanceByClassId(classId: string): Promise<AttendanceRecord[]> {
    return Array.from(this.attendanceRecords.values()).filter(a => a.classId === classId);
  }

  public async saveAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
    this.attendanceRecords.set(record.id, { ...record });
    return record;
  }

  public async saveAttendanceBatch(records: AttendanceRecord[]): Promise<AttendanceRecord[]> {
    records.forEach(r => this.attendanceRecords.set(r.id, { ...r }));
    return records;
  }

  // Requests
  public async getAllRequests(): Promise<ClassRequest[]> {
    return Array.from(this.classRequests.values());
  }

  public async getRequestById(id: string): Promise<ClassRequest | null> {
    return this.classRequests.get(id) || null;
  }

  public async getRequestsByStudentId(studentId: string): Promise<ClassRequest[]> {
    return Array.from(this.classRequests.values()).filter(r => r.studentId === studentId);
  }

  public async getRequestsByTeacherId(teacherId: string): Promise<ClassRequest[]> {
    const teacherClasses = await this.getClassesByTeacherId(teacherId);
    const classIds = new Set(teacherClasses.map(c => c.id));
    return Array.from(this.classRequests.values()).filter(r => classIds.has(r.classId));
  }

  public async createRequest(request: ClassRequest): Promise<ClassRequest> {
    this.classRequests.set(request.id, { ...request });
    return request;
  }

  public async updateRequest(request: ClassRequest): Promise<ClassRequest> {
    this.classRequests.set(request.id, { ...request });
    return request;
  }

  // Finance
  public async getAllTuitionInvoices(): Promise<TuitionInvoice[]> {
    return Array.from(this.tuitionInvoices.values());
  }

  public async getTuitionInvoicesByStudentId(studentId: string): Promise<TuitionInvoice[]> {
    return Array.from(this.tuitionInvoices.values()).filter(t => t.studentId === studentId);
  }

  public async getTuitionInvoiceById(id: string): Promise<TuitionInvoice | null> {
    return this.tuitionInvoices.get(id) || null;
  }

  
  public async createTuitionInvoice(invoice: TuitionInvoice): Promise<TuitionInvoice> {
    this.tuitionInvoices.set(invoice.id, invoice);
    return invoice;
  }

  public async updateTuitionInvoice(invoice: TuitionInvoice): Promise<TuitionInvoice> {
    this.tuitionInvoices.set(invoice.id, { ...invoice });
    return invoice;
  }

  public async getAllPayrollRecords(month?: string): Promise<PayrollRecord[]> {
    const list = Array.from(this.payrollRecords.values());
    if (month) {
      return list.filter(p => p.month === month);
    }
    return list;
  }

  public async getPayrollByTeacherId(teacherId: string, month?: string): Promise<PayrollRecord | null> {
    for (const p of this.payrollRecords.values()) {
      if (p.teacherId === teacherId && (!month || p.month === month)) {
        return p;
      }
    }
    return null;
  }

  public async updatePayrollRecord(record: PayrollRecord): Promise<PayrollRecord> {
    this.payrollRecords.set(record.id, { ...record });
    return record;
  }

  public async savePayrollRecord(record: PayrollRecord): Promise<PayrollRecord> {
    this.payrollRecords.set(record.id, { ...record });
    return record;
  }

  // Notifications
  public async getNotifications(userId?: string, role?: string): Promise<AppNotification[]> {
    const all = Array.from(this.notifications.values());
    return all.filter(n => {
      if (n.recipientRole === 'ALL') return true;
      if (role && n.recipientRole === role) return true;
      if (userId && n.recipientUserId === userId) return true;
      return false;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async addNotification(notification: Omit<AppNotification, 'id' | 'createdAt'>): Promise<AppNotification> {
    const id = `NOTIF_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const full: AppNotification = {
      ...notification,
      id,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(id, full);
    return full;
  }

  public async markNotificationAsRead(id: string): Promise<boolean> {
    const n = this.notifications.get(id);
    if (n) {
      n.isRead = true;
      return true;
    }
    return false;
  }

  public async markAllNotificationsAsRead(userId?: string): Promise<boolean> {
    for (const n of this.notifications.values()) {
      if (!userId || n.recipientUserId === userId || n.recipientRole === 'ALL') {
        n.isRead = true;
      }
    }
    return true;
  }

  // Audit Logs
  public async getAllAuditLogs(): Promise<AuditLog[]> {
    return [...this.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const newLog: AuditLog = {
      ...log,
      id: `AUD${(this.auditLogs.length + 1).toString().padStart(4, '0')}`,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(newLog);
    return newLog;
  }

  // Homework Seeds & CRUD
  private seedHomework() {
    const now = new Date();
    const plus3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const plus5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const minus1Day = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const minus2Days = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const tasks: HomeworkTask[] = [
      {
        id: 'HW0001',
        classId: 'CLS01',
        title: 'Bài 01: Phác thảo dáng người cơ bản',
        description: 'Vẽ 5 dáng người động tác khác nhau bằng chì 2B hoặc 4B trên giấy A3 hoặc Digital. Chú ý trục cơ thể và tỷ lệ đầu-thân.',
        deadline: plus3Days,
        createdBy: 'TEA001',
        createdAt: minus2Days,
      },
      {
        id: 'HW0002',
        classId: 'CLS01',
        title: 'Bài 02: Đánh bóng khối cầu & khối lập phương',
        description: 'Luyện sắc độ 5 bậc (đậm, trung gian, sáng, phản quang, bóng đổ). Chất liệu chì than hoặc than mềm.',
        deadline: minus1Day,
        createdBy: 'TEA001',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'HW0003',
        classId: 'CLS02',
        title: 'Bài 01: Phối màu sắc độ cảnh hoàng hôn',
        description: 'Sử dụng màu nước (Watercolor) hoặc Gouache, thực hiện bài chuyển màu gradient bầu trời hoàng hôn kèm bóng cây silhouette.',
        deadline: plus5Days,
        createdBy: 'TEA002',
        createdAt: minus1Day,
      }
    ];

    tasks.forEach(t => this.homeworkTasks.set(t.id, t));

    const submissions: HomeworkSubmission[] = [
      {
        id: 'SUB0001',
        taskId: 'HW0001',
        studentId: 'ST001',
        submittedAt: minus1Day,
        status: 'DA_NOP',
        discordMessageUrl: 'https://discord.com/channels/123456789/987654321/100000001',
        note: 'Em nộp bài phác thảo 5 dáng người ạ. Thầy nhận xét giúp em góc nghiêng 3/4 nhé!',
      },
      {
        id: 'SUB0002',
        taskId: 'HW0001',
        studentId: 'ST002',
        submittedAt: minus1Day,
        status: 'CHUA_NOP',
      },
      {
        id: 'SUB0003',
        taskId: 'HW0002',
        studentId: 'ST001',
        submittedAt: minus1Day,
        status: 'DA_NOP',
        discordMessageUrl: 'https://discord.com/channels/123456789/987654321/100000002',
        note: 'Bài đánh bóng khối cầu nộp đúng hạn.',
      },
      {
        id: 'SUB0004',
        taskId: 'HW0002',
        studentId: 'ST002',
        submittedAt: now.toISOString(),
        status: 'QUA_HAN',
        discordMessageUrl: 'https://discord.com/channels/123456789/987654321/100000003',
        note: 'Em nộp muộn do máy bị lỗi lưu file ạ.',
      },
      {
        id: 'SUB0005',
        taskId: 'HW0003',
        studentId: 'ST003',
        submittedAt: now.toISOString(),
        status: 'CHUA_NOP',
      }
    ];

    submissions.forEach(s => this.homeworkSubmissions.set(s.id, s));
  }

  public async getAllHomeworkTasks(): Promise<HomeworkTask[]> {
    return Array.from(this.homeworkTasks.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getHomeworkTasksByClassId(classId: string): Promise<HomeworkTask[]> {
    return Array.from(this.homeworkTasks.values())
      .filter(t => t.classId === classId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createHomeworkTask(task: HomeworkTask): Promise<HomeworkTask> {
    const id = task.id || `HW${(this.homeworkTasks.size + 1).toString().padStart(4, '0')}`;
    const newTask: HomeworkTask = {
      ...task,
      id,
      createdAt: task.createdAt || new Date().toISOString(),
    };
    this.homeworkTasks.set(id, newTask);
    return newTask;
  }

  public async getHomeworkSubmissionsByTaskId(taskId: string): Promise<HomeworkSubmission[]> {
    return Array.from(this.homeworkSubmissions.values())
      .filter(s => s.taskId === taskId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  public async getHomeworkSubmissionsByStudentId(studentId: string): Promise<HomeworkSubmission[]> {
    return Array.from(this.homeworkSubmissions.values())
      .filter(s => s.studentId === studentId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  public async upsertHomeworkSubmission(submission: HomeworkSubmission): Promise<HomeworkSubmission> {
    let existingKey: string | undefined;
    if (submission.id && this.homeworkSubmissions.has(submission.id)) {
      existingKey = submission.id;
    } else {
      for (const [key, val] of this.homeworkSubmissions.entries()) {
        if (val.taskId === submission.taskId && val.studentId === submission.studentId) {
          existingKey = key;
          break;
        }
      }
    }

    const id = existingKey || submission.id || `SUB${(this.homeworkSubmissions.size + 1).toString().padStart(4, '0')}`;
    const updated: HomeworkSubmission = {
      ...submission,
      id,
      submittedAt: submission.submittedAt || new Date().toISOString(),
    };

    this.homeworkSubmissions.set(id, updated);
    return updated;
  }
}

export const localRepo = LocalRepository.getInstance();
