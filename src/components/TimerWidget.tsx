import { useState, useEffect, useRef } from 'react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { Play, Pause } from "@/lib/heroicons"; // ajuste o caminho se necessário

// ============================================================
// SUBCOMPONENTE: FlipDigit (Mantido e aprimorado)
function FlipDigit({ value }: { value: string }) {
  const [prevValue, setPrevValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (value !== prevValue) {
      setIsFlipping(true);
      const timeout = setTimeout(() => {
        setPrevValue(value);
        setIsFlipping(false);
      }, 480);
      return () => clearTimeout(timeout);
    }
  }, [value, prevValue]);

  return (
    <div className="relative w-16 h-24 sm:w-20 sm:h-32 lg:w-28 lg:h-40 xl:w-32 xl:h-44 font-mono font-bold text-white select-none [perspective:1200px]">
      <style>{`
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .anim-top { animation: flip-top-fall 0.24s ease-in forwards; }
        .anim-bottom { animation: flip-bottom-reveal 0.26s ease-out 0.24s forwards; }
        @keyframes flip-top-fall { 0% { transform: rotateX(0deg); } 100% { transform: rotateX(-90deg); } }
        @keyframes flip-bottom-reveal { 0% { transform: rotateX(90deg); } 100% { transform: rotateX(0deg); } }
      `}</style>

      {/* Top base */}
      <div className="absolute top-0 left-0 w-full h-1/2 overflow-hidden rounded-t-2xl bg-gradient-to-b from-[#1f1f22] to-[#161618] border-b border-black/60">
        <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-none">
          {value}
        </div>
      </div>

      {/* Bottom base */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 overflow-hidden rounded-b-2xl bg-gradient-to-b from-[#161618] to-[#0f0f11]">
        <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-none">
          {prevValue}
        </div>
      </div>

      {/* Flipping top */}
      <div className={`absolute top-0 left-0 w-full h-1/2 overflow-hidden rounded-t-2xl bg-gradient-to-b from-[#1f1f22] to-[#161618] border-b border-black/60 [transform-origin:bottom] backface-hidden ${isFlipping ? 'anim-top' : ''}`}>
        <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-none">
          {prevValue}
        </div>
      </div>

      {/* Flipping bottom */}
      <div className={`absolute bottom-0 left-0 w-full h-1/2 overflow-hidden rounded-b-2xl bg-gradient-to-b from-[#161618] to-[#0f0f11] [transform-origin:top] backface-hidden [transform:rotateX(90deg)] ${isFlipping ? 'anim-bottom' : ''}`}>
        <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-none">
          {value}
        </div>
      </div>

      {/* Friso central */}
      <div className="absolute top-1/2 left-0 w-full h-[3px] bg-black/90 z-10 shadow-[0_1px_0_1px_rgba(255,255,255,0.1)]" />
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
export function TimerWidget({
  entityId,
  entityName,
  onTimerStart,
  onTimerStop,
}: {
  entityId: string;
  entityName: string;
  onTimerStart?: (sessionId: string) => void;
  onTimerStop?: (duration: number) => void;
}) {
  const { 
    isTimerActive, 
    getElapsedSeconds, 
    startTimer, 
    stopTimer, 
    getActiveTimer 
  } = useTimeTracking();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const isRunning = isTimerActive(entityId);
  const { data: activeTimer } = getActiveTimer(entityId);
  
  const currentSeconds = isRunning 
    ? getElapsedSeconds(entityId) 
    : (activeTimer?.elapsedSeconds || 0);

  const hrs = String(Math.floor(currentSeconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((currentSeconds % 3600) / 60)).padStart(2, '0');
  const secs = String(currentSeconds % 60).padStart(2, '0');

  const handleStart = async () => {
    try {
      await startTimer(entityId);
      onTimerStart?.(`session-\( {entityId}- \){Date.now()}`);
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleStop = async () => {
    try {
      const activeTimerData = activeTimer;
      if (activeTimerData) {
        await stopTimer({ sessionId: activeTimerData.timerId });
        onTimerStop?.(currentSeconds);
      }
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  // Fullscreen management
  useEffect(() => {
    if (isFullscreen && fullscreenRef.current) {
      fullscreenRef.current.requestFullscreen().catch(console.error);
    } else if (!isFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, []);

  return (
    <div className="p-8 bg-[#0d0d0e] text-white rounded-2xl shadow-2xl max-w-md border border-zinc-800/80">
      <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
        {entityName}
      </span>

      {/* Timer Display */}
      <div className="text-6xl font-mono font-bold text-center my-8 tracking-[0.05em] text-zinc-100">
        {hrs}:{mins}:{secs}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="py-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            <Pause className="w-5 h-5" />
            Stop
          </button>
        )}

        <button
          onClick={() => setIsFullscreen(true)}
          className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition border border-zinc-700"
        >
          Flip Clock
        </button>
      </div>

      {/* FULLSCREEN FLIP CLOCK */}
      {isFullscreen && (
        <div
          ref={fullscreenRef}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-8 right-8 text-3xl text-zinc-500 hover:text-white transition"
          >
            ✕
          </button>

          <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
            <FlipDigit value={hrs[0]} />
            <FlipDigit value={hrs[1]} />

            <div className="flex flex-col gap-3 opacity-40">
              <div className="w-2 h-2 bg-white rounded-full" />
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>

            <FlipDigit value={mins[0]} />
            <FlipDigit value={mins[1]} />

            <div className="flex flex-col gap-3 opacity-40">
              <div className="w-2 h-2 bg-white rounded-full" />
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>

            <FlipDigit value={secs[0]} />
            <FlipDigit value={secs[1]} />
          </div>

          <p className="absolute bottom-12 text-zinc-600 text-sm font-mono tracking-widest">
            PRESSIONE <span className="text-zinc-400">ESC</span> PARA SAIR
          </p>
        </div>
      )}
    </div>
  );
}
