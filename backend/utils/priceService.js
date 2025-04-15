// utils/priceService.js
// Mock price database for common items
const MOCK_PRICE_DB = {
  'milk': 4.50,
  'bread': 3.50,
  'rice': 6.00,
  'pasta': 5.00,
  'cereal': 15.00,
  'coffee': 20.00,
  'tea': 12.00,
  'sugar': 4.00,
  'flour': 4.50,
  'eggs': 7.50,
  'cheese': 12.00,
  'yogurt': 4.00,
  'butter': 5.00,
  'oil': 10.00,
  'chicken': 18.00,
  'beef': 25.00,
  'fish': 22.00,
  'shampoo': 19.00,
  'soap': 3.00,
  'toothpaste': 8.50,
  'toilet paper': 12.00,
  'detergent': 13.00,
  'dish soap': 6.00,
  'netflix': 19.90,
  'amazon prime': 17.90,
  'spotify': 11.90
  // Add more items as needed
};

/**
 * Compare item price against market price
 */
async function comparePrice(itemName, price) {
  try {
    // Try to get price from external API first (if implemented)
    try {
      const externalPrice = await fetchExternalPrice(itemName);
      
      if (externalPrice && externalPrice > 0) {
        const savings = price > externalPrice ? price - externalPrice : 0;
        
        return {
          marketPrice: externalPrice,
          savings,
          source: 'api'
        };
      }
    } catch (apiError) {
      console.log('External price API unavailable, using fallback', apiError);
      // Continue to fallback if API fails
    }
    
    // Fallback to mock price database
    const mockPrice = findInMockDatabase(itemName);
    
    if (mockPrice) {
      const savings = price > mockPrice ? price - mockPrice : 0;
      
      return {
        marketPrice: mockPrice,
        savings,
        source: 'mock'
      };
    }
    
    // No price found
    return null;
  } catch (error) {
    console.error('Error comparing prices:', error);
    return null;
  }
}

/**
 * Find an item in the mock price database
 */
function findInMockDatabase(itemName) {
  const lowerCaseItem = itemName.toLowerCase();
  
  // Direct match
  if (MOCK_PRICE_DB[lowerCaseItem]) {
    return MOCK_PRICE_DB[lowerCaseItem];
  }
  
  // Partial match
  for (const [key, value] of Object.entries(MOCK_PRICE_DB)) {
    if (lowerCaseItem.includes(key)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Fetch price from an external API
 * NOTE: This is a placeholder. Implement actual API integration here.
 */
async function fetchExternalPrice(itemName) {
  // This is where you would integrate with an actual price API
  // For now, we'll simply return null to fall back to mock DB
  return null;
}

module.exports = {
  comparePrice,
  findInMockDatabase
};