import React from 'react';
import './PillarCard.css';
import Card from '../atoms/card';
import IconBox from '../atoms/iconbox';
import { H4, Paragraph } from '../atoms/heading';

interface PillarCardProps {
  id?: string;
  icon: React.ReactNode;
  iconColor: 'blue' | 'rose' | 'green' | 'slate' | 'purple' | 'amber';
  title: string;
  description: string;
  imageSrc?: string;
  onClick?: () => void;
}

const PillarCard: React.FC<PillarCardProps> = ({
  id,
  icon,
  iconColor,
  title,
  description,
  imageSrc,
  onClick,
}) => {
  return (
    <Card hoverable onClick={onClick}>
      <div className="pillar-card">
        <div className="pillar-card__content">
          <IconBox color={iconColor} size={38} ariaLabel={title}>
            {icon}
          </IconBox>
          <H4>{title}</H4>
          <Paragraph variant="sm">{description}</Paragraph>
        </div>
        {imageSrc && (
          <div className="pillar-card__image">
            <img src={imageSrc} alt={title} loading="lazy" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default PillarCard;
