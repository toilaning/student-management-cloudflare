'use client';

import React from 'react';
import { Sheet, type SheetProps } from '@/components/ui/Sheet';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
}

/**
 * Lớp tương thích cho các trang còn dùng <Modal>.
 * Chuyển tiếp sang <Sheet> để toàn hệ thống dùng một kiểu hộp thoại.
 */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, closeOnBackdropClick }) => (
  <Sheet isOpen={isOpen} onClose={onClose} size="lg" closeOnBackdropClick={closeOnBackdropClick}>
    {children}
  </Sheet>
);

export default Modal;
