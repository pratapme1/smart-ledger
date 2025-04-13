// src/components/insights/ReceiptInsights.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './ReceiptInsights.css';

const ReceiptInsights = () => {
  const { receiptId } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('pending');

  // Fetch receipt insights
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/insights/receipt/${receiptId}`);
        
        setReceipt(response.data.receipt);
        setInsights(response.data.insights);
        setProcessingStatus(response.data.insightStatus);
        
        // If insights are still processing, poll for updates
        if (response.data.insightStatus === 'processing') {
          const interval = setInterval(async () => {
            try {
              const pollResponse = await axios.get(`/api/insights/receipt/${receiptId}`);
              
              if (pollResponse.data.insightStatus !== 'processing') {
                setReceipt(pollResponse.data.receipt);
                setInsights(pollResponse.data.insights);
                setProcessingStatus(pollResponse.data.insightStatus);
                clearInterval(interval);
              }
            } catch (pollError) {
              console.error('Error polling insights:', pollError);
              clearInterval(interval);
            }
          }, 5000); // Poll every 5 seconds
          
          // Clear interval on component unmount
          return () => clearInterval(interval);
        }
      } catch (err) {
        console.error('Error fetching receipt insights:', err);
        setError('Failed to load insights');
        toast.error('Could not load receipt insights');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
  }, [receiptId]);

  // Generate insights for this receipt
  const generateInsights = async () => {
    try {
      setLoading(true);
      setProcessingStatus('processing');
      
      await axios.post(`/api/insights/generate/${receiptId}`);
      
      toast.info('Insights generation has started. This may take a few moments.');
      
      // Poll for updates
      const interval = setInterval(async () => {
        try {
          const response = await axios.get(`/api/insights/receipt/${receiptId}`);
          
          if (response.data.insightStatus !== 'processing') {
            setReceipt(response.data.receipt);
            setInsights(response.data.insights);
            setProcessingStatus(response.data.insightStatus);
            clearInterval(interval);
            
            if (response.data.insightStatus === 'completed') {
              toast.success('Insights generated successfully');
            } else {
              toast.error('Failed to generate insights');
            }
          }
        } catch (pollError) {
          console.error('Error polling insights:', pollError);
          clearInterval(interval);
        }
      }, 5000); // Poll every 5 seconds
      
      // Clear interval after 60 seconds (failsafe)
      setTimeout(() => clearInterval(interval), 60000);
      
    } catch (err) {
      console.error('Error generating insights:', err);
      setError('Failed to generate insights');
      toast.error('Could not generate insights');
      setProcessingStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !receipt) {
    return <div className="insights-loading">Loading receipt insights...</div>;
  }

  if (error && !receipt) {
    return (
      <div className="insights-error">
        <h3>Error Loading Insights</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="insights-not-found">
        <h3>Receipt Not Found</h3>
        <p>The requested receipt could not be found.</p>
        <Link to="/receipts">Back to Receipts</Link>
      </div>
    );
  }

  return (
    <div className="receipt-insights-container">
      <div className="receipt-details">
        <h2>Receipt Insights</h2>
        <div className="receipt-meta">
          <p><strong>Date:</strong> {new Date(receipt.date).toLocaleDateString()}</p>
          <p><strong>Merchant:</strong> {receipt.merchant || 'Not specified'}</p>
          <p><strong>Total:</strong> ${receipt.total?.toFixed(2) || '0.00'}</p>
        </div>
        
        {processingStatus === 'pending' && (
          <div className="insights-actions">
            <p>This receipt hasn't been analyzed yet.</p>
            <button 
              className="generate-insights-btn" 
              onClick={generateInsights}
              disabled={loading}
            >
              Generate Insights
            </button>
          </div>
        )}
        
        {processingStatus === 'processing' && (
          <div className="insights-processing">
            <div className="spinner"></div>
            <p>Analyzing your receipt... This usually takes less than a minute.</p>
          </div>
        )}
        
        {processingStatus === 'failed' && (
          <div className="insights-failed">
            <p>We couldn't analyze this receipt. Please try again.</p>
            <button 
              className="generate-insights-btn" 
              onClick={generateInsights}
              disabled={loading}
            >
              Retry Analysis
            </button>
          </div>
        )}
        
        {processingStatus === 'completed' && (
          <>
            <h3>Items Analysis</h3>
            <div className="items-list">
              {receipt.items.map((item, index) => (
                <div className="item-card" key={index}>
                  <div className="item-header">
                    <h4>{item.name}</h4>
                    <span className="item-price">${item.price?.toFixed(2) || '0.00'}</span>
                  </div>
                  
                  <div className="item-details">
                    {item.category && (
                      <span className="item-category">
                        {item.category}
                      </span>
                    )}
                    
                    {item.isRecurring && (
                      <span className="recurring-badge">Recurring</span>
                    )}
                  </div>
                  
                  {item.gptInsight && (
                    <div className="item-insight">
                      <p>{item.gptInsight}</p>
                    </div>
                  )}
                  
                  {item.savings > 0 && (
                    <div className="savings-alert">
                      <span>💰 Potential Savings: ${item.savings.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {insights.length > 0 && (
              <div className="insights-summary">
                <h3>Summary</h3>
                <ul>
                  {insights.some(i => i.savings > 0) && (
                    <li>
                      <strong>Potential Savings:</strong> $
                      {insights.reduce((total, insight) => total + (insight.savings || 0), 0).toFixed(2)}
                    </li>
                  )}
                  
                  {insights.some(i => i.isRecurring) && (
                    <li>
                      <strong>Recurring Items:</strong> {insights.filter(i => i.isRecurring).length}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReceiptInsights;