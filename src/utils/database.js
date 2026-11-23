// Retro Arcade Local Database & Security Manager
// Saves and controls all website transactions, player balances, and state

const DB_KEY = 'arcade_master_database';

export const INITIAL_DATABASE = {
  version: '1.0.0',
  owner: {
    name: 'Rashmi Ranjan pati',
    fampayId: 'rashmipati@fam',
    createdAt: new Date().toISOString(),
  },
  playerState: {
    coins: 20, // Initial 20 coins
    unlockedGames: [],
    unlockedShopItems: ['char-stick', 'sound-classic', 'badge-rookie'],
    equipped: {
      Characters: 'char-stick',
      Instruments: 'sound-classic',
      Labels: 'badge-rookie',
    },
    highScores: {},
  },
  transactions: [
    {
      id: 'TXN_INIT',
      date: new Date().toISOString(),
      amount: 0,
      note: 'Account initialized with 20 starting coins',
      fampayId: 'rashmipati@fam',
      status: 'COMPLETED',
    },
  ],
};

// Load database from localStorage or initialize
export function loadDatabase() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure playerState and unlockedGames exist
      if (!parsed.playerState) parsed.playerState = {};
      if (!Array.isArray(parsed.playerState.unlockedGames)) {
        parsed.playerState.unlockedGames = [];
      }
      // Re-hydrate from fallback multi-layer storage
      try {
        const fallback = JSON.parse(localStorage.getItem('rpp_all_unlocked_games') || '[]');
        if (Array.isArray(fallback)) {
          fallback.forEach((id) => {
            if (!parsed.playerState.unlockedGames.includes(id)) {
              parsed.playerState.unlockedGames.push(id);
            }
          });
        }
      } catch {}
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load database:', e);
  }
  saveDatabase(INITIAL_DATABASE);
  return INITIAL_DATABASE;
}

// Save database to localStorage
export function saveDatabase(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db, null, 2));
    // Also sync fallback unlock list
    if (db?.playerState?.unlockedGames) {
      localStorage.setItem('rpp_all_unlocked_games', JSON.stringify(db.playerState.unlockedGames));
    }
  } catch (e) {
    console.error('Failed to save database:', e);
  }
}

// Helper: Check if a game is unlocked with multi-tier fallback
export function isGameUnlocked(gameId, gameTitle, optionalDb = null) {
  if (!gameId && !gameTitle) return false;
  const db = optionalDb || loadDatabase();
  const list = db?.playerState?.unlockedGames || [];

  // 1. VIP Pass / All unlock
  if (db?.playerState?.hasVipPass || list.includes('all')) return true;

  // 2. Direct ID check
  if (gameId && list.includes(gameId)) return true;

  // 3. Title check
  if (gameTitle && list.includes(gameTitle)) return true;

  // 4. Standalone per-game localStorage flags
  if (gameId && localStorage.getItem(`rpp_unlocked_${gameId}`) === 'true') return true;
  if (gameTitle && localStorage.getItem(`rpp_unlocked_${gameTitle}`) === 'true') return true;

  return false;
}

// Helper: Consume a paid game play session on game exit (unless player holds permanent VIP Pass)
export function consumeGameSession(gameId, gameTitle = '') {
  const db = loadDatabase();
  if (db?.playerState?.hasVipPass || db?.playerState?.unlockedGames?.includes('all')) {
    // VIP pass holders keep games unlocked forever
    return db;
  }

  if (db.playerState?.unlockedGames) {
    db.playerState.unlockedGames = db.playerState.unlockedGames.filter(
      (id) => id !== gameId && id !== gameTitle
    );
  }

  if (gameId) localStorage.removeItem(`rpp_unlocked_${gameId}`);
  if (gameTitle) localStorage.removeItem(`rpp_unlocked_${gameTitle}`);

  try {
    const fallback = JSON.parse(localStorage.getItem('rpp_all_unlocked_games') || '[]');
    const filtered = fallback.filter((id) => id !== gameId && id !== gameTitle);
    localStorage.setItem('rpp_all_unlocked_games', JSON.stringify(filtered));
  } catch {}

  saveDatabase(db);
  return db;
}

// Reset all game unlocks (Owner Control & Anti-Bypass Testing)
export function resetAllUnlockedGames() {
  const db = loadDatabase();
  if (db.playerState) {
    db.playerState.unlockedGames = [];
    db.playerState.hasVipPass = false;
  }
  localStorage.removeItem('rpp_all_unlocked_games');
  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith('rpp_unlocked_')) {
      localStorage.removeItem(k);
    }
  });
  saveDatabase(db);
  return db;
}

// Helper: Unlock a game for paid play
export function unlockGamePermanently(gameId, gameTitle = '', isVip = false) {
  const db = loadDatabase();
  if (!db.playerState) db.playerState = {};
  if (!Array.isArray(db.playerState.unlockedGames)) db.playerState.unlockedGames = [];

  if (isVip || gameId === 'all') {
    db.playerState.hasVipPass = true;
    if (!db.playerState.unlockedGames.includes('all')) {
      db.playerState.unlockedGames.push('all');
    }
  }

  // Store both ID and Title
  if (gameId && !db.playerState.unlockedGames.includes(gameId)) {
    db.playerState.unlockedGames.push(gameId);
  }
  if (gameTitle && !db.playerState.unlockedGames.includes(gameTitle)) {
    db.playerState.unlockedGames.push(gameTitle);
  }

  // Set dedicated keys
  if (gameId) localStorage.setItem(`rpp_unlocked_${gameId}`, 'true');
  if (gameTitle) localStorage.setItem(`rpp_unlocked_${gameTitle}`, 'true');

  // Set fallback list
  try {
    const fallback = JSON.parse(localStorage.getItem('rpp_all_unlocked_games') || '[]');
    const set = new Set(fallback);
    if (gameId) set.add(gameId);
    if (gameTitle) set.add(gameTitle);
    localStorage.setItem('rpp_all_unlocked_games', JSON.stringify(Array.from(set)));
  } catch {}

  saveDatabase(db);
  return db;
}

// Record a new payment transaction into the owner's database
export function recordTransaction(
  gameIdOrTitle,
  gameTitleOrAmount,
  amountInrOrUtr = 10,
  utrVal = '',
  payerNameVal = '',
  payerContactVal = '',
  deviceVal = ''
) {
  let gameId = '';
  let gameTitle = '';
  let amountInr = 10;
  let utr = '';
  let payerName = payerNameVal;
  let payerContact = payerContactVal;
  let device = deviceVal;

  // Handle flexible arguments
  if (typeof gameTitleOrAmount === 'string' && typeof amountInrOrUtr === 'number') {
    gameId = gameIdOrTitle;
    gameTitle = gameTitleOrAmount;
    amountInr = amountInrOrUtr;
    utr = utrVal;
  } else if (typeof gameTitleOrAmount === 'number') {
    gameTitle = gameIdOrTitle;
    gameId = gameIdOrTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
    amountInr = gameTitleOrAmount;
    utr = amountInrOrUtr || '';
  }

  const db = unlockGamePermanently(gameId, gameTitle);

  const newTxn = {
    id: `TXN_${Date.now()}`,
    date: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    gameId,
    gameTitle,
    amountInr,
    utr: utr || `UPI_DIRECT_${Date.now().toString().slice(-6)}`,
    payerName: payerName || 'UPI Customer',
    payerContact: payerContact || 'Verified Mobile',
    device: device || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Direct'),
    fampayRecipient: 'rashmipati@fam',
    status: 'VERIFIED_PAID',
  };

  if (!db.transactions) db.transactions = [];
  db.transactions.unshift(newTxn);
  saveDatabase(db);
  return newTxn;
}

// Reward coins for winning games (+20 or +50)
export function addWinCoins(amount) {
  const db = loadDatabase();
  db.playerState.coins = (db.playerState.coins || 0) + amount;
  saveDatabase(db);
  return db.playerState.coins;
}

// Export database as JSON file for download
export function exportDatabaseBackup() {
  const db = loadDatabase();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `arcade_database_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Wipe / Reset website data (Complete Owner Control)
export function wipeDatabase() {
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem('unlocked_arcade_games');
  localStorage.removeItem('arcade_tokens');
  localStorage.removeItem('rpp_all_unlocked_games');
  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith('rpp_unlocked_')) {
      localStorage.removeItem(k);
    }
  });
  saveDatabase(INITIAL_DATABASE);
}
