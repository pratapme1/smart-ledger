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
    quantity: { type: Number, default: 1 }
  }],
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