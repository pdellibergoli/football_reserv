import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;
const APP_URL = process.env.APP_URL || 'https://football-reserv.vercel.app';

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
  const dateParts = matchData.data.split('-');
  const formattedDate = dateParts.length === 3 
    ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` 
    : matchData.data;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASS 
    }
  });

  const mailOptions = {
    from: `"Football Reserv" <${GMAIL_USER}>`,
    to: userData.email,
    subject: `⚽ Posto liberato! Sei in squadra per la partita a ${matchData.luogo}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #ff0033;">Ciao ${userData.nome}, buone notizie!</h2>
        <p>Si è appena liberato un posto per la partita presso <strong>${matchData.luogo}</strong>.</p>
        <p>Eri in lista d'attesa, ma ora il tuo stato è stato aggiornato: <strong>sei ufficialmente in squadra!</strong></p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;">📅 <strong>Data:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;">⏰ <strong>Ora:</strong> ${matchData.ora}</p>
          <p style="margin: 5px 0;">📍 <strong>Luogo:</strong> ${matchData.indirizzo}</p>
        </div>
        <div style="text-align: center;">
          <a href="${APP_URL}/match/${matchData.matchId}" 
             style="background: #ff0033; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
             Vedi Dettagli Partita
          </a>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email di promozione inviata con successo a: ${userData.email}`);
  } catch (error) {
    console.error("❌ Errore durante l'invio email di promozione:", error.message);
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
      const { matchId, userId, type } = req.query;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Bookings!A:E',
      });
      const rows = response.data.values || [];
      
      if (matchId && type === 'participants') {
        const usersRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Users!A:G', 
        });
        const userRows = usersRes.data.values || [];

        const participants = rows
          .filter(row => row[1] === matchId && row[4] === 'confirmed')
          .map(row => {
            const user = userRows.find(u => u[0] === row[2]);
            return {
              bookingId: row[0],
              userId: row[2],
              nome: user ? user[2] : 'Utente',
              cognome: user ? user[3] : 'Sconosciuto',
              ruolo: user ? user[6] : 'Giocatore'
            };
          });

        return res.status(200).json({ participants });
      }

      if (userId) {
        const userBookings = rows.slice(1)
          .filter(row => row[2] === userId)
          .map(row => ({
            bookingId: row[0],
            matchId: row[1],
            userId: row[2],
            createdAt: row[3],
            status: row[4] || 'confirmed'
          }));
        return res.status(200).json({ bookings: userBookings });
      }

      const allBookings = rows.slice(1).map(row => ({
        bookingId: row[0],
        matchId: row[1],
        userId: row[2],
        createdAt: row[3],
        status: row[4] || 'confirmed'
      }));
      return res.status(200).json({ bookings: allBookings });
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
            await sendPromotionEmail(
              { email: userRow[1], nome: userRow[2], cognome: userRow[3] },
              { luogo: matchRow[4], indirizzo: matchRow[5], data: matchRow[8], ora: matchRow[9], matchId }
            );
          }
        }
      }

      return res.status(200).json({ success: true });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}