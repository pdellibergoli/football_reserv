import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const BOOKINGS_SHEET = 'Bookings';
const MATCHES_SHEET = 'Matches';
const USERS_SHEET = 'Users';

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

async function updateMatchParticipants(sheets, matchId, increment) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MATCHES_SHEET}!A:N`,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === matchId);

  if (rowIndex === -1) return;

  const currentOccupied = parseInt(rows[rowIndex][12] || 0);
  const newOccupied = currentOccupied + increment;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MATCHES_SHEET}!M${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[newOccupied]]
    }
  });
}

async function sendBookingEmail(userId, matchData, isConfirmation) {
  // Email sending logic with SendGrid
  if (!process.env.SENDGRID_API_KEY) return;

  // Get user email
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  
  const userResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${USERS_SHEET}!A:I`,
  });

  const users = userResponse.data.values || [];
  const user = users.find(row => row[0] === userId);
  
  if (!user) return;

  // TODO: Implement SendGrid email sending
  console.log(`Would send ${isConfirmation ? 'confirmation' : 'cancellation'} email to ${user[1]}`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // GET /api/bookings/user/:userId - Get user bookings
    if (req.method === 'GET' && req.query.type === 'user') {
      const userId = req.query.userId;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${BOOKINGS_SHEET}!A:D`,
      });

      const rows = response.data.values || [];
      const bookings = rows
        .slice(1)
        .filter(row => row[2] === userId)
        .map(row => ({
          bookingId: row[0],
          matchId: row[1],
          userId: row[2],
          createdAt: row[3]
        }));

      return res.status(200).json({ bookings });
    }

    // POST /api/bookings - Create booking
    if (req.method === 'POST') {
      const { matchId, userId, createdAt } = req.body;
      const bookingId = uuidv4();

      // Check if user already has a booking for this match
      const existingResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${BOOKINGS_SHEET}!A:D`,
      });

      const existingBookings = existingResponse.data.values || [];
      const hasBooking = existingBookings.some(
        row => row[1] === matchId && row[2] === userId
      );

      if (hasBooking) {
        return res.status(400).json({ error: 'Already booked' });
      }

      // Create booking
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${BOOKINGS_SHEET}!A:D`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[bookingId, matchId, userId, createdAt]]
        }
      });

      // Update match participants count
      await updateMatchParticipants(sheets, matchId, 1);

      // Send confirmation email
      await sendBookingEmail(userId, { matchId }, true);

      return res.status(201).json({ success: true, bookingId });
    }

    // DELETE /api/bookings/:bookingId - Cancel booking
    if (req.method === 'DELETE' && req.query.bookingId) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${BOOKINGS_SHEET}!A:D`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === req.query.bookingId);

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const matchId = rows[rowIndex][1];
      const userId = rows[rowIndex][2];

      // Delete the booking row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0, // Bookings sheet ID (you may need to adjust this)
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }]
        }
      });

      // Update match participants count
      await updateMatchParticipants(sheets, matchId, -1);

      // Send cancellation email
      await sendBookingEmail(userId, { matchId }, false);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}