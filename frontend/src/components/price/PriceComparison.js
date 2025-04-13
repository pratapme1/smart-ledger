import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, DollarSign, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import './PriceComparison.css';

const PriceComparison = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priceHistory, setPriceHistory] = useState([]);
  const [priceStats, setPriceStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.price.getPriceHistory(searchTerm);
      setPriceHistory(response.prices || []);
      setPriceStats(response.stats || null);
    } catch (err) {
      setError('Failed to fetch price history');
      console.error('Error fetching price history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="text-red-500" />;
      case 'down':
        return <TrendingDown className="text-green-500" />;
      default:
        return <Minus className="text-gray-500" />;
    }
  };

  // Show authentication required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="price-comparison-container auth-required">
        <div className="auth-icon">
          <Lock size={64} />
        </div>
        <h2>Authentication Required</h2>
        <p>You need to be logged in to use price comparison features.</p>
        <button 
          className="button button-primary login-button"
          onClick={() => navigate('/login', { state: { from: window.location.pathname } })}
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="price-comparison-container">
      <div className="price-header">
        <h2 className="price-title">
          <DollarSign className="price-title-icon" size={24} />
          Price Comparison
        </h2>
      </div>

      <div className="search-section">
        <div className="search-input">
          <input
            type="text"
            placeholder="Enter item name to compare prices"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            className="search-button"
            onClick={handleSearch}
            disabled={!searchTerm.trim()}
          >
            <Search size={16} />
            Search
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading price data...</p>
        </div>
      ) : priceHistory.length > 0 ? (
        <div className="price-data-section">
          <div className="price-stats">
            <div className="stat-card">
              <h3>Current Price</h3>
              <p className="stat-value">
                ₹{priceHistory[0]?.price?.toFixed(2)}
              </p>
            </div>

            <div className="stat-card">
              <h3>Price Trend</h3>
              <div className="trend-indicator">
                {getTrendIcon(priceHistory[0]?.priceTrend)}
                <span className="trend-text">
                  {priceHistory[0]?.priceChangePercentage}
                </span>
              </div>
            </div>

            <div className="stat-card">
              <h3>Best Price</h3>
              <p className="stat-value">
                ₹{Math.min(...priceHistory.map(h => h.price)).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="price-chart">
            <h3>Price History</h3>
            <div className="chart-container">
              {/* Chart implementation would go here */}
              <p>Price chart visualization</p>
            </div>
          </div>

          <div className="merchant-comparison">
            <h3>Merchant Comparison</h3>
            <div className="merchant-list">
              {/* Merchant comparison list would go here */}
              <p>Merchant price comparison list</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <DollarSign size={64} />
          <h3>Start Comparing Prices</h3>
          <p>Enter an item name to see price history and comparisons across merchants.</p>
        </div>
      )}
    </div>
  );
};

export default PriceComparison; 