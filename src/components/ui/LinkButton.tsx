'use client';

import React from 'react';
import Link from 'next/link';
import { buttonStyles, type Variant, type Size } from './Button';

export interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

/**
 * Link có kiểu dáng của nút. Dùng thay cho cặp <Link><Button/></Link>
 * để tránh bọc nút bên trong thẻ <a> (HTML không hợp lệ, kém trợ năng).
 */
export const LinkButton: React.FC<LinkButtonProps> = ({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className,
  children,
  ...rest
}) => {
  return (
    <Link href={href} className={buttonStyles({ variant, size, fullWidth, className })} {...rest}>
      {icon && <span className="shrink-0 [&_svg]:block">{icon}</span>}
      {children}
    </Link>
  );
};

export default LinkButton;
