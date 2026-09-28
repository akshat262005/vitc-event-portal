'use client';

import PortalLayout from '@/components/Common/PortalLayout';
import ODLists from '@/components/Admin/ODLists';

export default function AdminODsPage() {
  return (
    <PortalLayout allowedRoles={['Admin']}>
      <ODLists />
    </PortalLayout>
  );
}
