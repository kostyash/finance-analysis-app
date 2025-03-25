// src/types/index.ts

// Portfolio types
export interface Portfolio {
  userId: string;
  portfolioId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioInput {
  name: string;
  description?: string;
  portfolioId?: string; // Optional, will be generated if not provided
}

// Position stored in the database
export interface PositionData {
  portfolioId: string;
  ticker: string;
  userId: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice?: number; // May be updated from external API
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// Position with calculated values (for UI display)
export interface Position {
  ticker: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
  notes?: string;
}

export type PositionInput = Omit<
  Position,
  'currentPrice' | 'currentValue' | 'gainLoss' | 'gainLossPct'
>;

// Analysis types
export interface PerformanceMetrics {
  initialValue: number;
  currentValue: number;
  absoluteReturn: number;
  percentageReturn: number;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}
