import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import ApprovalActivityLog from '../components/Dashboard/ApprovalActivityLog';
import { approvalService } from '../services/approvalService';
import type { ApprovalActivityItem } from '../types/approval';

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ApprovalActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setActivities(await approvalService.getActivityLog(30));
    } catch (err) {
      console.error(err);
      setError('Unable to load activity log.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadActivity();
  }, []);

  return (
    <DashboardLayout pageTitle="Activity Log">
      <ApprovalActivityLog
        items={activities}
        isLoading={isLoading}
        error={error}
        onRefresh={loadActivity}
      />
    </DashboardLayout>
  );
}
