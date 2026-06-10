import React from 'react';
import './Text.css';

interface HeadingProps {
  children: React.ReactNode;
  className?: string;
}

export const H1: React.FC<HeadingProps> = ({ children, className = '' }) => (
  <h1 className={`h1 ${className}`}>{children}</h1>
);

export const H2: React.FC<HeadingProps> = ({ children, className = '' }) => (
  <h2 className={`h2 ${className}`}>{children}</h2>
);

export const H3: React.FC<HeadingProps> = ({ children, className = '' }) => (
  <h3 className={`h3 ${className}`}>{children}</h3>
);

export const H4: React.FC<HeadingProps> = ({ children, className = '' }) => (
  <h4 className={`h4 ${className}`}>{children}</h4>
);

export const H5: React.FC<HeadingProps> = ({ children, className = '' }) => (
  <h5 className={`h5 ${className}`}>{children}</h5>
);

export const H6: React.FC<HeadingProps> = ({ children, className = '' }) => (
  <h6 className={`h6 ${className}`}>{children}</h6>
);

interface ParagraphProps {
  children: React.ReactNode;
  variant?: 'base' | 'sm' | 'lg' | 'light' | 'muted';
  className?: string;
}

export const Paragraph: React.FC<ParagraphProps> = ({
  children,
  variant = 'base',
  className = ''
}) => (
  <p className={`paragraph paragraph--${variant} ${className}`}>{children}</p>
);

interface SpanProps {
  children: React.ReactNode;
  variant?: 'base' | 'sm' | 'xs' | 'label' | 'error' | 'success';
  className?: string;
  role?: string;
}

export const Span: React.FC<SpanProps> = ({
  children,
  variant = 'base',
  className = '',
  role,
}) => (
  <span className={`span span--${variant} ${className}`} role={role}>{children}</span>
);
