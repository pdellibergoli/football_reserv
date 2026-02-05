import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Star } from 'lucide-react';
import './Profile.css';

export default function Profile() {
  const { currentUser, userProfile, updateUserProfile, updatePassword } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [userRatings, setUserRatings] = useState([]);
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    dataNascita: '',
    sesso: '',
    ruolo: ''
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        nome: userProfile.nome || '',
        cognome: userProfile.cognome || '',
        dataNascita: userProfile.dataNascita || '',
        sesso: userProfile.sesso || '',
        ruolo: userProfile.ruolo || ''
      });
      loadUserRatings();
    }
  }, [userProfile]);

  async function loadUserRatings() {
    try {
      const data = await api.getUserRatings(currentUser.uid);
      setUserRatings(data.ratings || []);
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  }

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  function handlePasswordChange(e) {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      await updateUserProfile(formData);
      setEditing(false);
      setMessage({ type: 'success', text: 'Profilo aggiornato con successo!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nell\'aggiornamento del profilo' });
      console.error(error);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non coincidono' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La password deve essere di almeno 6 caratteri' });
      return;
    }

    try {
      await updatePassword(passwordData.newPassword);
      setChangingPassword(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password aggiornata con successo!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nell\'aggiornamento della password' });
      console.error(error);
    }
  }

  const avgRating = userRatings.length > 0
    ? (userRatings.reduce((sum, r) => sum + r.stars, 0) / userRatings.length).toFixed(1)
    : 'N/A';

  return (
    <div className="profile">
      <div className="profile-header">
        <h1>Il Tuo Profilo</h1>
      </div>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="profile-grid">
        <div className="profile-card">
          <div className="card-header">
            <h2>Informazioni Personali</h2>
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn-secondary">
                Modifica
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nome">Nome</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cognome">Cognome</label>
                  <input
                    type="text"
                    id="cognome"
                    name="cognome"
                    value={formData.cognome}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="dataNascita">Data di Nascita</label>
                <input
                  type="date"
                  id="dataNascita"
                  name="dataNascita"
                  value={formData.dataNascita}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sesso">Sesso</label>
                  <select
                    id="sesso"
                    name="sesso"
                    value={formData.sesso}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleziona</option>
                    <option value="M">Maschio</option>
                    <option value="F">Femmina</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="ruolo">Ruolo Preferito</label>
                  <select
                    id="ruolo"
                    name="ruolo"
                    value={formData.ruolo}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleziona</option>
                    <option value="Portiere">Portiere</option>
                    <option value="Difensore">Difensore</option>
                    <option value="Centrocampista">Centrocampista</option>
                    <option value="Attaccante">Attaccante</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                  Annulla
                </button>
                <button type="submit" className="btn-primary">
                  Salva Modifiche
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <div className="info-row">
                <span className="info-label">Nome:</span>
                <span>{userProfile?.nome} {userProfile?.cognome}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span>{currentUser?.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Data di Nascita:</span>
                <span>{userProfile?.dataNascita}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Sesso:</span>
                <span>{userProfile?.sesso}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Ruolo:</span>
                <span>{userProfile?.ruolo}</span>
              </div>
            </div>
          )}
        </div>

        <div className="profile-card">
          <div className="card-header">
            <h2>Sicurezza</h2>
          </div>

          {!changingPassword ? (
            <button onClick={() => setChangingPassword(true)} className="btn-secondary">
              Cambia Password
            </button>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="newPassword">Nuova Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Minimo 6 caratteri"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Conferma Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setChangingPassword(false)} className="btn-secondary">
                  Annulla
                </button>
                <button type="submit" className="btn-primary">
                  Aggiorna Password
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="profile-card">
          <div className="card-header">
            <h2>Statistiche</h2>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <Star size={24} className="stat-icon" />
              <div>
                <div className="stat-value">{avgRating} ⭐</div>
                <div className="stat-label">Valutazione Media</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-value">{userRatings.length}</div>
              <div className="stat-label">Recensioni Ricevute</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}