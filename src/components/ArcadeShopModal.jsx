import React, { useState } from 'react';
import { SHOP_ITEMS } from '../config/fampayConfig';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { X, ShoppingBag, Check, Lock, Sparkles, Coins, Award } from 'lucide-react';

export default function ArcadeShopModal({
  tokens,
  unlockedShopItems,
  activeItems,
  onUnlockItem,
  onEquipItem,
  onClose,
}) {
  const [selectedCategory, setSelectedCategory] = useState('Characters');
  const categories = ['Characters', 'Instruments', 'Labels'];

  const filteredItems = SHOP_ITEMS.filter((item) => item.category === selectedCategory);

  const handleBuy = (item) => {
    if (unlockedShopItems.includes(item.id) || item.cost === 0) {
      // Already owned, equip it
      onEquipItem(item.category, item.id);
      sounds.playClick();
      return;
    }

    if (tokens < item.cost) {
      sounds.playHit();
      alert(`You need ${item.cost} coins to unlock this! Win games to earn +20 or +50 coins.`);
      return;
    }

    // Purchase
    sounds.playWin();
    confetti({ particleCount: 60, spread: 60 });
    onUnlockItem(item.id, item.cost);
    onEquipItem(item.category, item.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="arcade-box w-full max-w-xl rounded-2xl overflow-hidden border-2 border-neon-cyan shadow-neon-cyan relative animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-[#12122b] p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neon-cyan/20 text-neon-cyan border border-neon-cyan">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="font-arcade text-xs text-white">REWARDS VAULT & ARCADE SHOP</h3>
              <p className="text-xs text-gray-400">Unlock Characters, Instruments & Game Labels</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Coin Balance */}
            <div className="flex items-center gap-1.5 bg-[#1b1b3a] border border-neon-yellow/40 px-3 py-1.5 rounded-xl font-arcade text-xs text-neon-yellow shadow-neon-yellow">
              <Coins size={14} />
              <span>{tokens}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="bg-[#0e0e22] px-4 pt-3 flex gap-2 border-b border-gray-800">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); sounds.playClick(); }}
              className={`pb-2.5 px-3 text-xs font-arcade transition-all border-b-2 ${
                selectedCategory === cat
                  ? 'border-neon-cyan text-neon-cyan font-bold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {cat === 'Characters' && '🏃‍♂️ CHARACTERS'}
              {cat === 'Instruments' && '🎹 INSTRUMENTS'}
              {cat === 'Labels' && '🎖️ LABELS & BADGES'}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const isOwned = item.cost === 0 || unlockedShopItems.includes(item.id);
              const isEquipped = activeItems[item.category] === item.id;
              const canAfford = tokens >= item.cost;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isEquipped
                      ? 'bg-neon-cyan/15 border-neon-cyan shadow-neon-cyan'
                      : isOwned
                      ? 'bg-[#15152e] border-neon-green/40'
                      : 'bg-[#101024] border-gray-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl p-2 rounded-xl bg-[#1b1b36] border border-gray-700">
                        {item.icon}
                      </span>
                      {isEquipped ? (
                        <span className="text-[10px] font-arcade bg-neon-cyan/20 text-neon-cyan border border-neon-cyan px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={10} /> ACTIVE
                        </span>
                      ) : isOwned ? (
                        <span className="text-[10px] font-arcade bg-neon-green/20 text-neon-green px-2 py-0.5 rounded-full">
                          OWNED
                        </span>
                      ) : (
                        <span className="text-xs font-arcade text-neon-yellow flex items-center gap-1">
                          <Coins size={12} /> {item.cost}
                        </span>
                      )}
                    </div>

                    <h4 className="font-arcade text-xs text-white mb-1">{item.name}</h4>
                    <p className="text-[11px] text-gray-400 mb-3">{item.description}</p>
                  </div>

                  <button
                    onClick={() => handleBuy(item)}
                    className={`w-full py-2 rounded-lg font-arcade text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                      isEquipped
                        ? 'bg-neon-cyan text-black font-bold'
                        : isOwned
                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                        : canAfford
                        ? 'bg-neon-yellow text-black hover:bg-neon-yellow/90 font-bold shadow-neon-yellow'
                        : 'bg-gray-800/60 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isEquipped ? (
                      'EQUIPPED'
                    ) : isOwned ? (
                      'EQUIP NOW'
                    ) : (
                      <>
                        <Lock size={12} /> UNLOCK ({item.cost} COINS)
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-[#0b0b18] p-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-neon-yellow" />
            Win games to earn <strong className="text-neon-green">+20</strong> or <strong className="text-neon-pink">+50</strong> coins!
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-arcade text-[10px]"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
