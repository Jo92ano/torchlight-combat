import React, { useState, useEffect } from 'react';

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
// TOKEN OPTIONS
// Each token has a label, RPG Awesome icon class, and a color
// ============================================================
const TOKENS = [
  { id: 'warrior',  label: 'Warrior',  icon: 'ra-sword',        color: '#c9a84c' },
  { id: 'caster',   label: 'Caster',   icon: 'ra-fairy-wand',   color: '#9b59b6' },
  { id: 'ranger',   label: 'Ranger',   icon: 'ra-archer',       color: '#4caf50' },
  { id: 'tank',     label: 'Tank',     icon: 'ra-shield',       color: '#5588cc' },
  { id: 'undead',   label: 'Undead',   icon: 'ra-skull',        color: '#aaaaaa' },
  { id: 'beast',    label: 'Beast',    icon: 'ra-wolf-head',    color: '#8b5e3c' },
  { id: 'boss',     label: 'Boss',     icon: 'ra-dragon',       color: '#e74c3c' },
  { id: 'npc',      label: 'NPC',      icon: 'ra-hood',         color: '#888' },
];

// ============================================================
// MAIN INITIATIVE TRACKER COMPONENT
// ============================================================
function Initiative({ combatants, setCombatants, currentTurn, setCurrentTurn }) {

  // ---- State: form inputs ----
  const [name, setName]                 = useState('');
  const [initiative, setInitiative]     = useState(15);
  const [hp, setHp]                     = useState('');
  const [selectedToken, setSelectedToken] = useState('warrior');

  // ---- State: which combatant's status menu is open ----
  const [openStatusMenu, setOpenStatusMenu] = useState(null);

  // ---- State: skip message shown when a turn is auto-skipped ----
  const [skipMessage, setSkipMessage]   = useState('');

  // ---- State: current round number ----
  const [round, setRound]               = useState(1);

  // ---- State: which combatant's HP editor is open ----
  const [openHpEditor, setOpenHpEditor] = useState(null);

  // ---- State: damage/heal input value ----
  const [hpInput, setHpInput]           = useState('');


  // ============================================================
  // CLOSE STATUS MENU WHEN CLICKING OUTSIDE
  // ============================================================
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.effect-menu-wrapper')) {
        setOpenStatusMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
// ---- Close HP editor when clicking outside ----
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.hp-section')) {
        setOpenHpEditor(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
      tempHp:     0,
      effects:    [],
      token,
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
  // Handles auto-skip for dead and status-effected combatants
  // ============================================================
  const nextTurn = () => {
    if (combatants.length === 0) return;

    let next   = (currentTurn + 1) % combatants.length;
    let looped = next === 0;

    // ---- Tick down effects at start of new round ----
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
  // APPLY DAMAGE
  // Hits temp HP first, then real HP
  // ============================================================
  const applyDamage = (id, amount) => {
    setCombatants(combatants.map(c => {
      if (c.id !== id) return c;
      const tempHp = c.tempHp || 0;
      let damage = amount;
      const newTempHp = Math.max(0, tempHp - damage);
      damage = Math.max(0, damage - tempHp);
      const newHp = Math.max(0, c.hp - damage);
      return { ...c, hp: newHp, tempHp: newTempHp };
    }));
  };


  // ============================================================
  // APPLY HEALING
  // Never exceeds max HP
  // ============================================================
  const applyHealing = (id, amount) => {
    setCombatants(combatants.map(c => {
      if (c.id !== id) return c;
      return { ...c, hp: Math.min(c.maxHp, c.hp + amount) };
    }));
  };


  // ============================================================
  // SET TEMP HP
  // New temp HP replaces old if higher
  // ============================================================
  const applyTempHp = (id, amount) => {
    setCombatants(combatants.map(c => {
      if (c.id !== id) return c;
      return { ...c, tempHp: Math.max(c.tempHp || 0, amount) };
    }));
  };


  // ============================================================
  // EDIT MAX HP
  // ============================================================
  const editMaxHp = (id, newMax) => {
    setCombatants(combatants.map(c => {
      if (c.id !== id) return c;
      const clampedMax = Math.max(1, newMax);
      return { ...c, maxHp: clampedMax, hp: Math.min(c.hp, clampedMax) };
    }));
  };





  // ============================================================
  // GET HP COLOR based on percentage
  // ============================================================
  const getHpColor = (hp, maxHp) => {
    const pct = hp / maxHp;
    if (pct > 0.5) return '#c9a84c';
    if (pct > 0.25) return '#ff9900';
    return '#ff4444';
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
                  <i className={`ra ${c.token.icon}`} style={{ color: c.token.color }} />
                </div>

                {/* -- Name -- */}
                <span className="combatant-name">
                  {index === currentTurn ? '▶ ' : ''}{c.name}
                  {c.hp === 0 && <span className="dead-label"> (Down)</span>}
                </span>

                {/* -- Initiative badge -- */}
                <span className="initiative-badge">{c.initiative}</span>

                {/* -- Status effects -- */}
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

                {/* -- HP Section -- */}
                <div className="hp-section">

                  {/* HP display */}
                  <div className="hp-display">
                    <span
                      className="hp-current"
                      style={{ color: getHpColor(c.hp, c.maxHp) }}
                    >
                      {c.hp}
                    </span>
                    <span className="hp-slash">/</span>
                    <span
                      className="hp-max"
                      title="Click to edit max HP"
                      onClick={() => setOpenHpEditor(
                        openHpEditor === `max-${c.id}` ? null : `max-${c.id}`
                      )}
                    >
                      {c.maxHp}
                    </span>
                    {(c.tempHp || 0) > 0 && (
                      <span className="temp-hp-badge">+{c.tempHp}</span>
                    )}
                  </div>

                  {/* Always visible action buttons */}
                  <div className="hp-actions">
                    <button
                      className={`hp-quick-btn damage ${openHpEditor === `dmg-${c.id}` ? 'active' : ''}`}
                      onClick={() => setOpenHpEditor(
                        openHpEditor === `dmg-${c.id}` ? null : `dmg-${c.id}`
                      )}
                      title="Deal damage"
                    >🗡️</button>
                    <button
                      className={`hp-quick-btn heal ${openHpEditor === `heal-${c.id}` ? 'active' : ''}`}
                      onClick={() => setOpenHpEditor(
                        openHpEditor === `heal-${c.id}` ? null : `heal-${c.id}`
                      )}
                      title="Heal"
                    >❤️</button>
                    <button
                      className={`hp-quick-btn temp ${openHpEditor === `temp-${c.id}` ? 'active' : ''}`}
                      onClick={() => setOpenHpEditor(
                        openHpEditor === `temp-${c.id}` ? null : `temp-${c.id}`
                      )}
                      title="Add temp HP"
                    >🛡️</button>
                  </div>

                  {/* Inline HP input panel */}
                  {openHpEditor && openHpEditor.endsWith(c.id.toString()) && (
                    <div className="hp-inline-panel">
                      <span className="hp-inline-label">
                        {openHpEditor.startsWith('dmg')  && `Damage ${c.name}`}
                        {openHpEditor.startsWith('heal') && `Heal ${c.name}`}
                        {openHpEditor.startsWith('temp') && `Temp HP for ${c.name}`}
                        {openHpEditor.startsWith('max')  && `Max HP for ${c.name}`}
                      </span>
                      <div className="hp-inline-row">
                        <input
                          type="number"
                          className="hp-inline-input"
                          placeholder="0"
                          value={hpInput}
                          onChange={e => setHpInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const amt = parseInt(hpInput);
                              if (!isNaN(amt) && amt > 0) {
                                if (openHpEditor.startsWith('dmg'))  applyDamage(c.id, amt);
                                if (openHpEditor.startsWith('heal')) applyHealing(c.id, amt);
                                if (openHpEditor.startsWith('temp')) applyTempHp(c.id, amt);
                                if (openHpEditor.startsWith('max'))  editMaxHp(c.id, amt);
                              }
                              setHpInput('');
                              setOpenHpEditor(null);
                            }
                            if (e.key === 'Escape') {
                              setHpInput('');
                              setOpenHpEditor(null);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          className="hp-inline-confirm"
                          onClick={() => {
                            const amt = parseInt(hpInput);
                            if (!isNaN(amt) && amt > 0) {
                              if (openHpEditor.startsWith('dmg'))  applyDamage(c.id, amt);
                              if (openHpEditor.startsWith('heal')) applyHealing(c.id, amt);
                              if (openHpEditor.startsWith('temp')) applyTempHp(c.id, amt);
                              if (openHpEditor.startsWith('max'))  editMaxHp(c.id, amt);
                            }
                            setHpInput('');
                            setOpenHpEditor(null);
                          }}
                        >✓</button>
                        <button
                          className="hp-inline-cancel"
                          onClick={() => {
                            setHpInput('');
                            setOpenHpEditor(null);
                          }}
                        >✕</button>
                      </div>
                    </div>
                  )}

                </div>

                {/* -- Remove button -- */}
                <button
                  className="remove-btn"
                  onClick={() => removeCombatant(c.id)}
                >✕</button>

              </div>
            ))}
          </div>

          {/* ---- Combat Actions ---- */}
          <div className="combat-actions">
            <button className="next-btn" onClick={nextTurn}>
              Next Turn ▶
            </button>
            <button className="reset-btn" onClick={resetCombat}>
              Reset Combat
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Initiative;