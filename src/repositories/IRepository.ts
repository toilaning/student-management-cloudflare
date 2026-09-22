import { AppNotification } from '@/types/notification';
import { User } from '@/types/auth';
import { Student } from '@/types/student';
import { Teacher } from '@/types/teacher';
import { Classroom, ClassEntity } from '@/types/classroom';
import { ScheduleSlot, ClassRequest } from '@/types/schedule';
import { AttendanceRecord } from '@/types/attendance';
import { TuitionInvoice, PayrollRecord } from '@/types/finance';
import { SessionPackage } from '@/types/package';
import { AuditLog } from '@/types/audit';

export interface IRepository {
  // Users
  getUserById(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  updateUser(user: User): Promise<User>;
  createUser(user: User): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  authenticate(username: string, passwordHash: string): Promise<User | null>;

  // Students
  getStudentById(id: string): Promise<Student | null>;
  getAllStudents(): Promise<Student[]>;
  updateStudent(student: Student): Promise<Student>;
  createStudent(student: Student): Promise<Student>;
  deleteStudent(id: string): Promise<boolean>;

  // Teachers
  getTeacherById(id: string): Promise<Teacher | null>;
  getAllTeachers(): Promise<Teacher[]>;
  updateTeacher(teacher: Teacher): Promise<Teacher>;
  createTeacher(teacher: Teacher): Promise<Teacher>;
  deleteTeacher(id: string): Promise<boolean>;

  // Classrooms & Classes
  getAllClassrooms(): Promise<Classroom[]>;
  getClassroomById(id: string): Promise<Classroom | null>;
  getAllClasses(): Promise<ClassEntity[]>;
  getClassById(id: string): Promise<ClassEntity | null>;
  getClassesByTeacherId(teacherId: string): Promise<ClassEntity[]>;
  getClassesByStudentId(studentId: string): Promise<ClassEntity[]>;
  updateClass(classEntity: ClassEntity): Promise<ClassEntity>;
  createClass(classEntity: ClassEntity): Promise<ClassEntity>;
  deleteClass(id: string): Promise<boolean>;

  // Schedule
  getAllScheduleSlots(): Promise<ScheduleSlot[]>;
  getScheduleSlotById(id: string): Promise<ScheduleSlot | null>;
  getScheduleSlotsByTeacherId(teacherId: string): Promise<ScheduleSlot[]>;
  getScheduleSlotsByClassId(classId: string): Promise<ScheduleSlot[]>;
  getScheduleSlotsByStudentId(studentId: string): Promise<ScheduleSlot[]>;
  createScheduleSlot(slot: ScheduleSlot): Promise<ScheduleSlot>;
  updateScheduleSlot(slot: ScheduleSlot): Promise<ScheduleSlot>;

  // Attendance
  getAttendanceBySlotId(slotId: string): Promise<AttendanceRecord[]>;
  getAttendanceByStudentId(studentId: string): Promise<AttendanceRecord[]>;
  getAttendanceByClassId(classId: string): Promise<AttendanceRecord[]>;
  saveAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord>;
  saveAttendanceBatch(records: AttendanceRecord[]): Promise<AttendanceRecord[]>;

  // Requests
  getAllRequests(): Promise<ClassRequest[]>;
  getRequestById(id: string): Promise<ClassRequest | null>;
  getRequestsByStudentId(studentId: string): Promise<ClassRequest[]>;
  getRequestsByTeacherId(teacherId: string): Promise<ClassRequest[]>;
  createRequest(request: ClassRequest): Promise<ClassRequest>;
  updateRequest(request: ClassRequest): Promise<ClassRequest>;

  // Session Packages
  getAllSessionPackages(): Promise<SessionPackage[]>;
  getSessionPackageById(id: string): Promise<SessionPackage | null>;
  createSessionPackage(pkg: SessionPackage): Promise<SessionPackage>;
  updateSessionPackage(pkg: SessionPackage): Promise<SessionPackage>;
  deleteSessionPackage(id: string): Promise<boolean>;

  // Finance
  getAllTuitionInvoices(): Promise<TuitionInvoice[]>;
  getTuitionInvoicesByStudentId(studentId: string): Promise<TuitionInvoice[]>;
  getTuitionInvoiceById(id: string): Promise<TuitionInvoice | null>;
  updateTuitionInvoice(invoice: TuitionInvoice): Promise<TuitionInvoice>;
  createTuitionInvoice(invoice: TuitionInvoice): Promise<TuitionInvoice>;

  getAllPayrollRecords(month?: string): Promise<PayrollRecord[]>;
  getPayrollByTeacherId(teacherId: string, month?: string): Promise<PayrollRecord | null>;
  updatePayrollRecord(record: PayrollRecord): Promise<PayrollRecord>;
  savePayrollRecord(record: PayrollRecord): Promise<PayrollRecord>;

  // Audit Logs
  getAllAuditLogs(): Promise<AuditLog[]>;
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>;

  // Notifications
  getNotifications(userId?: string, role?: string): Promise<AppNotification[]>;
  addNotification(notification: Omit<AppNotification, 'id' | 'createdAt'>): Promise<AppNotification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  markAllNotificationsAsRead(userId?: string): Promise<boolean>;

  // Reset/Re-seed
  resetData(): Promise<void>;
}
