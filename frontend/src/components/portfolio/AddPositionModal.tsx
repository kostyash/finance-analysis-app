import React, { useState } from 'react';
import './ModalStyles.css';
import { PositionInput } from '../../types';
import { getStockData } from '../../services/stockService';

interface AddPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPosition: (position: PositionInput) => void;
}

const AddPositionModal: React.FC<AddPositionModalProps> = ({ isOpen, onClose, onAddPosition }) => {
  const [formData, setFormData] = useState<PositionInput>({
    ticker: '',
    shares: 0,
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [stockDataLoaded, setStockDataLoaded] = useState<boolean>(false);
  const [stockLookupError, setStockLookupError] = useState<string>('');

  if (!isOpen) return null;

  const lookupStockData = async () => {
    if (!formData.ticker) {
      setStockLookupError('Please enter a stock symbol');
      return;
    }

    setIsLookingUp(true);
    setStockLookupError('');
    setStockDataLoaded(false);

    try {
      const data = await getStockData(formData.ticker);

      // Update form with current price
      setFormData((prev) => ({
        ...prev,
        purchasePrice: data.price,
      }));

      setStockDataLoaded(true);
    } catch (error) {
      setStockLookupError('Could not find stock data. Please check the symbol.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'ticker' ? value.toUpperCase() : value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.ticker) {
      newErrors.ticker = 'Stock symbol is required';
    }

    if (!formData.shares || formData.shares <= 0) {
      newErrors.shares = 'Number of shares must be greater than 0';
    }

    if (!formData.purchasePrice || formData.purchasePrice <= 0) {
      newErrors.purchasePrice = 'Purchase price must be greater than 0';
    }

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onAddPosition({
        ...formData,
        shares: Number(formData.shares),
        purchasePrice: Number(formData.purchasePrice),
      });
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Add New Position</h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Stock Symbol</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                name="ticker"
                value={formData.ticker}
                onChange={handleChange}
                placeholder="e.g., AAPL"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="secondary-button"
                onClick={lookupStockData}
                disabled={isLookingUp || !formData.ticker}
              >
                {isLookingUp ? 'Loading...' : 'Lookup'}
              </button>
            </div>
            {stockLookupError && <div className="error">{stockLookupError}</div>}
            {stockDataLoaded && (
              <div style={{ color: '#52c41a', fontSize: '12px', marginTop: '5px' }}>
                Current price loaded
              </div>
            )}
            {errors.ticker && <div className="error">{errors.ticker}</div>}
          </div>

          <div className="form-group">
            <label>Number of Shares</label>
            <input
              type="number"
              name="shares"
              value={formData.shares}
              onChange={handleChange}
              step="0.01"
              min="0.01"
            />
            {errors.shares && <div className="error">{errors.shares}</div>}
          </div>

          <div className="form-group">
            <label>Purchase Price (per share)</label>
            <input
              type="number"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleChange}
              step="0.01"
              min="0.01"
            />
            {errors.purchasePrice && <div className="error">{errors.purchasePrice}</div>}
          </div>

          <div className="form-group">
            <label>Purchase Date</label>
            <input
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleChange}
            />
            {errors.purchaseDate && <div className="error">{errors.purchaseDate}</div>}
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Add Position
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPositionModal;
