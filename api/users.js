import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = 'Users';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const userId = req.query.userId || req.query.params?.[0];

    if (req.method === 'GET' && userId) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:H`, 
      });
    
      const rows = response.data.values || [];
      const user = rows.find(row => row[0] === userId);
    
      if (!user) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }
    
      // Mappatura corretta basata sulle colonne dello Sheet
      return res.status(200).json({
        userId: user[0],      // Colonna A
        email: user[1],       // Colonna B
        nome: user[2],        // Colonna C
        cognome: user[3],     // Colonna D
        dataNascita: user[4], // Colonna E
        sesso: user[5],       // Colonna F
        ruolo: user[6],       // Colonna G
        createdAt: user[7]    // Colonna H
      });
    }

    if (req.method === 'POST') {
      console.log("Dati ricevuti nel backend:", req.body);
      const { userId, email, nome, cognome, dataNascita, sesso, ruolo, createdAt } = req.body;
    
      try {
        const auth = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        
        console.log("Autenticazione Google riuscita, provo a scrivere...");
    
        const result = await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:I`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[userId, email, nome, cognome, dataNascita, sesso, ruolo, createdAt]]
          }
        });
    
        console.log("Scrittura completata con successo!"); 
        return res.status(201).json({ success: true, userId });
      } catch (err) {
        console.error("ERRORE DURANTE LA SCRITTURA:", err.message); 
        return res.status(500).json({ error: err.message });
      }
    }

    if (req.method === 'PUT' && userId) {
      const { nome, cognome, dataNascita, sesso, ruolo } = req.body;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:I`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === userId);

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Utente non trovato' });
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

    return res.status(405).json({ error: `Metodo ${req.method} non supportato su questa rotta` });

  } catch (error) {
    console.error('Errore API Users:', error);
    return res.status(500).json({ 
      error: 'Errore interno del server', 
      message: error.message,
      details: error.response?.data || 'Nessun dettaglio aggiuntivo'
    });
  }
}