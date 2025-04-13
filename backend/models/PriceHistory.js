const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PriceHistorySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemName: {
    type: String,
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true
  },
  merchant: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  currency: {
    type: String,
    default: 'INR'
  },
  priceTrend: {
    type: String,
    enum: ['up', 'down', 'stable'],
    default: 'stable'
  },
  priceChangePercentage: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Indexes for faster queries
PriceHistorySchema.index({ userId: 1, itemName: 1, date: -1 });
PriceHistorySchema.index({ userId: 1, category: 1, date: -1 });
PriceHistorySchema.index({ userId: 1, merchant: 1, date: -1 });

const PriceHistory = mongoose.model('PriceHistory', PriceHistorySchema);

module.exports = PriceHistory; 