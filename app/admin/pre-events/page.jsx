'use client';

import PortalLayout from '@/components/Common/PortalLayout';
import AdminPreEventsList from '@/components/Admin/AdminPreEventsList';

export default function AdminPreEventsPage() {
  return (
    <PortalLayout allowedRoles={['Admin']}>
      <AdminPreEventsList />
    </PortalLayout>
  );
}
