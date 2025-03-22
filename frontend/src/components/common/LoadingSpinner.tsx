// src/components/common/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-spinner">
      <div className="spinner-icon"></div>
      <div className="spinner-message">{message}</div>
    </div>
  );
};

export default LoadingSpinner;
