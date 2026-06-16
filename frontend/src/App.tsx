import React from 'react';
import Navbar from './components/molecules/navbar';
import HeroSection from './components/organism/herosection';
import PillarsGrid from './components/organism/pillergrid';
import ApprovalWorkflow from './components/organism/approvalworkflow';
import Footer from './components/organism/footer';
import './Style/globals.css';

const App: React.FC = () => {
  const handleLoginClick = () => {
    console.log('Login clicked');
  };

  const handleSupportClick = () => {
    console.log('Support clicked');
  };

  const handlePillarClick = (pillarId: string) => {
    console.log('Pillar clicked:', pillarId);
  };

  const handleStepAction = (stepId: string) => {
    console.log('Step action:', stepId);
  };

  return (
    <div className="app">
      <Navbar 
        logoText="MMCS"
        onNotificationClick={() => console.log('Notifications')}
        onProfileClick={() => console.log('Profile')}
      />
      <main className="app__main">
        <HeroSection 
          onLoginClick={handleLoginClick}
          onSupportClick={handleSupportClick}
        />
        <PillarsGrid 
          onPillarClick={handlePillarClick}
        />
        <ApprovalWorkflow 
          onStepAction={handleStepAction}
        />
      </main>
      <Footer />
    </div>
  );
};

export default App;
