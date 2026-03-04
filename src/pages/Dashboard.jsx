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
  ChevronRight
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [matches, setMatches] = useState([]);
  const [userMatchIds, setUserMatchIds] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Tutti');

  const matchTypes = ['Tutti', 'Calcio a 5', 'Calcio a 7', 'Calcio a 8', 'Calcio a 11'];

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      // 1. Carica i match (il backend ora restituisce postiOccupati dinamici)
      const data = await api.getMatches();
      setMatches(data.matches || []);

      // 2. Carica le prenotazioni dell'utente per il badge "Sei iscritto"
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

  // Logica di filtraggio combinata (Ricerca + Tipologia)
  const filteredMatches = matches.filter(match => {
    const matchesSearch = 
      match.luogo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.citta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.indirizzo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'Tutti' || match.tipologia === selectedType;
    
    return matchesSearch && matchesType;
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
    <div className="dashboard-container">
      {/* Hero Section / Welcome */}
      <div className="dashboard-welcome">
        <h1>Ciao, {currentUser?.displayName || 'Giocatore'}! ⚽</h1>
        <p>Trova la tua prossima sfida o scendi in campo con i tuoi amici.</p>
      </div>

      {/* Sezione Filtri */}
      <div className="filters-section">
        <div className="search-wrapper">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="Cerca per città, via o nome campo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="types-filter">
          {matchTypes.map(type => (
            <button 
              key={type}
              className={`type-btn ${selectedType === type ? 'active' : ''}`}
              onClick={() => setSelectedType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Partite */}
      <div className="matches-grid">
        {filteredMatches.length > 0 ? (
          filteredMatches.map(match => {
            const isBooked = userMatchIds.includes(match.matchId);
            const isFull = match.postiOccupati >= match.postiTotali;

            return (
              <div 
                key={match.matchId} 
                className={`match-card-new ${isBooked ? 'is-booked' : ''} ${isFull ? 'is-full' : ''}`}
                onClick={() => navigate(`/match/${match.matchId}`)}
              >
                {/* Badge "Sei iscritto" */}
                {isBooked && (
                  <div className="my-match-tag">
                    <Trophy size={14} />
                    <span>Sei iscritto</span>
                  </div>
                )}

                <div className="match-card-body">
                  <div className="match-main-info">
                    <span className={`match-type-label ${match.tipologia.replace(/\s+/g, '-').toLowerCase()}`}>
                      {match.tipologia}
                    </span>
                    <h2 className="match-title">{match.luogo}</h2>
                    <div className="match-location">
                      <MapPin size={16} />
                      <span>{match.indirizzo}, {match.citta}</span>
                    </div>
                  </div>

                  <div className="match-stats-row">
                    <div className="stat-item">
                      <Calendar size={18} />
                      <span>{match.data}</span>
                    </div>
                    <div className="stat-item">
                      <Clock size={18} />
                      <span>{match.ora}</span>
                    </div>
                    <div className="stat-item price">
                      <Euro size={18} />
                      <span>{match.prezzo}€</span>
                    </div>
                  </div>

                  <div className="match-footer-new">
                    <div className="occupancy-container">
                      <div className="occupancy-bar">
                        <div 
                          className="occupancy-fill" 
                          style={{ width: `${(match.postiOccupati / match.postiTotali) * 100}%` }}
                        ></div>
                      </div>
                      <span className="occupancy-text">
                        {match.postiOccupati} / {match.postiTotali} Giocatori
                      </span>
                    </div>
                    
                    <button className="btn-details-circle">
                      <ChevronRight size={24} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-results">
            <Filter size={48} />
            <h3>Nessuna partita trovata</h3>
            <p>Prova a cambiare i filtri o la zona di ricerca.</p>
            <button onClick={() => {setSearchTerm(''); setSelectedType('Tutti');}} className="btn-reset">
              Resetta filtri
            </button>
          </div>
        )}
      </div>
    </div>
  );
}