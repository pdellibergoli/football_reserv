import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Users, MapPin, Calendar, Euro } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tipologia: '',
    citta: '',
    provincia: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadMatches();
  }, [filters]);

  async function loadMatches() {
    try {
      setLoading(true);
      const data = await api.getMatches(filters);
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(field, value) {
    setFilters({
      ...filters,
      [field]: value
    });
  }

  function getAvailabilityClass(postiOccupati, postiTotali) {
    const percentage = (postiOccupati / postiTotali) * 100;
    if (percentage >= 100) return 'full';
    if (percentage >= 75) return 'almost-full';
    return 'available';
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Partite Disponibili</h1>
        <p>Trova e prenota la tua prossima partita di calcetto</p>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Tipologia</label>
          <div className="filter-buttons">
            <button
              className={filters.tipologia === '' ? 'active' : ''}
              onClick={() => handleFilterChange('tipologia', '')}
            >
              Tutte
            </button>
            <button
              className={filters.tipologia === '5' ? 'active' : ''}
              onClick={() => handleFilterChange('tipologia', '5')}
            >
              Calcio a 5
            </button>
            <button
              className={filters.tipologia === '7' ? 'active' : ''}
              onClick={() => handleFilterChange('tipologia', '7')}
            >
              Calcio a 7
            </button>
            <button
              className={filters.tipologia === '8' ? 'active' : ''}
              onClick={() => handleFilterChange('tipologia', '8')}
            >
              Calcio a 8
            </button>
            <button
              className={filters.tipologia === '11' ? 'active' : ''}
              onClick={() => handleFilterChange('tipologia', '11')}
            >
              Calcio a 11
            </button>
          </div>
        </div>

        <div className="filter-inputs">
          <div className="filter-input">
            <label htmlFor="citta">Città</label>
            <input
              type="text"
              id="citta"
              placeholder="Es: Milano"
              value={filters.citta}
              onChange={(e) => handleFilterChange('citta', e.target.value)}
            />
          </div>
          
          <div className="filter-input">
            <label htmlFor="provincia">Provincia</label>
            <input
              type="text"
              id="provincia"
              placeholder="Es: MI"
              value={filters.provincia}
              onChange={(e) => handleFilterChange('provincia', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="matches-grid">
        {loading ? (
          <div className="loading">Caricamento partite...</div>
        ) : matches.length === 0 ? (
          <div className="no-matches">
            <p>Nessuna partita trovata con i filtri selezionati.</p>
            <button onClick={() => navigate('/create-match')} className="btn-primary">
              Crea una nuova partita
            </button>
          </div>
        ) : (
          matches.map((match) => (
            <div
              key={match.matchId}
              className="match-card"
              onClick={() => navigate(`/match/${match.matchId}`)}
            >
              <div className="match-card-header">
                <span className="match-type">Calcio a {match.tipologia}</span>
                <span className={`availability-badge ${getAvailabilityClass(match.postiOccupati, match.postiTotali)}`}>
                  {match.postiOccupati}/{match.postiTotali}
                </span>
              </div>

              <div className="match-card-body">
                <div className="match-info">
                  <Calendar size={18} />
                  <span>
                    {format(new Date(match.data), 'EEEE d MMMM yyyy', { locale: it })} - {match.ora}
                  </span>
                </div>

                <div className="match-info">
                  <MapPin size={18} />
                  <span>{match.citta}, {match.provincia}</span>
                </div>

                <div className="match-info">
                  <Users size={18} />
                  <span>{match.postiTotali - match.postiOccupati} posti disponibili</span>
                </div>

                <div className="match-info">
                  <Euro size={18} />
                  <span>€{match.prezzo} a persona</span>
                </div>
              </div>

              <div className="match-card-footer">
                <button className="btn-secondary">Vedi Dettagli</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}