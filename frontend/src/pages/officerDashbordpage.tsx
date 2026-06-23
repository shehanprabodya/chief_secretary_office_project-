import DashboardLayout from '../components/layouts/DashboardLayout';
import WelcomeSection from '../components/Dashboard/WelcomeSection';
import AssignedMeetingsCard from '../components/Dashboard/AssignedMeetingsCard';
import CalendarWidget from '../components/Dashboard/CalendarWidget';
import TimelineWidget from '../components/Dashboard/TimelineWidget';
import DraftMinutesCard from '../components/Dashboard/DraftMinutesCard';
import DraftLettersCard from '../components/Dashboard/DraftLettersCard';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <WelcomeSection />

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Meetings & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <AssignedMeetingsCard />
          </div>

          {/* Right Column - Calendar & Actions */}
          <div className="space-y-6">
            <CalendarWidget />
            <TimelineWidget />
          </div>
        </div>

        {/* Draft Items Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <DraftMinutesCard />
          <DraftLettersCard />
        </div>
      </div>
    </DashboardLayout>
  );
}
