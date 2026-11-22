import React, { useEffect, useRef, useState } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, ArrowLeft, ArrowRight } from 'lucide-react';

const ROW_COLORS = ['#ff0055', '#ff9900', '#ffe600', '#00ff66', '#00f0ff'];

export default function BrickBreaker({ onExit, onWinReward }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('READY'); // READY, PLAYING, GAMEOVER, WON
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('brick_breaker_high') || '0', 10);
  });

  const gameRef = useRef({
    paddleX: 250,
    paddleW: 90,
    paddleH: 12,
    ballX: 300,
    ballY: 280,
    ballVx: 4,
    ballVy: -4,
    ballR: 6,
    bricks: [],
    particles: [],
    leftPressed: false,
    rightPressed: false,
    reqId: null,
  });

  const initBricks = () => {
    const bricks = [];
    const rows = 5;
    const cols = 8;
    const brickW = 60;
    const brickH = 16;
    const padding = 8;
    const offsetLeft = 40;
    const offsetTop = 40;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: c * (brickW + padding) + offsetLeft,
          y: r * (brickH + padding) + offsetTop,
          w: brickW,
          h: brickH,
          color: ROW_COLORS[r],
          points: (rows - r) * 10,
          alive: true,
        });
      }
    }
    return bricks;
  };

  const startNewGame = () => {
    const g = gameRef.current;
    g.bricks = initBricks();
    g.particles = [];
    g.paddleX = 250;
    g.ballX = 300;
    g.ballY = 280;
    g.ballVx = 4 * (Math.random() > 0.5 ? 1 : -1);
    g.ballVy = -4.5;
    setScore(0);
    setLives(3);
    setGameState('PLAYING');
    sounds.playCoin();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        gameRef.current.leftPressed = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        gameRef.current.rightPressed = true;
      } else if (e.code === 'Space' && gameState !== 'PLAYING') {
        e.preventDefault();
        startNewGame();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') gameRef.current.leftPressed = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') gameRef.current.rightPressed = false;
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
        // Paddle movement
        if (g.leftPressed && g.paddleX > 5) g.paddleX -= 7;
        if (g.rightPressed && g.paddleX < canvas.width - g.paddleW - 5) g.paddleX += 7;

        // Ball movement
        g.ballX += g.ballVx;
        g.ballY += g.ballVy;

        // Wall collisions
        if (g.ballX - g.ballR <= 0 || g.ballX + g.ballR >= canvas.width) {
          g.ballVx = -g.ballVx;
          sounds.playHit();
        }
        if (g.ballY - g.ballR <= 0) {
          g.ballVy = -g.ballVy;
          sounds.playHit();
        }

        // Paddle collision
        if (
          g.ballY + g.ballR >= canvas.height - 30 - g.paddleH &&
          g.ballY - g.ballR <= canvas.height - 30 &&
          g.ballX >= g.paddleX &&
          g.ballX <= g.paddleX + g.paddleW
        ) {
          const hitPos = (g.ballX - (g.paddleX + g.paddleW / 2)) / (g.paddleW / 2);
          g.ballVy = -Math.abs(g.ballVy);
          g.ballVx = hitPos * 6;
          sounds.playJump();
        }

        // Bottom boundary (Lose Life)
        if (g.ballY + g.ballR >= canvas.height) {
          sounds.playGameOver();
          setLives((prevLives) => {
            const nextLives = prevLives - 1;
            if (nextLives <= 0) {
              setGameState('GAMEOVER');
              setHighScore((prev) => {
                const updated = Math.max(prev, score);
                localStorage.setItem('brick_breaker_high', updated.toString());
                return updated;
              });
            } else {
              // Reset Ball
              g.ballX = g.paddleX + g.paddleW / 2;
              g.ballY = 280;
              g.ballVx = 4 * (Math.random() > 0.5 ? 1 : -1);
              g.ballVy = -4.5;
            }
            return nextLives;
          });
        }

        // Brick collision
        let remainingBricks = 0;
        g.bricks.forEach((brick) => {
          if (!brick.alive) return;
          remainingBricks++;

          if (
            g.ballX + g.ballR >= brick.x &&
            g.ballX - g.ballR <= brick.x + brick.w &&
            g.ballY + g.ballR >= brick.y &&
            g.ballY - g.ballR <= brick.y + brick.h
          ) {
            brick.alive = false;
            g.ballVy = -g.ballVy;
            sounds.playLaser();
            setScore((prev) => prev + brick.points);

            // Spawn particles
            for (let i = 0; i < 6; i++) {
              g.particles.push({
                x: brick.x + brick.w / 2,
                y: brick.y + brick.h / 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 20,
                color: brick.color,
              });
            }
          }
        });

        // Check Win
        if (remainingBricks === 0 && g.bricks.length > 0) {
          sounds.playWin();
          confetti({ particleCount: 80, spread: 70 });
          setGameState('WON');
          if (onWinReward) onWinReward(50);
        }

        // Update particles
        for (let i = g.particles.length - 1; i >= 0; i--) {
          const p = g.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life--;
          if (p.life <= 0) g.particles.splice(i, 1);
        }
      }

      // RENDER
      ctx.fillStyle = '#080816';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render Bricks
      g.bricks.forEach((b) => {
        if (!b.alive) return;
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      });
      ctx.shadowBlur = 0;

      // Render Particles
      g.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
      });

      // Render Paddle
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.fillRect(g.paddleX, canvas.height - 30 - g.paddleH, g.paddleW, g.paddleH);
      ctx.shadowBlur = 0;

      // Render Ball
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
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
  }, [gameState, score]);

  const handleTouchPaddle = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const scale = canvas.width / rect.width;
    const newX = (clientX - rect.left) * scale - gameRef.current.paddleW / 2;
    gameRef.current.paddleX = Math.max(5, Math.min(canvas.width - gameRef.current.paddleW - 5, newX));
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="w-full bg-arcade-card p-3 rounded-t-xl border-t-2 border-x-2 border-neon-purple/40 flex items-center justify-between">
        <span className="font-arcade text-xs text-neon-purple">🧱 NEON BREAKOUT</span>
        <div className="flex items-center gap-4 text-xs font-arcade">
          <span className="text-white">SCORE: <span className="text-neon-cyan">{score}</span></span>
          <span className="text-neon-pink">LIVES: {'❤️'.repeat(lives)}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full border-2 border-neon-purple/40 bg-[#080816] rounded-b-xl overflow-hidden shadow-neon-pink">
        <canvas
          ref={canvasRef}
          width={600}
          height={340}
          onTouchMove={handleTouchPaddle}
          onMouseMove={handleTouchPaddle}
          className="w-full h-auto block cursor-pointer"
        />

        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center">
            {gameState === 'READY' ? (
              <>
                <h2 className="font-arcade text-xl text-neon-purple mb-2">NEON BRICK BREAKER</h2>
                <p className="text-gray-300 text-sm max-w-sm mb-6">
                  Smash all colored bricks with the bouncy laser ball. Don't let it fall!
                </p>
                <button
                  onClick={startNewGame}
                  className="arcade-btn bg-neon-purple text-white font-bold px-6 py-3 rounded flex items-center gap-2"
                >
                  <Play size={16} /> START GAME
                </button>
              </>
            ) : gameState === 'WON' ? (
              <>
                <h2 className="font-arcade text-xl text-neon-yellow mb-2">VICTORY! ALL BRICKS CLEARED!</h2>
                <p className="font-arcade text-sm text-neon-cyan mb-6">FINAL SCORE: {score}</p>
                <button
                  onClick={startNewGame}
                  className="arcade-btn bg-neon-green text-black px-5 py-2.5 rounded flex items-center gap-2"
                >
                  <RotateCcw size={16} /> PLAY AGAIN
                </button>
              </>
            ) : (
              <>
                <h2 className="font-arcade text-xl text-neon-pink mb-2">GAME OVER</h2>
                <p className="font-arcade text-sm text-gray-300 mb-6">SCORE: {score} | BEST: {highScore}</p>
                <div className="flex gap-4">
                  <button
                    onClick={startNewGame}
                    className="arcade-btn bg-neon-purple text-white px-5 py-2.5 rounded flex items-center gap-2"
                  >
                    <RotateCcw size={16} /> RETRY
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

      {/* Touch Buttons */}
      <div className="w-full mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">Controls: Touch/Drag paddle or Arrow keys</span>
        <div className="flex gap-3">
          <button
            onTouchStart={(e) => { e.preventDefault(); gameRef.current.leftPressed = true; }}
            onTouchEnd={(e) => { e.preventDefault(); gameRef.current.leftPressed = false; }}
            className="w-14 h-12 bg-gray-800 active:bg-neon-purple/40 border border-gray-600 rounded-lg flex items-center justify-center text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); gameRef.current.rightPressed = true; }}
            onTouchEnd={(e) => { e.preventDefault(); gameRef.current.rightPressed = false; }}
            className="w-14 h-12 bg-gray-800 active:bg-neon-purple/40 border border-gray-600 rounded-lg flex items-center justify-center text-white"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
