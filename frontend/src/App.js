import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import EnhancedUploadTab from "./components/EnhancedUploadTab";
import Wallet from "./components/Wallet";
import Analytics from "./components/Analytics";
import AiInsights from "./components/AiInsights";
import Header from "./components/Header";
import "./styles.css";

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReceipts();
  }, [refreshTrigger]);

  const fetchReceipts = () => {
    setLoading(true);
    fetch("http://localhost:5000/get-receipts")
      .then((res) => res.json())
      .then((data) => {
        setReceipts(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch receipts:", err);
        setError("Failed to fetch receipts");
        setLoading(false);
      });
  };

  const handleUpload = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleReceiptDeleted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Router>
      <AppContent 
        receipts={receipts} 
        loading={loading} 
        error={error} 
        handleUpload={handleUpload} 
        handleReceiptDeleted={handleReceiptDeleted}
      />
    </Router>
  );
}

// Separated to access useLocation hook which must be used inside Router context
function AppContent({ receipts, loading, error, handleUpload, handleReceiptDeleted }) {
  const location = useLocation();
  
  // Determine active tab based on current path
  const getActiveTab = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <div className="app-container">
      <Header />
      
      <nav className="nav-tabs">
        <Link to="/" className={`tab-button ${getActiveTab("/")}`}>
          <span className="tab-icon">💼</span>
          Wallet
        </Link>
        <Link to="/analytics" className={`tab-button ${getActiveTab("/analytics")}`}>
          <span className="tab-icon">📊</span>
          Analytics
        </Link>
        <Link to="/insights" className={`tab-button ${getActiveTab("/insights")}`}>
          <span className="tab-icon">💡</span>
          AI Insights
        </Link>
        <Link to="/upload" className={`tab-button ${getActiveTab("/upload")}`}>
          <span className="tab-icon">📤</span>
          Upload
        </Link>
      </nav>
      
      <main className="content">
        <Routes>
          <Route path="/" element={
            <Wallet receipts={receipts} loading={loading} error={error} />
          } />
          <Route path="/analytics" element={
            <Analytics receipts={receipts} loading={loading} />
          } />
          <Route path="/insights" element={
            <AiInsights receipts={receipts} loading={loading} />
          } />
          <Route path="/upload" element={
            <EnhancedUploadTab
              onUpload={handleUpload}
              receipts={receipts} 
              loading={loading} 
              error={error}
              onReceiptDeleted={handleReceiptDeleted}
            />
          } />
        </Routes>
      </main>
      
      <footer className="footer">
        <p>© {new Date().getFullYear()} SmartLedger. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;