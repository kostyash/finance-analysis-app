import React from 'react';
import './CommonStyles.css';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss, onRetry }) => {
  return (
    <div className="error-message">
      <div className="error-icon">⚠️</div>
      <div className="error-content">
        <div className="error-text">{message}</div>
        <div className="error-actions">
          {onRetry && (
            <button className="error-retry-button" onClick={onRetry}>
              Try Again
            </button>
          )}
          {onDismiss && (
            <button className="error-dismiss-button" onClick={onDismiss}>
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
