'use client';

import PortalLayout from '@/components/Common/PortalLayout';
import SubmitReportForm from '@/components/Chairperson/SubmitReportForm';

export default function ReportNewPage() {
  return (
    <PortalLayout allowedRoles={['Chairperson']}>
      <SubmitReportForm />
    </PortalLayout>
  );
}
