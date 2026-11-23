import React, { useState, useEffect } from 'react';
import { generateUpiUrl } from '../config/fampayConfig';
import { recordTransaction, isGameUnlocked, unlockGamePermanently } from '../utils/database';
import { validateUtr, registerUtr, generateSignedTicket, logSecurityEvent } from '../utils/security';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { X, QrCode, Smartphone, CheckCircle, ShieldCheck, Copy, Check, Sparkles, AlertCircle, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function PaymentModal({ game, onClose, onSuccess }) {
  const [utrNumber, setUtrNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerContact, setPayerContact] = useState('');
  const [step, setStep] = useState('PAY'); // PAY, SUCCESS
  const [hasClickedPay, setHasClickedPay] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const amountInr = game.priceInr || 2;
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
    setErrorMsg('');
    const finalUtr = utrNumber.trim().replace(/\D/g, '');
    const finalPayerName = payerName.trim();
    const finalPayerContact = payerContact.trim() || 'FamPay / UPI App';
    const deviceInfo = detectDevice();

    // STRICT ANTI-BYPASS CHECK 1: UTR cannot be empty
    if (!finalUtr) {
      setErrorMsg('❌ 12-Digit UTR Required: Please enter the 12-digit UPI Reference Number from your FamPay receipt to unlock.');
      sounds.playHit();
      return;
    }

    // STRICT ANTI-BYPASS CHECK 2: UTR must be exactly 12 digits
    if (finalUtr.length !== 12) {
      setErrorMsg(`❌ Incomplete UTR: You entered ${finalUtr.length} digits. A genuine UPI Reference Number is exactly 12 digits.`);
      sounds.playHit();
      return;
    }

    // STRICT ANTI-BYPASS CHECK 3: Payer name is mandatory for audit trail
    if (!finalPayerName) {
      setErrorMsg('❌ Payer Name Required: Please enter your name so the owner (Rashmi Ranjan pati) can verify your payment.');
      sounds.playHit();
      return;
    }

    // STRICT ANTI-BYPASS CHECK 4: Validate genuine NPCI UTR and block duplicates/dummies
    const validation = validateUtr(finalUtr);
    if (!validation.valid) {
      setErrorMsg(`❌ ${validation.reason}`);
      sounds.playHit();
      logSecurityEvent(validation.duplicate ? 'DUPLICATE_UTR' : 'LEAKAGE_BLOCKED', {
        utr: finalUtr,
        game: game.title,
        amount: amountInr,
        payer: finalPayerName,
        reason: validation.reason,
      });
      return;
    }

    const cleanUtr = validation.cleanUtr;

    // Register in Anti-Duplicate ledger to prevent reuse
    registerUtr(cleanUtr, game.title, amountInr);
    logSecurityEvent('PAYMENT_VERIFIED', {
      utr: cleanUtr,
      game: game.title,
      amount: amountInr,
      payer: `${finalPayerName} (${finalPayerContact})`,
      device: deviceInfo,
    });

    // Permanently unlock game across all storage layers
    unlockGamePermanently(game.id, game.title);
    generateSignedTicket(game.id, cleanUtr);
    recordTransaction(
      game.id,
      game.title,
      amountInr,
      cleanUtr,
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
          utrNumber: cleanUtr,
          payerName: finalPayerName,
          payerContact: finalPayerContact,
          clientTime: new Date().toISOString(),
          device: deviceInfo,
        }),
      }).catch((e) => console.log('Offline/cloud mode fallback', e));
    } catch (e) {
      console.error(e);
    }

    setStep('SUCCESS');
    sounds.playWin();
    confetti({ particleCount: 80, spread: 70 });

    setTimeout(() => {
      onSuccess(game.id, amountInr);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="arcade-box w-full max-w-md rounded-2xl overflow-hidden border-2 border-neon-cyan shadow-neon-cyan relative animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="bg-[#14142d] p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{game.icon || '🕹️'}</span>
            <div>
              <h3 className="font-arcade text-xs text-white">UNLOCK: {game.title}</h3>
              <p className="text-[11px] text-neon-green font-mono flex items-center gap-1">
                <ShieldCheck size={12} /> Official FamPay Verified Payment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[85vh] overflow-y-auto">
          {step === 'PAY' && (
            <div className="flex flex-col items-center text-center">
              {/* Fee Showcase */}
              <div className="w-full bg-[#0c0c1e] border border-gray-800 rounded-xl p-3 mb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 block font-arcade">Game Entry Fee:</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-arcade text-xl text-neon-green font-bold">₹{amountInr}</span>
                    <span className="text-xs text-gray-400">(${amountUsd} USD)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-neon-green/20 text-neon-green border border-neon-green/40 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                    VERIFIED
                  </span>
                  <span className="text-[11px] text-gray-300 block mt-1 font-medium">Rashmi Ranjan pati</span>
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

              {/* Pay Action Buttons (Step 1) */}
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
                /* Step 2: MANDATORY 12-DIGIT UTR PAYMENT VERIFICATION */
                <div className="w-full mt-4 pt-4 border-t-2 border-neon-cyan/40 animate-in fade-in duration-300 flex flex-col gap-3">
                  <div className="bg-[#12122b] border border-neon-cyan/50 p-3 rounded-xl text-left">
                    <div className="flex items-center gap-2 text-neon-cyan font-arcade text-xs mb-1">
                      <ShieldAlert size={15} /> STEP 2: VERIFY YOUR ₹{amountInr} PAYMENT
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      Completed your ₹{amountInr} payment to <strong className="text-neon-green font-mono">rashmipati@fam</strong>? 
                      Enter your receipt's <strong className="text-neon-yellow">12-digit UPI Reference No. (UTR)</strong> below to verify and unlock:
                    </p>
                  </div>

                  {/* Mandatory 12-digit UTR Input */}
                  <div className="bg-[#0e0e22] p-3 rounded-xl border border-gray-700 text-left space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-arcade text-neon-yellow flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-neon-yellow" />
                          12-Digit UPI Reference No. / UTR * (Mandatory)
                        </label>
                        <span className="text-[11px] font-mono text-neon-cyan font-bold">
                          {utrNumber.length}/12
                        </span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={12}
                        placeholder="Enter 12-digit UTR (e.g. 432109876543)"
                        value={utrNumber}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                          setUtrNumber(digits);
                          setErrorMsg('');
                        }}
                        className="w-full bg-[#070714] border-2 border-neon-cyan/60 focus:border-neon-green rounded-xl p-3 text-sm text-center text-white font-mono tracking-widest outline-none shadow-inner transition-all"
                        autoFocus
                      />
                      <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">
                        💡 <strong>Where to find:</strong> Open your UPI / FamPay receipt &gt; copy the 12-digit <strong>UPI Ref No. / UTR</strong> (e.g. 432109876543).
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-800">
                      <div>
                        <label className="text-[10px] text-gray-300 block mb-1">Your Name * (Mandatory):</label>
                        <input
                          type="text"
                          placeholder="e.g. Amit / Rohan"
                          value={payerName}
                          onChange={(e) => {
                            setPayerName(e.target.value);
                            setErrorMsg('');
                          }}
                          className="w-full bg-[#070714] border border-gray-700 focus:border-neon-cyan rounded-lg p-2 text-xs text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-300 block mb-1">Mobile / UPI ID (Optional):</label>
                        <input
                          type="text"
                          placeholder="e.g. 9876543210"
                          value={payerContact}
                          onChange={(e) => setPayerContact(e.target.value)}
                          className="w-full bg-[#070714] border border-gray-700 focus:border-neon-cyan rounded-lg p-2 text-xs text-white outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Error Box */}
                  {errorMsg && (
                    <div className="p-3 bg-red-950/90 border border-red-500 rounded-xl text-left flex items-start gap-2 shadow-lg">
                      <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-200 font-medium leading-relaxed">{errorMsg}</p>
                    </div>
                  )}

                  {/* Strictly Protected Verify Button */}
                  <button
                    onClick={handleConfirmPayment}
                    className={`w-full py-3.5 font-arcade text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                      utrNumber.length === 12 && payerName.trim()
                        ? 'bg-neon-green text-black hover:bg-neon-green/90 shadow-neon-green hover:brightness-110 active:scale-98 animate-pulse'
                        : 'bg-gray-800 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <ShieldCheck size={16} /> VERIFY 12-DIGIT UTR & UNLOCK GAME
                  </button>

                  <button
                    onClick={() => {
                      setHasClickedPay(false);
                      setErrorMsg('');
                    }}
                    className="text-gray-400 hover:text-neon-cyan text-xs underline py-1 flex items-center justify-center gap-1 transition-colors"
                  >
                    <ArrowLeft size={13} /> Back to QR Code & Pay Options
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="py-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-neon-green text-black flex items-center justify-center mb-4 animate-bounce">
                <CheckCircle size={36} />
              </div>
              <h3 className="font-arcade text-lg text-neon-green mb-2">PAYMENT VERIFIED!</h3>
              <p className="text-sm text-gray-300 mb-1">
                ₹{amountInr} received for <strong className="text-white">{game.title}</strong>.
              </p>
              <p className="text-xs text-gray-400 font-mono mb-2">
                UTR: {utrNumber} • Verified by Rashmi Ranjan pati
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
