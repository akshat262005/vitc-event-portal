'use client';

import PortalLayout from '@/components/Common/PortalLayout';
import ManageAdmins from '@/components/Admin/ManageAdmins';

export default function AdminAdminsPage() {
  return (
    <PortalLayout allowedRoles={['Admin']}>
      <ManageAdmins />
    </PortalLayout>
  );
}
