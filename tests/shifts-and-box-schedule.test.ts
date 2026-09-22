import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ShiftService } from '../src/services/ShiftService';
import { GET as getShifts, PUT as updateShift, POST as createShift } from '../src/app/api/shifts/route';
import { repo } from '../src/repositories';

describe('Dynamic Shifts & Schedule Box Suite', () => {
  it('1. Đọc danh sách ca học mặc định từ ShiftService', async () => {
    ShiftService.resetDefaults();
    const shifts = await ShiftService.getAllShifts();
    assert.ok(shifts.length >= 5, 'Phải có ít nhất 5 ca học mặc định');
    assert.equal(shifts[0].name, 'Ca 1 (08:00 - 10:00)');
  });

  it('2. Admin tùy chỉnh thay đổi giờ bắt đầu và kết thúc của ca học qua API PUT /api/shifts', async () => {
    const req = new Request('http://localhost/api/shifts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        name: 'Ca 1 Sáng Sớm',
        startTime: '08:30',
        endTime: '10:30'
      })
    });

    const res = await updateShift(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.shift.startTime, '08:30');
    assert.equal(data.shift.endTime, '10:30');

    // Kiểm tra trong service
    const shifts = await ShiftService.getAllShifts();
    const shift1 = shifts.find(s => s.id === 1);
    assert.equal(shift1?.startTime, '08:30');
    assert.equal(shift1?.endTime, '10:30');
  });

  it('3. Admin tạo thêm ca học mới (Ca 6) qua API POST /api/shifts', async () => {
    const req = new Request('http://localhost/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ca 6 Buổi Tối Muộn',
        startTime: '20:45',
        endTime: '22:45'
      })
    });

    const res = await createShift(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.shift.startTime, '20:45');
    assert.equal(data.shift.endTime, '22:45');

    const shifts = await ShiftService.getAllShifts();
    assert.ok(shifts.some(s => s.name === 'Ca 6 Buổi Tối Muộn'));
  });

  it('4. Kiểm tra ghi nhận Audit Log khi Admin đổi khung giờ ca học', async () => {
    const logs = await repo.getAllAuditLogs();
    const shiftLog = logs.find(l => l.targetResource === 'SCHEDULE' && l.targetId.startsWith('SHIFT_'));
    assert.ok(shiftLog, 'Phải có Audit Log ghi nhận thay đổi khung giờ ca học');
  });
});
