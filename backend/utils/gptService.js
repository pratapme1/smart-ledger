// utils/gptService.js
const axios = require('axios');

// Categories list for classification
const VALID_CATEGORIES = [
  'groceries', 'dining', 'utilities', 'transportation', 'entertainment',
  'shopping', 'healthcare', 'education', 'travel', 'housing',
  'personal_care', 'gifts', 'other'
];

// Request counter to manage rate limits
let requestCount = 0;
const MAX_REQUESTS_PER_MINUTE = 100;
let lastResetTime = Date.now();

// Reset counter every minute
setInterval(() => {
  requestCount = 0;
  lastResetTime = Date.now();
}, 60000);

/**
 * Check if we can make a request or if we've hit rate limits
 */
function canMakeRequest() {
  // Reset counter if it's been more than a minute
  if (Date.now() - lastResetTime > 60000) {
    requestCount = 0;
    lastResetTime = Date.now();
  }
  
  return requestCount < MAX_REQUESTS_PER_MINUTE;
}

/**
 * Categorize an item using GPT
 */
async function categorizeItem(itemName) {
  if (!canMakeRequest()) {
    throw new Error('GPT rate limit exceeded');
  }
  
  try {
    // Use the existing extractTextWithGPT function from your receiptExtractor
    // Adapting it to categorize items
    requestCount++;
    
    // For now, we'll use a simple categorization logic
    // In a production system, you'd call your GPT API here
    const lowerCaseItem = itemName.toLowerCase();
    
    // Simple matching logic (could be replaced with GPT)
    if (lowerCaseItem.includes('grocery') || lowerCaseItem.includes('food')) {
      return 'groceries';
    } else if (lowerCaseItem.includes('restaurant') || lowerCaseItem.includes('cafe')) {
      return 'dining';
    } else {
      // Default
      return 'other';
    }
  } catch (error) {
    console.error('Error categorizing item with GPT:', error);
    throw error;
  }
}

/**
 * Generate insight for an item
 */
async function generateItemInsight({itemName, price, category, marketPrice, isRecurring}) {
  if (!canMakeRequest()) {
    throw new Error('GPT rate limit exceeded');
  }
  
  try {
    requestCount++;
    
    // Generate a meaningful insight (replace with actual GPT call)
    let insight = `${itemName} in category ${category}.`;
    
    if (marketPrice && marketPrice < price) {
      insight += ` You might find this cheaper elsewhere for around $${marketPrice.toFixed(2)}.`;
    }
    
    if (isRecurring) {
      insight += ` This appears to be a recurring purchase, consider looking for subscription options.`;
    }
    
    return insight;
  } catch (error) {
    console.error('Error generating item insight with GPT:', error);
    throw error;
  }
}

/**
 * Generate a personalized weekly tip based on spending patterns
 */
async function generateWeeklyTip(topCategories, totalSpent, recurringAlerts) {
  try {
    // Prepare the prompt
    const prompt = `Based on the following spending patterns, generate a personalized financial tip:
    
    Top Spending Categories:
    ${topCategories.map(cat => `- ${cat.category}: $${cat.amount} (${cat.percentage}%)`).join('\n')}
    
    Total Spent: $${totalSpent}
    
    Recurring Purchases:
    ${recurringAlerts.map(alert => `- ${alert.item}: ${alert.suggestion}`).join('\n')}
    
    Please provide a concise, actionable tip that helps improve their financial habits.`;

    // Call OpenAI API
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a financial advisor providing personalized spending tips.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating weekly tip with GPT:', error);
    throw error;
  }
}

module.exports = {
  categorizeItem,
  generateItemInsight,
  generateWeeklyTip,
  canMakeRequest
};