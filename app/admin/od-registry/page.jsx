'use client';

import PortalLayout from '@/components/Common/PortalLayout';
import MasterSheet from '@/components/Admin/MasterSheet';

export default function AdminODRegistryPage() {
  return (
    <PortalLayout allowedRoles={['Admin']}>
      <MasterSheet />
    </PortalLayout>
  );
}
