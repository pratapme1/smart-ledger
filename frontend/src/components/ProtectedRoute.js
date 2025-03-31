import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);
  const location = useLocation();
  
  if (loading) {
    // Show loading indicator while checking authentication
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading authentication...</p>
      </div>
    );
  }
  
  if (!isAuthenticated || !user) {
    // Redirect to login if not authenticated, preserving the intended destination
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  // Render children routes if authenticated
  return <Outlet />;
};

export default ProtectedRoute;