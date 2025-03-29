// config/db.js
const mongoose = require('mongoose');

module.exports = async function connectDB() {
  try {
    // Check if MONGODB_URI is defined
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables. Please check your .env file.');
    }

    console.log(`Attempting to connect to MongoDB: ${process.env.MONGODB_URI.split('@')[1] || 'localhost'}`);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'smart-ledger',
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log("✅ MongoDB Atlas Connected to 'smart-ledger' database");
    
    // Test the connection
    const connection = mongoose.connection;
    connection.on('error', err => {
      console.error("❌ MongoDB Connection Error:", err);
      process.exit(1);
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
    process.exit(1);
  }
};