import React, { useState, useContext } from 'react';
import { 
  PencilLine, Calendar, DollarSign, Store, Tag, 
  Plus, Minus, CreditCard, Receipt, X, Info, AlertTriangle
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const ManualReceiptForm = ({ onSubmit, categories = [] }) => {
  const { isAuthenticated } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    paymentMethod: '',
    currency: 'USD',
    totalAmount: '',
    taxAmount: '',
    notes: '',
    items: [{ name: '', price: '', quantity: '1' }]
  });
  
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [error, setError] = useState(null);
  
  // List of common currencies
  const currencies = [
    { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
    { code: 'EUR', name: 'Euro (€)', symbol: '€' },
    { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
    { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' },
    { code: 'JPY', name: 'Japanese Yen (¥)', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar (C$)', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar (A$)', symbol: 'A$' },
    { code: 'CNY', name: 'Chinese Yuan (¥)', symbol: '¥' },
    { code: 'CHF', name: 'Swiss Franc (CHF)', symbol: 'CHF' },
    { code: 'SGD', name: 'Singapore Dollar (S$)', symbol: 'S$' }
  ];
  
  // List of common payment methods
  const paymentMethods = [
    'Credit Card',
    'Debit Card',
    'Cash',
    'Bank Transfer',
    'Mobile Payment',
    'Check',
    'Gift Card',
    'Crypto',
    'Other'
  ];
  
  // List of categories if none provided
  const defaultCategories = [
    'Groceries',
    'Dining',
    'Transportation',
    'Entertainment',
    'Shopping',
    'Utilities',
    'Housing',
    'Travel',
    'Health',
    'Education',
    'Personal Care',
    'Gifts',
    'Business',
    'Other'
  ];
  
  const allCategories = categories.length > 0 ? categories : defaultCategories;
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total amount if needed
    if (field === 'price' || field === 'quantity') {
      let subtotal = 0;
      updatedItems.forEach(item => {
        const itemPrice = parseFloat(item.price) || 0;
        const itemQuantity = parseFloat(item.quantity) || 0;
        subtotal += itemPrice * itemQuantity;
      });
      
      // Only update total if all items have values and the user hasn't manually set the total
      const allItemsHaveValues = updatedItems.every(
        item => item.price !== '' && item.quantity !== ''
      );
      
      if (allItemsHaveValues) {
        const taxAmount = parseFloat(formData.taxAmount) || 0;
        setFormData(prev => ({ 
          ...prev, 
          items: updatedItems,
          totalAmount: (subtotal + taxAmount).toFixed(2)
        }));
      } else {
        setFormData(prev => ({ ...prev, items: updatedItems }));
      }
    } else {
      setFormData(prev => ({ ...prev, items: updatedItems }));
    }
  };
  
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', price: '', quantity: '1' }]
    }));
  };
  
  const removeItem = (index) => {
    if (formData.items.length <= 1) return;
    
    const updatedItems = formData.items.filter((_, i) => i !== index);
    
    // Recalculate total
    let subtotal = 0;
    updatedItems.forEach(item => {
      const itemPrice = parseFloat(item.price) || 0;
      const itemQuantity = parseFloat(item.quantity) || 0;
      subtotal += itemPrice * itemQuantity;
    });
    
    const taxAmount = parseFloat(formData.taxAmount) || 0;
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      totalAmount: (subtotal + taxAmount).toFixed(2)
    }));
  };
  
  const addNewCategory = () => {
    if (!newCategory.trim()) return;
    
    setFormData(prev => ({ ...prev, category: newCategory }));
    setNewCategory('');
    setShowNewCategory(false);
  };
  
  const handleTaxChange = (e) => {
    const taxValue = e.target.value;
    setFormData(prev => {
      // Calculate subtotal from items
      let subtotal = 0;
      prev.items.forEach(item => {
        const itemPrice = parseFloat(item.price) || 0;
        const itemQuantity = parseFloat(item.quantity) || 0;
        subtotal += itemPrice * itemQuantity;
      });
      
      const newTax = parseFloat(taxValue) || 0;
      
      return {
        ...prev,
        taxAmount: taxValue,
        totalAmount: (subtotal + newTax).toFixed(2)
      };
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check authentication first
    if (!isAuthenticated) {
      setError('You must be logged in to add receipts');
      return;
    }
    
    // Validate required fields
    if (!formData.merchant) {
      setError('Merchant name is required');
      return;
    }
    if (!formData.totalAmount) {
      setError('Total amount is required');
      return;
    }
    
    // Format data for submission
    const submissionData = {
      ...formData,
      totalAmount: parseFloat(formData.totalAmount),
      taxAmount: parseFloat(formData.taxAmount) || 0,
      items: formData.items.map(item => ({
        name: item.name,
        price: parseFloat(item.price) || 0,
        quantity: parseFloat(item.quantity) || 1
      })).filter(item => item.name && item.price),
      isManualEntry: true
    };
    
    // Send data to parent component
    onSubmit(submissionData);
    
    // Reset form
    setFormData({
      merchant: '',
      date: new Date().toISOString().split('T')[0],
      category: '',
      paymentMethod: '',
      currency: 'USD',
      totalAmount: '',
      taxAmount: '',
      notes: '',
      items: [{ name: '', price: '', quantity: '1' }]
    });
    
    setError(null);
  };
  
  const calculateSubtotal = () => {
    let subtotal = 0;
    formData.items.forEach(item => {
      const itemPrice = parseFloat(item.price) || 0;
      const itemQuantity = parseFloat(item.quantity) || 0;
      subtotal += itemPrice * itemQuantity;
    });
    return subtotal.toFixed(2);
  };
  
  // Get the currency symbol for the selected currency
  const getCurrencySymbol = () => {
    const currency = currencies.find(c => c.code === formData.currency);
    return currency ? currency.symbol : formData.currency;
  };
  
  // If not authenticated, show login prompt (optional, as parent may already handle this)
  if (!isAuthenticated) {
    return (
      <div className="manual-receipt-form card">
        <h2 className="card-title">
          <PencilLine className="card-title-icon" size={20} />
          Manual Receipt Entry
        </h2>
        
        <div className="auth-required-message">
          <AlertTriangle size={24} className="warning-icon" />
          <h3>Authentication Required</h3>
          <p>You need to be logged in to add receipts.</p>
          <button 
            className="button button-primary"
            onClick={() => window.location.href = '/login'}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="manual-receipt-form card">
      <h2 className="card-title">
        <PencilLine className="card-title-icon" size={20} />
        Manual Receipt Entry
      </h2>
      
      {error && (
        <div className="error-message">
          <X size={16} className="error-icon" />
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="merchant">
              <Store size={16} className="input-icon" />
              Merchant*
            </label>
            <input
              type="text"
              id="merchant"
              name="merchant"
              value={formData.merchant}
              onChange={handleChange}
              placeholder="Store or vendor name"
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="date">
              <Calendar size={16} className="input-icon" />
              Date*
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="category">
              <Tag size={16} className="input-icon" />
              Category
            </label>
            {!showNewCategory ? (
              <div className="select-with-button">
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Select a category</option>
                  {allCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="icon-button"
                >
                  <Plus size={16} />
                </button>
              </div>
            ) : (
              <div className="input-with-button">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={addNewCategory}
                  className="icon-button"
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(false)}
                  className="icon-button"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="paymentMethod">
              <CreditCard size={16} className="input-icon" />
              Payment Method
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">Select payment method</option>
              {paymentMethods.map((method, idx) => (
                <option key={idx} value={method}>{method}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="currency">
              <DollarSign size={16} className="input-icon" />
              Currency*
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="form-select"
              required
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <h3 className="section-title">Items</h3>
        
        <div className="items-container">
          {formData.items.map((item, index) => (
            <div key={index} className="item-row">
              <div className="item-name">
                <input
                  type="text"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="item-price">
                <div className="currency-input">
                  <span className="currency-symbol">{getCurrencySymbol()}</span>
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    step="0.01"
                    min="0"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="item-quantity">
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  min="1"
                  step="0.01"
                  className="form-input"
                />
              </div>
              <div className="item-total">
                {getCurrencySymbol()}{((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0)).toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="item-remove"
                aria-label="Remove item"
                disabled={formData.items.length <= 1}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addItem}
            className="add-item-button"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="notes">
              <Info size={16} className="input-icon" />
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes or information"
              className="form-textarea"
              rows="3"
            ></textarea>
          </div>
        </div>
        
        <div className="receipt-totals">
          <div className="totals-row">
            <span>Subtotal:</span>
            <span>{getCurrencySymbol()}{calculateSubtotal()}</span>
          </div>
          <div className="totals-row">
            <label htmlFor="taxAmount">Tax:</label>
            <div className="currency-input">
              <span className="currency-symbol">{getCurrencySymbol()}</span>
              <input
                type="number"
                id="taxAmount"
                name="taxAmount"
                value={formData.taxAmount}
                onChange={handleTaxChange}
                min="0"
                step="0.01"
                className="tax-input"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="totals-row total">
            <span>Total:</span>
            <div className="currency-input">
              <span className="currency-symbol">{getCurrencySymbol()}</span>
              <input
                type="number"
                name="totalAmount"
                value={formData.totalAmount}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="total-input"
                placeholder="0.00"
                required
              />
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-button">
            <Receipt size={16} />
            Save Receipt
          </button>
        </div>
      </form>
    </div>
  );
};

export default ManualReceiptForm;