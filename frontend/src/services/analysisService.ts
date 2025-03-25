// src/services/analysisService.ts
import axios from 'axios';
import config from '../config';
import {
  BenchmarkComparisonResponse,
  DiversificationResponse,
  PerformanceResponse,
  RiskAnalysisResponse,
  TechnicalIndicatorsResponse,
} from '../types/analysisTypes';

const api = axios.create({
  baseURL: config.apiGateway.URL,
  timeout: 10000,
  withCredentials: false, // Important for CORS with Cognito
});

// Add request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('idToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors better
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Rest of your service functions using api.get()...

// Function to retrieve portfolio performance data
export const getPortfolioPerformance = async (
  period: string,
  portfolioId = 'default'
): Promise<PerformanceResponse['portfolioPerformance']> => {
  try {
    const response = await api.get(
      `/analysis/performance?period=${period}&portfolioId=${portfolioId}`
    );
    return response.data.portfolioPerformance;
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
    const response = await api.get(`/analysis/technical?ticker=${ticker}`);
    return response.data;
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
    const response = await api.get(`/analysis/risk?period=${period}&portfolioId=${portfolioId}`);
    return response.data.riskAnalysis;
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
    const response = await api.get(
      `/analysis/benchmark?period=${period}&benchmark=${benchmark}&portfolioId=${portfolioId}`
    );
    return response.data.benchmarkComparison;
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
    const response = await api.get(`/analysis/diversification?portfolioId=${portfolioId}`);
    return response.data.diversificationAnalysis;
  } catch (error) {
    console.error('Error fetching diversification analysis:', error);
    throw error;
  }
};
