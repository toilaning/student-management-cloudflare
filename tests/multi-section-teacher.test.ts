import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { POST as createClassRoute } from '../src/app/api/classes/route';
import { PUT as putSectionRoute, DELETE as deleteSectionRoute } from '../src/app/api/classes/sections/route';
import { POST as generateRoute } from '../src/app/api/schedule/bulk-generate/route';
import { repo } from '../src/repositories';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function toStr(d: Date): string {
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toStr(new Date(Date.UTC(y, m - 1, d + n)));
}
// dayOfWeek quy ước: 2 = Thứ 2 ... 7 = Thứ 7, 8 = Chủ Nhật
function nextDow(targetDow: number, minDateStr: string): string {
  let d = minDateStr;
  for (let i = 0; i < 7; i++) {
    const [y, m, dd] = d.split('-').map(Number);
    const jsDay = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();
    const dow = jsDay === 0 ? 8 : jsDay + 1;
    if (dow === targetDow) return d;
    d = addDays(d, 1);
  }
  return d;
}

const TODAY = new Date().toISOString().split('T')[0];
const TOMORROW = addDays(TODAY, 1);
const NEXT_MON = nextDow(2, TOMORROW);

describe('Multi-Section Class: nhiều ca, đổi giáo viên theo từng ca', () => {
  it('1. Tạo lớp với nhiều ca cùng lúc qua POST /api/classes (sections mảng)', async () => {
    const req = new Request('http://localhost/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Lớp Nhiều Ca Test',
        subject: 'Mỹ thuật',
        teacherId: 'GV001',
        roomId: 'P.101',
        shiftId: 1,
        startTime: '08:00',
        endTime: '10:00',
        scheduleDays: [2, 4, 6],
        tuitionFee: 1500000,
        isRecurring: false,
        autoGenerateSchedule: false,
        sections: [
          { shiftId: 1, startTime: '08:00', endTime: '10:00', scheduleDays: [2, 4, 6], teacherId: 'GV001', roomId: 'P.101' },
          { shiftId: 2, startTime: '10:15', endTime: '12:15', scheduleDays: [2, 4, 6], teacherId: 'GV002', roomId: 'P.102' },
          { shiftId: 3, startTime: '13:30', endTime: '15:30', scheduleDays: [3, 5], teacherId: 'GV003', roomId: 'P.103' },
        ],
      }),
    });
    const res = await createClassRoute(req);
    const data = await res.json();
    assert.ok(data.success);
    assert.equal(data.sectionCount, 3, 'Phải tạo đúng 3 ca học');

    const sections = await repo.getClassSections(data.class.id);
    assert.equal(sections.length, 3);
    const byTime = (start: string) => sections.find((s) => s.startTime === start);
    assert.equal(byTime('10:15')?.teacherId, 'GV002', 'Ca 2 do GV002 phụ trách');
    assert.equal(byTime('13:30')?.teacherId, 'GV003', 'Ca 3 do GV003 phụ trách');
  });

  it('2. Sinh lịch rải đều theo từng ca: ca nào giờ/thứ riêng thì slot riêng', async () => {
    const req = new Request('http://localhost/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Lớp Sinh Lịch Theo Ca',
        subject: 'Tiếng Anh',
        teacherId: 'GV001',
        roomId: 'P.101',
        scheduleDays: [2, 4],
        tuitionFee: 1200000,
        isRecurring: false,
        autoGenerateSchedule: false,
        sections: [
          { shiftId: 1, startTime: '08:00', endTime: '10:00', scheduleDays: [2, 4], teacherId: 'GV001', roomId: 'P.101' },
          { shiftId: 2, startTime: '10:15', endTime: '12:15', scheduleDays: [2, 4], teacherId: 'GV002', roomId: 'P.102' },
        ],
      }),
    });
    const res = await createClassRoute(req);
    const data = await res.json();
    assert.ok(data.success);
    const clsId = data.class.id;

    const sections = await repo.getClassSections(clsId);
    assert.equal(sections.length, 2);

    const endDate = addDays(NEXT_MON, 6);
    const gen = new Request('http://localhost/api/schedule/bulk-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classIds: [clsId],
        startDate: NEXT_MON,
        endDate,
        actorId: 'ADMIN001',
      }),
    });
    const genRes = await generateRoute(gen);
    const genData = await genRes.json();
    assert.ok(genData.success);
    assert.equal(genData.summary.createdCount, 4, 'Phải sinh 4 slot (2 ngày x 2 ca)');

    const slots = await repo.getScheduleSlotsByClassId(clsId);
    const sec1 = sections.find((s) => s.startTime === '08:00')!;
    const sec2 = sections.find((s) => s.startTime === '10:15')!;
    const slotsSec1 = slots.filter((s) => s.sectionId === sec1.id);
    const slotsSec2 = slots.filter((s) => s.sectionId === sec2.id);
    assert.equal(slotsSec1.length, 2);
    assert.equal(slotsSec2.length, 2);
    assert.equal(slotsSec1[0].teacherId, 'GV001', 'Slot ca 1 do GV001 dạy');
    assert.equal(slotsSec2[0].teacherId, 'GV002', 'Slot ca 2 do GV002 dạy');
    assert.equal(slotsSec2[0].startTime, '10:15');
  });

  it('3. Đổi giáo viên từng ca và đồng bộ slot tương lai của ca đó', async () => {
    const req = new Request('http://localhost/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Lớp Đổi GV Ca',
        subject: 'Toán',
        teacherId: 'GV001',
        roomId: 'P.101',
        scheduleDays: [2, 4],
        isRecurring: false,
        autoGenerateSchedule: false,
        sections: [
          { shiftId: 1, startTime: '08:00', endTime: '10:00', scheduleDays: [2, 4], teacherId: 'GV001', roomId: 'P.101' },
          { shiftId: 2, startTime: '10:15', endTime: '12:15', scheduleDays: [2, 4], teacherId: 'GV002', roomId: 'P.102' },
        ],
      }),
    });
    const res = await createClassRoute(req);
    const data = await res.json();
    const clsId = data.class.id;

    const endDate = addDays(NEXT_MON, 6);
    await generateRoute(new Request('http://localhost/api/schedule/bulk-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classIds: [clsId], startDate: NEXT_MON, endDate }),
    }));

    const sections = await repo.getClassSections(clsId);
    const sec2 = sections.find((s) => s.startTime === '10:15')!;

    const putRes = await putSectionRoute(new Request('http://localhost/api/classes/sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId: sec2.id, teacherId: 'GV004', syncFutureSlots: true }),
    }));
    const putData = await putRes.json();
    assert.ok(putData.success);

    const slots = await repo.getScheduleSlotsByClassId(clsId);
    const slotsSec2 = slots.filter((s) => s.sectionId === sec2.id);
    assert.ok(slotsSec2.length > 0);
    slotsSec2.forEach((s) => assert.equal(s.teacherId, 'GV004', 'Slot ca 2 phải đổi sang GV004'));

    const sec1 = sections.find((s) => s.startTime === '08:00')!;
    const slotsSec1 = slots.filter((s) => s.sectionId === sec1.id);
    slotsSec1.forEach((s) => assert.equal(s.teacherId, 'GV001', 'Slot ca 1 giữ nguyên GV001'));
  });

  it('4. Đổi thứ của ca sẽ hủy buổi tương lai không còn thuộc thứ đó', async () => {
    const req = new Request('http://localhost/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Lớp Đổi Thứ Ca',
        subject: 'Văn',
        teacherId: 'GV001',
        roomId: 'P.101',
        scheduleDays: [2],
        isRecurring: false,
        autoGenerateSchedule: false,
        sections: [
          { shiftId: 1, startTime: '08:00', endTime: '10:00', scheduleDays: [2, 4], teacherId: 'GV001', roomId: 'P.101' },
        ],
      }),
    });
    const res = await createClassRoute(req);
    const data = await res.json();
    const clsId = data.class.id;

    const endDate = addDays(NEXT_MON, 6);
    await generateRoute(new Request('http://localhost/api/schedule/bulk-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classIds: [clsId], startDate: NEXT_MON, endDate }),
    }));

    const sections = await repo.getClassSections(clsId);
    const sec = sections[0];
    await putSectionRoute(new Request('http://localhost/api/classes/sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId: sec.id, scheduleDays: [2], syncFutureSlots: true }),
    }));

    const slots = await repo.getScheduleSlotsByClassId(clsId);
    const active = slots.filter((s) => s.status !== 'Đã hủy');
    assert.equal(active.length, 1);
    assert.equal(active[0].date, NEXT_MON);
  });

  it('5. Xóa ca sẽ hủy buổi tương lai của ca đó', async () => {
    const req = new Request('http://localhost/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Lớp Xóa Ca',
        subject: 'Lý',
        teacherId: 'GV001',
        roomId: 'P.101',
        scheduleDays: [2],
        isRecurring: false,
        autoGenerateSchedule: false,
        sections: [
          { shiftId: 1, startTime: '08:00', endTime: '10:00', scheduleDays: [2, 4], teacherId: 'GV001', roomId: 'P.101' },
        ],
      }),
    });
    const res = await createClassRoute(req);
    const data = await res.json();
    const clsId = data.class.id;
    const sections = await repo.getClassSections(clsId);
    const sec = sections[0];

    const delRes = await deleteSectionRoute(new Request('http://localhost/api/classes/sections?id=' + sec.id, {
      method: 'DELETE',
    }));
    const delData = await delRes.json();
    assert.ok(delData.success);

    const after = await repo.getSectionById(sec.id);
    assert.equal(after, null, 'Ca phải bị xóa');
  });
});
