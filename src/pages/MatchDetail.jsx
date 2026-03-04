import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Users, MapPin, Calendar, Clock, Euro, 
  ChevronDown, ChevronUp, CheckCircle, Trash2, Edit 
} from 'lucide-react';

// FIX ICONE LEAFLET (Evita l'errore 404 sulle icone marker)
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
      await loadData(); // Ricarica per aggiornare lista e contatore
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

  if (loading) return <div className="loading">Caricamento...</div>;
  if (!match) return <div className="error">Partita non trovata.</div>;

  const isFull = match.postiOccupati >= match.postiTotali;
  const isOwner = currentUser?.uid === match.creatorId;

  return (
    <div className="match-detail-container">
      <div className="match-detail-card">
        <div className="detail-header">
          <button onClick={() => navigate(-1)} className="btn-back">← Torna indietro</button>
          <h1>{match.luogo}</h1>
          <div className="match-badges">
            <span className="type-badge">{match.tipologia}</span>
            {userBooking && <span className="user-booked-badge">✓ Sei iscritto</span>}
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-info">
            <div className="info-section">
              <h3>Informazioni Partita</h3>
              <div className="info-row"><Calendar /> <span>{match.data}</span></div>
              <div className="info-row"><Clock /> <span>{match.ora}</span></div>
              <div className="info-row"><MapPin /> <span>{match.indirizzo}, {match.citta}</span></div>
              <div className="info-row"><Euro /> <span>{match.prezzo}€ a persona</span></div>
            </div>

            {/* LISTA GIOCATORI ESPANDIBILE */}
            <div className="participants-collapsible">
              <div className="collapsible-trigger" onClick={() => setShowParticipants(!showParticipants)}>
                <div className="trigger-left">
                  <Users size={20} />
                  <span>Giocatori Iscritti ({participants.length}/{match.postiTotali})</span>
                </div>
                {showParticipants ? <ChevronUp /> : <ChevronDown />}
              </div>
              
              {showParticipants && (
                <div className="collapsible-content">
                  {participants.length === 0 ? <p>Nessun iscritto.</p> : (
                    <div className="participants-mini-list">
                      {participants.map(p => (
                        <div key={p.userId} className="p-badge">
                          <div className="p-avatar">{p.nome[0]}{p.cognome[0]}</div>
                          <div className="p-info">
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

            {/* AZIONI PRENOTAZIONE */}
            <div className="booking-actions">
              {userBooking ? (
                <div className="booked-status-box">
                  <CheckCircle color="#2ecc71" size={32} />
                  <p>La tua prenotazione è confermata!</p>
                  <button onClick={handleCancelBooking} className="btn-cancel">Annulla Prenotazione</button>
                </div>
              ) : (
                <button 
                  className="btn-main-action" 
                  disabled={isFull}
                  onClick={handleBooking}
                >
                  {isFull ? 'Posti Esauriti' : 'Prenota Posto'}
                </button>
              )}
            </div>
            
            {isOwner && (
              <div className="admin-actions">
                <button className="btn-outline"><Edit size={16} /> Modifica</button>
                <button className="btn-outline-danger"><Trash2 size={16} /> Elimina</button>
              </div>
            )}
          </div>

          <div className="detail-map">
            <h3>Posizione Campo</h3>
            <div className="map-wrapper">
              <MapContainer center={[match.lat, match.lng]} zoom={15} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[match.lat, match.lng]}>
                  <Popup>{match.luogo}</Popup>
                </Marker>
              </MapContainer>
            </div>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${match.lat},${match.lng}`} 
              target="_blank" 
              className="google-maps-link"
            >
              Apri in Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}