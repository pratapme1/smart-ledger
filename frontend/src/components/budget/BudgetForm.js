import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, Plus, Minus, Bell, 
  RefreshCw, Lock, ArrowLeft,
  AlertTriangle
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
  const { budgetConfig, loading, error, updateBudgetConfig, resetMonthlySpending } = useBudget();
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [categoryBudgets, setCategoryBudgets] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [availableCategories, setAvailableCategories] = useState([...DEFAULT_CATEGORIES]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [formErrors, setFormErrors] = useState({
    category: '',
    budget: ''
  });

  // Initialize form with existing budget config
  useEffect(() => {
    if (budgetConfig) {
      const existingBudgets = budgetConfig.categoryBudgets || [];
      setCategoryBudgets(existingBudgets);
      setNotificationsEnabled(budgetConfig.notificationsEnabled !== undefined ? 
                             budgetConfig.notificationsEnabled : true);
      
      // Update available categories
      updateAvailableCategories(existingBudgets);
    }
  }, [budgetConfig]);

  // Display error toast when context error changes
  useEffect(() => {
    if (error) {
      toast.error(`Error: ${error}`);
    }
  }, [error]);

  // Update available categories based on current selection
  const updateAvailableCategories = (currentBudgets) => {
    if (!currentBudgets || !Array.isArray(currentBudgets)) {
      setAvailableCategories([...DEFAULT_CATEGORIES]);
      return;
    }
    
    const usedCategories = currentBudgets.map(budget => budget.category.toLowerCase());
    setAvailableCategories(
      DEFAULT_CATEGORIES.filter(cat => !usedCategories.includes(cat.toLowerCase()))
    );
  };

  // Validate budget amount
  const validateBudgetAmount = (amount) => {
    const budgetAmount = parseFloat(amount);
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      return 'Please enter a valid budget amount greater than zero';
    }
    return '';
  };

  // Validate category selection
  const validateCategory = (category, custom = '') => {
    if (!category) {
      return 'Please select a category';
    }
    
    if (category === 'other' && !custom.trim()) {
      return 'Please enter a custom category name';
    }
    
    // Check for duplicate categories
    const categoryToCheck = category === 'other' ? custom.trim().toLowerCase() : category.toLowerCase();
    const isDuplicate = categoryBudgets.some(budget => 
      budget.category.toLowerCase() === categoryToCheck
    );
    
    if (isDuplicate) {
      return 'This category already exists in your budget';
    }
    
    return '';
  };

  // Add new budget category
  const handleAddCategory = () => {
    // Reset previous errors
    setFormErrors({
      category: '',
      budget: ''
    });
    
    let categoryToAdd = newCategory;
    
    // If "other" is selected, use the custom category name
    if (newCategory === 'other' && customCategory.trim()) {
      categoryToAdd = customCategory.trim();
    }
    
    // Validate inputs
    const categoryError = validateCategory(newCategory, customCategory);
    const budgetError = validateBudgetAmount(newBudget);
    
    if (categoryError || budgetError) {
      setFormErrors({
        category: categoryError,
        budget: budgetError
      });
      
      if (categoryError) toast.error(categoryError);
      if (budgetError) toast.error(budgetError);
      return;
    }
    
    const budgetAmount = parseFloat(newBudget);
    
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
    const error = validateBudgetAmount(value);
    if (error) {
      // Don't update if invalid, but don't show error until save
      return;
    }
    
    const amount = parseFloat(value);
    
    const updatedBudgets = [...categoryBudgets];
    updatedBudgets[index] = {
      ...updatedBudgets[index],
      monthlyLimit: amount
    };
    setCategoryBudgets(updatedBudgets);
  };

  // Remove budget category
  const handleRemoveCategory = (index) => {
    const categoryToRemove = categoryBudgets[index].category;
    const updatedBudgets = categoryBudgets.filter((_, i) => i !== index);
    setCategoryBudgets(updatedBudgets);
    updateAvailableCategories(updatedBudgets);
    toast.info(`Removed ${categoryToRemove} category`);
  };

  // Save budget configuration
  const handleSave = async () => {
    // Validate all budgets before saving
    let hasError = false;
    
    for (const budget of categoryBudgets) {
      if (!budget.category || !budget.monthlyLimit || budget.monthlyLimit <= 0) {
        toast.error('All categories must have a valid budget amount');
        hasError = true;
        break;
      }
    }
    
    if (hasError) return;
    
    try {
      setIsSaving(true);
      const success = await updateBudgetConfig(categoryBudgets, notificationsEnabled);
      
      if (success) {
        toast.success('Budget settings saved successfully');
        navigate('/budget');
      } else {
        toast.error('Failed to save budget settings');
      }
    } catch (err) {
      toast.error(`Error saving budget: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset monthly spending
  const handleResetSpending = async () => {
    if (window.confirm('Are you sure you want to reset all monthly spending? This cannot be undone.')) {
      try {
        setIsResetting(true);
        const success = await resetMonthlySpending();
        
        if (success) {
          toast.success('Monthly spending has been reset');
          // Refresh the current budgets with zeroed spending
          const refreshedBudgets = categoryBudgets.map(budget => ({
            ...budget,
            currentSpend: 0
          }));
          setCategoryBudgets(refreshedBudgets);
        } else {
          toast.error('Failed to reset monthly spending');
        }
      } catch (err) {
        toast.error(`Error resetting spending: ${err.message || 'Unknown error'}`);
      } finally {
        setIsResetting(false);
      }
    }
  };

  // Show authentication required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="budget-form-container auth-required">
        <div className="auth-icon">
          <Lock size={64} aria-hidden="true" />
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
          aria-label="Go back to budget overview"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to Budget
        </button>
        <h2 className="form-title">
          <Wallet className="form-title-icon" size={20} aria-hidden="true" />
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
              <div className="budget-entry" key={`budget-${index}`}>
                <div className="category-name">{budget.category}</div>
                <div className="budget-input-group">
                  <span className="currency-symbol" aria-hidden="true">$</span>
                  <input
                    type="number"
                    value={budget.monthlyLimit}
                    onChange={(e) => handleUpdateBudget(index, e.target.value)}
                    min="1"
                    step="0.01"
                    className="budget-amount-input"
                    aria-label={`Budget amount for ${budget.category}`}
                  />
                </div>
                <button 
                  className="remove-category-btn"
                  onClick={() => handleRemoveCategory(index)}
                  aria-label={`Remove ${budget.category} category`}
                >
                  <Minus size={16} aria-hidden="true" />
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
                  // Clear category error when selection changes
                  if (formErrors.category) {
                    setFormErrors({...formErrors, category: ''});
                  }
                }}
                className={`category-select ${formErrors.category ? 'input-error' : ''}`}
                aria-invalid={!!formErrors.category}
                aria-describedby={formErrors.category ? "category-error" : undefined}
              >
                <option value="">Select Category</option>
                {availableCategories.map((category, index) => (
                  <option key={`option-${index}`} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
                <option value="other">Other (Custom)</option>
              </select>
              {formErrors.category && (
                <div id="category-error" className="error-message">
                  <AlertTriangle size={14} aria-hidden="true" /> {formErrors.category}
                </div>
              )}
            </div>
            
            {showNewCategoryInput && (
              <div className="form-group">
                <label htmlFor="custom-category">Custom Category Name</label>
                <input
                  type="text"
                  id="custom-category"
                  placeholder="Enter category name"
                  value={customCategory}
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    // Clear category error when input changes
                    if (formErrors.category) {
                      setFormErrors({...formErrors, category: ''});
                    }
                  }}
                  className={`custom-category-input ${formErrors.category ? 'input-error' : ''}`}
                  aria-invalid={!!formErrors.category}
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
                onChange={(e) => {
                  setNewBudget(e.target.value);
                  // Clear budget error when input changes
                  if (formErrors.budget) {
                    setFormErrors({...formErrors, budget: ''});
                  }
                }}
                min="1"
                step="0.01"
                className={`budget-amount-input ${formErrors.budget ? 'input-error' : ''}`}
                aria-invalid={!!formErrors.budget}
                aria-describedby={formErrors.budget ? "budget-error" : undefined}
              />
              {formErrors.budget && (
                <div id="budget-error" className="error-message">
                  <AlertTriangle size={14} aria-hidden="true" /> {formErrors.budget}
                </div>
              )}
            </div>
          </div>
          
          <button 
            className="add-category-btn"
            onClick={handleAddCategory}
            disabled={!newCategory || !newBudget || (newCategory === 'other' && !customCategory)}
            aria-label="Add new budget category"
          >
            <Plus size={16} aria-hidden="true" /> Add Category
          </button>
        </div>
      </div>
      
      <div className="budget-options card">
        <h3 className="section-title">Budget Settings</h3>
        
        <div className="options-content">
          <div className="notifications-toggle">
            <label className="toggle-label" htmlFor="notifications-toggle">
              <input
                type="checkbox"
                id="notifications-toggle"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
              />
              <span className="toggle-text">
                <Bell size={16} className="toggle-icon" aria-hidden="true" />
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
              disabled={isResetting || categoryBudgets.length === 0}
              aria-label="Reset all monthly spending counters to zero"
            >
              <RefreshCw size={16} aria-hidden="true" /> 
              {isResetting ? 'Resetting...' : 'Reset Monthly Spending'}
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
          aria-label="Cancel and return to budget overview"
        >
          Cancel
        </button>
        
        <button 
          className="save-btn"
          onClick={handleSave}
          disabled={isSaving || loading || categoryBudgets.length === 0}
          aria-label="Save budget configuration"
        >
          {isSaving ? 'Saving...' : 'Save Budget'}
        </button>
      </div>
    </div>
  );
};

export default BudgetForm;