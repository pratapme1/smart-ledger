const nodemailer = require('nodemailer');
const User = require('../models/User');
const WeeklyDigest = require('../models/WeeklyDigest');

// Create reusable transporter object using Google SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send weekly digest email to user
 */
async function sendWeeklyDigest(userId, digestId) {
  try {
    // Get user and digest data
    const [user, digest] = await Promise.all([
      User.findById(userId),
      WeeklyDigest.findById(digestId)
    ]);

    if (!user || !digest) {
      throw new Error('User or digest not found');
    }

    // Format dates
    const startDate = new Date(digest.weekStartDate).toLocaleDateString('en-IN');
    const endDate = new Date(digest.weekEndDate).toLocaleDateString('en-IN');

    // Create email content with safe array checks
    const htmlContent = `
      <h2>Your Weekly Financial Digest</h2>
      <p>Here's your spending summary for ${startDate} - ${endDate}</p>
      
      <h3>Total Spent: ₹${(digest.totalSpent || 0).toFixed(2)}</h3>
      
      ${Array.isArray(digest.topCategories) && digest.topCategories.length > 0 ? `
        <h3>Top Spending Categories</h3>
        <ul>
          ${digest.topCategories.map(cat => `
            <li>${cat.category}: ₹${(cat.amount || 0).toFixed(2)} (${cat.percentage || 0}%)</li>
          `).join('')}
        </ul>
      ` : ''}
      
      ${Array.isArray(digest.budgetAlerts) && digest.budgetAlerts.length > 0 ? `
        <h3>Budget Alerts</h3>
        <ul>
          ${digest.budgetAlerts.map(alert => `
            <li>${alert.category}: Overspent by ₹${(alert.overspent || 0).toFixed(2)}</li>
          `).join('')}
        </ul>
      ` : ''}
      
      ${Array.isArray(digest.recurringAlerts) && digest.recurringAlerts.length > 0 ? `
        <h3>Recurring Purchases</h3>
        <ul>
          ${digest.recurringAlerts.map(alert => `
            <li>${alert.item}${alert.suggestion ? `: ${alert.suggestion}` : ''}</li>
          `).join('')}
        </ul>
      ` : ''}
      
      ${digest.weeklyTip ? `
        <h3>Tip of the Week</h3>
        <p>${digest.weeklyTip}</p>
      ` : ''}
      
      <p style="margin-top: 20px; color: #666;">
        View more details in your Smart Ledger app.
      </p>
    `;

    // Send email
    await transporter.sendMail({
      from: `"Smart Ledger" <${process.env.EMAIL_USERNAME}>`,
      to: user.email,
      subject: 'Your Weekly Financial Digest',
      html: htmlContent
    });

    console.log(`Weekly digest email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending weekly digest email:', error);
    throw error;
  }
}

module.exports = {
  sendWeeklyDigest
}; 