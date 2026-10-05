import test from 'node:test';
import assert from 'node:assert/strict';
import { StudentService } from '../src/services/StudentService';
import type { IRepository } from '../src/repositories/IRepository';
import type { User } from '../src/types/auth';
import type { Student } from '../src/types/student';

/**
 * Bảng students có khoá ngoại students.id -> users.id.
 * Repo giả lập dưới đây chặn insert students khi chưa có user, đúng như Postgres.
 */
function createRepoWithStudentForeignKey() {
  const users = new Map<string, User>();
  const students = new Map<string, Student>();
  const auditLogs: unknown[] = [];

  const repo = {
    async getAllStudents() {
      return Array.from(students.values());
    },
    async getUserById(id: string) {
      return users.get(id) || null;
    },
    async createUser(user: User) {
      users.set(user.id, { ...user });
      return user;
    },
    async createStudent(student: Student) {
      if (!users.has(student.id)) {
        throw new Error(
          `insert or update on table "students" violates foreign key constraint "students_id_fkey"`
        );
      }
      students.set(student.id, { ...student });
      return student;
    },
    async addAuditLog(log: unknown) {
      auditLogs.push(log);
      return log as never;
    },
  };

  return {
    repo: repo as unknown as IRepository,
    users,
    students,
    auditLogs,
  };
}

test('Tạo học sinh nhanh: phải tạo tài khoản users trước hồ sơ students', async () => {
  const { repo, users, students, auditLogs } = createRepoWithStudentForeignKey();
  const service = new StudentService(repo);

  const result = await service.createStudentFastOnboarding({
    name: 'Trần Thị Kiểm Thử',
    phone: '0912345678',
    actorId: 'ADMIN001',
    actorName: 'Quản trị viên',
  });

  assert.equal(result.defaultPassword, '123456');
  assert.ok(users.has(result.student.id), 'Tài khoản đăng nhập phải tồn tại');
  assert.ok(students.has(result.student.id), 'Hồ sơ học sinh phải được tạo');
  assert.equal(users.get(result.student.id)?.role, 'STUDENT');
  assert.equal(auditLogs.length, 1, 'Phải ghi đúng một audit log');
});
