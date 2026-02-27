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
  // Configurazione CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // --- GET: RECUPERO PARTITE ---
    if (req.method === 'GET') {
      // Recuperiamo sia i match che le prenotazioni per il conteggio dinamico
      const [matchesRes, bookingsRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Matches!A:O' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A:D' })
      ]);

      const rows = matchesRes.data.values || [];
      const bookingRows = bookingsRes.data.values || [];
      
      const includePast = req.query.includePast === 'true';
      const adesso = new Date();

      // Trasformiamo i dati in oggetti
      const allMatches = rows.slice(1).map(row => {
        const mId = row[0];
        // Conteggio dinamico: quante persone sono iscritte a questo matchId in Bookings
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
          data: row[8], // Formato previsto: YYYY-MM-DD
          ora: row[9],  // Formato previsto: HH:mm
          tipologia: row[10],
          prezzo: parseFloat(row[11]),
          postiTotali: parseInt(row[12]),
          postiOccupati: realOccupied, // Valore reale basato sulle righe di prenotazione
          status: row[14] || 'active'
        };
      });

      // Se è richiesto un match specifico tramite ID
      if (req.query.matchId) {
        const singleMatch = allMatches.find(m => m.matchId === req.query.matchId);
        if (!singleMatch) return res.status(404).json({ error: 'Match non trovato' });
        return res.status(200).json({ match: singleMatch });
      }

      // Filtraggio per Dashboard vs Archivio
      let filtered = allMatches.filter(m => {
        // Escludiamo sempre le partite cancellate manualmente
        if (m.status === 'cancelled') return false;

        // Parsing della data combinata
        const dataPartita = new Date(`${m.data}T${m.ora}`);

        // Se la data nel foglio Excel è scritta male, per sicurezza la mostriamo in dashboard
        if (isNaN(dataPartita.getTime())) {
          return !includePast; 
        }

        if (includePast) {
          // ARCHIVIO: Solo partite passate
          return dataPartita < adesso;
        } else {
          // DASHBOARD: Solo partite future o in corso oggi
          return dataPartita >= adesso;
        }
      });

      // Filtro aggiuntivo per tipologia (se presente nella ricerca)
      if (req.query.tipologia) {
        filtered = filtered.filter(m => m.tipologia.includes(req.query.tipologia));
      }

      // Ordinamento: Archivio (più recenti prima), Dashboard (prossime in arrivo prima)
      filtered.sort((a, b) => {
        const dateA = new Date(`${a.data}T${a.ora}`);
        const dateB = new Date(`${b.data}T${b.ora}`);
        return includePast ? dateB - dateA : dateA - dateB;
      });

      return res.status(200).json({ matches: filtered });
    }

    // --- POST: CREAZIONE NUOVO MATCH ---
    if (req.method === 'POST') {
      const matchId = uuidv4();
      const { organizzatoreId, citta, provincia, luogo, indirizzo, lat, lng, data, ora, tipologia, prezzo, maxPartecipanti } = req.body;
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Matches!A:O',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            matchId, organizzatoreId, citta, provincia, luogo, indirizzo, 
            `'${lat}`, `'${lng}`, data, ora, tipologia, prezzo, maxPartecipanti, 0, 'active'
          ]]
        }
      });
      return res.status(201).json({ success: true, matchId });
    }

    // --- PUT: MODIFICA MATCH ---
    if (req.method === 'PUT') {
      const { matchId } = req.query;
      const { organizzatoreId, citta, provincia, luogo, indirizzo, lat, lng, data, ora, tipologia, prezzo, maxPartecipanti } = req.body;

      const getRows = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Matches!A:O' });
      const rows = getRows.data.values || [];
      const rowIndex = rows.findIndex(r => r[0] === matchId);

      if (rowIndex === -1) return res.status(404).json({ error: 'Partita non trovata' });

      const updatedValues = [
        matchId, organizzatoreId, citta, provincia, luogo, indirizzo, 
        `'${lat}`, `'${lng}`, data, ora, tipologia, prezzo, maxPartecipanti, 
        rows[rowIndex][13], // Manteniamo i posti occupati originali (anche se il conteggio è dinamico in GET)
        rows[rowIndex][14] || 'active'
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Matches!A${rowIndex + 1}:O${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [updatedValues] }
      });
      return res.status(200).json({ success: true });
    }

    // --- DELETE: CANCELLAZIONE (SOFT DELETE) ---
    if (req.method === 'DELETE') {
      const { matchId } = req.query;
      const getRows = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Matches!A:O' });
      const rows = getRows.data.values || [];
      const rowIndex = rows.findIndex(r => r[0] === matchId);

      if (rowIndex === -1) return res.status(404).json({ error: 'Match non trovato' });

      // Invece di eliminare la riga, cambiamo lo status in 'cancelled'
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Matches!O${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['cancelled']] }
      });
      return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}