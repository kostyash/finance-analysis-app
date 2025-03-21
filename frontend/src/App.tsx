import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import PortfolioPage from './components/portfolio/PortfolioPage';

// Placeholder components until we build the real ones
const AnalysisPage = () => <div>Analysis Page</div>;
const ComparisonPage = () => <div>Comparison Page</div>;
const WhatIfPage = () => <div>What-If Scenarios Page</div>;

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <nav>
            <ul className="nav-menu">
              <li className="nav-logo">Financial Analysis App</li>
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
            </ul>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<PortfolioPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/what-if" element={<WhatIfPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
