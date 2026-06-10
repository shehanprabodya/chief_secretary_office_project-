import React from 'react';
import './PillarsGrid.css';
import PillarCard from '../../molecules/PillarCard/PillarCard';
import { H2, Paragraph } from '../../atoms/Text/Heading';
import {
  IcoShield,
  IcoEye,
  IcoDoc,
  IcoBar
} from '../../atoms/Icons/Icons';

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
