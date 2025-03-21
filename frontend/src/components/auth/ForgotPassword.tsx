// src/components/auth/ForgotPassword.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AuthStyles.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);

  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setIsCodeSent(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to process request');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCodeSent) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Reset Password</h2>
          <p>A verification code has been sent to your email.</p>
          <button
            className="primary-button"
            onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
          >
            Continue to Reset Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Forgot Password</h2>
        <p>Enter your email address and we&apos;ll send you a code to reset your password.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Code'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
