'use client';

import { Suspense } from 'react';
import PortalLayout from '@/components/Common/PortalLayout';
import UnifiedDailyView from '@/components/Admin/UnifiedDailyView';
import Loader from '@/components/Common/Loader';

export default function AdminDailyViewPage() {
  return (
    <PortalLayout allowedRoles={['Admin']}>
      <Suspense
        fallback={
          <div className="p-8 flex justify-center">
            <Loader size="lg" />
          </div>
        }
      >
        <UnifiedDailyView />
      </Suspense>
    </PortalLayout>
  );
}
