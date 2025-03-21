import React, { useState } from 'react';
import './PortfolioPage.css';
import AddPositionModal from './AddPositionModal';
import EditPositionModal from './EditPositionModal';
import { Position, PositionInput } from '../../types';

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPct: number;
}

const PortfolioPage: React.FC = () => {
  // Mock data for now - later we'll fetch this from API
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([
    {
      ticker: 'AAPL',
      shares: 10,
      purchasePrice: 150.25,
      purchaseDate: '2023-01-15',
      currentPrice: 175.75,
      currentValue: 1757.5,
      gainLoss: 255.0,
      gainLossPct: 16.97,
    },
    {
      ticker: 'MSFT',
      shares: 5,
      purchasePrice: 305.75,
      purchaseDate: '2023-01-20',
      currentPrice: 364.3,
      currentValue: 1821.5,
      gainLoss: 292.75,
      gainLossPct: 19.15,
    },
  ]);

  const handleAddPosition = (newPosition: PositionInput) => {
    // In a real app, you would fetch the current price from an API
    // For now, we'll use a mock price
    const mockCurrentPrice = newPosition.purchasePrice * (1 + Math.random() * 0.2 - 0.1);
    const currentValue = mockCurrentPrice * newPosition.shares;
    const gainLoss = currentValue - newPosition.purchasePrice * newPosition.shares;
    const gainLossPct = (gainLoss / (newPosition.purchasePrice * newPosition.shares)) * 100;

    const fullPosition: Position = {
      ...newPosition,
      currentPrice: mockCurrentPrice,
      currentValue,
      gainLoss,
      gainLossPct,
    };

    setPositions([...positions, fullPosition]);
  };

  const handleDeletePosition = (indexToDelete: number) => {
    if (window.confirm('Are you sure you want to delete this position?')) {
      const updatedPositions = positions.filter((_, index) => index !== indexToDelete);
      setPositions(updatedPositions);
    }
  };

  const handleEditClick = (position: Position, index: number) => {
    setEditingPosition(position);
    setEditingIndex(index);
    setShowEditModal(true);
  };

  const handleUpdatePosition = (index: number, updatedPosition: PositionInput) => {
    // In a real app, you would fetch the current price from an API
    // For now, we'll keep the current price the same
    const currentPrice = positions[index].currentPrice;
    const currentValue = currentPrice * updatedPosition.shares;
    const gainLoss = currentValue - updatedPosition.purchasePrice * updatedPosition.shares;
    const gainLossPct = (gainLoss / (updatedPosition.purchasePrice * updatedPosition.shares)) * 100;

    const fullPosition: Position = {
      ...updatedPosition,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPct,
    };

    const newPositions = [...positions];
    newPositions[index] = fullPosition;
    setPositions(newPositions);
  };

  // Calculate summary
  const summary: PortfolioSummary = {
    totalValue: positions.reduce((sum, pos) => sum + pos.currentValue, 0),
    totalCost: positions.reduce((sum, pos) => sum + pos.purchasePrice * pos.shares, 0),
    totalGainLoss: 0,
    totalGainLossPct: 0,
  };

  summary.totalGainLoss = summary.totalValue - summary.totalCost;
  summary.totalGainLossPct = (summary.totalGainLoss / summary.totalCost) * 100;

  return (
    <div className="portfolio-page">
      <div className="simulation-banner">
        <h3>Simulation Mode</h3>
        <p>
          You are using a hypothetical portfolio simulator. All positions and performance data are
          simulated.
        </p>
      </div>

      <div className="summary-card">
        <h2>Portfolio Summary</h2>
        <div className="summary-stats">
          <div className="stat-item">
            <div className="stat-label">Total Value</div>
            <div className="stat-value">${summary.totalValue.toFixed(2)}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Cost</div>
            <div className="stat-value">${summary.totalCost.toFixed(2)}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Gain/Loss</div>
            <div className={`stat-value ${summary.totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
              ${summary.totalGainLoss.toFixed(2)}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Return</div>
            <div
              className={`stat-value ${summary.totalGainLossPct >= 0 ? 'positive' : 'negative'}`}
            >
              {summary.totalGainLossPct.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="primary-button" onClick={() => setShowAddModal(true)}>
          Add Position
        </button>
        <button className="secondary-button">Import Positions</button>
        <button className="secondary-button">Load Demo</button>
      </div>

      <div className="portfolio-table-card">
        <h2>Holdings</h2>
        <div className="portfolio-table">
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Shares</th>
                <th>Avg Cost</th>
                <th>Current</th>
                <th>Value</th>
                <th>Gain/Loss</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position, index) => (
                <tr key={index}>
                  <td>{position.ticker}</td>
                  <td>{position.shares}</td>
                  <td>${position.purchasePrice.toFixed(2)}</td>
                  <td>${position.currentPrice.toFixed(2)}</td>
                  <td>${position.currentValue.toFixed(2)}</td>
                  <td className={position.gainLoss >= 0 ? 'positive' : 'negative'}>
                    {position.gainLossPct.toFixed(2)}%
                  </td>
                  <td>
                    <button
                      className="edit-button"
                      onClick={() => handleEditClick(position, index)}
                    >
                      Edit
                    </button>
                    <button className="delete-button" onClick={() => handleDeletePosition(index)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AddPositionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddPosition={handleAddPosition}
      />
      <EditPositionModal
        isOpen={showEditModal}
        position={editingPosition}
        positionIndex={editingIndex}
        onClose={() => setShowEditModal(false)}
        onUpdatePosition={handleUpdatePosition}
      />
    </div>
  );
};

export default PortfolioPage;
