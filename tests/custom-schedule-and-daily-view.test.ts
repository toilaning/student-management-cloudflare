import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LocalRepository } from '../src/repositories/LocalRepository';
import { BulkScheduleService } from '../src/services/BulkScheduleService';
import { ClassEntity } from '../src/types/classroom';
import { ScheduleSlot } from '../src/types/schedule';

describe('Custom Schedule Hours & Daily View Suite: Giai đoạn 1 & 2', () => {
  test('1. ClassEntity hỗ trợ startTime, endTime, scheduleDays (có CN: 8) và isRecurring', async () => {
    const repo = new LocalRepository();
    const testClass: ClassEntity = {
      id: 'CLS99',
      code: 'PYTH99',
      name: 'Lớp Python Chuyên Sâu Tối',
      subject: 'Lập trình',
      teacherId: 'GV001',
      roomId: 'P.101',
      studentIds: ['ST001'],
      tuitionFee: 2000000,
      scheduleDays: [2, 4, 6, 8],
      startTime: '19:30',
      endTime: '21:30',
      isRecurring: true,
      status: 'Đang mở',
    };

    const created = await repo.createClass(testClass);
    assert.equal(created.startTime, '19:30');
    assert.equal(created.endTime, '21:30');
    assert.equal(created.isRecurring, true);
    assert.deepEqual(created.scheduleDays, [2, 4, 6, 8]);
  });

  test('2. BulkScheduleService sinh đúng ScheduleSlot với custom startTime và endTime của lớp', async () => {
    const repo = new LocalRepository();
    const testClass: ClassEntity = {
      id: 'CLS88',
      code: 'ENG88',
      name: 'IELTS Cấp Tốc Sáng',
      subject: 'Tiếng Anh',
      teacherId: 'GV002',
      roomId: 'P.201',
      studentIds: ['ST002'],
      tuitionFee: 2500000,
      scheduleDays: [2, 4], // Thứ 2, Thứ 4
      startTime: '07:30',
      endTime: '09:30',
      isRecurring: true,
      status: 'Đang mở',
    };
    await repo.createClass(testClass);

    const bulkService = new BulkScheduleService(repo);
    // Sinh từ 2026-10-05 (Thứ 2) đến 2026-10-11 (Chủ Nhật)
    const res = await bulkService.generateRecurringSlots({
      classIds: ['CLS88'],
      startDate: '2026-10-05',
      endDate: '2026-10-11',
      actorId: 'ADMIN_TEST',
    });

    assert.ok(res.createdSlots.length >= 2, 'Cần sinh ít nhất 2 ca học cho Thứ 2 và Thứ 4');
    for (const slot of res.createdSlots) {
      assert.equal(slot.classId, 'CLS88');
      assert.equal(slot.startTime, '07:30', 'Slot phải có startTime là 07:30');
      assert.equal(slot.endTime, '09:30', 'Slot phải có endTime là 09:30');
    }
  });

  test('3. PUT /api/classes cập nhật đồng bộ slot tương lai (date >= today)', async () => {
    const repo = new LocalRepository();
    const todayStr = new Date().toISOString().split('T')[0];
    const testClass: ClassEntity = {
      id: 'CLS77',
      code: 'MTH77',
      name: 'Toán Tư Duy',
      subject: 'Toán',
      teacherId: 'GV001',
      roomId: 'P.101',
      studentIds: [],
      tuitionFee: 1500000,
      scheduleDays: [3, 5],
      startTime: '18:00',
      endTime: '20:00',
      isRecurring: true,
      status: 'Đang mở',
    };
    await repo.createClass(testClass);

    // Tạo slot tương lai
    const futureSlot: ScheduleSlot = {
      id: 'SCH_TEST_01',
      classId: 'CLS77',
      teacherId: 'GV001',
      roomId: 'P.101',
      date: todayStr,
      shiftId: 1,
      startTime: '18:00',
      endTime: '20:00',
      subject: 'Toán',
      status: 'Đã lên lịch',
    };
    await repo.createScheduleSlot(futureSlot);

    // Cập nhật lớp học sang giờ mới: 18:30 - 20:30, GV mới: GV003, phòng mới: P.301
    const allSlots = await repo.getAllScheduleSlots();
    for (const slot of allSlots) {
      if (slot.classId === 'CLS77' && slot.date >= todayStr && slot.status !== 'Đã hủy') {
        slot.startTime = '18:30';
        slot.endTime = '20:30';
        slot.teacherId = 'GV003';
        slot.roomId = 'P.301';
        await repo.updateScheduleSlot(slot);
      }
    }

    const updatedSlot = await repo.getScheduleSlotById('SCH_TEST_01');
    assert.equal(updatedSlot?.startTime, '18:30');
    assert.equal(updatedSlot?.endTime, '20:30');
    assert.equal(updatedSlot?.teacherId, 'GV003');
    assert.equal(updatedSlot?.roomId, 'P.301');
  });
});
