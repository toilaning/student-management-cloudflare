import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalRepository } from '../src/repositories/LocalRepository';
import { StudentService } from '../src/services/StudentService';
import { AuthService } from '../src/services/AuthService';

test('Student Code Standardization (YYxxx) & Discord Snowflake ID Suite', async (t) => {
  const repo = LocalRepository.getInstance();
  const studentService = new StudentService(repo);
  const authService = new AuthService(repo);

  await t.test('1. Sinh mã học sinh dạng nămstt (YYxxx) tự động tăng', async () => {
    // Năm 2026 -> YY = 26. Mã đầu tiên khi chưa có học sinh 26xxx nào là 26001
    const nextId1 = await studentService.generateNextStudentId(2026);
    assert.equal(nextId1, '26001', 'Mã đầu tiên của năm 2026 phải là 26001');

    // Thêm một học sinh với mã 26001 vào repo
    await repo.createStudent({
      id: '26001',
      name: 'Học Sinh Test 01',
      email: '26001@student.local',
      phone: '0901111111',
      dateOfBirth: '2008-01-01',
      gender: 'Nam',
      address: 'TP. Hồ Chí Minh',
      status: 'Đang học',
      enrolledClassIds: [],
      createdAt: new Date().toISOString(),
    });

    // Mã kế tiếp phải tăng lên 26002
    const nextId2 = await studentService.generateNextStudentId(2026);
    assert.equal(nextId2, '26002', 'Mã tiếp theo phải tăng lên 26002');

    // Nếu có mã 26015 thì mã kế tiếp phải là 26016
    await repo.createStudent({
      id: '26015',
      name: 'Học Sinh Test 15',
      email: '26015@student.local',
      phone: '0902222222',
      dateOfBirth: '2008-01-01',
      gender: 'Nữ',
      address: 'Hà Nội',
      status: 'Đang học',
      enrolledClassIds: [],
      createdAt: new Date().toISOString(),
    });

    const nextId3 = await studentService.generateNextStudentId(2026);
    assert.equal(nextId3, '26016', 'Mã tiếp theo phải dựa trên max sequence: 26016');
  });

  await t.test('2. Tạo Nhanh Học Sinh (1-Click Fast Onboarding) cấp tài khoản mặc định 123456', async () => {
    const res = await studentService.createStudentFastOnboarding({
      name: 'Nguyễn Văn A',
      phone: '0988123456',
      discordId: '852099999999999999',
      discordUsername: 'nguyenvana_discord',
    });

    assert.ok(res.student);
    assert.match(res.student.id, /^26\d{3}$/, 'Mã học sinh phải có dạng 26xxx');
    assert.equal(res.student.name, 'Nguyễn Văn A');
    assert.equal(res.student.phone, '0988123456');
    assert.equal(res.student.discordId, '852099999999999999');
    assert.equal(res.student.discordUsername, 'nguyenvana_discord');
    assert.equal(res.defaultPassword, '123456');

    // Kiểm tra tài khoản User được tạo tự động tương ứng
    const user = await repo.getUserById(res.student.id);
    assert.ok(user, 'User tài khoản phải được tự động tạo');
    assert.equal(user.username, res.student.id.toLowerCase());
    assert.equal(user.role, 'STUDENT');

    // Kiểm tra đăng nhập với password mặc định 123456
    const authenticated = await authService.authenticate(user.username, '123456');
    assert.ok(authenticated, 'Học sinh phải đăng nhập được với mật khẩu mặc định 123456');
  });

  await t.test('3. Xem và cập nhật Discord Snowflake ID linh hoạt', async () => {
    // Tạo học sinh chưa có Discord ID
    const res = await studentService.createStudentFastOnboarding({
      name: 'Trần Thị B',
    });
    const stId = res.student.id;
    assert.equal(res.student.discordId, undefined);

    // Cập nhật Discord ID (Snowflake ID)
    const updated1 = await studentService.updateDiscordInfo(stId, {
      discordId: '123456789012345678',
      discordUsername: 'tranthib_dc',
    });
    assert.equal(updated1.discordId, '123456789012345678');
    assert.equal(updated1.discordUsername, 'tranthib_dc');

    // Kiểm tra lấy từ repository
    const fetched = await repo.getStudentById(stId);
    assert.ok(fetched);
    assert.equal(fetched.discordId, '123456789012345678');
    assert.equal(fetched.discordUsername, 'tranthib_dc');

    // Cập nhật/sửa lại nếu nhập sai
    const updated2 = await studentService.updateDiscordInfo(stId, {
      discordId: '987654321098765432',
    });
    assert.equal(updated2.discordId, '987654321098765432');
  });

  await t.test('4. Ghi nhận Audit Log khi tạo nhanh & sửa Discord Snowflake ID', async () => {
    const logs = await repo.getAllAuditLogs();
    const studentLogs = logs.filter(l => l.targetResource === 'STUDENT');
    assert.ok(studentLogs.length >= 2, 'Phải có audit logs cho các thao tác trên');
  });
});

test('Student API Route Suite: Test PATCH /api/students/[id] and POST /api/students', async (t) => {
  const { POST } = await import('../src/app/api/students/route');
  const { PATCH, GET } = await import('../src/app/api/students/[id]/route');

  await t.test('1. POST /api/students tạo học sinh mới dạng 26xxx', async () => {
    const req = new Request('http://localhost/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Võ Minh Quân',
        phone: '0912345678',
        fastOnboarding: true,
      }),
    });
    const res = await POST(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.match(data.student.id, /^26\d{3}$/);
    assert.equal(data.defaultPassword, '123456');
  });

  await t.test('2. PATCH /api/students/[id] cập nhật discordId', async () => {
    const patchReq = new Request('http://localhost/api/students/26001', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: '888899991111222233',
        discordUsername: 'quan_vo',
      }),
    });
    const patchRes = await PATCH(patchReq, { params: { id: '26001' } });
    assert.equal(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.ok(patchData.success);
    assert.equal(patchData.student.discordId, '888899991111222233');

    // GET kiểm tra lại
    const getReq = new Request('http://localhost/api/students/26001');
    const getRes = await GET(getReq, { params: { id: '26001' } });
    const getData = await getRes.json();
    assert.equal(getData.student.discordId, '888899991111222233');
    assert.equal(getData.student.discordUsername, 'quan_vo');
  });
});
