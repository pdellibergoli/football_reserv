import { google } from 'googleapis';
import nodemailer from 'nodemailer';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const APP_URL = process.env.APP_URL || 'https://football-reserv.vercel.app';
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;

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
  if (req.method !== 'POST') return res.status(405).end();

  const { type, matchData, emails } = req.body;
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS }
  });

  let subject = "";
  let htmlContent = "";

  const baseStyle = `font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;`;

  if (type === 'new') {
    subject = `⚽ Nuova Partita: ${matchData.tipologia} a ${matchData.citta}!`;
    htmlContent = `
      <div style="${baseStyle}">
        <h2 style="color: #ff0033;">Nuova Partita Disponibile!</h2>
        <p>Ciao! Una nuova partita è stata appena creata.</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
          <p>📍 <strong>Dove:</strong> ${matchData.luogo} (${matchData.citta})</p>
          <p>📅 <strong>Quando:</strong> ${matchData.data} alle ore ${matchData.ora}</p>
        </div>
        <p style="text-align: center; margin-top: 20px;">
          <a href="${APP_URL}/matches/${matchData.matchId}" style="background: #ff0033; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Partecipa Ora</a>
        </p>
      </div>`;
  } 
  else if (type === 'update') {
    subject = `⚠️ Modifica Partita: ${matchData.tipologia} a ${matchData.citta}`;
    htmlContent = `
      <div style="${baseStyle}">
        <h2 style="color: #f59e0b;">Partita Aggiornata</h2>
        <p>Ti avvisiamo che i dettagli della partita a cui sei iscritto sono cambiati:</p>
        <div style="background: #fff8e1; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p>📅 <strong>Nuova Data:</strong> ${matchData.data} alle ${matchData.ora}</p>
          <p>📍 <strong>Luogo:</strong> ${matchData.luogo}</p>
        </div>
        <p style="text-align: center; margin-top: 20px;">
          <a href="${APP_URL}/matches/${matchData.matchId}" style="background: #ff0033; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Link alla Partita</a>
        </p>
      </div>`;
  } 
  else if (type === 'delete') {
    subject = `❌ Partita Annullata: ${matchData.tipologia}`;
    htmlContent = `
      <div style="${baseStyle}">
        <h2 style="color: #dc2626;">Partita Annullata</h2>
        <p>Siamo spiacenti, la partita a <strong>${matchData.luogo}</strong> del ${matchData.data} è stata annullata dall'organizzatore.</p>
        <p>Ti aspettiamo per la prossima sfida!</p>
      </div>`;
  }

  try {
    console.log(`Inizio invio di ${emails.length} email per tipo: ${type}`);
    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: `"Football Reserv" <${GMAIL_USER}>`,
          to: email,
          subject: subject,
          html: htmlContent
        });
        console.log(`✅ Inviata a ${email}`);
      } catch (err) {
        console.error(`Errore su ${email}:`, err.message);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Errore notifiche:", error);
    return res.status(500).json({ error: error.message });
  }
}