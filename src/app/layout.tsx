import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { ToastProvider } from '@/components/ui/Toast';
import { Sidebar } from '@/components/common/Sidebar';
import { BottomNav } from '@/components/common/BottomNav';

export const metadata: Metadata = {
  title: 'Quản Lý Luyện Thi Kiến Trúc & Mỹ Thuật',
  description: 'Hệ thống quản lý luyện thi kiến trúc và mỹ thuật',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-background min-h-screen text-foreground antialiased">
        <AppProvider>
          <ToastProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
                {children}
              </div>
              <BottomNav />
            </div>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
