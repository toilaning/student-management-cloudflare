import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Sidebar } from '@/components/common/Sidebar';

export const metadata: Metadata = {
  title: 'Hệ Thống Quản Lý Đào Tạo & Học Viên Local',
  description: 'Clean Architecture Next.js Local In-Memory Student Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-slate-50 min-h-screen text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
        <AppProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              {children}
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
