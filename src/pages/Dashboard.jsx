import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Search, 
  Trophy, 
  Filter,
  Euro
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [matches, setMatches] = useState([]);
  const [userMatchIds, setUserMatchIds] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchCitta, setSearchCitta] = useState('');
  const [searchProvincia, setSearchProvincia] = useState('');
  const [selectedType, setSelectedType] = useState('Tutti');

  const matchTypes = ['Tutti', 'Calcio a 5', 'Calcio a 7', 'Calcio a 8', 'Calcio a 11'];

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const data = await api.getMatches();
      setMatches(data.matches || []);

      if (currentUser) {
        const bookingsData = await api.getUserBookings(currentUser.uid);
        const ids = bookingsData.bookings.map(b => b.matchId);
        setUserMatchIds(ids);
      }
    } catch (error) {
      console.error('Errore nel caricamento della dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredMatches = matches.filter(match => {
    const matchesCitta = match.citta.toLowerCase().includes(searchCitta.toLowerCase());
    const matchesProv = match.provincia.toLowerCase().includes(searchProvincia.toLowerCase());
    const matchesType = selectedType === 'Tutti' || match.tipologia === selectedType;
    
    return matchesCitta && matchesProv && matchesType;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Caricamento partite in corso...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header conforme al CSS */}
      <div className="dashboard-header">
        <h1>Ciao, {currentUser?.displayName || 'Giocatore'}! ⚽</h1>
        <p>Trova la tua prossima sfida o scendi in campo con i tuoi amici.</p>
      </div>

      {/* Sezione Filtri conforme al CSS */}
      <div className="filters">
        <div className="filter-group">
          <label>Tipologia</label>
          <div className="filter-buttons">
            {matchTypes.map(type => (
              <button 
                key={type}
                className={selectedType === type ? 'active' : ''}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-inputs">
          <div className="filter-input">
            <label>Città</label>
            <input 
              type="text" 
              placeholder="Cerca città..." 
              value={searchCitta}
              onChange={(e) => setSearchCitta(e.target.value)}
            />
          </div>
          <div className="filter-input">
            <label>Provincia</label>
            <input 
              type="text" 
              placeholder="Cerca provincia..." 
              value={searchProvincia}
              onChange={(e) => setSearchProvincia(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Griglia Partite */}
      <div className="matches-grid">
        {filteredMatches.length > 0 ? (
          filteredMatches.map(match => {
            const isBooked = userMatchIds.includes(match.matchId);
            const isFull = match.postiOccupati >= match.postiTotali;
            const isAlmostFull = match.postiOccupati >= match.postiTotali * 0.8;

            return (
              <div 
                key={match.matchId} 
                className={`match-card ${isBooked ? 'booked' : ''}`}
                onClick={() => navigate(`/match/${match.matchId}`)}
              >
                {/* Badge di iscrizione */}
                {isBooked && (
                  <div className="booked-badge">
                    <Trophy size={12} style={{marginRight: '4px'}} />
                    ✓ Sei iscritto
                  </div>
                )}

                <div className="match-card-header">
                  <span className="match-type">{match.tipologia}</span>
                  <span className={`availability-badge ${isFull ? 'full' : isAlmostFull ? 'almost-full' : 'available'}`}>
                    {match.postiOccupati} / {match.postiTotali}
                  </span>
                </div>

                <div className="match-card-body">
                  <h3>{match.luogo}</h3>
                  <div className="match-info">
                    <Calendar size={18} />
                    <span>{match.data}</span>
                  </div>
                  <div className="match-info">
                    <Clock size={18} />
                    <span>{match.ora}</span>
                  </div>
                  <div className="match-info">
                    <MapPin size={18} />
                    <span>{match.citta} ({match.provincia})</span>
                  </div>
                  <div className="match-info">
                    <Euro size={18} />
                    <span>{match.prezzo}€ a persona</span>
                  </div>
                </div>

                <div className="match-card-footer">
                  <button className="btn-view" style={{
                    width: '100%', 
                    padding: '10px', 
                    background: 'var(--primary)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px',
                    fontWeight: '600'
                  }}>
                    Visualizza Dettagli
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-matches">
            <Filter size={48} color="#94a3b8" />
            <p>Nessuna partita trovata con questi filtri.</p>
            <button 
              onClick={() => {setSearchCitta(''); setSearchProvincia(''); setSelectedType('Tutti');}}
              style={{
                padding: '8px 16px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Resetta filtri
            </button>
          </div>
        )}
      </div>
    </div>
  );
}