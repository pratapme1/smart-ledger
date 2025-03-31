import React, { useState, useEffect, useContext } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Wallet as WalletIcon, Calendar, DollarSign, CreditCard, Clock, Tag, Filter, Lock } from 'lucide-react';
import { getCurrencySymbol } from '../utils/currencyUtils';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Wallet = ({ receipts, loading, error }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalSpent: 0,
    thisMonth: 0,
    lastMonth: 0,
    avgPerDay: 0,
    receiptCount: 0,
    primaryCurrency: 'USD'
  });
  const [monthlyComparison, setMonthlyComparison] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTimeframe, setFilterTimeframe] = useState('all');
  
  // Color palette
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a64dff', '#ff6b6b', '#4ecdc4', '#ff9f1c'];
  
  useEffect(() => {
    // Skip processing if user is not authenticated
    if (!isAuthenticated) return;
    
    if (!receipts || receipts.length === 0 || loading) return;
    
    processWalletData();
  }, [receipts, loading, filterCategory, filterTimeframe, isAuthenticated]);
  
  const processWalletData = () => {
    if (!receipts || receipts.length === 0) return;
    
    // 1. Apply filters
    let filteredReceipts = [...receipts];
    
    // Filter by category if not "all"
    if (filterCategory !== 'all') {
      filteredReceipts = filteredReceipts.filter(receipt => 
        receipt.category === filterCategory
      );
    }
    
    // Filter by timeframe
    const now = new Date();
    if (filterTimeframe !== 'all') {
      let startDate;
      
      switch (filterTimeframe) {
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'lastMonth':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          filteredReceipts = filteredReceipts.filter(receipt => {
            const receiptDate = new Date(receipt.date || receipt.uploadedAt);
            return receiptDate >= startDate && receiptDate <= endDate;
          });
          break;
        case 'last30':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
          break;
        case 'last90':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
          break;
        default:
          startDate = null;
      }
      
      if (startDate && filterTimeframe !== 'lastMonth') {
        filteredReceipts = filteredReceipts.filter(receipt => {
          const receiptDate = new Date(receipt.date || receipt.uploadedAt);
          return receiptDate >= startDate;
        });
      }
    }
    
    // 2. Calculate summary statistics
    const totalSpent = filteredReceipts.reduce((sum, receipt) => sum + (receipt.totalAmount || 0), 0);
    
    // Get this month's receipts
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthReceipts = receipts.filter(receipt => {
      const receiptDate = new Date(receipt.date || receipt.uploadedAt);
      return receiptDate >= thisMonthStart;
    });
    
    // Get last month's receipts
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthReceipts = receipts.filter(receipt => {
      const receiptDate = new Date(receipt.date || receipt.uploadedAt);
      return receiptDate >= lastMonthStart && receiptDate <= lastMonthEnd;
    });
    
    const thisMonthTotal = thisMonthReceipts.reduce((sum, receipt) => sum + (receipt.totalAmount || 0), 0);
    const lastMonthTotal = lastMonthReceipts.reduce((sum, receipt) => sum + (receipt.totalAmount || 0), 0);
    
    // Calculate average daily spend (for the filtered period)
    let avgPerDay = 0;
    if (filteredReceipts.length > 0) {
      const dates = filteredReceipts.map(r => new Date(r.date || r.uploadedAt));
      const earliestDate = new Date(Math.min(...dates));
      const latestDate = new Date(Math.max(...dates));
      const daysDiff = Math.max(1, Math.ceil((latestDate - earliestDate) / (1000 * 60 * 60 * 24)));
      avgPerDay = totalSpent / daysDiff;
    }
    
    // Find most common currency
    const currencyCounts = {};
    filteredReceipts.forEach(receipt => {
      const currency = receipt.currency || 'USD';
      currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
    });
    
    let commonCurrency = 'USD';
    let maxCount = 0;
    Object.entries(currencyCounts).forEach(([currency, count]) => {
      if (count > maxCount) {
        maxCount = count;
        commonCurrency = currency;
      }
    });
    
    // 3. Get category breakdown
    const categoryTotals = {};
    filteredReceipts.forEach(receipt => {
      const category = receipt.category || 'Uncategorized';
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += receipt.totalAmount || 0;
    });
    
    const categoryData = Object.keys(categoryTotals).map(category => ({
      name: category,
      value: categoryTotals[category]
    })).sort((a, b) => b.value - a.value);
    
    // 4. Get monthly comparison data
    const monthlyData = {};
    receipts.forEach(receipt => {
      const receiptDate = new Date(receipt.date || receipt.uploadedAt);
      const monthKey = `${receiptDate.toLocaleString('default', { month: 'short' })} ${receiptDate.getFullYear()}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }
      
      monthlyData[monthKey] += receipt.totalAmount || 0;
    });
    
    // Convert to array and sort chronologically
    const monthlyDataArray = Object.keys(monthlyData).map(month => ({
      month,
      total: monthlyData[month]
    }));
    
    // Sort by month/year
    monthlyDataArray.sort((a, b) => {
      const [monthA, yearA] = a.month.split(' ');
      const [monthB, yearB] = b.month.split(' ');
      const dateA = new Date(`${monthA} 1, ${yearA}`);
      const dateB = new Date(`${monthB} 1, ${yearB}`);
      return dateA - dateB;
    });
    
    // Limit to the last 6 months
    const recentMonthlyData = monthlyDataArray.slice(-6);
    
    // 5. Recent receipts (last 5)
    const sortedReceipts = [...filteredReceipts].sort((a, b) => {
      return new Date(b.date || b.uploadedAt) - new Date(a.date || a.uploadedAt);
    });
    
    // Update state with calculated data
    setRecentReceipts(sortedReceipts.slice(0, 5));
    setCategoryBreakdown(categoryData);
    setMonthlyComparison(recentMonthlyData);
    setSummaryStats({
      totalSpent,
      thisMonth: thisMonthTotal,
      lastMonth: lastMonthTotal,
      avgPerDay,
      receiptCount: filteredReceipts.length,
      primaryCurrency: commonCurrency
    });
  };
  
  // Extract all categories for filter dropdown
  const categories = ['all', ...new Set(receipts
    .filter(r => r.category)
    .map(r => r.category))];
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Use currency from individual receipt or summary for global values
  const getSymbolForReceipt = (receipt) => {
    return getCurrencySymbol(receipt.currency || summaryStats.primaryCurrency || 'USD');
  };
  
  const primaryCurrencySymbol = getCurrencySymbol(summaryStats.primaryCurrency);
  
  // Calculate month-over-month change percentage
  const monthlyChange = summaryStats.lastMonth !== 0 
    ? ((summaryStats.thisMonth - summaryStats.lastMonth) / summaryStats.lastMonth) * 100 
    : 0;
  
  // Show authentication required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="wallet-container auth-required">
        <div className="auth-icon">
          <Lock size={64} />
        </div>
        <h2>Authentication Required</h2>
        <p>You need to be logged in to view your financial information.</p>
        <button 
          className="button button-primary login-button"
          onClick={() => navigate('/login', { state: { from: window.location.pathname } })}
        >
          Log In
        </button>
      </div>
    );
  }
  
  // Handle loading and error states
  if (loading) {
    return (
      <div className="wallet-container loading-state">
        <div className="spinner"></div>
        <p>Loading your financial summary...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="wallet-container error-state">
        <div className="error-icon">⚠️</div>
        <p>Sorry, we couldn't load your wallet information.</p>
        <p className="error-message">{error}</p>
      </div>
    );
  }
  
  // If no receipts are available
  if (!receipts || receipts.length === 0) {
    return (
      <div className="wallet-container empty-state">
        <div className="empty-wallet-icon">
          <WalletIcon size={64} />
        </div>
        <h2>Your Wallet is Empty</h2>
        <p>Upload your first receipt to start tracking your expenses</p>
        <button 
          className="upload-button"
          onClick={() => navigate('/upload')}
        >
          Upload Receipt
        </button>
      </div>
    );
  }
  
  return (
    <div className="wallet-container">
      <div className="wallet-header">
        <h2 className="wallet-title">
          <WalletIcon className="wallet-icon" size={24} />
          Financial Overview
        </h2>
        
        <div className="wallet-filters">
          <div className="filter-group">
            <label>
              <Filter size={14} /> Category:
            </label>
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>
              <Clock size={14} /> Time Period:
            </label>
            <select 
              value={filterTimeframe}
              onChange={(e) => setFilterTimeframe(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="summary-stats-grid">
        <div className="stat-card">
          <DollarSign size={24} className="stat-icon" />
          <div className="stat-content">
            <h3>Total Expenses</h3>
            <p className="stat-value">{primaryCurrencySymbol}{summaryStats.totalSpent.toFixed(2)}</p>
            <p className="stat-meta">{summaryStats.receiptCount} receipts</p>
          </div>
        </div>
        
        <div className="stat-card">
          <Calendar size={24} className="stat-icon" />
          <div className="stat-content">
            <h3>This Month</h3>
            <p className="stat-value">{primaryCurrencySymbol}{summaryStats.thisMonth.toFixed(2)}</p>
            <p className={`stat-meta ${monthlyChange > 0 ? 'negative' : 'positive'}`}>
              {monthlyChange.toFixed(1)}% vs last month
            </p>
          </div>
        </div>
        
        <div className="stat-card">
          <CreditCard size={24} className="stat-icon" />
          <div className="stat-content">
            <h3>Daily Average</h3>
            <p className="stat-value">{primaryCurrencySymbol}{summaryStats.avgPerDay.toFixed(2)}</p>
            <p className="stat-meta">per day</p>
          </div>
        </div>
      </div>
      
      <div className="wallet-flex-container">
        {/* Category Breakdown Chart */}
        <div className="wallet-chart-card">
          <h3 className="chart-title">
            <Tag size={18} className="chart-icon" />
            Spending by Category
          </h3>
          
          <div className="chart-container">
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${primaryCurrencySymbol}${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message">
                <p>No category data available</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Monthly Comparison Chart */}
        <div className="wallet-chart-card">
          <h3 className="chart-title">
            <Calendar size={18} className="chart-icon" />
            Monthly Spending Trend
          </h3>
          
          <div className="chart-container">
            {monthlyComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${primaryCurrencySymbol}${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="total" name="Total Spent" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message">
                <p>No monthly data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Recent Receipts */}
      <div className="recent-receipts-section">
        <h3 className="section-title">
          <Clock size={18} className="section-icon" />
          Recent Receipts
        </h3>
        
        {recentReceipts.length > 0 ? (
          <div className="recent-receipts-list">
            {recentReceipts.map((receipt, index) => (
              <div key={receipt._id || index} className="recent-receipt-card">
                <div className="receipt-card-left">
                  <div className="receipt-date">{formatDate(receipt.date || receipt.uploadedAt)}</div>
                  <div className="receipt-merchant">{receipt.merchant || receipt.fileName || "Unknown merchant"}</div>
                  {receipt.category && <div className="receipt-category">{receipt.category}</div>}
                </div>
                <div className="receipt-amount">
                  {getSymbolForReceipt(receipt)}{receipt.totalAmount.toFixed(2)}
                  {receipt.currency && <span className="receipt-currency">{receipt.currency}</span>}
                </div>
              </div>
            ))}
            
            <div className="view-all-link">
              <a href="/receipts" onClick={(e) => {e.preventDefault(); navigate('/receipts');}}>View All Receipts</a>
            </div>
          </div>
        ) : (
          <div className="no-receipts-message">
            <p>No recent receipts found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;