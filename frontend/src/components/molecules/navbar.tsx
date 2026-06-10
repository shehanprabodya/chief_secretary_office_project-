import React from 'react';
import './Navbar.css';

interface NavbarIconButton {
  id: string;
  icon: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
}

const IcoBell: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C13.1046 22 14 21.1046 14 20H10C10 21.1046 10.8954 22 12 22Z" fill="currentColor" />
    <path d="M18 16V11C18 7.68629 16.2091 5.10295 13.25 4.32132V4C13.25 3.30964 12.6904 2.75 12 2.75C11.3096 2.75 10.75 3.30964 10.75 4V4.32132C7.79086 5.10295 6 7.68629 6 11V16L4 18V19H20V18L18 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IcoUser: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface NavbarProps {
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  logoText?: string;
}

const Navbar: React.FC<NavbarProps> = ({
  onNotificationClick,
  onProfileClick,
  logoText = 'MMCS',
}) => {
  const iconButtons: NavbarIconButton[] = [
    { id: 'bell', icon: <IcoBell />, ariaLabel: 'Notifications', onClick: onNotificationClick },
    { id: 'user', icon: <IcoUser />, ariaLabel: 'Profile', onClick: onProfileClick }
  ];

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar__logo" role="img" aria-label="MMCS Logo">
        {logoText}
      </div>
      <div className="navbar__actions">
        {iconButtons.map(btn => (
          <button
            key={btn.id}
            className="navbar__icon-btn"
            onClick={btn.onClick}
            aria-label={btn.ariaLabel}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
