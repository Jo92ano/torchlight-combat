import React, { useState, useEffect, useRef } from 'react';

// ============================================================
// PRESET TIMES in seconds
// ============================================================
const PRESETS = [
  { label: '30s',  seconds: 30  },
  { label: '60s',  seconds: 60  },
  { label: '2min', seconds: 120 },
  { label: '3min', seconds: 180 },
];

// ============================================================
// TURN TIMER COMPONENT
// ============================================================
function TurnTimer({ currentTurn }) {

  // ---- Time remaining in seconds ----
  const [timeLeft, setTimeLeft] = useState(60);

  // ---- Selected preset duration ----
  const [duration, setDuration] = useState(60);

  // ---- Is timer running ----
  const [running, setRunning] = useState(false);

  // ---- Ref to store interval ----
  const intervalRef = useRef(null);

  // ---- Previous turn ref to detect turn changes ----
  const prevTurnRef = useRef(currentTurn);


  // ============================================================
  // AUTO-RESTART WHEN TURN CHANGES
  // ============================================================
  useEffect(() => {
    if (prevTurnRef.current !== currentTurn) {
      prevTurnRef.current = currentTurn;
      // Reset and auto-start on new turn
      setTimeLeft(duration);
      setRunning(true);
    }
  }, [currentTurn, duration]);


  // ============================================================
  // COUNTDOWN LOGIC
  // ============================================================
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up — stop timer
            setRunning(false);
            clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [running]);


  // ============================================================
  // FORMAT TIME as MM:SS
  // ============================================================
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };


  // ============================================================
  // GET COLOR based on time remaining
  // ============================================================
  const getTimerColor = () => {
    const pct = timeLeft / duration;
    if (pct > 0.5) return '#c9a84c';   // gold — plenty of time
    if (pct > 0.25) return '#ff9900';  // orange — getting low
    return '#ff4444';                   // red — almost out
  };


  // ============================================================
  // CONTROLS
  // ============================================================
  const startStop = () => setRunning(r => !r);

  const reset = () => {
    setRunning(false);
    setTimeLeft(duration);
  };

  const selectPreset = (seconds) => {
    setDuration(seconds);
    setTimeLeft(seconds);
    setRunning(false);
  };


  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="side-panel-section">
      <h3 className="side-panel-title">⏱️ Turn Timer</h3>

      {/* ---- Timer display ---- */}
      <div
        className="timer-display"
        style={{ color: getTimerColor() }}
      >
        {formatTime(timeLeft)}
      </div>

      {/* ---- Progress bar ---- */}
      <div className="timer-bar-bg">
        <div
          className="timer-bar-fill"
          style={{
            width: `${(timeLeft / duration) * 100}%`,
            background: getTimerColor(),
          }}
        />
      </div>

      {/* ---- Controls ---- */}
      <div className="timer-controls">
        <button className="timer-btn" onClick={startStop}>
          {running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button className="timer-btn timer-reset" onClick={reset}>
          ↺ Reset
        </button>
      </div>

      {/* ---- Preset buttons ---- */}
      <div className="timer-presets">
        {PRESETS.map(p => (
          <button
            key={p.seconds}
            className={`timer-preset-btn ${duration === p.seconds ? 'active' : ''}`}
            onClick={() => selectPreset(p.seconds)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="timer-note">
        Auto-starts on Next Turn
      </div>
    </div>
  );
}

export default TurnTimer;