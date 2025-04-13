import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, Plus, Minus, Tag, Bell, 
  RefreshCw, AlertTriangle, Lock, ArrowLeft
} from 'lucide-react';
import { useBudget } from '../../context/BudgetContext';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import './BudgetForm.css';

// Default categories
const DEFAULT_CATEGORIES = [
  'groceries', 'dining', 'utilities', 'transportation', 'entertainment', 
  'shopping', 'healthcare', 'education', 'travel', 'housing', 
  'personal_care', 'gifts'
];

const BudgetForm = () => {
  const { budgetConfig, loading, updateBudgetConfig, resetMonthlySpending } = useBudget();
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [categoryBudgets, setCategoryBudgets] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  // Initialize form with existing budget config
  useEffect(() => {
    if (budgetConfig) {
      setCategoryBudgets(budgetConfig.categoryBudgets || []);
      setNotificationsEnabled(budgetConfig.notificationsEnabled);
      
      // Update available categories
      updateAvailableCategories(budgetConfig.categoryBudgets || []);
    }
  }, [budgetConfig]);

  // Update available categories based on current selection
  const updateAvailableCategories = (currentBudgets) => {
    const usedCategories = currentBudgets.map(budget => budget.category.toLowerCase());
    setAvailableCategories(
      DEFAULT_CATEGORIES.filter(cat => !usedCategories.includes(cat.toLowerCase()))
    );
  };

  // Add new budget category
  const handleAddCategory = () => {
    let categoryToAdd = newCategory;
    
    // If "other" is selected, use the custom category name
    if (newCategory === 'other' && customCategory.trim()) {
      categoryToAdd = customCategory.trim();
    }
    
    if (!categoryToAdd || !newBudget) {
      toast.error('Please select a category and enter a budget amount');
      return;
    }
    
    const budgetAmount = parseFloat(newBudget);
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }
    
    const updatedBudgets = [
      ...categoryBudgets,
      {
        category: categoryToAdd,
        monthlyLimit: budgetAmount,
        currentSpend: 0
      }
    ];
    
    setCategoryBudgets(updatedBudgets);
    updateAvailableCategories(updatedBudgets);
    setNewCategory('');
    setNewBudget('');
    setCustomCategory('');
    setShowNewCategoryInput(false);
  };

  // Update existing budget amount
  const handleUpdateBudget = (index, value) => {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount <= 0) return;
    
    const updatedBudgets = [...categoryBudgets];
    updatedBudgets[index].monthlyLimit = amount;
    setCategoryBudgets(updatedBudgets);
  };

  // Remove budget category
  const handleRemoveCategory = (index) => {
    const updatedBudgets = [...categoryBudgets];
    updatedBudgets.splice(index, 1);
    setCategoryBudgets(updatedBudgets);
    updateAvailableCategories(updatedBudgets);
  };

  // Save budget configuration
  const handleSave = async () => {
    // Validate all budgets
    for (const budget of categoryBudgets) {
      if (!budget.category || !budget.monthlyLimit || budget.monthlyLimit <= 0) {
        toast.error('All categories must have a valid budget amount');
        return;
      }
    }
    
    const success = await updateBudgetConfig(categoryBudgets, notificationsEnabled);
    
    if (success) {
      toast.success('Budget settings saved successfully');
      navigate('/budget');
    }
  };

  // Handle reset monthly spending
  const handleResetSpending = async () => {
    if (window.confirm('Are you sure you want to reset all monthly spending? This cannot be undone.')) {
      const success = await resetMonthlySpending();
      if (success) {
        toast.success('Monthly spending has been reset');
      }
    }
  };

  // Show authentication required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="budget-form-container auth-required">
        <div className="auth-icon">
          <Lock size={64} />
        </div>
        <h2>Authentication Required</h2>
        <p>You need to be logged in to configure your budget settings.</p>
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
    <div className="budget-form-container">
      <div className="budget-form-header">
        <button 
          className="back-button"
          onClick={() => navigate('/budget')}
        >
          <ArrowLeft size={16} /> Back to Budget
        </button>
        <h2 className="form-title">
          <Wallet className="form-title-icon" size={20} />
          Budget Configuration
        </h2>
      </div>
      
      <div className="current-budgets card">
        <h3 className="section-title">Your Budget Categories</h3>
        
        {categoryBudgets.length === 0 ? (
          <div className="no-budgets">
            <p>You haven't set up any budget categories yet.</p>
            <p className="helper-text">Add a category below to get started tracking your spending.</p>
          </div>
        ) : (
          <>
            <div className="budget-list-header">
              <span className="category-header">Category</span>
              <span className="budget-amount-header">Monthly Budget</span>
              <span className="actions-header">Actions</span>
            </div>
            {categoryBudgets.map((budget, index) => (
              <div className="budget-entry" key={index}>
                <div className="category-name">{budget.category}</div>
                <div className="budget-input-group">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    value={budget.monthlyLimit}
                    onChange={(e) => handleUpdateBudget(index, e.target.value)}
                    min="1"
                    step="0.01"
                    className="budget-amount-input"
                  />
                </div>
                <button 
                  className="remove-category-btn"
                  onClick={() => handleRemoveCategory(index)}
                  aria-label={`Remove ${budget.category} category`}
                >
                  <Minus size={16} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
      
      <div className="add-budget-section card">
        <h3 className="section-title">Add New Budget Category</h3>
        
        <div className="new-budget-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category-select">Category</label>
              <select
                id="category-select"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setShowNewCategoryInput(e.target.value === 'other');
                }}
                className="category-select"
              >
                <option value="">Select Category</option>
                {availableCategories.map((category, index) => (
                  <option key={index} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
                <option value="other">Other (Custom)</option>
              </select>
            </div>
            
            {showNewCategoryInput && (
              <div className="form-group">
                <label htmlFor="custom-category">Custom Category Name</label>
                <input
                  type="text"
                  id="custom-category"
                  placeholder="Enter category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="custom-category-input"
                />
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="budget-amount">Monthly Budget ($)</label>
              <input
                type="number"
                id="budget-amount"
                placeholder="Amount"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                min="1"
                step="0.01"
                className="budget-amount-input"
              />
            </div>
          </div>
          
          <button 
            className="add-category-btn"
            onClick={handleAddCategory}
            disabled={!newCategory || !newBudget || (newCategory === 'other' && !customCategory)}
          >
            <Plus size={16} /> Add Category
          </button>
        </div>
      </div>
      
      <div className="budget-options card">
        <h3 className="section-title">Budget Settings</h3>
        
        <div className="options-content">
          <div className="notifications-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
              />
              <span className="toggle-text">
                <Bell size={16} className="toggle-icon" />
                Enable Budget Alert Notifications
              </span>
            </label>
            <p className="option-description">
              Receive notifications when you reach 80% and 100% of your budget limits.
            </p>
          </div>
          
          <div className="reset-option">
            <button 
              className="reset-spending-btn"
              onClick={handleResetSpending}
            >
              <RefreshCw size={16} /> Reset Monthly Spending
            </button>
            <p className="option-description">
              Reset all current spending counters to zero. Useful at the beginning of a new month.
            </p>
          </div>
        </div>
      </div>
      
      <div className="form-actions">
        <button 
          className="cancel-btn"
          onClick={() => navigate('/budget')}
        >
          Cancel
        </button>
        
        <button 
          className="save-btn"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Budget'}
        </button>
      </div>
    </div>
  );
};

export default BudgetForm;