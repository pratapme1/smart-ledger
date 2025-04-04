// controllers/aiController.js
const axios = require('axios');
const Receipt = require('../models/Receipt'); // Direct import of the Receipt model

// OpenAI API configuration
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${OPENAI_API_KEY}`
};

// Generate insights from receipt data
exports.generateInsights = async (req, res) => {
  try {
    const { timeRange } = req.query;
    const userId = req.user.id;
    
    // Find receipts for this user within the specified time range
    let startDate = new Date();
    
    switch (timeRange) {
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarterly':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1); // Default to monthly
    }
    
    // Direct access to the Receipt model without req.app.get('models')
    const receipts = await Receipt.find({
      userId,
      $or: [
        { date: { $gte: startDate } },
        { uploadedAt: { $gte: startDate } }
      ]
    });
    
    if (receipts.length < 3) {
      return res.status(400).json({ 
        message: 'Need at least 3 receipts to generate meaningful insights'
      });
    }
    
    // Prepare receipt data for the AI model
    const simplifiedReceipts = receipts.map(receipt => ({
      id: receipt._id,
      date: receipt.date || receipt.uploadedAt,
      merchant: receipt.merchant,
      category: receipt.category,
      totalAmount: receipt.totalAmount,
      currency: receipt.currency,
      items: receipt.items
    }));
    
    // Call OpenAI API
    const prompt = {
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are a financial analysis assistant that provides actionable insights to help users save money. 
          Analyze the provided receipt data to:
          1. Identify spending patterns
          2. Highlight potential saving opportunities
          3. Detect recurring expenses
          4. Predict upcoming purchases
          5. Calculate overall financial statistics
          
          Provide actionable recommendations that are specific and concrete. 
          Format your response as a JSON object with the following structure:
          {
            "insights": [
              {
                "title": "Short insight title",
                "description": "Detailed description of what you observed",
                "recommendation": "Specific actionable advice",
                "priority": "high|medium|low (based on potential impact)",
                "icon": "Appropriate emoji for this insight",
                "category": "spending|savings|recurring|trend"
              }
            ],
            "upcomingPurchases": [
              {
                "item": "Item name",
                "estimatedAmount": numeric_amount,
                "suggestedDate": "YYYY-MM-DD",
                "source": "Brief explanation of prediction source"
              }
            ],
            "summaryStats": {
              "totalSpent": numeric_total,
              "avgTransaction": numeric_average,
              "topCategory": "Most frequent category",
              "savingsOpportunities": numeric_saving_potential,
              "spendingTrend": "increasing|decreasing|stable"
            }
          }`
        },
        {
          role: "user",
          content: `Here is my receipt data for the ${timeRange} time period. Please analyze it and provide insights to help me save money:\n\n${JSON.stringify(simplifiedReceipts)}`
        }
      ],
      temperature: 0.5,
      max_tokens: 2000
    };
    
    const response = await axios.post(`${OPENAI_API_URL}/chat/completions`, prompt, { headers });
    const aiResponse = response.data.choices[0].message.content;
    
    try {
      const parsedResponse = JSON.parse(aiResponse);
      res.json(parsedResponse);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      res.status(500).json({ message: "Invalid response format from AI service" });
    }
  } catch (error) {
    console.error("Error generating insights:", error);
    res.status(500).json({ message: "Error generating insights" });
  }
};

// Find best deals for frequently purchased items
exports.findDeals = async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' });
    }
    
    // Call OpenAI API to generate deal recommendations
    const prompt = {
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are a deal-finding assistant that helps users save money on their frequent purchases. 
          For the provided list of items, generate realistic deals from common retailers.
          Format your response as a JSON array with the following structure:
          [
            {
              "item": "Item name",
              "store": "Store name",
              "regularPrice": numeric_regular_price,
              "dealPrice": numeric_deal_price,
              "expiryDate": "MM/DD/YYYY",
              "link": "#" // Placeholder link
            }
          ]`
        },
        {
          role: "user",
          content: `Find the best current deals for these items I frequently purchase: ${JSON.stringify(items)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    };
    
    const response = await axios.post(`${OPENAI_API_URL}/chat/completions`, prompt, { headers });
    const aiResponse = response.data.choices[0].message.content;
    
    try {
      const parsedDeals = JSON.parse(aiResponse);
      res.json(parsedDeals);
    } catch (e) {
      console.error("Failed to parse AI response for deals:", e);
      res.status(500).json({ message: "Invalid deals response format from AI service" });
    }
  } catch (error) {
    console.error("Error finding deals:", error);
    res.status(500).json({ message: "Error finding deals" });
  }
};