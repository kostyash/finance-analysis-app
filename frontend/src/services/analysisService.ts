// src/services/analysisService.ts
import config from '../config';

// Helper function to get authentication headers
const getAuthHeader = (): { Authorization?: string } => {
  const tokenKey = Object.keys(localStorage).find(
    (key) => key.includes('CognitoIdentityServiceProvider') && key.includes('accessToken')
  );
  const token = tokenKey ? localStorage.getItem(tokenKey) : null;
  console.log('Auth headers:', `Bearer ${token}`);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

// Function to retrieve portfolio performance data
export const getPortfolioPerformance = async (
  period: string,
  portfolioId = 'default'
): Promise<PerformanceResponse['portfolioPerformance']> => {
  try {
    const response = await fetch(
      `${config.apiGateway.URL}/analysis/performance?period=${period}&portfolioId=${portfolioId}`,
      {
        headers: getAuthHeader(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch portfolio performance data');
    }

    const data = (await response.json()) as PerformanceResponse;
    return data.portfolioPerformance;
  } catch (error) {
    console.error('Error fetching portfolio performance:', error);
    throw error;
  }
};

// Function to retrieve technical indicators
export const getTechnicalIndicators = async (
  ticker: string
): Promise<TechnicalIndicatorsResponse> => {
  try {
    const response = await fetch(`${config.apiGateway.URL}/analysis/technical?ticker=${ticker}`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch technical indicators');
    }

    return (await response.json()) as TechnicalIndicatorsResponse;
  } catch (error) {
    console.error('Error fetching technical indicators:', error);
    throw error;
  }
};

// Function to retrieve risk analysis
export const getRiskAnalysis = async (
  period: string,
  portfolioId = 'default'
): Promise<RiskAnalysisResponse['riskAnalysis']> => {
  try {
    const response = await fetch(
      `${config.apiGateway.URL}/analysis/risk?period=${period}&portfolioId=${portfolioId}`,
      {
        headers: getAuthHeader(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch risk analysis');
    }

    const data = (await response.json()) as RiskAnalysisResponse;
    return data.riskAnalysis;
  } catch (error) {
    console.error('Error fetching risk analysis:', error);
    throw error;
  }
};

// Function to retrieve benchmark comparison
export const getBenchmarkComparison = async (
  period: string,
  benchmark: string,
  portfolioId = 'default'
): Promise<BenchmarkComparisonResponse['benchmarkComparison']> => {
  try {
    const response = await fetch(
      `${config.apiGateway.URL}/analysis/benchmark?period=${period}&benchmark=${benchmark}&portfolioId=${portfolioId}`,
      {
        headers: getAuthHeader(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch benchmark comparison');
    }

    const data = (await response.json()) as BenchmarkComparisonResponse;
    return data.benchmarkComparison;
  } catch (error) {
    console.error('Error fetching benchmark comparison:', error);
    throw error;
  }
};

// Function to retrieve diversification analysis
export const getDiversificationAnalysis = async (
  portfolioId = 'default'
): Promise<DiversificationResponse['diversificationAnalysis']> => {
  try {
    const response = await fetch(
      `${config.apiGateway.URL}/analysis/diversification?portfolioId=${portfolioId}`,
      {
        headers: getAuthHeader(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch diversification analysis');
    }

    const data = (await response.json()) as DiversificationResponse;
    return data.diversificationAnalysis;
  } catch (error) {
    console.error('Error fetching diversification analysis:', error);
    throw error;
  }
};
