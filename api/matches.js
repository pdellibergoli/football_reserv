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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    if (req.method === 'GET') {
      const [matchesRes, bookingsRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Matches!A:O' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A:E' })
      ]);

      const rows = matchesRes.data.values || [];
      const bookingRows = bookingsRes.data.values || [];
      const includePast = req.query.includePast === 'true';
      const adesso = new Date();

      const allMatches = rows.slice(1).map(row => {
        const mId = row[0];
        const realOccupied = bookingRows.filter(b => b[1] === mId && (b[4] === 'confirmed' || !b[4])).length;

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
          postiOccupati: realOccupied,
          status: row[14] || 'active'
        };
      });

      if (req.query.matchId) {
        const singleMatch = allMatches.find(m => m.matchId === req.query.matchId);
        if (!singleMatch) return res.status(404).json({ error: 'Match non trovato' });
        
        const usersRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Users!A:G' });
        const userRows = usersRes.data.values || [];

        const matchParticipants = bookingRows
          .filter(b => b[1] === req.query.matchId)
          .map(b => {
            const user = userRows.find(u => u[0] === b[2]);
            return {
              bookingId: b[0],
              userId: b[2],
              status: b[4] || 'confirmed',
              nome: user ? user[2] : 'Utente',
              cognome: user ? user[3] : 'Sconosciuto',
              ruolo: user ? user[6] : 'Giocatore'
            };
          });

        return res.status(200).json({ match: singleMatch, participants: matchParticipants });
      }

      let filtered = allMatches.filter(m => {
        if (m.status === 'cancelled') return false;
        const dataPartita = new Date(`${m.data}T${m.ora}`);
        if (isNaN(dataPartita.getTime())) return !includePast; 
        return includePast ? dataPartita < adesso : dataPartita >= adesso;
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

    if (req.method === 'POST') {
      const matchId = uuidv4();
      const { organizzatoreId, citta, provincia, luogo, indirizzo, lat, lng, data, ora, tipologia, prezzo, maxPartecipanti } = req.body;
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Matches!A:O',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[matchId, organizzatoreId, citta, provincia, luogo, indirizzo, `'${lat}`, `'${lng}`, data, ora, tipologia, prezzo, maxPartecipanti, 0, 'active']]
        }
      });

      const usersRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Users!A:I' });
      const allEmails = (usersRes.data.values || []).slice(1).map(r => r[1]).filter(e => e && e.includes('@'));

      return res.status(201).json({ 
        success: true, 
        matchId, 
        emails: allEmails 
      });
    }

    if (req.method === 'PUT') {
      const { matchId } = req.query;
      const data = req.body;

      const [matchesRes, bookingsRes, usersRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Matches!A:O' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A:E' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Users!A:I' })
      ]);

      const rows = matchesRes.data.values || [];
      const rowIndex = rows.findIndex(r => r[0] === matchId);
      if (rowIndex === -1) return res.status(404).json({ error: 'Partita non trovata' });

      const updatedValues = [
        matchId, rows[rowIndex][1], data.citta || rows[rowIndex][2], data.provincia || rows[rowIndex][3],
        data.luogo || rows[rowIndex][4], data.indirizzo || rows[rowIndex][5],
        data.lat !== undefined ? `'${data.lat}` : rows[rowIndex][6],
        data.lng !== undefined ? `'${data.lng}` : rows[rowIndex][7],
        data.data || rows[rowIndex][8], data.ora || rows[rowIndex][9],
        data.tipologia || rows[rowIndex][10], data.prezzo !== undefined ? data.prezzo : rows[rowIndex][11],
        data.maxPartecipanti || rows[rowIndex][12], rows[rowIndex][13], rows[rowIndex][14] || 'active'
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Matches!A${rowIndex + 1}:O${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [updatedValues] }
      });

      const participantsIds = (bookingsRes.data.values || []).filter(b => b[1] === matchId).map(b => b[2]);
      const emailsToNotify = (usersRes.data.values || []).filter(u => participantsIds.includes(u[0])).map(u => u[1]);

      return res.status(200).json({ 
        success: true, 
        emails: emailsToNotify 
      });
    }

    if (req.method === 'DELETE') {
      const { matchId } = req.query;
      const [matchesRes, bookingsRes, usersRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Matches!A:O' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A:E' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Users!A:I' })
      ]);

      const rows = matchesRes.data.values || [];
      const rowIndex = rows.findIndex(r => r[0] === matchId);
      if (rowIndex === -1) return res.status(404).json({ error: 'Match non trovato' });

      const oldMatchData = {
        tipologia: rows[rowIndex][10],
        luogo: rows[rowIndex][4],
        data: rows[rowIndex][8]
      };

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Matches!O${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['cancelled']] }
      });

      const participantsIds = (bookingsRes.data.values || []).filter(b => b[1] === matchId).map(b => b[2]);
      const emailsToNotify = (usersRes.data.values || []).filter(u => participantsIds.includes(u[0])).map(u => u[1]);

      return res.status(200).json({ 
        success: true, 
        emails: emailsToNotify,
        matchData: oldMatchData 
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}