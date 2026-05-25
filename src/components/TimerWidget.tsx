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
    <div className="relative w-14 h-20 sm:w-20 sm:h-28 lg:w-24 lg:h-36 font-mono font-bold text-white select-none [perspective:1000px]">
      
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
      <div className="absolute top-0 left-0 w-full h-1/2 overflow-hidden rounded-t-xl bg-gradient-to-b from-[#1a1a1c] to-[#111112] border-b border-black/50">
        <div className="absolute top-0 left-0 w-full h-[200%] flex items-center justify-center text-4xl sm:text-6xl lg:text-8xl leading-none">
          {value}
        </div>
      </div>

      {/* 2. BASE DE BAIXO */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 overflow-hidden rounded-b-xl bg-gradient-to-b from-[#111112] to-[#09090a]">
        <div className="absolute bottom-0 left-0 w-full h-[200%] flex items-center justify-center text-4xl sm:text-6xl lg:text-8xl leading-none">
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
    <div className="p-6 bg-[#0d0d0e] text-white rounded-xl shadow-2xl max-w-sm border border-zinc-800/80">
      <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
        {entityName}
      </span>

      <div className="text-4xl font-mono font-bold text-center my-6 tracking-widest text-zinc-100">
        {hrs}:{mins}:{secs}
      </div>

      {timerLoading && (
        <p className="text-xs text-zinc-600 text-center mb-2">Carregando timer...</p>
      )}

      {/* BOTÕES — MONOCROMÁTICOS */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={isStarting || timerLoading}
            className="py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold rounded-lg transition text-sm disabled:opacity-50"
          >
            {isStarting ? 'Iniciando...' : 'Start Timer'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={isStopping || timerLoading}
            className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-semibold rounded-lg transition text-sm border border-zinc-800 disabled:opacity-50"
          >
            {isStopping ? 'Salvando...' : 'Stop Timer'}
          </button>
        )}
        {/* Reset só disponível quando parado — limpa visualmente mas não apaga o histórico */}
        <button
          onClick={() => {/* reset visual não é necessário: o tempo vem do hook */}}
          disabled={isRunning || timerLoading}
          className="py-2.5 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 font-semibold rounded-lg transition text-sm border border-zinc-800/50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      <button
        onClick={() => setIsFullscreen(true)}
        className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-lg text-xs tracking-wider uppercase transition text-center border border-zinc-800"
      >
        Go to Flip Clock
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

          <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
            <FlipDigit value={hrs[0]} />
            <FlipDigit value={hrs[1]} />

            <div className="flex flex-col gap-2 sm:gap-4 px-1 opacity-40 animate-pulse">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></span>
            </div>

            <FlipDigit value={mins[0]} />
            <FlipDigit value={mins[1]} />

            <div className="flex flex-col gap-2 sm:gap-4 px-1 opacity-40 animate-pulse">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></span>
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
