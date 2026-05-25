import { useState, useEffect, useRef } from 'react';

// ============================================================
// SUBCOMPONENTE: FlipDigit (Alinhamento Robusto e Sem Falhas)
// ============================================================
function FlipDigit({ value }) {
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
        <div className="absolute bottom-0 left-0 w-full h-[200%] flex items-center justify-center text-4xl sm:text-6xl lg:text-8xl leading-none bottom-0">
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
        <div className="absolute bottom-0 left-0 w-full h-[200%] flex items-center justify-center text-4xl sm:text-6xl lg:text-8xl leading-none bottom-0">
          {value}
        </div>
      </div>

      {/* FRISO CENTRAL */}
      <div className="absolute top-[calc(50%-1px)] left-0 w-full h-[2px] bg-black/80 z-10 shadow-[0_1px_0px_rgba(255,255,255,0.08)]"></div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL: TimerWidget (Visual Mono + Real Fullscreen)
// ============================================================
export function TimerWidget({ entityId, entityName, onTimerStart, onTimerStop }) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef(null);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Gerencia ativação do Fullscreen Nativo da Tela
  useEffect(() => {
    if (isFullscreen) {
      const elem = fullscreenContainerRef.current;
      if (elem && elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => console.log("Erro ao forçar fullscreen:", err));
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => console.log(err));
      }
    }
  }, [isFullscreen]);

  // Sincroniza se o usuário sair do fullscreen pelo botão nativo do celular
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

  const handleStart = () => {
    setIsActive(true);
    if (onTimerStart) onTimerStart(`session-${entityId}-${Date.now()}`);
  };

  const handleStop = () => {
    setIsActive(false);
    if (onTimerStop) onTimerStop(seconds);
  };

  const handleReset = () => {
    setIsActive(false);
    setSeconds(0);
  };

  const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return (
    <div className="p-6 bg-[#0d0d0e] text-white rounded-xl shadow-2xl max-w-sm border border-zinc-800/80">
      <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">{entityName}</span>
      
      <div className="text-4xl font-mono font-bold text-center my-6 tracking-widest text-zinc-100">
        {hrs}:{mins}:{secs}
      </div>

      {/* BOTOES DO PAINEL — AGORA 100% MONOCROMÁTICOS */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {!isActive ? (
          <button onClick={handleStart} className="py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold rounded-lg transition text-sm">
            Start Timer
          </button>
        ) : (
          <button onClick={handleStop} className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-semibold rounded-lg transition text-sm border border-zinc-800">
            Stop Timer
          </button>
        )}
        <button onClick={handleReset} className="py-2.5 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 font-semibold rounded-lg transition text-sm border border-zinc-800/50">
          Reset
        </button>
      </div>

      <button
        onClick={() => setIsFullscreen(true)}
        className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-lg text-xs tracking-wider uppercase transition text-center border border-zinc-800"
      >
        Go to Flip Clock
      </button>

      {/* MODAL MODIFICADO PARA FULLSCREEN REAL (NATIVO) */}
      {isFullscreen && (
        <div 
          ref={fullscreenContainerRef}
          className="fixed inset-0 w-screen h-[100dvh] z-50 flex flex-col justify-center items-center bg-black select-none"
        >
          <button 
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 text-zinc-600 hover:text-white text-2xl font-light w-12 h-12 flex items-center justify-center rounded-full border border-zinc-900 hover:border-zinc-700 transition bg-black"
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
            Press <span className="text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-900">ESC</span> to exit
          </div>
        </div>
      )}
    </div>
  );
}
