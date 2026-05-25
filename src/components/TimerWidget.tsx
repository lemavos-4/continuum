import { useState, useEffect } from 'react';

// ============================================================
// SUBCOMPONENTE: FlipDigit (O segredo do efeito mecânico 3D)
// ============================================================
function FlipDigit({ value }) {
  const [prevValue, setPrevValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (value !== prevValue) {
      setIsFlipping(true);
      
      // Sincronizado com os 0.6s da animação do CSS
      const timeout = setTimeout(() => {
        setPrevValue(value);
        setIsFlipping(false);
      }, 600);

      return () => clearTimeout(timeout);
    }
  }, [value, prevValue]);

  return (
    <div className={`flip-digit ${isFlipping ? 'flipping' : ''}`}>
      {/* BACKGROUNDS FIXOS */}
      <div className="base-top"><span>{value}</span></div>
      <div className="base-bottom"><span>{prevValue}</span></div>
      
      {/* CARTAS QUE SE MOVIMENTAM */}
      <div className="flip-top"><span>{prevValue}</span></div>
      <div className="flip-bottom"><span>{value}</span></div>
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

  // Lógica do contador do Cronômetro
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

  // Captura a tecla ESC para fechar a tela cheia
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
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

  // Formata os segundos em strings de dois dígitos [HH, MM, SS]
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return (
    <div className="p-6 bg-gray-900 text-white rounded-xl shadow-xl max-w-sm border border-gray-800">
      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">{entityName}</span>
      
      {/* Display simples do painel do Widget */}
      <div className="text-4xl font-mono font-bold text-center my-6 tracking-widest text-gray-100">
        {hrs}:{mins}:{secs}
      </div>

      {/* Controles simples */}
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

      {/* TELA CHEIA DO RELÓGIO (FLIP CLOCK) */}
      {isFullscreen && (
        <div className="flip-clock-fullscreen fixed inset-0 z-50 flex flex-col justify-center items-center bg-black select-none">
          
          {/* Botão Fechar (X) */}
          <button 
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 text-gray-500 hover:text-white text-2xl font-light w-12 h-12 flex items-center justify-center rounded-full border border-gray-800 hover:border-gray-600 transition"
          >
            ✕
          </button>

          {/* Container dos Dígitos */}
          <div className="flex items-center gap-2 md:gap-4">
            <FlipDigit value={hrs[0]} />
            <FlipDigit value={hrs[1]} />
            
            {/* Dois pontos piscantes/estáticos */}
            <div className="flex flex-col gap-3 px-2">
              <span className="w-2 h-2 bg-white rounded-full opacity-50"></span>
              <span className="w-2 h-2 bg-white rounded-full opacity-50"></span>
            </div>

            <FlipDigit value={mins[0]} />
            <FlipDigit value={mins[1]} />

            <div className="flex flex-col gap-3 px-2">
              <span className="w-2 h-2 bg-white rounded-full opacity-50"></span>
              <span className="w-2 h-2 bg-white rounded-full opacity-50"></span>
            </div>

            <FlipDigit value={secs[0]} />
            <FlipDigit value={secs[1]} />
          </div>

          <div className="absolute bottom-10 text-xs font-medium tracking-widest text-gray-600 uppercase">
            Press <span className="text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-800 font-mono">ESC</span> to exit
          </div>
        </div>
      )}
    </div>
  );
}
