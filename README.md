# ⚽ Calcetto App - Organizza Partite di Calcio

Una webapp moderna per organizzare e partecipare a partite di calcetto/calcio nella tua città.

## 🚀 Funzionalità

- ✅ **Autenticazione** con Firebase Auth (email/password)
- ✅ **Gestione Partite**: Crea, cerca e prenota partite di calcio a 5/7/8/11
- ✅ **Filtri Avanzati**: Per tipologia, città e provincia
- ✅ **Mappe Interattive**: Visualizza la posizione del campo con Leaflet
- ✅ **Sistema di Prenotazione**: Prenota e cancella prenotazioni
- ✅ **Rating e Recensioni**: Valuta le partite a cui hai partecipato
- ✅ **Profilo Utente**: Modifica i tuoi dati e cambia password
- ✅ **Notifiche Email**: Conferme di prenotazione via email (opzionale)
- ✅ **Design Responsive**: Ottimizzato per mobile e desktop

## 🛠️ Stack Tecnologico

- **Frontend**: React 18 + Vite
- **Routing**: React Router v6
- **Autenticazione**: Firebase Auth
- **Database**: Google Sheets API
- **Mappe**: Leaflet + OpenStreetMap
- **Backend**: Vercel Serverless Functions
- **Hosting**: Vercel
- **Email**: SendGrid (opzionale)

## 📋 Prerequisiti

- Node.js 18+ e npm
- Account Firebase
- Account Google Cloud (per Google Sheets API)
- Account Vercel
- Account GitHub
- (Opzionale) Account SendGrid per email

## 🔧 Setup Iniziale

### 1. Clona il Repository

\`\`\`bash
git clone <your-repo-url>
cd calcetto-app
npm install
\`\`\`

### 2. Configura Firebase

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuovo progetto
3. Abilita **Authentication** → Email/Password
4. Vai in Project Settings → Aggiungi app web
5. Copia le credenziali Firebase

### 3. Configura Google Sheets

#### 3.1 Crea il Foglio Google

1. Crea un nuovo [Google Sheet](https://sheets.google.com)
2. Rinomina il foglio in "Calcetto App Database"
3. Crea 4 fogli (tabs) con questi nomi esatti:
   - **Users**
   - **Matches**
   - **Bookings**
   - **Ratings**

#### 3.2 Struttura dei Fogli

**Users** (colonne A-H):
```
userId | email | nome | cognome | dataNascita | sesso | ruolo | createdAt
```

**Matches** (colonne A-N):
```
matchId | creatorId | citta | provincia | indirizzo | lat | lng | data | ora | tipologia | prezzo | postiTotali | postiOccupati | status
```

**Bookings** (colonne A-D):
```
bookingId | matchId | userId | createdAt
```

**Ratings** (colonne A-F):
```
ratingId | matchId | userId | stars | comment | createdAt
```

⚠️ **IMPORTANTE**: Aggiungi questi header nella prima riga di ogni foglio!

#### 3.3 Configura Service Account

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o selezionane uno esistente
3. Abilita **Google Sheets API**:
   - API & Services → Library
   - Cerca "Google Sheets API"
   - Clicca "Enable"
4. Crea Service Account:
   - IAM & Admin → Service Accounts
   - Create Service Account
   - Nome: "calcetto-app-sheets"
   - Grant access: Editor
   - Create Key → JSON
   - Scarica il file JSON
5. Condividi il Google Sheet:
   - Apri il tuo Google Sheet
   - Share → Aggiungi l'email del service account (es: `calcetto-app-sheets@your-project.iam.gserviceaccount.com`)
   - Permessi: Editor

### 4. Configura Variabili d'Ambiente

Crea un file `.env` nella root del progetto:

\`\`\`bash
cp .env.example .env
\`\`\`

Compila con i tuoi valori:

\`\`\`env
# Firebase
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc

# Google Sheets (dal file JSON del service account)
GOOGLE_SPREADSHEET_ID=1ABC...XYZ  # ID del tuo Google Sheet
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_PRIVATE_KEY_ID=abc123...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=calcetto-app-sheets@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=123456789...

# SendGrid (opzionale)
SENDGRID_API_KEY=SG.abc...
\`\`\`

**Come trovare lo SPREADSHEET_ID**:
- Apri il tuo Google Sheet
- L'URL sarà: `https://docs.google.com/spreadsheets/d/QUESTO_E_LO_SPREADSHEET_ID/edit`

### 5. Test in Locale

\`\`\`bash
npm run dev
\`\`\`

Apri http://localhost:3000

## 🚀 Deploy su Vercel

### 1. Setup GitHub

\`\`\`bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tuo-username/calcetto-app.git
git push -u origin main
\`\`\`

### 2. Deploy su Vercel

1. Vai su [Vercel](https://vercel.com)
2. Import Git Repository → Seleziona il tuo repo
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. **Environment Variables**: Aggiungi TUTTE le variabili dal tuo `.env`
7. Deploy!

### 3. Configurazione Post-Deploy

Dopo il primo deploy, Vercel ti darà un URL (es: `calcetto-app.vercel.app`)

**Importante**: Aggiungi questo dominio in Firebase:
1. Firebase Console → Authentication → Settings
2. Authorized domains → Add domain
3. Aggiungi: `calcetto-app.vercel.app` (o il tuo dominio custom)

## 📱 Come Usare l'App

### Per Utenti

1. **Registrati**: Inserisci email, password e dati personali
2. **Cerca Partite**: Usa i filtri per trovare partite nella tua zona
3. **Prenota**: Clicca su una partita e prenota il tuo posto
4. **Partecipa**: Vai al campo all'orario indicato!
5. **Recensisci**: Dopo la partita, lascia una valutazione

### Per Organizzatori

1. **Crea Partita**: Click su "Crea Partita"
2. **Compila i dettagli**: Luogo, data, ora, tipo di calcio, prezzo
3. **Trova coordinate**: Usa Google Maps per ottenere lat/lng del campo
4. **Pubblica**: La partita sarà visibile a tutti

## 🔑 Come Ottenere le Coordinate

1. Vai su [Google Maps](https://www.google.com/maps)
2. Cerca l'indirizzo del campo
3. Click destro sul marker
4. "Copia coordinate"
5. Formato: `45.4642, 9.1900` (lat, lng)

## 📧 Setup Email (Opzionale)

Per abilitare le notifiche email:

1. Crea un account [SendGrid](https://sendgrid.com)
2. Ottieni una API Key
3. Aggiungi `SENDGRID_API_KEY` nelle env vars di Vercel
4. Le email verranno inviate automaticamente per:
   - Conferma prenotazione
   - Cancellazione prenotazione

## 🐛 Troubleshooting

### Problema: API Google Sheets ritorna errore 403
**Soluzione**: Assicurati di aver condiviso il Google Sheet con l'email del service account

### Problema: Firebase Auth non funziona dopo il deploy
**Soluzione**: Aggiungi il dominio Vercel negli Authorized domains di Firebase

### Problema: Le mappe non si caricano
**Soluzione**: Controlla che Leaflet CSS sia importato correttamente in index.html

### Problema: Errore "Module not found"
**Soluzione**: 
\`\`\`bash
rm -rf node_modules package-lock.json
npm install
\`\`\`

## 📊 Struttura del Progetto

\`\`\`
calcetto-app/
├── api/                    # Vercel Serverless Functions
│   ├── users/
│   ├── matches/
│   ├── bookings/
│   └── ratings/
├── src/
│   ├── components/        # Componenti React
│   │   └── Navbar.jsx
│   ├── contexts/          # React Context (Auth)
│   │   └── AuthContext.jsx
│   ├── pages/             # Pagine principali
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── Dashboard.jsx
│   │   ├── MatchDetail.jsx
│   │   ├── CreateMatch.jsx
│   │   └── Profile.jsx
│   ├── services/          # API client
│   │   └── api.js
│   ├── config/            # Configurazioni
│   │   └── firebase.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── README.md
\`\`\`

## 🔒 Sicurezza

- Le password sono gestite da Firebase Auth (hash sicuro)
- Le API key sono nascoste tramite variabili d'ambiente
- CORS configurato correttamente
- Service Account con permessi limitati
- Validazione input lato client e server

## 🎨 Personalizzazione

### Colori

Modifica le variabili CSS in `src/App.css`:

\`\`\`css
:root {
  --primary: #10b981;      /* Verde principale */
  --secondary: #3b82f6;    /* Blu secondario */
  --danger: #ef4444;       /* Rosso per azioni pericolose */
}
\`\`\`

### Logo

Sostituisci l'emoji ⚽ nella navbar con il tuo logo in `src/components/Navbar.jsx`

## 📄 Licenza

MIT License - Sentiti libero di usare questo progetto!

## 🤝 Contribuire

Pull request benvenute! Per modifiche importanti, apri prima un issue.

## 📞 Supporto

Per problemi o domande, apri un issue su GitHub.

---

Fatto con ⚽ e ❤️
\`\`\`