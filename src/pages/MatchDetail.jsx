import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, MapPin, Calendar, Clock, Euro, 
  ChevronDown, ChevronUp, CheckCircle, Trash2, Edit 
} from 'lucide-react';

// FIX ICONE LEAFLET
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

import 'leaflet/dist/leaflet.css';
import './MatchDetail.css';

export default function MatchDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [userBooking, setUserBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, currentUser]);

  async function loadData() {
    try {
      setLoading(true);
      const matchData = await api.getMatch(id);
      setMatch(matchData.match);

      const participantsData = await api.getMatchParticipants(id);
      setParticipants(participantsData.participants || []);

      if (currentUser) {
        const userBookingsData = await api.getUserBookings(currentUser.uid);
        const booking = userBookingsData.bookings?.find(b => b.matchId === id);
        setUserBooking(booking);
      }
    } catch (error) {
      console.error('Errore caricamento match:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleBooking() {
    try {
      await api.createBooking({
        matchId: id,
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      });
      await loadData();
    } catch (error) {
      alert('Errore durante la prenotazione.');
    }
  }

  async function handleCancelBooking() {
    if (!confirm('Vuoi davvero cancellare la tua prenotazione?')) return;
    try {
      await api.deleteBooking(userBooking.bookingId);
      await loadData();
    } catch (error) {
      alert('Errore durante la cancellazione.');
    }
  }

  async function handleDeleteMatch() {
    if (!confirm('Sei sicuro di voler eliminare questa partita?')) return;
    try {
      await api.deleteMatch(id);
      navigate('/');
    } catch (error) {
      alert('Errore durante l\'eliminazione.');
    }
  }

  if (loading) return <div className="loading">Caricamento...</div>;
  if (!match) return <div className="error">Partita non trovata.</div>;

  const isFull = match.postiOccupati >= match.postiTotali;
  const isOwner = currentUser?.uid === match.creatorId;

  return (
    <div className="match-detail">
      <div className="match-detail-header">
        <div className="header-left">
          <button onClick={() => navigate(-1)} className="btn-back">← Indietro</button>
          <h1>{match.luogo}</h1>
          <div className="match-status">
            <span className="badge">{match.postiOccupati}/{match.postiTotali} partecipanti</span>
            {userBooking && <span className="status-confirmed-badge">✓ Sei iscritto</span>}
          </div>
        </div>
      </div>

      <div className="match-detail-grid">
        {/* COLONNA SINISTRA: INFO E PARTECIPANTI */}
        <div className="match-info-section">
          <div className="info-card">
            <h3>Dettagli Partita</h3>
            
            <div className="info-item">
              <Calendar size={24} />
              <div>
                <strong>Data</strong>
                <p>{match.data}</p>
              </div>
            </div>

            <div className="info-item">
              <Clock size={24} />
              <div>
                <strong>Ora</strong>
                <p>{match.ora}</p>
              </div>
            </div>

            <div className="info-item">
              <MapPin size={24} />
              <div>
                <strong>Luogo</strong>
                <p>{match.indirizzo}</p>
                <p>{match.citta} ({match.provincia})</p>
              </div>
            </div>

            <div className="info-item">
              <Euro size={24} />
              <div>
                <strong>Prezzo</strong>
                <p>{match.prezzo}€ a persona</p>
              </div>
            </div>

            {/* LISTA GIOCATORI ESPANDIBILE */}
            <div className="participants-collapsible">
              <div className="participants-trigger" onClick={() => setShowParticipants(!showParticipants)}>
                <div className="trigger-label">
                  <Users size={20} />
                  <span>Giocatori Iscritti ({participants.length}/{match.postiTotali})</span>
                </div>
                {showParticipants ? <ChevronUp /> : <ChevronDown />}
              </div>
              
              {showParticipants && (
                <div className="participants-content animate-fade-in">
                  {participants.length === 0 ? <p className="no-matches">Nessun iscritto.</p> : (
                    <div className="participants-mini-list">
                      {participants.map(p => (
                        <div key={p.userId} className="p-badge">
                          <div className="p-avatar">{p.nome[0]}{p.cognome[0]}</div>
                          <div className="p-text">
                            <span className="p-name">{p.nome} {p.cognome}</span>
                            <span className="p-role">{p.ruolo}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* AZIONI ADMIN (Sotto la card come richiesto dal CSS) */}
          {isOwner && (
            <div className="owner-actions-bottom">
              <button onClick={() => navigate(`/edit-match/${id}`)} className="btn-edit-match">
                <Edit size={20} /> Modifica
              </button>
              <button onClick={handleDeleteMatch} className="btn-delete-match">
                <Trash2 size={20} /> Elimina
              </button>
            </div>
          )}

          {/* AZIONI PRENOTAZIONE */}
          <div className="booking-actions">
            {userBooking ? (
              <div className="booking-confirmation-box">
                <CheckCircle color="#27ae60" size={24} style={{marginBottom: '10px'}} />
                <p>La tua presenza è confermata!</p>
                <button onClick={handleCancelBooking} className="btn-delete-match" style={{width: '100%', justifyContent: 'center'}}>
                  Cancella Prenotazione
                </button>
              </div>
            ) : (
              <button 
                className="btn-book" 
                style={{
                  width: '100%', 
                  padding: '16px', 
                  backgroundColor: isFull ? '#ccc' : 'var(--primary)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: '700',
                  cursor: isFull ? 'not-allowed' : 'pointer'
                }}
                disabled={isFull}
                onClick={handleBooking}
              >
                {isFull ? 'PARTITA COMPLETA' : 'PRENOTA POSTO'}
              </button>
            )}
          </div>
        </div>

        {/* COLONNA DESTRA: MAPPA */}
        <div className="map-section">
          <div className="map-header">
            <h3>Posizione Campo</h3>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${match.lat},${match.lng}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="link-google-maps"
            >
              Apri in Google Maps
            </a>
          </div>
          <div className="map-container" style={{height: '400px'}}>
            <MapContainer center={[match.lat, match.lng]} zoom={15} style={{height: '100%', width: '100%'}} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[match.lat, match.lng]}>
                <Popup>{match.luogo}</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}