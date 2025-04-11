// models/Receipt.js
const mongoose = require('mongoose');

const ReceiptSchema = new mongoose.Schema({
  fileName: String,
  merchant: String,
  date: Date,
  category: String,
  items: [{ 
    name: String, 
    price: Number,
    quantity: { type: Number, default: 1 },
    category: String, // For Smart Categorization
    gptInsight: String, // For real-time insights
    isRecurring: { type: Boolean, default: false }, // For recurring detection
    marketPrice: Number, // For price comparison
    savings: Number // Potential savings
  }],
  
  hasProcessedInsights: { type: Boolean, default: false },
  insightProcessingStatus: {
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'  },
  taxAmount: Number,
  subtotalAmount: Number,
  totalAmount: Number,
  paymentMethod: String,
  currency: { type: String, default: 'USD' },
  currencyEvidence: String,
  currencyConfidence: { type: Number, default: 0 },
  notes: String,
  uploadedAt: { type: Date, default: Date.now },
  isManualEntry: { type: Boolean, default: false },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model("Receipt", ReceiptSchema);