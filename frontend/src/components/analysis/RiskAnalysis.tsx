// src/components/analysis/RiskAnalysis.tsx
import React, { useEffect, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { getRiskAnalysis } from '../../services/analysisService';
import ErrorMessage from '../common/ErrorMessage';
import LoadingSpinner from '../common/LoadingSpinner';

interface RiskAnalysisProps {
  period: string;
}

const RiskAnalysis: React.FC<RiskAnalysisProps> = ({ period }) => {
  const [riskData, setRiskData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getRiskAnalysis(period);
        setRiskData(data);
      } catch (err) {
        console.error('Error fetching risk analysis:', err);
        setError('Failed to load risk analysis. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period]);

  if (isLoading) {
    return <LoadingSpinner message="Loading risk analysis..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!riskData) {
    return <div className="no-data-message">No risk analysis data available.</div>;
  }

  // Prepare risk breakdown data for pie chart
  const riskBreakdownData = [
    { name: 'Market Risk', value: riskData.riskBreakdown.marketRisk },
    { name: 'Sector Risk', value: riskData.riskBreakdown.sectorRisk },
    { name: 'Specific Risk', value: riskData.riskBreakdown.specificRisk },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  return (
    <div className="risk-analysis-container">
      <div className="risk-metrics">
        <div className="risk-metric-card">
          <h4>Portfolio Beta</h4>
          <div className="risk-metric-value">{riskData.portfolioBeta.toFixed(2)}</div>
          <div className="risk-metric-label">
            {riskData.portfolioBeta > 1 ? 'More volatile than market' : 'Less volatile than market'}
          </div>
        </div>

        <div className="risk-metric-card">
          <h4>Daily Value at Risk (95%)</h4>
          <div className="risk-metric-value negative">
            ${riskData.valueAtRisk.daily.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="risk-metric-label">
            {riskData.valueAtRisk.percentageOfPortfolio.toFixed(2)}% of portfolio
          </div>
        </div>

        <div className="risk-metric-card">
          <h4>10-Day Value at Risk (95%)</h4>
          <div className="risk-metric-value negative">
            ${riskData.valueAtRisk.tenDay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="risk-metric-label">
            {(riskData.valueAtRisk.percentageOfPortfolio * Math.sqrt(10)).toFixed(2)}% of portfolio
          </div>
        </div>
      </div>

      <div className="risk-breakdown">
        <h3>Risk Breakdown</h3>
        <div className="risk-breakdown-chart">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskBreakdownData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {riskBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, '']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="correlation-matrix">
        <h3>Correlation Matrix</h3>
        <div className="correlation-table">
          <table>
            <thead>
              <tr>
                <th></th>
                {riskData.correlationMatrix[0].map((col: any) => (
                  <th key={col.ticker2}>{col.ticker2}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {riskData.correlationMatrix.map((row: any[], rowIndex: number) => (
                <tr key={rowIndex}>
                  <th>{row[0].ticker1}</th>
                  {row.map((cell: any, cellIndex: number) => (
                    <td
                      key={cellIndex}
                      style={{
                        backgroundColor:
                          cell.correlation === 1
                            ? '#f5f5f5'
                            : cell.correlation > 0
                              ? `rgba(0, 255, 0, ${Math.abs(cell.correlation) * 0.3})`
                              : `rgba(255, 0, 0, ${Math.abs(cell.correlation) * 0.3})`,
                      }}
                    >
                      {cell.correlation.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RiskAnalysis;
