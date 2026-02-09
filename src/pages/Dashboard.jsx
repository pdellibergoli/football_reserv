import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Importiamo l'autenticazione
import { api } from '../services/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Users, MapPin, Calendar, Euro, Trash2 } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { currentUser } = useAuth(); // Prendiamo l'utente attuale
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

  // NUOVA FUNZIONE PER L'ELIMINAZIONE
  async function handleDelete(e, matchId) {
    e.stopPropagation(); // IMPORTANTE: evita che cliccando il cestino si apra il dettaglio
    if (window.confirm("Sei sicuro di voler eliminare questa partita?")) {
      try {
        await api.deleteMatch(matchId);
        // Ricarichiamo la lista o filtriamo lo stato locale
        setMatches(prev => prev.filter(m => m.matchId !== matchId));
      } catch (error) {
        alert("Errore durante l'eliminazione della partita.");
        console.error(error);
      }
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

      {/* Sezione Filtri (Invariata) */}
      <div className="filters">
        <div className="filter-group">
          <label>Tipologia</label>
          <div className="filter-buttons">
            {['', '5', '7', '8', '11'].map((t) => (
              <button
                key={t}
                className={filters.tipologia === t ? 'active' : ''}
                onClick={() => handleFilterChange('tipologia', t)}
              >
                {t === '' ? 'Tutte' : `Calcio a ${t}`}
              </button>
            ))}
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
              {/* IL BIDONCINO ROSSO */}
              {currentUser?.uid === match.creatorId && (
                <button 
                  className="delete-btn-card" 
                  onClick={(e) => handleDelete(e, match.matchId)}
                  title="Elimina partita"
                >
                  <Trash2 size={18} />
                </button>
              )}

              <div className="match-card-header">
                <span className="match-type">{match.tipologia}</span>
                <span className={`availability-badge ${getAvailabilityClass(match.postiOccupati, match.postiTotali)}`}>
                  {match.postiOccupati}/{match.postiTotali}
                </span>
              </div>

              <div className="match-card-body">
                <h3 className="match-place-name">{match.luogo}</h3>

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