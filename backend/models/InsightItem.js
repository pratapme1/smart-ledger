// models/InsightItem.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InsightItemSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  itemName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  detectedPrice: {
    type: Number,
    required: true
  },
  matchedMarketPrice: {
    type: Number,
    default: null
  },
  receiptId: {
    type: Schema.Types.ObjectId,
    ref: 'Receipt',
    required: true
  },
  dateDetected: {
    type: Date,
    default: Date.now
  },
  savings: {
    type: Number,
    default: 0
  },
  insightText: {
    type: String,
    default: null
  },
  insightType: {
    type: String,
    enum: ['price_comparison', 'recurring', 'budget_alert', 'category_suggestion', 'general'],
    default: 'general'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  isTracked: {
    type: Boolean,
    default: false
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingAttempts: {
    type: Number,
    default: 0
  },
  isIncludedInDigest: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('InsightItem', InsightItemSchema);