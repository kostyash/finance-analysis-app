// src/components/analysis/AnalysisPage.tsx
import React, { useEffect, useState } from 'react';
import ErrorMessage from '../common/ErrorMessage';
import './AnalysisStyles.css';
import BenchmarkComparison from './BenchmarkComparison';
import DiversificationAnalysis from './DiversificationAnalysis';
import PerformanceChart from './PerformanceChart';
import RiskAnalysis from './RiskAnalysis';
import TechnicalIndicators from './TechnicalIndicators';

type AnalysisType = 'performance' | 'technical' | 'risk' | 'benchmark' | 'diversification';

const AnalysisPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalysisType>('performance');
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('1m'); // Default to 1 month
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [tickerOptions, setTickerOptions] = useState<string[]>([]);
  const [benchmark, setBenchmark] = useState<string>('SPY'); // Default to S&P 500 ETF

  // Load ticker options from portfolio positions
  useEffect(() => {
    // In a real app, this would fetch from the portfolio API
    // For now, we'll use mock data
    setTickerOptions(['AAPL', 'MSFT', 'GOOGL', 'AMZN']);
    setSelectedTicker('AAPL'); // Default selection
  }, []);

  // Handle tab changes
  const handleTabChange = (tab: AnalysisType) => {
    setActiveTab(tab);
    setError(null); // Clear any previous errors
  };

  return (
    <div className="analysis-page">
      <h1>Portfolio Analysis</h1>

      <div className="analysis-tabs">
        <button
          className={activeTab === 'performance' ? 'active' : ''}
          onClick={() => handleTabChange('performance')}
        >
          Performance
        </button>
        <button
          className={activeTab === 'technical' ? 'active' : ''}
          onClick={() => handleTabChange('technical')}
        >
          Technical Indicators
        </button>
        <button
          className={activeTab === 'risk' ? 'active' : ''}
          onClick={() => handleTabChange('risk')}
        >
          Risk Analysis
        </button>
        <button
          className={activeTab === 'benchmark' ? 'active' : ''}
          onClick={() => handleTabChange('benchmark')}
        >
          Benchmark Comparison
        </button>
        <button
          className={activeTab === 'diversification' ? 'active' : ''}
          onClick={() => handleTabChange('diversification')}
        >
          Diversification
        </button>
      </div>

      {/* Common filter options */}
      <div className="filter-options">
        {/* Period selector for charts */}
        {activeTab !== 'technical' && (
          <div className="filter-group">
            <label>Time Period:</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="1w">1 Week</option>
              <option value="1m">1 Month</option>
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
              <option value="1y">1 Year</option>
              <option value="5y">5 Years</option>
            </select>
          </div>
        )}

        {/* Ticker selector for Technical Analysis */}
        {activeTab === 'technical' && (
          <div className="filter-group">
            <label>Stock Symbol:</label>
            <select value={selectedTicker} onChange={(e) => setSelectedTicker(e.target.value)}>
              {tickerOptions.map((ticker) => (
                <option key={ticker} value={ticker}>
                  {ticker}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Benchmark selector for Benchmark Comparison */}
        {activeTab === 'benchmark' && (
          <div className="filter-group">
            <label>Benchmark:</label>
            <select value={benchmark} onChange={(e) => setBenchmark(e.target.value)}>
              <option value="SPY">S&P 500 (SPY)</option>
              <option value="QQQ">NASDAQ 100 (QQQ)</option>
              <option value="DIA">Dow Jones (DIA)</option>
              <option value="IWM">Russell 2000 (IWM)</option>
            </select>
          </div>
        )}
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="analysis-content">
        {activeTab === 'performance' && <PerformanceChart period={period} />}

        {activeTab === 'technical' && <TechnicalIndicators ticker={selectedTicker} />}

        {activeTab === 'risk' && <RiskAnalysis period={period} />}

        {activeTab === 'benchmark' && <BenchmarkComparison period={period} benchmark={benchmark} />}

        {activeTab === 'diversification' && <DiversificationAnalysis />}
      </div>
    </div>
  );
};

export default AnalysisPage;
