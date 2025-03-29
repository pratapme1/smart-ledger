// controllers/receiptController.js
const path = require('path');
const fs = require('fs');
const Receipt = require('../models/Receipt');
const { extractTextWithGPT, calculateSubtotal } = require('../utils/receiptExtractor');

// Home route with API information
exports.getApiInfo = (req, res) => {
  res.json({ 
    status: "🟢 Server is running", 
    version: "2.0.0",
    authEndpoints: [
      { path: "/api/auth/register", method: "POST", description: "Register a new user" },
      { path: "/api/auth/login", method: "POST", description: "Log in with email and password" },
      { path: "/api/auth/google", method: "GET", description: "Sign in with Google" },
      { path: "/api/auth/github", method: "GET", description: "Sign in with GitHub" },
      { path: "/api/auth/forgot-password", method: "POST", description: "Request password reset" },
      { path: "/api/auth/reset-password/:token", method: "POST", description: "Reset password with token" },
      { path: "/api/auth/user", method: "GET", description: "Get authenticated user data (requires auth)" }
    ],
    endpoints: [
      { path: "/upload-receipt", method: "POST", description: "Upload single receipt (requires auth)" },
      { path: "/upload-multiple-receipts", method: "POST", description: "Upload multiple receipts (requires auth)" },
      { path: "/get-receipts", method: "GET", description: "Get user receipts with optional filters (requires auth)" },
      { path: "/get-receipt/:id", method: "GET", description: "Get a specific receipt by ID (requires auth)" },
      { path: "/update-receipt/:id", method: "PATCH", description: "Update receipt fields (requires auth)" },
      { path: "/update-receipt-currency/:id", method: "PATCH", description: "Update receipt currency (requires auth)" },
      { path: "/delete-receipt/:id", method: "DELETE", description: "Delete a specific receipt by ID (requires auth)" },
      { path: "/delete-all-receipts", method: "DELETE", description: "Delete all user receipts (requires auth & ?confirm=true)" },
      { path: "/receipt-analytics", method: "GET", description: "Get spending analytics (requires auth)" },
      { path: "/currency-stats", method: "GET", description: "Get statistics about currency distribution (requires auth)" },
      { path: "/add-manual-receipt", method: "POST", description: "Add a manually entered receipt (requires auth)" }
    ],
    currencySupport: {
      note: "The server now has enhanced currency detection capabilities",
      supportedCurrencies: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "KRW", "BRL", "MXN", "SGD", "THB", "RUB"],
      manualOverride: "Use /update-receipt-currency/:id to manually correct currency if needed"
    },
    authentication: {
      type: "JWT",
      tokenExpiration: "1 day",
      socialProviders: ["Google", "GitHub"]
    }
  });
};
// controllers/receiptController.js (continued)
// Upload single receipt
exports.uploadReceipt = async (req, res) => {
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
  
      // Save to MongoDB with user ID
      const newReceipt = new Receipt({
        ...parsedReceipt,
        userId: req.user._id // Add the authenticated user's ID
      });
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
  };
  
  // Upload multiple receipts
  exports.uploadMultipleReceipts = async (req, res) => {
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
          
          // Save to MongoDB with user ID
          const newReceipt = new Receipt({
            ...parsedReceipt,
            userId: req.user._id
          });
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
  };
  
  // Get all receipts (filtered)
  exports.getReceipts = async (req, res) => {
    try {
      const { category, startDate, endDate, merchant, minAmount, maxAmount, sortBy, limit, currency, type } = req.query;
      
      // Build filter object - limit to current user's receipts
      const filter = { userId: req.user._id };
      
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
  };
  
  // Get receipt by ID
  exports.getReceiptById = async (req, res) => {
    try {
      const receipt = await Receipt.findOne({
        _id: req.params.id,
        userId: req.user._id
      });
      
      if (!receipt) {
        return res.status(404).json({ message: "❌ Receipt not found or you don't have permission to access it." });
      }
      
      res.json(receipt);
    } catch (error) {
      res.status(500).json({ message: "❌ Error fetching receipt.", error: error.message });
    }
  };
  
  // Update receipt currency
  exports.updateReceiptCurrency = async (req, res) => {
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
      
      // Find the receipt (ensuring it belongs to the authenticated user)
      const receipt = await Receipt.findOne({
        _id: id,
        userId: req.user._id
      });
      
      if (!receipt) {
        return res.status(404).json({ message: "❌ Receipt not found or you don't have permission to update it." });
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
  };
  
  // Get currency statistics
  exports.getCurrencyStats = async (req, res) => {
    try {
      // Get only the authenticated user's receipts
      const receipts = await Receipt.find({ userId: req.user._id });
      
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
  };
  
  // Delete receipt by ID
  exports.deleteReceipt = async (req, res) => {
    try {
      // Find the receipt and ensure it belongs to the authenticated user
      const receipt = await Receipt.findOne({
        _id: req.params.id,
        userId: req.user._id
      });
      
      if (!receipt) {
        return res.status(404).json({ message: "❌ Receipt not found or you don't have permission to delete it." });
      }
      
      // Delete the receipt from database
      await Receipt.findByIdAndDelete(req.params.id);
      
      // Find the actual file in the uploads folder
      // The file might have been saved with a timestamp prefix
      const uploadsDir = path.join(__dirname, '../uploads');
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
  };
  
  // Delete all receipts for the current user
  exports.deleteAllReceipts = async (req, res) => {
    try {
      // Check for confirmation parameter
      if (req.query.confirm !== 'true') {
        return res.status(400).json({ 
          message: "❌ Confirmation required. Add '?confirm=true' to confirm deletion." 
        });
      }
      
      // Get all receipts for the current user to delete their files
      const receipts = await Receipt.find({ userId: req.user._id });
      
      console.log(`🗑️ Preparing to delete ${receipts.length} receipts and their files...`);
      
      // Delete files from uploads folder
      let deletedFiles = 0;
      const uploadDirPath = path.join(__dirname, '../uploads');
      
      // Delete files associated with receipts
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
      
      // Delete all receipts for this user from database
      const result = await Receipt.deleteMany({ userId: req.user._id });
      
      res.json({ 
        message: `✅ ${result.deletedCount} receipts deleted successfully.`,
        filesDeleted: deletedFiles,
        receiptsDeleted: result.deletedCount
      });
    } catch (error) {
      res.status(500).json({ message: "❌ Error deleting receipts.", error: error.message });
    }
  };
  
  // Get receipt analytics
  exports.getReceiptAnalytics = async (req, res) => {
    try {
      // Get all receipts for the current user
      const receipts = await Receipt.find({ userId: req.user._id });
      
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
  };
  
  // Add a manual receipt
  exports.addManualReceipt = async (req, res) => {
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
      
      // Create a new receipt document with user ID
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
        isManualEntry: true,
        userId: req.user._id
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
  };