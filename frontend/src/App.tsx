import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import PortfolioPage from './components/portfolio/PortfolioPage';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import ConfirmAccount from './components/auth/ConfirmAccount';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Placeholder components until we build the real ones
const AnalysisPage = () => <div>Analysis Page</div>;
const ComparisonPage = () => <div>Comparison Page</div>;
const WhatIfPage = () => <div>What-If Scenarios Page</div>;

// Navigation component with auth-aware elements
const Navigation: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="App-header">
      <nav>
        <ul className="nav-menu">
          <li className="nav-logo">Financial Analysis App</li>
          {isAuthenticated ? (
            <>
              <li>
                <Link to="/">Portfolio</Link>
              </li>
              <li>
                <Link to="/analysis">Analysis</Link>
              </li>
              <li>
                <Link to="/comparison">Comparison</Link>
              </li>
              <li>
                <Link to="/what-if">What-If Scenarios</Link>
              </li>
              <li>
                <button onClick={logout} className="nav-button">
                  Sign Out
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login">Sign In</Link>
              </li>
              <li>
                <Link to="/signup">Sign Up</Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          <main>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/confirm" element={<ConfirmAccount />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<PortfolioPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/comparison" element={<ComparisonPage />} />
                <Route path="/what-if" element={<WhatIfPage />} />
              </Route>
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
