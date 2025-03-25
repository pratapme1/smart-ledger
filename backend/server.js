// @ts-nocheck
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize express app first
const app = express();
const PORT = process.env.PORT || 5000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

console.log("✅ MongoDB Package Loaded Successfully");

app.use(cors());  // ✅ Enable CORS globally for all requests
app.use(express.json()); // ✅ Allow JSON parsing

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("✅ Uploads directory created");
}

// ✅ Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  dbName: 'smart-ledger',  // Explicitly set the database name
  useNewUrlParser: true,   // Add recommended options
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Atlas Connected to 'smart-ledger' database"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define MongoDB Schema & Model with enhanced fields
const ReceiptSchema = new mongoose.Schema({
    fileName: String,                         // Original filename
    merchant: String,                         // Store or merchant name
    date: Date,                               // Purchase date
    category: String,                         // Receipt category (auto-detected)
    items: [{ 
      name: String, 
      price: Number,
      quantity: { type: Number, default: 1 }  // Item quantity
    }],
    taxAmount: Number,
    subtotalAmount: Number,                   // Amount before tax
    totalAmount: Number,
    paymentMethod: String,                    // Credit card, cash, etc.
    currency: { type: String, default: 'USD' },
    currencyEvidence: String,                 // What evidence led to currency determination
    currencyConfidence: { type: Number, default: 0 }, // Confidence level (0-1)
    notes: String,                            // Any additional information
    uploadedAt: { type: Date, default: Date.now },
    isManualEntry: { type: Boolean, default: false } // Added to differentiate manual entries
});
const Receipt = mongoose.model("Receipt", ReceiptSchema);

// ✅ Configure Multer for File Uploads with file validation
const fileFilter = (req, file, cb) => {
  // Accept images and PDFs only
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Please upload images or PDF files only.'), false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Create unique filename with original name
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});
// ✅ Enhanced Helper Function: GPT-4 Vision Processing with improved prompt
async function extractTextWithGPT(imagePath, fileName) {
    try {
      console.log(`🔍 Processing image: ${imagePath}`);
  
      // Convert image to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
  
      // Extract potential date from filename for context
      const possibleDateMatch = fileName.match(/\d{2}[-_]?\d{2}[-_]?\d{2,4}/);
      let dateHint = '';
      if (possibleDateMatch) {
        dateHint = `The receipt might be from around this date: ${possibleDateMatch[0]}. `;
      }
  
      // Enhanced system prompt with stronger focus on currency detection
      const enhancedSystemPrompt = `You are an AI assistant specialized in extracting accurate purchase details from receipts.
                      
      KEY INSTRUCTIONS:
      - Extract ALL information visible on the receipt including merchant name, date, and payment method.
      - ACCURATELY extract each line item, including exact product names and prices.
      - For each item, identify quantities when present.
      - Look carefully for subtotal, tax, and total amounts - these are critical.
      
      CURRENCY DETECTION (EXTREMELY IMPORTANT):
      - Your TOP PRIORITY is to identify the correct currency from the receipt.
      - FIRST, look for explicit currency symbols ($, €, £, ¥, ₹, ₩, ฿, etc.) that appear beside prices.
      - SECOND, check for explicit currency codes (USD, EUR, GBP, etc.) written anywhere on the receipt.
      - THIRD, examine the receipt header, footer, and merchant name for country/location indicators.
      - FOURTH, analyze price formatting (e.g., 1,234.56 vs 1.234,56) to infer the currency.
      - Common currency pairs: $ (USD, CAD, AUD), € (EUR), £ (GBP), ¥ (JPY, CNY), ₹ (INR), ₩ (KRW)
      - DEFAULT to "USD" ONLY if you've exhausted all other detection methods.
      - Report specifically which evidence on the receipt led you to your currency determination.
      - Include DETAILED NOTES about what currency evidence you found on the receipt.
      
      CATEGORY DETECTION:
      - Infer receipt category: groceries, dining, retail, entertainment, travel, utilities, healthcare, etc.
      - Use merchant name, items purchased, and overall context to determine the category.
      
      OTHER INSTRUCTIONS:
      - Parse date in YYYY-MM-DD format regardless of how it appears on the receipt.
      - Convert all prices to numerical values only (without currency symbols).
      - Remove any thousand separators and correctly interpret decimal points/commas.
      - If items have descriptions or notes, capture those details.
      
      **Always return JSON only, with no extra text**.
      Required format:
      {
        "merchant": "string", 
        "date": "YYYY-MM-DD",
        "category": "string", 
        "items": [
          { "name": "string", "price": number, "quantity": number }
        ],
        "subtotalAmount": number,
        "taxAmount": number,
        "totalAmount": number,
        "paymentMethod": "string",
        "currency": "string",
        "currencyEvidence": "string",
        "notes": "string"
      }
      
      If you cannot extract a value, set it to null or 0.
      **No explanations, no additional text, only JSON.**`;
  
      const response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
          {
            role: "system",
            content: enhancedSystemPrompt
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `Extract the complete receipt details from this image and return only JSON. ${dateHint}Pay special attention to correctly identifying the currency, all items, prices, and the total amount.` 
              },
              { 
                type: "image_url", 
                image_url: { url: `data:image/jpeg;base64,${base64Image}` } 
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1000
      });
  
      console.log("✅ GPT-4 Vision API Response Received");
  
      // Parse GPT-4's response as JSON
      const parsedResponse = JSON.parse(response.choices[0].message.content);
      
      // Apply enhanced currency detection
      const currencyResult = enhancedCurrencyDetection(parsedResponse);
      
      // Post-process the JSON to ensure all fields exist and have proper types
      const processedResponse = {
        merchant: parsedResponse.merchant || null,
        date: parsedResponse.date ? new Date(parsedResponse.date) : null,
        category: parsedResponse.category || null,
        items: Array.isArray(parsedResponse.items) ? parsedResponse.items.map(item => ({
          name: item.name || 'Unknown Item',
          price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(',', '.')) || 0,
          quantity: item.quantity || 1
        })) : [],
        subtotalAmount: parsedResponse.subtotalAmount || (parsedResponse.totalAmount - parsedResponse.taxAmount) || 0,
        taxAmount: parsedResponse.taxAmount || 0,
        totalAmount: parsedResponse.totalAmount || 0,
        paymentMethod: parsedResponse.paymentMethod || null,
        currency: currencyResult.currency,
        currencyEvidence: currencyResult.evidence,
        currencyConfidence: currencyResult.confidence,
        notes: parsedResponse.notes || null
      };
  
      return processedResponse;
    } catch (error) {
      console.error("❌ Error processing GPT-4 Vision:", error);
      throw error;
    }
  }
  // Enhanced currency detection function
function enhancedCurrencyDetection(parsedResponse) {
    // Start with the currency detected by GPT
    let currency = parsedResponse.currency || null;
    let currencyEvidence = parsedResponse.currencyEvidence || null;
    
    // If we have explicit evidence from GPT, trust it
    if (currency && currencyEvidence) {
      console.log(`✅ GPT detected currency ${currency} with evidence: ${currencyEvidence}`);
      // Just perform standardization
      currency = standardizeCurrencyCode(currency);
      return { 
        currency, 
        evidence: currencyEvidence, 
        confidence: 0.9 // High confidence when we have explicit evidence
      };
    }
    
    // If we have a currency but no evidence
    if (currency) {
      console.log(`ℹ️ GPT detected currency ${currency} without explicit evidence`);
      // Standardize and move on
      currency = standardizeCurrencyCode(currency);
      return { 
        currency, 
        evidence: "Detected by GPT without explicit evidence", 
        confidence: 0.75 
      };
    }
    
    // No currency detected, let's try to infer from other receipt data
    console.log(`⚠️ No currency detected directly, attempting to infer...`);
    
    // 1. Try to infer from price formatting in items
    const formatResult = inferFromPriceFormat(parsedResponse.items, parsedResponse.totalAmount);
    
    // 2. Try to infer from merchant or location
    const merchantResult = inferFromMerchant(parsedResponse.merchant, parsedResponse.notes);
    
    // If one method has high confidence, use it
    if (formatResult.confidence > 0.7) {
      return { 
        currency: formatResult.currency, 
        evidence: `Inferred from price formatting: ${formatResult.evidence}`,
        confidence: formatResult.confidence
      };
    }
    
    if (merchantResult.confidence > 0.7) {
      return { 
        currency: merchantResult.currency, 
        evidence: `Inferred from merchant/location: ${merchantResult.evidence}`,
        confidence: merchantResult.confidence
      };
    }
    
    // Combine evidence from both methods if they agree
    if (formatResult.currency === merchantResult.currency) {
      const combinedConfidence = Math.min(0.8, (formatResult.confidence + merchantResult.confidence) / 1.5);
      return { 
        currency: formatResult.currency, 
        evidence: `Multiple indicators suggest ${formatResult.currency}: ${formatResult.evidence} and ${merchantResult.evidence}`,
        confidence: combinedConfidence
      };
    }
    
    // Use the method with higher confidence
    if (formatResult.confidence > merchantResult.confidence) {
      return { 
        currency: formatResult.currency, 
        evidence: formatResult.evidence,
        confidence: formatResult.confidence
      };
    } else {
      return { 
        currency: merchantResult.currency, 
        evidence: merchantResult.evidence,
        confidence: merchantResult.confidence
      };
    }
  }
  
  // Helper function to standardize currency codes
  function standardizeCurrencyCode(rawCurrency) {
    // Clean input - remove spaces, symbols, make uppercase
    let cleaned = typeof rawCurrency === 'string' 
      ? rawCurrency.trim().replace(/[^A-Za-z$€£¥₹₽₩฿₫₴₸₺₼₾]/g, '').toUpperCase()
      : '';
      
    // If empty after cleaning, default to USD
    if (!cleaned) return "USD";
    
    // Common currency symbols and variations
    const currencyMap = {
      // Dollar currencies
      '$': 'USD',
      'USD': 'USD',
      'DOLLAR': 'USD',
      'DOLLARS': 'USD',
      'US': 'USD',
      'USDOLLAR': 'USD',
      'USDOLLARS': 'USD',
      
      // Canadian dollar
      'CAD': 'CAD',
      'CANADIANDOLLAR': 'CAD',
      'CANADIANDOLLARS': 'CAD',
      
      // Australian dollar  
      'AUD': 'AUD',
      'AUSTRALIANDOLLAR': 'AUD',
      'AUSTRALIANDOLLARS': 'AUD',
      
      // Euro
      '€': 'EUR',
      'EUR': 'EUR',
      'EURO': 'EUR',
      'EUROS': 'EUR',
      
      // British Pound
      '£': 'GBP',
      'GBP': 'GBP',
      'POUND': 'GBP',
      'POUNDS': 'GBP',
      'POUNDSTERLING': 'GBP',
      
      // Japanese Yen
      '¥': 'JPY',
      'JPY': 'JPY',
      'YEN': 'JPY',
      
      // Chinese Yuan
      'CNY': 'CNY',
      'YUAN': 'CNY',
      'RMB': 'CNY',
      
      // Indian Rupee
      '₹': 'INR',
      'INR': 'INR',
      'RUPEE': 'INR',
      'RUPEES': 'INR',
      
      // South Korean Won
      '₩': 'KRW',
      'KRW': 'KRW',
      'WON': 'KRW',
      
      // Swiss Franc
      'CHF': 'CHF',
      'FRANC': 'CHF',
      'FRANCS': 'CHF',
      
      // Brazilian Real
      'BRL': 'BRL',
      'REAL': 'BRL',
      'REAIS': 'BRL',
      'R$': 'BRL',
      
      // Mexican Peso
      'MXN': 'MXN',
      'PESO': 'MXN',
      'PESOS': 'MXN',
      
      // Singapore Dollar
      'SGD': 'SGD',
      
      // Thai Baht
      '฿': 'THB',
      'THB': 'THB',
      'BAHT': 'THB',
      
      // Russian Ruble
      '₽': 'RUB',
      'RUB': 'RUB',
      'RUBLE': 'RUB',
      'RUBLES': 'RUB'
    };
    
    // Check for direct match
    if (currencyMap[cleaned]) {
      return currencyMap[cleaned];
    }
    
    // Check for common symbols embedded in the text
    if (cleaned.includes('$')) return 'USD';
    if (cleaned.includes('€')) return 'EUR';
    if (cleaned.includes('£')) return 'GBP';
    if (cleaned.includes('¥')) return 'JPY';
    if (cleaned.includes('₹')) return 'INR';
    if (cleaned.includes('₩')) return 'KRW';
    if (cleaned.includes('฿')) return 'THB';
    if (cleaned.includes('₽')) return 'RUB';
    
    // If it's a 3-letter code already, return as is if it appears legitimate
    if (cleaned.length === 3 && /^[A-Z]{3}$/.test(cleaned)) {
      // List of known 3-letter currency codes
      const validCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'KRW', 
                        'BRL', 'MXN', 'SGD', 'THB', 'RUB', 'ZAR', 'HKD', 'SEK', 'NOK', 'DKK', 
                        'PLN', 'TRY', 'NZD', 'AED', 'SAR', 'ILS'];
      if (validCodes.includes(cleaned)) {
        return cleaned;
      }
    }
    
    // If we still can't determine the currency, default to USD
    return 'USD';
  }
  
  // Function to infer currency from price formatting
  function inferFromPriceFormat(items, totalAmount) {
    // Default result
    const result = { 
      currency: 'USD', 
      confidence: 0, 
      evidence: '' 
    };
    
    // If we don't have items, check if we can infer from total amount
    if (!Array.isArray(items) || items.length === 0) {
      if (!totalAmount) return result;
      
      // Check if totalAmount is a very large number without decimals
      if (totalAmount > 1000 && !String(totalAmount).includes('.')) {
        result.currency = 'JPY';
        result.confidence = 0.7;
        result.evidence = `Total amount ${totalAmount} appears to be in a currency without decimals`;
        return result;
      }
      
      return result;
    }
    
    // Count different price patterns
    let commaDecimals = 0;
    let periodDecimals = 0;
    let noDecimals = 0;
    let highPrices = 0;
    let lowPrices = 0;
    
    const priceStrings = items.map(item => 
      typeof item.price === 'string' ? item.price : String(item.price)
    );
    
    for (const price of priceStrings) {
      // Check for comma as decimal separator (European style)
      if (/\d+,\d{2}$/.test(price)) commaDecimals++;
      
      // Check for period as decimal separator (US/UK style)
      if (/\d+\.\d{2}$/.test(price)) periodDecimals++;
      
      // Check for no decimal separator (Yen, Won, etc.)
      if (/^\d+$/.test(price) && price.length > 2) noDecimals++;
      
      // Check for high values (indicative of currencies like JPY, KRW)
      const numericValue = parseFloat(price.replace(',', '.'));
      if (numericValue > 500) highPrices++;
      if (numericValue < 10) lowPrices++;
    }
    
    // Decision making based on patterns
    
    // Strong indicator: Europe/parts of South America use comma as decimal
    if (commaDecimals > periodDecimals && commaDecimals > 0) {
      result.currency = 'EUR'; // Default to EUR, but could be others
      result.confidence = 0.8;
      result.evidence = `${commaDecimals} prices use comma as decimal separator (e.g., European format)`;
      return result;
    }
    
    // Strong indicator: US/UK/Canada use period as decimal
    if (periodDecimals > commaDecimals && periodDecimals > 0) {
      result.currency = 'USD'; // Default to USD, but could be others
      result.confidence = 0.7;
      result.evidence = `${periodDecimals} prices use period as decimal separator (e.g., US/UK format)`;
      return result;
    }
    
    // Strong indicator: currencies without decimals (JPY, KRW)
    if (noDecimals > 3 || (noDecimals > 0 && items.length === noDecimals)) {
      result.currency = 'JPY'; // Default to JPY, could also be KRW
      result.confidence = 0.8;
      result.evidence = `${noDecimals} prices appear to have no decimal places`;
      return result;
    }
    
    // If most prices are very high, likely JPY/KRW
    if (highPrices > items.length / 2 && highPrices > 2) {
      result.currency = 'JPY';
      result.confidence = 0.7;
      result.evidence = `${highPrices} prices have relatively high numeric values`;
      return result;
    }
    
    // If most prices are very low with decimals, could be EUR/GBP/etc.
    if (lowPrices > items.length / 2 && (periodDecimals > 0 || commaDecimals > 0)) {
      // More likely to be EUR/GBP than USD due to higher value
      result.currency = periodDecimals > commaDecimals ? 'GBP' : 'EUR';
      result.confidence = 0.5;
      result.evidence = `Most prices are low values with decimal places`;
      return result;
    }
    
    // Not enough evidence from price formatting
    result.confidence = 0.3;
    result.evidence = 'Inconclusive price formatting patterns';
    return result;
  }
  
  // Function to infer currency from merchant name and location
  function inferFromMerchant(merchant, notes) {
    const result = { 
      currency: 'USD', 
      confidence: 0, 
      evidence: '' 
    };
    
    if (!merchant && !notes) return result;
    
    // Combine merchant and notes for analysis
    const textToAnalyze = `${merchant || ''} ${notes || ''}`.toLowerCase();
    
    // Country and city indicators with associated currencies
    const locationIndicators = [
      { patterns: ['usa', 'united states', 'america', 'us ', 'new york', 'california', 'texas', 'chicago', 'los angeles', 'san francisco', 'las vegas', 'miami', 'washington'], currency: 'USD', confidence: 0.8 },
      { patterns: ['canada', 'toronto', 'montreal', 'vancouver', 'calgary', 'ottawa'], currency: 'CAD', confidence: 0.8 },
      { patterns: ['uk', 'united kingdom', 'britain', 'england', 'london', 'manchester', 'liverpool', 'glasgow', 'edinburgh'], currency: 'GBP', confidence: 0.8 },
      { patterns: ['japan', 'tokyo', 'osaka', 'kyoto', 'yokohama', 'sapporo'], currency: 'JPY', confidence: 0.8 },
      { patterns: ['china', 'beijing', 'shanghai', 'shenzhen', 'guangzhou'], currency: 'CNY', confidence: 0.8 },
      { patterns: ['euro', 'germany', 'france', 'italy', 'spain', 'berlin', 'paris', 'rome', 'madrid', 'amsterdam', 'brussels'], currency: 'EUR', confidence: 0.8 },
      { patterns: ['india', 'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai'], currency: 'INR', confidence: 0.8 },
      { patterns: ['korea', 'south korea', 'seoul', 'busan'], currency: 'KRW', confidence: 0.8 },
      { patterns: ['australia', 'sydney', 'melbourne', 'brisbane', 'perth'], currency: 'AUD', confidence: 0.8 },
      { patterns: ['brazil', 'rio', 'são paulo', 'brasilia'], currency: 'BRL', confidence: 0.8 },
      { patterns: ['mexico', 'mexico city', 'cancun', 'guadalajara'], currency: 'MXN', confidence: 0.7 },
      { patterns: ['thailand', 'bangkok', 'phuket', 'chiang mai'], currency: 'THB', confidence: 0.7 },
      { patterns: ['singapore'], currency: 'SGD', confidence: 0.8 },
      { patterns: ['hong kong'], currency: 'HKD', confidence: 0.8 },
      { patterns: ['switzerland', 'zurich', 'geneva'], currency: 'CHF', confidence: 0.8 },
      { patterns: ['russia', 'moscow', 'st petersburg'], currency: 'RUB', confidence: 0.7 }
    ];
    
    // Check for direct currency mentions in text
    const currencyMentions = [
      { patterns: ['usd', 'us dollar', 'us $', 'u.s. dollar'], currency: 'USD', confidence: 0.9 },
      { patterns: ['eur', 'euro', '€'], currency: 'EUR', confidence: 0.9 },
      { patterns: ['gbp', 'pound sterling', 'british pound', '£'], currency: 'GBP', confidence: 0.9 },
      { patterns: ['jpy', 'yen', '¥'], currency: 'JPY', confidence: 0.9 },
      { patterns: ['cny', 'rmb', 'yuan', 'chinese yuan'], currency: 'CNY', confidence: 0.9 },
      { patterns: ['cad', 'canadian dollar', 'can$'], currency: 'CAD', confidence: 0.9 },
      { patterns: ['aud', 'australian dollar', 'a$'], currency: 'AUD', confidence: 0.9 },
      { patterns: ['inr', 'rupee', '₹'], currency: 'INR', confidence: 0.9 },
      { patterns: ['krw', 'won', '₩'], currency: 'KRW', confidence: 0.9 }
    ];
    
    // First check for explicit currency mentions
    for (const { patterns, currency, confidence } of currencyMentions) {
      for (const pattern of patterns) {
        if (textToAnalyze.includes(pattern)) {
          result.currency = currency;
          result.confidence = confidence;
          result.evidence = `Text contains explicit currency reference: '${pattern}'`;
          return result;
        }
      }
    }
    
    // Then check for location indicators
    for (const { patterns, currency, confidence } of locationIndicators) {
      for (const pattern of patterns) {
        // Use word boundary checks to avoid partial matches
        const regex = new RegExp(`\\b${pattern}\\b`, 'i');
        if (regex.test(textToAnalyze)) {
          result.currency = currency;
          result.confidence = confidence;
          result.evidence = `Text contains location reference: '${pattern}'`;
          return result;
        }
      }
    }
    
    // Check for specific chain stores and their typical locations
    const merchantChains = [
      { patterns: ['walmart', 'target', 'costco', 'kroger', 'walgreens', 'cvs', 'home depot', 'lowe\'s', 'best buy', 'macy\'s', 'dollar ', 'tj maxx', 'marshalls', 'staples', 'office depot'], currency: 'USD', confidence: 0.75 },
      { patterns: ['tesco', 'sainsbury', 'asda', 'boots', 'marks & spencer', 'waitrose', 'co-op', 'greggs', 'primark'], currency: 'GBP', confidence: 0.75 },
      { patterns: ['carrefour', 'auchan', 'lidl', 'aldi', 'mediamarkt', 'monoprix', 'fnac', 'leclerc'], currency: 'EUR', confidence: 0.7 },
      { patterns: ['lawson', 'family mart', 'seven eleven japan', '7-eleven japan', 'uniqlo', 'daiso', 'don quijote'], currency: 'JPY', confidence: 0.75 },
      { patterns: ['loblaws', 'shoppers drug mart', 'canadian tire', 'tim hortons', 'dollarama'], currency: 'CAD', confidence: 0.75 }
    ];
    
    // Check for major chain stores
    for (const { patterns, currency, confidence } of merchantChains) {
      for (const pattern of patterns) {
        if (textToAnalyze.includes(pattern)) {
          result.currency = currency;
          result.confidence = confidence;
          result.evidence = `Merchant appears to be a chain store typically found in ${currency} regions: '${pattern}'`;
          return result;
        }
      }
    }
    
    // No strong indicators found
    result.confidence = 0.2;
    result.evidence = 'No clear location or merchant indicators found';
    return result;
  }
  // NOW define routes after all helper functions are defined

// ✅ Simple health check endpoint
app.get('/', (req, res) => {
    res.json({ 
      status: "🟢 Server is running", 
      version: "1.4.0",
      endpoints: [
        { path: "/upload-receipt", method: "POST", description: "Upload single receipt" },
        { path: "/upload-multiple-receipts", method: "POST", description: "Upload multiple receipts" },
        { path: "/get-receipts", method: "GET", description: "Get all receipts with optional filters" },
        { path: "/get-receipt/:id", method: "GET", description: "Get a specific receipt by ID" },
        { path: "/update-receipt/:id", method: "PATCH", description: "Update receipt fields (category, merchant, etc.)" },
        { path: "/update-receipt-currency/:id", method: "PATCH", description: "Update receipt currency specifically" },
        { path: "/delete-receipt/:id", method: "DELETE", description: "Delete a specific receipt by ID" },
        { path: "/delete-all-receipts", method: "DELETE", description: "Delete all receipts (requires ?confirm=true)" },
        { path: "/receipt-analytics", method: "GET", description: "Get spending analytics" },
        { path: "/currency-stats", method: "GET", description: "Get statistics about currency distribution" },
        { path: "/add-manual-receipt", method: "POST", description: "Add a manually entered receipt" }
      ],
      currencySupport: {
        note: "The server now has enhanced currency detection capabilities",
        supportedCurrencies: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "KRW", "BRL", "MXN", "SGD", "THB", "RUB"],
        manualOverride: "Use /update-receipt-currency/:id to manually correct currency if needed"
      }
    });
  });
  // ✅ Endpoint: Upload Single Image
app.post('/upload-receipt', upload.single('file'), async (req, res) => {
    console.log("📂 Received File:", req.file);
  
    if (!req.file) {
      return res.status(400).json({ message: "❌ No file uploaded." });
    }
  
    const imagePath = req.file.path;
    const originalFileName = req.file.originalname;
  
    try {
      // Allow manually passing currency and category if desired
      const userCurrency = req.body.currency || null;
      const userCategory = req.body.category || null;
      
      const parsedReceipt = await extractTextWithGPT(imagePath, originalFileName);
  
      // Add filename to the receipt data
      parsedReceipt.fileName = originalFileName;
      
      // Override with user-provided values if available
      if (userCurrency) {
        parsedReceipt.currency = userCurrency;
        parsedReceipt.currencyEvidence = "Manually specified during upload";
        parsedReceipt.currencyConfidence = 1.0;
      }
      if (userCategory) parsedReceipt.category = userCategory;
  
      // ✅ Save to MongoDB
      const newReceipt = new Receipt(parsedReceipt);
      await newReceipt.save();
  
      // Add currency confidence information to the response
      res.json({ 
        message: "✅ Receipt processed and saved!", 
        parsedData: parsedReceipt,
        currencyInfo: {
          detected: parsedReceipt.currency,
          confidence: parsedReceipt.currencyConfidence,
          evidence: parsedReceipt.currencyEvidence,
          needsReview: parsedReceipt.currencyConfidence < 0.7
        },
        receiptId: newReceipt._id
      });
    } catch (error) {
      res.status(500).json({ message: "❌ Error processing receipt.", error: error.message });
    }
  });
  
  // ✅ Endpoint: Upload Multiple Images
  app.post('/upload-multiple-receipts', upload.array('files', 10), async (req, res) => {
    console.log("📂 Received Files:", req.files?.length || 0);
  
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "❌ No files uploaded." });
    }
  
    try {
      const results = [];
      const errors = [];
      const lowConfidenceCurrencies = [];
  
      // Process each file sequentially to avoid overloading the API
      for (const file of req.files) {
        try {
          const imagePath = file.path;
          const originalFileName = file.originalname;
          
          console.log(`📄 Processing file: ${originalFileName}`);
          
          const parsedReceipt = await extractTextWithGPT(imagePath, originalFileName);
          
          // Add filename to the receipt data
          parsedReceipt.fileName = originalFileName;
          
          // Save to MongoDB
          const newReceipt = new Receipt(parsedReceipt);
          const savedReceipt = await newReceipt.save();
          
          // Track low confidence currency detections
          if (parsedReceipt.currencyConfidence < 0.7) {
            lowConfidenceCurrencies.push({
              receiptId: savedReceipt._id,
              fileName: originalFileName,
              detectedCurrency: parsedReceipt.currency,
              confidence: parsedReceipt.currencyConfidence,
              evidence: parsedReceipt.currencyEvidence
            });
          }
          
          results.push({
            fileName: originalFileName,
            id: savedReceipt._id,
            success: true,
            data: parsedReceipt,
            currencyInfo: {
              detected: parsedReceipt.currency,
              confidence: parsedReceipt.currencyConfidence,
              needsReview: parsedReceipt.currencyConfidence < 0.7
            }
          });
        } catch (fileError) {
          console.error(`❌ Error processing file ${file.originalname}:`, fileError);
          errors.push({
            fileName: file.originalname,
            error: fileError.message,
            success: false
          });
        }
      }
  
      res.json({
        message: `✅ Processed ${results.length} receipts with ${errors.length} errors.`,
        successful: results,
        failed: errors,
        currencyReviewNeeded: lowConfidenceCurrencies.length > 0 ? lowConfidenceCurrencies : null
      });
    } catch (error) {
      res.status(500).json({ message: "❌ Error processing receipts.", error: error.message });
    }
  });
  
  // ✅ Endpoint: Get All Stored Receipts with filters - UPDATED version that includes type filter
  app.get('/get-receipts', async (req, res) => {
    try {
      const { category, startDate, endDate, merchant, minAmount, maxAmount, sortBy, limit, currency, type } = req.query;
      
      // Build filter object
      const filter = {};
      
      if (category) filter.category = category;
      if (merchant) filter.merchant = { $regex: merchant, $options: 'i' }; // Case-insensitive search
      if (currency) filter.currency = currency.toUpperCase();
      
      // Add isManualEntry filter based on type parameter
      if (type === 'scan') {
        filter.isManualEntry = { $ne: true };
      } else if (type === 'manual') {
        filter.isManualEntry = true;
      }
      
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }
      
      if (minAmount || maxAmount) {
        filter.totalAmount = {};
        if (minAmount) filter.totalAmount.$gte = parseFloat(minAmount);
        if (maxAmount) filter.totalAmount.$lte = parseFloat(maxAmount);
      }
      
      // Build sort object
      let sort = { uploadedAt: -1 }; // Default sort
      if (sortBy) {
        const [field, order] = sortBy.split(':');
        sort = { [field]: order === 'asc' ? 1 : -1 };
      }
      
      // Execute query
      let query = Receipt.find(filter).sort(sort);
      
      // Apply limit if provided
      if (limit) query = query.limit(parseInt(limit));
      
      const receipts = await query;
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ message: "❌ Error fetching receipts.", error: error.message });
    }
  });
  
  // ✅ Endpoint: Get Receipt by ID
  app.get('/get-receipt/:id', async (req, res) => {
    try {
      const receipt = await Receipt.findById(req.params.id);
      
      if (!receipt) {
        return res.status(404).json({ message: "❌ Receipt not found." });
      }
      
      res.json(receipt);
    } catch (error) {
      res.status(500).json({ message: "❌ Error fetching receipt.", error: error.message });
    }
  });
  
  // ✅ NEW Endpoint: Update Receipt Currency or Category
  app.patch('/update-receipt-currency/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { currency } = req.body;
      
      if (!currency) {
        return res.status(400).json({ message: "❌ Currency is required for this update." });
      }
      
      // Validate the currency code
      const validCurrencyCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'KRW', 
                               'BRL', 'MXN', 'SGD', 'THB', 'RUB', 'ZAR', 'HKD', 'SEK', 'NOK', 'DKK', 
                               'PLN', 'TRY', 'NZD', 'AED', 'SAR', 'ILS'];
      
      if (!validCurrencyCodes.includes(currency.toUpperCase())) {
        return res.status(400).json({ 
          message: "❌ Invalid currency code. Please use a standard 3-letter currency code.",
          validCodes: validCurrencyCodes
        });
      }
      
      // Find the receipt
      const receipt = await Receipt.findById(id);
      if (!receipt) {
        return res.status(404).json({ message: "❌ Receipt not found." });
      }
      
      // Update currency
      const updatedReceipt = await Receipt.findByIdAndUpdate(
        id, 
        { 
          $set: { 
            currency: currency.toUpperCase(),
            currencyEvidence: "Manually set by user",
            currencyConfidence: 1.0 
          } 
        },
        { new: true } // Return the updated document
      );
      
      res.json({
        message: "✅ Receipt currency updated successfully",
        receipt: updatedReceipt
      });
    } catch (error) {
      res.status(500).json({ message: "❌ Error updating receipt currency.", error: error.message });
    }
  });
  
  // ✅ NEW Endpoint: Get Currency Statistics
  app.get('/currency-stats', async (req, res) => {
    try {
      const receipts = await Receipt.find();
      
      // Get currency distribution
      const currencyStats = {};
      
      receipts.forEach(receipt => {
        if (!receipt.currency) return;
        
        const currency = receipt.currency.toUpperCase();
        if (!currencyStats[currency]) {
          currencyStats[currency] = {
            count: 0,
            totalAmount: 0,
            receipts: [],
            confidenceAvg: 0,
            confidenceTotal: 0
          };
        }
        
        currencyStats[currency].count += 1;
        currencyStats[currency].totalAmount += receipt.totalAmount || 0;
        currencyStats[currency].receipts.push({
          id: receipt._id,
          merchant: receipt.merchant,
          amount: receipt.totalAmount,
          evidence: receipt.currencyEvidence || "No evidence recorded"
        });
        currencyStats[currency].confidenceTotal += receipt.currencyConfidence || 0;
      });
      
      // Calculate average confidence
      Object.keys(currencyStats).forEach(currency => {
        currencyStats[currency].confidenceAvg = 
          currencyStats[currency].confidenceTotal / currencyStats[currency].count;
        
        // Remove the sum to keep response clean
        delete currencyStats[currency].confidenceTotal;
      });
      
      res.json({
        totalReceipts: receipts.length,
        currencyDistribution: currencyStats
      });
    } catch (error) {
      res.status(500).json({ message: "❌ Error generating currency statistics.", error: error.message });
    }
  });
  
  // ✅ NEW Endpoint: Delete Receipt by ID
  app.delete('/delete-receipt/:id', async (req, res) => {
    try {
      const receipt = await Receipt.findById(req.params.id);
      
      if (!receipt) {
        return res.status(404).json({ message: "❌ Receipt not found." });
      }
      
      // Delete the receipt from database
      await Receipt.findByIdAndDelete(req.params.id);
      
      // Find the actual file in the uploads folder
      // The file might have been saved with a timestamp prefix
      const uploadsDir = path.join(__dirname, 'uploads');
      const files = fs.readdirSync(uploadsDir);
      
      // Look for files that contain the original filename
      let deletedFiles = 0;
      
      // Only try to delete files for non-manual entries
      if (receipt.fileName && !receipt.isManualEntry) {
        const matchingFiles = files.filter(file => file.includes(receipt.fileName) || file.endsWith(receipt.fileName));
        
        // Delete all matching files
        for (const file of matchingFiles) {
          const filePath = path.join(uploadsDir, file);
          try {
            fs.unlinkSync(filePath);
            deletedFiles++;
          } catch (err) {
            console.error(`Error deleting file ${file}:`, err);
          }
        }
      }
      
      res.json({ 
        message: `✅ Receipt deleted successfully. ${deletedFiles} associated file(s) removed.`, 
        deletedReceipt: receipt 
      });
    } catch (error) {
      res.status(500).json({ message: "❌ Error deleting receipt.", error: error.message });
    }
  });
  
  // ✅ NEW Endpoint: Delete All Receipts
  app.delete('/delete-all-receipts', async (req, res) => {
    try {
      // Check for confirmation parameter
      if (req.query.confirm !== 'true') {
        return res.status(400).json({ 
          message: "❌ Confirmation required. Add '?confirm=true' to confirm deletion." 
        });
      }
      
      // Get all receipts to delete their files
      const receipts = await Receipt.find();
      
      console.log(`🗑️ Preparing to delete ${receipts.length} receipts and their files...`);
      
      // Delete files from uploads folder
      let deletedFiles = 0;
      const uploadDirPath = path.join(__dirname, 'uploads');
      
      // Option 1: Delete files associated with receipts
      for (const receipt of receipts) {
        try {
          if (receipt.fileName && !receipt.isManualEntry) {
            // Find files that match or contain the receipt filename
            const files = fs.readdirSync(uploadDirPath);
            const matchingFiles = files.filter(file => 
              file.includes(receipt.fileName) || file.endsWith(receipt.fileName)
            );
            
            for (const file of matchingFiles) {
              const filePath = path.join(uploadDirPath, file);
              fs.unlinkSync(filePath);
              deletedFiles++;
            }
          }
        } catch (err) {
          console.error(`Error deleting file for receipt ${receipt._id}:`, err);
        }
      }
      
      // Option 2: Delete all files in uploads directory if requested
      if (req.query.deleteAllFiles === 'true') {
        try {
          const files = fs.readdirSync(uploadDirPath);
          for (const file of files) {
            const filePath = path.join(uploadDirPath, file);
            fs.unlinkSync(filePath);
            deletedFiles++;
          }
          console.log(`🗑️ Deleted all ${deletedFiles} files in uploads directory`);
        } catch (err) {
          console.error('Error deleting all files:', err);
        }
      }
      
      // Delete all receipts from database
      const result = await Receipt.deleteMany({});
      
      res.json({ 
        message: `✅ ${result.deletedCount} receipts deleted successfully.`,
        filesDeleted: deletedFiles,
        receiptsDeleted: result.deletedCount
      });
    } catch (error) {
      res.status(500).json({ message: "❌ Error deleting receipts.", error: error.message });
    }
  });
  
  // ✅ NEW Endpoint: Analytics and Insights
  app.get('/receipt-analytics', async (req, res) => {
    try {
      // Get all receipts
      const receipts = await Receipt.find();
      
      // Calculate analytics
      const analytics = {
        totalSpending: 0,
        receiptCount: receipts.length,
        categoryBreakdown: {},
        timeAnalysis: {
          daily: {},
          monthly: {}
        },
        merchantAnalysis: {},
        currencyAnalysis: {},
        averageReceiptValue: 0
      };
      
      receipts.forEach(receipt => {
        // Total spending
        analytics.totalSpending += receipt.totalAmount || 0;
        
        // Category breakdown
        if (receipt.category) {
          if (!analytics.categoryBreakdown[receipt.category]) {
            analytics.categoryBreakdown[receipt.category] = {
              count: 0,
              total: 0
            };
          }
          analytics.categoryBreakdown[receipt.category].count += 1;
          analytics.categoryBreakdown[receipt.category].total += receipt.totalAmount || 0;
        }
        
        // Currency breakdown
        if (receipt.currency) {
          if (!analytics.currencyAnalysis[receipt.currency]) {
            analytics.currencyAnalysis[receipt.currency] = {
              count: 0,
              total: 0
            };
          }
          analytics.currencyAnalysis[receipt.currency].count += 1;
          analytics.currencyAnalysis[receipt.currency].total += receipt.totalAmount || 0;
        }
        
        // Time analysis
        if (receipt.date) {
          const date = new Date(receipt.date);
          
          // Daily analysis
          const dayKey = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
          if (!analytics.timeAnalysis.daily[dayKey]) {
            analytics.timeAnalysis.daily[dayKey] = 0;
          }
          analytics.timeAnalysis.daily[dayKey] += receipt.totalAmount || 0;
          
          // Monthly analysis
          const monthKey = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}`;
          if (!analytics.timeAnalysis.monthly[monthKey]) {
            analytics.timeAnalysis.monthly[monthKey] = 0;
          }
          analytics.timeAnalysis.monthly[monthKey] += receipt.totalAmount || 0;
        }
        
        // Merchant analysis
        if (receipt.merchant) {
          if (!analytics.merchantAnalysis[receipt.merchant]) {
            analytics.merchantAnalysis[receipt.merchant] = {
              count: 0,
              total: 0
            };
          }
          analytics.merchantAnalysis[receipt.merchant].count += 1;
          analytics.merchantAnalysis[receipt.merchant].total += receipt.totalAmount || 0;
        }
      });
      
      // Calculate average receipt value
      analytics.averageReceiptValue = analytics.receiptCount > 0 
        ? analytics.totalSpending / analytics.receiptCount 
        : 0;
      
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "❌ Error generating analytics.", error: error.message });
    }
  });

  // ✅ NEW Endpoint: Add Manual Receipt
  app.post('/add-manual-receipt', upload.none(), async (req, res) => {
    try {
      console.log("📝 Received manual receipt data");
      
      // Parse the manual receipt data
      let manualData;
      try {
        manualData = JSON.parse(req.body.manualReceiptData);
      } catch (parseError) {
        console.error("❌ Error parsing manual receipt data:", parseError);
        return res.status(400).json({ 
          message: "Failed to parse manual receipt data. Make sure it's valid JSON.", 
          error: parseError.message 
        });
      }
      
      console.log("📄 Manual receipt data:", manualData);
      
      // Validate required fields
      if (!manualData.merchant || manualData.totalAmount === undefined) {
        return res.status(400).json({ 
          message: "Missing required fields. Merchant and totalAmount are required." 
        });
      }
      
      // Create a new receipt document
      const newReceipt = new Receipt({
        fileName: null, // No file for manual entries
        merchant: manualData.merchant,
        date: manualData.date,
        category: manualData.category,
        items: manualData.items.map(item => ({
          name: item.name,
          price: parseFloat(item.price) || 0,
          quantity: parseFloat(item.quantity) || 1
        })),
        taxAmount: parseFloat(manualData.taxAmount) || 0,
        subtotalAmount: calculateSubtotal(manualData.items),
        totalAmount: parseFloat(manualData.totalAmount) || 0,
        paymentMethod: manualData.paymentMethod,
        currency: manualData.currency || 'USD',
        notes: manualData.notes,
        uploadedAt: new Date(),
        isManualEntry: true
      });
      
      // Save the receipt to the database
      const savedReceipt = await newReceipt.save();
      console.log("✅ Manual receipt saved with ID:", savedReceipt._id);
      
      // Return success response
      res.status(201).json({
        message: '✅ Manual receipt saved successfully',
        receipt: savedReceipt
      });
    } catch (error) {
      console.error('❌ Error saving manual receipt:', error);
      res.status(500).json({
        message: 'Failed to save manual receipt',
        error: error.message
      });
    }
  });

  // Helper function to calculate subtotal
  function calculateSubtotal(items) {
    if (!items || !Array.isArray(items)) return 0;
    
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      return sum + (price * quantity);
    }, 0);
  }
  
  // ✅ Error Handling Middleware
  app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err);
    
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          message: "❌ File size too large. Maximum size is 10MB." 
        });
      }
    }
    
    res.status(500).json({ 
      message: "❌ Server error occurred.", 
      error: err.message 
    });
  });
  
  // ✅ Start the Server
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', shutDown);
  process.on('SIGINT', shutDown);
  
  function shutDown() {
    console.log('🛑 Closing server and database connections...');
    mongoose.connection.close(() => {
      console.log('✅ MongoDB connection closed.');
      process.exit(0);
    });
  }