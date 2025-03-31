import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="logo">
        <h1>SmartLedger</h1>
      </div>
      
      {user ? (
        <div className="user-menu">
          <span className="username">Hello, {user.name}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      ) : (
        <div className="auth-links">
          <Link to="/login" className="auth-link">Login</Link>
          <Link to="/register" className="auth-link register">Register</Link>
        </div>
      )}
    </header>
  );
}

export default Header;