// services/notificationService.js
const nodemailer = require('nodemailer');
const User = require('../models/User');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

class NotificationService {
  // Send budget threshold notification
  static async sendBudgetAlert(userId, category, percentUsed, spent, limit) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.error('User not found for budget alert:', userId);
        return;
      }

      // Format currency for better readability
      const formattedSpent = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(spent);

      const formattedLimit = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(limit);

      let message = '';
      if (percentUsed >= 100) {
        message = `🚨 Budget Alert: You have exceeded your ${category} budget!\n` +
                 `Spent: ${formattedSpent} / ${formattedLimit} (${percentUsed}%)`;
      } else if (percentUsed >= 80) {
        message = `⚠️ Budget Warning: You're approaching your ${category} budget limit!\n` +
                 `Spent: ${formattedSpent} / ${formattedLimit} (${percentUsed}%)`;
      }

      // Here you would integrate with your preferred notification system
      // For now, we'll just log to console
      console.log('Sending notification to user:', user.email);
      console.log('Notification message:', message);

      // TODO: Implement actual notification sending
      // Examples:
      // - Email notification using nodemailer
      // - Push notification using web push
      // - SMS using Twilio
      // - In-app notification stored in a notifications collection
    } catch (error) {
      console.error('Error sending budget alert:', error);
    }
  }

  // Send weekly budget summary
  static async sendWeeklySummary(userId, data) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.error('User not found for weekly summary:', userId);
        return;
      }

      const formattedTotal = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(data.totalSpent);

      let message = `📊 Weekly Budget Summary\n\n` +
                   `Total Spent: ${formattedTotal}\n\n` +
                   `Category Breakdown:\n`;

      data.budgetProgress.forEach(category => {
        const formattedSpent = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(category.spent);

        const statusEmoji = category.status === 'exceeded' ? '🔴' :
                          category.status === 'warning' ? '🟡' : '🟢';

        message += `${statusEmoji} ${category.category}: ${formattedSpent}`;
        if (category.monthlyLimit > 0) {
          message += ` (${category.percentUsed}% of budget)\n`;
        } else {
          message += ` (no budget set)\n`;
        }
      });

      // Here you would integrate with your preferred notification system
      console.log('Sending weekly summary to user:', user.email);
      console.log('Summary message:', message);

      // TODO: Implement actual notification sending
    } catch (error) {
      console.error('Error sending weekly summary:', error);
    }
  }
}

module.exports = NotificationService; 