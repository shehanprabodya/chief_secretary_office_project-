import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'info' | 'danger' | 'muted' | 'rose' | 'purple';
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'info',
  children,
  className = '',
  icon,
}) => {
  const badgeClass = `badge badge--${variant} ${className}`;

  return (
    <span className={badgeClass}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
