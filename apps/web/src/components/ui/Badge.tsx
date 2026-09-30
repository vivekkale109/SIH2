import React from 'react';
import { ClassificationLevel } from '@sdms/shared-types';

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    'public' | 'restricted' | 'confidential' | 'secret' | 'success' | 'warning' | 'danger' | 'info';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  icon,
  className = '',
}) => {
  const styles: Record<string, string> = {
    public: 'bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D]/40 dark:text-[#86EFAC]',
    restricted: 'bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E3A8A]/40 dark:text-[#93C5FD]',
    confidential: 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#78350F]/40 dark:text-[#FDE68A]',
    secret: 'bg-[#FEE2E2] text-[#991B1B] dark:bg-[#7F1D1D]/40 dark:text-[#FCA5A5]',
    success: 'bg-success/15 text-success dark:text-success',
    warning: 'bg-warning/15 text-warning dark:text-warning',
    danger: 'bg-danger/15 text-danger dark:text-danger',
    info: 'bg-info/15 text-info dark:text-info',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[variant] || styles['info']
      } ${className}`}
    >
      {icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
};

export const ClassificationBadge: React.FC<{
  level: ClassificationLevel;
  className?: string;
}> = ({ level, className }) => {
  const variant = level.toLowerCase() as BadgeProps['variant'];
  return (
    <Badge variant={variant} className={className}>
      {level}
    </Badge>
  );
};
