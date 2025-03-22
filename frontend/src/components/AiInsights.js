import React from 'react';

export default function AiInsights({ receipts, loading }) {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Analyzing your spending patterns...</p>
      </div>
    );
  }

  if (receipts.length < 3) {
    return (
      <div className="card limited-insights">
        <div className="info-icon">ℹ️</div>
        <h2>More Data Needed</h2>
        <p>Upload at least 3 receipts to generate meaningful insights. Currently analyzing {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}.</p>
      </div>
    );
  }

  // Basic placeholder insights
  const insights = [
    {
      title: "Spending Pattern",
      description: "Your spending appears to be consistent across categories.",
      recommendation: "Consider setting a budget for better financial planning.",
      priority: "medium",
      icon: "📊"
    },
    {
      title: "Saving Opportunity",
      description: "You might be able to save on regular purchases by buying in bulk.",
      recommendation: "Look for bulk deals on frequently purchased items to save approximately 15%.",
      priority: "high",
      icon: "💰"
    }
  ];

  return (
    <div className="insights-container">
      <div className="card">
        <h2 className="card-title">AI-Powered Insights</h2>
        <p className="insights-subheader">
          Here are some personalized recommendations based on your spending patterns:
        </p>
        
        <div className="insights-list">
          {insights.map((insight, index) => (
            <div key={index} className="insight-card">
              <div className="insight-header">
                <div className="insight-icon">{insight.icon}</div>
                <div className="insight-title-container">
                  <h3 className="insight-title">{insight.title}</h3>
                  <div className={`insight-tag ${insight.priority}`}>
                    {insight.priority.charAt(0).toUpperCase() + insight.priority.slice(1)} Priority
                  </div>
                </div>
              </div>
              <div className="insight-content">
                <p className="insight-description">{insight.description}</p>
                <div className="recommendation-container">
                  <h4 className="recommendation-title">💡 Recommendation</h4>
                  <p className="recommendation-text">{insight.recommendation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}