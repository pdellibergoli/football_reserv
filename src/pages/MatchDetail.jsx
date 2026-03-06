import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, MapPin, Calendar, Clock, Euro, 
  ChevronDown, ChevronUp, CheckCircle, Trash2, Edit, Clock8 
} from 'lucide-react';

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
  const [isAdmin, setIsAdmin] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);

  async function loadData() {
    try {
      const data = await api.getMatch(id);
      if (data.match) setMatch(data.match);
      if (data.participants) setParticipants(data.participants);

      if (currentUser) {
        const [userData, bookingsData] = await Promise.all([
          api.getUser(currentUser.uid),
          api.getUserBookings(currentUser.uid)
        ]);

        setIsAdmin(userData?.isAdmin || false);
        const booking = bookingsData.bookings?.find(b => b.matchId === id);
        setUserBooking(booking);
      }
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const data = await api.getMatch(id);
        if (!isMounted) return;

        if (data.match) setMatch(data.match);
        if (data.participants) setParticipants(data.participants);

        if (currentUser) {
          const [userData, bookingsData] = await Promise.all([
            api.getUser(currentUser.uid),
            api.getUserBookings(currentUser.uid)
          ]);
          
          if (isMounted) {
            setIsAdmin(userData?.isAdmin || false);
            const booking = bookingsData.bookings?.find(b => b.matchId === id);
            setUserBooking(booking);
          }
        }
      } catch (error) {
        console.error('Errore caricamento dati iniziale:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitialData();
    return () => { isMounted = false; };
  }, [id, currentUser?.uid]);

  async function handleBooking() {
    try {
      const res = await api.createBooking({
        matchId: id,
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      });
      
      if (res.status === 'waiting') {
        alert('Partita piena! Sei in lista d\'attesa. Ti avviseremo via mail.');
      } else {
        alert('Prenotazione confermata!');
      }
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
  const canManage = isOwner || isAdmin; 
  const isPast = new Date(match.data) < new Date().setHours(0, 0, 0, 0);

  const confirmedPlayers = participants.filter(p => !p.status || p.status === 'confirmed');
  const waitingPlayers = participants.filter(p => p.status === 'waiting');

  return (
    <div className="match-detail">
      <div className="match-detail-header">
        <div className="header-left">
          <button onClick={() => navigate(-1)} className="btn-back">← Indietro</button>
          <h1>{match.luogo}</h1>
          <div className="match-status">
            <span className="badge">{match.postiOccupati}/{match.postiTotali} partecipanti</span>
            {userBooking && (
              <span className={`status-confirmed-badge ${userBooking.status}`}>
                {userBooking.status === 'confirmed' ? '✓ Sei iscritto' : '⏳ In lista d\'attesa'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="match-detail-grid">
        <div className="match-info-section">
          <div className="info-card">
            <h3>Dettagli Partita</h3>
            
            <div className="info-item">
              <Calendar size={24} />
              <div><strong>Data</strong><p>{match.data}</p></div>
            </div>

            <div className="info-item">
              <Clock size={24} />
              <div><strong>Ora</strong><p>{match.ora}</p></div>
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
              <div><strong>Prezzo</strong><p>{match.prezzo}€ a persona</p></div>
            </div>

            <div className="participants-collapsible">
              <div className="participants-trigger" onClick={() => setShowParticipants(!showParticipants)}>
                <div className="trigger-label">
                  <Users size={20} />
                  <span>Giocatori Iscritti ({confirmedPlayers.length}/{match.postiTotali})</span>
                </div>
                {showParticipants ? <ChevronUp /> : <ChevronDown />}
              </div>
              
              {showParticipants && (
                <div className="participants-content animate-fade-in">
                  {confirmedPlayers.length === 0 ? (
                    <p className="no-matches">Nessun iscritto confermato.</p>
                  ) : (
                    <div className="participants-mini-list">
                      {confirmedPlayers.map(p => (
                        <div key={p.userId || Math.random()} className="p-badge">
                          <div className="p-avatar">
                            {p.nome ? p.nome[0] : 'U'}{p.cognome ? p.cognome[0] : ''}
                          </div>
                          <div className="p-text">
                            <span className="p-name">{p.nome} {p.cognome}</span>
                            <span className="p-role">{p.ruolo || 'Giocatore'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {waitingPlayers.length > 0 && (
                    <div className="waitlist-mini-section" style={{marginTop:'20px', borderTop:'1px solid #eee', paddingTop:'10px'}}>
                      <h4 style={{fontSize:'0.9rem', marginBottom:'10px', color: '#f39c12'}}>In lista d'attesa:</h4>
                      {waitingPlayers.map((p, index) => (
                        <div key={p.userId || index} className="p-badge waiting">
                          <span className="wait-pos">#{index + 1}</span>
                          <span className="p-name">{p.nome} {p.cognome}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {canManage && !isPast && (
            <div className="owner-actions-bottom">
              <button onClick={() => navigate(`/edit-match/${id}`)} className="btn-edit-match">
                <Edit size={20} /> Modifica
              </button>
              <button onClick={handleDeleteMatch} className="btn-delete-match">
                <Trash2 size={20} /> Elimina
              </button>
            </div>
          )}

          <div className="booking-actions">
            {isPast ? (
              <div className="alert alert-warning" style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <Clock size={24} style={{ marginBottom: '10px', color: '#6c757d' }} />
                <p style={{ margin: 0, fontWeight: '600', color: '#6c757d' }}>
                  Partita terminata. Prenotazioni chiuse.
                </p>
              </div>
            ) : (
              userBooking ? (
                <div className={`booking-confirmation-box ${userBooking.status}`}>
                  {userBooking.status === 'confirmed' ? (
                    <CheckCircle color="#27ae60" size={24} style={{ marginBottom: '10px' }} />
                  ) : (
                    <Clock8 color="#f39c12" size={24} style={{ marginBottom: '10px' }} />
                  )}
                  <p>{userBooking.status === 'confirmed' ? 'Sei iscritto!' : 'Sei in lista d\'attesa.'}</p>
                  <button onClick={handleCancelBooking} className="btn-delete-match" style={{ width: '100%', justifyContent: 'center' }}>
                    Annulla {userBooking.status === 'confirmed' ? 'Prenotazione' : 'Richiesta'}
                  </button>
                </div>
              ) : (
                <button 
                  className="btn-book" 
                  style={{
                    width: '100%', padding: '16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer',
                    backgroundColor: isFull ? '#f39c12' : 'var(--primary)', color: 'white', border: 'none'
                  }}
                  onClick={handleBooking}
                >
                  {isFull ? 'METTITI IN LISTA D\'ATTESA' : 'PRENOTA POSTO'}
                </button>
              )
            )}
          </div>
        </div>

        <div className="map-section">
          <div className="map-header">
            <h3>Posizione Campo</h3>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${match.lat},${match.lng}`} 
              target="_blank" rel="noopener noreferrer" className="link-google-maps"
            >
              Apri in Google Maps
            </a>
          </div>
          <div className="map-container" style={{height: '400px'}}>
            <MapContainer center={[match.lat, match.lng]} zoom={15} style={{height: '100%', width: '100%'}} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[match.lat, match.lng]}><Popup>{match.luogo}</Popup></Marker>
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}