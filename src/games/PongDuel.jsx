import React, { useEffect, useRef, useState } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Volume2, VolumeX, ArrowUp, ArrowDown } from 'lucide-react';

export default function PongDuel({ onExit, onWinReward }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('READY'); // READY, PLAYING, GAMEOVER
  const [pScore, setPScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [winner, setWinner] = useState(null);

  const gameRef = useRef({
    pY: 120,
    aiY: 120,
    paddleW: 10,
    paddleH: 60,
    ballX: 300,
    ballY: 150,
    ballVx: 4.5,
    ballVy: 2.5,
    ballR: 6,
    speedMultiplier: 1,
    upPressed: false,
    downPressed: false,
    reqId: null,
  });

  const startMatch = () => {
    setPScore(0);
    setAiScore(0);
    setWinner(null);
    resetBall(1);
    setGameState('PLAYING');
    sounds.playCoin();
  };

  const resetBall = (direction = 1) => {
    const g = gameRef.current;
    g.ballX = 300;
    g.ballY = 150;
    g.ballVx = (direction > 0 ? 4 : -4);
    g.ballVy = (Math.random() * 4 - 2);
    g.speedMultiplier = 1;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        gameRef.current.upPressed = true;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        gameRef.current.downPressed = true;
      } else if (e.code === 'Space' && gameState !== 'PLAYING') {
        e.preventDefault();
        startMatch();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') gameRef.current.upPressed = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') gameRef.current.downPressed = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const g = gameRef.current;

    const loop = () => {
      if (gameState === 'PLAYING') {
        // Player Movement
        if (g.upPressed && g.pY > 5) g.pY -= 6;
        if (g.downPressed && g.pY < canvas.height - g.paddleH - 5) g.pY += 6;

        // AI Movement (Smart Tracking with slight delay)
        const targetAiY = g.ballY - g.paddleH / 2;
        if (g.aiY < targetAiY) g.aiY += 3.8;
        if (g.aiY > targetAiY) g.aiY -= 3.8;
        g.aiY = Math.max(5, Math.min(canvas.height - g.paddleH - 5, g.aiY));

        // Ball Movement
        g.ballX += g.ballVx;
        g.ballY += g.ballVy;

        // Top / Bottom Wall Collision
        if (g.ballY - g.ballR <= 0 || g.ballY + g.ballR >= canvas.height) {
          g.ballVy = -g.ballVy;
          sounds.playHit();
        }

        // Left Paddle (Player) Collision
        if (
          g.ballX - g.ballR <= 20 + g.paddleW &&
          g.ballX + g.ballR >= 20 &&
          g.ballY >= g.pY &&
          g.ballY <= g.pY + g.paddleH
        ) {
          const hitOffset = (g.ballY - (g.pY + g.paddleH / 2)) / (g.paddleH / 2);
          g.ballVx = Math.abs(g.ballVx) + 0.3; // speed up
          g.ballVy = hitOffset * 5;
          sounds.playLaser();
        }

        // Right Paddle (AI) Collision
        if (
          g.ballX + g.ballR >= canvas.width - 20 - g.paddleW &&
          g.ballX - g.ballR <= canvas.width - 20 &&
          g.ballY >= g.aiY &&
          g.ballY <= g.aiY + g.paddleH
        ) {
          const hitOffset = (g.ballY - (g.aiY + g.paddleH / 2)) / (g.paddleH / 2);
          g.ballVx = -(Math.abs(g.ballVx) + 0.3);
          g.ballVy = hitOffset * 5;
          sounds.playLaser();
        }

        // Scoring Left (AI scores)
        if (g.ballX < 0) {
          sounds.playGameOver();
          setAiScore((prev) => {
            const nextScore = prev + 1;
            if (nextScore >= 5) {
              setWinner('Computer AI');
              setGameState('GAMEOVER');
            } else {
              resetBall(1);
            }
            return nextScore;
          });
        }

        // Scoring Right (Player scores)
        if (g.ballX > canvas.width) {
          sounds.playCoin();
          setPScore((prev) => {
            const nextScore = prev + 1;
            if (nextScore >= 5) {
              sounds.playWin();
              confetti({ particleCount: 70, spread: 60 });
              setWinner('Player 1');
              setGameState('GAMEOVER');
              if (onWinReward) onWinReward(20);
            } else {
              resetBall(-1);
            }
            return nextScore;
          });
        }
      }

      // RENDER VINTAGE CRT PONG
      ctx.fillStyle = '#080814';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center dashed net
      ctx.strokeStyle = '#222244';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Scores Display
      ctx.fillStyle = '#333366';
      ctx.font = '36px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pScore.toString(), canvas.width / 4, 60);
      ctx.fillText(aiScore.toString(), (canvas.width * 3) / 4, 60);

      // Player Paddle (Neon Green)
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 10;
      ctx.fillRect(20, g.pY, g.paddleW, g.paddleH);

      // AI Paddle (Neon Pink)
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 10;
      ctx.fillRect(canvas.width - 20 - g.paddleW, g.aiY, g.paddleW, g.paddleH);

      // Ball (Neon Cyan)
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(g.ballX, g.ballY, g.ballR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      g.reqId = requestAnimationFrame(loop);
    };

    g.reqId = requestAnimationFrame(loop);
    return () => {
      if (g.reqId) cancelAnimationFrame(g.reqId);
    };
  }, [gameState, pScore, aiScore]);

  // Handle touch / mouse dragging for player paddle
  const handleTouchMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scale = canvas.height / rect.height;
    const newY = (clientY - rect.top) * scale - gameRef.current.paddleH / 2;
    gameRef.current.pY = Math.max(5, Math.min(canvas.height - gameRef.current.paddleH - 5, newY));
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 max-w-2xl mx-auto">
      {/* Header */}
      <div className="w-full bg-arcade-card p-3 rounded-t-xl border-t-2 border-x-2 border-neon-cyan/40 flex items-center justify-between">
        <span className="font-arcade text-xs text-neon-cyan">🏓 1D RETRO PONG DUEL</span>
        <div className="text-xs font-arcade text-gray-300">FIRST TO 5 WINS</div>
      </div>

      {/* Canvas */}
      <div className="relative w-full border-2 border-neon-cyan/40 bg-[#080814] rounded-b-xl overflow-hidden shadow-neon-cyan">
        <canvas
          ref={canvasRef}
          width={600}
          height={300}
          onTouchMove={handleTouchMove}
          onMouseMove={handleTouchMove}
          className="w-full h-auto block cursor-pointer"
        />

        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center">
            {gameState === 'READY' ? (
              <>
                <h2 className="font-arcade text-xl text-neon-cyan mb-2">1972 PONG BATTLE</h2>
                <p className="text-gray-300 text-sm max-w-sm mb-6">
                  Drag your finger / mouse or use W/S / Arrow keys to defend your net against the AI!
                </p>
                <button
                  onClick={startMatch}
                  className="arcade-btn bg-neon-cyan text-black font-bold px-6 py-3 rounded flex items-center gap-2 shadow-neon-cyan"
                >
                  <Play size={16} /> START MATCH
                </button>
              </>
            ) : (
              <>
                <h2 className={`font-arcade text-xl mb-2 ${winner === 'Player 1' ? 'text-neon-green' : 'text-neon-pink'}`}>
                  {winner === 'Player 1' ? 'YOU WON THE MATCH!' : 'AI WINS!'}
                </h2>
                <p className="font-arcade text-sm text-gray-300 mb-6">
                  {pScore} - {aiScore}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={startMatch}
                    className="arcade-btn bg-neon-cyan text-black px-5 py-2.5 rounded flex items-center gap-2"
                  >
                    <RotateCcw size={16} /> PLAY AGAIN
                  </button>
                  {onExit && (
                    <button
                      onClick={onExit}
                      className="arcade-btn bg-gray-800 text-gray-200 px-5 py-2.5 rounded"
                    >
                      EXIT
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile Paddle Touch Controls */}
      <div className="w-full mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          🎮 Drag finger on screen or use buttons
        </div>
        <div className="flex gap-3">
          <button
            onTouchStart={(e) => { e.preventDefault(); gameRef.current.upPressed = true; }}
            onTouchEnd={(e) => { e.preventDefault(); gameRef.current.upPressed = false; }}
            className="w-14 h-12 bg-gray-800 active:bg-neon-cyan/30 border border-gray-600 rounded-lg flex items-center justify-center text-white"
          >
            <ArrowUp size={20} />
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); gameRef.current.downPressed = true; }}
            onTouchEnd={(e) => { e.preventDefault(); gameRef.current.downPressed = false; }}
            className="w-14 h-12 bg-gray-800 active:bg-neon-cyan/30 border border-gray-600 rounded-lg flex items-center justify-center text-white"
          >
            <ArrowDown size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
