// config/db.js
const mongoose = require('mongoose');

module.exports = async function connectDB() {
  try {
    // Check if MONGODB_URI is defined
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables. Please check your platform settings or .env file.');
    }

    console.log(`Attempting to connect to MongoDB: ${process.env.MONGODB_URI.split('@')[1] || 'localhost'}`);
    
    // Remove deprecated options in production
    const options = {
      dbName: 'smart-ledger'
    };
    
    // Only add deprecated options in development for backward compatibility
    if (process.env.NODE_ENV !== 'production') {
      options.useNewUrlParser = true;
      options.useUnifiedTopology = true;
    }
    
    await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log("✅ MongoDB Atlas Connected to 'smart-ledger' database");
    
    // Test the connection
    const connection = mongoose.connection;
    connection.on('error', err => {
      console.error("❌ MongoDB Connection Error:", err);
      // Don't exit in production, let the platform handle restarts
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    });
    
    connection.once('open', () => {
      console.log("✅ MongoDB connection established successfully");
    });
    
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    // Log more details for troubleshooting
    if (err.name === 'MongoServerSelectionError') {
      console.error("Could not connect to any MongoDB servers. Please check:");
      console.error("1. Your MongoDB URI is correct");
      console.error("2. The MongoDB server is running");
      console.error("3. Network connections to MongoDB are allowed");
    }
    
    // Don't exit in production, let the platform handle restarts
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    } else {
      console.log("Not exiting process in production environment. Platform will handle restarts if needed.");
    }
  }
};