import React, { useState, useEffect, useContext } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Calendar, TrendingUp, DollarSign, Clock, Circle, Lock } from 'lucide-react';
import { getCurrencySymbol } from '../utils/currencyUtils';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
// CSS styles are in your global stylesheet

const Analytics = ({ receipts, loading }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  
  const [timeRange, setTimeRange] = useState('all'); // Default to 'all'
  const [categoryData, setCategoryData] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalSpent: 0,
    avgTransaction: 0,
    topCategory: '',
    mostExpensivePurchase: 0,
    receiptCount: 0,
    primaryCurrency: 'USD'
  });

  // Check if we should render this component
  const shouldRender = location.pathname === '/analytics';
  
  // Redirect if not authenticated
  useEffect(() => {
    if (shouldRender && !isAuthenticated) {
      // We could redirect, but let's display a login prompt instead
      // navigate('/login', { state: { from: location } });
    }
  }, [shouldRender, isAuthenticated, navigate, location]);

  // Custom color palette for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a64dff', '#ff6b6b', '#4ecdc4', '#ff9f1c'];
  
  useEffect(() => {
    if (!shouldRender) return;
    if (!isAuthenticated) return; // Don't process data if not authenticated
    if (!receipts || receipts.length === 0) return;
    
    // Process receipt data for analytics
    processReceiptData();
  }, [receipts, timeRange, shouldRender, loading, isAuthenticated]);
  
  const processReceiptData = () => {
    if (!receipts || receipts.length === 0) return;
    
    // Get current date and set boundary dates based on selected time range
    const now = new Date();
    let startDate = new Date(1900, 0, 1); // Default to a very old date
    
    switch (timeRange) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'weekly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      case 'all':
      default:
        // Keep the very old start date to include all receipts
        break;
    }
    
    // Filter relevant receipts based on date range
    const relevantReceipts = receipts.filter(receipt => {
      if (!receipt.date && !receipt.uploadedAt) {
        console.warn("Receipt missing date fields:", receipt);
        return true; // Include receipts with missing dates
      }
      
      const receiptDate = new Date(receipt.date || receipt.uploadedAt);
      return receiptDate >= startDate && receiptDate <= now;
    });
    
    if (relevantReceipts.length === 0) {
      console.warn("No relevant receipts found in date range");
      return;
    }
    
    // Find most common currency
    const currencyCounts = {};
    relevantReceipts.forEach(receipt => {
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
    
    // Calculate total amounts for each receipt item
    const receiptsWithTotals = relevantReceipts.map(receipt => {
      // If receipt already has totalAmount, use it
      if (receipt.totalAmount) return receipt;
      
      // Otherwise, calculate from items
      if (receipt.items && receipt.items.length) {
        const calculatedTotal = receipt.items.reduce((sum, item) => {
          return sum + (item.price * (item.quantity || 1));
        }, 0);
        return { ...receipt, totalAmount: calculatedTotal };
      }
      
      return receipt;
    });
    
    // Process category data
    const categoryTotals = {};
    receiptsWithTotals.forEach(receipt => {
      const category = receipt.category || 'Uncategorized';
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += receipt.totalAmount || 0;
    });
    
    const categoryDataArray = Object.keys(categoryTotals).map(category => ({
      name: category,
      value: categoryTotals[category]
    })).sort((a, b) => b.value - a.value);
    
    setCategoryData(categoryDataArray);
    
    // Process time series data
    const timeData = {};
    
    receiptsWithTotals.forEach(receipt => {
      const receiptDate = new Date(receipt.date || receipt.uploadedAt);
      let timeKey;
      
      if (timeRange === 'daily' || timeRange === 'weekly') {
        timeKey = receiptDate.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (timeRange === 'monthly' || timeRange === 'yearly') {
        timeKey = `${receiptDate.toLocaleString('default', { month: 'short' })} ${receiptDate.getFullYear()}`;
      } else { // all
        timeKey = receiptDate.getFullYear().toString();
      }
      
      if (!timeData[timeKey]) {
        timeData[timeKey] = {
          time: timeKey,
          amount: 0,
          count: 0
        };
      }
      
      timeData[timeKey].amount += receipt.totalAmount || 0;
      timeData[timeKey].count += 1;
    });
    
    // Convert to array and sort chronologically
    let timeDataArray = Object.values(timeData);
    
    // Sort based on time range
    if (timeRange === 'daily' || timeRange === 'weekly') {
      timeDataArray.sort((a, b) => new Date(a.time) - new Date(b.time));
    } else if (timeRange === 'monthly' || timeRange === 'yearly') {
      timeDataArray.sort((a, b) => {
        const [monthA, yearA] = a.time.split(' ');
        const [monthB, yearB] = b.time.split(' ');
        const dateA = new Date(`${monthA} 1, ${yearA}`);
        const dateB = new Date(`${monthB} 1, ${yearB}`);
        return dateA - dateB;
      });
    } else { // all
      timeDataArray.sort((a, b) => a.time - b.time);
    }
    
    // Limit data points for better visualization
    if (timeDataArray.length > 12 && timeRange === 'all') {
      timeDataArray = timeDataArray.slice(-12);
    }
    
    // Calculate weekly spending by day of week
    const dayOfWeekData = {
      'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0
    };
    
    receiptsWithTotals.forEach(receipt => {
      const receiptDate = new Date(receipt.date || receipt.uploadedAt);
      const dayOfWeek = receiptDate.toLocaleString('default', { weekday: 'short' });
      dayOfWeekData[dayOfWeek] += receipt.totalAmount || 0;
    });
    
    const weeklyDataArray = Object.keys(dayOfWeekData).map(day => ({
      day,
      amount: dayOfWeekData[day]
    }));
    
    // Calculate summary statistics
    const totalSpent = receiptsWithTotals.reduce((sum, receipt) => sum + (receipt.totalAmount || 0), 0);
    const avgTransaction = totalSpent / receiptsWithTotals.length;
    const topCategory = categoryDataArray.length > 0 ? categoryDataArray[0].name : 'N/A';
    const mostExpensivePurchase = Math.max(...receiptsWithTotals.map(r => r.totalAmount || 0));
    
    setTimeSeriesData(timeDataArray);
    setWeeklyData(weeklyDataArray);
    setSummaryStats({
      totalSpent,
      avgTransaction,
      topCategory,
      mostExpensivePurchase,
      receiptCount: receiptsWithTotals.length,
      primaryCurrency: commonCurrency
    });
  };
  
  // Get the currency symbol for the primary currency
  const primaryCurrencySymbol = getCurrencySymbol(summaryStats.primaryCurrency);
  
  const renderTimeRangeSelector = () => (
    <div className="time-range-selector">
      <button 
        className={`time-button ${timeRange === 'all' ? 'active' : ''}`}
        onClick={() => setTimeRange('all')}
      >
        All Time
      </button>
      <button 
        className={`time-button ${timeRange === 'yearly' ? 'active' : ''}`}
        onClick={() => setTimeRange('yearly')}
      >
        Last Year
      </button>
      <button 
        className={`time-button ${timeRange === 'monthly' ? 'active' : ''}`}
        onClick={() => setTimeRange('monthly')}
      >
        Last 6 Months
      </button>
      <button 
        className={`time-button ${timeRange === 'weekly' ? 'active' : ''}`}
        onClick={() => setTimeRange('weekly')}
      >
        Last 30 Days
      </button>
      <button 
        className={`time-button ${timeRange === 'daily' ? 'active' : ''}`}
        onClick={() => setTimeRange('daily')}
      >
        Last 7 Days
      </button>
    </div>
  );
  
  // Early return if not on analytics page
  if (!shouldRender) {
    return null;
  }
  
  // Show auth required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="analytics-dashboard auth-required">
        <div className="auth-icon">
          <Lock size={64} />
        </div>
        <h2>Authentication Required</h2>
        <p>You need to be logged in to view your spending analytics.</p>
        <button 
          className="button button-primary login-button"
          onClick={() => navigate('/login', { state: { from: location } })}
        >
          Log In
        </button>
      </div>
    );
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="analytics-dashboard loading-state">
        <div className="spinner"></div>
        <p>Loading your spending analytics...</p>
      </div>
    );
  }
  
  // If no receipts at all
  if (!receipts || receipts.length === 0) {
    return (
      <div className="analytics-dashboard empty-state">
        <div className="empty-icon">
          <TrendingUp size={64} />
        </div>
        <h2>No Receipt Data Available</h2>
        <p>Upload some receipts to see spending analytics</p>
      </div>
    );
  }
  
  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h2 className="dashboard-title">
          <TrendingUp className="card-title-icon" size={20} />
          Spending Analytics
          {summaryStats.primaryCurrency !== 'USD' && (
            <span className="currency-indicator">({summaryStats.primaryCurrency})</span>
          )}
        </h2>
        {renderTimeRangeSelector()}
      </div>
      
      <div className="summary-stats">
        <div className="stat-card">
          <DollarSign size={24} className="stat-icon" />
          <div className="stat-content">
            <h3>Total Spent</h3>
            <p className="stat-value">
              {primaryCurrencySymbol}{summaryStats.totalSpent.toFixed(2)}
            </p>
          </div>
        </div>
        
        <div className="stat-card">
          <Circle size={24} className="stat-icon" />
          <div className="stat-content">
            <h3>Top Category</h3>
            <p className="stat-value">{summaryStats.topCategory}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <Calendar size={24} className="stat-icon" />
          <div className="stat-content">
            <h3>Receipt Count</h3>
            <p className="stat-value">{summaryStats.receiptCount}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <Clock size={24} className="stat-icon" />
          <div className="stat-content">
            <h3>Avg Transaction</h3>
            <p className="stat-value">
              {primaryCurrencySymbol}{summaryStats.avgTransaction.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      
      <div className="analytics-grid">
        <div className="chart-card">
          <h3 className="chart-title">Spending Over Time</h3>
          <div className="chart-container">
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={timeSeriesData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${primaryCurrencySymbol}${value.toFixed(2)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="amount" name="Amount" stroke="#0088FE" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message">
                <p>No spending data available for this timeframe</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="chart-card">
          <h3 className="chart-title">Spending by Category</h3>
          <div className="chart-container">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
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
        
        <div className="chart-card">
          <h3 className="chart-title">Day of Week Spending</h3>
          <div className="chart-container">
            {weeklyData.some(day => day.amount > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${primaryCurrencySymbol}${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="amount" name="Amount" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message">
                <p>No day-of-week data available</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="chart-card">
          <h3 className="chart-title">Transaction Frequency</h3>
          <div className="chart-container">
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Transaction Count" fill="#FFBB28" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message">
                <p>No transaction frequency data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;