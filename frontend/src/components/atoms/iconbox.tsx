import React from 'react';
import './IconBox.css';

type IconColor = 'blue' | 'rose' | 'green' | 'slate' | 'purple' | 'amber';

interface IconBoxProps {
  children: React.ReactNode;
  color: IconColor;
  size?: number;
  className?: string;
  role?: string;
  ariaLabel?: string;
}

const IconBox: React.FC<IconBoxProps> = ({
  children,
  color,
  size = 40,
  className = '',
  role = 'img',
  ariaLabel,
}) => {
  const iconBoxClass = `icon-box icon-box--${color} ${className}`;

  return (
    <div
      className={iconBoxClass}
      style={{
        width: `${size}px`,
        height: `${size}px`
      }}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};

export default IconBox;
