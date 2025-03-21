// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  AuthResult,
  confirmForgotPassword,
  confirmSignUp,
  forgotPasswordRes,
  ForgotPasswordResult,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
  UserAttributes,
} from '../services/authService';
import { CognitoUser } from 'amazon-cognito-identity-js';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserAttributes | null;
  login: (email: string, password: string) => Promise<UserAttributes>;
  logout: () => void;
  signup: (email: string, password: string) => Promise<CognitoUser>;
  confirmSignup: (email: string, code: string) => Promise<string>;
  forgotPassword: (email: string) => Promise<ForgotPasswordResult>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserAttributes | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthState = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthState();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn(email, password);
      setUser(result);
      setIsAuthenticated(true);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  const signup = async (email: string, password: string) => {
    try {
      const result = await signUp(email, password);
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const confirmSignup = async (email: string, code: string) => {
    try {
      const result = await confirmSignUp(email, code);
      return result;
    } catch (error) {
      console.error('Confirm signup error:', error);
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const result = await forgotPasswordRes(email);
      return result;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      const result = await confirmForgotPassword(email, code, newPassword);
      return result;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        signup,
        confirmSignup,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
