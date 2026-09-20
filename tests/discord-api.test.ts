import test from 'node:test';
import assert from 'node:assert/strict';
import { repo } from '../src/repositories';
import { POST as postAttendance } from '../src/app/api/discord/attendance/route';
import { POST as postSingleAttendance } from '../src/app/api/discord/attendance/single/route';
import { POST as postHomeworkSubmit } from '../src/app/api/discord/homework-submit/route';
import { GET as getPendingTasks } from '../src/app/api/discord/pending-tasks/route';
import { Student } from '../src/types/student';
import { HomeworkTask } from '../src/types/homework';

const TEST_SECRET = 'secret_discord_bot_key_2026';

test('Discord Bot & Web API Integration Suite (Giai đoạn 3)', async (t) => {
  await repo.resetData();

  // Tạo dữ liệu học sinh mẫu có discordId
  const testStudent1: Student = {
    id: 'ST_DISCORD_01',
    name: 'Nguyễn Văn Vẽ',
    email: 'vanve@student.art.vn',
    phone: '0901234567',
    dateOfBirth: '2008-05-10',
    gender: 'Nam',
    address: 'Quận 1, TP. Hồ Chí Minh',
    status: 'Đang học',
    enrolledClassIds: ['CLS01'],
    discordId: '987654321012345678',
    discordUsername: 'vanve_art#1234',
    createdAt: new Date().toISOString(),
  };

  const testStudent2: Student = {
    id: 'ST_DISCORD_02',
    name: 'Trần Thị Họa',
    email: 'thihoa@student.art.vn',
    phone: '0907654321',
    dateOfBirth: '2008-08-15',
    gender: 'Nữ',
    address: 'Quận 3, TP. Hồ Chí Minh',
    status: 'Đang học',
    enrolledClassIds: ['CLS01'],
    discordId: '123456789098765432',
    discordUsername: 'thihoa_sketch#5678',
    createdAt: new Date().toISOString(),
  };

  await repo.createStudent(testStudent1);
  await repo.createStudent(testStudent2);

  await t.test('1. Kiểm tra xác thực token bí mật DISCORD_API_SECRET (HTTP 401 khi sai hoặc thiếu)', async () => {
    // 1.1 Thiếu Authorization Header
    const reqNoAuth = new Request('http://localhost:3000/api/discord/attendance', {
      method: 'POST',
      body: JSON.stringify({ ca_id: 'SCH0001' }),
    });
    const resNoAuth = await postAttendance(reqNoAuth);
    assert.equal(resNoAuth.status, 401, 'Thiếu auth header phải trả về 401');
    const dataNoAuth = await resNoAuth.json();
    assert.equal(dataNoAuth.success, false);

    // 1.2 Sai token secret
    const reqWrongAuth = new Request('http://localhost:3000/api/discord/attendance', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer wrong_secret_token_123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ca_id: 'SCH0001' }),
    });
    const resWrongAuth = await postAttendance(reqWrongAuth);
    assert.equal(resWrongAuth.status, 401, 'Sai token phải trả về 401');

    // 1.3 Kiểm tra endpoint pending-tasks với token sai
    const reqPendingWrong = new Request('http://localhost:3000/api/discord/pending-tasks', {
      headers: { 'Authorization': 'Bearer wrong_token' },
    });
    const resPendingWrong = await getPendingTasks(reqPendingWrong);
    assert.equal(resPendingWrong.status, 401);
  });

  await t.test('2. Kiểm tra API điểm danh Voice (batch check-in) lưu đúng checkinTime và method: BOT', async () => {
    const checkinTimeStr = '2026-09-20 20:30:15';
    const caId = 'SCH_VOICE_01';

    // Tạo ca học mẫu và gắn học sinh vào
    const reqVoice = new Request('http://localhost:3000/api/discord/attendance', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ca_id: caId,
        checkin_time: checkinTimeStr,
        method: 'BOT_VOICE',
        present_discord_ids: [testStudent1.discordId], // Chỉ có student1 có mặt trong voice
      }),
    });

    const resVoice = await postAttendance(reqVoice);
    assert.equal(resVoice.status, 200, 'Batch voice attendance phải thành công');
    const dataVoice = await resVoice.json();

    assert.equal(dataVoice.success, true);
    assert.equal(dataVoice.present_count, 1);
    assert.equal(dataVoice.present_students[0].discord_id, testStudent1.discordId);

    // Kiểm tra lưu trong Repository
    const records = await repo.getAttendanceBySlotId(caId);
    const rec1 = records.find(r => r.studentId === testStudent1.id);
    assert.ok(rec1, 'Phải có bản ghi điểm danh cho học sinh 1');
    assert.equal(rec1?.status, 'Có mặt');
    assert.equal(rec1?.checkinTime, checkinTimeStr);
    assert.equal(rec1?.method, 'BOT');

    // Kiểm tra Audit Log
    const auditLogs = await repo.getAllAuditLogs();
    const voiceLog = auditLogs.find(l => l.targetId === caId && l.details.includes('Voice'));
    assert.ok(voiceLog, 'Phải có Audit Log ghi lại hành động điểm danh Voice của Bot');
  });

  await t.test('3. Kiểm tra API điểm danh 1-Click qua nút bấm (Single check-in)', async () => {
    const checkinTimeBtn = '2026-09-20 20:32:00';
    const caId = 'SCH_BTN_01';

    // 3.1 Học sinh chưa liên kết Discord -> trả về 404
    const reqUnlinked = new Request('http://localhost:3000/api/discord/attendance/single', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ca_id: caId,
        discord_id: 'unknown_discord_user_9999',
        checkin_time: checkinTimeBtn,
      }),
    });
    const resUnlinked = await postSingleAttendance(reqUnlinked);
    assert.equal(resUnlinked.status, 404);

    // 3.2 Học sinh hợp lệ điểm danh 1-Click
    const reqClick = new Request('http://localhost:3000/api/discord/attendance/single', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ca_id: caId,
        discord_id: testStudent2.discordId,
        checkin_time: checkinTimeBtn,
        method: 'BOT_BUTTON',
      }),
    });
    const resClick = await postSingleAttendance(reqClick);
    assert.equal(resClick.status, 200);
    const dataClick = await resClick.json();

    assert.equal(dataClick.success, true);
    assert.equal(dataClick.student_name, testStudent2.name);
    assert.equal(dataClick.checkin_time, checkinTimeBtn);

    // Kiểm tra lưu trong Repository
    const records = await repo.getAttendanceBySlotId(caId);
    const rec2 = records.find(r => r.studentId === testStudent2.id);
    assert.ok(rec2, 'Phải tìm thấy bản ghi cho học sinh 2');
    assert.equal(rec2?.status, 'Có mặt');
    assert.equal(rec2?.checkinTime, checkinTimeBtn);
    assert.equal(rec2?.method, 'BOT');

    // 3.3 Bấm lại lần 2 (chống trùng lặp / idempotent update)
    const reqClick2 = new Request('http://localhost:3000/api/discord/attendance/single', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ca_id: caId,
        discord_id: testStudent2.discordId,
        checkin_time: '2026-09-20 20:35:10',
        method: 'BOT_BUTTON',
      }),
    });
    const resClick2 = await postSingleAttendance(reqClick2);
    assert.equal(resClick2.status, 200);
    const dataClick2 = await resClick2.json();
    assert.equal(dataClick2.already_checked_in, true);
  });

  await t.test('4. Kiểm tra API nộp bài vẽ qua Discord (/api/discord/homework-submit)', async () => {
    // Tạo bài tập vẽ mẫu
    const testTask: HomeworkTask = {
      id: 'HW_DISCORD_ART_01',
      classId: 'CLS01',
      title: 'Bài tập vẽ tĩnh vật bình hoa và quả',
      description: 'Chất liệu chì than 4B, chú ý phối mảng sáng tối',
      deadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // Còn 18 giờ
      createdBy: 'GV001',
      createdAt: new Date().toISOString(),
    };
    await repo.createHomeworkTask(testTask);

    const messageUrl = 'https://discord.com/channels/123456/789012/345678901234';
    const imageUrl = 'https://cdn.discordapp.com/attachments/789012/345678901234/still_life.png';
    const submittedAt = '2026-09-20 20:45:00';

    const reqSubmit = new Request('http://localhost:3000/api/discord/homework-submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        discord_id: testStudent1.discordId,
        message_url: messageUrl,
        image_urls: [imageUrl],
        content: 'Em gửi bài vẽ tĩnh vật bình hoa chì than ạ',
        submitted_at: submittedAt,
      }),
    });

    const resSubmit = await postHomeworkSubmit(reqSubmit);
    assert.equal(resSubmit.status, 200, 'Nộp bài qua Discord phải thành công');
    const dataSubmit = await resSubmit.json();

    assert.equal(dataSubmit.success, true);
    assert.equal(dataSubmit.task_id, testTask.id);
    assert.equal(dataSubmit.student_name, testStudent1.name);

    // Kiểm tra submission được lưu trong Repository
    const submissions = await repo.getHomeworkSubmissionsByTaskId(testTask.id);
    const sub = submissions.find(s => s.studentId === testStudent1.id);
    assert.ok(sub, 'Phải tìm thấy bài nộp của học sinh 1');
    assert.equal(sub?.status, 'DA_NOP');
    assert.equal(sub?.discordMessageUrl, messageUrl);
    assert.equal(sub?.submittedAt, submittedAt);

    // Kiểm tra Audit Log
    const auditLogs = await repo.getAllAuditLogs();
    const submitLog = auditLogs.find(l => l.targetId === testTask.id && l.action === 'HOMEWORK_SUBMIT');
    assert.ok(submitLog, 'Phải có Audit Log ghi nhận nộp bài tập');
  });

  await t.test('5. Kiểm tra API lấy danh sách bài tập cần nhắc nhở (/api/discord/pending-tasks)', async () => {
    // Tạo thêm 1 bài tập sắp hết hạn trong 3 giờ (khẩn cấp)
    const urgentTask: HomeworkTask = {
      id: 'HW_URGENT_02',
      classId: 'CLS01',
      title: 'Phác thảo màu nước phong cảnh chiều',
      description: 'Khổ A3 màu nước chuyên nghiệp',
      deadline: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(), // Còn 3.5 giờ (< 4h)
      createdBy: 'GV001',
      createdAt: new Date().toISOString(),
    };
    await repo.createHomeworkTask(urgentTask);

    // Gọi API pending-tasks trong vòng 24h
    const reqPending = new Request('http://localhost:3000/api/discord/pending-tasks?hours=24', {
      headers: {
        'Authorization': `Bearer ${TEST_SECRET}`,
      },
    });

    const resPending = await getPendingTasks(reqPending);
    assert.equal(resPending.status, 200);
    const dataPending = await resPending.json();

    assert.equal(dataPending.success, true);
    assert.ok(Array.isArray(dataPending.tasks));

    // Tìm bài tập urgentTask trong kết quả
    const foundUrgent = dataPending.tasks.find((t: any) => t.task_id === urgentTask.id);
    assert.ok(foundUrgent, 'Phải có bài tập khẩn cấp trong danh sách pending-tasks');
    assert.ok(foundUrgent.hours_left <= 4, 'Thời gian còn lại phải <= 4 giờ');

    // Kiểm tra danh sách học sinh chưa nộp bài có kèm discord_id
    const pendingStudents = foundUrgent.pending_students;
    assert.ok(pendingStudents.length > 0, 'Phải có học sinh chưa nộp');
    const student1InPending = pendingStudents.find((s: any) => s.student_id === testStudent1.id);
    assert.ok(student1InPending, 'Học sinh 1 chưa nộp bài này nên phải nằm trong pending');
    assert.equal(student1InPending.discord_id, testStudent1.discordId);
  });
});

import { GET as getStudentClass, POST as postStudentClass } from '../src/app/api/discord/student-class/route';

test('Discord Bot Orientation & Room Spec Tests (Giai đoạn chuyển đổi Discord Room)', async (t) => {
  await t.test('6. Kiểm tra API /api/discord/student-class tra cứu thông tin lớp và link Discord Room', async () => {
    // 6.1 Không truyền auth token -> 401
    const reqNoAuth = new Request('http://localhost:3000/api/discord/student-class?discord_id=987654321012345678');
    const resNoAuth = await getStudentClass(reqNoAuth);
    assert.equal(resNoAuth.status, 401, 'Thiếu token phải 401');

    // 6.2 Tra cứu học sinh chưa liên kết Discord
    const reqUnlinked = new Request('http://localhost:3000/api/discord/student-class?discord_id=unlinked_id_999', {
      headers: { 'Authorization': `Bearer ${TEST_SECRET}` },
    });
    const resUnlinked = await getStudentClass(reqUnlinked);
    assert.equal(resUnlinked.status, 200);
    const dataUnlinked = await resUnlinked.json();
    assert.equal(dataUnlinked.success, true);
    assert.equal(dataUnlinked.linked, false);
    assert.equal(dataUnlinked.classes.length, 0);

    // 6.3 Tra cứu học sinh đã liên kết (ST_DISCORD_01 - discordId: 987654321012345678)
    const reqLinked = new Request('http://localhost:3000/api/discord/student-class?discord_id=987654321012345678', {
      headers: { 'Authorization': `Bearer ${TEST_SECRET}` },
    });
    const resLinked = await getStudentClass(reqLinked);
    assert.equal(resLinked.status, 200);
    const dataLinked = await resLinked.json();
    assert.equal(dataLinked.success, true);
    assert.equal(dataLinked.linked, true);
    assert.equal(dataLinked.student.id, 'ST_DISCORD_01');
    assert.ok(Array.isArray(dataLinked.classes));
    assert.ok(dataLinked.classes.length > 0, 'Phải có ít nhất 1 lớp');

    const firstClass = dataLinked.classes[0];
    assert.ok(firstClass.class_id, 'Phải có class_id');
    assert.ok(firstClass.meeting_link, 'Phải có meeting_link Discord');
    assert.ok(firstClass.meeting_link.includes('discord.com/channels'), 'Link meeting phải trỏ về discord.com/channels');

    // 6.4 Kiểm tra qua method POST
    const reqPost = new Request('http://localhost:3000/api/discord/student-class', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        discord_id: '987654321012345678',
      }),
    });
    const resPost = await postStudentClass(reqPost);
    assert.equal(resPost.status, 200);
    const dataPost = await resPost.json();
    assert.equal(dataPost.success, true);
    assert.equal(dataPost.linked, true);
    assert.equal(dataPost.student.id, 'ST_DISCORD_01');
  });
});
