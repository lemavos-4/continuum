import { Play, Pause, Trash2, X } from "@/lib/heroicons";
import { useEffect, useRef, useState } from 'react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';
import './FlipClock.css';

interface TimerWidgetProps {
  entityId: string;
  entityName: string;
  onTimerStart?: (sessionId: string) => void;
  onTimerStop?: (duration: number) => void;
  compact?: boolean;
}

interface FlipDigitProps {
  value: string;
  isColon?: boolean;
}

function FlipDigit({ value, isColon = false }: FlipDigitProps) {
  const [previous, setPrevious] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== previous) {
      setFlipping(true);
      const timeout = window.setTimeout(() => {
        setFlipping(false);
        setPrevious(value);
      }, 600);
      return () => window.clearTimeout(timeout);
    }
  }, [value, previous]);

  if (isColon) {
    return (
      <div className="flex items-center justify-center w-6 sm:w-10 h-[7rem] sm:h-[10rem] lg:h-[12rem] text-5xl sm:text-7xl lg:text-8xl font-mono font-bold text-white/60">
        :
      </div>
    );
  }

  return (
    <div className={`flip-digit ${flipping ? 'flipping' : ''}`}>
      <div className="flip-top">{flipping ? previous : value}</div>
      <div className="flip-bottom">{value}</div>
    </div>
  );
}

function FlipClockOverlay({ timeString, onClose }: { timeString: string; onClose: () => void }) {
  // Parse time string "HH:MM:SS" into individual digits
  const timeParts = timeString.split(':');
  const hours = timeParts[0].padStart(2, '0').split('');
  const minutes = timeParts[1].padStart(2, '0').split('');
  const seconds = timeParts[2].padStart(2, '0').split('');

  return (
    <div className="flip-clock-fullscreen fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
      <div className="relative w-full max-w-7xl px-4">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-50 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-white/10"
          aria-label="Close flip clock"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center gap-10">
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <FlipDigit value={hours[0]} />
            <FlipDigit value={hours[1]} />
            <FlipDigit value=":" isColon />
            <FlipDigit value={minutes[0]} />
            <FlipDigit value={minutes[1]} />
            <FlipDigit value=":" isColon />
            <FlipDigit value={seconds[0]} />
            <FlipDigit value={seconds[1]} />
          </div>

          <div className="text-center text-xs uppercase tracking-[0.3em] text-zinc-500">
            Press <span className="text-white">Esc</span> to exit
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable timer widget component - uses shared timer state
 */
export function TimerWidget({
  entityId,
  entityName,
  onTimerStart,
  onTimerStop,
  compact = false,
}: TimerWidgetProps) {
  const { activeTimers, isTimerActive, getElapsedSeconds, startTimer, stopTimer, isStarting, isStopping, getActiveTimer, formatSeconds } = useTimeTracking();
  const [isFlipOpen, setIsFlipOpen] = useState(false);
  const [flipTime, setFlipTime] = useState(0);
  const fullscreenRef = useRef<HTMLDivElement | null>(null);

  const { data: activeTimer, isLoading: timerLoading } = getActiveTimer(entityId);
  const isRunning = isTimerActive(entityId);

  // Get the current timer value from the hook's shared state
  const currentElapsed = isRunning ? getElapsedSeconds(entityId) : (activeTimer?.elapsedSeconds || 0);
  const timeString = formatSeconds(currentElapsed);

  // Update flip time when Flip Clock is open
  useEffect(() => {
    if (!isFlipOpen) return;

    const updateFlipTime = () => {
      const elapsed = isRunning ? getElapsedSeconds(entityId) : (activeTimer?.elapsedSeconds || 0);
      setFlipTime(elapsed);
    };

    updateFlipTime(); // Initial update
    const interval = setInterval(updateFlipTime, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [isFlipOpen, isRunning, getElapsedSeconds, entityId, activeTimer?.elapsedSeconds]);

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

  const openFlipClock = async () => {
    setIsFlipOpen(true);
    setFlipTime(currentElapsed);

    // Request fullscreen after a small delay to ensure the element is rendered
    setTimeout(() => {
      if (fullscreenRef.current?.requestFullscreen) {
        fullscreenRef.current.requestFullscreen().catch((error) => {
          console.warn('Fullscreen request failed:', error);
        });
      }
    }, 100);
  };

  const closeFlipClock = async () => {
    setIsFlipOpen(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.warn('Exit fullscreen failed:', error);
      }
    }
  };

  useEffect(() => {
    const onFullScreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFlipOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFlipOpen) {
        closeFlipClock();
      }
    };

    document.addEventListener('fullscreenchange', onFullScreenChange);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('fullscreenchange', onFullScreenChange);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isFlipOpen]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-zinc-400">
          {timeString}
        </span>
        {isRunning ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleStop}
            disabled={isStopping}
            className="h-6 w-6 p-0"
            title="Stop timer"
          >
            <Pause className="w-3 h-3" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleStart}
            disabled={isStarting}
            className="h-6 w-6 p-0"
            title="Start timer"
          >
            <Play className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-4 p-4 bg-zinc-900/50 rounded-lg border border-white/5">
      <h3 className="text-lg font-medium text-white">{entityName}</h3>

      <div className="text-4xl font-mono font-bold text-zinc-400">
        {timeString}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {isRunning ? (
          <Button
            onClick={handleStop}
            disabled={isStopping || timerLoading}
            variant="destructive"
            className="gap-2"
          >
            <Pause className="w-4 h-4" />
            Stop & Save
          </Button>
        ) : (
          <Button
            onClick={handleStart}
            disabled={isStarting || timerLoading}
            variant="default"
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Start Timer
          </Button>
        )}

        <Button
          onClick={openFlipClock}
          variant="secondary"
          className="gap-2"
        >
          Go to Flip Clock
        </Button>
      </div>

      {timerLoading && (
        <p className="text-xs text-zinc-500">Loading timer status...</p>
      )}

      {isFlipOpen && (
        <div ref={fullscreenRef} className="fixed inset-0 z-50 bg-black">
          <FlipClockOverlay timeString={formatSeconds(flipTime)} onClose={closeFlipClock} />
        </div>
      )}
    </div>
  );
}
