const PriceHistory = require('../models/PriceHistory');
const Receipt = require('../models/Receipt');

// Get price history for an item
exports.getPriceHistory = async (req, res) => {
  try {
    const { itemName, merchant } = req.query;
    const userId = req.user._id;
    
    if (!itemName) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    // Build query
    const query = { 
      userId,
      itemName: { $regex: itemName, $options: 'i' } 
    };
    if (merchant) {
      query.merchant = { $regex: merchant, $options: 'i' };
    }

    // Get price history
    const priceHistory = await PriceHistory.find(query)
      .sort({ date: -1 })
      .limit(30); // Last 30 entries

    if (priceHistory.length === 0) {
      // If no price history found, try to get from receipts
      const receipts = await Receipt.find({
        userId,
        'items.name': { $regex: itemName, $options: 'i' }
      })
      .sort({ date: -1 })
      .limit(10);

      const pricesFromReceipts = receipts.flatMap(receipt => 
        receipt.items
          .filter(item => item.name.toLowerCase().includes(itemName.toLowerCase()))
          .map(item => ({
            itemName: item.name,
            price: item.price,
            merchant: receipt.merchant,
            category: item.category || receipt.category,
            date: receipt.date,
            currency: receipt.currency
          }))
      );

      return res.json({
        prices: pricesFromReceipts,
        stats: pricesFromReceipts.length > 0 ? calculatePriceStats(pricesFromReceipts) : null
      });
    }

    // Calculate price statistics
    const stats = calculatePriceStats(priceHistory);

    res.json({
      prices: priceHistory,
      stats
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({
      message: 'Failed to fetch price history',
      error: error.message
    });
  }
};

// Compare prices across merchants
exports.comparePrices = async (req, res) => {
  try {
    const { itemName, price, merchant, category } = req.body;
    const userId = req.user._id;
    
    if (!itemName || !price || !merchant || !category) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get current price history
    const currentPrices = await PriceHistory.find({
      userId,
      itemName: { $regex: itemName, $options: 'i' },
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).sort({ date: -1 });

    // Calculate price statistics
    const stats = calculatePriceStats(currentPrices);

    // Save new price entry
    const newPriceEntry = new PriceHistory({
      userId,
      itemName,
      price,
      merchant,
      category,
      priceTrend: calculatePriceTrend(price, stats),
      priceChangePercentage: calculatePriceChangePercentage(price, stats)
    });

    await newPriceEntry.save();

    res.json({
      message: 'Price comparison saved successfully',
      currentPrice: price,
      stats,
      isGoodDeal: price <= stats.averagePrice
    });
  } catch (error) {
    console.error('Error comparing prices:', error);
    res.status(500).json({
      message: 'Failed to compare prices',
      error: error.message
    });
  }
};

// Get price trends for a category
exports.getCategoryTrends = async (req, res) => {
  try {
    const { category } = req.query;
    const userId = req.user._id;

    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }

    const trends = await PriceHistory.find({
      userId,
      category: { $regex: category, $options: 'i' },
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
    .sort({ date: -1 });

    res.json({
      data: trends,
      stats: calculatePriceStats(trends)
    });
  } catch (error) {
    console.error('Error fetching category trends:', error);
    res.status(500).json({
      message: 'Failed to fetch category trends',
      error: error.message
    });
  }
};

// Get best prices for a category
exports.getBestPrices = async (req, res) => {
  try {
    const { category } = req.query;
    const userId = req.user._id;

    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }

    const bestPrices = await PriceHistory.aggregate([
      {
        $match: {
          userId,
          category: { $regex: category, $options: 'i' },
          date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$itemName',
          minPrice: { $min: '$price' },
          merchant: { $first: '$merchant' },
          date: { $first: '$date' }
        }
      },
      { $sort: { minPrice: 1 } }
    ]);

    res.json({
      data: bestPrices
    });
  } catch (error) {
    console.error('Error fetching best prices:', error);
    res.status(500).json({
      message: 'Failed to fetch best prices',
      error: error.message
    });
  }
};

// Helper function to calculate price statistics
function calculatePriceStats(prices) {
  if (prices.length === 0) return null;

  const pricesArray = prices.map(p => p.price);
  const averagePrice = pricesArray.reduce((a, b) => a + b, 0) / pricesArray.length;
  const minPrice = Math.min(...pricesArray);
  const maxPrice = Math.max(...pricesArray);

  return {
    averagePrice,
    minPrice,
    maxPrice,
    priceRange: maxPrice - minPrice,
    numberOfEntries: pricesArray.length
  };
}

// Helper function to calculate price trend
function calculatePriceTrend(currentPrice, stats) {
  if (!stats) return 'stable';
  
  const threshold = 0.05; // 5% threshold for trend determination
  const priceChange = (currentPrice - stats.averagePrice) / stats.averagePrice;
  
  if (priceChange > threshold) return 'up';
  if (priceChange < -threshold) return 'down';
  return 'stable';
}

// Helper function to calculate price change percentage
function calculatePriceChangePercentage(currentPrice, stats) {
  if (!stats) return 0;
  
  return ((currentPrice - stats.averagePrice) / stats.averagePrice * 100).toFixed(2);
} 