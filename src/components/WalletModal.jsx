import React, { useState } from 'react';
import { generateUpiUrl, getAppUpiUrls } from '../config/fampayConfig';
import { recordTransaction } from '../utils/database';
import { validateUtr, registerUtr, logSecurityEvent } from '../utils/security';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { X, Coins, Smartphone, CheckCircle, QrCode, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';

export default function WalletModal({ tokens, onClose, onRechargeSuccess, onUnlockAllSuccess }) {
  const [selectedPack, setSelectedPack] = useState({ amount: 49, tokens: 100, label: 'VIP Pass (Unlock All 10 Games)', isVip: true });
  const [showQr, setShowQr] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [selectedApp, setSelectedApp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const packs = [
    { amount: 20, tokens: 20, label: 'Starter Pack (20 Tokens)', isVip: false },
    { amount: 35, tokens: 40, label: 'Gamer Pack (40 Tokens)', isVip: false },
    { amount: 49, tokens: 100, label: '🔥 VIP All-Access Pass (Unlock All Games)', isVip: true },
  ];

  const handleAppPay = (appName) => {
    sounds.playCoin();
    setSelectedApp(appName);
    const urls = getAppUpiUrls(selectedPack.amount, selectedPack.label);
    const targetUrl = urls[appName] || urls.universal;

    try {
      window.location.href = targetUrl;
    } catch (err) {
      console.warn('App launch error', err);
      window.location.href = urls.universal;
    }
  };

  const handleFinish = () => {
    setErrorMsg('');
    const finalUtr = utrNumber.trim().replace(/\D/g, '');
    const finalName = payerName.trim() || 'Wallet Customer';

    if (!finalUtr) {
      setErrorMsg('❌ 12-Digit UTR Required: Enter the 12-digit reference from your FamPay receipt.');
      sounds.playHit();
      return;
    }

    if (finalUtr.length !== 12) {
      setErrorMsg(`❌ Incomplete UTR: You entered ${finalUtr.length} digits. Exactly 12 digits required.`);
      sounds.playHit();
      return;
    }

    const validation = validateUtr(finalUtr);
    if (!validation.valid) {
      setErrorMsg(`❌ ${validation.reason}`);
      sounds.playHit();
      return;
    }

    registerUtr(validation.cleanUtr, selectedPack.label, selectedPack.amount);
    recordTransaction(
      selectedPack.label,
      selectedPack.label,
      selectedPack.amount,
      validation.cleanUtr,
      finalName,
      `${selectedApp || 'FamPay'} UPI`,
      'Wallet Checkout'
    );

    sounds.playWin();
    confetti({ particleCount: 80, spread: 70 });

    setTimeout(() => {
      if (selectedPack.isVip) {
        onUnlockAllSuccess(selectedPack.amount);
      } else {
        onRechargeSuccess(selectedPack.tokens, selectedPack.amount);
      }
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="arcade-box w-full max-w-md rounded-2xl overflow-hidden border-2 border-neon-yellow shadow-neon-yellow relative animate-in fade-in zoom-in duration-200">
        <div className="bg-[#181836] p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="text-neon-yellow" size={24} />
            <div>
              <h3 className="font-arcade text-xs text-white">ARCADE COINS & VIP PASS</h3>
              <p className="text-xs text-gray-400">Balance: <span className="text-neon-yellow font-bold">{tokens} Coins</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg bg-gray-800 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 max-h-[85vh] overflow-y-auto">
          {!showQr ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-300">Choose a coin package or unlock all games forever:</p>
              {packs.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPack(p)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    selectedPack.amount === p.amount
                      ? 'bg-neon-yellow/15 border-neon-yellow shadow-neon-yellow scale-[1.01]'
                      : 'bg-[#121226] border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div>
                    <span className="font-arcade text-xs text-white block">{p.label}</span>
                    <span className="text-xs text-neon-yellow font-bold">+{p.tokens} Arcade Coins</span>
                  </div>
                  <div className="text-right">
                    <span className="font-arcade text-sm text-neon-green">₹{p.amount}</span>
                    <span className="text-[10px] text-gray-400 block">(FamPay UPI)</span>
                  </div>
                </button>
              ))}

              <div className="pt-2">
                <button
                  onClick={() => setShowQr(true)}
                  className="w-full py-3 bg-neon-yellow text-black font-arcade text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-neon-yellow hover:brightness-110"
                >
                  PROCEED TO PAY ₹{selectedPack.amount}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* EXACT OFFICIAL SCANNER */}
              <div className="w-full bg-[#121226] border-2 border-neon-yellow/50 rounded-2xl p-2.5 shadow-2xl flex flex-col items-center mb-3">
                <div className="relative w-full max-w-[240px] aspect-square rounded-xl overflow-hidden bg-black flex items-center justify-center border border-gray-700">
                  <img
                    src="./fampay-qr-scanner.png"
                    alt="Official FamPay Scanner"
                    className="w-full h-full object-contain p-1 rounded-xl"
                  />
                </div>
                <div className="mt-2 text-center">
                  <span className="text-xs font-arcade text-white block">Rashmi Ranjan pati</span>
                  <span className="text-xs font-mono text-neon-cyan font-bold block">rashmipati@fam</span>
                  <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1 mt-1">
                    <QrCode size={12} /> Scan with PhonePe, Google Pay, FamPay or Paytm
                  </span>
                </div>
              </div>

              <div className="text-center mb-3">
                <span className="text-xs text-gray-400 block">Amount to Pay:</span>
                <span className="font-arcade text-neon-yellow text-base">₹{selectedPack.amount}</span>
              </div>

              {/* 5 App Launchers */}
              <div className="w-full grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={() => handleAppPay('phonepe')}
                  className="p-2 bg-[#5f259f]/25 hover:bg-[#5f259f]/40 border border-[#5f259f]/70 rounded-xl flex items-center gap-2 text-left"
                >
                  <div className="w-6 h-6 rounded bg-[#5f259f] text-white flex items-center justify-center text-xs font-bold">पे</div>
                  <span className="text-xs font-bold text-white">PhonePe</span>
                </button>
                <button
                  onClick={() => handleAppPay('gpay')}
                  className="p-2 bg-[#1a73e8]/20 hover:bg-[#1a73e8]/35 border border-[#1a73e8]/70 rounded-xl flex items-center gap-2 text-left"
                >
                  <div className="w-6 h-6 rounded bg-white text-[#1a73e8] flex items-center justify-center text-xs font-bold">G</div>
                  <span className="text-xs font-bold text-white">Google Pay</span>
                </button>
                <button
                  onClick={() => handleAppPay('fampay')}
                  className="p-2 bg-[#ffe600]/20 hover:bg-[#ffe600]/35 border border-[#ffe600]/70 rounded-xl flex items-center gap-2 text-left"
                >
                  <div className="w-6 h-6 rounded bg-[#ffe600] text-black flex items-center justify-center text-[10px] font-bold font-arcade">fam</div>
                  <span className="text-xs font-bold text-neon-yellow">FamPay</span>
                </button>
                <button
                  onClick={() => handleAppPay('paytm')}
                  className="p-2 bg-[#00b9f5]/20 hover:bg-[#00b9f5]/35 border border-[#00b9f5]/70 rounded-xl flex items-center gap-2 text-left"
                >
                  <div className="w-6 h-6 rounded bg-[#002970] text-[#00b9f5] flex items-center justify-center text-[10px] font-bold">Pay</div>
                  <span className="text-xs font-bold text-white">Paytm</span>
                </button>
              </div>

              {/* Razorpay button */}
              <button
                onClick={() => handleAppPay('razorpay')}
                className="w-full p-2 bg-[#0c2340]/60 hover:bg-[#0c2340]/90 border border-[#0284c7]/60 rounded-xl flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚡</span>
                  <span className="text-xs font-bold text-white">Razorpay / All UPI Apps</span>
                </div>
                <span className="text-[10px] bg-[#0284c7]/30 text-sky-200 px-2 py-0.5 rounded font-mono">Pay ₹{selectedPack.amount}</span>
              </button>

              {/* 12-digit UTR verification */}
              <div className="w-full bg-[#0e0e22] p-3 rounded-xl border border-gray-700 text-left space-y-2 mb-3">
                <label className="text-xs font-arcade text-neon-yellow block">
                  Enter 12-Digit UTR From Receipt *:
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="e.g. 432109876543"
                  value={utrNumber}
                  onChange={(e) => {
                    setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12));
                    setErrorMsg('');
                  }}
                  className="w-full bg-[#070714] border border-gray-700 focus:border-neon-yellow rounded-lg p-2 text-sm text-center text-white font-mono tracking-widest outline-none"
                />

                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="w-full bg-[#070714] border border-gray-700 rounded-lg p-2 text-xs text-white outline-none"
                />
              </div>

              {errorMsg && (
                <div className="w-full p-2.5 bg-red-950/80 border border-red-500 rounded-xl text-left flex items-start gap-2 mb-3">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-200">{errorMsg}</p>
                </div>
              )}

              <button
                onClick={handleFinish}
                className="w-full py-3 bg-neon-yellow text-black font-arcade text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-neon-yellow hover:brightness-110 active:scale-98 transition-all"
              >
                <ShieldCheck size={16} /> VERIFY UTR & UNLOCK
              </button>

              <button
                onClick={() => {
                  setShowQr(false);
                  setErrorMsg('');
                }}
                className="text-xs text-gray-400 hover:text-white underline mt-3 flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Back to Packages
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
