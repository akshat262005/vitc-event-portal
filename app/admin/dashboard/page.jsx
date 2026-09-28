'use client';

import PortalLayout from '@/components/Common/PortalLayout';
import AdminDashboard from '@/components/Admin/Dashboard';

export default function AdminDashboardPage() {
  return (
    <PortalLayout allowedRoles={['Admin']}>
      <AdminDashboard />
    </PortalLayout>
  );
}
