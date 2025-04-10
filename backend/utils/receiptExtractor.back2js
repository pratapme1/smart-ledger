// utils/receiptExtractor.js
const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp'); // For image preprocessing
require('dotenv').config();

// Environment variables with defaults
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const HF_OCR_MODEL = process.env.HF_OCR_MODEL || 'Salesforce/blip-image-captioning-base';
const HF_MODEL_ID = process.env.HF_MODEL_ID || 'tiiuae/falcon-7b-instruct';
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'huggingface'; // 'huggingface' or 'openai'
const MULTIMODAL_MODEL = process.env.MULTIMODAL_MODEL || 'llava-hf/llava-1.5-7b-hf';
const VISION_PROCESSOR = process.env.VISION_PROCESSOR || 'multimodal'; // 'multimodal' or 'legacy'
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '2');
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4-vision-preview';
const OPENAI_TIMEOUT = parseInt(process.env.OPENAI_TIMEOUT || '30000'); // 30 seconds timeout for OpenAI


/**
 * Main function to extract text from receipt images
 * This function selects the appropriate processing method based on environment configuration
 * @param {string} imagePath - Local path to the uploaded image
 * @param {string} fileName - Original filename
 * @returns {Object} Parsed receipt data
 */
async function extractTextWithGPT(imagePath, fileName) {
  try {
    console.log(`🔍 Processing image: ${imagePath}`);
    
    // Read and preprocess the image
    const imageBuffer = fs.readFileSync(imagePath);
    const processedImageBuffer = await preprocessImage(imageBuffer);
    
    // Extract possible date hint from filename
    const possibleDateMatch = fileName.match(/\d{2}[-_]?\d{2}[-_]?\d{2,4}/);
    const dateHint = possibleDateMatch ? `Date: ${possibleDateMatch[0]}` : '';
    
    // Determine which vision processor to use
    if (VISION_PROCESSOR === 'multimodal') {
      console.log("🤖 Using multimodal approach");
      
      // Try the configured provider first
      try {
        if (LLM_PROVIDER === 'openai' && OPENAI_API_KEY) {
          return await processWithOpenAI(processedImageBuffer, dateHint);
        } else if (LLM_PROVIDER === 'huggingface' && HF_API_KEY) {
          return await processWithHuggingFaceMultimodal(processedImageBuffer, dateHint);
        } else {
          throw new Error(`Invalid or missing credentials for provider: ${LLM_PROVIDER}`);
        }
      } catch (error) {
        // If primary provider fails, try fallback if configured
        console.error(`❌ Primary provider (${LLM_PROVIDER}) failed:`, error.message);
        
        // Try fallback provider
        if (LLM_PROVIDER === 'openai' && HF_API_KEY) {
          console.log("⚠️ Falling back to Hugging Face multimodal");
          return await processWithHuggingFaceMultimodal(processedImageBuffer, dateHint);
        } else if (LLM_PROVIDER === 'huggingface' && OPENAI_API_KEY) {
          console.log("⚠️ Falling back to OpenAI GPT Vision");
          return await processWithOpenAI(processedImageBuffer, dateHint);
        } else {
          // If both fail, fall back to legacy approach
          console.log("⚠️ All multimodal approaches failed, falling back to legacy processing");
          return await processWithLegacyMethod(imagePath, fileName);
        }
      }
    } else {
      // Use legacy two-step approach (BLIP + Falcon)
      console.log("🤖 Using legacy two-step approach");
      return await processWithLegacyMethod(imagePath, fileName);
    }
  } catch (error) {
    console.error("❌ Error extracting text with LLM:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
}

/**
 * Preprocess image to improve recognition
 * @param {Buffer} imageBuffer - Original image buffer
 * @returns {Promise<Buffer>} - Processed image buffer
 */
async function preprocessImage(imageBuffer) {
  try {
    // Enhanced preprocessing specifically for receipts
    return await sharp(imageBuffer)
      .greyscale() // Convert to grayscale for better text contrast
      .normalize() // Normalize brightness
      .sharpen() // Sharpen image
      .toBuffer();
  } catch (error) {
    console.warn("⚠️ Image preprocessing failed, using original image:", error.message);
    return imageBuffer;
  }
}

/**
 * Convert image to base64 encoding
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {string} - Base64 encoded image
 */
function imageToBase64(imageBuffer) {
  return imageBuffer.toString('base64');
}

/**
 * Process the receipt using OpenAI GPT Vision
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} dateHint - Date hint extracted from filename
 * @returns {Promise<Object>} - Structured receipt data
 */
async function processWithOpenAI(imageBuffer, dateHint) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is required");
  }
  
  console.log(`🤖 Using OpenAI ${OPENAI_MODEL}`);
  
  // Convert image to base64
  const base64Image = imageToBase64(imageBuffer);
  
  // Build the prompt
  const prompt = `Analyze this receipt image and extract the following information into a structured JSON format:
1. The merchant/store name
2. The date of purchase (in YYYY-MM-DD format)
3. The category of purchase (e.g., Grocery, Restaurant, Retail)
4. List of items purchased with name, price, and quantity
5. Subtotal amount (before tax)
6. Tax amount
7. Total amount
8. Payment method used
9. Currency (USD, EUR, etc.)
10. Any other important notes

${dateHint ? 'Hint: ' + dateHint : ''}

Return ONLY valid JSON without any explanation or additional text. Follow this exact structure:
{
  "merchant": "Store name",
  "date": "YYYY-MM-DD",
  "category": "Type of store",
  "items": [
    { "name": "Item description", "price": 0.00, "quantity": 1 }
  ],
  "subtotalAmount": 0.00,
  "taxAmount": 0.00,
  "totalAmount": 0.00,
  "paymentMethod": "Method used",
  "currency": "USD",
  "notes": "Any additional information"
}`;

  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: OPENAI_MODEL,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: OPENAI_TIMEOUT
        }
      );
      
      const responseText = response.data.choices[0]?.message?.content || '';
      console.log(`📝 OpenAI response: ${responseText.slice(0, 200)}...`);
      
      // Extract and parse JSON
      return extractJSONFromResponse(responseText);
    } catch (error) {
      retries++;
      console.log(`⚠️ OpenAI attempt ${retries} failed, ${retries <= MAX_RETRIES ? 'retrying...' : 'giving up.'}`);
      
      if (retries > MAX_RETRIES) {
        throw error;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
  }
}

/**
 * Process the receipt using Hugging Face multimodal model
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} dateHint - Date hint extracted from filename
 * @returns {Promise<Object>} - Structured receipt data
 */
async function processWithHuggingFaceMultimodal(imageBuffer, dateHint) {
  if (!HF_API_KEY) {
    throw new Error("Hugging Face API key is required");
  }
  
  console.log(`🤖 Using Hugging Face multimodal model: ${MULTIMODAL_MODEL}`);
  
  // Convert image to base64
  const base64Image = imageToBase64(imageBuffer);
  
  // Create the prompt with detailed instructions
  const prompt = `Analyze this receipt image and extract the following information into a structured JSON format:
1. The merchant/store name
2. The date of purchase (in YYYY-MM-DD format)
3. The category of purchase (e.g., Grocery, Restaurant, Retail)
4. List of items purchased with name, price, and quantity
5. Subtotal amount (before tax)
6. Tax amount
7. Total amount
8. Payment method used
9. Currency (USD, EUR, etc.)
10. Any other important notes

${dateHint ? 'Hint: ' + dateHint : ''}

Return ONLY valid JSON without any explanation or additional text. Follow this exact structure:
{
  "merchant": "Store name",
  "date": "YYYY-MM-DD",
  "category": "Type of store",
  "items": [
    { "name": "Item description", "price": 0.00, "quantity": 1 }
  ],
  "subtotalAmount": 0.00,
  "taxAmount": 0.00,
  "totalAmount": 0.00,
  "paymentMethod": "Method used",
  "currency": "USD",
  "notes": "Any additional information"
}`;
  
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      // Using the new chat completion API format
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${MULTIMODAL_MODEL}`,
        {
          provider: "nebius", // Specify the provider
          model: MULTIMODAL_MODEL,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.2
        },
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Process response in the new format
      let responseText = '';
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        responseText = response.data.choices[0].message.content || '';
      } else {
        console.warn("⚠️ Unexpected response format from Hugging Face:", response.data);
        responseText = JSON.stringify(response.data);
      }
      
      console.log(`📝 Model response: ${responseText.slice(0, 300)}...`);
      
      // Extract and parse JSON from the response
      return extractJSONFromResponse(responseText);
    } catch (error) {
      retries++;
      console.log(`⚠️ Attempt ${retries} failed, ${retries <= MAX_RETRIES ? 'retrying...' : 'giving up.'}`);
      
      if (error.response) {
        console.error("Error response:", error.response.status, error.response.data);
      }
      
      if (error.response && error.response.status === 503) {
        // Model is loading, wait longer
        console.log("Model is still loading, waiting...");
        await new Promise(resolve => setTimeout(resolve, 2000 * retries));
      } else if (retries > MAX_RETRIES) {
        throw error;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
  }
}

/**
 * Process receipt using legacy two-step method (BLIP + Falcon)
 * This is the original implementation
 * @param {string} imagePath - Path to the image
 * @param {string} fileName - Original filename
 * @returns {Promise<Object>} - Structured receipt data
 */
/**
 * Process receipt using enhanced legacy two-step method (BLIP + Falcon)
 * Improved version with better error handling and logging
 * @param {string} imagePath - Path to the image
 * @param {string} fileName - Original filename
 * @returns {Promise<Object>} - Structured receipt data
 */
async function processWithLegacyMethod(imagePath, fileName) {
  try {
    console.log(`🔍 Processing with enhanced legacy method: ${imagePath}`);

    const imageBuffer = fs.readFileSync(imagePath);
    
    // Try to preprocess the image for better OCR results
    const processedImageBuffer = await preprocessImage(imageBuffer);
    
    const possibleDateMatch = fileName.match(/\d{2}[-_]?\d{2}[-_]?\d{2,4}/);
    const dateHint = possibleDateMatch ? `Date: ${possibleDateMatch[0]}` : '';

    console.log("🤖 Using Hugging Face (BLIP + Falcon)");
    
    // Step 1: OCR - Convert image to text using BLIP
    console.log("📦 Calling OCR model:", HF_OCR_MODEL);
    
    // Send processed image data for better results
    const ocrResponse = await axios.post(
      `https://api-inference.huggingface.co/models/${HF_OCR_MODEL}`,
      processedImageBuffer,
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/octet-stream'
        }
      }
    );

    // Handle BLIP response format
    let ocrText = '';
    if (Array.isArray(ocrResponse.data)) {
      ocrText = ocrResponse.data[0]?.generated_text || '';
    } else if (typeof ocrResponse.data === 'object') {
      ocrText = ocrResponse.data?.generated_text || '';
    } else {
      ocrText = String(ocrResponse.data);
    }
    
    console.log("📜 OCR Extracted Text (full):", ocrText);
    
    if (ocrText.length < 10) {
      console.warn("⚠️ BLIP extracted very little text, trying to improve image and retry");
      
      // Try enhancing the image more aggressively
      const enhancedBuffer = await sharp(imageBuffer)
        .greyscale()
        .normalize()
        .sharpen({ sigma: 2 })
        .gamma(1.5)  // Adjust gamma to improve contrast
        .linear(1.3, -30)  // Increase contrast
        .toBuffer();
      
      // Retry OCR with enhanced image
      const enhancedOcrResponse = await axios.post(
        `https://api-inference.huggingface.co/models/${HF_OCR_MODEL}`,
        enhancedBuffer,
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/octet-stream'
          }
        }
      );
      
      if (Array.isArray(enhancedOcrResponse.data)) {
        const enhancedText = enhancedOcrResponse.data[0]?.generated_text || '';
        if (enhancedText.length > ocrText.length) {
          ocrText = enhancedText;
          console.log("📜 Improved OCR Extracted Text:", ocrText);
        }
      }
    }

    // Step 2: Falcon - Convert raw text into structured JSON
    console.log("📦 Calling model:", HF_MODEL_ID);
    
    // Enhanced prompt with few-shot examples for better conversion
    const prompt = `Convert this receipt text to precise, structured JSON format.

RECEIPT TEXT:
${ocrText}
${dateHint}

EXAMPLES:
Example 1 input: "Walmart Supercenter 123 Main St 01/15/2023 Milk $3.99 Bread $2.49 Tax $0.52 Total $7.00 VISA"
Example 1 output: {"merchant":"Walmart Supercenter","date":"2023-01-15","category":"Grocery","items":[{"name":"Milk","price":3.99,"quantity":1},{"name":"Bread","price":2.49,"quantity":1}],"subtotalAmount":6.48,"taxAmount":0.52,"totalAmount":7.00,"paymentMethod":"VISA","currency":"USD","notes":""}

Example 2 input: "STARBUCKS #12345 02-21-2023 Grande Latte $4.95 Blueberry Muffin $3.25 Subtotal: $8.20 Tax: $0.74 Total: $8.94 Paid with MASTERCARD"
Example 2 output: {"merchant":"STARBUCKS","date":"2023-02-21","category":"Cafe","items":[{"name":"Grande Latte","price":4.95,"quantity":1},{"name":"Blueberry Muffin","price":3.25,"quantity":1}],"subtotalAmount":8.20,"taxAmount":0.74,"totalAmount":8.94,"paymentMethod":"MASTERCARD","currency":"USD","notes":"Store #12345"}

Return only valid JSON with no additional text. Follow this template exactly:
{
  "merchant": "Store name",
  "date": "YYYY-MM-DD",
  "category": "Type of store",
  "items": [
    { "name": "Item description", "price": 0.00, "quantity": 1 }
  ],
  "subtotalAmount": 0.00,
  "taxAmount": 0.00,
  "totalAmount": 0.00,
  "paymentMethod": "Method used",
  "currency": "USD",
  "notes": "Any additional information"
}`;

    const hfResponse = await axios.post(
      `https://api-inference.huggingface.co/models/${HF_MODEL_ID}`,
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 1000,  // Increased token limit
          temperature: 0.1,
          top_p: 0.95,
          do_sample: true,
          return_full_text: false
        }
      },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let llmResponse = '';
    
    if (Array.isArray(hfResponse.data)) {
      llmResponse = hfResponse.data[0]?.generated_text || '';
    } else if (typeof hfResponse.data === 'object') {
      llmResponse = hfResponse.data.generated_text || '';
    } else {
      llmResponse = String(hfResponse.data);
    }
    
    console.log("📄 Full LLM Response:", llmResponse);

    // Try multiple approaches to extract JSON
    // 1. Regex approach
    const jsonMatch = llmResponse.match(/(\{[\s\S]*\})/);
    
    if (jsonMatch) {
      try {
        const parsedJSON = JSON.parse(jsonMatch[0]);
        console.log("✅ Successfully extracted JSON using regex approach");
        
        // Log the values to debug
        console.log("Merchant:", parsedJSON.merchant);
        console.log("Total Amount:", parsedJSON.totalAmount);
        console.log("Items:", JSON.stringify(parsedJSON.items));
        
        return validateAndCleanupJSON(parsedJSON);
      } catch (err) {
        console.warn("⚠️ Regex JSON parsing failed:", err.message);
      }
    }
    
    // 2. Try to find opening and closing braces
    try {
      const startIdx = llmResponse.indexOf('{');
      const endIdx = llmResponse.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonCandidate = llmResponse.substring(startIdx, endIdx + 1);
        const parsedJSON = JSON.parse(jsonCandidate);
        console.log("✅ Successfully extracted JSON using brace finding approach");
        return validateAndCleanupJSON(parsedJSON);
      }
    } catch (err) {
      console.warn("⚠️ Brace finding JSON parsing failed:", err.message);
    }
    
    // 3. Try to fix common JSON formatting issues
    try {
      const fixedText = llmResponse
        .replace(/(\w+):/g, '"$1":')  // Add quotes to keys
        .replace(/:\s*'([^']*)'/g, ': "$1"')  // Replace single quotes with double quotes
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*,/g, ',');  // Remove double commas
        
      // Try to find valid JSON in the fixed text
      const fixedJsonMatch = fixedText.match(/(\{[\s\S]*\})/);
      if (fixedJsonMatch) {
        const parsedJSON = JSON.parse(fixedJsonMatch[0]);
        console.log("✅ Successfully extracted JSON using JSON fixing approach");
        return validateAndCleanupJSON(parsedJSON);
      }
    } catch (err) {
      console.warn("⚠️ JSON fixing approach failed:", err.message);
    }
    
    // Create fallback data with additional manual extraction attempts
    console.log("⚠️ All JSON extraction methods failed, performing manual extraction");
    return createEnhancedFallbackJSON(ocrText, llmResponse);

  } catch (error) {
    console.error("❌ Error in legacy processing:", error.message);
    
    // Still provide a minimal result even if everything fails
    return {
      merchant: "",
      date: "",
      category: "",
      items: [{ name: "Item from receipt", price: 0, quantity: 1 }],
      subtotalAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      paymentMethod: "",
      currency: "USD",
      notes: `Processing error: ${error.message}`
    };
  }
}

/**
 * Create an enhanced fallback JSON with manual extraction attempts
 * @param {string} ocrText - The OCR text from BLIP
 * @param {string} llmResponse - The LLM response text
 * @returns {Object} - Best-effort JSON object
 */
function createEnhancedFallbackJSON(ocrText, llmResponse) {
  // Try to extract information using regex patterns
  // Combine both texts for maximum coverage
  const combinedText = ocrText + "\n" + llmResponse;
  
  // Extract merchant name
  let merchant = "";
  const merchantMatches = [
    // From receipt headers
    combinedText.match(/^([A-Z][A-Za-z0-9\s&'.]{2,30})/m),
    combinedText.match(/merchant[:\s]+"?([^"]+)"?/i),
    combinedText.match(/store[:\s]+"?([^"]+)"?/i),
  ].filter(Boolean);
  
  if (merchantMatches.length > 0) {
    merchant = merchantMatches[0][1].trim();
  } else {
    // Try to use the first line
    const lines = combinedText.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0 && lines[0].length < 50) {
      merchant = lines[0].trim();
    }
  }
  
  // Extract date
  let date = "";
  const dateMatches = [
    combinedText.match(/date[:\s]+"?(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4})"?/i),
    combinedText.match(/(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})/),
  ].filter(Boolean);
  
  if (dateMatches.length > 0) {
    date = dateMatches[0][1];
  }
  
  // Extract total amount
  let totalAmount = 0;
  const totalMatches = [
    combinedText.match(/total[:\s]*[$€£]?\s*"?(\d+[.,]\d{2})"?/i),
    combinedText.match(/total[:\s]*"?(\d+[.,]\d{2})"?/i),
    combinedText.match(/[$€£]?\s*(\d+[.,]\d{2})\s*(?:total|sum|amount)/i)
  ].filter(Boolean);
  
  if (totalMatches.length > 0) {
    totalAmount = parseFloat(totalMatches[0][1].replace(',', '.'));
  }
  
  // Extract tax amount
  let taxAmount = 0;
  const taxMatches = [
    combinedText.match(/tax[:\s]*[$€£]?\s*"?(\d+[.,]\d{2})"?/i),
    combinedText.match(/vat[:\s]*[$€£]?\s*"?(\d+[.,]\d{2})"?/i),
    combinedText.match(/gst[:\s]*[$€£]?\s*"?(\d+[.,]\d{2})"?/i)
  ].filter(Boolean);
  
  if (taxMatches.length > 0) {
    taxAmount = parseFloat(taxMatches[0][1].replace(',', '.'));
  }
  
  // Extract subtotal
  let subtotalAmount = 0;
  const subtotalMatches = [
    combinedText.match(/subtotal[:\s]*[$€£]?\s*"?(\d+[.,]\d{2})"?/i),
    combinedText.match(/sub[- ]?total[:\s]*[$€£]?\s*"?(\d+[.,]\d{2})"?/i)
  ].filter(Boolean);
  
  if (subtotalMatches.length > 0) {
    subtotalAmount = parseFloat(subtotalMatches[0][1].replace(',', '.'));
  }
  
  // Extract payment method
  let paymentMethod = "";
  const paymentMatches = [
    combinedText.match(/(?:paid|payment)[:\s]*(?:by|with|via)?\s*([A-Za-z]{3,15})/i),
    combinedText.match(/\b(visa|mastercard|amex|cash|check|debit|credit)\b/i)
  ].filter(Boolean);
  
  if (paymentMatches.length > 0) {
    paymentMethod = paymentMatches[0][1].trim();
  }
  
  // Extract currency
  let currency = "USD";  // Default
  const currencyMatches = [
    combinedText.match(/currency[:\s]*"?([A-Z]{3})"?/i),
    combinedText.match(/\b(USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR|KRW)\b/)
  ].filter(Boolean);
  
  if (currencyMatches.length > 0) {
    currency = currencyMatches[0][1].toUpperCase();
  } else if (combinedText.includes('$') || combinedText.includes('USD')) {
    currency = "USD";
  } else if (combinedText.includes('€') || combinedText.includes('EUR')) {
    currency = "EUR";
  } else if (combinedText.includes('£') || combinedText.includes('GBP')) {
    currency = "GBP";
  } else if (combinedText.includes('₹') || combinedText.includes('INR')) {
    currency = "INR";
  }
  
  // Extract category
  let category = "";
  const categoryMatches = [
    combinedText.match(/category[:\s]*"?([A-Za-z\s]{3,20})"?/i)
  ].filter(Boolean);
  
  if (categoryMatches.length > 0) {
    category = categoryMatches[0][1].trim();
  }
  
  // Try to extract items (this is more complex, simplified approach)
  const items = [];
  
  // Look for price patterns like "$10.99" and extract potential item names before them
  const pricePattern = /(?:^|\s)([A-Za-z0-9\s&'.]{3,30})\s+[$€£]?(\d+[.,]\d{2})/gm;
  let match;
  while ((match = pricePattern.exec(combinedText)) !== null) {
    const itemName = match[1].trim();
    const itemPrice = parseFloat(match[2].replace(',', '.'));
    
    // Skip if this looks like a total/subtotal/tax line
    if (itemName.toLowerCase().includes('total') ||
        itemName.toLowerCase().includes('tax') ||
        itemName.toLowerCase().includes('subtotal')) {
      continue;
    }
    
    items.push({
      name: itemName,
      price: itemPrice,
      quantity: 1
    });
  }
  
  // If we couldn't find items but have a total, create a single generic item
  if (items.length === 0 && totalAmount > 0) {
    items.push({
      name: "Item from receipt",
      price: totalAmount - taxAmount,
      quantity: 1
    });
  }
  
  // Calculate subtotal if we have items but no subtotal
  if (subtotalAmount === 0 && items.length > 0) {
    subtotalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
  
  // If we have a total but no tax or subtotal, estimate tax as a percentage
  if (totalAmount > 0 && subtotalAmount === 0 && taxAmount === 0) {
    // Estimate subtotal as 90% of total
    subtotalAmount = totalAmount * 0.9;
    taxAmount = totalAmount - subtotalAmount;
  }
  
  console.log("📊 Enhanced Manual Extraction Results:");
  console.log("Merchant:", merchant);
  console.log("Date:", date);
  console.log("Total:", totalAmount);
  console.log("Tax:", taxAmount);
  console.log("Subtotal:", subtotalAmount);
  console.log("Found items:", items.length);
  
  return {
    merchant: merchant,
    date: date,
    category: category,
    items: items.length > 0 ? items : [{ name: "Item from receipt", price: 0, quantity: 1 }],
    subtotalAmount: subtotalAmount,
    taxAmount: taxAmount,
    totalAmount: totalAmount,
    paymentMethod: paymentMethod,
    currency: currency,
    notes: `Extracted using enhanced fallback method. Original OCR text: ${ocrText.slice(0, 100)}...`
  };
}

/**
 * Calculate subtotal from items array
 * @param {Array} items - Array of items with price and quantity
 * @returns {number} - Calculated subtotal
 */
function calculateSubtotal(items = []) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return 0;
  }
  
  return items.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseFloat(item.quantity) || 1;
    return sum + (price * quantity);
  }, 0);
}

// Make sure to add this to your module.exports
module.exports = { 
  extractTextWithGPT,
  preprocessImage,
  calculateSubtotal  // Add this line to include the function
};
