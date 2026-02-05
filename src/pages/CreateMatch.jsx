import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './CreateMatch.css';

export default function CreateMatch() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    citta: '',
    provincia: '',
    indirizzo: '',
    lat: '',
    lng: '',
    data: '',
    ora: '',
    tipologia: '5',
    prezzo: '',
    postiTotali: '10'
  });

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.lat || !formData.lng) {
      alert('Per favore inserisci le coordinate (puoi trovarle su Google Maps)');
      return;
    }

    try {
      setLoading(true);
      
      const matchData = {
        ...formData,
        creatorId: currentUser.uid,
        postiOccupati: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
        prezzo: parseFloat(formData.prezzo),
        postiTotali: parseInt(formData.postiTotali)
      };

      const result = await api.createMatch(matchData);
      navigate(`/match/${result.matchId}`);
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Errore nella creazione della partita. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-match">
      <div className="create-match-header">
        <h1>Organizza una Partita</h1>
        <p>Compila i dettagli per creare una nuova partita</p>
      </div>

      <form onSubmit={handleSubmit} className="create-match-form">
        <div className="form-section">
          <h3>Tipologia Partita</h3>
          <div className="form-group">
            <label htmlFor="tipologia">Tipo di Calcio</label>
            <select
              id="tipologia"
              name="tipologia"
              value={formData.tipologia}
              onChange={handleChange}
              required
            >
              <option value="5">Calcio a 5</option>
              <option value="7">Calcio a 7</option>
              <option value="8">Calcio a 8</option>
              <option value="11">Calcio a 11</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="postiTotali">Numero di Partecipanti</label>
            <input
              type="number"
              id="postiTotali"
              name="postiTotali"
              value={formData.postiTotali}
              onChange={handleChange}
              required
              min="2"
              max="22"
            />
          </div>

          <div className="form-group">
            <label htmlFor="prezzo">Prezzo a Persona (€)</label>
            <input
              type="number"
              id="prezzo"
              name="prezzo"
              value={formData.prezzo}
              onChange={handleChange}
              required
              min="0"
              step="0.5"
              placeholder="Es: 10"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Data e Ora</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="data">Data</label>
              <input
                type="date"
                id="data"
                name="data"
                value={formData.data}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="ora">Ora</label>
              <input
                type="time"
                id="ora"
                name="ora"
                value={formData.ora}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Luogo</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="citta">Città</label>
              <input
                type="text"
                id="citta"
                name="citta"
                value={formData.citta}
                onChange={handleChange}
                required
                placeholder="Es: Milano"
              />
            </div>

            <div className="form-group">
              <label htmlFor="provincia">Provincia</label>
              <input
                type="text"
                id="provincia"
                name="provincia"
                value={formData.provincia}
                onChange={handleChange}
                required
                placeholder="Es: MI"
                maxLength="2"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="indirizzo">Indirizzo Completo</label>
            <input
              type="text"
              id="indirizzo"
              name="indirizzo"
              value={formData.indirizzo}
              onChange={handleChange}
              required
              placeholder="Via, numero civico"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="lat">Latitudine</label>
              <input
                type="number"
                id="lat"
                name="lat"
                value={formData.lat}
                onChange={handleChange}
                required
                step="any"
                placeholder="Es: 45.4642"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lng">Longitudine</label>
              <input
                type="number"
                id="lng"
                name="lng"
                value={formData.lng}
                onChange={handleChange}
                required
                step="any"
                placeholder="Es: 9.1900"
              />
            </div>
          </div>

          <div className="help-text">
            💡 Trova le coordinate su <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google Maps</a>: 
            clicca con il tasto destro sul luogo e copia latitudine e longitudine
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/')} className="btn-secondary">
            Annulla
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creazione in corso...' : 'Crea Partita'}
          </button>
        </div>
      </form>
    </div>
  );
}