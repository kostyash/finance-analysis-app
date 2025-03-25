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

// Interface for risk analysis response
export interface RiskAnalysisResponse {
  riskAnalysis: {
    correlationMatrix: unknown[][];
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

// Interface for performance analysis response
export interface PerformanceResponse {
  portfolioPerformance: {
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
  };
}

// Interface for technical indicators response
export interface TechnicalIndicatorsResponse {
  ticker: string;
  indicators: {
    sma: { date: string; sma: number }[];
    ema: { date: string; ema: number }[];
    rsi: { date: string; rsi: number }[];
    macd: { date: string; macd: number; signal: number; histogram: number }[];
    bollinger: { date: string; middle: number; upper: number; lower: number }[];
  };
}

// Interface for benchmark comparison response
export interface BenchmarkComparisonResponse {
  benchmarkComparison: {
    benchmark: string;
    period: string;
    portfolioReturn: number;
    benchmarkReturn: number;
    trackingError: number;
    informationRatio: number;
    alpha: number;
    portfolioTimeSeries: {
      date: string;
      value: number;
    }[];
    benchmarkTimeSeries: {
      date: string;
      value: number;
    }[];
  };
}

// Interface for diversification analysis response
export interface DiversificationResponse {
  diversificationAnalysis: {
    sectorAllocation: {
      sector: string;
      value: number;
      percentage: number;
    }[];
    assetClassAllocation: {
      assetClass: string;
      value: number;
      percentage: number;
    }[];
    concentration: {
      topHolding: number;
      top3Holdings: number;
      top5Holdings: number;
      hhi: number;
      numberOfPositions: number;
    };
    diversificationScore: number;
  };
}

// Add more interfaces for other component data
