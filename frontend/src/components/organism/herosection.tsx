import React from 'react';
import Button from '../atoms/button';
import IconBox from '../atoms/iconbox';
import { H1, Paragraph } from '../atoms/heading';

const IcoLogin: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M10 7L15 12L10 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M14 4H20V20H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IcoSupport: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 18V16C6 14.9 6.9 14 8 14H9L12 17L15 14H16C17.1 14 18 14.9 18 16V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
    <path d="M4 12C4 7.6 7.6 4 12 4C16.4 4 20 7.6 20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

interface HeroSectionProps {
  title?: string;
  description?: string;
  onLoginClick?: () => void;
  onSupportClick?: () => void;
  imageUrl?: string;
  imageAlt?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  title = 'Strengthening Digital Governance in Southern Province',
  description = 'The Meeting Management & Collaboration System (MMCS) empowers the Development Division with secure, transparent, and efficient institutional oversight.',
  onLoginClick,
  onSupportClick,
  imageUrl,
  imageAlt = 'Hero Image',
}) => {
  return (
    <section className="hero-section" role="banner">
      <div className="hero-section__content">
        <H1>{title}</H1>
        <Paragraph className="hero-section__description">
          {description}
        </Paragraph>
        <div className="hero-section__buttons">
          <Button
            variant="primary"
            icon={(
              <IconBox color="blue" size={22} ariaLabel="Login">
                <IcoLogin />
              </IconBox>
            )}
            onClick={onLoginClick}
            ariaLabel="Open portal login"
          >
            Portal Login
          </Button>
          <Button
            variant="outline"
            icon={(
              <IconBox color="slate" size={22} ariaLabel="Support">
                <IcoSupport />
              </IconBox>
            )}
            onClick={onSupportClick}
            ariaLabel="Contact support"
          >
            Contact Support
          </Button>
        </div>
      </div>
      <div className="hero-section__image" role="img" aria-label={imageAlt}>
        {imageUrl ? <img src={imageUrl} alt={imageAlt} /> : 'img'}
      </div>
    </section>
  );
};

export default HeroSection;
