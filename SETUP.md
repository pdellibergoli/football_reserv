# 🚀 Guida Rapida - Setup in 10 Minuti

## Checklist Pre-Deploy

- [ ] Account Firebase creato
- [ ] Google Sheet creato con 4 tabs (Users, Matches, Bookings, Ratings)
- [ ] Service Account Google creato e Sheet condiviso
- [ ] Repository GitHub creato
- [ ] Account Vercel pronto

## Passo 1: Firebase (3 min)

1. Vai su https://console.firebase.google.com/
2. Crea progetto
3. Authentication → Email/Password → Abilita
4. Project Settings → Copia le credenziali

## Passo 2: Google Sheets (5 min)

1. Crea nuovo Google Sheet
2. Crea 4 tabs: **Users**, **Matches**, **Bookings**, **Ratings**
3. Aggiungi header row in ogni tab (vedi README.md)
4. Vai su Google Cloud Console
5. Abilita Google Sheets API
6. Crea Service Account → Scarica JSON
7. Condividi Sheet con email del service account

## Passo 3: Codice (1 min)

\`\`\`bash
git clone <your-repo>
cd calcetto-app
npm install
cp .env.example .env
# Compila il file .env con i tuoi valori
\`\`\`

## Passo 4: Deploy Vercel (1 min)

1. Push su GitHub
2. Import su Vercel
3. Aggiungi tutte le env variables
4. Deploy!
5. Aggiungi dominio Vercel in Firebase Authorized domains

## ✅ Test Finale

1. Vai sul tuo URL Vercel
2. Registrati con email/password
3. Crea una partita di test
4. Prenota la partita
5. Vai al profilo e modifica i dati

Se tutto funziona, sei pronto! 🎉

## 🆘 Problemi?

Leggi il README.md completo o apri un issue su GitHub.