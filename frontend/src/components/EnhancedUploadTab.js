import React, { useState } from "react";
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
  
  // Extract unique categories from existing receipts
  React.useEffect(() => {
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
      // Create a FormData object to maintain consistency with file uploads
      const formDataObj = new FormData();
      
      // Add the manual receipt data as a JSON string
      formDataObj.append('manualReceiptData', JSON.stringify(formData));
      
      console.log("Sending form data:", formData); // Debug what's being sent
      
      // Send to the backend
      const response = await fetch('https://smart-ledger-production.up.railway.app/add-manual-receipt', {
        method: 'POST',
        body: formDataObj,
        // Do NOT set Content-Type header - the browser will set it with the proper boundary
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save manual receipt');
      }
      
      const data = await response.json();
      
      // Notify parent component about the new receipt
      onUpload(data);
      
      // Show success message
      alert('Receipt added successfully!');
    } catch (err) {
      console.error('Error adding manual receipt:', err);
      alert(`Failed to add receipt: ${err.message}`);
    }
  };
  
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