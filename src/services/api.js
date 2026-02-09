const API_BASE = '/api';

export const api = {
  // --- USERS ---
  async createUser(userData) {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  async getUser(userId) {
    const res = await fetch(`${API_BASE}/users?userId=${userId}`);
    return res.json();
  },

  async updateUser(userId, userData) {
    const res = await fetch(`${API_BASE}/users?userId=${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  // --- MATCHES ---
  async getMatches(filters = {}) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE}/matches?${params}`);
    return res.json();
  },

  async getMatch(matchId) {
    const res = await fetch(`${API_BASE}/matches?matchId=${matchId}`);
    return res.json();
  },

  async createMatch(matchData) {
    const res = await fetch(`${API_BASE}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchData)
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Errore server');
    }
    return res.json();
  },

  async updateMatch(matchId, matchData) {
    const res = await fetch(`${API_BASE}/matches?matchId=${matchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchData)
    });
    return res.json();
  },

  async deleteMatch(matchId) {
    const res = await fetch(`${API_BASE}/matches?matchId=${matchId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // --- BOOKINGS ---
  async createBooking(bookingData) {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    return res.json();
  },

  async deleteBooking(bookingId) {
    const res = await fetch(`${API_BASE}/bookings?bookingId=${bookingId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async getUserBookings(userId) {
    const res = await fetch(`${API_BASE}/bookings?userId=${userId}`);
    return res.json();
  },

  async getMatchParticipants(matchId) {
    const res = await fetch(`${API_BASE}/bookings?matchId=${matchId}&type=participants`);
    if (!res.ok) throw new Error('Errore nel recupero partecipanti');
    return res.json();
  },

  // --- RATINGS ---
  async createRating(ratingData) {
    const res = await fetch(`${API_BASE}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ratingData)
    });
    return res.json();
  },

  async updateRating(ratingId, ratingData) {
    const res = await fetch(`${API_BASE}/ratings?ratingId=${ratingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ratingData)
    });
    return res.json();
  },

  async getMatchRatings(matchId) {
    const res = await fetch(`${API_BASE}/ratings?matchId=${matchId}`);
    return res.json();
  },

  async getUserRatings(userId) {
    const res = await fetch(`${API_BASE}/ratings?userId=${userId}`);
    return res.json();
  },

  async submitRating(ratingData) {
    // Gestisce sia creazione che aggiornamento se ratingId è presente
    if (ratingData.ratingId) {
      return this.updateRating(ratingData.ratingId, ratingData);
    }
    return this.createRating(ratingData);
  }
};