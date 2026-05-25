import { useState, useEffect } from 'react';

// ============================================================
// SUBCOMPONENTE: FlipDigit (À prova de falhas e sem CSS externo)
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
      }, 500); // 0.5s de animação total
      return () => clearTimeout(timeout);
    }
  }, [value, prevValue]);

  return (
    <div className="relative w-14 h-20 sm:w-20 sm:h-28 lg:w-24 lg:h-36 font-mono font-bold text-white select-none [perspective:1000px]">
      
      {/* Injeção de estilo local para garantir que o Lovable nunca perca as animações */}
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

      {/* 1. TOPO BASE (Mostra o novo número atrás) */}
      <div className="absolute top-0 left-0 w-full h-1/2 overflow-hidden rounded-t-xl bg-gradient-to-b from-[#1c1c1e] to-[#111111] border-b border-black/40">
        <div className="absolute top-0 left-0 w-full h-[200%] flex items-center justify-center text-4xl sm:text-6xl lg:text-8xl">
          {value}
        </div>
      </div>

      {/* 2. BASE DE BAIXO (Mostra o número antigo enquanto a carta não cai) */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 overflow-hidden rounded-b-xl bg-gradient-to-b from-[#111111] to-[#0a0a0a]">
        <div className="absolute bottom-0 left-0 w-full h-[200%] flex items-center justify-center text-4xl sm:text-6xl lg:text-8xl bottom-0">
          {prevValue}
        </div>
      </div>

      {/* 3. CARTA QUE CAI DE CIMA (Número antigo virando para baixo) */}
      <div className={`absolute top-0 left-0 w-full h-1/2 overflow-hidden rounded-t-xl bg-gradient-to-b from-[#1c1c1e] to-[#111111] border-b border-black/40 [transform-origin:bottom] backface-hidden ${isFlipping ? 'anim-top' : ''}`}>
        <div className="absolute top-0 left-0 w-full h-[200%] flex items-center justify-center text-4xl sm:text-6xl lg:text-8xl">
          {prevValue}
        </div>
      </div>

      {/* 4. CARTA QUE APARECE EM BAIXO (Novo número se revelando) */}
      <div className={`absolute bottom-0 left-0 w-full h-1/2 overflow-hidden rounded-b-xl bg-gradient-to-b from-[#111111] to-[#0a0a0a] [transform-origin:top] backface-hidden [transform:rotateX(90deg)] ${isFlipping ? 'anim-bottom' : ''}`}>
        <div className="absolute bottom-0 left-0 w-full h-[200%] flex items-center justify-center text-4xl sm:text-6xl lg:text-8xl bottom-0">
          {value}
        </div>
      </div>

      {/* FRISO CENTRAL (A linha física do meio do relógio) */}
      <div className="absolute top-[calc(50%-1px)] left-0 w-full h-[2px] bg-black/70 z-10 shadow-[0_1px_0px_rgba(255,255,255,0.15)]"></div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL: TimerWidget
// ============================================================
export function TimerWidget({ entityId, entityName, onTimerStart, onTimerStop }) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    <div className="p-6 bg-gray-900 text-white rounded-xl shadow-xl max-w-sm border border-gray-800">
      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">{entityName}</span>
      
      <div className="text-4xl font-mono font-bold text-center my-6 tracking-widest text-gray-100">
        {hrs}:{mins}:{secs}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {!isActive ? (
          <button onClick={handleStart} className="py-2 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-lg transition">
            Start Timer
          </button>
        ) : (
          <button onClick={handleStop} className="py-2 bg-rose-600 hover:bg-rose-500 font-semibold rounded-lg transition">
            Stop Timer
          </button>
        )}
        <button onClick={handleReset} className="py-2 bg-gray-800 hover:bg-gray-700 font-semibold rounded-lg transition">
          Reset
        </button>
      </div>

      <button
        onClick={() => setIsFullscreen(true)}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-lg text-sm transition text-center"
      >
        Go to Flip Clock
      </button>

      {/* TELA CHEIA */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-center items-center bg-black select-none">
          <button 
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 text-gray-500 hover:text-white text-2xl font-light w-12 h-12 flex items-center justify-center rounded-full border border-gray-800 hover:border-gray-600 transition"
          >
            ✕
          </button>

          <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
            <FlipDigit value={hrs[0]} />
            <FlipDigit value={hrs[1]} />
            
            <div className="flex flex-col gap-2 sm:gap-4 px-1 opacity-60 animate-pulse">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></span>
            </div>

            <FlipDigit value={mins[0]} />
            <FlipDigit value={mins[1]} />

            <div className="flex flex-col gap-2 sm:gap-4 px-1 opacity-60 animate-pulse">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></span>
            </div>

            <FlipDigit value={secs[0]} />
            <FlipDigit value={secs[1]} />
          </div>

          <div className="absolute bottom-10 text-xs font-medium tracking-widest text-gray-600 uppercase hidden sm:block">
            Press <span className="text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-800 font-mono">ESC</span> to exit
          </div>
        </div>
      )}
    </div>
  );
}
