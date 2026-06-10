import React from 'react';
import './Footer.css';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterProps {
  title?: string;
  copyright?: string;
  links?: FooterLink[];
}

const Footer: React.FC<FooterProps> = ({
  title = 'Southern Provincial Council MMCS',
  copyright = '© 2024 Office of the Chief Secretary · Southern Provincial Council. All Rights Reserved.',
  links,
}) => {
  const defaultLinks: FooterLink[] = [
    { label: 'Accessibility', href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Technical Support', href: '#' }
  ];

  const displayLinks = links || defaultLinks;

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__left">
        <span className="footer__title">{title}</span>
        <span className="footer__copyright">
          {copyright}
        </span>
      </div>
      <nav className="footer__nav" aria-label="Footer links">
        {displayLinks.map(link => (
          <a
            key={link.label}
            href={link.href}
            className="footer__link"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  );
};

export default Footer;
