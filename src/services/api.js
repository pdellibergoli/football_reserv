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
    // Modificato: ID passato come query parameter per corrispondere a api/users.js
    const res = await fetch(`${API_BASE}/users?userId=${userId}`);
    return res.json();
  },

  async updateUser(userId, userData) {
    // Modificato: ID passato come query parameter
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
    // Modificato: ID passato come query parameter per api/matchs.js
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
    // Modificato: ID passato come query parameter per api/bookings.js
    const res = await fetch(`${API_BASE}/bookings?bookingId=${bookingId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async getUserBookings(userId) {
    // Modificato: ID passato come query parameter
    const res = await fetch(`${API_BASE}/bookings?userId=${userId}`);
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

  async getMatchRatings(matchId) {
    // Modificato: ID passato come query parameter per api/ratings.js
    const res = await fetch(`${API_BASE}/ratings?matchId=${matchId}`);
    return res.json();
  },

  async getUserRatings(userId) {
    // Modificato: ID passato come query parameter
    const res = await fetch(`${API_BASE}/ratings?userId=${userId}`);
    return res.json();
  }
};