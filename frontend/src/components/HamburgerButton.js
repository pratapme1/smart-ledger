import React from 'react';
import './HamburgerButton.css';

const HamburgerButton = ({ isOpen, toggleMenu }) => {
  return (
    <button 
      className={`hamburger-button ${isOpen ? 'open' : ''}`}
      onClick={toggleMenu}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
    >
      <span className="hamburger-line"></span>
      <span className="hamburger-line"></span>
      <span className="hamburger-line"></span>
    </button>
  );
};

export default HamburgerButton;