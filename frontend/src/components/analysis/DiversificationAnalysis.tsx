// src/components/analysis/DiversificationAnalysis.tsx
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getDiversificationAnalysis } from '../../services/analysisService';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const SECTOR_COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
  '#FFC658',
  '#8DD1E1',
  '#A4DE6C',
  '#D0ED57',
];

const ASSET_CLASS_COLORS = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
];

const DiversificationAnalysis: React.FC = () => {
  const [diversificationData, setDiversificationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getDiversificationAnalysis();
        setDiversificationData(data);
      } catch (err) {
        console.error('Error fetching diversification analysis:', err);
        setError('Failed to load diversification analysis. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Loading diversification analysis..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!diversificationData) {
    return <div className="no-data-message">No diversification data available.</div>;
  }

  const formatPieData = (data: any[]) => {
    return data.map((item) => ({
      name: item.sector || item.assetClass,
      value: item.percentage,
    }));
  };

  const sectorPieData = formatPieData(diversificationData.sectorAllocation);
  const assetClassPieData = formatPieData(diversificationData.assetClassAllocation);

  const determineScoreCategory = (score: number) => {
    if (score >= 80) return { text: 'Excellent', color: '#52c41a' };
    if (score >= 60) return { text: 'Good', color: '#1890ff' };
    if (score >= 40) return { text: 'Moderate', color: '#faad14' };
    return { text: 'Needs Improvement', color: '#f5222d' };
  };

  const scoreCategory = determineScoreCategory(diversificationData.diversificationScore);

  return (
    <div className="diversification-container">
      <div className="allocation-chart">
        <div className="allocation-chart-container">
          <h3>Sector Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sectorPieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sectorPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${(value as number).toFixed(2)}%`, '']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="allocation-chart-container">
          <h3>Asset Class Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetClassPieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {assetClassPieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={ASSET_CLASS_COLORS[index % ASSET_CLASS_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${(value as number).toFixed(2)}%`, '']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="concentration-metrics">
        <h3>Concentration Metrics</h3>
        <div className="metric-grid">
          <div className="metric-item">
            <div className="metric-label">Top Holding</div>
            <div className="metric-value">
              {diversificationData.concentration.topHolding.toFixed(2)}%
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Top 3 Holdings</div>
            <div className="metric-value">
              {diversificationData.concentration.top3Holdings.toFixed(2)}%
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Top 5 Holdings</div>
            <div className="metric-value">
              {diversificationData.concentration.top5Holdings.toFixed(2)}%
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Number of Positions</div>
            <div className="metric-value">
              {diversificationData.concentration.numberOfPositions}
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">HHI Index</div>
            <div className="metric-value">{diversificationData.concentration.hhi.toFixed(0)}</div>
            <div className="metric-description">
              {diversificationData.concentration.hhi < 1000
                ? 'Low Concentration'
                : diversificationData.concentration.hhi < 1800
                  ? 'Moderate Concentration'
                  : 'High Concentration'}
            </div>
          </div>
        </div>
      </div>

      <div className="diversification-score">
        <h3>Overall Diversification Score</h3>
        <div className="diversification-score-value" style={{ color: scoreCategory.color }}>
          {diversificationData.diversificationScore}
        </div>
        <div className="diversification-score-label">{scoreCategory.text}</div>
      </div>
    </div>
  );
};

export default DiversificationAnalysis;
