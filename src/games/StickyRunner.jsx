import React, { useEffect, useRef, useState } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Volume2, VolumeX, ArrowUp, ArrowDown } from 'lucide-react';

export default function StickyRunner({ onExit, onWinReward }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('READY'); // READY, PLAYING, GAMEOVER
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('sticky_runner_high') || '0', 10);
  });
  const [coins, setCoins] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  const gameRef = useRef({
    player: {
      x: 80,
      y: 200,
      vy: 0,
      width: 24,
      height: 48,
      isGrounded: false,
      isDucking: false,
      runCycle: 0,
    },
    obstacles: [],
    coinsList: [],
    gameSpeed: 5,
    distance: 0,
    groundY: 230,
    reqId: null,
    lastObstacleTime: 0,
    lastCoinTime: 0,
  });

  const jump = () => {
    const p = gameRef.current.player;
    if (p.isGrounded) {
      p.vy = -12;
      p.isGrounded = false;
      sounds.playJump();
    }
  };

  const duck = (ducking) => {
    const p = gameRef.current.player;
    p.isDucking = ducking;
    p.height = ducking ? 28 : 48;
  };

  const startGame = () => {
    const g = gameRef.current;
    g.player.y = 200;
    g.player.vy = 0;
    g.player.height = 48;
    g.player.isDucking = false;
    g.obstacles = [];
    g.coinsList = [];
    g.gameSpeed = 5.5;
    g.distance = 0;
    g.lastObstacleTime = Date.now();
    g.lastCoinTime = Date.now();
    setScore(0);
    setCoins(0);
    setGameState('PLAYING');
    sounds.playCoin();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (gameState !== 'PLAYING') {
          startGame();
        } else {
          jump();
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        duck(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        duck(false);
      }
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
        // Physics update
        const p = g.player;
        p.vy += 0.65; // gravity
        p.y += p.vy;

        if (p.y >= g.groundY - p.height) {
          p.y = g.groundY - p.height;
          p.vy = 0;
          p.isGrounded = true;
        }

        g.distance += 0.2;
        g.gameSpeed = 5.5 + Math.min(6, g.distance * 0.005);
        const currentScore = Math.floor(g.distance);
        setScore(currentScore);

        // Spawn obstacles
        const now = Date.now();
        if (now - g.lastObstacleTime > 1300 + Math.random() * 1200) {
          const type = Math.random() > 0.4 ? 'spike' : 'bird';
          g.obstacles.push({
            x: canvas.width + 20,
            y: type === 'spike' ? g.groundY - 26 : g.groundY - 65,
            width: type === 'spike' ? 22 : 30,
            height: type === 'spike' ? 26 : 22,
            type,
          });
          g.lastObstacleTime = now;
        }

        // Spawn coins
        if (now - g.lastCoinTime > 1800 + Math.random() * 1000) {
          g.coinsList.push({
            x: canvas.width + 30,
            y: g.groundY - 50 - Math.random() * 40,
            radius: 8,
            collected: false,
          });
          g.lastCoinTime = now;
        }

        // Move obstacles & check collision
        for (let i = g.obstacles.length - 1; i >= 0; i--) {
          const obs = g.obstacles[i];
          obs.x -= g.gameSpeed;

          // AABB Collision check with stickman hit box
          const pBox = {
            x: p.x - 10,
            y: p.y,
            width: p.width,
            height: p.height,
          };

          if (
            pBox.x < obs.x + obs.width &&
            pBox.x + pBox.width > obs.x &&
            pBox.y < obs.y + obs.height &&
            pBox.y + pBox.height > obs.y
          ) {
            // Collision!
            sounds.playGameOver();
            setGameState('GAMEOVER');
            if (currentScore >= 60 && onWinReward) {
              onWinReward(20);
            }
            setHighScore((prev) => {
              const updated = Math.max(prev, currentScore);
              localStorage.setItem('sticky_runner_high', updated.toString());
              if (currentScore > prev) {
                confetti({ particleCount: 50, spread: 60 });
              }
              return updated;
            });
            break;
          }

          if (obs.x + obs.width < -20) {
            g.obstacles.splice(i, 1);
          }
        }

        // Move coins & check collection
        for (let i = g.coinsList.length - 1; i >= 0; i--) {
          const c = g.coinsList[i];
          c.x -= g.gameSpeed;

          const dx = p.x - c.x;
          const dy = (p.y + p.height / 2) - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 25 && !c.collected) {
            c.collected = true;
            sounds.playCoin();
            setCoins((prev) => prev + 1);
            g.coinsList.splice(i, 1);
          } else if (c.x < -20) {
            g.coinsList.splice(i, 1);
          }
        }

        // Running cycle animation
        if (p.isGrounded) {
          p.runCycle = (p.runCycle + 0.25) % (Math.PI * 2);
        }
      }

      // RENDER
      ctx.fillStyle = '#0a0a18';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Background stars / parallax grid
      ctx.strokeStyle = '#181836';
      ctx.lineWidth = 1;
      for (let x = (canvas.width - (g.distance * 2) % 40); x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw Ground (Neon Line)
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, g.groundY);
      ctx.lineTo(canvas.width, g.groundY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Ground Hatching
      ctx.strokeStyle = '#1c3d28';
      ctx.lineWidth = 2;
      const groundOffset = (g.distance * 8) % 20;
      for (let x = -groundOffset; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, g.groundY);
        ctx.lineTo(x + 10, canvas.height);
        ctx.stroke();
      }

      // Draw Coins
      ctx.fillStyle = '#ffe600';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 8;
      g.coinsList.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b3a000';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe600';
      });
      ctx.shadowBlur = 0;

      // Draw Obstacles (Spikes or Flying Drones)
      g.obstacles.forEach((obs) => {
        if (obs.type === 'spike') {
          ctx.fillStyle = '#ff0055';
          ctx.shadowColor = '#ff0055';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Flying Obstacle
          ctx.fillStyle = '#00f0ff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 10;
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(obs.x + 4, obs.y + 6, 8, 4);
          ctx.shadowBlur = 0;
        }
      });

      // Draw STICKMAN (Player)
      const p = g.player;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 8;

      const headRadius = p.isDucking ? 6 : 8;
      const headX = p.x;
      const headY = p.y + headRadius;

      // Head
      ctx.beginPath();
      ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Ninja Headband
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.rect(headX - headRadius, headY - 3, headRadius * 2, 4);
      ctx.fill();
      // Headband tails
      ctx.beginPath();
      ctx.moveTo(headX - headRadius, headY);
      ctx.lineTo(headX - headRadius - 10, headY - 4 + Math.sin(g.distance * 0.5) * 4);
      ctx.lineTo(headX - headRadius - 12, headY + 3);
      ctx.fill();

      // Torso
      const torsoBottomY = p.isDucking ? headY + 12 : headY + 22;
      ctx.beginPath();
      ctx.moveTo(headX, headY + headRadius);
      ctx.lineTo(headX, torsoBottomY);
      ctx.stroke();

      // Legs animation
      const legAngle = p.isGrounded ? Math.sin(p.runCycle) * 0.7 : 0.5;
      const legLen = p.isDucking ? 10 : 16;

      // Leg 1
      ctx.beginPath();
      ctx.moveTo(headX, torsoBottomY);
      ctx.lineTo(headX - Math.sin(legAngle) * legLen, torsoBottomY + Math.cos(legAngle) * legLen);
      ctx.stroke();

      // Leg 2
      ctx.beginPath();
      ctx.moveTo(headX, torsoBottomY);
      ctx.lineTo(headX + Math.sin(legAngle) * legLen, torsoBottomY + Math.cos(-legAngle) * legLen);
      ctx.stroke();

      // Arms animation
      const armAngle = p.isGrounded ? Math.cos(p.runCycle) * 0.6 : -0.8;
      const armY = headY + headRadius + 4;
      const armLen = 12;

      ctx.beginPath();
      ctx.moveTo(headX, armY);
      ctx.lineTo(headX - Math.sin(armAngle) * armLen, armY + Math.cos(armAngle) * armLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(headX, armY);
      ctx.lineTo(headX + Math.sin(armAngle) * armLen, armY + Math.cos(-armAngle) * armLen);
      ctx.stroke();

      ctx.shadowBlur = 0;

      g.reqId = requestAnimationFrame(loop);
    };

    g.reqId = requestAnimationFrame(loop);
    return () => {
      if (g.reqId) cancelAnimationFrame(g.reqId);
    };
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center p-4 max-w-3xl mx-auto">
      {/* Top Bar Stats */}
      <div className="w-full flex items-center justify-between bg-arcade-card p-3 rounded-t-xl border-t-2 border-x-2 border-neon-green/40">
        <div className="flex items-center gap-4">
          <span className="text-neon-green font-arcade text-xs">🏃 STICKY NINJA RUN</span>
          <span className="text-neon-yellow font-retro text-lg flex items-center gap-1">
            🪙 {coins}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-gray-400 text-xs block">DISTANCE</span>
            <span className="font-arcade text-white text-xs">{score}m</span>
          </div>
          <div className="text-right">
            <span className="text-gray-400 text-xs block">BEST</span>
            <span className="font-arcade text-neon-cyan text-xs">{highScore}m</span>
          </div>
          <button
            onClick={() => setSoundOn(sounds.toggleSound())}
            className="p-1.5 rounded bg-gray-800 text-gray-300 hover:text-white"
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative w-full border-2 border-neon-green/40 bg-[#0a0a18] rounded-b-xl overflow-hidden shadow-neon-green">
        <canvas
          ref={canvasRef}
          width={640}
          height={280}
          className="w-full h-auto block"
        />

        {/* Start / Game Over Overlay */}
        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center backdrop-blur-xs p-6 text-center">
            {gameState === 'READY' ? (
              <>
                <h2 className="font-arcade text-xl sm:text-2xl text-neon-green mb-2 animate-pulse">
                  STICKY NINJA
                </h2>
                <p className="text-gray-300 text-sm max-w-sm mb-6">
                  Classic 1D Stick runner! Jump over red spikes and duck under flying drones to survive.
                </p>
                <button
                  onClick={startGame}
                  className="arcade-btn bg-neon-green text-black hover:bg-neon-green/90 font-bold px-6 py-3 rounded flex items-center gap-2 shadow-neon-green"
                >
                  <Play size={16} /> TAP TO RUN
                </button>
              </>
            ) : (
              <>
                <h2 className="font-arcade text-xl sm:text-2xl text-neon-pink mb-2">
                  GAME OVER!
                </h2>
                <p className="font-arcade text-sm text-white mb-2">
                  SCORE: <span className="text-neon-cyan">{score}m</span>
                </p>
                <p className="font-retro text-lg text-neon-yellow mb-6">
                  Coins Collected: {coins} | High Score: {highScore}m
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={startGame}
                    className="arcade-btn bg-neon-green text-black hover:bg-neon-green/90 font-bold px-5 py-2.5 rounded flex items-center gap-2"
                  >
                    <RotateCcw size={16} /> PLAY AGAIN
                  </button>
                  {onExit && (
                    <button
                      onClick={onExit}
                      className="arcade-btn bg-gray-800 text-gray-200 hover:bg-gray-700 px-5 py-2.5 rounded"
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

      {/* Mobile Touch Controls & Instructions */}
      <div className="w-full mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-gray-400">
          🎮 <span className="text-neon-green">Controls:</span> Spacebar / ↑ to Jump, ↓ to Duck.
        </div>
        {/* On-screen touch buttons for mobile */}
        <div className="flex gap-4">
          <button
            onTouchStart={(e) => { e.preventDefault(); duck(true); }}
            onTouchEnd={(e) => { e.preventDefault(); duck(false); }}
            onMouseDown={() => duck(true)}
            onMouseUp={() => duck(false)}
            className="w-16 h-14 bg-gray-800 active:bg-neon-pink/40 border border-gray-600 rounded-lg flex flex-col items-center justify-center text-xs text-white"
          >
            <ArrowDown size={18} />
            DUCK
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); if (gameState !== 'PLAYING') startGame(); else jump(); }}
            onMouseDown={() => { if (gameState !== 'PLAYING') startGame(); else jump(); }}
            className="w-20 h-14 bg-neon-green text-black active:scale-95 font-bold rounded-lg flex flex-col items-center justify-center text-xs shadow-neon-green"
          >
            <ArrowUp size={20} />
            JUMP
          </button>
        </div>
      </div>
    </div>
  );
}
