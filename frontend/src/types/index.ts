export interface Position {
  ticker: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
}

export type PositionInput = Omit<
  Position,
  'currentPrice' | 'currentValue' | 'gainLoss' | 'gainLossPct'
>;
