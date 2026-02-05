import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = 'Users';

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
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // GET /api/users/:userId
    if (req.method === 'GET' && req.query.userId) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:I`,
      });

      const rows = response.data.values || [];
      const user = rows.find(row => row[0] === req.query.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        userId: user[0],
        email: user[1],
        nome: user[2],
        cognome: user[3],
        dataNascita: user[4],
        sesso: user[5],
        ruolo: user[6],
        createdAt: user[7]
      });
    }

    // POST /api/users - Create new user
    if (req.method === 'POST') {
      const { userId, email, nome, cognome, dataNascita, sesso, ruolo, createdAt } = req.body;

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:I`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[userId, email, nome, cognome, dataNascita, sesso, ruolo, createdAt]]
        }
      });

      return res.status(201).json({ success: true, userId });
    }

    // PUT /api/users/:userId - Update user
    if (req.method === 'PUT' && req.query.userId) {
      const { nome, cognome, dataNascita, sesso, ruolo } = req.body;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:I`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === req.query.userId);

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
      }

      const range = `${SHEET_NAME}!C${rowIndex + 1}:G${rowIndex + 1}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[nome, cognome, dataNascita, sesso, ruolo]]
        }
      });

      return res.status(200).json({ 
        success: true, 
        user: { nome, cognome, dataNascita, sesso, ruolo }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}