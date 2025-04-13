import React from 'react';
import { Link } from 'react-router-dom';
import './ComingSoon.css';

const ComingSoon = ({ feature, description, icon: Icon }) => {
  return (
    <div className="coming-soon-container">
      <div className="coming-soon-card">
        <div className="feature-icon">
          {Icon && <Icon size={64} />}
        </div>
        <h2 className="feature-title">{feature}</h2>
        <p className="feature-description">{description}</p>
        <div className="coming-soon-badge">Coming Soon</div>
        <Link to="/wallet" className="back-button">
          Back to Wallet
        </Link>
      </div>
    </div>
  );
};

export default ComingSoon;