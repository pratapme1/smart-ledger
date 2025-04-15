import React, { useState, useEffect, useContext } from 'react';
import { Receipt, Clock, Filter, Trash2, FileText, Search, AlertTriangle, ChevronDown, ChevronUp, Check, Lock } from 'lucide-react';
import { getCurrencySymbol } from '../utils/currencyUtils';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

// Use environment variable for API URL with fallback
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatReceiptName = (receipt) => {
  const category = receipt.category || 'General';
  const date = receipt.date ? formatDate(receipt.date) : formatDate(receipt.uploadedAt);
  return `${category} - ${date}`;
};

const ReceiptCard = ({ receipt, index, onDelete, isAuthenticated }) => {
  const [expanded, setExpanded] = useState(false);
  const currencySymbol = getCurrencySymbol(receipt.currency || 'USD');
  const formattedName = formatReceiptName(receipt);

  const handleDelete = (e) => {
    e.stopPropagation();
    
    // Check authentication before allowing deletion
    if (!isAuthenticated) {
      toast.error('You must be logged in to delete receipts');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete this receipt?`)) {
      onDelete(receipt._id);
    }
  };

  return (
    <div className="receipt-card">
      <div 
        onClick={() => setExpanded(!expanded)} 
        className="receipt-header"
      >
        <div className="receipt-title">
          <div className="receipt-icon-container">
            <Receipt size={18} className="receipt-icon" />
          </div>
          <div className="receipt-info">
            <h3 className="receipt-name">{formattedName}</h3>
            <div className="receipt-merchant">{receipt.merchant || receipt.fileName || "Unknown merchant"}</div>
          </div>
        </div>
        <div className="receipt-header-right">
          <div className="receipt-amount">
            <span>{currencySymbol}{receipt.totalAmount.toFixed(2)}</span>
            <span className="receipt-currency">{receipt.currency || 'USD'}</span>
          </div>
          <div className="receipt-actions">
            <button 
              className="receipt-delete-btn" 
              onClick={handleDelete}
              aria-label="Delete receipt"
              disabled={!isAuthenticated}
              title={!isAuthenticated ? 'Login required to delete' : 'Delete receipt'}
            >
              <Trash2 size={16} />
            </button>
            <span className="expand-icon">
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="receipt-details">
          <div className="receipt-metadata">
            <div className="metadata-item">
              <div className="metadata-label">Uploaded</div>
              <div className="metadata-value">{formatDate(receipt.uploadedAt)}</div>
            </div>
            <div className="metadata-item">
              <div className="metadata-label">Category</div>
              <div className="metadata-value">{receipt.category || "Uncategorized"}</div>
            </div>
            {receipt.paymentMethod && (
              <div className="metadata-item">
                <div className="metadata-label">Payment Method</div>
                <div className="metadata-value">{receipt.paymentMethod}</div>
              </div>
            )}
          </div>
          
          <div className="receipt-amounts">
            <div className="amount-item">
              <div className="amount-label">Subtotal</div>
              <div className="amount-value">{currencySymbol}{(receipt.subtotalAmount || (receipt.totalAmount - receipt.taxAmount) || 0).toFixed(2)}</div>
            </div>
            <div className="amount-item">
              <div className="amount-label">Tax</div>
              <div className="amount-value">{currencySymbol}{receipt.taxAmount.toFixed(2)}</div>
            </div>
            <div className="amount-item total">
              <div className="amount-label">Total</div>
              <div className="amount-value">{currencySymbol}{receipt.totalAmount.toFixed(2)}</div>
            </div>
          </div>
          
          <h4 className="items-header">Items</h4>
          {receipt.items?.length > 0 ? (
            <div className="receipt-items">
              {receipt.items.map((item, i) => (
                <div key={i} className="receipt-item">
                  <div className="item-details">
                    <span className="item-name">{item.name}</span>
                    {item.quantity > 1 && <span className="item-quantity">x{item.quantity}</span>}
                  </div>
                  <span className="item-price">{currencySymbol}{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-items-message">No items found on this receipt</p>
          )}
        </div>
      )}
    </div>
  );
};

export default function ReceiptList({ receipts, loading, error, onReceiptDeleted }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [sortOption, setSortOption] = useState('date-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [deleteStatus, setDeleteStatus] = useState({ loading: false, error: null, success: false });

  // Extract unique categories from receipts
  const categories = ['all', ...new Set(receipts.filter(r => r.category).map(r => r.category))];

  useEffect(() => {
    // Filter receipts based on search query and category
    let filtered = [...receipts];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(receipt => {
        return (receipt.merchant && receipt.merchant.toLowerCase().includes(query)) ||
               (receipt.fileName && receipt.fileName.toLowerCase().includes(query)) ||
               (receipt.items && receipt.items.some(item => item.name.toLowerCase().includes(query)));
      });
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(receipt => receipt.category === filterCategory);
    }
    
    // Sort receipts
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date-asc':
          return new Date(a.uploadedAt) - new Date(b.uploadedAt);
        case 'date-desc':
          return new Date(b.uploadedAt) - new Date(a.uploadedAt);
        case 'amount-asc':
          return a.totalAmount - b.totalAmount;
        case 'amount-desc':
          return b.totalAmount - a.totalAmount;
        case 'name-asc':
          return (a.merchant || a.fileName || '').localeCompare(b.merchant || b.fileName || '');
        case 'name-desc':
          return (b.merchant || b.fileName || '').localeCompare(a.merchant || a.fileName || '');
        default:
          return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      }
    });
    
    setFilteredReceipts(filtered);
  }, [receipts, searchQuery, filterCategory, sortOption]);

  // Reset status messages when receipts change
  useEffect(() => {
    if (deleteStatus.success || deleteStatus.error) {
      const timer = setTimeout(() => {
        setDeleteStatus({ loading: false, error: null, success: false });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [deleteStatus]);

  const handleDelete = async (id) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('Authentication required. Please log in to delete receipts.');
      return;
    }
    
    // First show the popup
    setDeleteStatus({ loading: true, error: null, success: false });
    
    // Delay API call slightly to ensure popup is visible
    setTimeout(async () => {
      try {
        // Get JWT token from local storage
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Authentication token not found. Please log in again.');
        }
        
        // Using the API_URL from the environment variable
        const response = await fetch(`${API_URL}/api/delete-receipt/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Handle authentication errors
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        
        // Handle 404 errors (receipt not found)
        if (response.status === 404) {
          throw new Error('Receipt not found or already deleted');
        }
        
        // Parse the response
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || "Failed to delete receipt");
        }
        
        console.log("Delete success:", data.message);
        
        // Keep the loading state for at least 1.5 seconds for better user experience
        setTimeout(() => {
          setDeleteStatus({ loading: false, error: null, success: true });
          toast.success('Receipt deleted successfully!');
          
          // Call the parent component's callback to refresh the receipts list
          if (onReceiptDeleted) {
            onReceiptDeleted();
          }
        }, 1500);
        
      } catch (err) {
        console.error("Error deleting receipt:", err);
        
        // Keep the loading state for at least 1 second before showing the error
        setTimeout(() => {
          setDeleteStatus({ loading: false, error: err.message, success: false });
          toast.error(err.message);
        }, 1000);
      }
    }, 500); // Small delay before starting API call
  };

  // If there are no receipts and we're not in a loading/error state, 
  // show a different message based on authentication
  const renderEmptyState = () => {
    if (searchQuery || filterCategory !== 'all') {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <Receipt size={40} />
          </div>
          <p className="empty-text">No matching receipts found</p>
          <p className="empty-subtext">Try changing your search or filter criteria</p>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <Lock size={40} />
          </div>
          <p className="empty-text">Authentication Required</p>
          <p className="empty-subtext">Please log in to view your receipts</p>
          <button 
            className="button button-primary"
            onClick={() => window.location.href = '/login'}
          >
            Log In
          </button>
        </div>
      );
    }
    
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Receipt size={40} />
        </div>
        <p className="empty-text">No receipts found</p>
        <p className="empty-subtext">Upload a receipt to get started</p>
      </div>
    );
  };

  return (
    <div className="card receipt-list-card">
      <h2 className="card-title">
        <FileText className="card-title-icon" size={20} />
        Stored Receipts
        <span className="count-badge">{receipts.length} total</span>
      </h2>

      {/* Deletion Popup */}
      {deleteStatus.loading && (
        <div className="delete-popup-overlay">
          <div className="delete-popup">
            <div className="delete-spinner"></div>
            <p>Please wait, deleting your receipt...</p>
          </div>
        </div>
      )}

      {/* Status messages */}
      {deleteStatus.success && (
        <div className="success-message">
          <Check size={16} className="success-icon" />
          Receipt deleted successfully.
        </div>
      )}
      
      {deleteStatus.error && (
        <div className="error-message">
          <AlertTriangle size={16} className="error-icon" />
          {deleteStatus.error}
        </div>
      )}

      <div className="receipt-filters">
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search receipts..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-row">
          <div className="filter-group">
            <label className="filter-label">
              <Filter size={14} /> Filter:
            </label>
            <select
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">
              <Clock size={14} /> Sort by:
            </label>
            <select
              className="filter-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertTriangle size={16} className="error-icon" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading receipts...</p>
        </div>
      ) : filteredReceipts.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="receipts-scrollable-list">
          {filteredReceipts.map((receipt, index) => (
            <ReceiptCard 
              key={receipt._id || index} 
              receipt={receipt} 
              index={index} 
              onDelete={handleDelete}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}
    </div>
  );
}