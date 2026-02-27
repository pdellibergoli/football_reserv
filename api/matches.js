import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = 'Matches';
const BOOKINGS_SHEET = 'Bookings'; // Aggiunto riferimento ai bookings

async function getAuthClient() {
  return new google.auth.GoogleAuth({
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
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // GET ALL MATCHES
    if (req.method === 'GET' && !req.query.matchId) {
      // Recuperiamo sia Matches che Bookings
      const [matchesRes, bookingsRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Matches!A:O' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A:D' })
      ]);
    
      const rows = matchesRes.data.values || [];
      const bookingRows = bookingsRes.data.values || [];

      const matches = rows.slice(1).map(row => {
        const mId = row[0];
        // CONTEGGIO DINAMICO: Contiamo quante righe in Bookings hanno questo matchId
        const realOccupied = bookingRows.filter(b => b[1] === mId).length;

        return {
          matchId: mId,
          creatorId: row[1],
          citta: row[2],
          provincia: row[3],
          luogo: row[4],      
          indirizzo: row[5],  
          lat: parseFloat(row[6]),
          lng: parseFloat(row[7]),
          data: row[8],
          ora: row[9],
          tipologia: row[10],
          prezzo: parseFloat(row[11]),
          postiTotali: parseInt(row[12]),
          postiOccupati: realOccupied, // Usiamo il conteggio reale
          status: row[14]
        };
      });
      
      const adesso = new Date();
      const includePast = req.query.includePast === 'true';
    
      let filtered = matches.filter(m => {
        if (m.status !== 'cancelled') return false;
        const dataPartita = new Date(`${m.data}T${m.ora}`);

        if (includePast) {
          return dataPartita < adesso;
        } else {
          return dataPartita >= adesso;
        }
      });
    
      if (req.query.tipologia) {
        filtered = filtered.filter(m => m.tipologia.includes(req.query.tipologia));
      }
      
      filtered.sort((a, b) => {
        const dateA = new Date(`${a.data}T${a.ora}`);
        const dateB = new Date(`${b.data}T${b.ora}`);
        return includePast ? dateB - dateA : dateA - dateB;
      });
    
      return res.status(200).json({ matches: filtered });
    }

    // GET SINGLE MATCH (con conteggio dinamico)
    if (req.method === 'GET' && req.query.matchId) {
      const [matchesRes, bookingsRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Matches!A:O' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A:D' })
      ]);

      const rows = matchesRes.data.values || [];
      const bookingRows = bookingsRes.data.values || [];
      const row = rows.find(r => r[0] === req.query.matchId);

      if (!row) return res.status(404).json({ error: 'Match not found' });

      const realOccupied = bookingRows.filter(b => b[1] === req.query.matchId).length;

      return res.status(200).json({
        match: {
          matchId: row[0], creatorId: row[1], citta: row[2], provincia: row[3],
          luogo: row[4], indirizzo: row[5], lat: parseFloat(row[6]), lng: parseFloat(row[7]),
          data: row[8], ora: row[9], tipologia: row[10], prezzo: parseFloat(row[11]),
          postiTotali: parseInt(row[12]), postiOccupati: realOccupied, status: row[14]
        }
      });
    }

    // ... (Mantieni POST, PUT, DELETE dal tuo file originale)
    if (req.method === 'POST') {
        const matchId = uuidv4();
        const { organizzatoreId, citta, provincia, luogo, indirizzo, lat, lng, data, ora, tipologia, prezzo, maxPartecipanti } = req.body;
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A:O`, valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[matchId, organizzatoreId, citta, provincia, luogo, indirizzo, `'${lat}`, `'${lng}`, data, ora, tipologia, prezzo, maxPartecipanti, 0, 'active']] }
        });
        return res.status(201).json({ success: true, matchId });
      }
  
      if (req.method === 'PUT') {
        const { matchId } = req.query;
        const { organizzatoreId, citta, provincia, luogo, indirizzo, lat, lng, data, ora, tipologia, prezzo, maxPartecipanti } = req.body;
        const getRows = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A:O` });
        const rows = getRows.data.values || [];
        const rowIndex = rows.findIndex(r => r[0] === matchId);
        if (rowIndex === -1) return res.status(404).json({ error: 'Partita non trovata' });
        const updatedValues = [matchId, organizzatoreId, citta, provincia, luogo, indirizzo, `'${lat}`, `'${lng}`, data, ora, tipologia, prezzo, maxPartecipanti, rows[rowIndex][13] || 0, rows[rowIndex][14] || 'active'];
        await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A${rowIndex + 1}:O${rowIndex + 1}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [updatedValues] } });
        return res.status(200).json({ success: true });
      }
  
      if (req.method === 'DELETE') {
        const { matchId } = req.query;
        const getRows = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A:O` });
        const rows = getRows.data.values || [];
        const rowIndex = rows.findIndex(r => r[0] === matchId);
        if (rowIndex === -1) return res.status(404).json({ error: 'Match non trovato' });
        await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!O${rowIndex + 1}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [['cancelled']] } });
        return res.status(200).json({ success: true });
      }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}