const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Receipt = require('../models/Receipt');

// Get price history for a specific item
router.get('/price-history/:itemName', auth, async (req, res) => {
  try {
    const { itemName } = req.params;
    const receipts = await Receipt.find({ user: req.user.id });
    
    const itemInstances = [];
    receipts.forEach(receipt => {
      if (!receipt.items) return;
      
      receipt.items.forEach(item => {
        if (item.description && 
            item.description.toLowerCase().includes(itemName.toLowerCase())) {
          itemInstances.push({
            date: new Date(receipt.date || receipt.uploadedAt),
            price: item.price,
            merchant: receipt.merchant,
            currency: receipt.currency || 'USD'
          });
        }
      });
    });

    // Sort by date
    itemInstances.sort((a, b) => a.date - b.date);
    
    const priceHistory = itemInstances.map(instance => ({
      date: instance.date.toISOString().split('T')[0],
      price: instance.price,
      merchant: instance.merchant
    }));

    res.json({ priceHistory });
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get merchant comparison for a specific item
router.get('/merchant-comparison/:itemName', auth, async (req, res) => {
  try {
    const { itemName } = req.params;
    const receipts = await Receipt.find({ user: req.user.id });
    
    const priceByMerchant = {};
    
    receipts.forEach(receipt => {
      if (!receipt.items) return;
      
      receipt.items.forEach(item => {
        if (item.description && 
            item.description.toLowerCase().includes(itemName.toLowerCase())) {
          if (!priceByMerchant[receipt.merchant]) {
            priceByMerchant[receipt.merchant] = [];
          }
          priceByMerchant[receipt.merchant].push(item.price);
        }
      });
    });

    // Calculate average price by merchant
    const merchantComparison = Object.entries(priceByMerchant).map(([merchant, prices]) => {
      const sum = prices.reduce((total, price) => total + price, 0);
      const avgPrice = sum / prices.length;
      return {
        merchant,
        avgPrice,
        instances: prices.length,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices)
      };
    });

    // Sort by average price
    merchantComparison.sort((a, b) => a.avgPrice - b.avgPrice);

    res.json({ merchantComparison });
  } catch (error) {
    console.error('Error fetching merchant comparison:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get shopping list recommendations
router.get('/shopping-recommendations', auth, async (req, res) => {
  try {
    const receipts = await Receipt.find({ user: req.user.id })
      .sort({ date: -1 })
      .limit(20); // Consider last 20 receipts for recommendations
    
    const itemFrequency = {};
    const lastPurchased = {};
    const averagePrices = {};
    
    receipts.forEach(receipt => {
      if (!receipt.items) return;
      
      receipt.items.forEach(item => {
        const itemName = item.description.toLowerCase();
        
        // Update frequency
        itemFrequency[itemName] = (itemFrequency[itemName] || 0) + 1;
        
        // Update last purchased date
        if (!lastPurchased[itemName] || 
            new Date(receipt.date) > new Date(lastPurchased[itemName])) {
          lastPurchased[itemName] = receipt.date;
        }
        
        // Update average prices
        if (!averagePrices[itemName]) {
          averagePrices[itemName] = {
            total: 0,
            count: 0
          };
        }
        averagePrices[itemName].total += item.price;
        averagePrices[itemName].count += 1;
      });
    });

    // Calculate recommendations based on frequency and last purchase date
    const recommendations = Object.entries(itemFrequency)
      .map(([itemName, frequency]) => {
        const daysSinceLastPurchase = Math.floor(
          (new Date() - new Date(lastPurchased[itemName])) / (1000 * 60 * 60 * 24)
        );
        
        const avgPrice = averagePrices[itemName].total / averagePrices[itemName].count;
        
        return {
          itemName,
          frequency,
          daysSinceLastPurchase,
          avgPrice,
          recommendationScore: frequency * daysSinceLastPurchase / 30 // Higher score for frequently bought items not purchased recently
        };
      })
      .filter(item => item.daysSinceLastPurchase >= 14) // Only recommend items not purchased in the last 2 weeks
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 10); // Return top 10 recommendations

    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating shopping recommendations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update shopping list
router.put('/shopping-list', auth, async (req, res) => {
  try {
    const { items } = req.body;
    
    // Here you would typically update the user's shopping list in the database
    // For now, we'll just return the items as confirmation
    res.json({ items });
  } catch (error) {
    console.error('Error updating shopping list:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 