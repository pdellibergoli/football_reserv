import { useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setMessage('');
      setError('');
      setLoading(true);
      await api.resetPassword(email);
      setMessage('Controlla la tua casella email per le istruzioni di recupero.');
    } catch (err) {
      setError('Errore: l\'indirizzo email potrebbe non essere corretto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Recupera Password</h2>
        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="Inserisci la tua email"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Invio in corso...' : 'Invia Email di Reset'}
          </button>
        </form>
        
        <div className="auth-footer">
          <Link to="/login">Torna al Login</Link>
        </div>
      </div>
    </div>
  );
}