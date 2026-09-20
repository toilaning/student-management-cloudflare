import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalRepository } from '../src/repositories/LocalRepository';
import { AuthService } from '../src/services/AuthService';

test('RBAC Suite: Phân quyền truy cập theo vai trò', async (t) => {
  const repo = LocalRepository.getInstance();
  const authService = new AuthService(repo);

  await t.test('Admin có toàn quyền trên tất cả tài nguyên', () => {
    const resources = ['STUDENT', 'TEACHER', 'CLASSROOM', 'SCHEDULE', 'ATTENDANCE', 'PAYROLL', 'TUITION', 'AUDIT', 'REQUEST'] as const;
    const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'] as const;

    for (const res of resources) {
      for (const act of actions) {
        assert.equal(authService.checkPermission('ADMIN', act, res), true, `Admin phải có quyền ${act} trên ${res}`);
      }
    }
  });

  await t.test('Teacher có quyền trên Lịch dạy, Điểm danh, Đơn từ nhưng KHÔNG được xem Tài chính, Audit', () => {
    // Quyền hợp lệ
    assert.equal(authService.checkPermission('TEACHER', 'READ', 'SCHEDULE'), true);
    assert.equal(authService.checkPermission('TEACHER', 'UPDATE', 'SCHEDULE'), true);
    assert.equal(authService.checkPermission('TEACHER', 'READ', 'ATTENDANCE'), true);
    assert.equal(authService.checkPermission('TEACHER', 'CREATE', 'ATTENDANCE'), true);
    assert.equal(authService.checkPermission('TEACHER', 'UPDATE', 'ATTENDANCE'), true);
    assert.equal(authService.checkPermission('TEACHER', 'APPROVE', 'REQUEST'), true);
    assert.equal(authService.checkPermission('TEACHER', 'READ', 'PAYROLL'), true);

    // Bị cấm
    assert.equal(authService.checkPermission('TEACHER', 'DELETE', 'STUDENT'), false);
    assert.equal(authService.checkPermission('TEACHER', 'READ', 'TUITION'), false);
    assert.equal(authService.checkPermission('TEACHER', 'UPDATE', 'TUITION'), false);
    assert.equal(authService.checkPermission('TEACHER', 'READ', 'AUDIT'), false);
  });

  await t.test('Student chỉ có quyền xem lịch, nộp đơn, xem học phí cá nhân và bị cấm Audit, Payroll', () => {
    // Quyền hợp lệ
    assert.equal(authService.checkPermission('STUDENT', 'READ', 'SCHEDULE'), true);
    assert.equal(authService.checkPermission('STUDENT', 'READ', 'ATTENDANCE'), true);
    assert.equal(authService.checkPermission('STUDENT', 'CREATE', 'REQUEST'), true);
    assert.equal(authService.checkPermission('STUDENT', 'READ', 'TUITION'), true);
    assert.equal(authService.checkPermission('STUDENT', 'UPDATE', 'TUITION'), true);

    // Bị cấm
    assert.equal(authService.checkPermission('STUDENT', 'DELETE', 'SCHEDULE'), false);
    assert.equal(authService.checkPermission('STUDENT', 'UPDATE', 'ATTENDANCE'), false);
    assert.equal(authService.checkPermission('STUDENT', 'READ', 'PAYROLL'), false);
    assert.equal(authService.checkPermission('STUDENT', 'READ', 'AUDIT'), false);
    assert.equal(authService.checkPermission('STUDENT', 'APPROVE', 'REQUEST'), false);
  });

  await t.test('Xác thực mật khẩu và hash SHA-256', async () => {
    const admin = await authService.authenticate('admin', 'admin123');
    assert.ok(admin, 'Admin đăng nhập thành công');
    assert.equal(admin?.role, 'ADMIN');

    const wrongPass = await authService.authenticate('admin', 'wrongpass');
    assert.equal(wrongPass, null, 'Sai mật khẩu phải trả về null');

    const teacher = await authService.authenticate('gv001', 'teacher123');
    assert.ok(teacher, 'Giáo viên GV001 đăng nhập thành công');
    assert.equal(teacher?.role, 'TEACHER');

    const student = await authService.authenticate('st001', 'student123');
    assert.ok(student, 'Học viên ST001 đăng nhập thành công');
    assert.equal(student?.role, 'STUDENT');
  });
});
