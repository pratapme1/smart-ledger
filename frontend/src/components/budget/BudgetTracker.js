import React, { useEffect, useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Wallet, Plus, AlertTriangle, Settings } from 'lucide-react';
import { useBudget } from '../../context/BudgetContext';
import { AuthContext } from '../../context/AuthContext';
import './BudgetTracker.css';

const BudgetTracker = () => {
  const { budgetAnalytics, budgetConfig, fetchBudgetAnalytics, loading, error } = useBudget();
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const [currencySymbol, setCurrencySymbol] = useState('$'); // Default currency symbol

  useEffect(() => {
    let isMounted = true;
    
    if (isAuthenticated) {
      fetchBudgetAnalytics();
    }
    
    // Determine currency symbol from config if available
    if (budgetConfig && budgetConfig.currencySymbol && isMounted) {
      setCurrencySymbol(budgetConfig.currencySymbol);
    }
    
    return () => {
      isMounted = false; // Prevent state updates if component unmounts
    };
  }, [isAuthenticated, fetchBudgetAnalytics, budgetConfig]);

  // Helper function to render the authentication required state
  const renderAuthRequired = () => (
    <div className="budget-tracker-container auth-required">
      <div className="auth-icon" aria-hidden="true">
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

  // Helper function to render loading state
  const renderLoading = (message = "Loading budget data...") => (
    <div className="budget-tracker-container loading-state" role="status">
      <div className="spinner" aria-hidden="true"></div>
      <p>{message}</p>
    </div>
  );

  // Helper function to render error state
  const renderError = () => (
    <div className="budget-tracker-container error-state">
      <div className="error-icon" aria-hidden="true">
        <AlertTriangle size={64} />
      </div>
      <h2>Error Loading Budget</h2>
      <p>{error}</p>
      <button 
        className="button"
        onClick={() => fetchBudgetAnalytics()}
        aria-label="Try loading budget data again"
      >
        Try Again
      </button>
    </div>
  );

  // Helper function to render empty state
  const renderEmptyState = () => (
    <div className="budget-tracker-container empty-state">
      <div className="empty-icon" aria-hidden="true">
        <Wallet size={64} />
      </div>
      <h2>Set Up Your Budget</h2>
      <p>Start tracking your expenses by setting up budget categories.</p>
      <div className="setup-actions">
        <Link to="/budget/config" className="button button-primary setup-budget-btn">
          <Plus size={16} aria-hidden="true" />
          Set Up Budget Categories
        </Link>
        <p className="helper-text">
          You'll be able to track spending and get insights once you set up your budget.
        </p>
      </div>
    </div>
  );

  // Show authentication required message if not authenticated
  if (!isAuthenticated) {
    return renderAuthRequired();
  }

  // Show loading state if data is still loading
  if (loading && !budgetAnalytics && !budgetConfig) {
    return renderLoading();
  }

  // Show error state if there was an error and no data
  if (error && !budgetAnalytics && !budgetConfig) {
    return renderError();
  }

  // Check if budget configuration exists and has categories
  const hasBudgetConfig = budgetConfig && 
    budgetConfig.categoryBudgets && 
    budgetConfig.categoryBudgets.length > 0;
  
  // Check if budget analytics exists and has progress data
  const hasAnalytics = budgetAnalytics && 
    budgetAnalytics.budgetProgress && 
    budgetAnalytics.budgetProgress.length > 0;

  // If no budget is set up yet, show empty state
  if (!hasBudgetConfig) {
    return renderEmptyState();
  }

  // If we have config but no analytics data yet, show loading
  if (!hasAnalytics) {
    return renderLoading("Calculating budget analytics...");
  }

  // Sort categories by percent used (descending)
  const sortedBudgets = [...budgetAnalytics.budgetProgress].sort((a, b) => b.percentUsed - a.percentUsed);

  // Calculate totals
  const totalSpent = sortedBudgets.reduce((total, budget) => total + budget.spent, 0);
  const totalBudget = sortedBudgets.reduce((total, budget) => total + budget.monthlyLimit, 0);
  const totalPercentUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Determine total budget status
  const totalBudgetStatus = totalPercentUsed >= 100 ? 'exceeded' : totalPercentUsed >= 80 ? 'warning' : 'normal';

  // Map status emoji to more accessible indicators
  const statusIndicators = {
    exceeded: { icon: '🔴', label: 'Exceeded' },
    warning: { icon: '🟠', label: 'Warning' },
    normal: { icon: '🟢', label: 'On Track' }
  };

  return (
    <div className="budget-tracker-container">
      <div className="budget-header">
        <h2 className="budget-title">
          <Wallet className="budget-title-icon" size={24} aria-hidden="true" />
          Budget Tracker
        </h2>
        <div className="budget-actions">
          <Link 
            to="/budget/config" 
            className="button edit-budget-btn"
            aria-label="Edit budget configuration"
          >
            <Settings size={16} aria-hidden="true" />
            Edit Budget
          </Link>
        </div>
      </div>
      
      <div className="budget-summary-card" role="region" aria-label="Total budget overview">
        <div className="total-budget">
          <h3>Total Budget Overview</h3>
          <div 
            className="budget-progress-bar" 
            role="progressbar" 
            aria-valuenow={totalPercentUsed} 
            aria-valuemin="0" 
            aria-valuemax="100"
          >
            <div 
              className={`progress-fill ${totalBudgetStatus}`}
              style={{ width: `${Math.min(totalPercentUsed, 100)}%` }}
            ></div>
          </div>
          <div className="budget-totals">
            <p className="amount">{currencySymbol}{totalSpent.toFixed(2)} / {currencySymbol}{totalBudget.toFixed(2)}</p>
            <p className="percent">{totalPercentUsed}% Used</p>
          </div>
        </div>
      </div>
      
      <div className="budget-list" role="list" aria-label="Budget categories">
        {sortedBudgets.map((budget, index) => (
          <div 
            className={`budget-item ${budget.status}`} 
            key={`budget-item-${index}`}
            role="listitem"
            aria-label={`${budget.category} budget`}
          >
            <div className="budget-item-header">
              <h3>{budget.category}</h3>
              <span 
                className="budget-status-indicator" 
                aria-label={statusIndicators[budget.status].label}
              >
                {statusIndicators[budget.status].icon}
              </span>
            </div>
            
            <div 
              className="budget-progress"
              role="progressbar" 
              aria-valuenow={budget.percentUsed} 
              aria-valuemin="0" 
              aria-valuemax="100"
              aria-label={`${budget.percentUsed}% of budget used`}
            >
              <div 
                className={`progress-bar ${budget.status}`}
                style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
              ></div>
            </div>
            
            <div className="budget-details">
              <span>{currencySymbol}{budget.spent.toFixed(2)} / {currencySymbol}{budget.monthlyLimit.toFixed(2)}</span>
              <span className="budget-percent">{budget.percentUsed}%</span>
            </div>
            
            {budget.status === 'exceeded' && (
              <div className="budget-alert" role="alert">
                Exceeded by {currencySymbol}{(budget.spent - budget.monthlyLimit).toFixed(2)}
              </div>
            )}
            
            {budget.status === 'warning' && (
              <div className="budget-warning" role="alert">
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
          <Link 
            to="/budget/config" 
            className="button button-small"
            aria-label="Configure budget notifications"
          >
            Configure
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BudgetTracker;