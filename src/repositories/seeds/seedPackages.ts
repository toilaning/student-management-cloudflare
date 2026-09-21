import { SessionPackage } from '@/types/package';

export const DEFAULT_PACKAGES: SessionPackage[] = [
  {
    id: 'PKG10',
    name: 'Gói Cơ Bản (10 Buổi)',
    sessionCount: 10,
    price: 1000000,
    isActive: true,
    description: 'Khóa trải nghiệm nền tảng, làm quen lộ trình học và tương tác cùng giảng viên.',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'PKG20',
    name: 'Gói Nâng Cao (20 Buổi)',
    sessionCount: 20,
    price: 1800000,
    isActive: true,
    description: 'Tiết kiệm 10%, bao gồm bài tập dự án thực chiến và hỗ trợ cố vấn 1-1.',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'PKG30',
    name: 'Gói Chuyên Sâu (30 Buổi)',
    sessionCount: 30,
    price: 2500000,
    isActive: true,
    description: 'Gói toàn diện nhất, bảo đảm đầu ra, hướng dẫn đồ án tốt nghiệp và cấp chứng chỉ hoàn thành.',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'PKG50',
    name: 'Gói Master VIP (50 Buổi)',
    sessionCount: 50,
    price: 3900000,
    isActive: false,
    description: 'Gói dài hạn cho chương trình cao cấp (Tạm ngừng nhận đăng ký).',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];
