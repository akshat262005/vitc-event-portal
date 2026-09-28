'use client';

import { Suspense } from 'react';
import PortalLayout from '@/components/Common/PortalLayout';
import UploadODForm from '@/components/Chairperson/UploadODForm';
import Loader from '@/components/Common/Loader';

export default function ODNewPage() {
  return (
    <PortalLayout allowedRoles={['Chairperson']}>
      <Suspense
        fallback={
          <div className="p-8 flex justify-center">
            <Loader size="lg" />
          </div>
        }
      >
        <UploadODForm />
      </Suspense>
    </PortalLayout>
  );
}
