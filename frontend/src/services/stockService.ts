import config from '../config';

export interface StockData {
  ticker: string;
  price: number;
  change: number;
  changePercent: string;
  volume: number;
  latestTradingDay: string;
}

export const getStockData = async (ticker: string): Promise<StockData> => {
  try {
    const response = await fetch(`${config.apiGateway.URL}/stocks/${ticker}`);

    if (!response.ok) {
      throw new Error('Failed to fetch stock data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching stock data:', error);
    throw error;
  }
};
