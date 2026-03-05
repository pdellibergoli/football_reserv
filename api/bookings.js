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

async function sendPromotionEmail(userData, matchData) {
  const API_KEY = process.env.MAILERSEND_API_KEY;
  const EMAIL_FROM = process.env.EMAIL_FROM;
  const APP_URL = process.env.APP_URL || 'https://football-reserv.vercel.app';

  console.log("Tentativo invio email a:", userData.email);

  const emailBody = {
    from: { email: EMAIL_FROM, name: "Football Reserv" },
    to: [{ email: userData.email, name: `${userData.nome} ${userData.cognome}` }],
    subject: `⚽ Posto liberato! Sei in squadra per la partita a ${matchData.luogo}`,
    text: `Ciao ${userData.nome}, si è liberato un posto per la partita presso ${matchData.luogo}! Sei stato promosso tra i partecipanti confermati. Link: ${APP_URL}/match/${matchData.matchId}`,
    html: `
      <div style="font-family: sans-serif; color: #333;">
        <h2>Ciao ${userData.nome}, buone notizie!</h2>
        <p>Si è liberato un posto per la partita presso <strong>${matchData.luogo}</strong>.</p>
        <p>Il tuo stato è stato aggiornato: ora sei tra i <strong>partecipanti confermati</strong>.</p>
        <hr />
        <p><strong>Dettagli:</strong></p>
        <ul>
          <li>Data: ${matchData.data}</li>
          <li>Ora: ${matchData.ora}</li>
          <li>Luogo: ${matchData.indirizzo}</li>
        </ul>
        <a href="${APP_URL}/match/${matchData.matchId}" 
           style="background: #ff0037; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
           Vedi Dettagli Partita
        </a>
      </div>
    `
  };

  try {
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(emailBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Errore MailerSend API:", errorText);
    } else {
      console.log("Email inviata con successo!");
    }
  } catch (error) {
    console.error("Eccezione durante invio email:", error);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    if (req.method === 'GET') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Bookings!A:E',
      });
      const rows = response.data.values || [];
      const bookings = rows.slice(1).map(row => ({
        bookingId: row[0],
        matchId: row[1],
        userId: row[2],
        createdAt: row[3],
        status: row[4] || 'confirmed'
      }));

      if (req.query.matchId) {
        const filtered = bookings.filter(b => b.matchId === req.query.matchId);
        return res.status(200).json({ bookings: filtered });
      }
      if (req.query.userId) {
        const filtered = bookings.filter(b => b.userId === req.query.userId);
        return res.status(200).json({ bookings: filtered });
      }
      return res.status(200).json({ bookings });
    }

    if (req.method === 'POST') {
      const { matchId, userId } = req.body;
      const createdAt = new Date().toISOString();

      const [matchesRes, bookingsRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Matches!A:O' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A:E' })
      ]);

      const matchRow = matchesRes.data.values.find(r => r[0] === matchId);
      if (!matchRow) return res.status(404).json({ error: 'Match not found' });

      const postiTotali = parseInt(matchRow[12]);
      const confirmedBookings = (bookingsRes.data.values || []).filter(b => b[1] === matchId && b[4] === 'confirmed');

      const status = confirmedBookings.length < postiTotali ? 'confirmed' : 'waiting';

      const newBooking = [uuidv4(), matchId, userId, createdAt, status];
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Bookings!A:E',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newBooking] },
      });

      return res.status(201).json({ success: true, status });
    }

    if (req.method === 'DELETE') {
      const { bookingId } = req.query;

      const bookingsRes = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: 'Bookings!A:E' 
      });
      const rows = bookingsRes.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === bookingId);

      if (rowIndex === -1) return res.status(404).json({ error: 'Prenotazione non trovata' });

      const deletedRow = rows[rowIndex];
      const matchId = deletedRow[1];
      const wasConfirmed = deletedRow[4] === 'confirmed';

      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `Bookings!A${rowIndex + 1}:E${rowIndex + 1}`,
      });

      if (wasConfirmed) {
        const waitingIndex = rows.findIndex(r => r[1] === matchId && r[4] === 'waiting');
        console.log("Riga cancellata era confirmed, cerco waiting da promuovere. Waiting trovato a indice:", waitingIndex);
        if (waitingIndex !== -1) {
          const waitingUser = rows[waitingIndex];
          const waitingUserId = waitingUser[2];

          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Bookings!E${waitingIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [['confirmed']] },
          });

          const [usersRes, matchesRes] = await Promise.all([
            sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Users!A:G' }),
            sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Matches!A:K' })
          ]);

          const userRow = usersRes.data.values.find(u => u[0] === waitingUserId);
          const matchRow = matchesRes.data.values.find(m => m[0] === matchId);

          if (userRow && matchRow) {
            console.log(`Promuovendo utente ${userRow[1]} da waiting a confirmed per match ${matchRow[4]}`);
            // ATTENZIONE AGLI INDICI: 0:ID, 1:Email, 2:Nome, 3:Cognome
            await sendPromotionEmail(
              { email: userRow[1], nome: userRow[2], cognome: userRow[3] },
              { luogo: matchRow[4], indirizzo: matchRow[5], data: matchRow[8], ora: matchRow[9], matchId }
            );
            console.log("Email di promozione inviata a:", userRow[1]);
          }
        }
      }

      return res.status(200).json({ success: true });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}