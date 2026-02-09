import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const BOOKINGS_SHEET = 'Bookings';
const MATCHES_SHEET = 'Matches';
const USERS_SHEET = 'Users';

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
}

async function updateMatchParticipants(sheets, matchId, increment) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MATCHES_SHEET}!A:O`,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === matchId);
  if (rowIndex === -1) return;

  const currentOccupied = parseInt(rows[rowIndex][13] || 0);
  const newOccupied = Math.max(0, currentOccupied + increment);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MATCHES_SHEET}!N${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[newOccupied]] }
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // --- GET: Gestione flessibile ---
    if (req.method === 'GET') {
      const { userId, bookingId, matchId, type } = req.query;

      // NUOVA LOGICA: Recupero Partecipanti con Nomi per RatePlayers
      if (type === 'participants' && matchId) {
        // 1. Recupera le prenotazioni per questo match
        const bRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${BOOKINGS_SHEET}!A:D`,
        });
        const bRows = bRes.data.values || [];
        const matchBookings = bRows.filter(row => row[1] === matchId);
        const userIdsInMatch = matchBookings.map(row => row[2]);

        // 2. Recupera i dati degli utenti
        const uRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${USERS_SHEET}!A:I`, // Regola se il tuo foglio utenti è più lungo
        });
        const uRows = uRes.data.values || [];
        const allUsers = uRows.slice(1); // Salta header

        // 3. Filtra solo gli utenti presenti nelle prenotazioni
        const participants = allUsers
          .filter(u => userIdsInMatch.includes(u[0]))
          .map(u => ({
            userId: u[0],
            nome: u[1],
            cognome: u[2],
            ruolo: u[8] // Assicurati che l'indice 8 sia la colonna Ruolo
          }));

        return res.status(200).json({ participants });
      }

      // Logica GET standard esistente
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${BOOKINGS_SHEET}!A:D`,
      });
      const rows = response.data.values || [];
      const allBookings = rows.slice(1).map(row => ({
        bookingId: row[0], matchId: row[1], userId: row[2], createdAt: row[3]
      }));

      if (userId) {
        return res.status(200).json({ bookings: allBookings.filter(b => b.userId === userId) });
      }
      if (bookingId) {
        return res.status(200).json({ booking: allBookings.find(b => b.bookingId === bookingId) });
      }
      
      return res.status(200).json({ bookings: allBookings });
    }

    // --- POST & DELETE rimangono come prima ---
    if (req.method === 'POST') {
      const { matchId, userId, createdAt } = req.body;
      if (!matchId || !userId) return res.status(400).json({ error: 'Missing data' });
      const existingResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID, range: `${BOOKINGS_SHEET}!A:D`,
      });
      const existingBookings = existingResponse.data.values || [];
      const hasBooking = existingBookings.some(row => row[1] === matchId && row[2] === userId);
      if (hasBooking) return res.status(400).json({ error: 'Already booked' });
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID, range: `${BOOKINGS_SHEET}!A:D`, valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[uuidv4(), matchId, userId, createdAt || new Date().toISOString()]] }
      });
      await updateMatchParticipants(sheets, matchId, 1);
      return res.status(201).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { bookingId } = req.query;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID, range: `${BOOKINGS_SHEET}!A:D`,
      });
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === bookingId);
      if (rowIndex === -1) return res.status(404).json({ error: 'Booking not found' });
      const matchId = rows[rowIndex][1];
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID, range: `${BOOKINGS_SHEET}!A${rowIndex + 1}:D${rowIndex + 1}`,
      });
      await updateMatchParticipants(sheets, matchId, -1);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}