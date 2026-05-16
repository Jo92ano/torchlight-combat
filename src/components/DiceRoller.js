import React, { useState } from 'react';

// ============================================================
// DICE DEFINITIONS
// Standard RPG dice
// ============================================================
const DICE = [
  { sides: 4,   label: 'd4'   },
  { sides: 6,   label: 'd6'   },
  { sides: 8,   label: 'd8'   },
  { sides: 10,  label: 'd10'  },
  { sides: 12,  label: 'd12'  },
  { sides: 20,  label: 'd20'  },
  { sides: 100, label: 'd100' },
];

// ============================================================
// HELPER: Roll a single die
// ============================================================
const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;

// ============================================================
// DICE ROLLER COMPONENT
// ============================================================
function DiceRoller() {

  // ---- Selected die type ----
  const [selectedDie, setSelectedDie] = useState(20);

  // ---- Number of dice to roll ----
  const [count, setCount] = useState(1);

  // ---- Flat modifier ----
  const [modifier, setModifier] = useState(0);

  // ---- Advantage/disadvantage (d20 only) ----
  const [advantage, setAdvantage] = useState('normal');
  // 'normal' | 'advantage' | 'disadvantage'

  // ---- Last roll result ----
  const [result, setResult] = useState(null);
  // { rolls: [], total: number, formula: string, advantage? }

  // ---- Roll history ----
  const [history, setHistory] = useState([]);


  // ============================================================
  // ROLL THE DICE
  // ============================================================
  const roll = () => {
    let rolls = [];
    let total = 0;
    let formula = '';

    if (selectedDie === 20 && advantage !== 'normal') {
      // ---- Advantage/disadvantage: roll two d20s ----
      const r1 = rollDie(20);
      const r2 = rollDie(20);
      const chosen = advantage === 'advantage'
        ? Math.max(r1, r2)
        : Math.min(r1, r2);

      rolls = [r1, r2];
      total = chosen + parseInt(modifier);
      formula = `${advantage === 'advantage' ? 'Adv' : 'Dis'} d20`;

    } else {
      // ---- Normal roll: count x die ----
      rolls = Array(parseInt(count)).fill(0).map(() => rollDie(selectedDie));
      total = rolls.reduce((a, b) => a + b, 0) + parseInt(modifier);
      formula = `${count}d${selectedDie}`;
    }

    // Add modifier to formula if non-zero
    if (parseInt(modifier) !== 0) {
      formula += ` ${parseInt(modifier) >= 0 ? '+' : ''}${modifier}`;
    }

    const newResult = { rolls, total, formula };
    setResult(newResult);

    // Add to history (keep last 8)
    setHistory(prev => [newResult, ...prev].slice(0, 8));
  };


  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="side-panel-section">
      <h3 className="side-panel-title">🎲 Dice Roller</h3>

      {/* ---- Die selector ---- */}
      <div className="dice-grid">
        {DICE.map(die => (
          <button
            key={die.sides}
            className={`die-btn ${selectedDie === die.sides ? 'active' : ''}`}
            onClick={() => {
              setSelectedDie(die.sides);
              // Reset advantage if not d20
              if (die.sides !== 20) setAdvantage('normal');
            }}
          >
            {die.label}
          </button>
        ))}
      </div>

      {/* ---- Count and modifier ---- */}
      <div className="dice-config">
        <div className="dice-config-group">
          <label>Dice</label>
          <div className="dice-count-controls">
            <button onClick={() => setCount(c => Math.max(1, parseInt(c) - 1))}>−</button>
            <span>{count}</span>
            <button onClick={() => setCount(c => Math.min(20, parseInt(c) + 1))}>+</button>
          </div>
        </div>

        <div className="dice-config-group">
          <label>Modifier</label>
          <div className="dice-count-controls">
            <button onClick={() => setModifier(m => parseInt(m) - 1)}>−</button>
            <span>{modifier >= 0 ? `+${modifier}` : modifier}</span>
            <button onClick={() => setModifier(m => parseInt(m) + 1)}>+</button>
          </div>
        </div>
      </div>

      {/* ---- Advantage/disadvantage (d20 only) ---- */}
      {selectedDie === 20 && (
        <div className="advantage-row">
          {['normal', 'advantage', 'disadvantage'].map(a => (
            <button
              key={a}
              className={`adv-btn ${advantage === a ? 'active' : ''}`}
              onClick={() => setAdvantage(a)}
            >
              {a === 'normal' ? 'Normal' : a === 'advantage' ? 'Adv' : 'Dis'}
            </button>
          ))}
        </div>
      )}

      {/* ---- Roll button ---- */}
      <button className="roll-btn" onClick={roll}>
        Roll {count}d{selectedDie}{modifier !== 0 ? ` ${modifier >= 0 ? '+' : ''}${modifier}` : ''}
      </button>

      {/* ---- Result display ---- */}
      {result && (
        <div className="roll-result">
          <div className="roll-total">{result.total}</div>
          <div className="roll-formula">{result.formula}</div>
          <div className="roll-breakdown">
            {result.rolls.join(' + ')}
            {parseInt(modifier) !== 0 && ` ${parseInt(modifier) >= 0 ? '+' : ''}${modifier}`}
          </div>
        </div>
      )}

      {/* ---- Roll history ---- */}
      {history.length > 0 && (
        <div className="roll-history">
          <div className="roll-history-title">History</div>
          {history.map((h, i) => (
            <div key={i} className="roll-history-item">
              <div className="roll-history-left">
                <span className="roll-history-formula">{h.formula}</span>
                <span className="roll-history-breakdown">{h.rolls.join('+')}</span>
              </div>
              <span className="roll-history-total">{h.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DiceRoller;