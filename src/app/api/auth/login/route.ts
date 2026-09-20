import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { AuthService } from '@/services/AuthService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (!username || typeof username !== 'string' || !username.trim() ||
        !password || typeof password !== 'string' || !password.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    const cleanUsername = username.trim();
    const authService = new AuthService(repo);
    const authenticatedUser = await authService.authenticate(cleanUsername, password);

    if (!authenticatedUser || !authenticatedUser.isActive) {
      return NextResponse.json(
        { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    // Ghi Audit Log hành động LOGIN bất đồng bộ (không chặn phản hồi đăng nhập)
    repo.addAuditLog({
      userId: authenticatedUser.id,
      userName: authenticatedUser.name,
      userRole: authenticatedUser.role,
      action: 'LOGIN',
      targetResource: 'AUTH',
      targetId: authenticatedUser.id,
      details: `Người dùng [${authenticatedUser.id}] (${authenticatedUser.name}) đăng nhập hệ thống thành công`,
    }).catch(auditErr => console.error('[Audit Log Error] Failed to log login action:', auditErr));

    // Làm sạch user profile, không trả về passwordHash
    const { passwordHash, ...sanitizedUser } = authenticatedUser;

    return NextResponse.json(
      {
        success: true,
        user: sanitizedUser,
        message: 'Đăng nhập thành công',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Auth Login API Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác' },
      { status: 401 }
    );
  }
}
