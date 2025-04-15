// src/components/digest/WeeklyDigest.js
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/formatters';
import api from '../../services/api';
import './WeeklyDigest.css';

const WeeklyDigest = () => {
  const [digests, setDigests] = useState([]);
  const [selectedDigest, setSelectedDigest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingDigest, setGeneratingDigest] = useState(false);
  const [insights, setInsights] = useState([]);

  const fetchDigests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.digest.getDigests();
      
      if (response && Array.isArray(response)) {
        setDigests(response);
        
        // Select the most recent digest by default
        if (response.length > 0 && !selectedDigest) {
          setSelectedDigest(response[0]);
          // Fetch insights for the selected digest
          fetchInsightsForDigest(response[0]._id);
        }
      } else {
        console.warn('Unexpected response format:', response);
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching digests:', err);
      setError('Failed to load weekly digests');
      toast.error('Could not load weekly digests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDigests();
  }, [fetchDigests]);

  // Fetch insights for a specific digest
  const fetchInsightsForDigest = async (digestId) => {
    try {
      const response = await api.digest.getDigestInsights(digestId);
      setInsights(response);
    } catch (err) {
      console.error('Error fetching digest insights:', err);
      setInsights([]);
    }
  };

  // Generate a new digest
  const generateDigest = async () => {
    try {
      setGeneratingDigest(true);
      const response = await api.digest.generateDigest();
      
      if (response) {
        toast.success('Weekly digest generated successfully');
        fetchDigests();
        setSelectedDigest(response);
        // Fetch insights for the new digest
        fetchInsightsForDigest(response._id);
      } else {
        toast.info(response.message);
      }
    } catch (err) {
      console.error('Error generating digest:', err);
      if (err.response && err.response.status === 400) {
        toast.info(err.response.data.message);
      } else {
        toast.error('Could not generate weekly digest');
      }
    } finally {
      setGeneratingDigest(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && digests.length === 0) {
    return <div className="digest-loading">Loading weekly digests...</div>;
  }

  if (error && digests.length === 0) {
    return (
      <div className="digest-error">
        <h3>Error Loading Digests</h3>
        <p>{error}</p>
        <button onClick={fetchDigests}>Try Again</button>
      </div>
    );
  }

  if (digests.length === 0) {
    return (
      <div className="digest-empty">
        <h3>No Weekly Digests Available</h3>
        <p>Generate your first weekly digest to see your spending insights.</p>
        <button 
          onClick={generateDigest}
          disabled={generatingDigest}
        >
          {generatingDigest ? 'Generating...' : 'Generate Digest'}
        </button>
      </div>
    );
  }

  return (
    <div className="weekly-digest-container">
      <div className="digest-header">
        <h2>Weekly Financial Digests</h2>
        <button 
          className="generate-digest-btn" 
          onClick={generateDigest}
          disabled={generatingDigest}
        >
          {generatingDigest ? 'Generating...' : 'Generate New Digest'}
        </button>
      </div>
      
      <div className="digest-content">
        <div className="digest-list">
          <h3>Available Digests</h3>
          {digests.map((digest, index) => (
            <div 
              className={`digest-item ${selectedDigest && selectedDigest._id === digest._id ? 'selected' : ''}`}
              key={index}
              onClick={() => {
                setSelectedDigest(digest);
                fetchInsightsForDigest(digest._id);
              }}
            >
              <span className="digest-date">
                {formatDate(digest.weekStartDate)} - {formatDate(digest.weekEndDate)}
              </span>
              <span className="digest-total">
                {formatCurrency(digest.totalSpent)}
              </span>
            </div>
          ))}
        </div>
        
        {selectedDigest && (
          <div className="digest-details">
            <div className="digest-period">
              <h3>Weekly Summary</h3>
              <p>
                <strong>Period:</strong> {formatDate(selectedDigest.weekStartDate)} - {formatDate(selectedDigest.weekEndDate)}
              </p>
              <p>
                <strong>Total Spent:</strong> {formatCurrency(selectedDigest.totalSpent)}
              </p>
            </div>
            
            {selectedDigest.topCategories && selectedDigest.topCategories.length > 0 && (
              <div className="top-categories">
                <h4>Top Spending Categories</h4>
                <ul>
                  {selectedDigest.topCategories.map((category, index) => (
                    <li key={index}>
                      <span className="category-name">{category.category}</span>
                      <div className="category-bar-container">
                        <div 
                          className="category-bar"
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                        <span className="category-amount">
                          {formatCurrency(category.amount)} ({category.percentage}%)
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {selectedDigest.budgetAlerts && selectedDigest.budgetAlerts.length > 0 && (
              <div className="budget-alerts">
                <h4>Budget Alerts</h4>
                <ul>
                  {selectedDigest.budgetAlerts.map((alert, index) => (
                    <li key={index} className="overspent-item">
                      <span className="category-name">{alert.category}</span>
                      <div className="overspent-details">
                        <span>Spent: {formatCurrency(alert.spent)}</span>
                        <span>Budget: {formatCurrency(alert.limit)}</span>
                        <span className="overspent-amount">
                          Over by: {formatCurrency(alert.overspent)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {insights.length > 0 && (
              <div className="insights-summary">
                <h4>Smart Insights</h4>
                <ul>
                  {insights.map((insight, index) => (
                    <li key={index} className="insight-item">
                      <div className="insight-content">
                        <p>{insight.insightText}</p>
                        {insight.savings > 0 && (
                          <div className="savings-alert">
                            <span>💰 Potential Savings: {formatCurrency(insight.savings)}</span>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {selectedDigest.recurringAlerts && selectedDigest.recurringAlerts.length > 0 && (
              <div className="recurring-alerts">
                <h4>Recurring Purchases</h4>
                <ul>
                  {selectedDigest.recurringAlerts.map((alert, index) => (
                    <li key={index} className="recurring-item">
                      <span className="item-name">{alert.item}</span>
                      <span className="frequency">Purchased {alert.frequency} times</span>
                      {alert.suggestion && <p className="suggestion">{alert.suggestion}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {selectedDigest.weeklyTip && (
              <div className="weekly-tip">
                <h4>Tip of the Week</h4>
                <p>{selectedDigest.weeklyTip}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyDigest;