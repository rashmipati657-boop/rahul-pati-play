import React, { useState } from 'react';
import { exportDatabaseBackup, wipeDatabase, loadDatabase, saveDatabase } from '../utils/database';
import { sounds } from '../utils/audio';
import { X, ShieldCheck, Download, Trash2, Database, RefreshCw, Key, CheckCircle, FileText, AlertTriangle } from 'lucide-react';

export default function AdminControlPanel({ onClose, onDataReset, onCoinsAdjust }) {
  const [db, setDb] = useState(loadDatabase);
  const [wipeConfirm, setWipeConfirm] = useState(false);

  const totalInr = db.transactions.reduce((acc, t) => acc + (t.amountInr || 0), 0);

  const handleExport = () => {
    sounds.playCoin();
    exportDatabaseBackup();
  };

  const handleWipe = () => {
    sounds.playHit();
    wipeDatabase();
    setDb(loadDatabase());
    onDataReset();
    setWipeConfirm(false);
  };

  const handleAddCoins = (amount) => {
    sounds.playWin();
    const updated = { ...db };
    updated.playerState.coins = (updated.playerState.coins || 0) + amount;
    saveDatabase(updated);
    setDb(updated);
    onCoinsAdjust(updated.playerState.coins);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="arcade-box w-full max-w-2xl rounded-2xl overflow-hidden border-2 border-neon-green shadow-neon-green relative animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-[#101026] p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-arcade text-xs text-neon-green">RAHUL PATI PLAY MASTER CONTROL</h3>
              <p className="text-xs text-gray-400">Authenticated Owner: Rashmi Ranjan pati (rashmipati@fam)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg bg-gray-800 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5">
          {/* Status & Security Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#14142d] border border-gray-800 p-3 rounded-xl">
              <span className="text-[10px] text-gray-400 font-arcade block mb-1">RECEIVING FAMPAY ID</span>
              <span className="font-mono text-neon-cyan font-bold text-sm block">rashmipati@fam</span>
              <span className="text-[10px] text-neon-green flex items-center gap-1 mt-1">
                <CheckCircle size={10} /> Active & Verified
              </span>
            </div>

            <div className="bg-[#14142d] border border-gray-800 p-3 rounded-xl">
              <span className="text-[10px] text-gray-400 font-arcade block mb-1">TOTAL REVENUE LOGGED</span>
              <span className="font-arcade text-neon-yellow text-base block">₹{totalInr}</span>
              <span className="text-[10px] text-gray-400">Direct to FamPay</span>
            </div>

            <div className="bg-[#14142d] border border-gray-800 p-3 rounded-xl">
              <span className="text-[10px] text-gray-400 font-arcade block mb-1">ACTIVE COIN POOL</span>
              <span className="font-arcade text-white text-base block">{db.playerState.coins} Coins</span>
              <button
                onClick={() => handleAddCoins(50)}
                className="text-[10px] text-neon-cyan hover:underline mt-1"
              >
                + Add 50 Test Coins
              </button>
            </div>
          </div>

          {/* Database Control Actions */}
          <div className="bg-[#0e0e22] border border-gray-800 p-4 rounded-xl space-y-3">
            <h4 className="font-arcade text-xs text-white flex items-center gap-2">
              <Database size={15} className="text-neon-cyan" /> WEBSITE DATABASE MANAGEMENT
            </h4>
            <p className="text-xs text-gray-400">
              You have full ownership of this website. Your database is saved locally at <code className="text-neon-cyan">arcade_database.json</code> in your project folder. You can export a live backup copy or reset all state below.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-neon-cyan/20 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/30 text-xs font-arcade rounded-xl flex items-center gap-1.5"
              >
                <Download size={14} /> EXPORT DATABASE BACKUP (JSON)
              </button>

              {!wipeConfirm ? (
                <button
                  onClick={() => setWipeConfirm(true)}
                  className="px-4 py-2 bg-red-950/40 border border-red-500/50 text-red-400 hover:bg-red-900/40 text-xs font-arcade rounded-xl flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> RESET / WIPE WEBSITE DATA
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleWipe}
                    className="px-3 py-1.5 bg-red-600 text-white font-arcade text-xs rounded-lg"
                  >
                    CONFIRM WIPE ALL
                  </button>
                  <button
                    onClick={() => setWipeConfirm(false)}
                    className="px-3 py-1.5 bg-gray-800 text-gray-300 font-arcade text-xs rounded-lg"
                  >
                    CANCEL
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Payment Transactions Ledger */}
          <div className="bg-[#0e0e22] border border-gray-800 p-4 rounded-xl">
            <h4 className="font-arcade text-xs text-white mb-2 flex items-center gap-2">
              <FileText size={15} className="text-neon-yellow" /> LIVE TRANSACTIONS LEDGER
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1.5 font-mono text-xs">
              {db.transactions.map((t, idx) => (
                <div
                  key={idx}
                  className="bg-[#14142d] p-2 rounded-lg border border-gray-800 flex items-center justify-between text-[11px]"
                >
                  <div>
                    <span className="text-white font-bold">{t.gameTitle || t.note}</span>
                    <span className="text-gray-500 block text-[10px]">{new Date(t.date).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-neon-green font-bold">₹{t.amountInr || t.amount || 0}</span>
                    <span className="text-[10px] text-gray-400 block font-mono">{t.utr}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#090914] p-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
          <span>Security Protocol: Direct NPCI VPA Transfer • 0 Middlemen</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded font-arcade text-xs"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
