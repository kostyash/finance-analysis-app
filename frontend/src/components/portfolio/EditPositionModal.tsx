import React, { useState, useEffect } from 'react';
import './ModalStyles.css';
import { Position, PositionInput } from '../../types';

interface EditPositionModalProps {
  isOpen: boolean;
  position: Position | null;
  onClose: () => void;
  onUpdatePosition: (index: number, position: PositionInput) => void;
  positionIndex: number;
  isSubmitting?: boolean; // Added isSubmitting prop
}

const EditPositionModal: React.FC<EditPositionModalProps> = ({
  isOpen,
  position,
  onClose,
  onUpdatePosition,
  positionIndex,
  isSubmitting = false, // Default to false if not provided
}) => {
  const [formData, setFormData] = useState<PositionInput>({
    ticker: '',
    shares: 0,
    purchasePrice: 0,
    purchaseDate: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (position) {
      setFormData({
        ticker: position.ticker,
        shares: position.shares,
        purchasePrice: position.purchasePrice,
        purchaseDate: position.purchaseDate,
        notes: position.notes,
      });
    }
  }, [position]);

  if (!isOpen || !position) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      onUpdatePosition(positionIndex, {
        ...formData,
        shares: Number(formData.shares),
        purchasePrice: Number(formData.purchasePrice),
      });
      // We no longer close the modal here - it will be closed when the update completes
      // This gives better UX feedback when there are network delays
      // onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Edit Position: {position.ticker}</h2>
          <button className="close-button" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Stock Symbol</label>
            <input
              type="text"
              name="ticker"
              value={formData.ticker}
              onChange={handleChange}
              disabled // Prevent editing the ticker
            />
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
            {errors.purchaseDate && <div className="error">{errors.purchaseDate}</div>}
          </div>

          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPositionModal;
