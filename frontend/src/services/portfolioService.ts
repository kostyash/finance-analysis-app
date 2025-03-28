// src/services/portfolioService.ts
import config from '../config';
import { PositionInput, Portfolio, PortfolioInput, Position } from '../types';
import { transformPositionsData } from '../utils/positionUtils';

// Properly type the auth header function
const getAuthHeader = (): { Authorization?: string } => {
  const token = localStorage.getItem('idToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Get all portfolios for current user
export const getPortfolios = async (): Promise<Portfolio[]> => {
  try {
    const response = await fetch(`${config.apiGateway.URL}/portfolio`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch portfolios');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    throw error;
  }
};

// Get specific portfolio details
export const getPortfolioDetails = async (portfolioId: string): Promise<Portfolio> => {
  try {
    const response = await fetch(`${config.apiGateway.URL}/portfolio/${portfolioId}`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch portfolio details');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching portfolio details:', error);
    throw error;
  }
};

// Create a new portfolio
export const createPortfolio = async (portfolio: PortfolioInput): Promise<Portfolio> => {
  try {
    const response = await fetch(`${config.apiGateway.URL}/portfolio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(portfolio),
    });

    if (!response.ok) {
      throw new Error('Failed to create portfolio');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating portfolio:', error);
    throw error;
  }
};

// Update a portfolio
export const updatePortfolio = async (
  portfolioId: string,
  updates: Partial<PortfolioInput>
): Promise<Portfolio> => {
  try {
    const response = await fetch(`${config.apiGateway.URL}/portfolio/${portfolioId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update portfolio');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating portfolio:', error);
    throw error;
  }
};

// Delete a portfolio
export const deletePortfolio = async (portfolioId: string): Promise<{ message: string }> => {
  try {
    const response = await fetch(`${config.apiGateway.URL}/portfolio/${portfolioId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete portfolio');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    throw error;
  }
};

export const uploadPortfolioFile = async (portfolioId: string, file: File): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${config.apiGateway.URL}/portfolio/${portfolioId}/import`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
      // Note: Don't set Content-Type here, it will be set automatically with boundary
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to import portfolio data');
  }

  return;
};

// Get positions for a portfolio
export const getPositions = async (portfolioId = 'default') => {
  try {
    const response = await fetch(`${config.apiGateway.URL}/portfolio/${portfolioId}/positions`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch positions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching positions:', error);
    throw error;
  }
};

// New function that gets positions and transforms them with calculated values
export const loadPositions = async (portfolioId = 'default'): Promise<Position[]> => {
  try {
    // Fetch positions from the API
    const positionsData = await getPositions(portfolioId);

    // Transform the data to include calculated values
    return transformPositionsData(positionsData);
  } catch (error) {
    console.error('Error loading positions with calculations:', error);
    throw error;
  }
};

// Add a position to a portfolio
export const addPosition = async (portfolioId = 'default', position: PositionInput) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };

    const response = await fetch(`${config.apiGateway.URL}/portfolio/${portfolioId}/positions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(position),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add position');
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding position:', error);
    throw error;
  }
};

// Update a position
export const updatePosition = async (
  portfolioId = 'default',
  ticker: string,
  position: Partial<PositionInput>
) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };

    const response = await fetch(
      `${config.apiGateway.URL}/portfolio/${portfolioId}/positions/${ticker}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(position),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update position');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating position:', error);
    throw error;
  }
};

// Delete a position
export const deletePosition = async (portfolioId = 'default', ticker: string) => {
  try {
    const response = await fetch(
      `${config.apiGateway.URL}/portfolio/${portfolioId}/positions/${ticker}`,
      {
        method: 'DELETE',
        headers: getAuthHeader(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete position');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting position:', error);
    throw error;
  }
};
