import { createHash } from 'node:crypto';
import { IRepository } from '@/repositories/IRepository';
import { User, Role, SessionContext, PermissionAction, Resource } from '@/types/auth';

export class AuthService {
  constructor(private repo: IRepository) {}

  public hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  public async authenticate(username: string, passwordPlain: string): Promise<User | null> {
    const hash = this.hashPassword(passwordPlain);
    if (typeof this.repo.authenticate === 'function') {
      return await this.repo.authenticate(username, hash);
    }
    const user = await this.repo.getUserByUsername(username);
    if (!user || !user.isActive) return null;
    if (user.passwordHash === hash) {
      return user;
    }
    return null;
  }

  /**
   * Kiểm tra quyền RBAC: Role có được thực hiện Action trên Resource hay không?
   */
  public checkPermission(role: Role, action: PermissionAction, resource: Resource): boolean {
    if (role === 'ADMIN') {
      return true; // Admin có toàn quyền
    }

    if (role === 'TEACHER') {
      switch (resource) {
        case 'SCHEDULE':
          return ['READ', 'UPDATE'].includes(action);
        case 'ATTENDANCE':
          return ['READ', 'CREATE', 'UPDATE'].includes(action);
        case 'CLASSROOM':
          return action === 'READ';
        case 'STUDENT':
          return action === 'READ';
        case 'TEACHER':
          return action === 'READ';
        case 'PAYROLL':
          return action === 'READ';
        case 'REQUEST':
          return ['READ', 'UPDATE', 'APPROVE'].includes(action);
        case 'TUITION':
          return false; // Giáo viên không được truy cập thông tin học phí tài chính nhạy cảm
        case 'AUDIT':
          return false; // Chỉ admin xem audit
        default:
          return false;
      }
    }

    if (role === 'STUDENT') {
      switch (resource) {
        case 'SCHEDULE':
          return action === 'READ';
        case 'ATTENDANCE':
          return action === 'READ';
        case 'CLASSROOM':
          return action === 'READ';
        case 'STUDENT':
          return ['READ', 'UPDATE'].includes(action);
        case 'REQUEST':
          return ['READ', 'CREATE'].includes(action);
        case 'TUITION':
          return ['READ', 'UPDATE'].includes(action); // Update khi nộp tiền/QR
        case 'TEACHER':
          return action === 'READ';
        case 'PAYROLL':
        case 'AUDIT':
          return false;
        default:
          return false;
      }
    }

    return false;
  }

  /**
   * Data Isolation Guard:
   * Ngăn chặn việc User role này truy cập dữ liệu của User khác.
   */
  public canAccessStudentData(currentUser: User, targetStudentId: string): boolean {
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'STUDENT') {
      return currentUser.id === targetStudentId;
    }
    // Teacher: chỉ được xem nếu student nằm trong lớp mình dạy (sẽ check thêm qua Repo nếu cần)
    return true;
  }

  public async canTeacherManageClass(currentUser: User, classId: string): Promise<boolean> {
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role !== 'TEACHER') return false;
    const cls = await this.repo.getClassById(classId);
    return cls?.teacherId === currentUser.id;
  }

  public async canTeacherManageSchedule(currentUser: User, slotId: string): Promise<boolean> {
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role !== 'TEACHER') return false;
    const slot = await this.repo.getScheduleSlotById(slotId);
    return slot?.teacherId === currentUser.id;
  }
}
