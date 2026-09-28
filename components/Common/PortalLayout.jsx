'use client';

import Sidebar from '@/components/Common/Sidebar';
import RouteGuard from '@/components/Common/RouteGuard';

export default function PortalLayout({ children, allowedRoles }) {
  return (
    <RouteGuard allowedRoles={allowedRoles}>
      <div className="min-h-screen flex flex-col md:flex-row bg-vit-neutral-50 dark:bg-vit-neutral-900 transition-colors duration-200">
        <Sidebar />
        <main className="flex-1 md:h-screen md:overflow-y-auto">{children}</main>
      </div>
    </RouteGuard>
  );
}
