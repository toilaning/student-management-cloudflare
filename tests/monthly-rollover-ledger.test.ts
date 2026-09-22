import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MonthlyPackageService } from '../src/services/MonthlyPackageService';
import { StudentService } from '../src/services/StudentService';
import { LedgerService } from '../src/services/LedgerService';
import { repo } from '../src/repositories';

describe('Phase 2 Core Logic Suite: Monthly Rollover, Dropout & Ledger', () => {
  it('1. Cơ chế dồn buổi học phí (Rollover) từ tháng trước sang tháng mới', async () => {
    MonthlyPackageService.clearAll();

    // Tháng 8/2026: Đăng ký gói 8 buổi
    const pkgAug = await MonthlyPackageService.registerMonthlyPackage({
      studentId: 'ST_ROLLOVER_01',
      month: '2026-08',
      packageName: 'Gói Tiêu Chuẩn 8 buổi',
      totalSessions: 8,
      price: 1200000,
      paymentStatus: 'ĐÃ_NỘP'
    });

    assert.equal(pkgAug.totalSessions, 8);
    assert.equal(pkgAug.rolloverSessions, 0);
    assert.equal(pkgAug.remainingSessions, 8);

    // Điểm danh học 6 buổi trong tháng 8 -> còn dư 2 buổi
    for (let i = 0; i < 6; i++) {
      await MonthlyPackageService.recordSessionAttendance('ST_ROLLOVER_01', '2026-08');
    }

    const pkgAugAfter = await MonthlyPackageService.getStudentPackage('ST_ROLLOVER_01', '2026-08');
    assert.equal(pkgAugAfter?.usedSessions, 6);
    assert.equal(pkgAugAfter?.remainingSessions, 2, 'Tháng 8 phải còn dư đúng 2 buổi');

    // Tháng 9/2026: Đăng ký gói mới 8 buổi -> tự động dồn 2 buổi cũ thành 10 buổi
    const pkgSep = await MonthlyPackageService.registerMonthlyPackage({
      studentId: 'ST_ROLLOVER_01',
      month: '2026-09',
      packageName: 'Gói Tiêu Chuẩn 8 buổi',
      totalSessions: 8,
      price: 1200000,
      paymentStatus: 'ĐÃ_NỘP'
    });

    assert.equal(pkgSep.totalSessions, 8);
    assert.equal(pkgSep.rolloverSessions, 2, 'Phải dồn đúng 2 buổi từ tháng 8');
    assert.equal(pkgSep.remainingSessions, 10, 'Tổng số buổi khả dụng phải là 8 + 2 = 10 buổi');

    // Điểm danh 1 buổi tháng 9 -> còn 9
    const pkgSepAfter = await MonthlyPackageService.recordSessionAttendance('ST_ROLLOVER_01', '2026-09');
    assert.equal(pkgSepAfter?.usedSessions, 1);
    assert.equal(pkgSepAfter?.remainingSessions, 9);
  });

  it('2. Cơ chế xử lý học sinh nghỉ học (Drop-out) tự động khóa tài khoản & đối soát buổi', async () => {
    // Tạo nhanh 1 học sinh test
    const studentId = 'ST_DROPOUT_TEST';
    await repo.createStudent({
      id: studentId,
      name: 'Nguyễn Văn Nghỉ Học',
      phone: '0912334455',
      status: 'Đang học',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await repo.createUser({
      id: 'USR_DROPOUT_TEST',
      username: studentId,
      passwordHash: 'hash123',
      role: 'STUDENT',
      studentId: studentId,
      name: 'Nguyễn Văn Nghỉ Học',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const st = { student: { id: studentId, name: 'Nguyễn Văn Nghỉ Học' } };

    // Đăng ký gói tháng hiện tại
    const currentMonth = new Date().toISOString().substring(0, 7);
    await MonthlyPackageService.registerMonthlyPackage({
      studentId: st.student.id,
      month: currentMonth,
      packageName: 'Gói 12 buổi',
      totalSessions: 12,
      price: 1800000,
      paymentStatus: 'ĐÃ_NỘP'
    });

    // Học 3 buổi
    await MonthlyPackageService.recordSessionAttendance(st.student.id, currentMonth);
    await MonthlyPackageService.recordSessionAttendance(st.student.id, currentMonth);
    await MonthlyPackageService.recordSessionAttendance(st.student.id, currentMonth);

    // Admin chuyển trạng thái học sinh sang "Đã nghỉ học"
    const res = await StudentService.updateStudentStatus(st.student.id, 'Đã nghỉ học', 'Chuyển trường định cư');
    
    assert.equal(res.student.status, 'Đã nghỉ học');
    assert.ok(res.dropoutAudit, 'Phải có báo cáo dropout');
    assert.equal(res.dropoutAudit.accountLocked, true, 'Tài khoản phải bị khóa');
    assert.equal(res.dropoutAudit.remainingSessions, 9, 'Còn dư 9 buổi (12 - 3)');

    // Kiểm tra tài khoản user bị khóa
    const allUsers = await repo.getAllUsers();
    const user = allUsers.find(u => u.studentId === st.student.id);
    assert.equal(user?.isActive, false, 'User isActive phải bằng false');
  });

  it('3. Sổ Thu - Chi tài chính (Ledger) và chấm công giáo viên theo ca', async () => {
    LedgerService.clearAll();

    // Thêm 2 khoản chi nhập tay
    const exp1 = await LedgerService.addExpense({
      title: 'Tiền điện & nước tháng 09/2026',
      amount: 1500000,
      category: 'Vận hành',
      expenseDate: '2026-09-10'
    });

    const exp2 = await LedgerService.addExpense({
      title: 'Mua bảng vẽ và bút điện tử mới',
      amount: 3500000,
      category: 'Thiết bị',
      expenseDate: '2026-09-15'
    });

    assert.ok(exp1.id);
    assert.ok(exp2.id);

    // Tính toán báo cáo thu chi tháng 09/2026
    const ledger = await LedgerService.calculateMonthlyLedger('2026-09');

    assert.equal(ledger.month, '2026-09');
    assert.equal(ledger.totalManualExpense, 5000000, 'Chi ngoài phải bằng 1.5M + 3.5M = 5.0M');
    assert.ok(ledger.totalTeacherExpense >= 0, 'Chi lương giáo viên phải >= 0');
    assert.equal(ledger.totalExpense, ledger.totalTeacherExpense + ledger.totalManualExpense);

    // Kiểm tra Timesheet của giáo viên
    const timesheets = await LedgerService.getTeacherTimesheets('2026-09');
    assert.ok(Array.isArray(timesheets));
    assert.ok(timesheets.length > 0, 'Phải có danh sách chấm công giáo viên');
  });
});
