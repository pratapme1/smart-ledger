import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);
  const location = useLocation();
  
  // Log authentication state for debugging
  console.log("ProtectedRoute check:", { 
    isAuthenticated, 
    hasUser: !!user, 
    loading,
    path: location.pathname,
    tokenInStorage: !!localStorage.getItem('token'),
    userInStorage: !!localStorage.getItem('user')
  });
  
  if (loading) {
    // Show loading indicator while checking authentication
    return (
      <div className="loading-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '200px',
        margin: '50px auto'
      }}>
        <div className="loading-spinner" style={{ 
          border: '4px solid #f3f3f3', 
          borderTop: '4px solid #3498db', 
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}></div>
        <p>Verifying your account...</p>
        
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }
  
  // Backup check: If context says not authenticated but we have token and user in localStorage
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  
  if ((!isAuthenticated || !user) && token && storedUser) {
    console.log("ProtectedRoute: Auth context not updated but localStorage has auth data");
    console.log("ProtectedRoute: Allowing access based on localStorage");
    
    // Return the outlet to allow access based on localStorage
    return <Outlet />;
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    console.log("ProtectedRoute: Not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  // Render children routes if authenticated
  console.log("ProtectedRoute: Authentication successful, rendering routes");
  return <Outlet />;
};

export default ProtectedRoute;