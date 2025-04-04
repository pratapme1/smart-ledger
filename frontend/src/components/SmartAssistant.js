import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  PieChart, Pie, Cell, LineChart, Line, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, DollarSign, AlertTriangle, ShoppingBag, 
  Calendar, CreditCard, Bookmark, Search, MessageCircle,
  ArrowUp, ArrowDown, ExternalLink, RefreshCcw, Zap, Clock, ArrowRight, Plus, Check, X
} from 'lucide-react';
import { getCurrencySymbol } from '../utils/currencyUtils';
import { AuthContext } from '../context/AuthContext';
import { fetchBestDeals, generateSmartInsights, getItemPriceHistory, getMerchantComparison, getShoppingListRecommendations, updateShoppingList } from '../services/aiService';
import PricePrediction from './PricePrediction';
import ShoppingListRecommendation from './ShoppingListRecommendation';
import { toast } from 'react-toastify';

const SmartAssistant = ({ receipts }) => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const [timeRange, setTimeRange] = useState('monthly');
  const [activeTab, setActiveTab] = useState('insights');
  const [insights, setInsights] = useState([]);
  const [deals, setDeals] = useState([]);
  const [upcomingPurchases, setUpcomingPurchases] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryStats, setSummaryStats] = useState({
    totalSpent: 0,
    avgTransaction: 0,
    topCategory: '',
    savingsOpportunities: 0,
    receiptCount: 0,
    primaryCurrency: 'USD',
    spendingTrend: 'stable' // 'increasing', 'decreasing', or 'stable'
  });
  const [selectedItem, setSelectedItem] = useState('');
  const [priceHistory, setPriceHistory] = useState(null);
  const [merchantComparison, setMerchantComparison] = useState(null);
  const [shoppingList, setShoppingList] = useState([]);
  const [newItem, setNewItem] = useState('');

  // Process receipt data to generate insights
  const processReceiptData = useCallback(() => {
    if (!receipts || receipts.length < 3) return;
    
    setIsAnalyzing(true);

    // Calculate basic stats similar to your Analytics component
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'weekly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarterly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
    
    // Filter receipts based on date range
    const relevantReceipts = receipts.filter(receipt => {
      const receiptDate = new Date(receipt.date || receipt.uploadedAt);
      return receiptDate >= startDate && receiptDate <= now;
    });
    
    if (relevantReceipts.length === 0) {
      setIsAnalyzing(false);
      return;
    }

    // Process receipts for comprehensive analysis
    // This would normally call your backend AI service
    generateSmartInsights(relevantReceipts, timeRange)
      .then(result => {
        setInsights(result.insights);
        setUpcomingPurchases(result.upcomingPurchases);
        setSummaryStats(result.summaryStats);
        setIsAnalyzing(false);
      })
      .catch(error => {
        console.error("Error generating insights:", error);
        setIsAnalyzing(false);
        
        // Fallback to basic insights if API fails
        generateBasicInsights(relevantReceipts);
      });
  }, [receipts, timeRange]);

  // Generate basic insights without API call as fallback
  const generateBasicInsights = (relevantReceipts) => {
    // Find most common merchant and category
    const merchants = {};
    const categories = {};
    let totalSpent = 0;
    
    relevantReceipts.forEach(receipt => {
      const merchant = receipt.merchant || 'Unknown';
      const category = receipt.category || 'Uncategorized';
      const amount = receipt.totalAmount || 0;
      
      merchants[merchant] = (merchants[merchant] || 0) + 1;
      categories[category] = (categories[category] || 0) + amount;
      totalSpent += amount;
    });
    
    let topMerchant = 'Unknown';
    let maxVisits = 0;
    Object.entries(merchants).forEach(([merchant, count]) => {
      if (count > maxVisits) {
        maxVisits = count;
        topMerchant = merchant;
      }
    });
    
    let topCategory = 'Uncategorized';
    let maxSpend = 0;
    Object.entries(categories).forEach(([category, amount]) => {
      if (amount > maxSpend) {
        maxSpend = amount;
        topCategory = category;
      }
    });
    
    // Calculate spending trend
    let spendingTrend = 'stable';
    if (relevantReceipts.length >= 6) {
      const midpoint = Math.floor(relevantReceipts.length / 2);
      const olderReceipts = relevantReceipts.slice(0, midpoint);
      const newerReceipts = relevantReceipts.slice(midpoint);
      
      const olderTotal = olderReceipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      const newerTotal = newerReceipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      
      if (newerTotal > olderTotal * 1.1) spendingTrend = 'increasing';
      else if (newerTotal < olderTotal * 0.9) spendingTrend = 'decreasing';
    }
    
    // Generate basic insights based on the analysis
    const basicInsights = [
      {
        title: `You frequently shop at ${topMerchant}`,
        description: `You've visited ${topMerchant} ${maxVisits} times in this period.`,
        recommendation: "Consider checking if they have a loyalty program or bulk purchase discounts.",
        priority: "medium",
        icon: "🏪",
        category: "shopping"
      },
      {
        title: `${topCategory} is your top spending category`,
        description: `You've spent ${getCurrencySymbol('USD')}${maxSpend.toFixed(2)} on ${topCategory}.`,
        recommendation: spendingTrend === 'increasing' 
          ? "Your spending in this category is increasing. Consider setting a budget limit."
          : "Track this category closely to identify potential savings.",
        priority: spendingTrend === 'increasing' ? "high" : "medium",
        icon: "💸",
        category: "budget"
      }
    ];
    
    // Add spending trend insight if available
    if (spendingTrend !== 'stable') {
      basicInsights.push({
        title: `Your spending is ${spendingTrend}`,
        description: `Your overall spending pattern shows a ${spendingTrend} trend.`,
        recommendation: spendingTrend === 'increasing'
          ? "Review your recent purchases to identify non-essential spending."
          : "Great job reducing your spending! Consider putting the savings toward your financial goals.",
        priority: spendingTrend === 'increasing' ? "high" : "low",
        icon: spendingTrend === 'increasing' ? "📈" : "📉",
        category: "trend"
      });
    }
    
    // Add recurring purchase insight if we detect any
    const receiptsByMerchant = {};
    relevantReceipts.forEach(r => {
      const merchant = r.merchant || 'Unknown';
      if (!receiptsByMerchant[merchant]) receiptsByMerchant[merchant] = [];
      receiptsByMerchant[merchant].push(r);
    });
    
    // Find merchants with multiple visits and similar purchase amounts
    Object.entries(receiptsByMerchant).forEach(([merchant, merchantReceipts]) => {
      if (merchantReceipts.length >= 3) {
        // Check if purchase amounts are similar
        const amounts = merchantReceipts.map(r => r.totalAmount || 0);
        const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
        const similarAmounts = amounts.every(amt => Math.abs(amt - avgAmount) < avgAmount * 0.2);
        
        if (similarAmounts) {
          basicInsights.push({
            title: `Regular purchases at ${merchant}`,
            description: `You make consistent purchases of around ${getCurrencySymbol('USD')}${avgAmount.toFixed(2)} at ${merchant}.`,
            recommendation: "This might be a subscription or regular expense. Check if there are annual payment options for better rates.",
            priority: "medium",
            icon: "🔄",
            category: "recurring"
          });
        }
      }
    });
    
    setInsights(basicInsights);
    setSummaryStats({
      totalSpent,
      avgTransaction: totalSpent / relevantReceipts.length,
      topCategory,
      savingsOpportunities: Math.round(totalSpent * 0.15), // Rough estimate
      receiptCount: relevantReceipts.length,
      primaryCurrency: 'USD',
      spendingTrend
    });
    
    // Generate placeholder upcoming purchases
    setUpcomingPurchases([
      {
        item: "Groceries",
        estimatedAmount: Math.round(relevantReceipts.filter(r => r.category === 'Groceries').reduce((sum, r) => sum + (r.totalAmount || 0), 0) / 4), // Average of grocery receipts
        suggestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 1 week from now
        source: "Weekly pattern"
      }
    ]);
  };

  // Fetch deals for products the user frequently buys
  const fetchDealsForUser = useCallback(() => {
    if (!receipts || receipts.length < 3) return;
    
    // Extract frequently purchased items
    const itemCounts = {};
    receipts.forEach(receipt => {
      if (receipt.items && receipt.items.length) {
        receipt.items.forEach(item => {
          const itemName = item.description || 'Unknown Item';
          itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
        });
      }
    });
    
    // Get top 5 frequent items
    const frequentItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([item]) => item);
    
    // Call the deal finding service
    // This would connect to your backend/API service
    if (frequentItems.length > 0) {
      fetchBestDeals(frequentItems)
        .then(dealsResult => {
          setDeals(dealsResult);
        })
        .catch(error => {
          console.error("Error fetching deals:", error);
          // Set some fallback placeholder deals
          setDeals([
            {
              item: "Coffee",
              store: "LocalMart",
              regularPrice: 15.99,
              dealPrice: 12.49,
              expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
              link: "#"
            },
            {
              item: "Paper Towels",
              store: "SuperStore",
              regularPrice: 8.99,
              dealPrice: 5.99,
              expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
              link: "#"
            }
          ]);
        });
    }
  }, [receipts]);

  // Generate insights when receipts or time range changes
  useEffect(() => {
    if (isAuthenticated && receipts && receipts.length >= 3) {
      processReceiptData();
      fetchDealsForUser();
    }
  }, [receipts, timeRange, isAuthenticated, processReceiptData, fetchDealsForUser]);

  const handleItemSelect = async (itemName) => {
    setSelectedItem(itemName);
    setLoading(true);
    try {
      const [historyData, comparisonData] = await Promise.all([
        getItemPriceHistory(itemName),
        getMerchantComparison(itemName)
      ]);
      setPriceHistory(historyData.priceHistory);
      setMerchantComparison(comparisonData.merchantComparison);
    } catch (error) {
      console.error('Error fetching item data:', error);
      toast.error('Failed to load item data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    
    const updatedList = [...shoppingList, {
      itemName: newItem,
      isCustom: true,
      checked: false
    }];
    
    try {
      await updateShoppingList(updatedList);
      setShoppingList(updatedList);
      setNewItem('');
      toast.success('Item added to shopping list');
    } catch (error) {
      console.error('Error updating shopping list:', error);
      toast.error('Failed to add item');
    }
  };

  const handleToggleItem = async (index) => {
    const updatedList = [...shoppingList];
    updatedList[index].checked = !updatedList[index].checked;
    
    try {
      await updateShoppingList(updatedList);
      setShoppingList(updatedList);
    } catch (error) {
      console.error('Error updating shopping list:', error);
      toast.error('Failed to update item');
    }
  };

  const handleRemoveItem = async (index) => {
    const updatedList = shoppingList.filter((_, i) => i !== index);
    
    try {
      await updateShoppingList(updatedList);
      setShoppingList(updatedList);
      toast.success('Item removed from shopping list');
    } catch (error) {
      console.error('Error updating shopping list:', error);
      toast.error('Failed to remove item');
    }
  };

  // If user is not authenticated or loading
  if (!isAuthenticated) {
    return (
      <div className="smart-assistant-locked">
        <div className="lock-icon">🔒</div>
        <h2>Smart Assistant</h2>
        <p>Sign in to access personalized spending insights and savings opportunities.</p>
      </div>
    );
  }

  // If still loading receipts or analyzing data
  if (loading || isAnalyzing) {
    return (
      <div className="smart-assistant-container">
        <div className="smart-assistant-header">
          <h2><Zap className="header-icon" size={20} /> Smart Assistant</h2>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{isAnalyzing ? 'Analyzing your financial data...' : 'Loading your financial data...'}</p>
        </div>
      </div>
    );
  }

  // If not enough receipts
  if (receipts.length < 3) {
    return (
      <div className="smart-assistant-container">
        <div className="smart-assistant-header">
          <h2><Zap className="header-icon" size={20} /> Smart Assistant</h2>
        </div>
        <div className="limited-data-message">
          <div className="info-icon">ℹ️</div>
          <h3>More Data Needed</h3>
          <p>Upload at least 3 receipts to generate meaningful insights and savings opportunities.</p>
          <p className="data-count">Currently analyzing {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}.</p>
        </div>
      </div>
    );
  }

  // Render Smart Assistant UI
  return (
    <div className="smart-assistant-container">
      <div className="smart-assistant-header">
        <h2><Zap className="header-icon" size={20} /> Smart Assistant</h2>
        <div className="assistant-controls">
          <div className="time-range-controls">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="time-range-selector"
            >
              <option value="weekly">Last 7 Days</option>
              <option value="monthly">Last 30 Days</option>
              <option value="quarterly">Last 3 Months</option>
            </select>
          </div>
          <button 
            className="refresh-button" 
            onClick={() => {
              processReceiptData();
              fetchDealsForUser();
            }}
            disabled={isAnalyzing}
          >
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
      </div>

      {isAnalyzing ? (
        <div className="analyzing-container">
          <div className="analyzing-spinner"></div>
          <p>Analyzing your spending patterns...</p>
        </div>
      ) : (
        <>
          <div className="smart-summary">
            <div className="summary-tile">
              <div className="tile-header">
                <DollarSign size={20} />
                <span>30-Day Spending</span>
              </div>
              <div className="tile-value">
                {getCurrencySymbol(summaryStats.primaryCurrency)}
                {summaryStats.totalSpent.toFixed(2)}
              </div>
              <div className={`trend-indicator ${summaryStats.spendingTrend}`}>
                {summaryStats.spendingTrend === 'increasing' && <ArrowUp size={14} />}
                {summaryStats.spendingTrend === 'decreasing' && <ArrowDown size={14} />}
                {summaryStats.spendingTrend === 'stable' && <span>─</span>}
                <span>{summaryStats.spendingTrend}</span>
              </div>
            </div>

            <div className="summary-tile">
              <div className="tile-header">
                <ShoppingBag size={20} />
                <span>Top Category</span>
              </div>
              <div className="tile-value category">
                {summaryStats.topCategory}
              </div>
              <div className="tile-subtext">
                Highest spend category
              </div>
            </div>

            <div className="summary-tile highlight">
              <div className="tile-header">
                <Bookmark size={20} />
                <span>Savings Potential</span>
              </div>
              <div className="tile-value">
                {getCurrencySymbol(summaryStats.primaryCurrency)}
                {summaryStats.savingsOpportunities.toFixed(2)}
              </div>
              <div className="tile-subtext">
                Potential monthly savings
              </div>
            </div>
          </div>

          <div className="smart-assistant-tabs">
            <button 
              className={`tab ${activeTab === 'insights' ? 'active' : ''}`} 
              onClick={() => setActiveTab('insights')}
            >
              <MessageCircle size={16} /> Insights
            </button>
            <button 
              className={`tab ${activeTab === 'deals' ? 'active' : ''}`} 
              onClick={() => setActiveTab('deals')}
            >
              <DollarSign size={16} /> Best Deals
            </button>
            <button 
              className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`} 
              onClick={() => setActiveTab('upcoming')}
            >
              <Calendar size={16} /> Upcoming
            </button>
            <button 
              className={`tab ${activeTab === 'prices' ? 'active' : ''}`} 
              onClick={() => setActiveTab('prices')}
            >
              <TrendingUp size={16} /> Price Trends
            </button>
            <button 
              className={`tab ${activeTab === 'shopping' ? 'active' : ''}`} 
              onClick={() => setActiveTab('shopping')}
            >
              <ShoppingBag size={16} /> Shopping List
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'insights' && (
              <div className="insights-tab">
                <div className="search-bar">
                  <Search size={16} />
                  <input 
                    type="text" 
                    placeholder="Filter insights..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="insights-list">
                  {(insights || [])
                    .filter(insight => 
                      searchTerm === '' || 
                      insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      insight.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      insight.category?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((insight, index) => (
                      <div key={index} className={`insight-card ${insight.priority}`}>
                        <div className="insight-header">
                          <div className="insight-icon">{insight.icon}</div>
                          <div className="insight-title-container">
                            <h3 className="insight-title">{insight.title}</h3>
                            <div className={`insight-tag ${insight.priority}`}>
                              {insight.priority.charAt(0).toUpperCase() + insight.priority.slice(1)} Priority
                            </div>
                          </div>
                        </div>
                        <div className="insight-content">
                          <p className="insight-description">{insight.description}</p>
                          <div className="recommendation-container">
                            <h4 className="recommendation-title">💡 Recommendation</h4>
                            <p className="recommendation-text">{insight.recommendation}</p>
                          </div>
                          {insight.actionable && (
                            <button className="action-button">
                              Take Action
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                  {(insights || []).filter(insight => 
                    searchTerm === '' || 
                    insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    insight.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    insight.category?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 && (
                    <div className="no-results">
                      <p>No insights match your search.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'deals' && (
              <div className="deals-tab">
                {deals.length > 0 ? (
                  <div className="deals-list">
                    {deals.map((deal, index) => (
                      <div key={index} className="deal-card">
                        <div className="deal-header">
                          <h3 className="deal-title">{deal.item}</h3>
                          <div className="deal-store">{deal.store}</div>
                        </div>
                        <div className="deal-content">
                          <div className="price-comparison">
                            <div className="regular-price">
                              <span className="label">Regular Price:</span>
                              <span className="price">${deal.regularPrice.toFixed(2)}</span>
                            </div>
                            <div className="deal-price">
                              <span className="label">Deal Price:</span>
                              <span className="price">${deal.dealPrice.toFixed(2)}</span>
                            </div>
                            <div className="savings">
                              <span className="label">You Save:</span>
                              <span className="price">${(deal.regularPrice - deal.dealPrice).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="deal-footer">
                            <div className="expiry-date">
                              <Clock size={14} />
                              <span>Expires: {deal.expiryDate}</span>
                            </div>
                            <a href={deal.link} className="view-deal-button" target="_blank" rel="noopener noreferrer">
                              View Deal <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-deals-message">
                    <div className="info-icon">🔍</div>
                    <h3>No Deals Found</h3>
                    <p>We're actively searching for deals on your frequently purchased items. Check back soon!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'upcoming' && (
              <div className="upcoming-tab">
                {upcomingPurchases.length > 0 ? (
                  <div className="upcoming-list">
                    {upcomingPurchases.map((purchase, index) => (
                      <div key={index} className="upcoming-card">
                        <div className="upcoming-header">
                          <h3 className="upcoming-title">{purchase.item}</h3>
                          <div className="upcoming-tag">Predicted</div>
                        </div>
                        <div className="upcoming-content">
                          <div className="upcoming-details">
                            <div className="amount-estimate">
                              <span className="label">Estimated Amount:</span>
                              <span className="amount">${purchase.estimatedAmount.toFixed(2)}</span>
                            </div>
                            <div className="suggested-date">
                              <span className="label">Suggested Purchase Date:</span>
                              <span className="date">{purchase.suggestedDate}</span>
                            </div>
                            <div className="prediction-source">
                              <span className="label">Based on:</span>
                              <span className="source">{purchase.source}</span>
                            </div>
                          </div>
                          <div className="upcoming-actions">
                            <button className="remind-button">
                              <Clock size={14} /> Set Reminder
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-upcoming-message">
                    <div className="info-icon">📅</div>
                    <h3>No Upcoming Purchases Predicted</h3>
                    <p>As you add more receipts, we'll predict your upcoming purchases and help you plan better.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'prices' && (
              <div className="prices-tab">
                <div className="item-selector">
                  <select 
                    value={selectedItem || ''} 
                    onChange={(e) => setSelectedItem(e.target.value)}
                    className="item-dropdown"
                  >
                    <option value="">Select an item...</option>
                    {Array.from(new Set(receipts.flatMap(r => 
                      r.items?.map(item => item.description) || []
                    ))).map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                
                {selectedItem ? (
                  <PricePrediction item={selectedItem} receipts={receipts} />
                ) : (
                  <div className="select-item-prompt">
                    <div className="info-icon">📊</div>
                    <h3>Select an Item</h3>
                    <p>Choose an item from your purchase history to view price trends and predictions.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'shopping' && (
              <div className="shopping-tab">
                <ShoppingListRecommendation receipts={receipts} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SmartAssistant;