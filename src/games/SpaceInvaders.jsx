import React, { useEffect, useRef, useState } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, ArrowLeft, ArrowRight, Zap } from 'lucide-react';

export default function SpaceInvaders({ onExit, onWinReward }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('READY'); // READY, PLAYING, GAMEOVER, WON
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('space_invaders_high') || '0', 10);
  });

  const gameRef = useRef({
    playerX: 280,
    playerW: 32,
    playerH: 20,
    lasers: [],
    alienLasers: [],
    aliens: [],
    alienDir: 1,
    alienSpeed: 1,
    leftPressed: false,
    rightPressed: false,
    firePressed: false,
    lastFireTime: 0,
    reqId: null,
  });

  const initAliens = () => {
    const aliens = [];
    const rows = 4;
    const cols = 8;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        aliens.push({
          x: c * 48 + 80,
          y: r * 35 + 40,
          w: 24,
          h: 20,
          row: r,
          alive: true,
        });
      }
    }
    return aliens;
  };

  const startNewGame = () => {
    const g = gameRef.current;
    g.aliens = initAliens();
    g.lasers = [];
    g.alienLasers = [];
    g.playerX = 280;
    g.alienDir = 1;
    g.alienSpeed = 1;
    setScore(0);
    setLives(3);
    setGameState('PLAYING');
    sounds.playCoin();
  };

  const shootLaser = () => {
    const g = gameRef.current;
    const now = Date.now();
    if (now - g.lastFireTime < 280) return; // cooldown
    g.lasers.push({
      x: g.playerX + g.playerW / 2 - 2,
      y: 300,
      w: 4,
      h: 12,
    });
    g.lastFireTime = now;
    sounds.playLaser();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        gameRef.current.leftPressed = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        gameRef.current.rightPressed = true;
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (gameState !== 'PLAYING') {
          startNewGame();
        } else {
          shootLaser();
        }
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
        // Player move
        if (g.leftPressed && g.playerX > 10) g.playerX -= 5;
        if (g.rightPressed && g.playerX < canvas.width - g.playerW - 10) g.playerX += 5;

        // Player laser movement
        for (let i = g.lasers.length - 1; i >= 0; i--) {
          const l = g.lasers[i];
          l.y -= 8;
          if (l.y < 0) {
            g.lasers.splice(i, 1);
            continue;
          }

          // Check hit alien
          for (let a of g.aliens) {
            if (!a.alive) continue;
            if (
              l.x < a.x + a.w &&
              l.x + l.w > a.x &&
              l.y < a.y + a.h &&
              l.y + l.h > a.y
            ) {
              a.alive = false;
              g.lasers.splice(i, 1);
              sounds.playHit();
              setScore((prev) => prev + (4 - a.row) * 20);
              break;
            }
          }
        }

        // Alien lasers movement
        for (let i = g.alienLasers.length - 1; i >= 0; i--) {
          const al = g.alienLasers[i];
          al.y += 4.5;

          // Check hit player
          if (
            al.x < g.playerX + g.playerW &&
            al.x + al.w > g.playerX &&
            al.y < 310 + g.playerH &&
            al.y + al.h > 310
          ) {
            sounds.playGameOver();
            g.alienLasers.splice(i, 1);
            setLives((prev) => {
              const next = prev - 1;
              if (next <= 0) {
                setGameState('GAMEOVER');
                setHighScore((old) => Math.max(old, score));
              }
              return next;
            });
            break;
          }

          if (al.y > canvas.height) {
            g.alienLasers.splice(i, 1);
          }
        }

        // Aliens fleet movement
        let shouldShiftDown = false;
        let aliveAliens = 0;
        for (let a of g.aliens) {
          if (!a.alive) continue;
          aliveAliens++;
          if (
            (g.alienDir === 1 && a.x + a.w > canvas.width - 20) ||
            (g.alienDir === -1 && a.x < 20)
          ) {
            shouldShiftDown = true;
          }
        }

        if (aliveAliens === 0 && g.aliens.length > 0) {
          sounds.playWin();
          confetti({ particleCount: 80, spread: 60 });
          setGameState('WON');
          if (onWinReward) onWinReward(50);
        }

        if (shouldShiftDown) {
          g.alienDir *= -1;
          g.alienSpeed += 0.2;
          for (let a of g.aliens) {
            a.y += 14;
            if (a.alive && a.y + a.h >= 300) {
              // Aliens reached bottom
              setGameState('GAMEOVER');
              sounds.playGameOver();
            }
          }
        } else {
          for (let a of g.aliens) {
            a.x += g.alienDir * g.alienSpeed;
          }
        }

        // Alien random laser shoot
        if (Math.random() < 0.03 && aliveAliens > 0) {
          const living = g.aliens.filter((a) => a.alive);
          const shooter = living[Math.floor(Math.random() * living.length)];
          g.alienLasers.push({
            x: shooter.x + shooter.w / 2 - 2,
            y: shooter.y + shooter.h,
            w: 4,
            h: 10,
          });
        }
      }

      // RENDER
      ctx.fillStyle = '#060611';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 73) % canvas.width);
        const sy = ((i * 127) % canvas.height);
        ctx.fillRect(sx, sy, 1, 1);
      }

      // Draw Aliens
      g.aliens.forEach((a) => {
        if (!a.alive) return;
        const color = a.row === 0 ? '#ff007f' : a.row === 1 ? '#00f0ff' : a.row === 2 ? '#ffe600' : '#00ff66';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;

        // Pixel Alien shape
        ctx.fillRect(a.x + 4, a.y, a.w - 8, a.h);
        ctx.fillRect(a.x, a.y + 4, a.w, a.h - 8);

        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.x + 4, a.y + 6, 4, 4);
        ctx.fillRect(a.x + a.w - 8, a.y + 6, 4, 4);
      });
      ctx.shadowBlur = 0;

      // Draw Player Ship
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(g.playerX + g.playerW / 2, 305);
      ctx.lineTo(g.playerX + g.playerW, 325);
      ctx.lineTo(g.playerX, 325);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(g.playerX + g.playerW / 2 - 2, 298, 4, 8);
      ctx.shadowBlur = 0;

      // Draw Lasers
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;
      g.lasers.forEach((l) => {
        ctx.fillRect(l.x, l.y, l.w, l.h);
      });

      // Draw Alien Lasers
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      g.alienLasers.forEach((al) => {
        ctx.fillRect(al.x, al.y, al.w, al.h);
      });
      ctx.shadowBlur = 0;

      g.reqId = requestAnimationFrame(loop);
    };

    g.reqId = requestAnimationFrame(loop);
    return () => {
      if (g.reqId) cancelAnimationFrame(g.reqId);
    };
  }, [gameState, score]);

  return (
    <div className="flex flex-col items-center justify-center p-3 max-w-2xl mx-auto">
      {/* Header */}
      <div className="w-full bg-arcade-card p-3 rounded-t-xl border-t-2 border-x-2 border-neon-orange/40 flex items-center justify-between">
        <span className="font-arcade text-xs text-neon-orange">👾 PIXEL SPACE DEFENDER</span>
        <div className="flex items-center gap-4 text-xs font-arcade">
          <span className="text-white">SCORE: <span className="text-neon-cyan">{score}</span></span>
          <span className="text-neon-pink">SHIPS: {'🚀'.repeat(lives)}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full border-2 border-neon-orange/40 bg-[#060611] rounded-b-xl overflow-hidden shadow-neon-orange">
        <canvas
          ref={canvasRef}
          width={600}
          height={340}
          className="w-full h-auto block"
        />

        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center">
            {gameState === 'READY' ? (
              <>
                <h2 className="font-arcade text-xl text-neon-orange mb-2">SPACE INVADERS 1980</h2>
                <p className="text-gray-300 text-sm max-w-sm mb-6">
                  Blast all alien waves before they land on Earth! Dodge enemy laser fire.
                </p>
                <button
                  onClick={startNewGame}
                  className="arcade-btn bg-neon-orange text-white font-bold px-6 py-3 rounded flex items-center gap-2"
                >
                  <Play size={16} /> LAUNCH DEFENDER
                </button>
              </>
            ) : gameState === 'WON' ? (
              <>
                <h2 className="font-arcade text-xl text-neon-green mb-2">VICTORY! EARTH SAVED!</h2>
                <p className="font-arcade text-sm text-neon-cyan mb-6">SCORE: {score}</p>
                <button
                  onClick={startNewGame}
                  className="arcade-btn bg-neon-green text-black px-5 py-2.5 rounded flex items-center gap-2"
                >
                  <RotateCcw size={16} /> PLAY AGAIN
                </button>
              </>
            ) : (
              <>
                <h2 className="font-arcade text-xl text-neon-pink mb-2">DEFENSE FAILED</h2>
                <p className="font-arcade text-sm text-gray-300 mb-6">FINAL SCORE: {score}</p>
                <div className="flex gap-4">
                  <button
                    onClick={startNewGame}
                    className="arcade-btn bg-neon-orange text-white px-5 py-2.5 rounded flex items-center gap-2"
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

      {/* Touch Controls */}
      <div className="w-full mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">Controls: A/D or Arrows to steer, Space to Fire</span>
        <div className="flex gap-3">
          <button
            onTouchStart={(e) => { e.preventDefault(); gameRef.current.leftPressed = true; }}
            onTouchEnd={(e) => { e.preventDefault(); gameRef.current.leftPressed = false; }}
            className="w-14 h-12 bg-gray-800 active:bg-neon-orange/40 border border-gray-600 rounded-lg flex items-center justify-center text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); gameRef.current.rightPressed = true; }}
            onTouchEnd={(e) => { e.preventDefault(); gameRef.current.rightPressed = false; }}
            className="w-14 h-12 bg-gray-800 active:bg-neon-orange/40 border border-gray-600 rounded-lg flex items-center justify-center text-white"
          >
            <ArrowRight size={20} />
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); shootLaser(); }}
            onMouseDown={shootLaser}
            className="w-16 h-12 bg-neon-orange text-white active:scale-95 font-bold rounded-lg flex items-center justify-center text-xs shadow-neon-orange"
          >
            <Zap size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
