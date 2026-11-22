import React, { useState } from 'react';
import { sounds } from '../utils/audio';
import { X, Save, Key, User, DollarSign, Check, Info, ShieldAlert } from 'lucide-react';

export default function OwnerSettingsModal({ config, onSave, onClose }) {
  const [fampayId, setFampayId] = useState(config.fampayId);
  const [receiverName, setReceiverName] = useState(config.receiverName);
  const [testMode, setTestMode] = useState(config.testMode || false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const updated = {
      ...config,
      fampayId: fampayId.trim(),
      receiverName: receiverName.trim(),
      testMode,
    };
    onSave(updated);
    sounds.playCoin();
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="arcade-box w-full max-w-lg rounded-2xl overflow-hidden border-2 border-neon-yellow shadow-neon-yellow relative animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-[#181836] p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <div>
              <h3 className="font-arcade text-xs text-neon-yellow">FAMPAY ACCOUNT SETUP</h3>
              <p className="text-xs text-gray-400">Owner Payout & Game Monetization Settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 max-h-[85vh] overflow-y-auto space-y-4">
          <div className="bg-neon-yellow/10 border border-neon-yellow/30 rounded-xl p-3 text-xs text-gray-300 flex items-start gap-2.5">
            <Info size={18} className="text-neon-yellow shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block mb-0.5">Where does the money go?</span>
              Enter your real <span className="text-neon-yellow font-bold">FamPay UPI ID</span> below. Every time a player scans the QR code or taps to pay on their mobile, the rupees are deposited directly into your FamPay account.
            </div>
          </div>

          <div>
            <label className="text-xs font-arcade text-gray-300 block mb-1 flex items-center gap-1.5">
              <Key size={14} className="text-neon-cyan" /> YOUR FAMPAY UPI ID:
            </label>
            <input
              type="text"
              required
              value={fampayId}
              onChange={(e) => setFampayId(e.target.value)}
              placeholder="e.g. username@fam or 9876543210@fam"
              className="w-full bg-[#0d0d1e] border border-gray-700 focus:border-neon-cyan rounded-lg p-3 text-sm font-mono text-neon-cyan outline-none"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Find this in your FamPay / FamApp profile (e.g. <span className="text-gray-400">yourname@fam</span>).
            </p>
          </div>

          <div>
            <label className="text-xs font-arcade text-gray-300 block mb-1 flex items-center gap-1.5">
              <User size={14} className="text-neon-green" /> RECEIVER DISPLAY NAME:
            </label>
            <input
              type="text"
              required
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="e.g. Rashmi Retro Gaming"
              className="w-full bg-[#0d0d1e] border border-gray-700 focus:border-neon-green rounded-lg p-3 text-sm text-white outline-none"
            />
          </div>

          {/* Test Mode Switch */}
          <div className="bg-[#121226] border border-gray-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-arcade text-white block">TEST MODE (FREE DEMO)</span>
              <span className="text-[11px] text-gray-400">
                Allow visitors to test games without making real payments
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-green"></div>
            </label>
          </div>

          {/* Deployment info */}
          <div className="bg-[#0b0b18] border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400">
            <span className="text-neon-cyan font-bold block mb-1">🚀 For Permanent Online Hosting:</span>
            When you deploy online to Vercel/Netlify, you can also set your ID in <code className="text-white">src/config/fampayConfig.js</code> so it is default for all visitors!
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-arcade text-xs"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-neon-yellow hover:bg-neon-yellow/90 text-black font-arcade text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-neon-yellow"
            >
              {savedSuccess ? <Check size={16} /> : <Save size={16} />}
              {savedSuccess ? 'SAVED!' : 'SAVE SETTINGS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
