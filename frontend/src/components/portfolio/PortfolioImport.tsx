import React, { useState } from 'react';
import { uploadPortfolioFile } from '../../services/portfolioService';

const PortfolioImport: React.FC<{ portfolioId: string; onImportComplete: () => void }> = ({
  portfolioId,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      await uploadPortfolioFile(portfolioId, file);
      setIsUploading(false);
      setFile(null);
      onImportComplete();
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload portfolio data. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="portfolio-import">
      <h3>Import Portfolio Data</h3>
      <div className="import-form">
        <input
          type="file"
          accept=".xls,.xlsx,.csv"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <button className="primary-button" onClick={handleUpload} disabled={!file || isUploading}>
          {isUploading ? 'Uploading...' : 'Upload and Import'}
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default PortfolioImport;
