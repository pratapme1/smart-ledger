// src/services/aiService.js

/**
 * Service to handle AI-related operations for the Smart Assistant
 * This communicates with OpenAI's API or other AI services
 */

import axios from 'axios';
import config from '../config';

// Get API URLs from environment variables with fallbacks
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const AI_API_URL = process.env.REACT_APP_AI_API_URL || 'https://api.openai.com/v1';
const AI_API_KEY = process.env.REACT_APP_AI_API_KEY;

// Get token from local storage
const getToken = () => localStorage.getItem(config?.AUTH?.TOKEN_KEY || 'token');

// Headers for OpenAI API requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AI_API_KEY}`
};

/**
 * Generate insights from receipt data using OpenAI's GPT model
 * @param {Array} receipts - Array of receipt objects
 * @param {String} timeRange - Time range for analysis ('weekly', 'monthly', 'quarterly')
 * @returns {Promise} - Promise resolving to insights object
 */
export const generateSmartInsights = async (receipts, timeRange) => {
  try {
    // Prepare the receipt data for the AI model
    // We need to be selective about what we send to avoid token limits
    const simplifiedReceipts = receipts.map(receipt => ({
      id: receipt._id,
      date: receipt.date || receipt.uploadedAt,
      merchant: receipt.merchant,
      category: receipt.category,
      totalAmount: receipt.totalAmount,
      currency: receipt.currency,
      items: receipt.items?.map(item => ({
        description: item.description,
        price: item.price,
        quantity: item.quantity || 1,
      }))
    }));

    // Structure the prompt for the AI model
    const prompt = {
      model: "gpt-4-turbo", // or your preferred model
      messages: [
        {
          role: "system",
          content: `You are a financial analysis assistant that provides actionable insights to help users save money. 
          Analyze the provided receipt data to:
          1. Identify spending patterns
          2. Highlight potential saving opportunities
          3. Detect recurring expenses
          4. Predict upcoming purchases
          5. Calculate overall financial statistics
          
          Provide actionable recommendations that are specific and concrete. 
          Format your response as a JSON object with the following structure:
          {
            "insights": [
              {
                "title": "Short insight title",
                "description": "Detailed description of what you observed",
                "recommendation": "Specific actionable advice",
                "priority": "high|medium|low (based on potential impact)",
                "icon": "Appropriate emoji for this insight",
                "category": "spending|savings|recurring|trend"
              }
            ],
            "upcomingPurchases": [
              {
                "item": "Item name",
                "estimatedAmount": numeric_amount,
                "suggestedDate": "YYYY-MM-DD",
                "source": "Brief explanation of prediction source"
              }
            ],
            "summaryStats": {
              "totalSpent": numeric_total,
              "avgTransaction": numeric_average,
              "topCategory": "Most frequent category",
              "savingsOpportunities": numeric_saving_potential,
              "spendingTrend": "increasing|decreasing|stable"
            }
          }`
        },
        {
          role: "user",
          content: `Here is my receipt data for the ${timeRange} time period. Please analyze it and provide insights to help me save money:\n\n${JSON.stringify(simplifiedReceipts)}`
        }
      ],
      temperature: 0.5,
      max_tokens: 2000
    };

    // Send request to OpenAI API
    const response = await axios.post(`${AI_API_URL}/chat/completions`, prompt, { headers });
    
    // Parse the response from the AI
    const aiResponse = response.data.choices[0].message.content;
    let parsedResponse;
    
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      throw new Error("Invalid response format from AI service");
    }
    
    // Add default values for anything missing in the response
    return {
      insights: parsedResponse.insights || [],
      upcomingPurchases: parsedResponse.upcomingPurchases || [],
      summaryStats: {
        totalSpent: parsedResponse.summaryStats?.totalSpent || 0,
        avgTransaction: parsedResponse.summaryStats?.avgTransaction || 0,
        topCategory: parsedResponse.summaryStats?.topCategory || 'Uncategorized',
        savingsOpportunities: parsedResponse.summaryStats?.savingsOpportunities || 0,
        receiptCount: receipts.length,
        primaryCurrency: receipts[0]?.currency || 'USD',
        spendingTrend: parsedResponse.summaryStats?.spendingTrend || 'stable'
      }
    };
  } catch (error) {
    console.error("Error generating insights:", error);
    throw error;
  }
};

/**
 * Fetch best deals for frequently purchased items
 * @param {Array} items - Array of item names to find deals for
 * @returns {Promise} - Promise resolving to deals array
 */
export const fetchBestDeals = async (items) => {
  try {
    // In a real implementation, this would call a price comparison API or web scraper
    // For demo purposes, we'll use the OpenAI API to generate plausible deals
    
    const prompt = {
      model: "gpt-4-turbo", // or your preferred model
      messages: [
        {
          role: "system",
          content: `You are a deal-finding assistant that helps users save money on their frequent purchases. 
          For the provided list of items, generate realistic deals from common retailers.
          Format your response as a JSON array with the following structure:
          [
            {
              "item": "Item name",
              "store": "Store name",
              "regularPrice": numeric_regular_price,
              "dealPrice": numeric_deal_price,
              "expiryDate": "MM/DD/YYYY",
              "link": "#" // Placeholder link
            }
          ]`
        },
        {
          role: "user",
          content: `Find the best current deals for these items I frequently purchase: ${JSON.stringify(items)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    };
    
    // Send request to OpenAI API
    const response = await axios.post(`${AI_API_URL}/chat/completions`, prompt, { headers });
    
    // Parse the response
    const aiResponse = response.data.choices[0].message.content;
    let parsedDeals;
    
    try {
      parsedDeals = JSON.parse(aiResponse);
    } catch (e) {
      console.error("Failed to parse AI response for deals:", e);
      throw new Error("Invalid deals response format from AI service");
    }
    
    return parsedDeals;
  } catch (error) {
    console.error("Error fetching deals:", error);
    throw error;
  }
};

/**
 * Get price history for a specific item
 * @param {String} itemName - Name of the item
 * @param {Array} receipts - Array of receipts to analyze
 * @returns {Object} - Price history data
 */
export const getItemPriceHistory = async (itemName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/smart-analysis/price-history/${encodeURIComponent(itemName)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch price history');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching price history:', error);
    throw error;
  }
};

/**
 * Get merchant comparison for a specific item
 * @param {String} itemName - Name of the item
 * @returns {Object} - Merchant comparison data
 */
export const getMerchantComparison = async (itemName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/smart-analysis/merchant-comparison/${encodeURIComponent(itemName)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch merchant comparison');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching merchant comparison:', error);
    throw error;
  }
};

/**
 * Get shopping list recommendations
 * @returns {Array} - Array of recommended items to purchase
 */
export const getShoppingListRecommendations = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/smart-analysis/shopping-recommendations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch shopping recommendations');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching shopping recommendations:', error);
    throw error;
  }
};

/**
 * Update shopping list
 * @param {Array} items - Array of item names to update
 * @returns {Object} - Updated shopping list data
 */
export const updateShoppingList = async (items) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/smart-analysis/shopping-list`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      throw new Error('Failed to update shopping list');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating shopping list:', error);
    throw error;
  }
};

/**
 * Generate shopping list recommendations based on purchase patterns
 * @param {Array} receipts - Array of receipt objects
 * @returns {Array} - Array of recommended items to purchase
 */
export const generateShoppingListRecommendations = (receipts) => {
  // Extract all items with their purchase frequency and last purchase date
  const itemMap = new Map();
  
  receipts.forEach(receipt => {
    const receiptDate = new Date(receipt.date || receipt.uploadedAt);
    
    if (!receipt.items) return;
    
    receipt.items.forEach(item => {
      if (!item.description) return;
      
      const itemKey = item.description.toLowerCase().trim();
      
      if (!itemMap.has(itemKey)) {
        itemMap.set(itemKey, {
          name: item.description,
          purchaseDates: [receiptDate],
          lastPurchased: receiptDate,
          totalQuantity: item.quantity || 1,
          purchases: 1,
          category: receipt.category,
          avgPrice: item.price
        });
      } else {
        const itemData = itemMap.get(itemKey);
        itemData.purchaseDates.push(receiptDate);
        itemData.lastPurchased = new Date(Math.max(receiptDate, itemData.lastPurchased));
        itemData.totalQuantity += (item.quantity || 1);
        itemData.purchases += 1;
        itemData.avgPrice = ((itemData.avgPrice * (itemData.purchases - 1)) + item.price) / itemData.purchases;
      }
    });
  });
  
  // Convert map values to array
  const allItems = Array.from(itemMap.values());
  
  // Calculate purchase frequency for each item
  const now = new Date();
  allItems.forEach(item => {
    // Sort dates
    item.purchaseDates.sort((a, b) => a - b);
    
    // Calculate average time between purchases (in days)
    if (item.purchaseDates.length >= 2) {
      let totalDaysBetween = 0;
      for (let i = 1; i < item.purchaseDates.length; i++) {
        const daysBetween = (item.purchaseDates[i] - item.purchaseDates[i-1]) / (1000 * 60 * 60 * 24);
        totalDaysBetween += daysBetween;
      }
      item.avgDaysBetween = totalDaysBetween / (item.purchaseDates.length - 1);
    } else {
      item.avgDaysBetween = 30; // Default for items purchased only once
    }
    
    // Calculate days since last purchase
    item.daysSinceLastPurchase = (now - item.lastPurchased) / (1000 * 60 * 60 * 24);
    
    // Calculate a "need to buy" score
    if (item.avgDaysBetween) {
      item.needToBuyScore = item.daysSinceLastPurchase / item.avgDaysBetween;
    } else {
      item.needToBuyScore = 0;
    }
    
    // Calculate estimated days until next purchase
    item.estimatedDaysUntilNextPurchase = Math.max(0, item.avgDaysBetween - item.daysSinceLastPurchase);
    
    // Calculate estimated next purchase date
    item.estimatedNextPurchaseDate = new Date(now.getTime() + (item.estimatedDaysUntilNextPurchase * 24 * 60 * 60 * 1000));
  });
  
  // Filter to items likely to be needed soon (score > 0.8)
  const recommendedItems = allItems
    .filter(item => item.needToBuyScore > 0.8)
    .sort((a, b) => b.needToBuyScore - a.needToBuyScore);
  
  // Format results
  return recommendedItems.map(item => ({
    name: item.name,
    estimatedNextPurchaseDate: item.estimatedNextPurchaseDate.toISOString().split('T')[0],
    daysUntilNextPurchase: Math.round(item.estimatedDaysUntilNextPurchase),
    estimatedPrice: item.avgPrice,
    purchaseFrequency: item.avgDaysBetween ? `Every ${Math.round(item.avgDaysBetween)} days` : 'Unknown',
    category: item.category || 'Uncategorized'
  }));
};

/**
 * Analyze subscription services based on recurring payments
 * @param {Array} receipts - Array of receipt objects
 * @returns {Array} - Array of detected subscription services
 */
export const analyzeSubscriptionServices = (receipts) => {
  // Group receipts by merchant
  const merchantReceipts = {};
  
  receipts.forEach(receipt => {
    const merchant = receipt.merchant;
    if (!merchant) return;
    
    if (!merchantReceipts[merchant]) {
      merchantReceipts[merchant] = [];
    }
    
    merchantReceipts[merchant].push({
      date: new Date(receipt.date || receipt.uploadedAt),
      amount: receipt.totalAmount || 0
    });
  });
  
  // Analyze each merchant for subscription patterns
  const subscriptions = [];
  
  Object.entries(merchantReceipts).forEach(([merchant, receipts]) => {
    // Need at least 2 receipts to detect a pattern
    if (receipts.length < 2) return;
    
    // Sort receipts by date
    receipts.sort((a, b) => a.date - b.date);
    
    // Check for similar amounts
    const amounts = receipts.map(r => r.amount);
    const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const similarAmounts = amounts.every(amount => Math.abs(amount - avgAmount) < (avgAmount * 0.1));
    
    if (!similarAmounts) return;
    
    // Check for regular intervals
    const intervals = [];
    for (let i = 1; i < receipts.length; i++) {
      intervals.push((receipts[i].date - receipts[i-1].date) / (1000 * 60 * 60 * 24));
    }
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    // Check if intervals are consistent (within 20% of average)
    const regularIntervals = intervals.every(interval => Math.abs(interval - avgInterval) < (avgInterval * 0.2));
    
    if (!regularIntervals) return;
    
    // Determine subscription frequency
    let frequency;
    if (avgInterval <= 7) {
      frequency = 'Weekly';
    } else if (avgInterval <= 15) {
      frequency = 'Bi-weekly';
    } else if (avgInterval <= 35) {
      frequency = 'Monthly';
    } else if (avgInterval <= 95) {
      frequency = 'Quarterly';
    } else if (avgInterval <= 190) {
      frequency = 'Bi-annually';
    } else {
      frequency = 'Annually';
    }
    
    // Calculate next payment date
    const lastPaymentDate = receipts[receipts.length - 1].date;
    const nextPaymentDate = new Date(lastPaymentDate.getTime() + (avgInterval * 24 * 60 * 60 * 1000));
    
    // Add to subscriptions list
    subscriptions.push({
      merchant,
      amount: avgAmount,
      frequency,
      lastPaymentDate: lastPaymentDate.toISOString().split('T')[0],
      nextPaymentDate: nextPaymentDate.toISOString().split('T')[0],
      annualCost: avgAmount * (365 / avgInterval)
    });
  });
  
  // Sort by annual cost (highest first)
  return subscriptions.sort((a, b) => b.annualCost - a.annualCost);
};

export default {
  generateSmartInsights,
  fetchBestDeals,
  getItemPriceHistory,
  getMerchantComparison,
  getShoppingListRecommendations,
  updateShoppingList,
  generateShoppingListRecommendations,
  analyzeSubscriptionServices
};