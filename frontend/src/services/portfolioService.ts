// src/services/portfolioService.ts
import config from '../config';
import { PositionInput } from '../types';

// Properly type the auth header function
const getAuthHeader = (): { Authorization?: string } => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getPortfolios = async () => {
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
      throw new Error('Failed to add position');
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding position:', error);
    throw error;
  }
};

// Similar functions for updatePosition and deletePosition
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
