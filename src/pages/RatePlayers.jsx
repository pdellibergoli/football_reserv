import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Star, ArrowLeft, Send, UserCircle } from 'lucide-react';
import './RatePlayers.css';

export default function RatePlayers() {
  const { matchId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ratings, setRatings] = useState({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Carichiamo partecipanti e voti già esistenti per questo match
        const [pRes, rRes] = await Promise.all([
          api.getMatchParticipants(matchId),
          api.getMatchRatings(matchId)
        ]);

        const playersList = pRes?.participants || [];
        const existingRatings = rRes?.ratings || [];

        const others = playersList.filter(p => p.userId !== currentUser.uid);
        setPlayers(others);

        const initialStatus = {};
        others.forEach(p => {
          // Vediamo se ho già votato questo giocatore in questo match
          const prev = existingRatings.find(r => r.fromUserId === currentUser.uid && r.toUserId === p.userId);
          
          initialStatus[p.userId] = {
            stars: prev ? parseInt(prev.stars) : 0,
            comment: prev ? prev.comment : "",
            ratingId: prev ? prev.ratingId : null,
            isUpdate: !!prev
          };
        });
        setRatings(initialStatus);
      } catch (error) {
        console.error("Errore caricamento:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [matchId, currentUser]);

  const handleStarClick = (userId, stars) => {
    setRatings(prev => ({ ...prev, [userId]: { ...prev[userId], stars } }));
  };

  const handleCommentChange = (userId, comment) => {
    setRatings(prev => ({ ...prev, [userId]: { ...prev[userId], comment } }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const entries = Object.entries(ratings).filter(([_, data]) => data.stars > 0);

      for (const [toUserId, data] of entries) {
        const payload = {
          matchId,
          fromUserId: currentUser.uid,
          toUserId,
          stars: data.stars,
          comment: data.comment
        };

        if (data.isUpdate && data.ratingId) {
          await api.updateRating(data.ratingId, payload);
        } else {
          await api.createRating(payload);
        }
        // Piccolo delay per evitare congestione API
        await new Promise(r => setTimeout(r, 100));
      }

      alert("Valutazioni salvate con successo!");
      navigate('/archive');
    } catch (error) {
      alert("Errore durante il salvataggio.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Caricamento partecipanti...</div>;

  return (
    <div className="rate-page">
      <button onClick={() => navigate(-1)} className="btn-back">
        <ArrowLeft size={20} /> Torna all'Archivio
      </button>

      <h1>Vota i tuoi compagni</h1>
      <p className="subtitle">Puoi modificare i tuoi voti in qualsiasi momento</p>

      <div className="players-to-rate">
        {players.map(player => (
          <div key={player.userId} className="player-rate-card">
            <div className="player-info-basic">
              <UserCircle size={40} />
              <div>
                <h4>{player.nome} {player.cognome}</h4>
                <p>{player.ruolo} {ratings[player.userId]?.isUpdate && <span className="already-voted">(Già votato)</span>}</p>
              </div>
            </div>

            <div className="star-rating-input">
              {[1, 2, 3, 4, 5].map(star => (
                <Star 
                  key={star}
                  size={28}
                  className={ratings[player.userId]?.stars >= star ? "star-active" : "star-inactive"}
                  onClick={() => handleStarClick(player.userId, star)}
                  fill={ratings[player.userId]?.stars >= star ? "#ffc107" : "none"}
                />
              ))}
            </div>

            <textarea 
              placeholder="Commento sulla prestazione..."
              value={ratings[player.userId]?.comment}
              onChange={(e) => handleCommentChange(player.userId, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button 
        className="btn-submit-ratings" 
        onClick={handleSubmit}
        disabled={submitting || players.length === 0}
      >
        <Send size={18} /> {submitting ? "Salvataggio..." : "Salva Valutazioni"}
      </button>
    </div>
  );
}