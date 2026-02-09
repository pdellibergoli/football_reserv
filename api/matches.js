import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = 'Matches';

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
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Matches!A:O', 
      });
    
      let rows = response.data.values || [];
      const matches = rows.slice(1).map(row => ({
        matchId: row[0],
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
        postiOccupati: parseInt(row[13] || 0),
        status: row[14]
      }));
      
      const adesso = new Date();
      // Verifichiamo se il frontend ha richiesto anche le partite passate
      const includePast = req.query.includePast === 'true';
    
      let filtered = matches.filter(m => {
        // 1. Deve essere attiva (escludiamo le cancellate)
        if (m.status !== 'active') return false;
    
        // 2. Controllo Partite Passate
        if (includePast) {
          // Se siamo in Archivio, non filtriamo per data (mostriamo tutto)
          return true;
        } else {
          // Se siamo in Dashboard, mostriamo solo il futuro
          const dataPartita = new Date(`${m.data}T${m.ora}`);
          return dataPartita >= adesso;
        }
      });
    
      // Filtri aggiuntivi
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
      
      // Ordinamento: 
      // Se includePast è true, ordiniamo dalla più recente alla più vecchia (per l'archivio)
      // Se è false, dalla più vicina alla più lontana (per la dashboard)
      filtered.sort((a, b) => {
        const dateA = new Date(`${a.data}T${a.ora}`);
        const dateB = new Date(`${b.data}T${b.ora}`);
        return includePast ? dateB - dateA : dateA - dateB;
      });
    
      return res.status(200).json({ matches: filtered });
    }

    // ... RESTO DEL CODICE (GET SINGLE, POST, PUT, DELETE) RIMANE INVARIATO ...
    // (Mantieni esattamente quello che hai già per le altre sezioni)

    if (req.method === 'GET' && req.query.matchId) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:O`,
      });
      const rows = response.data.values || [];
      const row = rows.find(r => r[0] === req.query.matchId);
      if (!row) return res.status(404).json({ error: 'Match not found' });
      return res.status(200).json({
        match: {
          matchId: row[0], creatorId: row[1], citta: row[2], provincia: row[3],
          luogo: row[4], indirizzo: row[5], lat: parseFloat(row[6]), lng: parseFloat(row[7]),
          data: row[8], ora: row[9], tipologia: row[10], prezzo: parseFloat(row[11]),
          postiTotali: parseInt(row[12]), postiOccupati: parseInt(row[13] || 0), status: row[14]
        }
      });
    }

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