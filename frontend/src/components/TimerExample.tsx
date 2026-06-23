import { useState } from 'react';
import { TimerWidget } from './TimerWidget';

/**
 * Example usage of TimerWidget with Flip Clock feature
 *
 * The Flip Clock feature provides:
 * - Visual flip animation for each digit
 * - Fullscreen mode for focused timing
 * - Real-time synchronization with the timer
 * - Exit via ESC key or close button
 */
export function TimerExample() {
  const [entityId] = useState('example-entity-123');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Timer with Flip Clock</h1>

      <TimerWidget
        entityId={entityId}
        entityName="Example Activity"
        onTimerStart={(sessionId) => console.log('Timer started:', sessionId)}
        onTimerStop={(duration) => console.log('Timer stopped:', duration)}
      />

      <div className="mt-8 text-sm text-gray-600">
        <h2 className="font-semibold mb-2">How to use Flip Clock:</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Start the timer using the "Start Timer" button</li>
          <li>Click "Go to Flip Clock" to enter fullscreen mode</li>
          <li>Watch the animated digits flip as time progresses</li>
          <li>Exit by pressing ESC or clicking the X button</li>
        </ol>
      </div>
    </div>
  );
}