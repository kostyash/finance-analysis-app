// src/components/analysis/PerformanceChart.tsx
import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getPortfolioPerformance } from '../../services/analysisService';

interface PerformanceChartProps {
  period: string;
}

interface PerformanceSummary {
  initialValue: number;
  currentValue: number;
  absoluteReturn: number;
  percentageReturn: number;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
  timeSeries: {
    date: string;
    value: number;
  }[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ period }) => {
  const [performanceData, setPerformanceData] = useState<PerformanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getPortfolioPerformance(period);
        setPerformanceData(data);
      } catch (err) {
        console.error('Error fetching performance data:', err);
        setError('Failed to load performance data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period]);

  if (isLoading) {
    return <div className="loading-spinner">Loading performance data...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!performanceData) {
    return <div className="no-data-message">No performance data available.</div>;
  }

  // Format dates for display
  const formattedData = performanceData.timeSeries.map((point) => ({
    ...point,
    date: new Date(point.date).toLocaleDateString(),
  }));

  return (
    <div className="performance-chart-container">
      <div className="performance-summary">
        <div className="summary-card">
          <h3>Performance Summary</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-label">Initial Value</div>
              <div className="stat-value">
                $
                {performanceData.initialValue.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Current Value</div>
              <div className="stat-value">
                $
                {performanceData.currentValue.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Return</div>
              <div
                className={`stat-value ${performanceData.absoluteReturn >= 0 ? 'positive' : 'negative'}`}
              >
                $
                {performanceData.absoluteReturn.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
                <span className="percentage">({performanceData.percentageReturn.toFixed(2)}%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <h3>Risk Metrics</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-label">Volatility</div>
              <div className="stat-value">{performanceData.volatility.toFixed(2)}%</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Max Drawdown</div>
              <div className="stat-value negative">{performanceData.maxDrawdown.toFixed(2)}%</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Sharpe Ratio</div>
              <div className={`stat-value ${performanceData.sharpeRatio >= 1 ? 'positive' : ''}`}>
                {performanceData.sharpeRatio.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Portfolio Value Over Time</h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={formattedData}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(tick) => tick} minTickGap={30} />
            <YAxis
              tickFormatter={(tick) =>
                `$${tick.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              }
            />
            <Tooltip
              formatter={(value: number) => [
                `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                'Portfolio Value',
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="value"
              name="Portfolio Value"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PerformanceChart;
