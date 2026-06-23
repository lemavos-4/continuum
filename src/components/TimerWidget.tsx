import { useState, useEffect, useRef } from 'react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useTodayTimeStats } from '@/hooks/useTodayTimeStats';


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
    <div className="relative w-20 h-28 sm:w-28 sm:h-40 lg:w-32 lg:h-48 font-mono font-bold text-white select-none [perspective:1000px]">
      
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
        <div className="absolute top-0 left-0 w-full h-[200%] flex items-center justify-center text-6xl sm:text-8xl lg:text-9xl leading-none">
          {value}
        </div>
      </div>

      {/* 2. BASE DE BAIXO */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 overflow-hidden rounded-b-xl bg-gradient-to-b from-[#111112] to-[#09090a]">
        <div className="absolute bottom-0 left-0 w-full h-[200%] flex items-center justify-center text-6xl sm:text-8xl lg:text-9xl leading-none">
          {prevValue}
        </div>
      </div>

      {/* 3. CARTA QUE CAI DE CIMA */}
      <div className={`absolute top-0 left-0 w-full h-1/2 overflow-hidden rounded-t-xl bg-gradient-to-b from-[#1a1a1c] to-[#111112] border-b border-black/50 [transform-origin:bottom] backface-hidden ${isFlipping ? 'anim-top' : ''}`}>
        <div className="absolute top-0 left-0 w-full h-[200%] flex items-center justify-center text-6xl sm:text-8xl lg:text-9xl leading-none">
          {prevValue}
        </div>
      </div>

      {/* 4. CARTA QUE APARECE EM BAIXO */}
      <div className={`absolute bottom-0 left-0 w-full h-1/2 overflow-hidden rounded-b-xl bg-gradient-to-b from-[#111112] to-[#09090a] [transform-origin:top] backface-hidden [transform:rotateX(90deg)] ${isFlipping ? 'anim-bottom' : ''}`}>
        <div className="absolute bottom-0 left-0 w-full h-[200%] flex items-center justify-center text-6xl sm:text-8xl lg:text-9xl leading-none">
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
    isTimerPaused,
    pauseTimer,
    resumeTimer,
  } = useTimeTracking();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: activeTimer, isLoading: timerLoading } = getActiveTimer(entityId);
  const isRunning = isTimerActive(entityId);
  const isPaused = isTimerPaused(entityId);
  const today = useTodayTimeStats(entityId);



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
        elem.requestFullscreen()
          .then(() => {
            // After entering fullscreen, lock to landscape on mobile devices.
            const isCoarse =
              typeof window !== 'undefined' &&
              (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768);
            if (isCoarse) {
              const orientation = (screen as any)?.orientation;
              if (orientation && typeof orientation.lock === 'function') {
                orientation.lock('landscape').catch((err: unknown) => {
                  console.warn('Orientation lock unavailable:', err);
                });
              }
            }
          })
          .catch((err) => console.warn('Erro ao forçar fullscreen:', err));
      }
    } else {
      const orientation = (screen as any)?.orientation;
      if (orientation && typeof orientation.unlock === 'function') {
        try { orientation.unlock(); } catch (err) { console.warn(err); }
      }
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

  const handlePauseToggle = () => {
    if (!isRunning) return;
    if (isPaused) resumeTimer(entityId);
    else pauseTimer(entityId);
  };

  const handleRestart = async () => {
    try {
      const activeTimerData = activeTimers.get(entityId);
      if (activeTimerData) {
        await stopTimer({ sessionId: activeTimerData.timerId });
      }
      await startTimer(entityId);
    } catch (error) {
      console.error('Failed to restart timer:', error);
    }
  };

  // Reveal hover controls; auto-hide on touch after a brief delay.
  const revealControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2000);
  };

  // On entering fullscreen: briefly reveal controls, then auto-hide after 2s.
  useEffect(() => {
    if (!isFullscreen) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2000);
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isFullscreen]);


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
    <div className="border border-white/5 bg-white/[0.01] rounded-sm p-5 text-white max-w-sm">
      {/* Header — Activity aesthetic */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/30 font-mono">Timer</p>
          <h3 className="mt-1 font-serif text-xl text-white truncate max-w-[14rem]">{entityName}</h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          {isRunning ? (isPaused ? "Paused" : "Running") : "Idle"}
        </span>
      </div>

      {/* Clock readout */}
      <div className={`font-mono text-5xl sm:text-6xl text-center my-5 tracking-widest tabular-nums transition-colors ${isPaused ? 'text-white/50' : 'text-white'}`}>
        {hrs}:{mins}:{secs}
      </div>

      {timerLoading && (
        <p className="text-[10px] uppercase tracking-widest font-mono text-white/40 text-center mb-3">Loading timer…</p>
      )}

      {/* CONTROLS */}
      <div className="grid grid-cols-3 gap-px bg-white/5 mb-3">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={isStarting || timerLoading}
            className="col-span-2 py-3 bg-black/40 hover:bg-white/[0.06] text-white font-mono text-[11px] uppercase tracking-[0.28em] transition disabled:opacity-50"
          >
            {isStarting ? 'Starting…' : 'Start'}
          </button>
        ) : (
          <>
            <button
              onClick={handlePauseToggle}
              disabled={timerLoading}
              className="py-3 bg-black/40 hover:bg-white/[0.06] text-white font-mono text-[11px] uppercase tracking-[0.28em] transition disabled:opacity-50"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={handleStop}
              disabled={isStopping || timerLoading}
              className="py-3 bg-black/40 hover:bg-white/[0.06] text-white/70 hover:text-white font-mono text-[11px] uppercase tracking-[0.28em] transition disabled:opacity-50"
            >
              {isStopping ? '…' : 'Stop'}
            </button>
          </>
        )}
        <button
          onClick={handleRestart}
          disabled={!isRunning || timerLoading}
          className="py-3 bg-black/40 hover:bg-white/[0.06] text-white/50 hover:text-white font-mono text-[11px] uppercase tracking-[0.28em] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Restart
        </button>
      </div>

      <button
        onClick={() => setIsFullscreen(true)}
        className="w-full py-2.5 border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] text-white/60 hover:text-white font-mono text-[10px] uppercase tracking-[0.32em] rounded-sm transition"
      >
        Flip Clock
      </button>

      {/* TODAY SECTION — Activity stat grid */}
      <div className="mt-5 grid grid-cols-3 gap-px bg-white/5">
        <SummaryStat label="Today" value={formatSeconds(today.todaySeconds + (isRunning ? currentElapsed : 0))} />
        <SummaryStat label="Sessions" value={today.todayEntriesCount} />
        <SummaryStat label="Avg" value={formatSeconds(today.avgEntrySeconds)} />
      </div>



      {/* FULLSCREEN COM FLIPDIGIT ANIMADO */}
      {isFullscreen && (
        <div
          ref={fullscreenContainerRef}
          onMouseMove={revealControls}
          onMouseLeave={() => setShowControls(false)}
          onTouchStart={revealControls}
          className="fixed inset-0 w-screen h-[100dvh] z-50 flex flex-col justify-center items-center bg-black select-none group"
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 text-slate-600 hover:text-white text-2xl font-light w-12 h-12 flex items-center justify-center rounded-full border border-slate-800 hover:border-slate-600 transition bg-black hover:bg-slate-900 z-10"
          >
            ✕
          </button>

          {/* Entity name in fullscreen */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[11px] sm:text-xs font-mono tracking-[0.3em] text-zinc-600 uppercase">
            {entityName}{isPaused && <span className="ml-3 text-zinc-400">· paused</span>}
          </div>

          <div className={`flex items-center gap-1.5 sm:gap-3 md:gap-4 transition-opacity ${isPaused ? 'opacity-60' : 'opacity-100'}`}>
            <FlipDigit value={hrs[0]} />
            <FlipDigit value={hrs[1]} />

            <div className={`flex flex-col gap-2 sm:gap-4 px-1 opacity-40 ${isPaused ? '' : 'animate-pulse'}`}>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></span>
            </div>

            <FlipDigit value={mins[0]} />
            <FlipDigit value={mins[1]} />

            <div className={`flex flex-col gap-2 sm:gap-4 px-1 opacity-40 ${isPaused ? '' : 'animate-pulse'}`}>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></span>
            </div>

            <FlipDigit value={secs[0]} />
            <FlipDigit value={secs[1]} />
          </div>

          {/* Hover / tap-revealed controls */}
          <div
            className={`absolute bottom-20 sm:bottom-24 flex items-center gap-3 sm:gap-4 transition-all duration-300 ${
              showControls || isPaused ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
            } group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto`}
          >
            <button
              onClick={handlePauseToggle}
              disabled={!isRunning}
              title={isPaused ? 'Resume' : 'Pause'}
              className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/80 backdrop-blur text-zinc-200 hover:bg-zinc-900 hover:border-zinc-600 transition disabled:opacity-30"
            >
              {isPaused ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
              )}
            </button>
            <button
              onClick={handleRestart}
              disabled={!isRunning}
              title="Restart"
              className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/80 backdrop-blur text-zinc-300 hover:bg-zinc-900 hover:border-zinc-600 transition disabled:opacity-30"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>
            </button>
            <button
              onClick={handleStop}
              disabled={!isRunning || isStopping}
              title="Stop"
              className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/80 backdrop-blur text-zinc-200 hover:bg-zinc-900 hover:border-red-900/60 hover:text-red-200 transition disabled:opacity-30"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>
            </button>
          </div>

          <div className="absolute bottom-6 sm:bottom-10 text-[10px] font-mono tracking-widest text-zinc-700 uppercase">
            <span className="hidden sm:inline">
              Press <span className="text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-900">ESC</span> to exit
            </span>
            <span className="sm:hidden">Tap to reveal controls</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-black/40 p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/30">{label}</p>
      <p className="mt-1.5 font-serif text-lg text-white tabular-nums">{value}</p>
    </div>
  );
}


