import { useState, useEffect, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Existing Components
import EnhancedUploadTab from "./components/EnhancedUploadTab";
import Wallet from "./components/Wallet";
import Analytics from "./components/Analytics";
import AiInsights from "./components/AiInsights";
import Header from "./components/Header";
import InstallPWA from './components/InstallPWA';
import "./styles.css";

// Auth Components
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './components/auth/login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import AuthCallback from './components/auth/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';

// API service
import api from './services/api';

function App() {
  return (
    <Router>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </Router>
  );
}

// Main app component separated to access hooks
function MainApp() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const location = useLocation();
  
  // Get authentication state from context
  const { isAuthenticated, user, logout } = useContext(AuthContext);

  // Track window width for responsive design
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchReceipts();
    } else {
      // Clear receipts when not authenticated
      setReceipts([]);
      setLoading(false);
    }
  }, [refreshTrigger, isAuthenticated, user]);

  const fetchReceipts = async () => {
    if (!isAuthenticated) {
      setReceipts([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Use the API service to fetch receipts
      const data = await api.receipts.getReceipts();
      setReceipts(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch receipts:", err);
      
      // Handle authentication errors
      if (err.response && err.response.status === 401) {
        setError("Authentication failed. Please log in again.");
        // Automatically logout on 401 errors
        logout();
      } else {
        setError("Failed to fetch receipts");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleReceiptDeleted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Determine if it's a mobile device
  const isMobile = windowWidth < 768;
  
  // Determine active tab based on current path
  const getActiveTab = (path) => {
    // Make dashboard active for both /dashboard and /wallet routes
    if (path === "/dashboard" && 
        (location.pathname === "/dashboard" || location.pathname === "/wallet")) {
      return "active";
    }
    return location.pathname === path ? "active" : "";
  };

  // Check if current route is an auth route
  const isAuthRoute = 
    location.pathname.includes('/login') || 
    location.pathname.includes('/register') || 
    location.pathname.includes('/forgot-password') || 
    location.pathname.includes('/reset-password') || 
    location.pathname.includes('/auth-callback');

  return (
    <div className="app-container">
      <Header />
      
      {/* Install PWA button - placed near the header */}
      <div className="pwa-install-container">
        <InstallPWA />
      </div>
      
      {/* Only show navigation tabs for authenticated users and non-auth routes */}
      {!isAuthRoute && isAuthenticated && (
        <nav className="nav-tabs">
          <Link to="/wallet" className={`tab-button ${getActiveTab("/dashboard")}`}>
            <span className="tab-icon">💼</span>
            {isMobile ? "" : "Wallet"}
          </Link>
          <Link to="/analytics" className={`tab-button ${getActiveTab("/analytics")}`}>
            <span className="tab-icon">📊</span>
            {isMobile ? "" : "Analytics"}
          </Link>
          <Link to="/insights" className={`tab-button ${getActiveTab("/insights")}`}>
            <span className="tab-icon">💡</span>
            {isMobile ? "" : "AI Insights"}
          </Link>
          <Link to="/upload" className={`tab-button ${getActiveTab("/upload")}`}>
            <span className="tab-icon">📤</span>
            {isMobile ? "" : "Upload"}
          </Link>
        </nav>
      )}
      
      <main className="content">
        <Routes>
          {/* Auth Routes (Public) */}
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/wallet" replace /> : <Login />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/wallet" replace /> : <Register />
          } />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* OAuth Callback Route - Use the existing AuthCallback component */}
          <Route path="/auth-callback" element={<AuthCallback />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Add wallet route that displays the Wallet component */}
            <Route path="/wallet" element={
              <Wallet 
                receipts={receipts} 
                loading={loading} 
                error={error} 
                isMobile={isMobile} 
                onRefresh={() => setRefreshTrigger(prev => prev + 1)}
              />
            } />
            
            {/* Keep dashboard route for backward compatibility */}
            <Route path="/dashboard" element={
              <Navigate to="/wallet" replace />
            } />
            
            <Route path="/analytics" element={
              <Analytics receipts={receipts} loading={loading} isMobile={isMobile} />
            } />
            <Route path="/insights" element={
              <AiInsights receipts={receipts} loading={loading} isMobile={isMobile} />
            } />
            <Route path="/upload" element={
              <EnhancedUploadTab
                onUpload={handleUpload}
                receipts={receipts} 
                loading={loading} 
                error={error}
                onReceiptDeleted={handleReceiptDeleted}
                isMobile={isMobile}
              />
            } />
          </Route>
          
          {/* Default Route - Redirect to wallet if authenticated, otherwise login */}
          <Route path="/" element={
            isAuthenticated ? 
              <Navigate to="/wallet" replace /> : 
              <Navigate to="/login" replace />
          } />
          <Route path="*" element={
            isAuthenticated ? 
              <Navigate to="/wallet" replace /> : 
              <Navigate to="/login" replace />
          } />
        </Routes>
      </main>
      
      <footer className="footer">
        <p>© {new Date().getFullYear()} SmartLedger. All rights reserved.</p>
      </footer>
      
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;