import { useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import ProfileMenu from "./ProfileMenu";
import HamburgerButton from "./HamburgerButton";
import NavigationMenu from "./NavigationMenu";
import "./Header.css";

function Header() {
  const { user } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // For authenticated users, show header with hamburger menu
  return (
    <header className="header">
      {/* Left section: Hamburger button */}
      <div className="header-left">
        <HamburgerButton isOpen={menuOpen} toggleMenu={toggleMenu} />
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
      <NavigationMenu isOpen={menuOpen} setIsOpen={setMenuOpen} />
    </header>
  );
}

export default Header;