import React from 'react';
import PillarCard from '../molecules/Pillercard';
import { H2, Paragraph } from '../atoms/heading';

interface IconProps {
  c?: string;
}

const IcoShield: React.FC<IconProps> = ({ c = 'currentColor' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3L19 6V11C19 15.5 16.1 19.4 12 21C7.9 19.4 5 15.5 5 11V6L12 3Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M9 12L11 14L15.5 9.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IcoEye: React.FC<IconProps> = ({ c = 'currentColor' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 12C5.2 8.5 8.2 6.75 12 6.75C15.8 6.75 18.8 8.5 21 12C18.8 15.5 15.8 17.25 12 17.25C8.2 17.25 5.2 15.5 3 12Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2.5" stroke={c} strokeWidth="1.8" />
  </svg>
);

const IcoDoc: React.FC<IconProps> = ({ c = 'currentColor' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 3.75H14L18 7.75V20.25H7V3.75Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M14 3.75V8H18" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M9.75 12H15.25M9.75 15.5H14" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IcoBar: React.FC<IconProps> = ({ c = 'currentColor' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 19V10M12 19V5M19 19V13" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M4 19.25H20" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

interface PillarItem {
  id: string;
  icon: React.ReactNode;
  iconColor: 'blue' | 'rose' | 'green' | 'slate' | 'purple' | 'amber';
  title: string;
  description: string;
  imageSrc?: string;
}

interface PillarsGridProps {
  title?: string;
  subtitle?: string;
  pillars?: PillarItem[];
  onPillarClick?: (pillarId: string) => void;
}

const PillarsGrid: React.FC<PillarsGridProps> = ({
  title = 'Core Operational Pillars',
  subtitle = 'Standardizing administrative excellence through modern digital frameworks and automated collaboration.',
  pillars,
  onPillarClick,
}) => {
  const defaultPillars: PillarItem[] = [
    {
      id: 'p1',
      icon: <IcoShield />,
      iconColor: 'slate',
      title: 'Secure Approvals',
      description: 'Multi-level cryptographic verification for official directives. Ensure every decision is traceable, authenticated, and securely archived within provincial servers.',
      imageSrc: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=260&q=70'
    },
    {
      id: 'p2',
      icon: <IcoEye />,
      iconColor: 'rose',
      title: 'Institutional Transparency',
      description: 'Real-time tracking of development project statuses and inter-departmental resource allocation for public accountability.'
    },
    {
      id: 'p3',
      icon: <IcoDoc />,
      iconColor: 'blue',
      title: 'Automated Reporting',
      description: 'Instant generation of meeting records using voice-to-text and AI summarization, reducing administrative overhead by 60%.',
      imageSrc: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=260&q=70'
    },
    {
      id: 'p4',
      icon: <IcoBar />,
      iconColor: 'blue',
      title: 'Strategic Reporting',
      description: 'Comprehensive dashboard analytics for the Chief Secretary\'s office. Visualize KPIs, budget utilization, and progress of Southern Province development initiatives.'
    }
  ];

  const displayPillars = pillars || defaultPillars;

  return (
    <section className="pillars-grid">
      <div className="pillars-grid__header">
        <H2>{title}</H2>
        <Paragraph className="pillars-grid__subtitle">
          {subtitle}
        </Paragraph>
      </div>

      <div className="pillars-grid__container">
        {displayPillars.map(pillar => (
          <PillarCard
            key={pillar.id}
            {...pillar}
            onClick={() => onPillarClick?.(pillar.id)}
          />
        ))}
      </div>
    </section>
  );
};

export default PillarsGrid;
