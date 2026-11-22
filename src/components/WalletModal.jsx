import React, { useState } from 'react';
import { generateUpiUrl } from '../config/fampayConfig';
import { recordTransaction } from '../utils/database';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { X, Coins, Smartphone, CheckCircle, QrCode } from 'lucide-react';

export default function WalletModal({ tokens, onClose, onRechargeSuccess, onUnlockAllSuccess }) {
  const [selectedPack, setSelectedPack] = useState({ amount: 49, tokens: 100, label: 'VIP Pass (Unlock All 10 Games)', isVip: true });
  const [showQr, setShowQr] = useState(false);

  const packs = [
    { amount: 20, tokens: 20, label: 'Starter Pack (20 Tokens)', isVip: false },
    { amount: 35, tokens: 40, label: 'Gamer Pack (40 Tokens)', isVip: false },
    { amount: 49, tokens: 100, label: '🔥 VIP All-Access Pass (Unlock All Games)', isVip: true },
  ];

  const upiUrl = generateUpiUrl(selectedPack.amount);

  const handleFinish = (isDemo = false) => {
    recordTransaction(selectedPack.label, selectedPack.amount);
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
                    src="/fampay-qr-scanner.png"
                    alt="Official FamPay Scanner"
                    className="w-full h-full object-contain p-1 rounded-xl"
                  />
                </div>
                <div className="mt-2 text-center">
                  <span className="text-xs font-arcade text-white block">Rashmi Ranjan pati</span>
                  <span className="text-xs font-mono text-neon-cyan font-bold block">rashmipati@fam</span>
                  <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1 mt-1">
                    <QrCode size={12} /> Scan with FamPay, GPay, PhonePe or Paytm
                  </span>
                </div>
              </div>

              <div className="text-center mb-3">
                <span className="text-xs text-gray-400 block">Amount to Pay:</span>
                <span className="font-arcade text-neon-yellow text-base">₹{selectedPack.amount}</span>
              </div>

              <a
                href={upiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-neon-green text-black font-arcade text-xs font-bold rounded-xl flex items-center justify-center gap-2 mb-2"
              >
                <Smartphone size={15} /> 1-TAP PAY ON MOBILE
              </a>

              <button
                onClick={() => handleFinish(false)}
                className="w-full py-2.5 bg-neon-yellow/20 border border-neon-yellow text-neon-yellow font-arcade text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={15} /> PAYMENT COMPLETED
              </button>

              <button
                onClick={() => handleFinish(true)}
                className="text-xs text-gray-400 hover:text-white underline mt-2"
              >
                Test Mode: Instant Free Credit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
