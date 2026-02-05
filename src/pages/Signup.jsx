import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nome: '',
    cognome: '',
    dataNascita: '',
    sesso: '',
    ruolo: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      return setError('Le password non coincidono');
    }

    if (formData.password.length < 6) {
      return setError('La password deve essere di almeno 6 caratteri');
    }

    try {
      setError('');
      setLoading(true);
      
      const { email, password, confirmPassword, ...profileData } = formData;
      await signup(email, password, profileData);
      
      navigate('/');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError('Email già registrata');
      } else {
        setError('Errore durante la registrazione. Riprova.');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>⚽ Calcetto App</h1>
          <h2>Registrati</h2>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nome">Nome</label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="cognome">Cognome</label>
              <input
                type="text"
                id="cognome"
                name="cognome"
                value={formData.cognome}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="tua@email.com"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Min. 6 caratteri"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Conferma Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dataNascita">Data di Nascita</label>
              <input
                type="date"
                id="dataNascita"
                name="dataNascita"
                value={formData.dataNascita}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="sesso">Sesso</label>
              <select
                id="sesso"
                name="sesso"
                value={formData.sesso}
                onChange={handleChange}
                required
              >
                <option value="">Seleziona</option>
                <option value="M">Maschio</option>
                <option value="F">Femmina</option>
                <option value="Altro">Altro</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="ruolo">Ruolo Preferito</label>
            <select
              id="ruolo"
              name="ruolo"
              value={formData.ruolo}
              onChange={handleChange}
              required
            >
              <option value="">Seleziona</option>
              <option value="Portiere">Portiere</option>
              <option value="Difensore">Difensore</option>
              <option value="Centrocampista">Centrocampista</option>
              <option value="Attaccante">Attaccante</option>
            </select>
          </div>
          
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Registrazione in corso...' : 'Registrati'}
          </button>
        </form>
        
        <div className="auth-footer">
          Hai già un account? <Link to="/login">Accedi</Link>
        </div>
      </div>
    </div>
  );
}