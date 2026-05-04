import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Save } from 'lucide-react'; 
import './CreateMatch.css';

export default function CreateMatch() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [savedFields, setSavedFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState('');

  const [formData, setFormData] = useState({
    tipologia: 'Calcio a 5',
    data: new Date().toISOString().split('T')[0],
    ora: '18:00',
    luogo: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    prezzo: '9',
    maxPartecipanti: 10,
    lat: '',
    lng: ''
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        const fieldsData = await api.getFields();
        setSavedFields(fieldsData.fields || []);

        if (isEditMode) {
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
        }
      } catch (err) {
        console.error("Errore caricamento:", err);
        setError('Errore nel caricamento dei dati.');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [id, isEditMode]);

  const handleFieldSelect = (e) => {
    const fieldId = e.target.value;
    setSelectedFieldId(fieldId);
    
    if (fieldId === "") {
      return;
    }

    const field = savedFields.find(f => f.fieldId === fieldId);
    if (field) {
      setFormData(prev => ({
        ...prev,
        luogo: field.nome,
        indirizzo: field.indirizzo,
        citta: field.citta,
        provincia: field.provincia,
        lat: field.lat,
        lng: field.lng
      }));
      setSearchQuery(field.indirizzo);
    }
  };

  const handleSaveCurrentField = async () => {
    if (!formData.lat || !formData.luogo) {
      return alert("Assicurati di aver inserito un nome e selezionato un indirizzo dai suggerimenti.");
    }

    const isAlreadySaved = savedFields.some(
      (field) => field.indirizzo.toLowerCase() === formData.indirizzo.toLowerCase()
    );

    if (isAlreadySaved) {
      return alert("Questo campo sportivo è già presente nei tuoi preferiti!");
    }
    
    try {
      setLoading(true);
      
      await api.saveField({
        nome: formData.luogo,
        indirizzo: formData.indirizzo,
        citta: formData.citta,
        provincia: formData.provincia,
        lat: formData.lat,
        lng: formData.lng
      });
      
      alert("Nuovo campo salvato con successo!");
      
      const fieldsData = await api.getFields();
      setSavedFields(fieldsData.fields || []);
      
    } catch (err) {
      console.error("Errore salvataggio campo:", err);
      alert("Errore durante il salvataggio del campo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 3 && searchQuery !== formData.indirizzo) {
        performSearch(searchQuery);
      } else {
        setSuggestions([]);
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, formData.indirizzo]);

  useEffect(() => {
    const mapping = { 'Calcio a 5': 10, 'Calcio a 7': 14, 'Calcio a 8': 16, 'Calcio a 11': 22 };
    setFormData(prev => ({ ...prev, maxPartecipanti: mapping[prev.tipologia] || 10 }));
  }, [formData.tipologia]);

  const performSearch = async (query) => {
    if (query.length < 4) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(query)}&maxLocations=5&outFields=Addr_type,City,PlaceName,Region&countryCode=ITA`
      );
      const data = await response.json();
      if (data.candidates) {
        const formatted = data.candidates.map(item => ({
          display_name: item.address,
          lat: item.location.y,
          lng: item.location.x,
          city: item.attributes.City || '',
          province: item.attributes.Region || ''
        }));
        setSuggestions(formatted);
      }
    } catch (err) {
      console.error("Errore ricerca ArcGIS:", err);
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
    setSelectedFieldId('');
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const triggerNotifications = (type, emails, matchId, matchDetails) => {
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type,
        emails: emails,
        matchData: {
          matchId: matchId,
          tipologia: matchDetails.tipologia,
          citta: matchDetails.citta,
          luogo: matchDetails.luogo,
          data: matchDetails.data,
          ora: matchDetails.ora
        }
      })
    }).catch(err => console.error("Errore invio notifiche:", err));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.lat) return setError('Seleziona un indirizzo dai suggerimenti');

    try {
      setLoading(true);
      setError('');
      
      if (isEditMode) {
        const response = await api.updateMatch(id, formData);
        navigate(`/match/${id}`);
        if (response.success && response.emails) {
          triggerNotifications('update', response.emails, id, formData);
        }
      } else {
        const newMatchData = {
          ...formData,
          organizzatoreId: currentUser.uid,
          organizzatoreEmail: currentUser.email,
          stato: 'active',
          createdAt: new Date().toISOString()
        };
        const response = await api.createMatch(newMatchData);
        navigate('/');
        if (response.success && response.emails) {
          triggerNotifications('new', response.emails, response.matchId, formData);
        }
      }
    } catch (err) {
      console.error("Errore salvataggio:", err);
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
            <label>Seleziona un campo salvato</label>
            <select value={selectedFieldId} onChange={handleFieldSelect}>
              <option value="">-- Scegli un campo esistente o scrivi sotto --</option>
              {savedFields.map(f => (
                <option key={f.fieldId} value={f.fieldId}>
                  {f.nome} ({f.citta})
                </option>
              ))}
            </select>
          </div>

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
            <div className="input-with-action">
              <input 
                type="text" 
                name="luogo" 
                placeholder="es. Green Park" 
                value={formData.luogo} 
                onChange={handleChange} 
                required 
              />
              <button 
                type="button" 
                className="btn-icon-action" 
                onClick={handleSaveCurrentField}
                title="Salva nei preferiti"
              >
                <Save size={20} />
              </button>
            </div>
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

          <div className="form-group">
            <label>Prezzo a persona (€)</label>
            <input type="number" name="prezzo" value={formData.prezzo} onChange={handleChange} required step="0.5" />
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