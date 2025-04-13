import React, { useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Wallet, Plus, AlertTriangle, Settings } from 'lucide-react';
import { useBudget } from '../../context/BudgetContext';
import { AuthContext } from '../../context/AuthContext';
import './BudgetTracker.css';

const BudgetTracker = () => {
  const { budgetAnalytics, budgetConfig, fetchBudgetAnalytics, loading, error } = useBudget();
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      console.log('Fetching budget analytics...'); // Debug log
      fetchBudgetAnalytics();
    }
  }, [isAuthenticated, fetchBudgetAnalytics]);

  // Debug logs
  console.log('Budget Config:', budgetConfig);
  console.log('Budget Analytics:', budgetAnalytics);
  console.log('Loading:', loading);
  console.log('Error:', error);

  // Show authentication required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="budget-tracker-container auth-required">
        <div className="auth-icon">
          <Lock size={64} />
        </div>
        <h2>Authentication Required</h2>
        <p>You need to be logged in to view your budget information.</p>
        <button 
          className="button button-primary login-button"
          onClick={() => navigate('/login', { state: { from: window.location.pathname } })}
        >
          Log In
        </button>
      </div>
    );
  }

  if (loading && !budgetAnalytics && !budgetConfig) {
    return (
      <div className="budget-tracker-container loading-state">
        <div className="spinner"></div>
        <p>Loading budget data...</p>
      </div>
    );
  }

  if (error && !budgetAnalytics && !budgetConfig) {
    return (
      <div className="budget-tracker-container error-state">
        <div className="error-icon">
          <AlertTriangle size={64} />
        </div>
        <h2>Error Loading Budget</h2>
        <p>{error}</p>
        <button 
          className="button"
          onClick={() => fetchBudgetAnalytics()}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Check if budget configuration exists and has categories
  const hasBudgetConfig = budgetConfig && 
    budgetConfig.categoryBudgets && 
    budgetConfig.categoryBudgets.length > 0;
  
  console.log('Has Budget Config:', hasBudgetConfig); // Debug log
  
  // Check if budget analytics exists and has progress data
  const hasAnalytics = budgetAnalytics && 
    budgetAnalytics.budgetProgress && 
    budgetAnalytics.budgetProgress.length > 0;
  
  console.log('Has Analytics:', hasAnalytics); // Debug log

  if (!hasBudgetConfig) {
    return (
      <div className="budget-tracker-container empty-state">
        <div className="empty-icon">
          <Wallet size={64} />
        </div>
        <h2>Set Up Your Budget</h2>
        <p>Start tracking your expenses by setting up budget categories.</p>
        <div className="setup-actions">
          <Link to="/budget/config" className="button button-primary setup-budget-btn">
            <Plus size={16} />
            Set Up Budget Categories
          </Link>
          <p className="helper-text">
            You'll be able to track spending and get insights once you set up your budget.
          </p>
        </div>
      </div>
    );
  }

  // If we have config but no analytics data yet, show loading
  if (!hasAnalytics) {
    return (
      <div className="budget-tracker-container loading-state">
        <div className="spinner"></div>
        <p>Calculating budget analytics...</p>
      </div>
    );
  }

  // Sort categories by percent used (descending)
  const sortedBudgets = [...budgetAnalytics.budgetProgress].sort((a, b) => b.percentUsed - a.percentUsed);

  // Calculate totals
  const totalSpent = sortedBudgets.reduce((total, budget) => total + budget.spent, 0);
  const totalBudget = sortedBudgets.reduce((total, budget) => total + budget.monthlyLimit, 0);
  const totalPercentUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="budget-tracker-container">
      <div className="budget-header">
        <h2 className="budget-title">
          <Wallet className="budget-title-icon" size={24} />
          Budget Tracker
        </h2>
        <div className="budget-actions">
          <Link to="/budget/config" className="button edit-budget-btn">
            <Settings size={16} />
            Edit Budget
          </Link>
        </div>
      </div>
      
      <div className="budget-summary-card">
        <div className="total-budget">
          <h3>Total Budget Overview</h3>
          <div className="budget-progress-bar">
            <div 
              className={`progress-fill ${totalPercentUsed >= 100 ? 'exceeded' : totalPercentUsed >= 80 ? 'warning' : ''}`}
              style={{ width: `${Math.min(totalPercentUsed, 100)}%` }}
            ></div>
          </div>
          <div className="budget-totals">
            <p className="amount">₹{totalSpent.toFixed(2)} / ₹{totalBudget.toFixed(2)}</p>
            <p className="percent">{totalPercentUsed}% Used</p>
          </div>
        </div>
      </div>
      
      <div className="budget-list">
        {sortedBudgets.map((budget, index) => (
          <div className={`budget-item ${budget.status}`} key={index}>
            <div className="budget-item-header">
              <h3>{budget.category}</h3>
              <span className="budget-status-indicator">
                {budget.status === 'exceeded' ? '🔴' : budget.status === 'warning' ? '🟠' : '🟢'}
              </span>
            </div>
            
            <div className="budget-progress">
              <div 
                className={`progress-bar ${budget.status}`}
                style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
              ></div>
            </div>
            
            <div className="budget-details">
              <span>₹{budget.spent.toFixed(2)} / ₹{budget.monthlyLimit.toFixed(2)}</span>
              <span className="budget-percent">{budget.percentUsed}%</span>
            </div>
            
            {budget.status === 'exceeded' && (
              <div className="budget-alert">
                Exceeded by ₹{(budget.spent - budget.monthlyLimit).toFixed(2)}
              </div>
            )}
            
            {budget.status === 'warning' && (
              <div className="budget-warning">
                Approaching limit ({budget.percentUsed}% used)
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="budget-footer">
        <div className="notifications-status">
          <span>
            Notifications: {budgetAnalytics.notificationsEnabled ? 
              '✓ Enabled' : 
              '✗ Disabled'}
          </span>
          <Link to="/budget/config" className="button button-small">
            Configure
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BudgetTracker;