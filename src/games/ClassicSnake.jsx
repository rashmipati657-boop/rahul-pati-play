import React, { useEffect, useRef, useState } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play } from 'lucide-react';

const GRID_SIZE = 20;

export default function ClassicSnake({ onExit }) {
  const [snake, setSnake] = useState([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [direction, setDirection] = useState('UP'); // UP, DOWN, LEFT, RIGHT
  const [gameState, setGameState] = useState('READY'); // READY, PLAYING, GAMEOVER
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('nokia_snake_high') || '0', 10);
  });

  const nextDirRef = useRef('UP');
  const dirRef = useRef('UP');
  dirRef.current = direction;

  const spawnFood = (currSnake) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const collision = currSnake.some((s) => s.x === newFood.x && s.y === newFood.y);
      if (!collision) break;
    }
    return newFood;
  };

  const changeDirection = (newDir) => {
    const cur = dirRef.current;
    if (newDir === 'UP' && cur !== 'DOWN') nextDirRef.current = 'UP';
    if (newDir === 'DOWN' && cur !== 'UP') nextDirRef.current = 'DOWN';
    if (newDir === 'LEFT' && cur !== 'RIGHT') nextDirRef.current = 'LEFT';
    if (newDir === 'RIGHT' && cur !== 'LEFT') nextDirRef.current = 'RIGHT';
  };

  const startGame = () => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    setSnake(initialSnake);
    setDirection('UP');
    nextDirRef.current = 'UP';
    setFood(spawnFood(initialSnake));
    setScore(0);
    setGameState('PLAYING');
    sounds.playCoin();
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        changeDirection('UP');
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        changeDirection('DOWN');
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        changeDirection('LEFT');
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        changeDirection('RIGHT');
      } else if (e.code === 'Space' && gameState !== 'PLAYING') {
        e.preventDefault();
        startGame();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const moveInterval = Math.max(70, 150 - Math.floor(score / 5) * 8);

    const timer = setInterval(() => {
      setDirection(nextDirRef.current);
      setSnake((prevSnake) => {
        const head = { ...prevSnake[0] };
        const dir = nextDirRef.current;

        if (dir === 'UP') head.y -= 1;
        if (dir === 'DOWN') head.y += 1;
        if (dir === 'LEFT') head.x -= 1;
        if (dir === 'RIGHT') head.x += 1;

        // Wall Collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          sounds.playGameOver();
          setGameState('GAMEOVER');
          setHighScore((prev) => {
            const updated = Math.max(prev, score);
            localStorage.setItem('nokia_snake_high', updated.toString());
            return updated;
          });
          return prevSnake;
        }

        // Self Collision
        if (prevSnake.some((segment) => segment.x === head.x && segment.y === head.y)) {
          sounds.playGameOver();
          setGameState('GAMEOVER');
          setHighScore((prev) => {
            const updated = Math.max(prev, score);
            localStorage.setItem('nokia_snake_high', updated.toString());
            return updated;
          });
          return prevSnake;
        }

        // Eat Food
        const newSnake = [head, ...prevSnake];
        if (head.x === food.x && head.y === food.y) {
          sounds.playCoin();
          const newScore = score + 1;
          setScore(newScore);
          setFood(spawnFood(newSnake));
          if (newScore > highScore) {
            confetti({ particleCount: 30, spread: 50 });
          }
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, moveInterval);

    return () => clearInterval(timer);
  }, [gameState, food, score, highScore]);

  return (
    <div className="flex flex-col items-center justify-center p-3 max-w-lg mx-auto">
      {/* Nokia Phone Frame / Top Header */}
      <div className="w-full bg-[#1b2b1b] border-4 border-[#334d33] rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#2d422d] text-[#8fa876] font-arcade text-xs">
          <span>🐍 NOKIA SNAKE</span>
          <span>SCORE: <span className="text-[#a4f999]">{score}</span></span>
          <span>HIGH: {highScore}</span>
        </div>

        {/* LCD Screen */}
        <div className="relative aspect-square w-full max-w-[340px] mx-auto mt-3 bg-[#9bbc0f] p-2 rounded border-4 border-[#8bac0f] shadow-inner">
          {/* Pixel Grid */}
          <div
            className="w-full h-full grid"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
              const x = idx % GRID_SIZE;
              const y = Math.floor(idx / GRID_SIZE);

              const isHead = snake[0]?.x === x && snake[0]?.y === y;
              const isBody = snake.slice(1).some((s) => s.x === x && s.y === y);
              const isFood = food.x === x && food.y === y;

              let cellStyle = 'bg-transparent';
              if (isHead) cellStyle = 'bg-[#0f380f] rounded-xs';
              else if (isBody) cellStyle = 'bg-[#1e481e]';
              else if (isFood) cellStyle = 'bg-[#0f380f] animate-ping';

              return (
                <div key={idx} className="p-[0.5px]">
                  <div className={`w-full h-full ${cellStyle}`} />
                </div>
              );
            })}
          </div>

          {/* Overlays */}
          {gameState !== 'PLAYING' && (
            <div className="absolute inset-0 bg-[#0f380f]/90 flex flex-col items-center justify-center text-center p-4">
              {gameState === 'READY' ? (
                <>
                  <div className="font-arcade text-sm text-[#9bbc0f] mb-3">RETRO SNAKE 3310</div>
                  <p className="text-xs text-[#8bac0f] mb-4">Feed the pixel snake. Do not hit the screen edges!</p>
                  <button
                    onClick={startGame}
                    className="px-4 py-2 bg-[#9bbc0f] text-[#0f380f] font-arcade text-xs font-bold rounded flex items-center gap-1 hover:brightness-110"
                  >
                    <Play size={14} /> START GAME
                  </button>
                </>
              ) : (
                <>
                  <div className="font-arcade text-sm text-[#ff6666] mb-2">GAME OVER</div>
                  <div className="text-xs font-arcade text-[#9bbc0f] mb-4">FINAL SCORE: {score}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={startGame}
                      className="px-3 py-1.5 bg-[#9bbc0f] text-[#0f380f] font-arcade text-xs font-bold rounded flex items-center gap-1"
                    >
                      <RotateCcw size={14} /> RETRY
                    </button>
                    {onExit && (
                      <button
                        onClick={onExit}
                        className="px-3 py-1.5 bg-[#306230] text-[#9bbc0f] font-arcade text-xs rounded"
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

        {/* Retro Mobile D-PAD */}
        <div className="mt-4 flex flex-col items-center">
          <button
            onClick={() => changeDirection('UP')}
            className="w-12 h-12 bg-[#2d422d] active:bg-[#476347] rounded-t-lg flex items-center justify-center text-[#9bbc0f] shadow"
          >
            <ArrowUp size={22} />
          </button>
          <div className="flex gap-2 my-1">
            <button
              onClick={() => changeDirection('LEFT')}
              className="w-12 h-12 bg-[#2d422d] active:bg-[#476347] rounded-l-lg flex items-center justify-center text-[#9bbc0f] shadow"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="w-12 h-12 bg-[#1b2b1b] rounded flex items-center justify-center text-[9px] font-arcade text-[#4a634a]">
              OK
            </div>
            <button
              onClick={() => changeDirection('RIGHT')}
              className="w-12 h-12 bg-[#2d422d] active:bg-[#476347] rounded-r-lg flex items-center justify-center text-[#9bbc0f] shadow"
            >
              <ArrowRight size={22} />
            </button>
          </div>
          <button
            onClick={() => changeDirection('DOWN')}
            className="w-12 h-12 bg-[#2d422d] active:bg-[#476347] rounded-b-lg flex items-center justify-center text-[#9bbc0f] shadow"
          >
            <ArrowDown size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
