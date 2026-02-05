const API_BASE = '/api';

export const api = {
  // Users
  async createUser(userData) {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  async getUser(userId) {
    const res = await fetch(`${API_BASE}/users/${userId}`);
    return res.json();
  },

  async updateUser(userId, userData) {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  // Matches
  async getMatches(filters = {}) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE}/matches?${params}`);
    return res.json();
  },

  async getMatch(matchId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}`);
    return res.json();
  },

  async createMatch(matchData) {
    const res = await fetch(`${API_BASE}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchData)
    });
    return res.json();
  },

  // Bookings
  async createBooking(bookingData) {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    return res.json();
  },

  async deleteBooking(bookingId) {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async getUserBookings(userId) {
    const res = await fetch(`${API_BASE}/bookings/user/${userId}`);
    return res.json();
  },

  // Ratings
  async createRating(ratingData) {
    const res = await fetch(`${API_BASE}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ratingData)
    });
    return res.json();
  },

  async getMatchRatings(matchId) {
    const res = await fetch(`${API_BASE}/ratings/match/${matchId}`);
    return res.json();
  },

  async getUserRatings(userId) {
    const res = await fetch(`${API_BASE}/ratings/user/${userId}`);
    return res.json();
  }
};