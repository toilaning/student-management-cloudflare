import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { repo } from '../src/repositories';
import { ShiftService } from '../src/services/ShiftService';
import { POST as bulkUpdateFuture } from '../src/app/api/schedule/bulk-update-future/route';
import { POST as bulkDailyAction } from '../src/app/api/schedule/bulk-daily-action/route';

describe('Bulk Schedule Operations Suite: Future, Daily & Shifts Batch', () => {
  it('1. Đổi ca học hàng loạt từ một ngày về sau cho 1 lớp (Future Bulk Update)', async () => {
    await ShiftService.resetDefaults();
    const testClassId = 'CLS_BULK_FUT_TEST';
    
    // Tạo lớp test
    await repo.createClass({
      id: testClassId,
      code: 'FUT101',
      name: 'Lớp Test Đổi Lịch Tương Lai',
      subject: 'Toán',
      teacherId: 'GV001',
      roomId: 'P.101',
      shiftId: 1,
      scheduleDays: [2, 4, 6],
      tuitionFee: 1000000,
      studentIds: [],
      status: 'Đang mở',
      createdAt: '2026-09-01T00:00:00.000Z'
    });

    // Tạo 3 ca: 1 ca quá khứ (2026-09-01), 2 ca tương lai (2026-10-01, 2026-10-03)
    await repo.createScheduleSlot({
      id: 'SCH_TEST_P1',
      classId: testClassId,
      teacherId: 'GV001',
      roomId: 'P.101',
      date: '2026-09-01',
      shiftId: 1,
      startTime: '08:00',
      endTime: '10:00',
      subject: 'Toán',
      status: 'Đã hoàn thành'
    });

    await repo.createScheduleSlot({
      id: 'SCH_TEST_F1',
      classId: testClassId,
      teacherId: 'GV001',
      roomId: 'P.101',
      date: '2026-10-01',
      shiftId: 1,
      startTime: '08:00',
      endTime: '10:00',
      subject: 'Toán',
      status: 'Đã lên lịch'
    });

    await repo.createScheduleSlot({
      id: 'SCH_TEST_F2',
      classId: testClassId,
      teacherId: 'GV001',
      roomId: 'P.101',
      date: '2026-10-03',
      shiftId: 1,
      startTime: '08:00',
      endTime: '10:00',
      subject: 'Toán',
      status: 'Đã lên lịch'
    });

    // Gọi API đổi từ ngày 2026-10-01 sang Ca 2, phòng P.202
    const req = new Request('http://localhost/api/schedule/bulk-update-future', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classId: testClassId,
        fromDate: '2026-10-01',
        targetShiftId: 2,
        targetRoomId: 'P.202'
      })
    });

    const res = await bulkUpdateFuture(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.updatedCount, 2);

    // Kiểm tra ca quá khứ vẫn giữ nguyên Ca 1, P.101
    const p1 = await repo.getScheduleSlotById('SCH_TEST_P1');
    assert.equal(p1?.shiftId, 1);
    assert.equal(p1?.roomId, 'P.101');

    // Kiểm tra 2 ca tương lai đã chuyển sang Ca 2, P.202
    const f1 = await repo.getScheduleSlotById('SCH_TEST_F1');
    const f2 = await repo.getScheduleSlotById('SCH_TEST_F2');
    assert.equal(f1?.shiftId, 2);
    assert.equal(f1?.roomId, 'P.202');
    assert.equal(f2?.shiftId, 2);
    assert.equal(f2?.roomId, 'P.202');
  });

  it('2. Thao tác hàng loạt theo ngày (RESCHEDULE_DAY: Dời cả ngày sang ngày khác)', async () => {
    const testDate = '2026-11-10';
    const newDate = '2026-11-12';

    await repo.createScheduleSlot({
      id: 'SCH_DAY_1',
      classId: 'CLS01',
      teacherId: 'GV001',
      roomId: 'P.101',
      date: testDate,
      shiftId: 1,
      startTime: '08:00',
      endTime: '10:00',
      subject: 'Toán',
      status: 'Đã lên lịch'
    });

    await repo.createScheduleSlot({
      id: 'SCH_DAY_2',
      classId: 'CLS02',
      teacherId: 'GV002',
      roomId: 'P.102',
      date: testDate,
      shiftId: 2,
      startTime: '10:15',
      endTime: '12:15',
      subject: 'Văn',
      status: 'Đã lên lịch'
    });

    const req = new Request('http://localhost/api/schedule/bulk-daily-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentDate: testDate,
        action: 'RESCHEDULE_DAY',
        targetDate: newDate
      })
    });

    const res = await bulkDailyAction(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.updatedCount, 2);

    const s1 = await repo.getScheduleSlotById('SCH_DAY_1');
    const s2 = await repo.getScheduleSlotById('SCH_DAY_2');
    assert.equal(s1?.date, newDate);
    assert.equal(s2?.date, newDate);
  });

  it('3. Thao tác hàng loạt theo ngày (CANCEL_DAY: Hủy toàn bộ ca học trong ngày)', async () => {
    const cancelDate = '2026-11-20';

    await repo.createScheduleSlot({
      id: 'SCH_CANCEL_1',
      classId: 'CLS01',
      teacherId: 'GV001',
      roomId: 'P.101',
      date: cancelDate,
      shiftId: 1,
      startTime: '08:00',
      endTime: '10:00',
      subject: 'Toán',
      status: 'Đã lên lịch'
    });

    const req = new Request('http://localhost/api/schedule/bulk-daily-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentDate: cancelDate,
        action: 'CANCEL_DAY'
      })
    });

    const res = await bulkDailyAction(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.updatedCount, 1);

    const s = await repo.getScheduleSlotById('SCH_CANCEL_1');
    assert.equal(s?.status, 'Đã hủy');
  });

  it('4. Cập nhật số lượng ca & khung giờ hàng loạt (bulkUpdateShifts) và tự động đồng bộ giờ các ca tương lai', async () => {
    // Tạo 1 ca tương lai gắn shiftId: 1
    const futureSlotDate = '2026-12-01';
    await repo.createScheduleSlot({
      id: 'SCH_SHIFT_SYNC_TEST',
      classId: 'CLS01',
      teacherId: 'GV001',
      roomId: 'P.101',
      date: futureSlotDate,
      shiftId: 1,
      startTime: '08:00',
      endTime: '10:00',
      subject: 'Toán',
      status: 'Đã lên lịch'
    });

    // Cập nhật cấu hình ca: đổi Ca 1 thành 07:45 - 10:45
    const newShiftsConfig = [
      { id: 1, name: 'Ca 1 Mới', startTime: '07:45', endTime: '10:45', durationHours: 3.0, isActive: true },
      { id: 2, name: 'Ca 2 Mới', startTime: '13:30', endTime: '16:30', durationHours: 3.0, isActive: true },
      { id: 3, name: 'Ca 3 Mới', startTime: '18:00', endTime: '21:00', durationHours: 3.0, isActive: true }
    ];

    const result = await ShiftService.bulkUpdateShifts(newShiftsConfig, true);
    assert.equal(result.updatedShifts.length, 3);
    assert.ok(result.syncedSlotsCount >= 1);

    // Kiểm tra slot tương lai đã tự động nhận giờ mới 07:45 - 10:45
    const slot = await repo.getScheduleSlotById('SCH_SHIFT_SYNC_TEST');
    assert.equal(slot?.startTime, '07:45');
    assert.equal(slot?.endTime, '10:45');
  });
});
