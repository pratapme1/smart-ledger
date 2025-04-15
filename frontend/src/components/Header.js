import { useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import ProfileMenu from "./ProfileMenu";
import HamburgerButton from "./HamburgerButton";
import NavigationMenu from "./NavigationMenu";
import "./Header.css";

const Header = () => {
  const { isAuthenticated, logout } = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // For authenticated users, show header with hamburger menu
  return (
    <header className="header">
      {/* Left section: Hamburger button */}
      <div className="header-left">
        <HamburgerButton isOpen={isMenuOpen} toggleMenu={toggleMenu} />
      </div>

      {/* Center section: Logo */}
      <div className="header-center">
        <Link to="/wallet" className="logo-link">
          <h1>SmartLedger</h1>
        </Link>
      </div>

      {/* Right section: Profile menu */}
      <div className="header-right">
        <ProfileMenu />
      </div>

      {/* Navigation Menu */}
      <NavigationMenu isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />
    </header>
  );
};

export default Header;