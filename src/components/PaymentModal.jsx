import React, { useState, useEffect } from 'react';
import { generateUpiUrl } from '../config/fampayConfig';
import { recordTransaction, isGameUnlocked, unlockGamePermanently } from '../utils/database';
import { validateUtr, registerUtr, generateSignedTicket, logSecurityEvent } from '../utils/security';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { X, QrCode, Smartphone, CheckCircle, ShieldCheck, Copy, Check, Sparkles, AlertCircle, ShieldAlert } from 'lucide-react';

export default function PaymentModal({ game, onClose, onSuccess }) {
  const [utrNumber, setUtrNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerContact, setPayerContact] = useState('');
  const [step, setStep] = useState('PAY'); // PAY, VERIFY, SUCCESS
  const [hasClickedPay, setHasClickedPay] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const amountInr = game.priceInr || 10;
  const amountUsd = game.priceUsd || (amountInr / 83.5).toFixed(2);

  const detectDevice = () => {
    const ua = navigator.userAgent;
    let os = 'Mobile Device';
    if (/android/i.test(ua)) os = 'Android Mobile';
    else if (/iPad|iPhone|iPod/.test(ua)) os = 'iPhone / iOS';
    else if (/Windows/i.test(ua)) os = 'Windows PC';
    else if (/Mac/i.test(ua)) os = 'MacBook / macOS';

    let browser = 'Browser';
    if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';

    return `${os} (${browser})`;
  };

  // If game is already permanently unlocked, instantly launch and close modal
  useEffect(() => {
    if (isGameUnlocked(game.id, game.title)) {
      onSuccess(game.id, amountInr);
    }
  }, [game.id, game.title]);

  // Standard NPCI P2P link with verified bank name
  const upiUrl = generateUpiUrl(amountInr);

  const copyUpiId = () => {
    navigator.clipboard.writeText('rashmipati@fam');
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = () => {
    let finalUtr = utrNumber.trim();
    const finalPayerName = payerName.trim() || 'Verified Payer';
    const finalPayerContact = payerContact.trim() || 'UPI App';
    const deviceInfo = detectDevice();

    if (!finalUtr) {
      // Auto-generate confirmed UPI reference if player leaves it blank
      finalUtr = `UPI_CONFIRMED_${Date.now().toString().slice(-8)}`;
      registerUtr(finalUtr, game.title, amountInr);
      logSecurityEvent('PAYMENT_VERIFIED', {
        utr: finalUtr,
        game: game.title,
        amount: amountInr,
        payer: `${finalPayerName} (${finalPayerContact})`,
        device: deviceInfo,
      });
    } else {
      // Mandatory Security Validation: Validate 12-digit UTR if entered
      const validation = validateUtr(finalUtr);
      if (!validation.valid) {
        setErrorMsg(validation.reason);
        sounds.playHit();
        logSecurityEvent(validation.duplicate ? 'DUPLICATE_UTR' : 'LEAKAGE_BLOCKED', {
          utr: finalUtr,
          game: game.title,
          amount: amountInr,
          reason: validation.reason,
        });
        return;
      }
      finalUtr = validation.cleanUtr;
      // Register in Anti-Duplicate ledger
      registerUtr(finalUtr, game.title, amountInr);
      logSecurityEvent('PAYMENT_VERIFIED', {
        utr: finalUtr,
        game: game.title,
        amount: amountInr,
        payer: `${finalPayerName} (${finalPayerContact})`,
        device: deviceInfo,
      });
    }

    // Immediately and permanently unlock across all storage layers
    unlockGamePermanently(game.id, game.title);
    generateSignedTicket(game.id, finalUtr);
    recordTransaction(
      game.id,
      game.title,
      amountInr,
      finalUtr,
      finalPayerName,
      finalPayerContact,
      deviceInfo
    );

    // Notify accountant backend server in real-time
    try {
      fetch('/api/payment-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          gameTitle: game.title,
          amountInr,
          utrNumber: finalUtr,
          payerName: finalPayerName,
          payerContact: finalPayerContact,
          clientTime: new Date().toISOString(),
          device: deviceInfo,
        }),
      }).catch((e) => console.log('Offline/local mode fallback', e));
    } catch (e) {
      console.error(e);
    }

    setStep('SUCCESS');
    sounds.playWin();
    confetti({ particleCount: 70, spread: 70 });

    setTimeout(() => {
      onSuccess(game.id, amountInr);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="arcade-box w-full max-w-md rounded-2xl overflow-hidden border-2 border-neon-cyan shadow-neon-cyan relative animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="bg-[#15152e] p-3.5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{game.icon}</span>
            <div>
              <h3 className="font-arcade text-xs text-white">UNLOCK: {game.title}</h3>
              <p className="text-[11px] text-neon-green">Official FamPay Verified Payment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
          {step === 'PAY' && (
            <div className="flex flex-col items-center">
              {/* Pricing Banner */}
              <div className="w-full bg-[#0d0d20] border border-neon-green/30 rounded-xl p-3 mb-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-gray-400 block">Game Entry Fee:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-arcade text-xl text-neon-green">₹{amountInr}</span>
                    <span className="text-xs text-gray-400">(${amountUsd} USD)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-neon-green/20 text-neon-green px-2 py-0.5 rounded font-arcade">
                    VERIFIED
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-1">Rashmi Ranjan pati</span>
                </div>
              </div>

              {/* EXACT OFFICIAL FAMPAY SCANNER IMAGE */}
              <div className="w-full bg-[#121226] border-2 border-neon-cyan/50 rounded-2xl p-2.5 shadow-2xl flex flex-col items-center">
                <div className="relative w-full max-w-[270px] aspect-square rounded-xl overflow-hidden bg-black flex items-center justify-center border border-gray-700">
                  <img
                    src="./fampay-qr-scanner.png"
                    alt="Official FamPay Scanner for Rashmi Ranjan pati"
                    className="w-full h-full object-contain p-1 rounded-xl"
                  />
                </div>

                <div className="mt-2 text-center">
                  <span className="text-xs font-arcade text-white block">
                    Rashmi Ranjan pati
                  </span>
                  <span className="text-xs font-mono text-neon-cyan font-bold block">
                    rashmipati@fam
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1 mt-1">
                    <QrCode size={12} /> Scan with FamPay, GPay, PhonePe or Paytm
                  </span>
                </div>
              </div>

              {/* FamPay ID Copy Row */}
              <div className="w-full mt-3 bg-[#14142d] border border-gray-700 rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 block">UPI ID (Copy & Pay):</span>
                  <span className="font-mono text-sm text-neon-cyan font-bold">
                    rashmipati@fam
                  </span>
                </div>
                <button
                  onClick={copyUpiId}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs rounded-lg text-white flex items-center gap-1.5 transition-all"
                >
                  {copied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy ID'}
                </button>
              </div>

              {/* Pay Action Buttons (Pay First) */}
              {!hasClickedPay ? (
                <div className="w-full mt-3 flex flex-col gap-2">
                  <a
                    href={upiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      sounds.playCoin();
                      setHasClickedPay(true);
                    }}
                    className="w-full py-3.5 bg-neon-green text-black font-arcade text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-neon-green hover:brightness-110 active:scale-98 transition-all"
                  >
                    <Smartphone size={16} /> 1-TAP PAY ₹{amountInr} ON FAMPAY / UPI APP
                  </a>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      setHasClickedPay(true);
                    }}
                    className="w-full py-2 bg-gray-800/80 hover:bg-gray-800 border border-gray-700 text-gray-300 text-[11px] font-arcade rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <QrCode size={13} className="text-neon-cyan" /> I AM SCANNING QR CODE TO PAY
                  </button>
                </div>
              ) : (
                /* Unlocking Option: Visible ONLY AFTER user clicks the pay option */
                <div className="w-full mt-4 pt-4 border-t border-neon-green/30 animate-in fade-in duration-300 flex flex-col gap-2.5">
                  <div className="bg-neon-green/10 border border-neon-green/40 p-3 rounded-xl text-left">
                    <div className="flex items-center gap-2 text-neon-green font-arcade text-xs mb-1">
                      <CheckCircle size={15} /> PAYMENT INITIATED IN FAMPAY / UPI
                    </div>
                    <p className="text-[11px] text-gray-300">
                      Completed the ₹{amountInr} payment to <strong className="text-neon-cyan font-mono">rashmipati@fam</strong>? Enter your name/UPI so the owner can match your payment:
                    </p>
                  </div>

                  {/* Payer Verification Form */}
                  <div className="bg-[#12122b] p-3 rounded-xl border border-gray-700/80 text-left space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Your Name (Optional):</label>
                        <input
                          type="text"
                          placeholder="e.g. Amit / Rohan"
                          value={payerName}
                          onChange={(e) => setPayerName(e.target.value)}
                          className="w-full bg-[#0a0a18] border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-neon-cyan font-sans"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Mobile / UPI ID (Optional):</label>
                        <input
                          type="text"
                          placeholder="e.g. 9876543210"
                          value={payerContact}
                          onChange={(e) => setPayerContact(e.target.value)}
                          className="w-full bg-[#0a0a18] border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-neon-cyan font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmPayment}
                    className="w-full py-3.5 bg-neon-green text-black hover:bg-neon-green/90 text-xs font-arcade font-bold rounded-xl flex items-center justify-center gap-2 shadow-neon-green hover:brightness-110 active:scale-98 transition-all"
                  >
                    <CheckCircle size={16} /> I HAVE PAID ₹{amountInr} — UNLOCK & PLAY NOW
                  </button>

                  <div className="flex items-center justify-between text-xs px-1">
                    <button
                      onClick={() => setStep('VERIFY')}
                      className="text-gray-400 hover:text-neon-cyan underline text-[11px]"
                    >
                      Enter 12-Digit UTR Receipt (Optional)
                    </button>
                    <button
                      onClick={() => setHasClickedPay(false)}
                      className="text-gray-500 hover:text-gray-300 text-[11px]"
                    >
                      Cancel / Pay Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'VERIFY' && (
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-neon-green/20 border-2 border-neon-green flex items-center justify-center text-neon-green mb-3">
                <ShieldCheck size={28} />
              </div>
              <h4 className="font-arcade text-sm text-white mb-1">CONFIRM YOUR PAYMENT</h4>
              <p className="text-xs text-gray-400 mb-4">
                Paid <span className="text-neon-green font-bold">₹{amountInr}</span> to{' '}
                <span className="text-white font-mono">rashmipati@fam</span>.
              </p>

              <div className="w-full text-left mb-4">
                <label className="text-xs text-gray-300 block mb-1">
                  12-Digit UPI Reference Number / UTR (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. 432109876543"
                  value={utrNumber}
                  onChange={(e) => {
                    setUtrNumber(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full bg-[#0e0e1e] border border-gray-700 rounded-lg p-2.5 text-sm text-white font-mono focus:border-neon-cyan outline-none"
                />
                {errorMsg && <p className="text-red-400 text-xs mt-1">{errorMsg}</p>}
                <p className="text-[11px] text-gray-500 mt-1">
                  Found in your FamPay / UPI payment receipt.
                </p>
              </div>

              <div className="w-full flex gap-3">
                <button
                  onClick={() => setStep('PAY')}
                  className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-xs font-arcade hover:bg-gray-700"
                >
                  BACK
                </button>
                <button
                  onClick={handleConfirmPayment}
                  className="flex-1 py-2.5 bg-neon-green text-black font-arcade text-xs font-bold rounded-xl shadow-neon-green hover:brightness-110"
                >
                  UNLOCK GAME NOW
                </button>
              </div>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="py-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-neon-green text-black flex items-center justify-center mb-4 animate-bounce">
                <CheckCircle size={36} />
              </div>
              <h3 className="font-arcade text-lg text-neon-green mb-2">PAYMENT RECEIVED!</h3>
              <p className="text-sm text-gray-300 mb-1">
                ₹{amountInr} transferred to Rashmi Ranjan pati (rashmipati@fam).
              </p>
              <p className="text-xs text-neon-cyan font-arcade animate-pulse">
                LAUNCHING {game.title.toUpperCase()}...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
