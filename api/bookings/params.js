import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = 'Ratings';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // GET /api/ratings/match/:matchId - Get ratings for a match
    if (req.method === 'GET' && req.query.type === 'match') {
      const matchId = req.query.matchId;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:F`,
      });

      const rows = response.data.values || [];
      const ratings = rows
        .slice(1)
        .filter(row => row[1] === matchId)
        .map(row => ({
          ratingId: row[0],
          matchId: row[1],
          userId: row[2],
          stars: parseInt(row[3]),
          comment: row[4],
          createdAt: row[5]
        }));

      return res.status(200).json({ ratings });
    }

    // GET /api/ratings/user/:userId - Get ratings for a user
    if (req.method === 'GET' && req.query.type === 'user') {
      const userId = req.query.userId;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:F`,
      });

      const rows = response.data.values || [];
      const ratings = rows
        .slice(1)
        .filter(row => row[2] === userId)
        .map(row => ({
          ratingId: row[0],
          matchId: row[1],
          userId: row[2],
          stars: parseInt(row[3]),
          comment: row[4],
          createdAt: row[5]
        }));

      return res.status(200).json({ ratings });
    }

    // POST /api/ratings - Create new rating
    if (req.method === 'POST') {
      const { matchId, userId, stars, comment, createdAt } = req.body;
      const ratingId = uuidv4();

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:F`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[ratingId, matchId, userId, stars, comment || '', createdAt]]
        }
      });

      return res.status(201).json({ success: true, ratingId });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}