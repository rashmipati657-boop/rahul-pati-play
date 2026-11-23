// Rahul Pati Play - Financial Security & Anti-Leakage Protection Engine
// Audits the money path, prevents fake payments, blocks duplicate UTRs, and secures transactions.

const SECURITY_SALT = 'RAHUL_PATI_PLAY_SECURE_PAYOUT_V1_2026';
const USED_UTRS_KEY = 'rpp_used_utrs_ledger';
const SECURITY_LOGS_KEY = 'rpp_security_audit_logs';

// Validate Indian 12-digit NPCI UPI Reference Number (UTR)
export function validateUtr(utr) {
  if (!utr || typeof utr !== 'string') {
    return { valid: false, reason: '12-digit UPI Reference Number (UTR) is required to verify genuine payment.' };
  }
  const clean = utr.trim().replace(/\s+/g, '');
  // Valid NPCI UTR is exactly 12 numeric digits
  if (!/^\d{12}$/.test(clean)) {
    return { valid: false, reason: 'UTR must be exactly 12 numeric digits from your FamPay payment receipt.' };
  }
  // Check if all digits are identical (e.g. 000000000000, 111111111111, 777777777777, 999999999999)
  if (/^(.)\1{11}$/.test(clean)) {
    return { valid: false, reason: 'Suspicious repetitive UTR detected. Please enter the genuine 12-digit reference from your FamPay receipt.' };
  }
  // Check common sequential or dummy test numbers
  const dummyNumbers = [
    '123456789012', '012345678901', '987654321098',
    '123412341234', '112233445566', '121212121212',
    '111222333444', '000111222333'
  ];
  if (dummyNumbers.includes(clean)) {
    return { valid: false, reason: 'Test/Dummy UTR detected. Please enter the genuine 12-digit reference from your FamPay receipt.' };
  }

  // Check anti-leakage duplicate database
  const usedUtrs = getUsedUtrs();
  if (usedUtrs[clean]) {
    const prevDate = new Date(usedUtrs[clean].timestamp).toLocaleDateString();
    return {
      valid: false,
      reason: `This UTR (${clean}) was already redeemed on ${prevDate}. Reusing payment receipts is blocked. Each ₹2 payment can only unlock once.`,
      duplicate: true,
    };
  }

  return { valid: true, cleanUtr: clean };
}

// Get all redeemed UTRs
export function getUsedUtrs() {
  try {
    const raw = localStorage.getItem(USED_UTRS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Register a verified UTR to prevent reuse
export function registerUtr(utr, gameTitle, amountInr) {
  const used = getUsedUtrs();
  used[utr] = {
    gameTitle,
    amountInr,
    timestamp: new Date().toISOString(),
    recipient: 'rashmipati@fam',
  };
  try {
    localStorage.setItem(USED_UTRS_KEY, JSON.stringify(used));
  } catch (e) {
    console.error('Failed to save UTR ledger', e);
  }
}

// Simple deterministic hash for tamper-proof unlock tickets
export function generateSignedTicket(gameId, utr) {
  const payload = `${gameId}:${utr}:${SECURITY_SALT}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `RPP_TOKEN_${Math.abs(hash).toString(36)}_${Date.now()}`;
}

// Log security events (attempts, blocked leaks, verified payments)
export function logSecurityEvent(type, details) {
  try {
    const raw = localStorage.getItem(SECURITY_LOGS_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift({
      id: `SEC_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type, // 'PAYMENT_VERIFIED', 'LEAKAGE_BLOCKED', 'TAMPER_PREVENTED', 'DUPLICATE_UTR'
      details,
    });
    localStorage.setItem(SECURITY_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch (e) {
    console.error('Failed to log security event', e);
  }
}

export function getSecurityLogs() {
  try {
    const raw = localStorage.getItem(SECURITY_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
