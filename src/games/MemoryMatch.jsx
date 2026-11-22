import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { RotateCcw, Timer, Award } from 'lucide-react';

const CARD_ICONS = ['👾', '🕹️', '👻', '🍄', '💎', '🪙', '⚔️', '🛡️'];

export default function MemoryMatch({ onExit, onWinReward }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]); // indices
  const [matched, setMatched] = useState([]); // indices
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(50);
  const [gameState, setGameState] = useState('READY'); // READY, PLAYING, WON, GAMEOVER

  const initGame = () => {
    const pairs = [...CARD_ICONS, ...CARD_ICONS];
    // Shuffle
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    setCards(pairs);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setTimeLeft(50);
    setGameState('PLAYING');
    sounds.playCoin();
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          sounds.playGameOver();
          setGameState('GAMEOVER');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  const handleCardClick = (idx) => {
    if (gameState !== 'PLAYING') return;
    if (flipped.includes(idx) || matched.includes(idx) || flipped.length >= 2) return;

    sounds.playClick();
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = newFlipped;
      if (cards[first] === cards[second]) {
        // MATCH!
        setTimeout(() => {
          sounds.playWin();
          const newMatched = [...matched, first, second];
          setMatched(newMatched);
          setFlipped([]);

          if (newMatched.length === cards.length) {
            confetti({ particleCount: 80, spread: 70 });
            setGameState('WON');
            if (onWinReward) onWinReward(20);
          }
        }, 300);
      } else {
        // Mismatch
        setTimeout(() => {
          sounds.playHit();
          setFlipped([]);
        }, 700);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 max-w-lg mx-auto">
      {/* Header */}
      <div className="w-full bg-arcade-card p-3 rounded-t-xl border-t-2 border-x-2 border-neon-green/40 flex items-center justify-between">
        <span className="font-arcade text-xs text-neon-green">🃏 RETRO MEMORY MATCH</span>
        <div className="flex items-center gap-3 text-xs font-arcade">
          <span className="text-neon-cyan flex items-center gap-1">
            <Timer size={13} /> {timeLeft}s
          </span>
          <span className="text-white">MOVES: {moves}</span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="w-full border-2 border-neon-green/40 bg-[#0d0d21] p-4 rounded-b-xl shadow-neon-green relative">
        <div className="grid grid-cols-4 gap-2.5">
          {cards.length > 0 ? (
            cards.map((icon, idx) => {
              const isFlipped = flipped.includes(idx) || matched.includes(idx);
              const isMatched = matched.includes(idx);

              return (
                <button
                  key={idx}
                  onClick={() => handleCardClick(idx)}
                  className={`aspect-square rounded-xl border-2 font-arcade text-2xl flex items-center justify-center transition-all duration-300 transform ${
                    isFlipped
                      ? isMatched
                        ? 'bg-neon-green/20 border-neon-green scale-95 shadow-neon-green'
                        : 'bg-arcade-card border-neon-cyan scale-100'
                      : 'bg-[#1a1a36] border-gray-700 hover:border-neon-green/60 active:scale-95'
                  }`}
                >
                  {isFlipped ? icon : <span className="text-gray-600 text-sm">?</span>}
                </button>
              );
            })
          ) : (
            <div className="col-span-4 py-16 text-center">
              <p className="text-gray-400 text-sm mb-4">Flip cards and match all 8 pairs before the clock runs out!</p>
              <button
                onClick={initGame}
                className="arcade-btn bg-neon-green text-black font-bold px-6 py-2.5 rounded shadow-neon-green"
              >
                START GAME
              </button>
            </div>
          )}
        </div>

        {/* Win / Loss Overlay */}
        {(gameState === 'WON' || gameState === 'GAMEOVER') && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center rounded-b-xl backdrop-blur-xs">
            {gameState === 'WON' ? (
              <>
                <h2 className="font-arcade text-xl text-neon-green mb-2">🎉 ALL MATCHED!</h2>
                <p className="font-arcade text-xs text-white mb-6">Completed in {moves} moves with {timeLeft}s left!</p>
              </>
            ) : (
              <>
                <h2 className="font-arcade text-xl text-neon-pink mb-2">TIME'S UP!</h2>
                <p className="font-arcade text-xs text-gray-300 mb-6">Found {matched.length / 2} pairs.</p>
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={initGame}
                className="arcade-btn bg-neon-green text-black px-4 py-2 rounded flex items-center gap-1.5"
              >
                <RotateCcw size={14} /> PLAY AGAIN
              </button>
              {onExit && (
                <button
                  onClick={onExit}
                  className="arcade-btn bg-gray-800 text-gray-200 px-4 py-2 rounded"
                >
                  EXIT
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
