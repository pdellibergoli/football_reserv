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
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export default async function handler(req, res) {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  if (req.method === 'GET') {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Fields!A:G',
    });
    const rows = response.data.values || [];
    const fields = rows.slice(1).map(row => ({
      fieldId: row[0], nome: row[1], indirizzo: row[2],
      citta: row[3], provincia: row[4], lat: row[5], lng: row[6]
    }));
    return res.status(200).json({ fields });
  }

  if (req.method === 'POST') {
    const { nome, indirizzo, citta, provincia, lat, lng } = req.body;
    const newField = [uuidv4(), nome, indirizzo, citta, provincia, lat, lng];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Fields!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newField] },
    });
    return res.status(201).json({ success: true });
  }
}