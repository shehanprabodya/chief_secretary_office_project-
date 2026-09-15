import DashboardLayout from '../components/layouts/DashboardLayout';
import WelcomeSection from '../components/Dashboard/WelcomeSection';
import AssignedMeetingsCard from '../components/Dashboard/AssignedMeetingsCard';
import CalendarWidget from '../components/Dashboard/CalendarWidget';
import TimelineWidget from '../components/Dashboard/TimelineWidget';


export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Main Content - Left Side */}
        <div className="flex flex-col gap-10 lg:col-span-2">
          
          {/* Welcome Section */}
          <section>
            <WelcomeSection />
          </section>

          {/* Assigned Meetings */}
          <section>
            <AssignedMeetingsCard />
          </section>

          {/* Draft Cards */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            </div>
          </section>

        </div>

        {/* Sidebar - Right Side */}
        <div className="flex flex-col gap-10">
          
          <section className="space-y-10">
            <CalendarWidget />
          </section>

          <section className="space-y-10">
            <TimelineWidget />
          </section>

        </div>

      </div>
    </DashboardLayout>
  );
}
