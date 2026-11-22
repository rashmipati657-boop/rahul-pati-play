import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Flag, RotateCcw, Timer } from 'lucide-react';

const ROWS = 9;
const COLS = 9;
const TOTAL_MINES = 10;

export default function Minesweeper({ onExit, onWinReward }) {
  const [grid, setGrid] = useState([]);
  const [gameState, setGameState] = useState('READY'); // READY, PLAYING, WON, GAMEOVER
  const [flagMode, setFlagMode] = useState(false); // For mobile friendly flagging
  const [flagsLeft, setFlagsLeft] = useState(TOTAL_MINES);
  const [timer, setTimer] = useState(0);

  const initBoard = () => {
    // Generate mines
    const board = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({
        isMine: false,
        revealed: false,
        flagged: false,
        neighborCount: 0,
      }))
    );

    let minesPlaced = 0;
    while (minesPlaced < TOTAL_MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (!board[r][c].isMine) {
        board[r][c].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbors
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].isMine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isMine) {
              count++;
            }
          }
        }
        board[r][c].neighborCount = count;
      }
    }

    setGrid(board);
    setGameState('READY');
    setFlagsLeft(TOTAL_MINES);
    setTimer(0);
  };

  useEffect(() => {
    initBoard();
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  const revealCell = (r, c) => {
    if (gameState === 'WON' || gameState === 'GAMEOVER') return;
    if (grid[r][c].flagged || grid[r][c].revealed) return;

    if (gameState === 'READY') {
      setGameState('PLAYING');
    }

    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

    if (newGrid[r][c].isMine) {
      // Exploded! Reveal all mines
      sounds.playGameOver();
      for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
          if (newGrid[i][j].isMine) newGrid[i][j].revealed = true;
        }
      }
      setGrid(newGrid);
      setGameState('GAMEOVER');
      return;
    }

    // Flood fill algorithm
    const flood = (cr, cc) => {
      if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) return;
      if (newGrid[cr][cc].revealed || newGrid[cr][cc].flagged || newGrid[cr][cc].isMine) return;

      newGrid[cr][cc].revealed = true;
      if (newGrid[cr][cc].neighborCount === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr !== 0 || dc !== 0) flood(cr + dr, cc + dc);
          }
        }
      }
    };

    flood(r, c);
    sounds.playClick();

    // Check Win condition
    let unrevealedSafeCells = 0;
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        if (!newGrid[i][j].isMine && !newGrid[i][j].revealed) {
          unrevealedSafeCells++;
        }
      }
    }

    if (unrevealedSafeCells === 0) {
      sounds.playWin();
      confetti({ particleCount: 70, spread: 60 });
      setGameState('WON');
      if (onWinReward) onWinReward(50);
    }

    setGrid(newGrid);
  };

  const toggleFlag = (r, c, e) => {
    if (e) e.preventDefault();
    if (gameState === 'WON' || gameState === 'GAMEOVER') return;
    if (grid[r][c].revealed) return;

    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    const currentFlagged = newGrid[r][c].flagged;

    if (!currentFlagged && flagsLeft <= 0) return;

    newGrid[r][c].flagged = !currentFlagged;
    setFlagsLeft((prev) => (currentFlagged ? prev + 1 : prev - 1));
    sounds.playCoin();
    setGrid(newGrid);
  };

  const handleCellClick = (r, c) => {
    if (flagMode) {
      toggleFlag(r, c);
    } else {
      revealCell(r, c);
    }
  };

  const NUMBER_COLORS = [
    '',
    'text-blue-400',
    'text-green-400',
    'text-red-400',
    'text-purple-400',
    'text-amber-400',
    'text-teal-400',
    'text-pink-400',
    'text-white',
  ];

  return (
    <div className="flex flex-col items-center justify-center p-3 max-w-md mx-auto">
      {/* Retro Win95 Console Header */}
      <div className="w-full bg-[#1b1b36] border-4 border-[#30305a] rounded-t-xl p-3 flex items-center justify-between font-arcade text-xs">
        {/* Mine Count */}
        <div className="bg-black text-red-500 px-3 py-1.5 rounded border border-gray-700 text-sm">
          {flagsLeft.toString().padStart(3, '0')}
        </div>

        {/* Smiley Face Reset Button */}
        <button
          onClick={initBoard}
          className="w-10 h-10 bg-gray-700 active:scale-95 border-2 border-gray-500 rounded flex items-center justify-center text-xl shadow"
        >
          {gameState === 'WON' ? '😎' : gameState === 'GAMEOVER' ? '😵' : '🙂'}
        </button>

        {/* Timer */}
        <div className="bg-black text-red-500 px-3 py-1.5 rounded border border-gray-700 text-sm">
          {Math.min(999, timer).toString().padStart(3, '0')}
        </div>
      </div>

      {/* Grid Container */}
      <div className="w-full bg-[#121226] border-x-4 border-b-4 border-[#30305a] p-3 shadow-neon-pink">
        <div
          className="grid gap-1 w-full max-w-[320px] mx-auto aspect-square"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                onContextMenu={(e) => toggleFlag(r, c, e)}
                className={`w-full aspect-square text-xs font-bold font-arcade flex items-center justify-center rounded-xs transition-all ${
                  cell.revealed
                    ? cell.isMine
                      ? 'bg-red-600 border border-red-800'
                      : 'bg-[#0b0b1a] border border-gray-900'
                    : 'bg-[#2a2a4e] hover:bg-[#343460] border-t-2 border-l-2 border-white/20 border-b-2 border-r-2 border-black/40 shadow-xs'
                }`}
              >
                {cell.revealed ? (
                  cell.isMine ? (
                    '💣'
                  ) : cell.neighborCount > 0 ? (
                    <span className={NUMBER_COLORS[cell.neighborCount]}>
                      {cell.neighborCount}
                    </span>
                  ) : null
                ) : cell.flagged ? (
                  '🚩'
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Mobile Controls (Flag Mode Switch) */}
      <div className="w-full mt-3 flex items-center justify-between bg-arcade-card p-2.5 rounded-xl border border-gray-800">
        <div className="text-xs text-gray-400">
          💡 Click to open, Right-Click to flag
        </div>
        <button
          onClick={() => setFlagMode(!flagMode)}
          className={`px-3 py-2 rounded-lg text-xs font-arcade flex items-center gap-1.5 border transition-all ${
            flagMode
              ? 'bg-neon-pink text-white border-neon-pink shadow-neon-pink'
              : 'bg-gray-800 text-gray-300 border-gray-700'
          }`}
        >
          <Flag size={14} />
          {flagMode ? 'FLAGGING ON' : 'FLAG MODE'}
        </button>
      </div>

      {/* Win/Lose modal */}
      {(gameState === 'WON' || gameState === 'GAMEOVER') && (
        <div className="mt-3 text-center">
          <p className={`font-arcade text-xs mb-2 ${gameState === 'WON' ? 'text-neon-green' : 'text-neon-pink'}`}>
            {gameState === 'WON' ? '🎉 MINEFIELD CLEARED!' : '💥 BOOM! MINE DETONATED!'}
          </p>
          <button
            onClick={initBoard}
            className="arcade-btn bg-neon-cyan text-black px-4 py-1.5 text-xs rounded"
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
