import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navbar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  return (
    <nav className="navbar">
      <div className="navbar-brand">SmartLedger</div>
      <div className="nav-buttons">
        <Link 
          to="/login" 
          className={`nav-button ${currentPath === '/login' ? 'primary active' : 'secondary'}`}
        >
          Login
        </Link>
        <Link 
          to="/register" 
          className={`nav-button ${currentPath === '/register' ? 'primary active' : 'secondary'}`}
        >
          Register
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;