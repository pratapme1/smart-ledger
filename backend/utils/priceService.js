// utils/priceService.js
const axios = require('axios');
const PriceHistory = require('../models/PriceHistory');

// Mock price database for common items
const MOCK_PRICE_DB = {
  'milk': 45,
  'bread': 35,
  'rice': 60,
  'pasta': 50,
  'cereal': 150,
  'coffee': 200,
  'tea': 120,
  'sugar': 40,
  'flour': 45,
  'eggs': 75,
  'cheese': 120,
  'yogurt': 40,
  'butter': 50,
  'oil': 100,
  'chicken': 180,
  'beef': 250,
  'fish': 220,
  'shampoo': 190,
  'soap': 30,
  'toothpaste': 85,
  'toilet paper': 120,
  'detergent': 130,
  'dish soap': 60,
  'netflix': 199,
  'amazon prime': 179,
  'spotify': 119
  // Add more items as needed
};

/**
 * Helper function to find price in mock database
 */
function findInMockDatabase(itemName) {
  const normalizedItemName = itemName.toLowerCase().trim();
  return MOCK_PRICE_DB[normalizedItemName];
}

/**
 * Helper function to fetch external price (placeholder)
 */
async function fetchExternalPrice(itemName) {
  // TODO: Implement actual external API integration
  return null;
}

/**
 * Helper function to get market price
 */
async function getMarketPrice(itemName) {
  try {
    // Try external API first (placeholder)
    const externalPrice = await fetchExternalPrice(itemName);
    if (externalPrice) {
      return externalPrice;
    }
    
    // Fallback to mock DB
    const mockPrice = findInMockDatabase(itemName);
    if (mockPrice) {
      return {
        price: mockPrice,
        merchant: 'Market Average'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting market price:', error);
    return null;
  }
}

/**
 * Helper function to save price history
 */
async function savePriceHistory(
  itemName,
  price,
  userId,
  merchant,
  category,
  priceChange = 0,
  priceChangePercentage = 0,
  priceTrend = 'stable'
) {
  try {
    const priceHistory = new PriceHistory({
      itemName,
      price,
      userId,
      merchant,
      category,
      priceChange,
      priceChangePercentage,
      priceTrend,
      date: new Date()
    });

    await priceHistory.save();
  } catch (error) {
    console.error('Error saving price history:', error);
    throw error;
  }
}

/**
 * Compare current price with historical data
 */
async function comparePrice(itemName, price, userId, merchant, category) {
  try {
    // Get historical data for this item
    const history = await PriceHistory.find({
      userId,
      itemName,
      merchant
    }).sort({ date: -1 });

    if (history.length === 0) {
      // First time seeing this item, save it
      await savePriceHistory(itemName, price, userId, merchant, category);
      return {
        itemName,
        currentPrice: price,
        merchant,
        isNewItem: true,
        message: 'First time tracking this item'
      };
    }

    const lastPrice = history[0].price;
    const priceChange = price - lastPrice;
    const priceChangePercentage = ((priceChange / lastPrice) * 100).toFixed(2);
    const priceTrend = priceChange > 0 ? 'up' : priceChange < 0 ? 'down' : 'stable';

    // Save the new price
    await savePriceHistory(
      itemName,
      price,
      userId,
      merchant,
      category,
      priceChange,
      priceChangePercentage,
      priceTrend
    );

    // Calculate average price
    const averagePrice = history.reduce((sum, record) => sum + record.price, 0) / history.length;

    return {
      itemName,
      currentPrice: price,
      lastPrice,
      priceChange,
      priceChangePercentage: `${priceChangePercentage}%`,
      priceTrend,
      averagePrice: averagePrice.toFixed(2),
      merchant,
      isNewItem: false,
      message: `Price has gone ${priceTrend} by ${Math.abs(priceChangePercentage)}%`
    };
  } catch (error) {
    console.error('Error in comparePrice:', error);
    throw error;
  }
}

/**
 * Get historical price data for an item
 */
async function getHistoricalPriceData(itemName, userId, merchant) {
  try {
    const query = { userId, itemName };
    if (merchant) query.merchant = merchant;

    const history = await PriceHistory.find(query)
      .sort({ date: -1 })
      .limit(30); // Last 30 days

    return history.map(record => ({
      date: record.date,
      price: record.price,
      merchant: record.merchant,
      priceChange: record.priceChange,
      priceChangePercentage: record.priceChangePercentage,
      priceTrend: record.priceTrend
    }));
  } catch (error) {
    console.error('Error in getHistoricalPriceData:', error);
    throw error;
  }
}

/**
 * Calculate price statistics from historical data
 */
function calculatePriceStats(historicalData, currentPrice) {
  if (!historicalData || historicalData.length === 0) {
    return {
      trend: 'stable',
      change: 0,
      changePercentage: 0,
      bestPrice: currentPrice,
      averagePrice: currentPrice
    };
  }
  
  const prices = historicalData.map(h => h.price);
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const bestPrice = Math.min(...prices);
  const latestPrice = historicalData[historicalData.length - 1].price;
  
  const priceChange = currentPrice - latestPrice;
  const priceChangePercentage = (priceChange / latestPrice) * 100;
  
  let trend = 'stable';
  if (priceChangePercentage > 5) {
    trend = 'increasing';
  } else if (priceChangePercentage < -5) {
    trend = 'decreasing';
  }
  
  return {
    trend,
    change: priceChange,
    changePercentage,
    bestPrice,
    averagePrice
  };
}

/**
 * Record price in history
 */
async function recordPriceHistory({ itemName, price, userId, merchant, category, marketPrice, marketMerchant }) {
  try {
    await PriceHistory.create({
      itemName,
      price,
      userId,
      merchant,
      category,
      marketPrice,
      marketMerchant
    });
  } catch (error) {
    console.error('Error recording price history:', error);
  }
}

module.exports = {
  comparePrice,
  getHistoricalPriceData,
  getMarketPrice,
  recordPriceHistory
};