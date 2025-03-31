import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import api from "../services/api";
import { Tab } from '@headlessui/react';
import UploadForm from "./UploadForm";
import ManualReceiptForm from "./ManualReceiptForm";
import ReceiptList from "./ReceiptList";
import { Upload, PencilLine } from "lucide-react";

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const EnhancedUploadTab = ({ onUpload, receipts, loading, error, onReceiptDeleted }) => {
  const [categories, setCategories] = useState([]);
  const { token, isAuthenticated, user } = useContext(AuthContext);
  
  // Extract unique categories from existing receipts
  useEffect(() => {
    if (receipts && receipts.length > 0) {
      const uniqueCategories = [...new Set(
        receipts
          .filter(receipt => receipt.category)
          .map(receipt => receipt.category)
      )];
      setCategories(uniqueCategories);
    }
  }, [receipts]);
  
  const handleManualSubmit = async (formData) => {
    try {
      // Check if user is authenticated
      if (!isAuthenticated) {
        toast.error('You must be logged in to add receipts');
        return;
      }
      
      // Create a FormData object to maintain consistency with file uploads
      const formDataObj = new FormData();
      
      // Add the manual receipt data as a JSON string
      formDataObj.append('manualReceiptData', JSON.stringify(formData));
      
      // Add the user ID to associate the receipt with the logged-in user
      if (user && user._id) {
        formDataObj.append('userId', user._id);
      }
      
      console.log("Sending form data:", formData); // Debug what's being sent
      
      // Send to the backend with authentication
      const response = await fetch(`${process.env.REACT_APP_API_URL}/add-manual-receipt`, {
        method: 'POST',
        body: formDataObj,
        headers: {
          'Authorization': `Bearer ${token}` // Include auth token
          // Do NOT set Content-Type header for FormData - browser will set it with the proper boundary
        }
      });
      
      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          toast.error('Authentication failed. Please log in again.');
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save manual receipt');
      }
      
      const data = await response.json();
      
      // Notify parent component about the new receipt
      onUpload(data);
      
      // Show success message using toast instead of alert
      toast.success('Receipt added successfully!');
    } catch (err) {
      console.error('Error adding manual receipt:', err);
      toast.error(`Failed to add receipt: ${err.message}`);
    }
  };
  
  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="upload-tab-container">
        <div className="auth-required-message">
          <h3>Authentication Required</h3>
          <p>You need to be logged in to manage receipts.</p>
          <button 
            className="login-button" 
            onClick={() => window.location.href = '/login'}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="upload-tab-container">
      <Tab.Group>
        <Tab.List className="upload-tab-list">
          <Tab
            className={({ selected }) =>
              classNames(
                'upload-tab',
                selected
                  ? 'active-tab'
                  : 'inactive-tab'
              )
            }
          >
            <Upload size={18} />
            <span>Scan Receipt</span>
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'upload-tab',
                selected
                  ? 'active-tab'
                  : 'inactive-tab'
              )
            }
          >
            <PencilLine size={18} />
            <span>Manual Entry</span>
          </Tab>
        </Tab.List>
        <Tab.Panels className="upload-tab-panels">
          <Tab.Panel>
            <UploadForm onUpload={onUpload} />
          </Tab.Panel>
          <Tab.Panel>
            <ManualReceiptForm onSubmit={handleManualSubmit} categories={categories} />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
      
      <div className="receipt-list-section">
        <ReceiptList
          receipts={receipts}
          loading={loading}
          error={error}
          onReceiptDeleted={onReceiptDeleted}
        />
      </div>
    </div>
  );
};

export default EnhancedUploadTab;