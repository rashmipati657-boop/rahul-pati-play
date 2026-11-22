import React, { useState } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { RotateCcw, User, Bot } from 'lucide-react';

export default function TicTacToe({ onExit, onWinReward }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [isVsAi, setIsVsAi] = useState(true);
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [draws, setDraws] = useState(0);

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6],             // Diagonals
    ];
    for (let [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: [a, b, c] };
      }
    }
    if (squares.every((sq) => sq !== null)) {
      return { winner: 'DRAW', line: [] };
    }
    return null;
  };

  const winInfo = calculateWinner(board);

  // Minimax / Smart AI move
  const getAiMove = (currentBoard) => {
    // 1. Try to win
    for (let i = 0; i < 9; i++) {
      if (!currentBoard[i]) {
        const copy = [...currentBoard];
        copy[i] = 'O';
        if (calculateWinner(copy)?.winner === 'O') return i;
      }
    }
    // 2. Try to block player
    for (let i = 0; i < 9; i++) {
      if (!currentBoard[i]) {
        const copy = [...currentBoard];
        copy[i] = 'X';
        if (calculateWinner(copy)?.winner === 'X') return i;
      }
    }
    // 3. Take center
    if (!currentBoard[4]) return 4;
    // 4. Take corners
    const corners = [0, 2, 6, 8].filter((i) => !currentBoard[i]);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
    // 5. Random empty
    const available = currentBoard.map((v, i) => (v === null ? i : null)).filter((v) => v !== null);
    return available[Math.floor(Math.random() * available.length)];
  };

  const handleClick = (idx) => {
    if (board[idx] || winInfo) return;

    sounds.playClick();
    const nextBoard = [...board];
    nextBoard[idx] = isXNext ? 'X' : 'O';
    setBoard(nextBoard);

    const winResult = calculateWinner(nextBoard);
    if (winResult) {
      handleMatchEnd(winResult.winner);
      return;
    }

    if (isVsAi && isXNext) {
      // AI's Turn
      setIsXNext(false);
      setTimeout(() => {
        const aiIdx = getAiMove(nextBoard);
        if (aiIdx !== undefined) {
          nextBoard[aiIdx] = 'O';
          setBoard([...nextBoard]);
          sounds.playLaser();
          const aiWin = calculateWinner(nextBoard);
          if (aiWin) {
            handleMatchEnd(aiWin.winner);
          } else {
            setIsXNext(true);
          }
        }
      }, 400);
    } else {
      setIsXNext(!isXNext);
    }
  };

  const handleMatchEnd = (winner) => {
    if (winner === 'X') {
      sounds.playWin();
      confetti({ particleCount: 70, spread: 60 });
      setP1Wins((w) => w + 1);
      if (onWinReward) onWinReward(20);
    } else if (winner === 'O') {
      sounds.playGameOver();
      setP2Wins((w) => w + 1);
    } else {
      sounds.playHit();
      setDraws((d) => d + 1);
    }
  };

  const restartRound = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    sounds.playClick();
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 max-w-md mx-auto">
      {/* Header */}
      <div className="w-full bg-arcade-card p-3 rounded-t-xl border-t-2 border-x-2 border-neon-yellow/40 flex items-center justify-between">
        <span className="font-arcade text-xs text-neon-yellow">⭕ NEON TIC-TAC-TOE</span>
        <button
          onClick={() => { setIsVsAi(!isVsAi); restartRound(); }}
          className="text-xs px-2.5 py-1 rounded bg-gray-800 text-gray-200 flex items-center gap-1 border border-gray-700"
        >
          {isVsAi ? <Bot size={13} className="text-neon-cyan" /> : <User size={13} className="text-neon-green" />}
          {isVsAi ? 'Vs AI' : '2 Players'}
        </button>
      </div>

      {/* Scoreboard */}
      <div className="w-full bg-[#101026] px-4 py-2 flex items-center justify-between border-x-2 border-neon-yellow/40 text-xs font-arcade">
        <div className="text-neon-cyan">P1 (X): {p1Wins}</div>
        <div className="text-gray-400">DRAWS: {draws}</div>
        <div className="text-neon-pink">{isVsAi ? 'AI' : 'P2'} (O): {p2Wins}</div>
      </div>

      {/* Board */}
      <div className="w-full border-2 border-neon-yellow/40 bg-[#0c0c1e] p-4 rounded-b-xl shadow-neon-yellow">
        <div className="grid grid-cols-3 gap-2.5 aspect-square max-w-[280px] mx-auto">
          {board.map((val, i) => {
            const isWinningCell = winInfo?.line?.includes(i);
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                className={`w-full aspect-square rounded-xl border-2 font-arcade text-3xl font-bold flex items-center justify-center transition-all ${
                  isWinningCell
                    ? 'bg-neon-yellow/20 border-neon-yellow text-neon-yellow scale-105 shadow-neon-yellow'
                    : 'bg-[#181836] border-gray-700 hover:border-neon-yellow/50'
                } ${val === 'X' ? 'text-neon-cyan' : val === 'O' ? 'text-neon-pink' : ''}`}
              >
                {val}
              </button>
            );
          })}
        </div>

        {/* Turn / Result message */}
        <div className="mt-4 text-center">
          {winInfo ? (
            <div className="mb-3">
              <span className="font-arcade text-sm text-neon-yellow">
                {winInfo.winner === 'DRAW' ? "IT'S A DRAW!" : `${winInfo.winner} TAKES THE VICTORY!`}
              </span>
            </div>
          ) : (
            <div className="font-arcade text-xs text-gray-400 mb-3">
              TURN: <span className={isXNext ? 'text-neon-cyan' : 'text-neon-pink'}>{isXNext ? 'PLAYER 1 (X)' : isVsAi ? 'AI THINKING...' : 'PLAYER 2 (O)'}</span>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button
              onClick={restartRound}
              className="arcade-btn bg-neon-yellow text-black px-4 py-2 rounded flex items-center gap-1.5"
            >
              <RotateCcw size={14} /> NEW ROUND
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
    </div>
  );
}
