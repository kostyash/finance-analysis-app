// src/components/analysis/BenchmarkComparison.tsx
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getBenchmarkComparison } from '../../services/analysisService';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

interface BenchmarkComparisonProps {
  period: string;
  benchmark: string;
}

const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = ({ period, benchmark }) => {
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getBenchmarkComparison(period, benchmark);
        setComparisonData(data);
      } catch (err) {
        console.error('Error fetching benchmark comparison:', err);
        setError('Failed to load benchmark comparison. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period, benchmark]);

  if (isLoading) {
    return <LoadingSpinner message="Loading benchmark comparison..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!comparisonData) {
    return <div className="no-data-message">No benchmark comparison data available.</div>;
  }

  // Normalize values for percentage chart (start at 100%)
  const firstPortfolioValue = comparisonData.portfolioTimeSeries[0].value;
  const firstBenchmarkValue = comparisonData.benchmarkTimeSeries[0].value;

  const normalizedChartData = comparisonData.portfolioTimeSeries.map(
    (point: any, index: number) => {
      const benchmarkPoint = comparisonData.benchmarkTimeSeries[index];
      return {
        date: new Date(point.date).toLocaleDateString(),
        portfolio: (point.value / firstPortfolioValue) * 100,
        benchmark: (benchmarkPoint.value / firstBenchmarkValue) * 100,
      };
    }
  );

  return (
    <div className="benchmark-comparison-container">
      <div className="comparison-summary">
        <div className="summary-card">
          <h3>Performance vs {benchmark}</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-label">Portfolio Return</div>
              <div
                className={`stat-value ${comparisonData.portfolioReturn >= 0 ? 'positive' : 'negative'}`}
              >
                {comparisonData.portfolioReturn.toFixed(2)}%
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Benchmark Return</div>
              <div
                className={`stat-value ${comparisonData.benchmarkReturn >= 0 ? 'positive' : 'negative'}`}
              >
                {comparisonData.benchmarkReturn.toFixed(2)}%
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Alpha</div>
              <div className={`stat-value ${comparisonData.alpha >= 0 ? 'positive' : 'negative'}`}>
                {comparisonData.alpha.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <h3>Risk Metrics</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-label">Tracking Error</div>
              <div className="stat-value">{comparisonData.trackingError.toFixed(2)}%</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Information Ratio</div>
              <div
                className={`stat-value ${comparisonData.informationRatio >= 0 ? 'positive' : 'negative'}`}
              >
                {comparisonData.informationRatio.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Normalized Performance (Starting at 100%)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={normalizedChartData}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" minTickGap={30} />
            <YAxis tickFormatter={(tick) => `${tick}%`} />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="portfolio"
              name="Portfolio"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
            />
            <Line type="monotone" dataKey="benchmark" name={benchmark} stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BenchmarkComparison;
