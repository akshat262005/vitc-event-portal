import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RouteGuard from './components/Common/RouteGuard';
import Login from './components/Common/Login';
import Sidebar from './components/Common/Sidebar';

// Chairperson Pages
import ChairpersonDashboard from './components/Chairperson/Dashboard';
import SubmitReportForm from './components/Chairperson/SubmitReportForm';
import UploadODForm from './components/Chairperson/UploadODForm';
import PreEventForm from './components/Chairperson/PreEventForm';

// Admin Pages
import AdminDashboard from './components/Admin/Dashboard';
import UnifiedDailyView from './components/Admin/UnifiedDailyView';
import ManageClubs from './components/Admin/ManageClubs';
import ManageChairpersons from './components/Admin/ManageChairpersons';
import ReportsList from './components/Admin/ReportsList';
import ODLists from './components/Admin/ODLists';
import MasterSheet from './components/Admin/MasterSheet';
import AdminPreEventsList from './components/Admin/AdminPreEventsList';

const PortalLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col md:flex-row bg-vit-neutral-50 dark:bg-vit-neutral-900 transition-colors duration-200">
    <Sidebar />
    <main className="flex-1 md:h-screen md:overflow-y-auto">
      {children}
    </main>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Chairperson Routes */}
          <Route
            path="/dashboard"
            element={
              <RouteGuard allowedRoles={['Chairperson']}>
                <PortalLayout>
                  <ChairpersonDashboard />
                </PortalLayout>
              </RouteGuard>
            }
          />
          <Route
            path="/pre-events/new"
            element={
              <RouteGuard allowedRoles={['Chairperson']}>
                <PortalLayout>
                  <PreEventForm />
                </PortalLayout>
              </RouteGuard>
            }
          />
          <Route
            path="/reports/new"
            element={
              <RouteGuard allowedRoles={['Chairperson']}>
                <PortalLayout>
                  <SubmitReportForm />
                </PortalLayout>
              </RouteGuard>
            }
          />
          <Route
            path="/reports/edit/:id"
            element={
              <RouteGuard allowedRoles={['Chairperson']}>
                <PortalLayout>
                  <SubmitReportForm />
                </PortalLayout>
              </RouteGuard>
            }
          />
          <Route
            path="/ods/new"
            element={
              <RouteGuard allowedRoles={['Chairperson']}>
                <PortalLayout>
                  <UploadODForm />
                </PortalLayout>
              </RouteGuard>
            }
          />
          <Route
            path="/ods/edit/:id"
            element={
              <RouteGuard allowedRoles={['Chairperson']}>
                <PortalLayout>
                  <UploadODForm />
                </PortalLayout>
              </RouteGuard>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <RouteGuard allowedRoles={['Admin']}>
                <PortalLayout>
                  <AdminDashboard />
                </PortalLayout>
              </RouteGuard>
            }
          />
          <Route
            path="/admin/daily-view"
            element={
              <RouteGuard allowedRoles={['Admin']}>
                <PortalLayout>
                  <UnifiedDailyView />
                </PortalLayout>
              </RouteGuard>
            }
          />
          <Route
            path="/admin/clubs"
            element={
              <RouteGuard allowedRoles={['Admin']}>
                <PortalLayout>
                  <ManageClubs />
                </PortalLayout>
              </RouteGuard>
            }
          />
          <Route
            path="/admin/chairpersons"
            element={
              <RouteGuard allowedRoles={['Admin']}>
                <PortalLayout>
                  <ManageChairpersons />
                </PortalLayout>
              </RouteGuard>
            }
          />
          <Route
            path="/admin/pre-events"
            element={
              <RouteGuard allowedRoles={['Admin']}>
                <PortalLayout>
                  <AdminPreEventsList />
                </PortalLayout>
              </RouteGuard>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RouteGuard allowedRoles={['Admin']}>
                <PortalLayout>
                  <ReportsList />
                </PortalLayout>
              </RouteGuard>
            }
          />
          <Route
            path="/admin/ods"
            element={
              <RouteGuard allowedRoles={['Admin']}>
                <PortalLayout>
                  <ODLists />
                </PortalLayout>
              </RouteGuard>
            }
          />
          <Route
            path="/admin/od-registry"
            element={
              <RouteGuard allowedRoles={['Admin']}>
                <PortalLayout>
                  <MasterSheet />
                </PortalLayout>
              </RouteGuard>
            }
          />

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
