'use client';

import PortalLayout from '@/components/Common/PortalLayout';
import PreEventForm from '@/components/Chairperson/PreEventForm';

export default function PreEventNewPage() {
  return (
    <PortalLayout allowedRoles={['Chairperson']}>
      <PreEventForm />
    </PortalLayout>
  );
}
