import React, { useState } from 'react';
import { generateShoppingListRecommendations } from '../services/aiService';
import { ShoppingBag, Plus, Trash2, Check } from 'lucide-react';

const ShoppingListRecommendation = ({ receipts }) => {
  const [customItems, setCustomItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  
  // Get AI-generated recommendations
  const recommendations = generateShoppingListRecommendations(receipts);
  
  const handleAddItem = () => {
    if (newItem.trim()) {
      setCustomItems([...customItems, { name: newItem.trim(), isChecked: false }]);
      setNewItem('');
    }
  };

  const handleToggleItem = (index, isRecommended = false) => {
    if (isRecommended) {
      recommendations[index].isChecked = !recommendations[index].isChecked;
    } else {
      const updatedItems = [...customItems];
      updatedItems[index].isChecked = !updatedItems[index].isChecked;
      setCustomItems(updatedItems);
    }
  };

  const handleRemoveItem = (index) => {
    const updatedItems = customItems.filter((_, i) => i !== index);
    setCustomItems(updatedItems);
  };

  return (
    <div className="shopping-list-container">
      <div className="shopping-list-header">
        <h3><ShoppingBag size={20} /> Smart Shopping List</h3>
        <div className="add-item-form">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add custom item..."
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <button onClick={handleAddItem} className="add-button">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="shopping-list-content">
        <div className="recommended-items">
          <h4>Recommended Items</h4>
          {recommendations.map((item, index) => (
            <div key={index} className="list-item recommended">
              <div className="item-checkbox">
                <input
                  type="checkbox"
                  checked={item.isChecked || false}
                  onChange={() => handleToggleItem(index, true)}
                />
              </div>
              <div className="item-details">
                <span className="item-name">{item.name}</span>
                <div className="item-meta">
                  <span className="usual-price">
                    Usually ${item.usualPrice.toFixed(2)}
                  </span>
                  <span className="frequency">
                    {item.frequency}
                  </span>
                </div>
              </div>
              {item.bestPrice && (
                <div className="best-price-tag">
                  Best price: ${item.bestPrice.toFixed(2)} at {item.bestStore}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="custom-items">
          <h4>Custom Items</h4>
          {customItems.map((item, index) => (
            <div key={index} className="list-item custom">
              <div className="item-checkbox">
                <input
                  type="checkbox"
                  checked={item.isChecked || false}
                  onChange={() => handleToggleItem(index, false)}
                />
              </div>
              <span className="item-name">{item.name}</span>
              <button 
                className="remove-button"
                onClick={() => handleRemoveItem(index)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="shopping-list-summary">
        <div className="total-items">
          Total Items: {recommendations.length + customItems.length}
        </div>
        <div className="checked-items">
          Checked: {
            recommendations.filter(item => item.isChecked).length +
            customItems.filter(item => item.isChecked).length
          }
        </div>
        <button className="complete-button">
          <Check size={16} /> Complete Shopping
        </button>
      </div>
    </div>
  );
};

export default ShoppingListRecommendation; 