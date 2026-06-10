import React from 'react';
import './HeroSection.css';
import Button from '../atoms/button';
import IcoLogin from '../atoms/iconbox';
import { H1, Paragraph } from '../atoms/heading';

const IcoSupport = IcoLogin;

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
            icon={<IcoLogin>Login</IcoLogin>}
            onClick={onLoginClick}
            ariaLabel="Open portal login"
          >
            Portal Login
          </Button>
          <Button
            variant="outline"
            icon={<IcoSupport>Support</IcoSupport>}
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
