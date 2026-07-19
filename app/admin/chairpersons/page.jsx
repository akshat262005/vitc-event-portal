'use client';

import PortalLayout from '@/components/Common/PortalLayout';
import ManageChairpersons from '@/components/Admin/ManageChairpersons';

export default function AdminChairpersonsPage() {
  return (
    <PortalLayout allowedRoles={['Admin']}>
      <ManageChairpersons />
    </PortalLayout>
  );
}
