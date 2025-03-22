// src/types/analysisTypes.ts
export interface PerformanceData {
  date: string;
  value: number;
}

export interface TechnicalIndicator {
  date: string;
  sma?: number;
  ema?: number;
  rsi?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
  upper?: number;
  middle?: number;
  lower?: number;
}

export interface RiskMetrics {
  correlationMatrix: Array<
    Array<{
      ticker1: string;
      ticker2: string;
      correlation: number;
    }>
  >;
  portfolioBeta: number;
  valueAtRisk: {
    daily: number;
    tenDay: number;
    confidenceLevel: number;
    portfolioValue: number;
    percentageOfPortfolio: number;
  };
  riskBreakdown: {
    marketRisk: number;
    sectorRisk: number;
    specificRisk: number;
  };
}

// At the top of your file, before your component
export interface BenchmarkComparisonData {
  benchmark: string;
  period: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  trackingError: number;
  informationRatio: number;
  alpha: number;
  portfolioTimeSeries: Array<{
    date: string;
    value: number;
  }>;
  benchmarkTimeSeries: Array<{
    date: string;
    value: number;
  }>;
}

export interface DiversificationData {
  sectorAllocation: Array<{
    sector: string;
    value: number;
    percentage: number;
  }>;
  assetClassAllocation: Array<{
    assetClass: string;
    value: number;
    percentage: number;
  }>;
  concentration: {
    topHolding: number;
    top3Holdings: number;
    top5Holdings: number;
    hhi: number;
    numberOfPositions: number;
  };
  diversificationScore: number;
}

export interface RiskAnalysisData {
  correlationMatrix: Array<
    Array<{
      ticker1: string;
      ticker2: string;
      correlation: number;
    }>
  >;
  portfolioBeta: number;
  valueAtRisk: {
    daily: number;
    tenDay: number;
    confidenceLevel: number;
    portfolioValue: number;
    percentageOfPortfolio: number;
  };
  riskBreakdown: {
    marketRisk: number;
    sectorRisk: number;
    specificRisk: number;
  };
}

// Add more interfaces for other component data
