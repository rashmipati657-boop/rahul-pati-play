import React, { useState } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Dices, RotateCcw, User, Bot, Sparkles } from 'lucide-react';

const SNAKES = {
  98: 28,
  95: 56,
  92: 51,
  83: 19,
  73: 1,
  69: 33,
  64: 36,
  59: 17,
  52: 11,
  48: 9,
};

const LADDERS = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
};

export default function SnakesAndLadders({ onExit, onWinReward }) {
  const [p1Pos, setP1Pos] = useState(1);
  const [p2Pos, setP2Pos] = useState(1);
  const [turn, setTurn] = useState(1); // 1 = Player 1, 2 = Player 2 / Bot
  const [isVsBot, setIsVsBot] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [diceVal, setDiceVal] = useState(1);
  const [winner, setWinner] = useState(null);
  const [gameLog, setGameLog] = useState(['Welcome to Retro Snakes & Ladders! Roll the dice to begin.']);

  const addLog = (msg) => {
    setGameLog((prev) => [msg, ...prev.slice(0, 4)]);
  };

  const handleRoll = () => {
    if (rolling || winner) return;

    setRolling(true);
    sounds.playDice();

    let rollCount = 0;
    const interval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      if (rollCount > 8) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setDiceVal(finalRoll);
        setRolling(false);
        applyMove(finalRoll, turn);
      }
    }, 60);
  };

  const applyMove = (steps, player) => {
    const currentPos = player === 1 ? p1Pos : p2Pos;
    let nextPos = currentPos + steps;

    if (nextPos > 100) {
      addLog(`🎲 ${player === 1 ? 'Player 1' : isVsBot ? 'Bot' : 'Player 2'} rolled ${steps} but needs exact roll to reach 100!`);
      switchTurn(player);
      return;
    }

    addLog(`🎲 ${player === 1 ? 'Player 1' : isVsBot ? 'Bot' : 'Player 2'} rolled a ${steps} -> moved to ${nextPos}`);

    // Check Ladder
    if (LADDERS[nextPos]) {
      const ladderEnd = LADDERS[nextPos];
      sounds.playCoin();
      addLog(`🪜 WOW! Ladder climbed from ${nextPos} ➔ ${ladderEnd}!`);
      nextPos = ladderEnd;
    }
    // Check Snake
    else if (SNAKES[nextPos]) {
      const snakeEnd = SNAKES[nextPos];
      sounds.playHit();
      addLog(`🐍 OUCH! Bitten by snake! Slid down from ${nextPos} ➔ ${snakeEnd}!`);
      nextPos = snakeEnd;
    }

    if (player === 1) {
      setP1Pos(nextPos);
      if (nextPos === 100) {
        sounds.playWin();
        confetti({ particleCount: 100, spread: 70 });
        setWinner('Player 1');
        if (onWinReward) onWinReward(50);
        return;
      }
      switchTurn(1);
    } else {
      setP2Pos(nextPos);
      if (nextPos === 100) {
        sounds.playGameOver();
        setWinner(isVsBot ? 'Bot' : 'Player 2');
        return;
      }
      switchTurn(2);
    }
  };

  const switchTurn = (currentTurn) => {
    const nextTurn = currentTurn === 1 ? 2 : 1;
    setTurn(nextTurn);

    if (nextTurn === 2 && isVsBot && !winner) {
      setTimeout(() => {
        botRoll();
      }, 900);
    }
  };

  const botRoll = () => {
    if (winner) return;
    setRolling(true);
    sounds.playDice();

    let rollCount = 0;
    const interval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      if (rollCount > 8) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setDiceVal(finalRoll);
        setRolling(false);
        applyMove(finalRoll, 2);
      }
    }, 60);
  };

  const resetGame = () => {
    setP1Pos(1);
    setP2Pos(1);
    setTurn(1);
    setWinner(null);
    setDiceVal(1);
    setGameLog(['New game started! Roll to begin.']);
    sounds.playClick();
  };

  // Generate 100-cell serpentine board
  // Row 9 (top): 100 to 91
  // Row 8: 81 to 90
  // ...
  // Row 0 (bottom): 1 to 10
  const renderBoard = () => {
    const rows = [];
    for (let r = 9; r >= 0; r--) {
      const cells = [];
      const isEvenRowFromBottom = r % 2 === 1;
      for (let c = 0; c < 10; c++) {
        let num;
        if (isEvenRowFromBottom) {
          num = (r * 10) + (10 - c);
        } else {
          num = (r * 10) + (c + 1);
        }

        const isSnakeHead = Boolean(SNAKES[num]);
        const isLadderBase = Boolean(LADDERS[num]);
        const hasP1 = p1Pos === num;
        const hasP2 = p2Pos === num;

        cells.push(
          <div
            key={num}
            className={`relative flex flex-col justify-between p-1 border border-arcade-border text-[10px] font-retro transition-all ${
              (r + c) % 2 === 0 ? 'bg-[#121226]' : 'bg-[#181832]'
            } ${hasP1 || hasP2 ? 'ring-2 ring-neon-green/80' : ''}`}
          >
            <div className="flex justify-between items-center w-full leading-none">
              <span className={`font-bold ${num === 100 ? 'text-neon-yellow' : 'text-gray-400'}`}>
                {num}
              </span>
              {isSnakeHead && <span className="text-red-500 text-xs" title={`Snake to ${SNAKES[num]}`}>🐍➔{SNAKES[num]}</span>}
              {isLadderBase && <span className="text-neon-green text-xs" title={`Ladder to ${LADDERS[num]}`}>🪜➔{LADDERS[num]}</span>}
            </div>

            {/* Tokens Container */}
            <div className="flex items-center justify-center gap-1 my-auto">
              {hasP1 && (
                <div
                  className="w-4 h-4 rounded-full bg-neon-green border border-white shadow-neon-green flex items-center justify-center text-[8px] font-bold text-black animate-bounce"
                  title="Player 1"
                >
                  P1
                </div>
              )}
              {hasP2 && (
                <div
                  className="w-4 h-4 rounded-full bg-neon-pink border border-white shadow-neon-pink flex items-center justify-center text-[8px] font-bold text-white animate-bounce"
                  title={isVsBot ? 'Bot' : 'Player 2'}
                >
                  {isVsBot ? 'AI' : 'P2'}
                </div>
              )}
            </div>
          </div>
        );
      }
      rows.push(
        <div key={r} className="grid grid-cols-10 gap-0.5 h-10 sm:h-12">
          {cells}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 max-w-2xl mx-auto">
      {/* Header Info */}
      <div className="w-full bg-arcade-card p-3 rounded-t-xl border-t-2 border-x-2 border-neon-pink/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-arcade text-xs text-neon-pink">🎲 SNAKES & LADDERS</span>
          <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">100 Tiles</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsVsBot(!isVsBot); resetGame(); }}
            className="text-xs px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 flex items-center gap-1 border border-gray-700"
          >
            {isVsBot ? <Bot size={13} className="text-neon-cyan" /> : <User size={13} className="text-neon-green" />}
            {isVsBot ? 'Vs Bot' : '2 Players'}
          </button>
          <button
            onClick={resetGame}
            className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
            title="Reset Game"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* 10x10 Board Area */}
      <div className="w-full border-2 border-neon-pink/40 bg-[#0c0c1b] p-1.5 shadow-neon-pink overflow-hidden">
        <div className="flex flex-col gap-0.5">
          {renderBoard()}
        </div>
      </div>

      {/* Control Deck & Dice */}
      <div className="w-full bg-arcade-card p-4 rounded-b-xl border-b-2 border-x-2 border-neon-pink/40 flex flex-col sm:flex-row items-center justify-between gap-4 mt-0.5">
        {/* Turn Status */}
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg border ${turn === 1 ? 'border-neon-green bg-neon-green/10' : 'border-gray-800 opacity-60'}`}>
            <div className="flex items-center gap-1.5 text-xs font-arcade text-neon-green">
              <User size={14} /> Player 1
            </div>
            <div className="text-xs text-gray-300 mt-1">Square: <span className="font-bold text-white">{p1Pos}</span> / 100</div>
          </div>

          <div className={`p-2 rounded-lg border ${turn === 2 ? 'border-neon-pink bg-neon-pink/10' : 'border-gray-800 opacity-60'}`}>
            <div className="flex items-center gap-1.5 text-xs font-arcade text-neon-pink">
              {isVsBot ? <Bot size={14} /> : <User size={14} />} {isVsBot ? 'CPU Bot' : 'Player 2'}
            </div>
            <div className="text-xs text-gray-300 mt-1">Square: <span className="font-bold text-white">{p2Pos}</span> / 100</div>
          </div>
        </div>

        {/* Dice Roller */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-neon-yellow/20 border-2 border-neon-yellow rounded-xl flex items-center justify-center font-arcade text-2xl text-neon-yellow shadow-neon-yellow">
            {diceVal}
          </div>

          <button
            onClick={handleRoll}
            disabled={rolling || (turn === 2 && isVsBot) || Boolean(winner)}
            className={`arcade-btn px-6 py-3 rounded-lg flex items-center gap-2 ${
              turn === 1
                ? 'bg-neon-green text-black hover:bg-neon-green/90 shadow-neon-green'
                : 'bg-neon-pink text-white hover:bg-neon-pink/90 shadow-neon-pink'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Dices size={18} />
            {rolling ? 'ROLLING...' : turn === 2 && isVsBot ? 'BOT TURN...' : 'ROLL DICE'}
          </button>
        </div>
      </div>

      {/* Live Game Logs */}
      <div className="w-full mt-2 bg-[#0d0d1e] p-2.5 rounded-lg border border-gray-800 text-xs font-mono text-gray-400">
        <div className="text-neon-cyan font-bold mb-1 flex items-center gap-1">
          <Sparkles size={12} /> GAME ACTION LOG:
        </div>
        {gameLog.map((log, i) => (
          <div key={i} className={i === 0 ? 'text-gray-200' : 'text-gray-500'}>
            {log}
          </div>
        ))}
      </div>

      {/* Winner Modal */}
      {winner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="arcade-box p-6 rounded-2xl max-w-sm w-full text-center border-2 border-neon-yellow">
            <h2 className="font-arcade text-xl text-neon-yellow mb-2">🎉 WINNER!</h2>
            <p className="font-arcade text-sm text-white mb-4">
              {winner} reached tile 100!
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={resetGame}
                className="arcade-btn bg-neon-green text-black px-4 py-2 rounded"
              >
                PLAY AGAIN
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
        </div>
      )}
    </div>
  );
}
