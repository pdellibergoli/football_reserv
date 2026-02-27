import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Users, MapPin, Calendar, Euro, Star, UserCircle, Trash2, Edit } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './MatchDetail.css';

export default function MatchDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [participants, setParticipants] = useState([]); // Nuovo stato
  const [ratings, setRatings] = useState([]);
  const [userBooking, setUserBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [rating, setRating] = useState({ stars: 5, comment: '' });

  useEffect(() => {
    loadMatchData();
  }, [id]);

  async function loadMatchData() {
    try {
      setLoading(true);
      const matchData = await api.getMatch(id);
      setMatch(matchData.match);
      
      // Carichiamo i partecipanti con nomi e ruoli
      const participantsData = await api.getMatchParticipants(id);
      setParticipants(participantsData.participants || []);

      const userBookingsData = await api.getUserBookings(currentUser.uid);
      const booking = userBookingsData.bookings?.find(b => b.matchId === id);
      setUserBooking(booking);

      const ratingsData = await api.getMatchRatings(id);
      setRatings(ratingsData.ratings || []);
    } catch (error) {
      console.error('Error loading match:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMatch() {
    if (!confirm('Sei sicuro di voler eliminare definitivamente questa partita?')) return;
    try {
      await api.deleteMatch(id);
      navigate('/');
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Errore durante l\'eliminazione.');
    }
  }

  async function handleBooking() {
    try {
      await api.createBooking({
        matchId: id,
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      });
      await loadMatchData();
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Errore nella prenotazione. Riprova.');
    }
  }

  async function handleCancelBooking() {
    if (!confirm('Sei sicuro di voler cancellare la prenotazione?')) return;
    try {
      await api.deleteBooking(userBooking.bookingId);
      await loadMatchData();
    } catch (error) {
      console.error('Error canceling booking:', error);
      alert('Errore nella cancellazione. Riprova.');
    }
  }

  async function handleSubmitRating(e) {
    e.preventDefault();
    try {
      await api.createRating({
        matchId: id,
        userId: currentUser.uid,
        stars: rating.stars,
        comment: rating.comment,
        createdAt: new Date().toISOString()
      });
      setShowRatingForm(false);
      setRating({ stars: 5, comment: '' });
      await loadMatchData();
    } catch (error) {
      alert('Errore nell\'invio della recensione.');
    }
  }

  if (loading) return <div className="loading">Caricamento...</div>;
  if (!match) return <div className="error">Partita non trovata</div>;

  const isOwner = currentUser?.uid === match.creatorId;
  const isMatchFull = match.postiOccupati >= match.postiTotali; 
  const matchDate = new Date(match.data);
  const dataOraPartita = new Date(`${match.data}T${match.ora}`);
  const adesso = new Date();
  const isPastMatch = dataOraPartita < adesso;
  const canBook = !userBooking && !isMatchFull && !isPastMatch;
  const avgRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length).toFixed(1)
    : 'N/A';

  return (
    <div className="match-detail">
      <div className="match-detail-header">
        <div className="header-left">
          <button onClick={() => navigate('/')} className="btn-back">← Indietro</button>
          <h1>{match.luogo}</h1> 
        </div>
        <div className="match-status">
          <span className="badge">{match.postiOccupati}/{match.postiTotali} partecipanti</span>
        </div>
      </div>

      <div className="match-detail-grid">
        <div className="match-info-section">
          <div className="info-card">
            <h3>Dettagli Partita</h3>
            <div className="info-item"><Calendar size={20} /><div><strong>Data e Ora</strong><p>{format(matchDate, 'EEEE d MMMM yyyy', { locale: it })} alle {match.ora}</p></div></div>
            <div className="info-item"><MapPin size={20} /><div><strong>Luogo</strong><p>{match.indirizzo}</p><p>{match.citta}, {match.provincia}</p></div></div>
            <div className="info-item"><Users size={20} /><div><strong>Disponibilità</strong><p>{match.postiTotali - match.postiOccupati} posti ancora liberi</p></div></div>
            <div className="info-item"><Euro size={20} /><div><strong>Prezzo</strong><p>€{match.prezzo} a persona</p></div></div>
            
            {/* NUOVA SEZIONE PARTECIPANTI LISTA */}
            <div className="participants-list-container">
              <h4>Giocatori Iscritti</h4>
              <div className="participants-mini-list">
                {participants.length === 0 ? <p>Nessun iscritto.</p> : 
                  participants.map(p => (
                    <div key={p.userId} className="p-badge">
                      <div className="p-avatar">{p.nome[0]}{p.cognome[0]}</div>
                      <span>{p.nome} {p.cognome} ({p.ruolo})</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {isOwner && (
            <div className="owner-actions-bottom">
              <button onClick={() => navigate(`/edit-match/${id}`)} className="btn-edit-match"><Edit size={20} /> Modifica</button>
              <button onClick={handleDeleteMatch} className="btn-delete-match"><Trash2 size={20} /> Elimina</button>
            </div>
          )}

          {canBook && <button onClick={handleBooking} className="btn-primary btn-large">Prenota Partita</button>}
          {userBooking && !isPastMatch && <button onClick={handleCancelBooking} className="btn-danger btn-large">Cancella Prenotazione</button>}
          {isMatchFull && !userBooking && <div className="alert alert-warning">Partita al completo</div>}
        </div>

        <div className="map-section">
          <div className="map-header">
            <h3>Posizione</h3>
            <a href={`https://www.google.com/maps/search/?api=1&query=${match.lat},${match.lng}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">Apri in Google Maps</a>
          </div>
          <div className="map-container">
            <MapContainer center={[match.lat || 45.4642, match.lng || 9.1900]} zoom={15} style={{ height: '400px', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OSM'/>
              <Marker position={[match.lat || 45.4642, match.lng || 9.1900]}><Popup>{match.indirizzo}</Popup></Marker>
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Sezione Recensioni (come nel tuo codice originale) */}
      {ratings.length > 0 && (
        <div className="ratings-section">
          <h3>Recensioni ({ratings.length})</h3>
          <div className="ratings-list">
            {ratings.map((r, idx) => (
              <div key={idx} className="rating-item">
                <div className="rating-header"><UserCircle size={24} /><div><div className="rating-stars">{'⭐'.repeat(r.stars)}</div><small>{format(new Date(r.createdAt), 'dd MMM yyyy', { locale: it })}</small></div></div>
                {r.comment && <p className="rating-comment">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}