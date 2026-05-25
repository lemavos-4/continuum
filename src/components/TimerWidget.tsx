import { useState, useEffect, useRef } from 'react';
import { useTimeTracking } from '@/hooks/useTimeTracking';

// ============================================================
// SUBCOMPONENTE: FlipDigit (Alinhamento Robusto e Sem Falhas)
// ============================================================
function FlipDigit({ value }: { value: string }) {
  const [prevValue, setPrevValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (value !== prevValue) {
      setIsFlipping(true);
      const timeout = setTimeout(() => {
        setPrevValue(value);
        setIsFlipping(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [value, prevValue]);

  return (
    <div className="relative w-32 h-48 sm:w-56 sm:h-80 lg:w-80 lg:h-96 font-mono font-bold text-white select-none [perspective:1000px]">
      
      <style>{`
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .anim-top { animation: flip-top-fall 0.25s ease-in forwards; }
        .anim-bottom { animation: flip-bottom-reveal 0.25s ease-out 0.25s forwards; }
        @keyframes flip-top-fall { 0% { transform: rotateX(0deg); } 100% { transform: rotateX(-90deg); } }
        @keyframes flip-bottom-reveal { 0% { transform: rotateX(90deg); } 100% { transform: rotateX(0deg); } }
      `}</style>

      {/* 1. TOPO BASE */}
      <div className="absolute top-0 left-0 w-full h-1/2 overflow-hidden rounded-t-2xl bg-gradient-to-b from-[#1a1a1c] to-[#111112] border-b border-black/50">
        <div className="absolute top-0 left-0 w-full h-[200%] flex items-center justify-center text-8xl sm:text-9xl lg:text-[160px] leading-none">
          {value}
        </div>
      </div>

      {/* 2. BASE DE BAIXO */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 overflow-hidden rounded-b-2xl bg-gradient-to-b from-[#111112] to-[#09090a]">
        <div className="absolute bottom-0 left-0 w-full h-[200%] flex items-center justify-center text-8xl sm:text-9xl lg:text-[160px] leading-none">
          {prevValue}
        </div>
      </div>

      {/* 3. CARTA QUE CAI DE CIMA */}
      <div className={`absolute top-0 left-0 w-full h-1/2 overflow-hidden rounded-t-xl bg-gradient-to-b from-[#1a1a1c] to-[#111112] border-b border-black/50 [transform-origin:bottom] backface-hidden ${isFlipping ? 'anim-top' : ''}`}>
        <div className="absolute top-0 left-0 w-full h-[200%] flex items-center justify-center text-4xl sm:text-6xl lg:text-8xl leading-none">
          {prevValue}
        </div>
      </div>

      {/* 4. CARTA QUE APARECE EM BAIXO */}
      <div className={`absolute bottom-0 left-0 w-full h-1/2 overflow-hidden rounded-b-xl bg-gradient-to-b from-[#111112] to-[#09090a] [transform-origin:top] backface-hidden [transform:rotateX(90deg)] ${isFlipping ? 'anim-bottom' : ''}`}>
        <div className="absolute bottom-0 left-0 w-full h-[200%] flex items-center justify-center text-4xl sm:text-6xl lg:text-8xl leading-none">
          {value}
        </div>
      </div>

      {/* FRISO CENTRAL */}
      <div className="absolute top-[calc(50%-1px)] left-0 w-full h-[2px] bg-black/80 z-10 shadow-[0_1px_0px_rgba(255,255,255,0.08)]"></div>
    </div>
  );
}

// ============================================================
// INTERFACES
// ============================================================
interface TimerWidgetProps {
  entityId: string;
  entityName: string;
  onTimerStart?: (sessionId: string) => void;
  onTimerStop?: (duration: number) => void;
  compact?: boolean;
}

// ============================================================
// COMPONENTE PRINCIPAL: TimerWidget
// Visual do novo + lógica de save do antigo (useTimeTracking)
// ============================================================
export function TimerWidget({
  entityId,
  entityName,
  onTimerStart,
  onTimerStop,
  compact = false,
}: TimerWidgetProps) {
  const {
    activeTimers,
    isTimerActive,
    getElapsedSeconds,
    startTimer,
    stopTimer,
    isStarting,
    isStopping,
    getActiveTimer,
    formatSeconds,
  } = useTimeTracking();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);

  const { data: activeTimer, isLoading: timerLoading } = getActiveTimer(entityId);
  const isRunning = isTimerActive(entityId);

  const currentElapsed = isRunning
    ? getElapsedSeconds(entityId)
    : (activeTimer?.elapsedSeconds || 0);

  const timeString = formatSeconds(currentElapsed);

  // Deriva dígitos do timeString "HH:MM:SS"
  const [hh, mm, ss] = timeString.split(':');
  const hrs = (hh || '00').padStart(2, '0');
  const mins = (mm || '00').padStart(2, '0');
  const secs = (ss || '00').padStart(2, '0');

  // Gerencia ativação do Fullscreen Nativo
  useEffect(() => {
    if (isFullscreen) {
      const elem = fullscreenContainerRef.current;
      if (elem?.requestFullscreen) {
        elem.requestFullscreen().catch((err) => console.warn('Erro ao forçar fullscreen:', err));
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => console.warn(err));
      }
    }
  }, [isFullscreen]);

  // Sincroniza se o usuário sair do fullscreen pelo botão nativo
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleStart = async () => {
    try {
      await startTimer(entityId);
      onTimerStart?.(entityId);
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleStop = async () => {
    try {
      const activeTimerData = activeTimers.get(entityId);
      if (activeTimerData) {
        await stopTimer({ sessionId: activeTimerData.timerId });
        onTimerStop?.(currentElapsed);
      }
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  // Modo compacto (igual ao antigo)
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-zinc-400">{timeString}</span>
        {isRunning ? (
          <button
            onClick={handleStop}
            disabled={isStopping}
            title="Stop timer"
            className="h-6 w-6 flex items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition text-xs"
          >
            ■
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={isStarting}
            title="Start timer"
            className="h-6 w-6 flex items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition text-xs"
          >
            ▶
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-slate-900/80 via-slate-950 to-black text-white rounded-2xl shadow-2xl max-w-sm border border-slate-800/60 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Active Timer</p>
          <h3 className="text-lg font-semibold tracking-tight text-white">{entityName}</h3>
        </div>
        {isRunning && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-emerald-300">Recording</span>
          </div>
        )}
      </div>

      <div className="relative mb-8 py-6 px-4 bg-black/50 rounded-xl border border-slate-800/40 backdrop-blur">
        <div className="text-5xl sm:text-6xl font-mono font-bold text-center tracking-tight text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text">
          {hrs}:{mins}:{secs}
        </div>
        <p className="text-center text-xs text-slate-500 mt-3 font-mono">Hours • Minutes • Seconds</p>
      </div>

      {timerLoading && (
        <p className="text-xs text-slate-500 text-center mb-4 animate-pulse">Loading timer…</p>
      )}

      {/* BOTÕES PRINCIPAIS */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={isStarting || timerLoading}
            className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-lg transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/50 hover:shadow-xl active:scale-95"
          >
            {isStarting ? '…' : '▶ Start'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={isStopping || timerLoading}
            className="py-3 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold rounded-lg transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/50 hover:shadow-xl active:scale-95"
          >
            {isStopping ? '…' : '⏹ Stop'}
          </button>
        )}
        <button
          onClick={() => {/* reset visual não é necessário: o tempo vem do hook */}}
          disabled={isRunning || timerLoading}
          className="py-3 px-4 bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg transition-all duration-200 text-sm border border-slate-700/40 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        >
          ⟲ Reset
        </button>
      </div>

      <button
        onClick={() => setIsFullscreen(true)}
        className="w-full py-3 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-100 font-semibold rounded-lg text-xs tracking-widest uppercase transition-all duration-200 border border-slate-700/40 hover:border-slate-600/60 active:scale-95"
      >
        ⛶ Fullscreen Mode
      </button>

      {/* FULLSCREEN COM FLIPDIGIT ANIMADO */}
      {isFullscreen && (
        <div
          ref={fullscreenContainerRef}
          className="fixed inset-0 w-screen h-[100dvh] z-50 flex flex-col justify-center items-center bg-black select-none"
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 text-slate-600 hover:text-white text-2xl font-light w-12 h-12 flex items-center justify-center rounded-full border border-slate-800 hover:border-slate-600 transition bg-black hover:bg-slate-900"
          >
            ✕
          </button>

          <div className="flex items-center gap-6 sm:gap-8 lg:gap-12">
            <FlipDigit value={hrs[0]} />
            <FlipDigit value={hrs[1]} />

            <div className="flex flex-col gap-4 sm:gap-8 lg:gap-12 px-2 opacity-40 animate-pulse">
              <span className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-white rounded-full"></span>
              <span className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-white rounded-full"></span>
            </div>

            <FlipDigit value={mins[0]} />
            <FlipDigit value={mins[1]} />

            <div className="flex flex-col gap-4 sm:gap-8 lg:gap-12 px-2 opacity-40 animate-pulse">
              <span className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-white rounded-full"></span>
              <span className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-white rounded-full"></span>
            </div>

            <FlipDigit value={secs[0]} />
            <FlipDigit value={secs[1]} />
          </div>

          <div className="absolute bottom-10 text-[10px] font-mono tracking-widest text-zinc-700 uppercase hidden sm:block">
            Press{' '}
            <span className="text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-900">
              ESC
            </span>{' '}
            to exit
          </div>
        </div>
      )}
    </div>
  );
}
