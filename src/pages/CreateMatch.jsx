import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import './CreateMatch.css';

export default function CreateMatch() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Ricerca indirizzo
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const [formData, setFormData] = useState({
    tipologia: 'Calcio a 5',
    data: '',
    ora: '',
    luogo: '', // Nome del centro sportivo
    indirizzo: '',
    citta: '',
    provincia: '',
    prezzo: '',
    maxPartecipanti: 10, // Default per Calcio a 5
    lat: '',
    lng: ''
  });

  // Effetto per aggiornare maxPartecipanti quando cambia la tipologia
  useEffect(() => {
    const mapping = {
      'Calcio a 5': 10,
      'Calcio a 7': 14,
      'Calcio a 8': 16,
      'Calcio a 11': 22
    };
    setFormData(prev => ({
      ...prev,
      maxPartecipanti: mapping[prev.tipologia] || 10
    }));
  }, [formData.tipologia]);

  const handleSearchAddress = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=it`);
      const data = await response.json();
      
      const formatted = data.map(item => ({
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon,
        city: item.address.city || item.address.town || item.address.village || '',
        province: item.address.county || ''
      }));
      setSuggestions(formatted);
    } catch (err) {
      console.error("Errore ricerca:", err);
    }
  };

  const selectSuggestion = (s) => {
    setFormData(prev => ({
      ...prev,
      indirizzo: s.display_name,
      citta: s.city,
      provincia: s.province,
      lat: s.lat,
      lng: s.lon
    }));
    setSearchQuery(s.display_name);
    setSuggestions([]);
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.lat || !formData.lng) {
      setError('Seleziona un indirizzo dai suggerimenti');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const matchData = {
        ...formData,
        organizzatoreId: currentUser.uid,
        organizzatoreEmail: currentUser.email,
        partecipanti: JSON.stringify([currentUser.uid]),
        stato: 'aperta',
        createdAt: new Date().toISOString()
      };

      // NOTA: Assicurati che api.js usi `${API_BASE}/matchs` per puntare al tuo file api/matchs.js
      await api.createMatch(matchData);
      navigate('/');
    } catch (err) {
      setError('Errore nella creazione. Verifica che l\'URL /api/matchs sia corretto.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-match">
      <div className="create-match-card">
        <h1>Crea Nuova Partita</h1>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tipologia di gioco</label>
            <select name="tipologia" value={formData.tipologia} onChange={handleChange}>
              <option value="Calcio a 5">Calcio a 5 (10 giocatori)</option>
              <option value="Calcio a 7">Calcio a 7 (14 giocatori)</option>
              <option value="Calcio a 8">Calcio a 8 (16 giocatori)</option>
              <option value="Calcio a 11">Calcio a 11 (22 giocatori)</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data</label>
              <input type="date" name="data" value={formData.data} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Ora</label>
              <input type="time" name="ora" value={formData.ora} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>Nome Centro Sportivo</label>
            <input type="text" name="luogo" placeholder="es. Centro Sportivo Rossi" value={formData.luogo} onChange={handleChange} required />
          </div>

          <div className="form-group address-search-container">
            <label>Indirizzo (Cerca e seleziona)</label>
            <input
              type="text"
              placeholder="Via, Città..."
              value={searchQuery}
              onChange={(e) => handleSearchAddress(e.target.value)}
              autoComplete="off"
              required
            />
            {suggestions.length > 0 && (
              <ul className="suggestions-list">
                {suggestions.map((s, i) => (
                  <li key={i} onClick={() => selectSuggestion(s)}>{s.display_name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Prezzo a persona (€)</label>
              <input type="number" name="prezzo" value={formData.prezzo} onChange={handleChange} required step="0.5" />
            </div>
            <div className="form-group">
              <label>Posti Totali</label>
              <input type="number" name="maxPartecipanti" value={formData.maxPartecipanti} readOnly style={{background: '#f0f0f0'}} />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate('/')} className="btn-secondary">Annulla</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creazione...' : 'Crea Partita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}