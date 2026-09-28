'use client';

import PortalLayout from '@/components/Common/PortalLayout';
import ManageClubs from '@/components/Admin/ManageClubs';

export default function AdminClubsPage() {
  return (
    <PortalLayout allowedRoles={['Admin']}>
      <ManageClubs />
    </PortalLayout>
  );
}
