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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2">
          
          {/* Welcome Section */}
          <section className="mb-10">
            <WelcomeSection />
          </section>

          {/* Assigned Meetings */}
          <section className="mb-10">
            <AssignedMeetingsCard />
          </section>

          {/* Draft Cards */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <DraftMinutesCard />
              <DraftLettersCard />
            </div>
          </section>

        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-8">
          
          <section>
            <CalendarWidget />
          </section>

          <section>
            <TimelineWidget />
          </section>

        </div>

      </div>
    </DashboardLayout>
  );
}