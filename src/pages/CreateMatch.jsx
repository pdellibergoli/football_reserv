import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import './CreateMatch.css';

export default function CreateMatch() {
  const { id } = useParams(); // Se l'ID è presente nell'URL, siamo in Modifica
  const isEditMode = Boolean(id);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Stati per la ricerca indirizzo
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    tipologia: 'Calcio a 5',
    data: '',
    ora: '',
    luogo: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    prezzo: '',
    maxPartecipanti: 10,
    lat: '',
    lng: ''
  });

  // 1. Effetto per caricare i dati se siamo in modalità Modifica
  useEffect(() => {
    if (isEditMode) {
      const loadMatchData = async () => {
        try {
          setLoading(true);
          const response = await api.getMatch(id);
          const m = response.match;
          
          setFormData({
            tipologia: m.tipologia,
            data: m.data,
            ora: m.ora,
            luogo: m.luogo,
            indirizzo: m.indirizzo,
            citta: m.citta,
            provincia: m.provincia,
            prezzo: m.prezzo,
            maxPartecipanti: m.postiTotali,
            lat: m.lat,
            lng: m.lng
          });
          setSearchQuery(m.indirizzo);
        } catch (err) {
          setError('Errore nel caricamento della partita.');
        } finally {
          setLoading(false);
        }
      };
      loadMatchData();
    }
  }, [id, isEditMode]);

  // 2. Debounce per la ricerca indirizzo
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Non cerchiamo se l'indirizzo è già quello salvato nel form (evita loop in modifica)
      if (searchQuery.trim().length >= 3 && searchQuery !== formData.indirizzo) {
        performSearch(searchQuery);
      } else {
        setSuggestions([]);
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, formData.indirizzo]);

  // 3. Logica automatica posti totali (attiva solo se cambiamo tipologia)
  useEffect(() => {
    const mapping = { 'Calcio a 5': 10, 'Calcio a 7': 14, 'Calcio a 8': 16, 'Calcio a 11': 22 };
    setFormData(prev => ({ ...prev, maxPartecipanti: mapping[prev.tipologia] || 10 }));
  }, [formData.tipologia]);

  const performSearch = async (query) => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=it`
      );
      const data = await response.json();
      const formatted = data.map(item => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        city: item.address.city || item.address.town || '',
        province: item.address.county || ''
      }));
      setSuggestions(formatted);
    } catch (err) {
      console.error("Errore ricerca:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSuggestion = (s) => {
    setFormData(prev => ({
      ...prev,
      indirizzo: s.display_name,
      citta: s.city,
      provincia: s.province,
      lat: s.lat,
      lng: s.lng
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
    if (!formData.lat) return setError('Seleziona un indirizzo dai suggerimenti');

    try {
      setLoading(true);
      setError('');
      
      const matchData = {
        ...formData,
        organizzatoreId: currentUser.uid,
        organizzatoreEmail: currentUser.email
      };

      if (isEditMode) {
        // Chiamata PUT per la modifica
        await api.updateMatch(id, matchData);
        navigate(`/match/${id}`);
      } else {
        // Chiamata POST per la creazione
        matchData.partecipanti = JSON.stringify([]);
        matchData.stato = 'aperta';
        matchData.createdAt = new Date().toISOString();
        await api.createMatch(matchData);
        navigate('/');
      }
    } catch (err) {
      setError(`Errore durante ${isEditMode ? 'l\'aggiornamento' : 'la creazione'}.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-match">
      <div className="create-match-card">
        <h1>{isEditMode ? 'Modifica Partita' : 'Crea Nuova Partita'}</h1>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tipologia</label>
            <select name="tipologia" value={formData.tipologia} onChange={handleChange}>
              <option value="Calcio a 5">Calcio a 5</option>
              <option value="Calcio a 7">Calcio a 7</option>
              <option value="Calcio a 8">Calcio a 8</option>
              <option value="Calcio a 11">Calcio a 11</option>
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
            <input type="text" name="luogo" placeholder="es. Green Park" value={formData.luogo} onChange={handleChange} required />
          </div>

          <div className="form-group address-search-container">
            <label>Indirizzo</label>
            <div className="input-with-loader">
              <input
                type="text"
                placeholder="Cerca via e città..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value !== formData.indirizzo) {
                    setFormData(prev => ({ ...prev, lat: '', lng: '' }));
                  }
                }}
                autoComplete="off"
                required
              />
              {isSearching && <div className="loader-spinner-small"></div>}
            </div>

            {suggestions.length > 0 && (
              <ul className="suggestions-list">
                {suggestions.map((s, i) => (
                  <li key={i} onClick={() => selectSuggestion(s)}>{s.display_name}</li>
                ))}
              </ul>
            )}
            {formData.lat && <small className="success-text">✓ Indirizzo confermato</small>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Prezzo a persona (€)</label>
              <input type="number" name="prezzo" value={formData.prezzo} onChange={handleChange} required step="0.5" />
            </div>
            <div className="form-group">
              <label>Posti Totali</label>
              <input type="number" value={formData.maxPartecipanti} readOnly style={{background: '#f0f0f0'}} />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Annulla</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Salvataggio...' : (isEditMode ? 'Aggiorna Partita' : 'Crea Partita')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}