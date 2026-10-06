import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { POST as enrollClass } from '../src/app/api/classes/enroll/route';
import { repo } from '../src/repositories';
import { ShiftService } from '../src/services/ShiftService';
import { ClassEntity } from '../src/types/classroom';

function enrollRequest(payload: Record<string, unknown>): Request {
  return new Request('http://localhost/api/classes/enroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/** Tạo lớp Thứ 2-4-6 ở ca chỉ định, ngày học riêng để không vướng lớp khác trong seed. */
async function createClass(
  id: string,
  code: string,
  shiftId: number,
  subject = 'Toán Cao Cấp',
  days: number[] = [2, 4, 6]
): Promise<ClassEntity> {
  const cls: ClassEntity = {
    id,
    code,
    name: subject + ' - Test ca ' + shiftId,
    subject,
    teacherId: 'GV001',
    roomId: 'P.101',
    studentIds: [],
    tuitionFee: 3500000,
    scheduleDays: days,
    shiftId,
    status: 'Đang mở',
  };
  await repo.createClass(cls);
  return cls;
}

async function enrollStudentInClass(studentId: string, classId: string): Promise<void> {
  const cls = await repo.getClassById(classId);
  assert.ok(cls);
  if (!cls.studentIds.includes(studentId)) {
    cls.studentIds = [...cls.studentIds, studentId];
    await repo.updateClass(cls);
  }
  const student = await repo.getStudentById(studentId);
  assert.ok(student);
  if (!student.enrolledClassIds.includes(classId)) {
    student.enrolledClassIds = [...student.enrolledClassIds, classId];
    await repo.updateStudent(student);
  }
}

describe('Học sinh đổi ca học', () => {
  before(async () => {
    await ShiftService.resetDefaults();
  });

  it('1. Đổi ca sang lớp cùng môn đã có ở ca khác', async () => {
    await createClass('CLS93', 'TESTC10', 1);
    const target = await createClass('CLS94', 'TESTC20', 2);

    const studentId = 'ST022';
    await enrollStudentInClass(studentId, 'CLS93');

    const res = await enrollClass(
      enrollRequest({ classId: 'CLS93', studentId, action: 'CHANGE_SHIFT', targetShiftId: 2 })
    );
    const data = await res.json();
    assert.ok(data.success, 'Đổi ca phải thành công: ' + JSON.stringify(data));
    assert.equal(data.createdClass, false, 'Không mở lớp mới khi lớp đích đã tồn tại');
    assert.equal(data.targetClassId, target.id, 'Chuyển đúng sang lớp đang có ở ca mới');

    const sourceAfter = await repo.getClassById('CLS93');
    const targetAfter = await repo.getClassById('CLS94');
    assert.ok(!sourceAfter?.studentIds.includes(studentId), 'Học sinh phải rời lớp cũ');
    assert.ok(targetAfter?.studentIds.includes(studentId), 'Học sinh phải có trong lớp đích');

    const studentAfter = await repo.getStudentById(studentId);
    assert.ok(!studentAfter?.enrolledClassIds.includes('CLS93'), 'Hồ sơ không còn lớp cũ');
    assert.ok(studentAfter?.enrolledClassIds.includes('CLS94'), 'Hồ sơ có lớp mới');
  });

  it('2. Tự mở lớp mới khi ca mục tiêu chưa có lớp cùng môn', async () => {
    const source = await createClass('CLS90', 'TESTC1', 1);
    const studentId = 'ST020';
    await enrollStudentInClass(studentId, source.id);

    const res = await enrollClass(
      enrollRequest({ classId: 'CLS90', studentId, action: 'CHANGE_SHIFT', targetShiftId: 4 })
    );
    const data = await res.json();
    assert.ok(data.success, 'Đổi ca phải thành công: ' + JSON.stringify(data));
    assert.equal(data.createdClass, true, 'Phải mở lớp mới cho ca chưa có lớp');

    const newClass = await repo.getClassById(data.targetClassId);
    assert.ok(newClass, 'Lớp mới phải tồn tại trong hệ thống');
    assert.equal(newClass?.subject, source.subject, 'Lớp mới cùng môn');
    assert.equal(Number(newClass?.shiftId), 4, 'Lớp mới đúng ca mục tiêu');
    assert.equal(newClass?.startTime, '15:45', 'Lớp mới dùng giờ của ca mục tiêu');
    assert.equal(newClass?.endTime, '17:45');
    assert.deepEqual(newClass?.scheduleDays, source.scheduleDays, 'Lớp mới giữ nguyên ngày học');
    assert.equal(newClass?.teacherId, source.teacherId, 'Lớp mới giữ nguyên giảng viên');
    assert.ok(newClass?.studentIds.includes(studentId), 'Học sinh nằm trong lớp mới');

    const sourceAfter = await repo.getClassById('CLS90');
    assert.ok(!sourceAfter?.studentIds.includes(studentId), 'Học sinh rời lớp cũ');

    const slots = await repo.getAllScheduleSlots();
    const newSlots = slots.filter(s => s.classId === newClass?.id);
    assert.ok(newSlots.length > 0, 'Lớp mới phải được sinh lịch học các tuần tới');
    assert.ok(
      newSlots.every(s => s.startTime === '15:45' && s.endTime === '17:45'),
      'Lịch của lớp mới phải đúng khung giờ ca mục tiêu'
    );
  });

  it('3. Từ chối đổi sang ca trùng giờ với lớp khác đang học', async () => {
    // Lớp nguồn Toán ca 1, học sinh còn học lớp Tiếng Anh ca 2 cùng ngày.
    const source = await createClass('CLS91', 'TESTC2', 1);
    await createClass('CLS92', 'TESTC3', 2, 'Tiếng Anh Giao Tiếp & IELTS');
    const studentId = 'ST021';

    await enrollStudentInClass(studentId, source.id);
    await enrollStudentInClass(studentId, 'CLS92');

    const idsBefore = new Set((await repo.getAllClasses()).map(c => c.id));

    // Đổi sang ca 2: chưa có lớp Toán ca 2, nhưng giờ ca 2 trùng lớp Tiếng Anh -> chặn.
    const res = await enrollClass(
      enrollRequest({ classId: 'CLS91', studentId, action: 'CHANGE_SHIFT', targetShiftId: 2 })
    );
    assert.equal(res.status, 409, 'Trùng giờ với lớp ca 2 phải bị chặn 409');

    const classesAfter = await repo.getAllClasses();
    const newClasses = classesAfter.filter(c => !idsBefore.has(c.id));
    assert.deepEqual(newClasses, [], 'Không được mở lớp mới khi ca bị chặn');

    const sourceAfter = await repo.getClassById('CLS91');
    assert.ok(sourceAfter?.studentIds.includes(studentId), 'Học sinh vẫn ở lớp cũ khi đổi ca thất bại');
  });

  it('4. Từ chối đổi sang chính ca đang học', async () => {
    await enrollStudentInClass('ST001', 'CLS01');
    const res = await enrollClass(
      enrollRequest({ classId: 'CLS01', studentId: 'ST001', action: 'CHANGE_SHIFT', targetShiftId: 1 })
    );
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.match(String(data.error), /đang học đúng ca này/);
  });
});
