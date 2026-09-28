'use client';

import PortalLayout from '@/components/Common/PortalLayout';
import ReportsList from '@/components/Admin/ReportsList';

export default function AdminReportsPage() {
  return (
    <PortalLayout allowedRoles={['Admin']}>
      <ReportsList />
    </PortalLayout>
  );
}
