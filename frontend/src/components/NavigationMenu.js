import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const NavigationMenu = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const menuRef = useRef(null);
  
  // Handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          !event.target.closest('.hamburger-button')) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent scrolling when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      // Allow scrolling when menu is closed
      document.body.style.overflow = '';
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, setIsOpen]);
  
  // Close menu on ESC key press
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, setIsOpen]);

  // Check if a link is active
  const isActive = (path) => {
    if (path === '/wallet' && location.pathname === '/dashboard') {
      return true; // Consider dashboard as wallet for backward compatibility
    }
    return location.pathname === path;
  };
  
  return (
    <>
      {/* Backdrop overlay */}
      <div className={`menu-backdrop ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(false)} />
      
      {/* Side navigation menu */}
      <nav className={`navigation-menu ${isOpen ? 'open' : ''}`} ref={menuRef}>
        <div className="menu-header">
          <h2>Menu</h2>
        </div>
        
        <ul className="menu-items">
          <li>
            <Link 
              to="/wallet" 
              className={`menu-item ${isActive('/wallet') ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span className="menu-icon">💼</span>
              <span>Wallet</span>
            </Link>
          </li>
          
          <li>
            <Link 
              to="/analytics" 
              className={`menu-item ${isActive('/analytics') ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span className="menu-icon">📊</span>
              <span>Analytics</span>
            </Link>
          </li>
          
          
          <li>
            <Link 
              to="/upload" 
              className={`menu-item ${isActive('/upload') ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span className="menu-icon">📤</span>
              <span>Upload</span>
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
};

export default NavigationMenu;