import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTimelineBounds,
  buildTicksBetween,
  layoutDaySlots,
} from '../src/components/schedule/Timeline';
import { ScheduleSlot } from '../src/types/schedule';

function makeSlot(partial: Partial<ScheduleSlot> & { id: string }): ScheduleSlot {
  return {
    classId: 'CLS01',
    teacherId: 'GV001',
    roomId: 'ONLINE',
    date: '2026-10-05',
    shiftId: 1,
    startTime: '08:00',
    endTime: '10:00',
    subject: 'Toán',
    status: 'Đã lên lịch',
    ...partial,
  } as ScheduleSlot;
}

describe('Timeline layout: trục giờ co giãn và xếp ca trùng giờ', () => {
  test('1. computeTimelineBounds ôm đúng ca sớm nhất và muộn nhất, nới 30 phút mỗi đầu', () => {
    const slots = [
      makeSlot({ id: 'SCH1', startTime: '09:30', endTime: '11:00' }),
      makeSlot({ id: 'SCH2', startTime: '14:00', endTime: '16:30' }),
    ];
    const bounds = computeTimelineBounds(slots);
    assert.equal(bounds.startMinutes, 9 * 60); // 09:30 - 30p = 09:00
    assert.equal(bounds.endMinutes, 17 * 60); // 16:30 + 30p = 17:00
  });

  test('2. computeTimelineBounds trả khung mặc định khi không có ca nào', () => {
    const bounds = computeTimelineBounds([]);
    assert.equal(bounds.startMinutes, 8 * 60);
    assert.equal(bounds.endMinutes, 21 * 60);
  });

  test('3. buildTicksBetween sinh đúng số vạch giờ theo bước', () => {
    const ticks = buildTicksBetween(8 * 60, 10 * 60, 60);
    assert.deepEqual(
      ticks.map((t) => t.label),
      ['08:00', '09:00', '10:00']
    );
  });

  test('4. Ca không trùng giờ thì mỗi ca chiếm trọn chiều ngang', () => {
    const laid = layoutDaySlots([
      makeSlot({ id: 'SCH1', startTime: '08:00', endTime: '10:00' }),
      makeSlot({ id: 'SCH2', startTime: '10:00', endTime: '12:00' }),
    ]);
    assert.equal(laid.length, 2);
    assert.ok(laid.every((item) => item.columnCount === 1));
    assert.ok(laid.every((item) => item.overlap === 'none'));
  });

  test('5. Hai lớp khác nhau chạy song song thì tách cột nhưng không phải lỗi', () => {
    const laid = layoutDaySlots([
      makeSlot({ id: 'SCH1', classId: 'CLS01', startTime: '08:00', endTime: '10:00' }),
      makeSlot({ id: 'SCH2', classId: 'CLS02', startTime: '09:00', endTime: '11:00' }),
    ]);
    assert.ok(laid.every((item) => item.columnCount === 2));
    assert.ok(laid.every((item) => item.overlap === 'parallel'));
    assert.deepEqual(
      laid.map((item) => item.column).sort(),
      [0, 1]
    );
  });

  test('6. Cùng một lớp bị xếp chồng giờ thì báo trùng lịch', () => {
    const laid = layoutDaySlots([
      makeSlot({ id: 'SCH1', classId: 'CLS01', startTime: '08:00', endTime: '10:00' }),
      makeSlot({ id: 'SCH2', classId: 'CLS01', startTime: '09:00', endTime: '11:00' }),
    ]);
    assert.ok(laid.every((item) => item.overlap === 'conflict'));
  });

  test('7. Ba ca chồng nhau được chia thành ba cột', () => {
    const laid = layoutDaySlots([
      makeSlot({ id: 'SCH1', classId: 'CLS01', startTime: '08:00', endTime: '10:00' }),
      makeSlot({ id: 'SCH2', classId: 'CLS02', startTime: '08:30', endTime: '10:30' }),
      makeSlot({ id: 'SCH3', classId: 'CLS03', startTime: '09:00', endTime: '11:00' }),
    ]);
    assert.ok(laid.every((item) => item.columnCount === 3));
  });
});
