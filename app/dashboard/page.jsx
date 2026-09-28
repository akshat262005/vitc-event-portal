'use client';

import PortalLayout from '@/components/Common/PortalLayout';
import ChairpersonDashboard from '@/components/Chairperson/Dashboard';

export default function DashboardPage() {
  return (
    <PortalLayout allowedRoles={['Chairperson']}>
      <ChairpersonDashboard />
    </PortalLayout>
  );
}
