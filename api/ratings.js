import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

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
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  // GET: Recupera voti (per matchId o per userId)
  if (req.method === 'GET') {
    const { matchId, userId } = req.query;
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Ratings!A:G',
      });
      const rows = response.data.values || [];
      let ratings = rows.slice(1).map(r => ({
        ratingId: r[0], matchId: r[1], fromUserId: r[2], toUserId: r[3],
        stars: Number(r[4]) || 0, comment: r[5], createdAt: r[6]
      }));

      if (matchId) ratings = ratings.filter(r => r.matchId === matchId);
      if (userId) ratings = ratings.filter(r => r.toUserId === userId);

      return res.status(200).json({ ratings });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST: Nuovo voto
  if (req.method === 'POST') {
    const { matchId, fromUserId, toUserId, stars, comment } = req.body;
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Ratings!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[uuidv4(), matchId, fromUserId, toUserId, stars, comment, new Date().toISOString()]]
        }
      });
      return res.status(201).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // PUT: Aggiorna voto esistente
  if (req.method === 'PUT') {
    const { ratingId } = req.query;
    const { stars, comment } = req.body;
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Ratings!A:G',
      });
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(r => r[0] === ratingId);

      if (rowIndex === -1) return res.status(404).json({ error: 'Rating non trovato' });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Ratings!E${rowIndex + 1}:F${rowIndex + 1}`, // Colonne E (Stars) e F (Comment)
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[stars, comment]] }
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}