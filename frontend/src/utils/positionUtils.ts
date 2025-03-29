import { Position, PositionData } from '../types';

/**
 * Transforms a position from the database format to the UI format with calculated values
 */
export function transformPositionData(positionData: PositionData): Position {
  const currentPrice = positionData.currentPrice || 0;
  const currentValue = positionData.shares * currentPrice;
  const gainLoss = currentValue - positionData.shares * positionData.purchasePrice;
  const gainLossPct =
    positionData.purchasePrice > 0
      ? (gainLoss / (positionData.shares * positionData.purchasePrice)) * 100
      : 0;

  return {
    ticker: positionData.ticker,
    shares: positionData.shares,
    purchasePrice: positionData.purchasePrice,
    purchaseDate: positionData.purchaseDate,
    currentPrice,
    currentValue,
    gainLoss,
    gainLossPct,
    notes: positionData.notes,
  };
}

/**
 * Transforms an array of position data items to UI positions with calculated values
 */
export function transformPositionsData(positionsData: PositionData[]): Position[] {
  console.log('Position data:', positionsData); // Debug log
  return positionsData.map(transformPositionData);
}

/**
 * Updates current prices for positions with real-time data
 * This function would make API calls to get current prices in a real implementation
 * For now, it simulates price updates with random values
 */
export function updateCurrentPrices(positions: Position[]): Position[] {
  return positions.map((position) => {
    // Simulate a price fluctuation of ±2%
    const priceChange = position.currentPrice * (Math.random() * 0.04 - 0.02);
    const newPrice = position.currentPrice + priceChange;

    // Recalculate derived values
    const currentValue = newPrice * position.shares;
    const gainLoss = currentValue - position.shares * position.purchasePrice;
    const gainLossPct = (gainLoss / (position.shares * position.purchasePrice)) * 100;

    return {
      ...position,
      currentPrice: newPrice,
      currentValue,
      gainLoss,
      gainLossPct,
    };
  });
}

/**
 * Calculates the total value of a portfolio
 */
export function calculatePortfolioValue(positions: Position[]): number {
  return positions.reduce((sum, position) => sum + position.currentValue, 0);
}

/**
 * Calculates the total cost basis of a portfolio
 */
export function calculatePortfolioCost(positions: Position[]): number {
  return positions.reduce((sum, position) => sum + position.purchasePrice * position.shares, 0);
}
