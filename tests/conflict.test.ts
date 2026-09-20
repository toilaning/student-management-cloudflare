import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalRepository } from '../src/repositories/LocalRepository';
import { ConflictEngine } from '../src/services/ConflictEngine';
import { ScheduleSlot } from '../src/types/schedule';

test('ConflictEngine Suite: Phát hiện xung đột lịch học', async (t) => {
  const repo = LocalRepository.getInstance();
  const conflictEngine = new ConflictEngine(repo);

  // Lấy 1 slot đã có trong dữ liệu làm mốc thử nghiệm
  const existingSlots = await repo.getAllScheduleSlots();
  assert.ok(existingSlots.length > 0, 'Phải có slots lịch học');
  const baseSlot = existingSlots[0];

  await t.test('1. Phát hiện trùng giáo viên khi dạy 2 nơi cùng 1 ca', async () => {
    const conflictingSlot: Omit<ScheduleSlot, 'id'> = {
      classId: 'CLS_OTHER',
      teacherId: baseSlot.teacherId, // Cùng giáo viên
      roomId: 'P.ROOM_DIFF',          // Phòng khác
      date: baseSlot.date,           // Cùng ngày
      shiftId: baseSlot.shiftId,     // Cùng ca
      startTime: baseSlot.startTime,
      endTime: baseSlot.endTime,
      subject: 'Môn Khác',
      status: 'Đã lên lịch',
    };

    const result = await conflictEngine.checkScheduleConflict(conflictingSlot);
    assert.equal(result.hasConflict, true, 'Phải báo có xung đột');
    const teacherConflict = result.conflicts.find(c => c.type === 'TEACHER_CONFLICT');
    assert.ok(teacherConflict, 'Phải có lỗi TEACHER_CONFLICT');
  });

  await t.test('2. Phát hiện trùng phòng học khi 2 lớp dùng chung phòng cùng 1 ca', async () => {
    const conflictingSlot: Omit<ScheduleSlot, 'id'> = {
      classId: 'CLS_OTHER',
      teacherId: 'GV_OTHER',         // Giáo viên khác
      roomId: baseSlot.roomId,       // Cùng phòng học
      date: baseSlot.date,           // Cùng ngày
      shiftId: baseSlot.shiftId,     // Cùng ca
      startTime: baseSlot.startTime,
      endTime: baseSlot.endTime,
      subject: 'Môn Khác',
      status: 'Đã lên lịch',
    };

    const result = await conflictEngine.checkScheduleConflict(conflictingSlot);
    assert.equal(result.hasConflict, true, 'Phải báo có xung đột phòng học');
    const roomConflict = result.conflicts.find(c => c.type === 'ROOM_CONFLICT');
    assert.ok(roomConflict, 'Phải có lỗi ROOM_CONFLICT');
  });

  await t.test('3. Phát hiện trùng lớp khi 1 lớp bị xếp 2 môn trong cùng 1 ca', async () => {
    const conflictingSlot: Omit<ScheduleSlot, 'id'> = {
      classId: baseSlot.classId,     // Cùng lớp học
      teacherId: 'GV_OTHER',         // Giáo viên khác
      roomId: 'P.ROOM_DIFF',         // Phòng khác
      date: baseSlot.date,           // Cùng ngày
      shiftId: baseSlot.shiftId,     // Cùng ca
      startTime: baseSlot.startTime,
      endTime: baseSlot.endTime,
      subject: 'Toán học nâng cao',
      status: 'Đã lên lịch',
    };

    const result = await conflictEngine.checkScheduleConflict(conflictingSlot);
    assert.equal(result.hasConflict, true, 'Phải báo có xung đột lớp');
    const classConflict = result.conflicts.find(c => c.type === 'CLASS_CONFLICT');
    assert.ok(classConflict, 'Phải có lỗi CLASS_CONFLICT');
  });

  await t.test('4. Không báo lỗi nếu khác ngày hoặc khác ca học', async () => {
    const validSlotDiffDate: Omit<ScheduleSlot, 'id'> = {
      classId: baseSlot.classId,
      teacherId: baseSlot.teacherId,
      roomId: baseSlot.roomId,
      date: '2026-10-15',            // Khác ngày hoàn toàn
      shiftId: baseSlot.shiftId,
      startTime: baseSlot.startTime,
      endTime: baseSlot.endTime,
      subject: baseSlot.subject,
      status: 'Đã lên lịch',
    };

    const res1 = await conflictEngine.checkScheduleConflict(validSlotDiffDate);
    assert.equal(res1.hasConflict, false, 'Khác ngày không được báo lỗi');

    const validSlotDiffShift: Omit<ScheduleSlot, 'id'> = {
      classId: baseSlot.classId,
      teacherId: baseSlot.teacherId,
      roomId: baseSlot.roomId,
      date: baseSlot.date,
      shiftId: (baseSlot.shiftId % 5) + 1, // Khác ca
      startTime: '18:30',
      endTime: '20:30',
      subject: baseSlot.subject,
      status: 'Đã lên lịch',
    };

    // Chỉ check nếu ca đó chưa có lịch
    const existingInSameShift = existingSlots.some(
      s => s.date === baseSlot.date && 
           s.shiftId === validSlotDiffShift.shiftId && 
           (s.teacherId === baseSlot.teacherId || s.roomId === baseSlot.roomId || s.classId === baseSlot.classId)
    );
    if (!existingInSameShift) {
      const res2 = await conflictEngine.checkScheduleConflict(validSlotDiffShift);
      assert.equal(res2.hasConflict, false, 'Khác ca trống không được báo lỗi');
    }
  });

  await t.test('5. Cập nhật slot hiện tại (excludeSlotId) không tự xung đột với chính nó', async () => {
    const sameSlotData: Omit<ScheduleSlot, 'id'> = {
      classId: baseSlot.classId,
      teacherId: baseSlot.teacherId,
      roomId: baseSlot.roomId,
      date: baseSlot.date,
      shiftId: baseSlot.shiftId,
      startTime: baseSlot.startTime,
      endTime: baseSlot.endTime,
      subject: baseSlot.subject,
      status: baseSlot.status,
    };

    const res = await conflictEngine.checkScheduleConflict(sameSlotData, baseSlot.id);
    assert.equal(res.hasConflict, false, 'Không tự xung đột với chính slot đang edit');
  });
});
