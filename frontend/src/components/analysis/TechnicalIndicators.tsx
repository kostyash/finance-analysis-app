// src/components/analysis/TechnicalIndicators.tsx
import React, { useEffect, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getTechnicalIndicators } from '../../services/analysisService';
import ErrorMessage from '../common/ErrorMessage';
import LoadingSpinner from '../common/LoadingSpinner';

interface TechnicalIndicatorsProps {
  ticker: string;
}

interface IndicatorData {
  ticker: string;
  indicators: {
    sma: { date: string; sma: number }[];
    ema: { date: string; ema: number }[];
    rsi: { date: string; rsi: number }[];
    macd: { date: string; macd: number; signal: number; histogram: number }[];
    bollinger: { date: string; middle: number; upper: number; lower: number }[];
  };
}

const TechnicalIndicators: React.FC<TechnicalIndicatorsProps> = ({ ticker }) => {
  const [indicatorData, setIndicatorData] = useState<IndicatorData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndicator, setActiveIndicator] = useState<string>('sma');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getTechnicalIndicators(ticker);
        setIndicatorData(data);
      } catch (err) {
        console.error('Error fetching technical indicators:', err);
        setError('Failed to load technical indicators. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  if (isLoading) {
    return <LoadingSpinner message="Loading technical indicators..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!indicatorData) {
    return <div className="no-data-message">No technical data available.</div>;
  }

  // Format dates for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  interface HistogramEntry {
    histogram: number;
  }

  const getHistogramColor = (entry: HistogramEntry) => {
    return entry.histogram >= 0 ? '#4caf50' : '#f44336';
  };

  return (
    <div className="technical-indicators-container">
      <div className="indicator-selector">
        <button
          className={activeIndicator === 'sma' ? 'active' : ''}
          onClick={() => setActiveIndicator('sma')}
        >
          Simple Moving Average
        </button>
        <button
          className={activeIndicator === 'ema' ? 'active' : ''}
          onClick={() => setActiveIndicator('ema')}
        >
          Exponential Moving Average
        </button>
        <button
          className={activeIndicator === 'rsi' ? 'active' : ''}
          onClick={() => setActiveIndicator('rsi')}
        >
          Relative Strength Index
        </button>
        <button
          className={activeIndicator === 'macd' ? 'active' : ''}
          onClick={() => setActiveIndicator('macd')}
        >
          MACD
        </button>
        <button
          className={activeIndicator === 'bollinger' ? 'active' : ''}
          onClick={() => setActiveIndicator('bollinger')}
        >
          Bollinger Bands
        </button>
      </div>

      <div className="indicator-explanation">
        <h3>{getIndicatorTitle(activeIndicator)}</h3>
        <p>{getIndicatorDescription(activeIndicator)}</p>
      </div>

      <div className="chart-container">
        {activeIndicator === 'sma' && (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={indicatorData.indicators.sma.map((point) => ({
                ...point,
                date: formatDate(point.date),
              }))}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={30} />
              <YAxis />
              <Tooltip formatter={(value) => [`$${(value as number).toFixed(2)}`, '20-Day SMA']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="sma"
                name="20-Day SMA"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeIndicator === 'ema' && (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={indicatorData.indicators.ema.map((point) => ({
                ...point,
                date: formatDate(point.date),
              }))}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={30} />
              <YAxis />
              <Tooltip formatter={(value) => [`$${(value as number).toFixed(2)}`, '20-Day EMA']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="ema"
                name="20-Day EMA"
                stroke="#82ca9d"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeIndicator === 'rsi' && (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={indicatorData.indicators.rsi.map((point) => ({
                ...point,
                date: formatDate(point.date),
              }))}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={30} />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${(value as number).toFixed(2)}`, 'RSI (14)']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="rsi"
                name="RSI (14)"
                stroke="#ff7300"
                activeDot={{ r: 8 }}
              />
              {/* Add reference lines for overbought/oversold levels */}
              <Line
                dataKey={() => 70}
                stroke="red"
                strokeDasharray="3 3"
                name="Overbought (70)"
                dot={false}
              />
              <Line
                dataKey={() => 30}
                stroke="green"
                strokeDasharray="3 3"
                name="Oversold (30)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeIndicator === 'macd' && (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={indicatorData.indicators.macd.map((point) => ({
                ...point,
                date: formatDate(point.date),
              }))}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={30} />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${(value as number).toFixed(4)}`, '']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="macd" name="MACD Line" stroke="#2196f3" dot={false} />
              <Line
                type="monotone"
                dataKey="signal"
                name="Signal Line"
                stroke="#f50057"
                dot={false}
              />
              <Bar dataKey="histogram" name="Histogram" fill="#8884d8" opacity={0.5}>
                {indicatorData.indicators.macd.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getHistogramColor(entry)} />
                ))}
              </Bar>
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeIndicator === 'bollinger' && (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={indicatorData.indicators.bollinger.map((point) => ({
                ...point,
                date: formatDate(point.date),
              }))}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={30} />
              <YAxis />
              <Tooltip formatter={(value) => [`${(value as number).toFixed(2)}`, '']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="upper"
                name="Upper Band"
                stroke="#ff7300"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="middle"
                name="Middle Band (SMA)"
                stroke="#8884d8"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="lower"
                name="Lower Band"
                stroke="#82ca9d"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// Helper functions for indicator descriptions
const getIndicatorTitle = (indicator: string): string => {
  switch (indicator) {
    case 'sma':
      return 'Simple Moving Average (SMA)';
    case 'ema':
      return 'Exponential Moving Average (EMA)';
    case 'rsi':
      return 'Relative Strength Index (RSI)';
    case 'macd':
      return 'Moving Average Convergence Divergence (MACD)';
    case 'bollinger':
      return 'Bollinger Bands';
    default:
      return '';
  }
};

const getIndicatorDescription = (indicator: string): string => {
  switch (indicator) {
    case 'sma':
      return 'The Simple Moving Average (SMA) calculates the average price over a specific period. This chart shows the 20-day SMA, which is the average price over the last 20 days. The SMA helps identify the overall trend direction.';
    case 'ema':
      return 'The Exponential Moving Average (EMA) gives more weight to recent prices, making it more responsive to new information than the SMA. This chart shows the 20-day EMA, which reacts more quickly to price changes than a 20-day SMA.';
    case 'rsi':
      return 'The Relative Strength Index (RSI) measures the speed and change of price movements on a scale from 0 to 100. RSI values above 70 generally indicate overbought conditions, while values below 30 indicate oversold conditions. This chart shows the 14-day RSI.';
    case 'macd':
      return 'The Moving Average Convergence Divergence (MACD) is a trend-following momentum indicator that shows the relationship between two moving averages. The MACD line is the difference between the 12-day and 26-day EMAs. The signal line is a 9-day EMA of the MACD line. The histogram represents the difference between the MACD and signal lines.';
    case 'bollinger':
      return 'Bollinger Bands consist of a middle band (20-day SMA) with upper and lower bands at 2 standard deviations from the middle band. They help identify volatility and potential overbought/oversold conditions. When prices move close to the upper band, the market may be overbought; when prices approach the lower band, the market may be oversold.';
    default:
      return '';
  }
};

export default TechnicalIndicators;
