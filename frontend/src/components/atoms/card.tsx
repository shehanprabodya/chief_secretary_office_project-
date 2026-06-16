import React, { useState } from 'react';

interface CardProps {
  children: React.ReactNode;
  hoverable?: boolean;
  bordered?: boolean;
  shadowLg?: boolean;
  className?: string;
  onClick?: () => void;
  role?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  bordered = false,
  shadowLg = false,
  className = '',
  onClick,
  role,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const cardClass = `card ${hoverable ? 'card--hoverable' : ''} ${isHovered ? 'card--hovered' : ''} ${bordered ? 'card--bordered' : ''} ${shadowLg ? 'card--shadow-lg' : ''} ${className}`;

  return (
    <div
      className={cardClass}
      onMouseEnter={() => hoverable && setIsHovered(true)}
      onMouseLeave={() => hoverable && setIsHovered(false)}
      onClick={onClick}
      role={role}
    >
      {children}
    </div>
  );
};

export default Card;
