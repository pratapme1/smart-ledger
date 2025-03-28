import React, { useState, useRef } from "react";
import { Upload, FileUp, X, Info, Check, AlertTriangle } from "lucide-react";

export default function UploadForm({ onUpload }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles([...e.target.files]);
      setError(null);
      setUploadSuccess(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles([...e.dataTransfer.files]);
      setError(null);
      setUploadSuccess(false);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file!");
      return;
    }

    const formData = new FormData();
    const isMultiple = files.length > 1;
    
    files.forEach((file) => {
      formData.append(isMultiple ? "files" : "file", file);
    });

    setUploading(true);
    setError(null);
    setUploadSuccess(false);
    setUploadProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + (100 - prev) * 0.1;
        return newProgress > 95 ? 95 : newProgress;
      });
    }, 300);

    try {
      const endpoint = isMultiple ? "upload-multiple-receipts" : "upload-receipt";
      const response = await fetch(`http://smart-ledger-production.up.railway.app/${endpoint}`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (response.ok) {
        onUpload(data);
        setFiles([]);
        setUploadSuccess(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setUploadSuccess(false);
          setUploadProgress(0);
        }, 3000);
      } else {
        throw new Error(data.message || "Upload failed.");
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card upload-card">
      <h2 className="card-title">
        <FileUp className="card-title-icon" size={20} />
        Upload Receipts
      </h2>
      
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`upload-area ${dragActive ? 'active' : ''} ${files.length > 0 ? 'has-files' : ''}`}
      >
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="file-upload"
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/jpg,application/pdf"
        />
        <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block', width: '100%', height: '100%' }}>
          {files.length > 0 ? (
            <div>
              <div className="upload-icon">
                <Check size={32} color="#10b981" />
              </div>
              <p className="upload-text">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
              <p className="upload-subtext">Click to add more</p>
            </div>
          ) : (
            <div>
              <div className="upload-icon">
                <Upload size={32} color="#9ca3af" />
              </div>
              <p className="upload-text">Drop files here or click to browse</p>
              <p className="upload-subtext">Supports JPG, PNG, PDF</p>
            </div>
          )}
        </label>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {Array.from(files).map((file, i) => (
            <div key={i} className="file-item">
              <div className="file-item-details">
                <span className="file-item-name">{file.name}</span>
                <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
              <button 
                className="file-remove-btn"
                onClick={(e) => {
                  e.preventDefault();
                  removeFile(i);
                }}
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {uploadProgress < 100 ? 'Processing...' : 'Finalizing...'}
          </div>
        </div>
      )}

      <div className="upload-actions">
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="button button-primary"
        >
          {uploading ? (
            <span className="button-content">
              <span className="spinner"></span> Uploading...
            </span>
          ) : (
            <span className="button-content">
              <Upload size={16} />
              Upload {files.length > 0 ? `${files.length} File${files.length !== 1 ? 's' : ''}` : ''}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <AlertTriangle size={16} className="error-icon" />
          {error}
        </div>
      )}
      
      {uploadSuccess && (
        <div className="success-message">
          <Check size={16} className="success-icon" />
          Upload successful! Receipts are being processed.
        </div>
      )}
      
      <div className="upload-tips">
        <h3><Info size={14} className="tip-icon" /> Tips for Better Recognition:</h3>
        <ul>
          <li>Ensure receipts are well-lit and clear</li>
          <li>Avoid shadows and glare on the receipt</li>
          <li>Capture the entire receipt in the image</li>
          <li>Digital receipts (PDFs) typically provide better results</li>
        </ul>
      </div>
    </div>
  );
}