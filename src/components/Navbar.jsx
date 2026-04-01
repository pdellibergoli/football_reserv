import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Plus, Home, History } from 'lucide-react'; // Aggiunta History
import './Navbar.css';

export default function Navbar() {
  const { logout, userProfile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          ⚽ Football booking
        </Link>
        
        <div className="navbar-menu">
          <Link to="/" className="navbar-link">
            <Home size={20} />
            <span>Partite</span>
          </Link>
          
          <Link to="/create-match" className="navbar-link">
            <Plus size={20} />
            <span>Crea Partita</span>
          </Link>

          <Link to="/archive" className="navbar-link">
            <History size={20} />
            <span>Archivio</span>
          </Link>
          
          <Link to="/profile" className="navbar-link">
            <User size={20} />
            <span>{userProfile?.nome || 'Profilo'}</span>
          </Link>
          <a 
            href="https://www.paypal.com/donate/?hosted_button_id=ZYAR6VYBQC3UL" 
            target="_blank" 
            rel="noopener noreferrer"
            className="navbar-paypal"
          >
            Buy me a coffee! ☕
          </a>
          <button onClick={handleLogout} className="navbar-link navbar-logout">
            <LogOut size={20} />
            <span>Esci</span>
          </button>
        </div>
      </div>
    </nav>
  );
}