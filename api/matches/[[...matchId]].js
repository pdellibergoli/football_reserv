import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = 'Matches';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // GET /api/matches - Get all matches with optional filters
    if (req.method === 'GET' && !req.query.matchId) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:N`,
      });

      let rows = response.data.values || [];
      
      // Skip header row
      const matches = rows.slice(1).map(row => ({
        matchId: row[0],
        creatorId: row[1],
        citta: row[2],
        provincia: row[3],
        indirizzo: row[4],
        lat: parseFloat(row[5]),
        lng: parseFloat(row[6]),
        data: row[7],
        ora: row[8],
        tipologia: row[9],
        prezzo: parseFloat(row[10]),
        postiTotali: parseInt(row[11]),
        postiOccupati: parseInt(row[12] || 0),
        status: row[13]
      }));

      // Apply filters
      let filtered = matches.filter(m => m.status === 'active');
      
      if (req.query.tipologia) {
        filtered = filtered.filter(m => m.tipologia === req.query.tipologia);
      }
      
      if (req.query.citta) {
        filtered = filtered.filter(m => 
          m.citta.toLowerCase().includes(req.query.citta.toLowerCase())
        );
      }
      
      if (req.query.provincia) {
        filtered = filtered.filter(m => 
          m.provincia.toLowerCase().includes(req.query.provincia.toLowerCase())
        );
      }

      // Sort by date
      filtered.sort((a, b) => new Date(a.data) - new Date(b.data));

      return res.status(200).json({ matches: filtered });
    }

    // GET /api/matches/:matchId - Get single match
    if (req.method === 'GET' && req.query.matchId) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:N`,
      });

      const rows = response.data.values || [];
      const match = rows.find(row => row[0] === req.query.matchId);

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      return res.status(200).json({
        match: {
          matchId: match[0],
          creatorId: match[1],
          citta: match[2],
          provincia: match[3],
          indirizzo: match[4],
          lat: parseFloat(match[5]),
          lng: parseFloat(match[6]),
          data: match[7],
          ora: match[8],
          tipologia: match[9],
          prezzo: parseFloat(match[10]),
          postiTotali: parseInt(match[11]),
          postiOccupati: parseInt(match[12] || 0),
          status: match[13]
        }
      });
    }

    // POST /api/matches - Create new match
    if (req.method === 'POST') {
      const matchId = uuidv4();
      const { 
        creatorId, citta, provincia, indirizzo, lat, lng, 
        data, ora, tipologia, prezzo, postiTotali 
      } = req.body;

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:N`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            matchId, creatorId, citta, provincia, indirizzo, lat, lng,
            data, ora, tipologia, prezzo, postiTotali, 0, 'active'
          ]]
        }
      });

      // Send email notification (if configured)
      if (process.env.SENDGRID_API_KEY) {
        // Email logic here
      }

      return res.status(201).json({ success: true, matchId });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}