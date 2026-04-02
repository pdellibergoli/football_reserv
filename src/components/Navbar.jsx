import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Plus, Home, History, Sun, Moon, Menu, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import './Navbar.css';

export default function Navbar() {
  const { logout, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

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
        
        <button className="hamburger" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        <div className={`navbar-menu ${isOpen ? 'open' : ''}`}>
          <Link to="/" className="navbar-link" onClick={() => setIsOpen(false)}>
            <Home size={20} />
            <span>Partite</span>
          </Link>
          
          <Link to="/create-match" className="navbar-link" onClick={() => setIsOpen(false)}>
            <Plus size={20} />
            <span>Crea Partita</span>
          </Link>

          <Link to="/archive" className="navbar-link" onClick={() => setIsOpen(false)}>
            <History size={20} />
            <span>Archivio</span>
          </Link>
          
          <Link to="/profile" className="navbar-link" onClick={() => setIsOpen(false)}>
            <User size={20} />
            <span>{userProfile?.nome || 'Profilo'}</span>
          </Link>

          <button 
            onClick={() => setIsDark(!isDark)} 
            className="navbar-link"
            title="Cambia tema"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            <span>{isDark ? 'Tema Chiaro' : 'Tema Scuro'}</span>
          </button>

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