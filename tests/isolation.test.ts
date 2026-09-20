import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalRepository } from '../src/repositories/LocalRepository';
import { AuthService } from '../src/services/AuthService';
import { User } from '../src/types/auth';

test('Isolation Suite: Đảm bảo cách ly dữ liệu giữa các User', async (t) => {
  const repo = LocalRepository.getInstance();
  const authService = new AuthService(repo);

  await t.test('Sinh viên A không được truy cập dữ liệu của Sinh viên B', async () => {
    const studentUserA: User = {
      id: 'ST001',
      username: 'st001',
      passwordHash: '',
      role: 'STUDENT',
      name: 'Nguyễn Văn A',
      email: 'st001@hocvien.edu.vn',
      isActive: true,
    };

    // Truy cập chính mình -> cho phép
    assert.equal(authService.canAccessStudentData(studentUserA, 'ST001'), true);

    // Truy cập sinh viên khác -> bị chặn
    assert.equal(authService.canAccessStudentData(studentUserA, 'ST002'), false);
    assert.equal(authService.canAccessStudentData(studentUserA, 'ST010'), false);
  });

  await t.test('Giáo viên chỉ được thao tác trên các lớp học mình được phân công', async () => {
    const teacher1User: User = {
      id: 'GV001',
      username: 'gv001',
      passwordHash: '',
      role: 'TEACHER',
      name: 'Thầy GV001',
      email: 'gv001@trungtam.edu.vn',
      isActive: true,
    };

    // Tìm lớp mà GV001 phụ trách và lớp mà GV khác phụ trách
    const gv1Classes = await repo.getClassesByTeacherId('GV001');
    assert.ok(gv1Classes.length > 0, 'GV001 phải có ít nhất 1 lớp');
    const myClassId = gv1Classes[0].id;

    const allClasses = await repo.getAllClasses();
    const otherClass = allClasses.find(c => c.teacherId !== 'GV001');
    assert.ok(otherClass, 'Phải có lớp của GV khác');

    // Thao tác lớp của chính mình -> OK
    const canManageMyClass = await authService.canTeacherManageClass(teacher1User, myClassId);
    assert.equal(canManageMyClass, true, 'GV001 phải quản lý được lớp của mình');

    // Thao tác lớp của GV khác -> BỊ CHẶN
    const canManageOtherClass = await authService.canTeacherManageClass(teacher1User, otherClass.id);
    assert.equal(canManageOtherClass, false, 'GV001 không được thao tác lớp của GV khác');
  });

  await t.test('Admin có quyền truy cập toàn bộ dữ liệu học viên', () => {
    const adminUser: User = {
      id: 'ADMIN001',
      username: 'admin',
      passwordHash: '',
      role: 'ADMIN',
      name: 'Admin',
      email: 'admin@trungtam.edu.vn',
      isActive: true,
    };

    assert.equal(authService.canAccessStudentData(adminUser, 'ST001'), true);
    assert.equal(authService.canAccessStudentData(adminUser, 'ST099'), true);
    assert.equal(authService.canAccessStudentData(adminUser, 'ST400'), true);
  });
});
