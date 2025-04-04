import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getItemPriceHistory } from '../services/aiService';

const PricePrediction = ({ item, receipts }) => {
  const priceData = getItemPriceHistory(item, receipts);
  const { priceHistory, bestMerchant, lowestAvgPrice, merchantAvgPrices } = priceData;

  return (
    <div className="price-prediction-container">
      <h3>Price History for {item}</h3>
      
      <div className="price-chart">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={priceHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="price" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="merchant-comparison">
        <h4>Best Places to Buy</h4>
        <div className="merchant-list">
          {Object.entries(merchantAvgPrices)
            .sort(([, a], [, b]) => a - b)
            .map(([merchant, avgPrice]) => (
              <div key={merchant} className="merchant-item">
                <span className="merchant-name">{merchant}</span>
                <span className="merchant-price">${avgPrice.toFixed(2)}</span>
                {merchant === bestMerchant && (
                  <span className="best-price-badge">Best Price</span>
                )}
              </div>
            ))}
        </div>
      </div>

      <div className="buying-recommendation">
        <h4>When to Buy</h4>
        <p>
          Best time to buy: {getBestTimeRecommendation(priceHistory)}
        </p>
        <p>
          Lowest price found: ${lowestAvgPrice.toFixed(2)} at {bestMerchant}
        </p>
      </div>
    </div>
  );
};

// Helper function to determine the best time to buy based on price history
const getBestTimeRecommendation = (priceHistory) => {
  if (!priceHistory || priceHistory.length < 2) return "Not enough data";

  // Group prices by month
  const monthlyPrices = {};
  priceHistory.forEach(entry => {
    const month = new Date(entry.date).getMonth();
    if (!monthlyPrices[month]) monthlyPrices[month] = [];
    monthlyPrices[month].push(entry.price);
  });

  // Calculate average price per month
  const monthlyAverages = {};
  Object.entries(monthlyPrices).forEach(([month, prices]) => {
    monthlyAverages[month] = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  });

  // Find month with lowest average price
  const bestMonth = Object.entries(monthlyAverages)
    .sort(([, a], [, b]) => a - b)[0][0];

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return months[bestMonth];
};

export default PricePrediction; 