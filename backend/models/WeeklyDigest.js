// models/WeeklyDigest.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const missedSavingsSchema = new Schema({
  item: String,
  paid: Number,
  couldHavePaid: Number,
  saved: Number,
  receiptId: {
    type: Schema.Types.ObjectId,
    ref: 'Receipt'
  }
});

const WeeklyDigestSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  weekStartDate: {
    type: Date,
    required: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  topCategories: [{
    category: String,
    amount: Number,
    percentage: Number
  }],
  overspentCategories: [{
    category: String,
    budgeted: Number,
    spent: Number,
    overspentBy: Number
  }],
  missedSavings: [missedSavingsSchema],
  recurringAlerts: [{
    item: String,
    frequency: Number,
    suggestion: String
  }],
  weeklyTip: {
    type: String,
    default: null
  },
  isSent: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('WeeklyDigest', WeeklyDigestSchema);