import React, { useEffect, useRef, useState } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, ArrowLeft, ArrowRight, Zap, Volume2, VolumeX, Trophy } from 'lucide-react';

export default function CyberRacer({ onExit, onWinReward }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('READY'); // READY, PLAYING, WON, GAMEOVER
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [nitroFuel, setNitroFuel] = useState(100);
  const [isNitro, setIsNitro] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('cyber_racer_high') || '0', 10);
  });
  const [soundOn, setSoundOn] = useState(true);

  const gameRef = useRef({
    playerX: 300, // 300 is center lane
    targetX: 300,
    playerY: 260,
    playerW: 42,
    playerH: 64,
    speed: 7,
    maxSpeed: 14,
    nitroSpeed: 18,
    isNitroActive: false,
    roadOffset: 0,
    traffic: [],
    coins: [],
    particles: [],
    leftPressed: false,
    rightPressed: false,
    nitroPressed: false,
    lastTrafficTime: 0,
    lastCoinTime: 0,
    reqId: null,
  });

  const LANE_X = [180, 300, 420]; // 3 lanes on the highway

  const startRace = () => {
    const g = gameRef.current;
    g.playerX = 300;
    g.targetX = 300;
    g.speed = 7;
    g.traffic = [];
    g.coins = [];
    g.particles = [];
    g.roadOffset = 0;
    g.lastTrafficTime = Date.now();
    g.lastCoinTime = Date.now();
    setScore(0);
    setDistance(0);
    setNitroFuel(100);
    setIsNitro(false);
    setGameState('PLAYING');
    sounds.playCoin();
  };

  const steerLeft = () => {
    const g = gameRef.current;
    if (g.targetX > 180) {
      g.targetX -= 120;
      sounds.playClick();
    }
  };

  const steerRight = () => {
    const g = gameRef.current;
    if (g.targetX < 420) {
      g.targetX += 120;
      sounds.playClick();
    }
  };

  const triggerNitro = (active) => {
    gameRef.current.nitroPressed = active;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        steerLeft();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        steerRight();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        e.preventDefault();
        triggerNitro(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        triggerNitro(false);
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
        // Nitro management
        if (g.nitroPressed && nitroFuel > 0) {
          g.isNitroActive = true;
          setNitroFuel((f) => Math.max(0, f - 0.4));
          setIsNitro(true);
        } else {
          g.isNitroActive = false;
          setIsNitro(false);
          // Slowly regenerate nitro
          setNitroFuel((f) => Math.min(100, f + 0.1));
        }

        const currentSpeed = g.isNitroActive ? g.nitroSpeed : g.speed;
        g.roadOffset = (g.roadOffset + currentSpeed) % 60;

        // Smooth steering interpolation
        g.playerX += (g.targetX - g.playerX) * 0.22;

        // Progress distance
        const nextDist = Math.floor(g.roadOffset * 0.1);
        setDistance((d) => {
          const updated = d + Math.floor(currentSpeed * 0.15);
          // Check WIN condition at 500 meters
          if (updated >= 500 && gameState !== 'WON') {
            sounds.playWin();
            confetti({ particleCount: 100, spread: 80 });
            setGameState('WON');
            if (onWinReward) onWinReward(20);
          }
          return updated;
        });

        // Spawn traffic cars
        const now = Date.now();
        const spawnDelay = g.isNitroActive ? 900 : 1300;
        if (now - g.lastTrafficTime > spawnDelay + Math.random() * 800) {
          const randomLane = LANE_X[Math.floor(Math.random() * LANE_X.length)];
          const carColors = ['#ff0055', '#ffe600', '#00f0ff', '#b026ff'];
          g.traffic.push({
            x: randomLane,
            y: -80,
            w: 38,
            h: 60,
            speed: 3 + Math.random() * 2,
            color: carColors[Math.floor(Math.random() * carColors.length)],
          });
          g.lastTrafficTime = now;
        }

        // Spawn gold coins
        if (now - g.lastCoinTime > 1100 + Math.random() * 900) {
          const randomLane = LANE_X[Math.floor(Math.random() * LANE_X.length)];
          g.coins.push({
            x: randomLane,
            y: -40,
            r: 10,
            collected: false,
          });
          g.lastCoinTime = now;
        }

        // Move traffic cars & check collision
        for (let i = g.traffic.length - 1; i >= 0; i--) {
          const car = g.traffic[i];
          car.y += (currentSpeed - car.speed);

          // AABB Collision check
          const pBox = {
            x: g.playerX - g.playerW / 2 + 6,
            y: g.playerY,
            w: g.playerW - 12,
            h: g.playerH - 8,
          };
          const carBox = {
            x: car.x - car.w / 2 + 4,
            y: car.y,
            w: car.w - 8,
            h: car.h - 8,
          };

          if (
            pBox.x < carBox.x + carBox.w &&
            pBox.x + pBox.w > carBox.x &&
            pBox.y < carBox.y + carBox.h &&
            pBox.y + pBox.h > carBox.y
          ) {
            // CRASH!
            sounds.playGameOver();
            setGameState('GAMEOVER');
            setHighScore((h) => {
              const updated = Math.max(h, score);
              localStorage.setItem('cyber_racer_high', updated.toString());
              return updated;
            });

            // Explosion particles
            for (let p = 0; p < 25; p++) {
              g.particles.push({
                x: g.playerX,
                y: g.playerY + 20,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                color: Math.random() > 0.5 ? '#ff0055' : '#ffe600',
              });
            }
            break;
          }

          if (car.y > canvas.height + 100) {
            g.traffic.splice(i, 1);
            setScore((s) => s + 15);
          }
        }

        // Move coins & check collection
        for (let i = g.coins.length - 1; i >= 0; i--) {
          const coin = g.coins[i];
          coin.y += currentSpeed;

          const dx = g.playerX - coin.x;
          const dy = (g.playerY + g.playerH / 2) - coin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 32 && !coin.collected) {
            coin.collected = true;
            sounds.playCoin();
            setScore((s) => s + 50);
            g.coins.splice(i, 1);
          } else if (coin.y > canvas.height + 40) {
            g.coins.splice(i, 1);
          }
        }

        // Turbo Exhaust particles
        if (g.isNitroActive || Math.random() > 0.3) {
          g.particles.push({
            x: g.playerX + (Math.random() - 0.5) * 14,
            y: g.playerY + g.playerH,
            vx: (Math.random() - 0.5) * 2,
            vy: 4 + Math.random() * 4,
            life: g.isNitroActive ? 15 : 8,
            color: g.isNitroActive ? '#00f0ff' : '#ff6600',
          });
        }

        // Update particles
        for (let i = g.particles.length - 1; i >= 0; i--) {
          const pt = g.particles[i];
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.life--;
          if (pt.life <= 0) g.particles.splice(i, 1);
        }
      }

      // RENDER SYNTHWAVE OUTRUN HIGHWAY
      ctx.fillStyle = '#060515';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Synthwave Sunset Horizon
      const grad = ctx.createLinearGradient(0, 0, 0, 140);
      grad.addColorStop(0, '#1a0033');
      grad.addColorStop(1, '#ff007f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, 140);

      // Glowing Neon Sun
      ctx.fillStyle = '#ffe600';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, 110, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Sun horizontal stripes
      ctx.fillStyle = '#060515';
      for (let y = 85; y <= 140; y += 8) {
        ctx.fillRect(canvas.width / 2 - 50, y, 100, 3);
      }

      // Ground / Cyber Grid
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 140, canvas.width, canvas.height - 140);

      // 3D Perspective Road
      ctx.fillStyle = '#111124';
      ctx.beginPath();
      ctx.moveTo(220, 140);
      ctx.lineTo(380, 140);
      ctx.lineTo(540, canvas.height);
      ctx.lineTo(60, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Road Neon Borders (Left & Right)
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(220, 140);
      ctx.lineTo(60, canvas.height);
      ctx.moveTo(380, 140);
      ctx.lineTo(540, canvas.height);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Road Lane Dashed Lines
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 3;
      ctx.setLineDash([25, 20]);
      ctx.lineDashOffset = -g.roadOffset;

      // Lane 1 divider
      ctx.beginPath();
      ctx.moveTo(273, 140);
      ctx.lineTo(220, canvas.height);
      ctx.stroke();

      // Lane 2 divider
      ctx.beginPath();
      ctx.moveTo(327, 140);
      ctx.lineTo(380, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Speed lines when Nitro is active
      if (g.isNitroActive) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const lx = (i * 75 + g.roadOffset * 3) % canvas.width;
          ctx.beginPath();
          ctx.moveTo(lx, 140);
          ctx.lineTo(lx - 40, canvas.height);
          ctx.stroke();
        }
      }

      // Draw Gold Coins
      g.coins.forEach((c) => {
        if (c.y < 130) return;
        ctx.fillStyle = '#ffe600';
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b39800';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Traffic Cars
      g.traffic.forEach((t) => {
        if (t.y < 120) return;
        ctx.fillStyle = t.color;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 10;
        // Car Body
        ctx.fillRect(t.x - t.w / 2, t.y, t.w, t.h);
        // Roof
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(t.x - t.w / 2 + 5, t.y + 16, t.w - 10, t.h - 32);
        // Red Taillights
        ctx.fillStyle = '#ff0033';
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = 8;
        ctx.fillRect(t.x - t.w / 2 + 3, t.y + t.h - 5, 8, 4);
        ctx.fillRect(t.x + t.w / 2 - 11, t.y + t.h - 5, 8, 4);
        ctx.shadowBlur = 0;
      });

      // Draw Exhaust Particles
      g.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
      });

      // Draw PLAYER CYBER SUPERCAR
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 12;

      // Chassis
      ctx.fillRect(g.playerX - g.playerW / 2, g.playerY, g.playerW, g.playerH);

      // Aerodynamic Cockpit Glass
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(g.playerX - g.playerW / 2 + 6, g.playerY + 14, g.playerW - 12, 22);

      // Spoiler Wing
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(g.playerX - g.playerW / 2 - 2, g.playerY + g.playerH - 4, g.playerW + 4, 6);

      // Glowing Cyan Headlight Beams Forward
      ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(g.playerX - 12, g.playerY);
      ctx.lineTo(g.playerX - 35, g.playerY - 90);
      ctx.lineTo(g.playerX + 35, g.playerY - 90);
      ctx.lineTo(g.playerX + 12, g.playerY);
      ctx.closePath();
      ctx.fill();

      // Taillights
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10;
      ctx.fillRect(g.playerX - g.playerW / 2 + 4, g.playerY + g.playerH - 2, 10, 4);
      ctx.fillRect(g.playerX + g.playerW / 2 - 14, g.playerY + g.playerH - 2, 10, 4);

      // Nitro Flame when active
      if (g.isNitroActive) {
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(g.playerX - 6, g.playerY + g.playerH + 2);
        ctx.lineTo(g.playerX, g.playerY + g.playerH + 22 + Math.random() * 8);
        ctx.lineTo(g.playerX + 6, g.playerY + g.playerH + 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      g.reqId = requestAnimationFrame(loop);
    };

    g.reqId = requestAnimationFrame(loop);
    return () => {
      if (g.reqId) cancelAnimationFrame(g.reqId);
    };
  }, [gameState, nitroFuel, score]);

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 max-w-2xl mx-auto w-full">
      {/* Top Header */}
      <div className="w-full bg-[#12122b] p-3 rounded-t-xl border-t-2 border-x-2 border-neon-yellow flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-arcade text-xs text-neon-yellow">🏎️ CYBER HIGHWAY RACER</span>
          <span className="text-[10px] bg-neon-green/20 text-neon-green px-2 py-0.5 rounded font-arcade">
            ₹2 TRIAL SPECIAL
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-arcade">
          <span className="text-white">DIST: <span className="text-neon-cyan">{distance}m</span>/500m</span>
          <span className="text-neon-yellow">SCORE: {score}</span>
        </div>
      </div>

      {/* Nitro Bar */}
      <div className="w-full bg-[#0a0a18] border-x-2 border-neon-yellow px-4 py-1.5 flex items-center gap-3 text-xs">
        <span className="text-[10px] font-arcade text-neon-cyan flex items-center gap-1">
          <Zap size={13} /> NITRO:
        </span>
        <div className="flex-1 bg-gray-800 h-3 rounded-full overflow-hidden border border-gray-700">
          <div
            className={`h-full transition-all ${isNitro ? 'bg-neon-cyan animate-pulse' : 'bg-linear-to-r from-neon-green to-neon-yellow'}`}
            style={{ width: `${nitroFuel}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-gray-400">{Math.floor(nitroFuel)}%</span>
      </div>

      {/* Canvas */}
      <div className="relative w-full border-2 border-neon-yellow bg-[#060515] rounded-b-xl overflow-hidden shadow-neon-yellow">
        <canvas
          ref={canvasRef}
          width={600}
          height={340}
          className="w-full h-auto block"
        />

        {/* Overlay */}
        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
            {gameState === 'READY' ? (
              <>
                <div className="text-neon-yellow text-xs font-arcade mb-1 flex items-center gap-1.5">
                  <Trophy size={14} /> FLAGSHIP ₹2 TRIAL GAME
                </div>
                <h2 className="font-arcade text-xl sm:text-2xl text-white mb-2 tracking-wider">
                  CYBER HIGHWAY RACER
                </h2>
                <p className="text-gray-300 text-xs sm:text-sm max-w-md mb-5">
                  Hit the gas, dodge traffic, and reach 500 meters to conquer the highway! Tap Left/Right to change lanes and hold Nitro for turbo speed.
                </p>
                <button
                  onClick={startRace}
                  className="arcade-btn bg-neon-yellow text-black font-bold px-8 py-3 rounded-xl flex items-center gap-2 shadow-neon-yellow hover:brightness-110"
                >
                  <Play size={18} /> START RACE NOW
                </button>
              </>
            ) : gameState === 'WON' ? (
              <>
                <h2 className="font-arcade text-xl text-neon-green mb-2">🏆 FINISH LINE REACHED!</h2>
                <p className="font-arcade text-xs text-white mb-2">YOU CONQUERED THE 500M HIGHWAY!</p>
                <p className="font-retro text-base text-neon-yellow mb-6">FINAL SCORE: {score} (+20 COINS AWARDED)</p>
                <div className="flex gap-4">
                  <button
                    onClick={startRace}
                    className="arcade-btn bg-neon-green text-black px-5 py-2.5 rounded-xl flex items-center gap-2"
                  >
                    <RotateCcw size={16} /> RACE AGAIN
                  </button>
                  {onExit && (
                    <button
                      onClick={onExit}
                      className="arcade-btn bg-gray-800 text-gray-200 px-5 py-2.5 rounded-xl"
                    >
                      EXIT
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="font-arcade text-xl text-neon-pink mb-2">💥 CAR CRASHED!</h2>
                <p className="font-arcade text-xs text-gray-300 mb-6">
                  DISTANCE: {distance}m / 500m | SCORE: {score} | BEST: {highScore}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={startRace}
                    className="arcade-btn bg-neon-yellow text-black px-5 py-2.5 rounded-xl flex items-center gap-2"
                  >
                    <RotateCcw size={16} /> RETRY RACE
                  </button>
                  {onExit && (
                    <button
                      onClick={onExit}
                      className="arcade-btn bg-gray-800 text-gray-200 px-5 py-2.5 rounded-xl"
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

      {/* Mobile Touch Controls */}
      <div className="w-full mt-3 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onTouchStart={(e) => { e.preventDefault(); steerLeft(); }}
            onMouseDown={steerLeft}
            className="w-16 h-13 bg-gray-800 active:bg-neon-cyan/40 border border-gray-600 rounded-xl flex items-center justify-center text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); steerRight(); }}
            onMouseDown={steerRight}
            className="w-16 h-13 bg-gray-800 active:bg-neon-cyan/40 border border-gray-600 rounded-xl flex items-center justify-center text-white"
          >
            <ArrowRight size={24} />
          </button>
        </div>

        {/* Big NITRO Button */}
        <button
          onTouchStart={(e) => { e.preventDefault(); triggerNitro(true); }}
          onTouchEnd={(e) => { e.preventDefault(); triggerNitro(false); }}
          onMouseDown={() => triggerNitro(true)}
          onMouseUp={() => triggerNitro(false)}
          className={`flex-1 max-w-xs h-13 rounded-xl font-arcade text-xs flex items-center justify-center gap-2 border-2 transition-all ${
            isNitro
              ? 'bg-neon-cyan text-black border-neon-cyan shadow-neon-cyan scale-95 font-bold'
              : 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan active:scale-95'
          }`}
        >
          <Zap size={18} /> HOLD FOR NITRO TURBO
        </button>
      </div>
    </div>
  );
}
