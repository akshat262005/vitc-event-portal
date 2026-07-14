import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from './Loader';

const RouteGuard = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vit-neutral-50 dark:bg-vit-neutral-900">
        <Loader size="lg" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If authenticated but unauthorized role, redirect to appropriate home
    return <Navigate to={user.role === 'Admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  return children;
};

export default RouteGuard;
