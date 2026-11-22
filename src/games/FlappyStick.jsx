import React, { useEffect, useRef, useState } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, ArrowUp } from 'lucide-react';

export default function FlappyStick({ onExit }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('READY'); // READY, PLAYING, GAMEOVER
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('flappy_stick_high') || '0', 10);
  });

  const gameRef = useRef({
    copterY: 150,
    copterVy: 0,
    rotorAngle: 0,
    pipes: [],
    lastPipeTime: 0,
    reqId: null,
  });

  const flap = () => {
    if (gameState === 'PLAYING') {
      gameRef.current.copterVy = -6.5;
      sounds.playJump();
    } else {
      startNewGame();
    }
  };

  const startNewGame = () => {
    const g = gameRef.current;
    g.copterY = 150;
    g.copterVy = -4;
    g.pipes = [];
    g.lastPipeTime = Date.now();
    setScore(0);
    setGameState('PLAYING');
    sounds.playCoin();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const g = gameRef.current;

    const loop = () => {
      if (gameState === 'PLAYING') {
        // Copter physics
        g.copterVy += 0.35; // gravity
        g.copterY += g.copterVy;
        g.rotorAngle += 0.6;

        // Ground / Ceiling collision
        if (g.copterY < 10 || g.copterY > canvas.height - 25) {
          sounds.playGameOver();
          setGameState('GAMEOVER');
          setHighScore((old) => Math.max(old, score));
        }

        // Spawn pipes
        const now = Date.now();
        if (now - g.lastPipeTime > 1600) {
          const gap = 90;
          const topH = Math.floor(Math.random() * (canvas.height - gap - 80)) + 40;
          g.pipes.push({
            x: canvas.width + 10,
            topH,
            bottomY: topH + gap,
            passed: false,
          });
          g.lastPipeTime = now;
        }

        // Move pipes & collision
        for (let i = g.pipes.length - 1; i >= 0; i--) {
          const p = g.pipes[i];
          p.x -= 3.2;

          // Check pass
          if (!p.passed && p.x < 80) {
            p.passed = true;
            sounds.playCoin();
            setScore((prev) => {
              const next = prev + 1;
              if (next > highScore) {
                confetti({ particleCount: 20, spread: 40 });
              }
              return next;
            });
          }

          // AABB Hit Detection
          const copterBox = { x: 75, y: g.copterY - 12, w: 24, h: 24 };
          // Top Pipe
          if (
            copterBox.x < p.x + 40 &&
            copterBox.x + copterBox.w > p.x &&
            copterBox.y < p.topH
          ) {
            sounds.playGameOver();
            setGameState('GAMEOVER');
            setHighScore((old) => Math.max(old, score));
            break;
          }
          // Bottom Pipe
          if (
            copterBox.x < p.x + 40 &&
            copterBox.x + copterBox.w > p.x &&
            copterBox.y + copterBox.h > p.bottomY
          ) {
            sounds.playGameOver();
            setGameState('GAMEOVER');
            setHighScore((old) => Math.max(old, score));
            break;
          }

          if (p.x < -50) {
            g.pipes.splice(i, 1);
          }
        }
      }

      // RENDER
      ctx.fillStyle = '#0a0d1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Neon Skyline background
      ctx.fillStyle = '#121829';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(i * 80, 200 + (i % 3) * 20, 60, canvas.height);
      }

      // Pipes
      g.pipes.forEach((p) => {
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;

        // Top Pipe
        ctx.fillRect(p.x, 0, 40, p.topH);
        ctx.fillRect(p.x - 3, p.topH - 12, 46, 12);

        // Bottom Pipe
        ctx.fillRect(p.x, p.bottomY, 40, canvas.height - p.bottomY);
        ctx.fillRect(p.x - 3, p.bottomY, 46, 12);
        ctx.shadowBlur = 0;
      });

      // STICKMAN COPTER
      const cx = 85;
      const cy = g.copterY;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 6;

      // Rotor blades
      ctx.strokeStyle = '#00ff66';
      ctx.beginPath();
      const bladeSpan = Math.cos(g.rotorAngle) * 20;
      ctx.moveTo(cx - bladeSpan, cy - 16);
      ctx.lineTo(cx + bladeSpan, cy - 16);
      ctx.stroke();

      // Rotor shaft
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16);
      ctx.lineTo(cx, cy - 6);
      ctx.stroke();

      // Head
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.stroke();

      // Torso
      ctx.beginPath();
      ctx.moveTo(cx, cy + 6);
      ctx.lineTo(cx, cy + 18);
      ctx.stroke();

      // Legs
      ctx.beginPath();
      ctx.moveTo(cx, cy + 18);
      ctx.lineTo(cx - 6, cy + 28);
      ctx.moveTo(cx, cy + 18);
      ctx.lineTo(cx + 6, cy + 28);
      ctx.stroke();

      // Arms holding controls
      ctx.beginPath();
      ctx.moveTo(cx, cy + 10);
      ctx.lineTo(cx + 8, cy + 12);
      ctx.stroke();

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
      <div className="w-full bg-arcade-card p-3 rounded-t-xl border-t-2 border-x-2 border-neon-cyan/40 flex items-center justify-between">
        <span className="font-arcade text-xs text-neon-cyan">🚁 FLAPPY STICK COPTER</span>
        <div className="flex items-center gap-4 text-xs font-arcade">
          <span className="text-white">SCORE: <span className="text-neon-green">{score}</span></span>
          <span className="text-gray-400">BEST: {highScore}</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        onClick={flap}
        className="relative w-full border-2 border-neon-cyan/40 bg-[#0a0d1a] rounded-b-xl overflow-hidden shadow-neon-cyan cursor-pointer"
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={320}
          className="w-full h-auto block"
        />

        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center">
            {gameState === 'READY' ? (
              <>
                <h2 className="font-arcade text-xl text-neon-cyan mb-2">FLAPPY STICK COPTER</h2>
                <p className="text-gray-300 text-sm max-w-sm mb-6">
                  Tap anywhere or press Space / Up to spin the rotor blades and fly between electric pillars!
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); startNewGame(); }}
                  className="arcade-btn bg-neon-cyan text-black font-bold px-6 py-3 rounded flex items-center gap-2 shadow-neon-cyan"
                >
                  <Play size={16} /> TAP TO FLY
                </button>
              </>
            ) : (
              <>
                <h2 className="font-arcade text-xl text-neon-pink mb-2">CRASHED!</h2>
                <p className="font-arcade text-sm text-gray-300 mb-6">SCORE: {score} | BEST: {highScore}</p>
                <div className="flex gap-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); startNewGame(); }}
                    className="arcade-btn bg-neon-cyan text-black px-5 py-2.5 rounded flex items-center gap-2"
                  >
                    <RotateCcw size={16} /> FLY AGAIN
                  </button>
                  {onExit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onExit(); }}
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

      {/* Big Mobile Flap Button */}
      <div className="w-full mt-4 flex justify-center">
        <button
          onClick={flap}
          className="w-full max-w-xs py-3 bg-neon-cyan/20 border-2 border-neon-cyan active:bg-neon-cyan/40 text-neon-cyan font-arcade text-xs rounded-xl flex items-center justify-center gap-2"
        >
          <ArrowUp size={18} /> TAP TO THRUST COPTER
        </button>
      </div>
    </div>
  );
}
