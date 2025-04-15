import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { toast } from 'react-toastify';
import { AuthContext } from './AuthContext';
import api from '../services/api';

const BudgetContext = createContext();

export const BudgetProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const [budgetConfig, setBudgetConfig] = useState(null);
  const [budgetAnalytics, setBudgetAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch budget configuration when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchBudgetConfig();
      fetchBudgetAnalytics();
    } else {
      // Clear data when not authenticated
      setBudgetConfig(null);
      setBudgetAnalytics(null);
    }
  }, [isAuthenticated]);

  // Fetch budget configuration
  const fetchBudgetConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.budget.getBudgetConfig();
      console.log('Budget config response:', response); // Debug log
      
      // Handle both response structures
      const configData = response.budgetConfig || response;
      console.log('Processed budget config:', configData); // Debug log
      
      setBudgetConfig(configData);
      return configData;
    } catch (err) {
      console.error('Error fetching budget config:', err);
      setError('Failed to load budget configuration');
      toast.error('Could not load your budget settings');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fetch budget analytics
  const fetchBudgetAnalytics = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      
      const response = await api.budget.getBudgetAnalytics();
      console.log('Budget analytics response:', response); // Debug log
      
      // Handle both response structures
      const analyticsData = response.budgetProgress ? response : { 
        budgetProgress: response.data || [],
        notificationsEnabled: response.notificationsEnabled || false
      };
      
      console.log('Processed analytics data:', analyticsData); // Debug log
      setBudgetAnalytics(analyticsData);
      return analyticsData;
    } catch (err) {
      console.error('Error fetching budget analytics:', err);
      // Don't show error toast for analytics to avoid redundant notifications
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgetAnalytics();
  }, [fetchBudgetAnalytics]);

  // Update budget configuration
  const updateBudgetConfig = async (categoryBudgets, notificationsEnabled) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.budget.updateBudgetConfig({
        categoryBudgets,
        notificationsEnabled
      });
      
      console.log('Update budget config response:', response); // Debug log
      
      // Handle both response structures
      const updatedConfig = response.budgetConfig || response;
      console.log('Processed updated config:', updatedConfig); // Debug log
      
      setBudgetConfig(updatedConfig);
      
      toast.success('Budget settings updated successfully');
      
      // Refresh analytics
      await fetchBudgetAnalytics();
      
      return true;
    } catch (err) {
      console.error('Error updating budget config:', err);
      setError('Failed to update budget configuration');
      toast.error('Could not update budget settings');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete a budget category
  const deleteBudgetCategory = async (category) => {
    try {
      setLoading(true);
      setError(null);
      
      await api.budget.deleteBudgetCategory(category);
      
      // Update state
      await fetchBudgetConfig();
      await fetchBudgetAnalytics();
      
      toast.success(`Category "${category}" deleted successfully`);
      return true;
    } catch (err) {
      console.error('Error deleting budget category:', err);
      setError('Failed to delete budget category');
      toast.error('Could not delete budget category');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Reset monthly spending
  const resetMonthlySpending = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await api.budget.resetMonthlySpending();
      
      // Refresh data
      await fetchBudgetConfig();
      await fetchBudgetAnalytics();
      
      toast.success('Monthly spending reset successfully');
      return true;
    } catch (err) {
      console.error('Error resetting monthly spending:', err);
      setError('Failed to reset monthly spending');
      toast.error('Could not reset monthly spending');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Provide context value
  const value = {
    budgetConfig,
    budgetAnalytics,
    loading,
    error,
    fetchBudgetConfig,
    fetchBudgetAnalytics,
    updateBudgetConfig,
    deleteBudgetCategory,
    resetMonthlySpending
  };

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
};

// Custom hook to use the budget context
export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};

export default BudgetContext;