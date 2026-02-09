import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { History, Calendar, MapPin, Star, ChevronRight } from 'lucide-react';
import './Archive.css';

export default function Archive() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [pastMatches, setPastMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArchive() {
      if (!currentUser) return;
      try {
        setLoading(true);
        // 1. Prendiamo le prenotazioni dell'utente
        const resBookings = await api.getUserBookings(currentUser.uid);
        const myMatchIds = (resBookings.bookings || []).map(b => b.matchId);
        
        console.log("I miei Match IDs prenotati:", myMatchIds);

        // 2. Chiamiamo i match forzando il parametro includePast
        const resMatches = await api.getMatches({ includePast: 'true' });
        console.log("Tutti i match ricevuti dal server:", resMatches.matches);

        const now = new Date();

        const archived = resMatches.matches.filter(m => {
          // Creiamo la data senza forzare il formato T che a volte dà problemi con i fusi orari locali
          // Se m.data è YYYY-MM-DD e m.ora è HH:mm
          const [year, month, day] = m.data.split('-');
          const [hours, minutes] = m.ora.split(':');
          const dataPartita = new Date(year, month - 1, day, hours, minutes);
          
          const isPast = dataPartita < now;
          const isMine = myMatchIds.includes(m.matchId);

          return isPast && isMine;
        });

        console.log("Match filtrati per l'archivio:", archived);

        // Ordiniamo dalla più recente alla più vecchia
        archived.sort((a, b) => new Date(`${b.data}T${b.ora}`) - new Date(`${a.data}T${a.ora}`));
        
        setPastMatches(archived);
      } catch (error) {
        console.error("Errore caricamento archivio:", error);
      } finally {
        setLoading(false);
      }
    }
    loadArchive();
  }, [currentUser]);

  if (loading) return <div className="loading">Caricamento archivio...</div>;

  return (
    <div className="archive-page">
      <div className="archive-header">
        <h1><History size={32} /> Il Tuo Archivio Partite</h1>
        <p>Visualizza i risultati e vota i tuoi compagni di squadra</p>
      </div>

      <div className="archive-list">
        {pastMatches.length === 0 ? (
          <div className="empty-archive">
            <p>Non hai ancora partite concluse nel tuo storico.</p>
            <button onClick={() => navigate('/')} className="btn-secondary">Torna alla Dashboard</button>
          </div>
        ) : (
          pastMatches.map(match => (
            <div key={match.matchId} className="archive-card">
              <div className="archive-card-content">
                <div className="match-main-info">
                  <span className="match-type-tag">Calcio a {match.tipologia}</span>
                  <h3>{match.luogo}</h3>
                </div>
                
                <div className="match-meta">
                  <span><Calendar size={16} /> {match.data}</span>
                  <span><MapPin size={16} /> {match.citta}</span>
                </div>
              </div>

              <div className="archive-actions">
                <button 
                  className="btn-rate-players"
                  onClick={() => navigate(`/rate-players/${match.matchId}`)}
                >
                  <Star size={18} /> Vota Giocatori
                </button>
                <button 
                  className="btn-details-outline"
                  onClick={() => navigate(`/match/${match.matchId}`)}
                >
                  <span>Dettagli</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}