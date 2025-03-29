    // scripts/test-db.js
require('dotenv').config({ path: `.env.${process.argv[2] || 'development'}` });
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log(`Testing connection to: ${process.env.MONGODB_URI.split('@')[1]}`);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Database connection successful!');
    
    // Test creating and reading a document
    const TestModel = mongoose.model('ConnectionTest', new mongoose.Schema({
      test: String,
      timestamp: { type: Date, default: Date.now }
    }));
    
    // Create test document
    const testDoc = await TestModel.create({ test: 'Connection test' });
    console.log(`✅ Created test document with ID: ${testDoc._id}`);
    
    // Read test document
    const foundDoc = await TestModel.findById(testDoc._id);
    console.log(`✅ Retrieved test document: ${foundDoc.test}`);
    
    // Clean up
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log('✅ Cleaned up test document');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
}

testConnection();