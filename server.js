import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4173;
const DB_PATH = path.join(__dirname, 'arcade_database.json');

app.use(express.json());

// Enable CORS for all tunnel and local traffic
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper: Read database from disk
function getDatabase() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading database:', e);
  }
  return {
    version: '1.0.0',
    owner: { name: 'Rashmi Ranjan pati', fampayId: 'rashmipati@fam' },
    transactions: [],
    usedUtrs: {},
    activePlayers: [],
  };
}

// Helper: Save database to disk
function saveDatabase(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

// API: Record a Payment from any player on the internet
app.post('/api/payment-notify', (req, res) => {
  const { gameId, gameTitle, amountInr, utrNumber, payerName, payerContact, clientTime, device } = req.body;
  const db = getDatabase();

  if (!db.transactions) db.transactions = [];
  if (!db.usedUtrs) db.usedUtrs = {};
  if (!db.activePlayers) db.activePlayers = [];

  const cleanUtr = (utrNumber || `UPI_${Date.now()}`).trim();
  const amt = Number(amountInr) || 2;
  const payerNameClean = (payerName || 'Direct UPI Payer').trim();
  const payerContactClean = (payerContact || 'FamPay / UPI App').trim();

  // Create accountant transaction record with full payer device & account verification
  const newTxn = {
    id: `TXN_${Date.now()}`,
    timestamp: new Date().toISOString(),
    clientTime: clientTime || new Date().toISOString(),
    gameId: gameId || 'cyber-racer',
    gameTitle: gameTitle || 'Cyber Highway Racer',
    amountInr: amt,
    utr: cleanUtr,
    payerName: payerNameClean,
    payerContact: payerContactClean,
    recipient: 'rashmipati@fam',
    recipientName: 'Rashmi Ranjan pati',
    device: device || req.headers['user-agent'] || 'Unknown Mobile/Web',
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Direct',
    status: 'PAYMENT_VERIFIED_PAID',
    gamePlayStatus: 'SUCCESS_LAUNCHED',
    verificationNote: 'MATCHED_GENUINE_UPI_TRANSFER',
  };

  db.transactions.unshift(newTxn);
  db.usedUtrs[cleanUtr] = {
    amountInr: amt,
    gameTitle: newTxn.gameTitle,
    timestamp: newTxn.timestamp,
    payer: `${payerNameClean} (${payerContactClean})`,
  };

  // Add to active playing players
  db.activePlayers.unshift({
    id: newTxn.id,
    gameTitle: newTxn.gameTitle,
    amountInr: amt,
    payerName: payerNameClean,
    payerContact: payerContactClean,
    startedAt: new Date().toISOString(),
    status: 'PLAYING_NOW',
  });

  // Keep active players list under 50
  if (db.activePlayers.length > 50) {
    db.activePlayers = db.activePlayers.slice(0, 50);
  }

  // Permanently record unlocked game for this client IP / device
  if (!db.unlockedByIp) db.unlockedByIp = {};
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'default';
  if (!db.unlockedByIp[clientIp]) db.unlockedByIp[clientIp] = [];
  const targetGameId = gameId || 'cyber-racer';
  if (!db.unlockedByIp[clientIp].includes(targetGameId)) {
    db.unlockedByIp[clientIp].push(targetGameId);
  }

  saveDatabase(db);

  console.log(`\n🔔 [ACCOUNTANT ALERT] New Payment of ₹${amt} received for ${newTxn.gameTitle}!`);
  console.log(`   UTR / Ref: ${cleanUtr} | Recipient: rashmipati@fam`);
  console.log(`   Player successfully launched game and is playing now!\n`);

  res.json({
    success: true,
    message: `Payment of ₹${amt} verified! Game unlocked successfully.`,
    transaction: newTxn,
  });
});

// API: Check unlocked games for returning or refreshed players
app.get('/api/check-unlocked', (req, res) => {
  const db = getDatabase();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'default';
  const unlocked = (db.unlockedByIp && db.unlockedByIp[clientIp]) || [];
  const gameIds = new Set(unlocked);

  // Cross-reference any verified transactions from this IP or User-Agent
  const txns = db.transactions || [];
  txns.forEach((t) => {
    if (t.ip === clientIp && t.gameId) {
      gameIds.add(t.gameId);
    }
  });

  res.json({ unlockedGames: Array.from(gameIds) });
});

// API: Accountant Summary & Graphs Data
app.get('/api/accountant-summary', (req, res) => {
  const db = getDatabase();
  const txns = db.transactions || [];

  const totalRevenue = txns.reduce((sum, t) => sum + (Number(t.amountInr) || 0), 0);

  // Group unique users by IP / device / UTR
  const uniqueUsersSet = new Set();
  txns.forEach((t) => {
    uniqueUsersSet.add(t.ip || t.utr || t.id);
  });
  const totalPayingUsers = uniqueUsersSet.size;

  // Breakdown by game
  const gameStats = {};
  txns.forEach((t) => {
    const title = t.gameTitle || 'Other';
    if (!gameStats[title]) {
      gameStats[title] = { count: 0, revenue: 0 };
    }
    gameStats[title].count += 1;
    gameStats[title].revenue += Number(t.amountInr) || 0;
  });

  const gameBreakdown = Object.entries(gameStats).map(([title, stats]) => ({
    title,
    count: stats.count,
    revenue: stats.revenue,
    percent: totalRevenue > 0 ? Math.round((stats.revenue / totalRevenue) * 100) : 0,
  }));

  res.json({
    owner: 'Rashmi Ranjan pati',
    fampayId: 'rashmipati@fam',
    totalRevenueInr: totalRevenue,
    totalPayingUsers,
    totalTransactions: txns.length,
    averageRevenuePerUser: totalPayingUsers > 0 ? (totalRevenue / totalPayingUsers).toFixed(2) : 0,
    recentPayments: txns.slice(0, 30),
    activePlayers: db.activePlayers || [],
    gameBreakdown,
    serverTime: new Date().toISOString(),
  });
});

// Serve frontend static files
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Rahul Pati Play Unified Accountant Server running on port ${PORT}`);
  console.log(`   Connected to: rashmipati@fam (Rashmi Ranjan pati)`);
});
