import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import WelcomeSection from '../components/Dashboard/WelcomeSection';
import AssignedMeetingsCard from '../components/Dashboard/AssignedMeetingsCard';
import CalendarWidget from '../components/Dashboard/CalendarWidget';
import TimelineWidget from '../components/Dashboard/TimelineWidget';
import ApprovalActivityLog from '../components/Dashboard/ApprovalActivityLog';
import { approvalService } from '../services/approvalService';
import type { ApprovalActivityItem } from '../types/approval';


export default function DashboardPage() {
  const [activePanel, setActivePanel] = useState<'overview' | 'activity'>('overview');
  const [activities, setActivities] = useState<ApprovalActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const loadActivity = async () => {
    setActivityLoading(true);
    setActivityError(null);
    try {
      setActivities(await approvalService.getActivityLog(15));
    } catch (error) {
      console.error(error);
      setActivityError('Unable to load activity log.');
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadActivity();
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-4 flex gap-3 border-b border-slate-200">
        <button
          onClick={() => setActivePanel('overview')}
          className={`-mb-px border-b-2 px-1 py-2 text-sm font-medium ${activePanel === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActivePanel('activity')}
          className={`-mb-px border-b-2 px-1 py-2 text-sm font-medium ${activePanel === 'activity' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Activity Log
        </button>
      </div>

      {activePanel === 'activity' ? (
        <ApprovalActivityLog
          items={activities}
          isLoading={activityLoading}
          error={activityError}
          onRefresh={loadActivity}
        />
      ) : (
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
      )}
    </DashboardLayout>
  );
}
