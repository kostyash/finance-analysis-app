import React, { useState, useEffect } from 'react';
import './PortfolioPage.css';
import AddPositionModal from './AddPositionModal';
import EditPositionModal from './EditPositionModal';
import { Position, PositionInput, Portfolio } from '../../types';
import {
  getPortfolios,
  getPositions,
  addPosition,
  updatePosition,
  deletePosition,
  createPortfolio,
} from '../../services/portfolioService';
import { transformPositionsData } from '../../utils/positionUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import PortfolioImport from './PortfolioImport';

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPct: number;
}

const PortfolioPage: React.FC = () => {
  // State for UI controls
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(0);

  // State for data
  const [positions, setPositions] = useState<Position[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('default');

  // Loading and error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingNewPortfolio, setIsCreatingNewPortfolio] = useState<boolean>(false);
  const [newPortfolioName, setNewPortfolioName] = useState<string>('');

  // Fetch portfolios and positions on component mount
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const portfoliosData = await getPortfolios();
        setPortfolios(portfoliosData);

        // If portfolios exist, select the first one (or keep the selected one if it exists)
        if (portfoliosData.length > 0) {
          const portfolioExists = portfoliosData.some((p) => p.portfolioId === selectedPortfolio);
          if (!portfolioExists) {
            setSelectedPortfolio(portfoliosData[0].portfolioId);
          }
        }
      } catch (err) {
        console.error('Error fetching portfolios:', err);
        setError('Failed to load portfolios. Please try again later.');
      }
    };

    fetchPortfolios();
  }, []);

  // Fetch positions when selected portfolio changes
  useEffect(() => {
    const fetchPositions = async () => {
      if (!selectedPortfolio) return;

      try {
        setLoading(true);
        setError(null);

        const positionsData = await getPositions(selectedPortfolio);
        const transformedPositions = transformPositionsData(positionsData);
        setPositions(transformedPositions);
      } catch (err) {
        console.error('Error fetching positions:', err);
        setError('Failed to load positions. Please try again later.');
        setPositions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, [selectedPortfolio]);

  // Handle adding a new position
  const handleAddPosition = async (newPositionInput: PositionInput) => {
    try {
      setLoading(true);

      // Add the position via API
      await addPosition(selectedPortfolio, newPositionInput);

      // Refresh the positions list
      const positionsData = await getPositions(selectedPortfolio);
      const transformedPositions = transformPositionsData(positionsData);
      setPositions(transformedPositions);

      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding position:', err);
      setError('Failed to add position. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a position
  const handleDeletePosition = async (positionIndex: number) => {
    if (!window.confirm('Are you sure you want to delete this position?')) {
      return;
    }

    const positionToDelete = positions[positionIndex];

    try {
      setLoading(true);

      // Delete the position via API
      await deletePosition(selectedPortfolio, positionToDelete.ticker);

      // Refresh the positions list
      const positionsData = await getPositions(selectedPortfolio);
      const transformedPositions = transformPositionsData(positionsData);
      setPositions(transformedPositions);
    } catch (err) {
      console.error('Error deleting position:', err);
      setError('Failed to delete position. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking the edit button for a position
  const handleEditClick = (position: Position, index: number) => {
    setEditingPosition(position);
    setEditingIndex(index);
    setShowEditModal(true);
  };

  // Handle updating a position
  const handleUpdatePosition = async (index: number, updatedPositionInput: PositionInput) => {
    try {
      setLoading(true);

      const positionToUpdate = positions[index];

      // Update the position via API
      await updatePosition(selectedPortfolio, positionToUpdate.ticker, updatedPositionInput);

      // Refresh the positions list
      const positionsData = await getPositions(selectedPortfolio);
      const transformedPositions = transformPositionsData(positionsData);
      setPositions(transformedPositions);

      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating position:', err);
      setError('Failed to update position. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle creating a new portfolio
  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) {
      setError('Portfolio name cannot be empty');
      return;
    }

    try {
      setLoading(true);

      // Create the portfolio via API
      const newPortfolio = await createPortfolio({
        name: newPortfolioName,
        description: `Created on ${new Date().toLocaleDateString()}`,
      });

      // Refresh the portfolios list
      const portfoliosData = await getPortfolios();
      setPortfolios(portfoliosData);

      // Select the new portfolio
      setSelectedPortfolio(newPortfolio.portfolioId);

      // Reset the form
      setNewPortfolioName('');
      setIsCreatingNewPortfolio(false);
    } catch (err) {
      console.error('Error creating portfolio:', err);
      setError('Failed to create portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate portfolio summary
  const summary: PortfolioSummary = {
    totalValue: positions.reduce((sum, pos) => sum + pos.currentValue, 0),
    totalCost: positions.reduce((sum, pos) => sum + pos.purchasePrice * pos.shares, 0),
    totalGainLoss: 0,
    totalGainLossPct: 0,
  };

  summary.totalGainLoss = summary.totalValue - summary.totalCost;
  summary.totalGainLossPct =
    summary.totalCost > 0 ? (summary.totalGainLoss / summary.totalCost) * 100 : 0;

  return (
    <div className="portfolio-page">
      {/* Portfolio Selector */}
      <div className="portfolio-selector">
        <label htmlFor="portfolio-select">Portfolio: </label>
        <select
          id="portfolio-select"
          value={selectedPortfolio}
          onChange={(e) => setSelectedPortfolio(e.target.value)}
          disabled={loading || portfolios.length === 0}
        >
          {portfolios.map((portfolio) => (
            <option key={portfolio.portfolioId} value={portfolio.portfolioId}>
              {portfolio.name}
            </option>
          ))}
        </select>

        {!isCreatingNewPortfolio ? (
          <button className="secondary-button" onClick={() => setIsCreatingNewPortfolio(true)}>
            New Portfolio
          </button>
        ) : (
          <div className="new-portfolio-form">
            <input
              type="text"
              placeholder="Portfolio Name"
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
            />
            <button className="primary-button" onClick={handleCreatePortfolio} disabled={loading}>
              Create
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                setIsCreatingNewPortfolio(false);
                setNewPortfolioName('');
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

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
        <button className="primary-button" onClick={() => setShowAddModal(true)} disabled={loading}>
          Add Position
        </button>
        <PortfolioImport
          portfolioId={selectedPortfolio}
          onImportComplete={() => {
            // Refresh positions after import
            const fetchPositions = async () => {
              try {
                setLoading(true);
                const positionsData = await getPositions(selectedPortfolio);
                const transformedPositions = transformPositionsData(positionsData);
                setPositions(transformedPositions);
              } catch (err) {
                console.error('Error fetching positions:', err);
                setError('Failed to load positions. Please try again later.');
              } finally {
                setLoading(false);
              }
            };

            fetchPositions();
          }}
        />
      </div>

      <div className="portfolio-table-card">
        <h2>Holdings</h2>

        {loading ? (
          <LoadingSpinner />
        ) : positions.length === 0 ? (
          <div className="empty-state">
            <p>No positions in this portfolio yet. Add your first position to get started.</p>
          </div>
        ) : (
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
                  <tr key={position.ticker}>
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
                        disabled={loading}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeletePosition(index)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddPositionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddPosition={handleAddPosition}
        isSubmitting={loading}
      />
      <EditPositionModal
        isOpen={showEditModal}
        position={editingPosition}
        positionIndex={editingIndex}
        onClose={() => setShowEditModal(false)}
        onUpdatePosition={handleUpdatePosition}
        isSubmitting={loading}
      />
    </div>
  );
};

export default PortfolioPage;
