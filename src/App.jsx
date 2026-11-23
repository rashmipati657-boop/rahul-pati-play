import React, { useState, useEffect } from 'react';
import { GAMES_CATALOG } from './config/fampayConfig';
import { sounds } from './utils/audio';
import { loadDatabase, saveDatabase, addWinCoins, isGameUnlocked, unlockGamePermanently, consumeGameSession, resetAllUnlockedGames } from './utils/database';
import confetti from 'canvas-confetti';

// Games
import CyberRacer from './games/CyberRacer';
import StickyRunner from './games/StickyRunner';
import SnakesAndLadders from './games/SnakesAndLadders';
import ClassicSnake from './games/ClassicSnake';
import PongDuel from './games/PongDuel';
import BrickBreaker from './games/BrickBreaker';
import SpaceInvaders from './games/SpaceInvaders';
import FlappyStick from './games/FlappyStick';
import MemoryMatch from './games/MemoryMatch';
import Minesweeper from './games/Minesweeper';
import TicTacToe from './games/TicTacToe';

// Components
import PaymentModal from './components/PaymentModal';
import WalletModal from './components/WalletModal';
import ArcadeShopModal from './components/ArcadeShopModal';
import AdminControlPanel from './components/AdminControlPanel';
import FinancialAnalyticsDashboard from './components/FinancialAnalyticsDashboard';

// Icons
import {
  Gamepad2,
  Coins,
  Volume2,
  VolumeX,
  Lock,
  Play,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Smartphone,
  Flame,
  Award,
  ShoppingBag,
  Shield,
  Key,
  TrendingUp,
  CheckCircle2,
  X
} from 'lucide-react';

export default function App() {
  const [db, setDb] = useState(loadDatabase);
  const [activeGameId, setActiveGameId] = useState(null);
  const [payingGame, setPayingGame] = useState(null);
  const [showWallet, setShowWallet] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [winBanner, setWinBanner] = useState(null);

  // Private Owner Security (Restricted to Rahul Pati)
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(() => {
    try {
      return localStorage.getItem('rpp_owner_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [showOwnerLogin, setShowOwnerLogin] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [ownerPinError, setOwnerPinError] = useState('');

  // Check secret URL param (?owner=true or #owner) to open Owner Login
  useEffect(() => {
    if (window.location.search.includes('owner') || window.location.hash === '#owner') {
      setShowOwnerLogin(true);
    }
  }, []);

  // Sync state with database
  const tokens = db.playerState?.coins ?? 20;
  const unlockedGames = db.playerState?.unlockedGames ?? [];
  const unlockedShopItems = db.playerState?.unlockedShopItems ?? ['char-stick', 'sound-classic', 'badge-rookie'];
  const activeItems = db.playerState?.equipped ?? {
    Characters: 'char-stick',
    Instruments: 'sound-classic',
    Labels: 'badge-rookie',
  };

  // Sync unlocked games with backend server on startup
  useEffect(() => {
    fetch('/api/check-unlocked')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.unlockedGames) && data.unlockedGames.length > 0) {
          data.unlockedGames.forEach((id) => unlockGamePermanently(id));
          setDb(loadDatabase());
        }
      })
      .catch(() => {});
  }, []);

  // Listen for storage events (e.g. across multiple tabs or popups)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'arcade_master_database' || e.key === 'rpp_all_unlocked_games') {
        setDb(loadDatabase());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Safely exit game and consume single entry ticket (VIP passes remain permanently unlocked)
  const handleExitGame = () => {
    sounds.playClick();
    if (activeGameId) {
      const updatedDb = consumeGameSession(activeGameId);
      setDb(updatedDb);
    }
    setActiveGameId(null);
  };

  // Handle mobile / browser hardware back button
  useEffect(() => {
    const handlePopState = () => {
      if (activeGameId) {
        const updatedDb = consumeGameSession(activeGameId);
        setDb(updatedDb);
      }
      setActiveGameId(null);
      setPayingGame(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeGameId]);

  // Push history state whenever a game launches so back button returns safely to arcade
  useEffect(() => {
    if (activeGameId) {
      window.history.pushState({ game: activeGameId }, '', `#game-${activeGameId}`);
    }
  }, [activeGameId]);

  const handleSoundToggle = () => {
    const state = sounds.toggleSound();
    setSoundEnabled(state);
  };

  const handleGameSelect = (game) => {
    sounds.playClick();
    // Check if permanently unlocked across all layers
    if (isGameUnlocked(game.id, game.title, db)) {
      setActiveGameId(game.id);
    } else {
      setPayingGame(game);
    }
  };

  const handlePaymentSuccess = (gameId, amount) => {
    setPayingGame(null);
    const game = GAMES_CATALOG.find((g) => g.id === gameId);
    const updatedDb = unlockGamePermanently(gameId, game?.title || '');
    setDb(updatedDb);
    setActiveGameId(gameId);
  };

  const handleRechargeSuccess = (addedTokens) => {
    const updatedDb = loadDatabase();
    updatedDb.playerState.coins = (updatedDb.playerState.coins || 0) + addedTokens;
    saveDatabase(updatedDb);
    setDb(updatedDb);
  };

  const handleUnlockAllSuccess = () => {
    const updatedDb = unlockGamePermanently('all', 'all');
    GAMES_CATALOG.forEach((g) => unlockGamePermanently(g.id, g.title));
    setDb(loadDatabase());
  };

  // When a player wins any game
  const handleWinReward = (rewardCoins) => {
    const newTotal = addWinCoins(rewardCoins);
    const updatedDb = loadDatabase();
    setDb(updatedDb);

    sounds.playWin();
    confetti({ particleCount: 70, spread: 60 });
    setWinBanner(`🎉 YOU WON! +${rewardCoins} COINS ADDED TO YOUR VAULT!`);
    setTimeout(() => setWinBanner(null), 4000);
  };

  // Shop purchase item
  const handleUnlockShopItem = (itemId, cost) => {
    const updatedDb = loadDatabase();
    updatedDb.playerState.coins = Math.max(0, (updatedDb.playerState.coins || 0) - cost);
    if (!updatedDb.playerState.unlockedShopItems.includes(itemId)) {
      updatedDb.playerState.unlockedShopItems.push(itemId);
    }
    saveDatabase(updatedDb);
    setDb(updatedDb);
  };

  // Shop equip item
  const handleEquipShopItem = (category, itemId) => {
    const updatedDb = loadDatabase();
    updatedDb.playerState.equipped[category] = itemId;
    saveDatabase(updatedDb);
    setDb(updatedDb);
  };

  const renderActiveGame = () => {
    const game = GAMES_CATALOG.find((g) => g.id === activeGameId);
    if (!game) return null;

    return (
      <div className="min-h-screen bg-[#070714] flex flex-col">
        {/* Game Top Navigation */}
        <div className="bg-[#101026] border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <button
            onClick={handleExitGame}
            className="flex items-center gap-2 text-xs font-arcade text-gray-300 hover:text-neon-cyan transition-all bg-gray-800/80 hover:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700"
          >
            <ArrowLeft size={16} /> BACK TO ARCADE
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">{game.icon}</span>
            <span className="font-arcade text-xs text-white hidden sm:inline">{game.title}</span>
            <span className="text-[10px] bg-neon-green/20 text-neon-green px-2 py-0.5 rounded font-arcade">
              Win Prize: +{game.winRewardCoins} Coins
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSoundToggle}
              className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <div className="flex items-center gap-1.5 bg-[#171738] border border-neon-yellow/30 px-3 py-1 rounded-lg">
              <Coins size={14} className="text-neon-yellow" />
              <span className="text-xs font-arcade text-neon-yellow">{tokens}</span>
            </div>
          </div>
        </div>

        {/* Win Alert Banner */}
        {winBanner && (
          <div className="bg-neon-green text-black font-arcade text-xs py-2 px-4 text-center font-bold animate-bounce shadow-neon-green">
            {winBanner}
          </div>
        )}

        {/* Game Canvas Container */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-6">
          {activeGameId === 'cyber-racer' && (
            <CyberRacer onExit={handleExitGame} onWinReward={handleWinReward} />
          )}
          {activeGameId === 'sticky-run' && (
            <StickyRunner onExit={handleExitGame} onWinReward={handleWinReward} />
          )}
          {activeGameId === 'snakes-ladders' && (
            <SnakesAndLadders onExit={handleExitGame} onWinReward={handleWinReward} />
          )}
          {activeGameId === 'classic-snake' && (
            <ClassicSnake onExit={handleExitGame} onWinReward={handleWinReward} />
          )}
          {activeGameId === 'pong-1d' && (
            <PongDuel onExit={handleExitGame} onWinReward={handleWinReward} />
          )}
          {activeGameId === 'brick-breaker' && (
            <BrickBreaker onExit={handleExitGame} onWinReward={handleWinReward} />
          )}
          {activeGameId === 'space-invaders' && (
            <SpaceInvaders onExit={handleExitGame} onWinReward={handleWinReward} />
          )}
          {activeGameId === 'flappy-stick' && (
            <FlappyStick onExit={handleExitGame} onWinReward={handleWinReward} />
          )}
          {activeGameId === 'memory-match' && (
            <MemoryMatch onExit={handleExitGame} onWinReward={handleWinReward} />
          )}
          {activeGameId === 'minesweeper' && (
            <Minesweeper onExit={handleExitGame} onWinReward={handleWinReward} />
          )}
          {activeGameId === 'tic-tac-toe' && (
            <TicTacToe onExit={handleExitGame} onWinReward={handleWinReward} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#070712] text-gray-100 flex flex-col relative crt-overlay">
      {activeGameId ? (
        renderActiveGame()
      ) : (
        <>
          {/* Top Navbar */}
          <header className="sticky top-0 z-40 bg-[#0e0e24]/95 backdrop-blur-md border-b border-neon-cyan/30 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              {/* Brand Logo */}
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-neon-cyan/20 border-2 border-neon-cyan flex items-center justify-center text-neon-cyan shadow-neon-cyan">
                  <Gamepad2 size={22} />
                </div>
                <div>
                  <h1 className="font-arcade text-sm sm:text-base text-white tracking-wider flex items-center gap-2">
                    RAHUL PATI <span className="text-neon-cyan">PLAY</span>
                  </h1>
                  <span className="text-[10px] text-gray-400 block font-mono">
                    ⚡ Official FamPay UPI Payouts: <span className="text-neon-green">rashmipati@fam</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Audio toggle */}
                <button
                  onClick={handleSoundToggle}
                  className="p-2 rounded-lg bg-[#181836] hover:bg-[#222248] border border-gray-700 text-gray-300"
                  title="Toggle Sound Effects"
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                {/* Money Path & Analytics: RESTRICTED TO RAHUL PATI (OWNER ONLY) */}
                {isOwnerUnlocked && (
                  <div className="flex items-center gap-1.5 bg-neon-green/20 border border-neon-green/60 px-2.5 py-1.5 rounded-lg shadow-neon-green animate-in fade-in">
                    <button
                      onClick={() => { sounds.playClick(); setShowAnalytics(true); }}
                      className="flex items-center gap-1.5 text-neon-green text-xs font-arcade font-bold"
                      title="Owner Private Money Tracker"
                    >
                      <TrendingUp size={14} />
                      <span className="hidden md:inline">👑 OWNER MONEY TRACKER</span>
                      <span className="md:hidden">👑 TRACKER</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsOwnerUnlocked(false);
                        localStorage.removeItem('rpp_owner_mode');
                        sounds.playClick();
                      }}
                      title="Lock Owner Mode and Hide from public"
                      className="text-gray-400 hover:text-white p-0.5 rounded transition-all"
                    >
                      <Lock size={12} />
                    </button>
                  </div>
                )}

                {/* Rewards Vault & Shop */}
                <button
                  onClick={() => { sounds.playClick(); setShowShop(true); }}
                  className="flex items-center gap-1.5 bg-neon-cyan/15 hover:bg-neon-cyan/25 border border-neon-cyan/50 text-neon-cyan px-3 py-1.5 rounded-lg text-xs font-arcade transition-all"
                >
                  <ShoppingBag size={14} />
                  <span className="hidden sm:inline">SHOP VAULT</span>
                </button>

                {/* Coins Wallet */}
                <button
                  onClick={() => { sounds.playClick(); setShowWallet(true); }}
                  className="flex items-center gap-1.5 bg-[#181836] hover:bg-[#23234d] border border-neon-yellow/40 hover:border-neon-yellow px-3 py-1.5 rounded-lg text-xs font-arcade text-neon-yellow shadow-xs transition-all"
                >
                  <Coins size={15} />
                  <span>{tokens}</span>
                  <span className="hidden sm:inline text-[10px] text-gray-400">Coins</span>
                </button>
              </div>
            </div>
          </header>

          {/* Win Alert Banner if any */}
          {winBanner && (
            <div className="bg-neon-green text-black font-arcade text-xs py-2 px-4 text-center font-bold animate-bounce shadow-neon-green">
              {winBanner}
            </div>
          )}

          {/* Hero Banner */}
          <section className="relative overflow-hidden px-4 py-8 sm:py-12 bg-radial from-[#18183e] to-[#080814] border-b border-gray-800 text-center">
            <div className="max-w-4xl mx-auto relative z-10">
              <div className="inline-flex items-center gap-2 bg-neon-green/15 border border-neon-green/40 px-3 py-1 rounded-full text-xs font-arcade text-neon-green mb-4">
                <ShieldCheck size={14} /> DIRECT FAMPAY ACCOUNT INTEGRATED
              </div>
              <h2 className="font-arcade text-xl sm:text-3xl text-white mb-3 leading-snug">
                RAHUL PATI PLAY
              </h2>
              <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto mb-5">
                Play 10 iconic retro & 1D games on Rahul Pati Play — Sticky Ninja, 100-Tile Snakes & Ladders, Nokia Snake, 1D Pong, Space Defender & more! 
                Unlock games for ₹10 - ₹25 directly sent to <span className="text-neon-cyan font-bold font-mono">rashmipati@fam</span>.
              </p>

              {/* Progress & Coin System Info */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-300">
                <div className="bg-[#14142d] border border-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Coins size={14} className="text-neon-yellow" /> Start with 20 Free Coins
                </div>
                <div className="bg-[#14142d] border border-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Sparkles size={14} className="text-neon-green" /> Win Games to Earn +20 / +50 Coins
                </div>
                <div className="bg-[#14142d] border border-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-neon-cyan" /> Unlock Skins, Sounds & Labels
                </div>
              </div>
            </div>
          </section>

          {/* Main Games Grid */}
          <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12 flex-1 w-full">
            {/* Special ₹2 Trust Builder Spotlight Banner */}
            {(() => {
              const isRacerUnlocked = isGameUnlocked('cyber-racer', 'Cyber Highway Racer', db);
              return (
                <div
                  className={`mb-6 p-4 rounded-2xl bg-linear-to-r ${
                    isRacerUnlocked
                      ? 'from-neon-green/20 via-[#1a1a36] to-neon-cyan/20 border-2 border-neon-green shadow-neon-green'
                      : 'from-neon-yellow/20 via-[#1a1a36] to-neon-cyan/20 border-2 border-neon-yellow shadow-neon-yellow'
                  } flex flex-col md:flex-row items-center justify-between gap-4`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-4xl animate-bounce">🏎️</span>
                    <div>
                      <div
                        className={`inline-flex items-center gap-1.5 ${
                          isRacerUnlocked ? 'bg-neon-green text-black' : 'bg-neon-yellow text-black'
                        } font-arcade text-[10px] px-2.5 py-0.5 rounded-full font-bold mb-1`}
                      >
                        {isRacerUnlocked ? '✓ UNLOCKED & READY TO PLAY' : '⭐ ₹2 FLAGSHIP TRIAL GAME'}
                      </div>
                      <h3 className="font-arcade text-sm sm:text-base text-white">
                        CYBER HIGHWAY RACER {isRacerUnlocked ? '— UNLOCKED FOREVER!' : '— ONLY ₹2 TO PLAY!'}
                      </h3>
                      <p className="text-xs text-gray-300">
                        {isRacerUnlocked
                          ? 'You have successfully paid for this game! Click below to race anytime without paying again.'
                          : 'Try our best game for just ₹2 to test the scanner and experience Rahul Pati Play quality.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      if (isRacerUnlocked) {
                        setActiveGameId('cyber-racer');
                      } else {
                        handleGameSelect(GAMES_CATALOG[0]);
                      }
                    }}
                    className={`w-full md:w-auto px-6 py-2.5 ${
                      isRacerUnlocked
                        ? 'bg-neon-green text-black hover:bg-neon-green/90 shadow-neon-green'
                        : 'bg-neon-yellow text-black hover:brightness-110 shadow-neon-yellow'
                    } font-arcade text-xs font-bold rounded-xl shrink-0 flex items-center justify-center gap-2 transition-all`}
                  >
                    <Play size={14} fill="currentColor" /> {isRacerUnlocked ? 'PLAY NOW (UNLOCKED)' : 'PLAY FOR ₹2'}
                  </button>
                </div>
              );
            })()}

            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-arcade text-sm sm:text-lg text-white flex items-center gap-2">
                  <Flame className="text-neon-pink" size={18} /> ARCADE GAMES CATALOG (11 GAMES)
                </h3>
                <p className="text-xs text-gray-400">Win games to earn coins & unlock exclusive items</p>
              </div>

              {/* VIP Pass Shortcut */}
              <button
                onClick={() => { sounds.playCoin(); setShowWallet(true); }}
                className="hidden sm:flex items-center gap-1.5 bg-linear-to-r from-neon-pink/20 to-neon-purple/20 border border-neon-pink text-white px-3 py-2 rounded-xl text-xs font-arcade hover:scale-105 transition-all shadow-neon-pink"
              >
                <Award size={14} className="text-neon-yellow" /> UNLOCK ALL (VIP PASS)
              </button>
            </div>

            {/* Grid of 11 Games */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {GAMES_CATALOG.map((game) => {
                const isUnlocked = isGameUnlocked(game.id, game.title, db);

                return (
                  <div
                    key={game.id}
                    className="arcade-box rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-200 hover:-translate-y-1"
                    style={{ borderColor: isUnlocked ? game.accentColor : undefined }}
                  >
                    {/* Game Card Header */}
                    <div className="p-4 pb-2">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-4xl p-2.5 rounded-2xl bg-[#1a1a36] border border-gray-700 group-hover:scale-110 transition-transform">
                          {game.icon}
                        </div>
                        <div className="text-right">
                          <span
                            className="text-[10px] font-arcade px-2 py-0.5 rounded-full inline-block"
                            style={{
                              backgroundColor: `${game.accentColor}25`,
                              color: game.accentColor,
                              border: `1px solid ${game.accentColor}60`,
                            }}
                          >
                            {game.badge}
                          </span>
                          <span className="text-[11px] text-gray-400 block mt-1">
                            +{game.winRewardCoins} Coins on Win
                          </span>
                        </div>
                      </div>

                      <h4 className="font-arcade text-xs text-white mb-1.5 group-hover:text-neon-cyan transition-colors">
                        {game.title}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {game.description}
                      </p>
                    </div>

                    {/* Price and Action Footer */}
                    <div className="p-4 pt-3 border-t border-gray-800/80 bg-[#0d0d1e] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-500 block">Entry Price</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-arcade text-sm text-neon-green">
                            ₹{game.priceInr}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            (${game.priceUsd})
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleGameSelect(game)}
                        className={`px-4 py-2 rounded-xl font-arcade text-xs flex items-center gap-1.5 transition-all ${
                          isUnlocked
                            ? 'bg-neon-green text-black hover:bg-neon-green/90 shadow-neon-green font-bold'
                            : 'bg-[#1e1e40] hover:bg-[#282855] text-white border border-gray-700'
                        }`}
                      >
                        {isUnlocked ? (
                          <>
                            <Play size={14} fill="currentColor" /> PLAY
                          </>
                        ) : (
                          <>
                            <Lock size={13} className="text-neon-yellow" /> UNLOCK
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

          {/* Footer — Clean Player View with Hidden Owner Portal */}
          <footer className="bg-[#06060e] border-t border-gray-900 px-4 py-6 text-center text-xs text-gray-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="font-mono">
                🎮 Rahul Pati Play &copy; {new Date().getFullYear()} — Powered by Official FamPay P2P UPI
              </div>
              <div className="flex items-center gap-4 font-mono text-gray-400">
                <button onClick={() => setShowShop(true)} className="hover:text-neon-cyan text-xs">
                  Rewards Vault
                </button>
                <span>•</span>
                <button
                  onClick={() => setShowOwnerLogin(true)}
                  className="hover:text-neon-yellow flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-300 transition-colors"
                  title="Owner Access Restricted to Rahul Pati"
                >
                  <Lock size={11} /> {isOwnerUnlocked ? '👑 Owner Mode Active' : 'Owner Portal'}
                </button>
              </div>
            </div>
          </footer>

          {/* Payment Modal */}
          {payingGame && (
            <PaymentModal
              game={payingGame}
              onClose={() => setPayingGame(null)}
              onSuccess={handlePaymentSuccess}
            />
          )}

          {/* Wallet / Recharge Modal */}
          {showWallet && (
            <WalletModal
              tokens={tokens}
              onClose={() => setShowWallet(false)}
              onRechargeSuccess={handleRechargeSuccess}
              onUnlockAllSuccess={handleUnlockAllSuccess}
            />
          )}

          {/* Arcade Shop Vault */}
          {showShop && (
            <ArcadeShopModal
              tokens={tokens}
              unlockedShopItems={unlockedShopItems}
              activeItems={activeItems}
              onUnlockItem={handleUnlockShopItem}
              onEquipItem={handleEquipShopItem}
              onClose={() => setShowShop(false)}
            />
          )}

          {/* Owner Master Control & Database Panel */}
          {showAdmin && isOwnerUnlocked && (
            <AdminControlPanel
              onClose={() => setShowAdmin(false)}
              onDataReset={() => setDb(loadDatabase())}
              onCoinsAdjust={(c) => {
                const u = loadDatabase();
                setDb(u);
              }}
            />
          )}

          {/* Revenue & Money Path Analytics Dashboard (Restricted to Owner) */}
          {showAnalytics && isOwnerUnlocked && (
            <FinancialAnalyticsDashboard
              onClose={() => setShowAnalytics(false)}
              onLogout={() => {
                setIsOwnerUnlocked(false);
                localStorage.removeItem('rpp_owner_mode');
                setShowAnalytics(false);
                sounds.playClick();
              }}
            />
          )}

          {/* Private Owner PIN Login Modal */}
          {showOwnerLogin && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="arcade-box w-full max-w-sm rounded-2xl overflow-hidden border-2 border-neon-cyan shadow-neon-cyan p-5 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
                  <div className="flex items-center gap-2 text-white font-arcade text-xs">
                    <ShieldCheck size={18} className="text-neon-cyan" /> RAHUL PATI OWNER ACCESS
                  </div>
                  <button
                    onClick={() => {
                      setShowOwnerLogin(false);
                      setOwnerPinError('');
                    }}
                    className="p-1 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="text-xs text-gray-300 mb-3">
                  Enter your private Owner PIN to view the Money Tracker, bank ledger, and real customer payments:
                </p>

                <input
                  type="password"
                  placeholder="Enter Owner PIN (Default: 7788)"
                  value={ownerPinInput}
                  onChange={(e) => {
                    setOwnerPinInput(e.target.value);
                    setOwnerPinError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (ownerPinInput.trim() === '7788' || ownerPinInput.trim() === '2026') {
                        setIsOwnerUnlocked(true);
                        localStorage.setItem('rpp_owner_mode', 'true');
                        setShowOwnerLogin(false);
                        setShowAnalytics(true);
                        setOwnerPinInput('');
                        sounds.playCoin();
                      } else {
                        setOwnerPinError('Incorrect PIN. Money Tracker is restricted to Rahul Pati only.');
                        sounds.playHit();
                      }
                    }
                  }}
                  className="w-full bg-[#0e0e1e] border border-gray-700 rounded-lg p-2.5 text-center text-sm font-mono text-white mb-2 focus:border-neon-cyan outline-none tracking-widest"
                  autoFocus
                />

                {ownerPinError && (
                  <p className="text-red-400 text-xs mb-3 text-center">{ownerPinError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowOwnerLogin(false)}
                    className="flex-1 py-2 bg-gray-800 text-gray-300 font-arcade text-xs rounded-xl hover:bg-gray-700"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => {
                      if (ownerPinInput.trim() === '7788' || ownerPinInput.trim() === '2026') {
                        setIsOwnerUnlocked(true);
                        localStorage.setItem('rpp_owner_mode', 'true');
                        setShowOwnerLogin(false);
                        setShowAnalytics(true);
                        setOwnerPinInput('');
                        sounds.playCoin();
                      } else {
                        setOwnerPinError('Incorrect PIN. Money Tracker is restricted to Rahul Pati only.');
                        sounds.playHit();
                      }
                    }}
                    className="flex-1 py-2 bg-neon-cyan text-black font-arcade text-xs font-bold rounded-xl shadow-neon-cyan hover:brightness-110"
                  >
                    UNLOCK TRACKER
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
