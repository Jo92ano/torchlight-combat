import React, { useState, useEffect } from 'react';

// ============================================================
// TOKEN OPTIONS
// Each token has a label, RPG Awesome icon class, and a color
// The DM picks one when adding a combatant
// ============================================================
const TOKENS = [
  { id: 'warrior',  label: 'Warrior',  icon: 'ra-sword',        color: '#c9a84c' },
  { id: 'caster',   label: 'Caster',   icon: 'ra-fairy-wand',   color: '#9b59b6' },
  { id: 'ranger',   label: 'Ranger',   icon: 'ra-archer',        color: '#4caf50' },
  { id: 'tank',     label: 'Tank',     icon: 'ra-shield',       color: '#5588cc' },
  { id: 'undead',   label: 'Undead',   icon: 'ra-skull',        color: '#aaaaaa' },
  { id: 'beast',    label: 'Beast',    icon: 'ra-wolf-head', color: '#8b5e3c' },
  { id: 'boss',     label: 'Boss',     icon: 'ra-dragon',       color: '#e74c3c' },
  { id: 'npc',      label: 'NPC',      icon: 'ra-hood',         color: '#888' },
];

// ============================================================
// STATUS EFFECT DEFINITIONS
// Each effect has:
//   label         - display name
//   color         - badge color
//   textColor     - text on the badge
//   skipsTurn     - does this auto-skip the combatant's turn?
//   defaultRounds - how many rounds it lasts (null = infinite)
// ============================================================
const STATUS_EFFECTS = {
  stunned:       { label: 'Stunned',    color: '#f0c040', textColor: '#1a1a2e', skipsTurn: true,  defaultRounds: 1 },
  paralyzed:     { label: 'Paralyzed', color: '#aaaaaa', textColor: '#1a1a2e', skipsTurn: true,  defaultRounds: 3 },
  poisoned:      { label: 'Poisoned',  color: '#4caf50', textColor: '#fff',    skipsTurn: false, defaultRounds: 3 },
  burning:       { label: 'Burning',   color: '#ff6b2b', textColor: '#fff',    skipsTurn: false, defaultRounds: 2 },
  blinded:       { label: 'Blinded',   color: '#555577', textColor: '#fff',    skipsTurn: false, defaultRounds: 2 },
  prone:         { label: 'Prone',     color: '#8b5e3c', textColor: '#fff',    skipsTurn: false, defaultRounds: 1 },
  invisible:     { label: 'Invisible', color: '#5588cc', textColor: '#fff',    skipsTurn: false, defaultRounds: 3 },
  concentration: { label: 'Conc.',     color: '#9b59b6', textColor: '#fff',    skipsTurn: false, defaultRounds: null },
};

// ============================================================
// MAIN INITIATIVE TRACKER COMPONENT
// ============================================================
function Initiative({ combatants, setCombatants, currentTurn, setCurrentTurn }) {

  // ---- State: form inputs ----
  const [name, setName]                 = useState('');
  const [initiative, setInitiative]     = useState(15);
  const [hp, setHp]                     = useState('');
  const [selectedToken, setSelectedToken] = useState('warrior');

  // ---- State: whose turn it is (index in sorted list) ----


  // ---- State: which combatant's status menu is open ----
  const [openStatusMenu, setOpenStatusMenu] = useState(null);
  // ---- Close status menu when clicking outside ----
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.effect-menu-wrapper')) {
        setOpenStatusMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ---- State: skip message shown when a turn is auto-skipped ----
  const [skipMessage, setSkipMessage]   = useState('');

  // ---- State: current round number ----
  const [round, setRound]               = useState(1);


  // ============================================================
  // ADD A NEW COMBATANT
  // ============================================================
  const addCombatant = () => {
    if (!name.trim()) return;

    const token = TOKENS.find(t => t.id === selectedToken) || TOKENS[0];

    const newCombatant = {
      id:         Date.now(),
      name:       name.trim(),
      initiative: parseInt(initiative),
      hp:         Math.min(999, parseInt(hp) || 10),
      maxHp:      Math.min(999, parseInt(hp) || 10),
      effects:    [],
      token,                          // store the full token object
    };

    const updated = [...combatants, newCombatant]
      .sort((a, b) => b.initiative - a.initiative);

    setCombatants(updated);
    setName('');
    setInitiative(15);
    setHp('');
  };


  // ============================================================
  // NEXT TURN LOGIC
  // Handles auto-skip and round tracking
  // ============================================================
  const nextTurn = () => {
    if (combatants.length === 0) return;

    let next    = (currentTurn + 1) % combatants.length;
    let looped  = next === 0;

    // ---- Tick down effects at the start of a new round ----
    let updatedCombatants = combatants.map(c => {
      if (!looped) return c;

      const updatedEffects = c.effects
        .map(e => ({
          ...e,
          rounds: e.rounds !== null ? e.rounds - 1 : null,
        }))
        .filter(e => e.rounds === null || e.rounds > 0);

      return { ...c, effects: updatedEffects };
    });

    if (looped) setRound(r => r + 1);

    // ---- Check if next combatant should be auto-skipped ----
    // Skips dead combatants AND combatants with skip effects
    const nextCombatant  = updatedCombatants[next];
    const skippingEffect = nextCombatant?.effects.find(
      e => STATUS_EFFECTS[e.type]?.skipsTurn
    );
    const isDead = nextCombatant?.hp === 0;

    if (isDead) {
      setSkipMessage(`💀 ${nextCombatant.name} is down and loses their turn!`);
      next = (next + 1) % combatants.length;
      setTimeout(() => setSkipMessage(''), 3000);
    } else if (skippingEffect) {
      const effectName = STATUS_EFFECTS[skippingEffect.type].label;
      setSkipMessage(`⚠️ ${nextCombatant.name} is ${effectName} and loses their turn!`);
      next = (next + 1) % combatants.length;
      setTimeout(() => setSkipMessage(''), 3000);
    } else {
      setSkipMessage('');
    }

    setCombatants(updatedCombatants);
    setCurrentTurn(next);
  };


  // ============================================================
  // ADD A STATUS EFFECT TO A COMBATANT
  // ============================================================
  const addEffect = (combatantId, effectType) => {
    setCombatants(combatants.map(c => {
      if (c.id !== combatantId) return c;
      if (c.effects.find(e => e.type === effectType)) return c;

      const newEffect = {
        type:   effectType,
        rounds: STATUS_EFFECTS[effectType].defaultRounds,
      };

      return { ...c, effects: [...c.effects, newEffect] };
    }));

    setOpenStatusMenu(null);
  };


  // ============================================================
  // REMOVE A STATUS EFFECT FROM A COMBATANT
  // ============================================================
  const removeEffect = (combatantId, effectType) => {
    setCombatants(combatants.map(c => {
      if (c.id !== combatantId) return c;
      return { ...c, effects: c.effects.filter(e => e.type !== effectType) };
    }));
  };


  // ============================================================
  // CHANGE HP (positive = heal, negative = damage)
  // ============================================================
  const changeHp = (id, amount) => {
    setCombatants(combatants.map(c =>
      c.id === id
        ? { ...c, hp: Math.max(0, Math.min(c.maxHp, c.hp + amount)) }
        : c
    ));
  };


  // ============================================================
  // REMOVE A COMBATANT
  // ============================================================
  const removeCombatant = (id) => {
    setCombatants(combatants.filter(c => c.id !== id));
    setCurrentTurn(0);
  };


  // ============================================================
  // RESET EVERYTHING
  // ============================================================
  const resetCombat = () => {
    setCombatants([]);
    setCurrentTurn(0);
    setRound(1);
    setSkipMessage('');
  };


  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="section section-narrow">
      <h2>⚔️ Initiative Tracker</h2>

      {/* ---- Round Counter ---- */}
      {combatants.length > 0 && (
        <div className="round-counter">Round {round}</div>
      )}

      {/* ---- Add Combatant Form ---- */}
      <div className="add-form">

        {/* Name */}
        <div className="slider-group">
          <label>Name</label>
          <input
            type="text"
            placeholder="Goblin King..."
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCombatant()}
            className="styled-input"
          />
        </div>

        {/* Initiative slider */}
        <div className="slider-group">
          <label>Initiative: {initiative}</label>
          <input
            type="range"
            min="1"
            max="30"
            value={initiative}
            onChange={e => setInitiative(e.target.value)}
            style={{'--val': `${((initiative - 1) / 29) * 100}%`}}
          />
        </div>

        {/* HP */}
        <div className="slider-group">
          <label>HP</label>
          <input
            type="number"
            placeholder="10"
            value={hp}
            onChange={e => setHp(e.target.value)}
            className="styled-input"
          />
        </div>

        {/* Add button */}
        <button onClick={addCombatant}>Add</button>

      </div>

      {/* ---- Token Picker ---- */}
      <div className="token-picker">
        <span className="token-picker-label">Type:</span>
        {TOKENS.map(token => (
          <button
            key={token.id}
            className={`token-option ${selectedToken === token.id ? 'selected' : ''}`}
            style={selectedToken === token.id ? { borderColor: token.color, background: token.color + '22' } : {}}
            onClick={() => setSelectedToken(token.id)}
            title={token.label}
          >
            {/* RPG Awesome icon */}
            <i className={`ra ${token.icon}`} style={{ color: selectedToken === token.id ? token.color : '#888' }} />
            <span>{token.label}</span>
          </button>
        ))}
      </div>

      {/* ---- Skip Message Banner ---- */}
      {skipMessage && (
        <div className="skip-message">{skipMessage}</div>
      )}

      {/* ---- Combatant List ---- */}
      {combatants.length > 0 && (
        <>
          <div className="combatant-list">
            {combatants.map((c, index) => (
              <div
                key={c.id}
                className={`combatant ${index === currentTurn ? 'active' : ''} ${c.hp === 0 ? 'dead' : ''}`}
              >

                {/* -- Token icon circle -- */}
                <div
                  className="combatant-token"
                  style={{ background: c.token.color + '22', border: `1px solid ${c.token.color}66` }}
                  title={c.token.label}
                >
                  <i
                    className={`ra ${c.token.icon}`}
                    style={{ color: c.token.color }}
                  />
                </div>

                {/* -- Name -- */}
                <span className="combatant-name">
                  {index === currentTurn ? '▶ ' : ''}{c.name}
                  {c.hp === 0 && <span className="dead-label"> (Down)</span>}
                </span>

                {/* -- Initiative badge -- */}
                <span className="initiative-badge">{c.initiative}</span>

                {/* -- Status effect badges -- */}
                <div className="effects-row">
                  {c.effects.map(e => {
                    const def = STATUS_EFFECTS[e.type];
                    return (
                      <span
                        key={e.type}
                        className="effect-badge"
                        style={{ background: def.color, color: def.textColor }}
                        onClick={() => removeEffect(c.id, e.type)}
                        title="Click to remove"
                      >
                        {def.label}{e.rounds !== null && ` ${e.rounds}`}
                      </span>
                    );
                  })}

                  {/* -- Add effect button -- */}
                  <div className="effect-menu-wrapper">
                    <button
                      className="add-effect-btn"
                      onClick={() => setOpenStatusMenu(openStatusMenu === c.id ? null : c.id)}
                      title="Add status effect"
                    >+</button>

                    {/* -- Dropdown -- */}
                    {openStatusMenu === c.id && (
                      <div className="effect-dropdown">
                        {Object.entries(STATUS_EFFECTS).map(([key, def]) => (
                          <button
                            key={key}
                            className="effect-option"
                            style={{ borderLeft: `3px solid ${def.color}` }}
                            onClick={() => addEffect(c.id, key)}
                          >
                            {def.label}
                            {def.skipsTurn && <span className="skips-label"> (skips turn)</span>}
                            {def.defaultRounds ? ` · ${def.defaultRounds}r` : ' · ∞'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* -- HP controls -- */}
                <div className="hp-controls">
                  <button onClick={() => changeHp(c.id, -1)}>−</button>
                  <span>{c.hp} / {c.maxHp}</span>
                  <button onClick={() => changeHp(c.id, 1)}>+</button>
                </div>

                {/* -- Remove button -- */}
                <button className="remove-btn" onClick={() => removeCombatant(c.id)}>✕</button>

              </div>
            ))}
          </div>

          {/* ---- Combat Actions ---- */}
          <div className="combat-actions">
            <button className="next-btn" onClick={nextTurn}>Next Turn ▶</button>
            <button className="reset-btn" onClick={resetCombat}>Reset Combat</button>
          </div>
        </>
      )}
    </div>
  );
}

export default Initiative;