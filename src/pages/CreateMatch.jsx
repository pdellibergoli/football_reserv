import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { usePlacesWidget } from "react-google-autocomplete";
import './CreateMatch.css';

export default function CreateMatch() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    tipologia: 'Calcio a 5',
    data: '',
    ora: '',
    luogo: '', // Nome del centro sportivo
    indirizzo: '', // Indirizzo completo da Google
    citta: '',
    provincia: '',
    prezzo: '',
    maxPartecipanti: 10,
    lat: '',
    lng: ''
  });

  // Integrazione Google Places Autocomplete
  const { ref: placesRef } = usePlacesWidget({
    apiKey: "LA_TUA_GOOGLE_MAPS_API_KEY", // Sostituisci con la tua chiave API di Google
    onPlaceSelected: (place) => {
      const address = place.formatted_address || '';
      let city = '';
      let province = '';

      // Estrazione città e provincia dai componenti dell'indirizzo
      if (place.address_components) {
        place.address_components.forEach(component => {
          if (component.types.includes("locality")) city = component.long_name;
          if (component.types.includes("administrative_area_level_2")) province = component.short_name;
        });
      }

      setFormData(prev => ({
        ...prev,
        indirizzo: address,
        citta: city,
        provincia: province,
        lat: place.geometry.location.lat().toString(),
        lng: place.geometry.location.lng().toString()
      }));
    },
    options: {
      types: ["establishment", "geocode"],
      componentRestrictions: { country: "it" },
    },
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.lat || !formData.lng) {
      setError('Per favore, seleziona un indirizzo valido dai suggerimenti');
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

      await api.createMatch(matchData);
      navigate('/');
    } catch (err) {
      setError('Errore nella creazione della partita. Riprova.');
      console.error('Error creating match:', err);
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
            <input 
              type="text" 
              name="luogo" 
              placeholder="es. Stadio Comunale" 
              value={formData.luogo} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Cerca Indirizzo</label>
            <input
              ref={placesRef}
              type="text"
              placeholder="Inizia a scrivere l'indirizzo..."
              className="address-autocomplete"
              required
            />
            {formData.indirizzo && (
              <small className="address-preview">Selezionato: {formData.indirizzo}</small>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Prezzo a Persona (€)</label>
              <input type="number" name="prezzo" value={formData.prezzo} onChange={handleChange} required step="0.5" />
            </div>
            <div className="form-group">
              <label>Max Partecipanti</label>
              <input type="number" name="maxPartecipanti" value={formData.maxPartecipanti} onChange={handleChange} required />
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