import React, { useState, useEffect } from 'react';

// ============================================================
// TOKEN OPTIONS (same as initiative tracker)
// ============================================================
const TOKENS = [
  { id: 'warrior',  label: 'Warrior',  icon: 'ra-sword',      color: '#c9a84c' },
  { id: 'caster',   label: 'Caster',   icon: 'ra-fairy-wand', color: '#9b59b6' },
  { id: 'ranger',   label: 'Ranger',   icon: 'ra-archer',     color: '#4caf50' },
  { id: 'tank',     label: 'Tank',     icon: 'ra-shield',     color: '#5588cc' },
  { id: 'undead',   label: 'Undead',   icon: 'ra-skull',      color: '#aaaaaa' },
  { id: 'beast',    label: 'Beast',    icon: 'ra-wolf-head',  color: '#8b5e3c' },
  { id: 'boss',     label: 'Boss',     icon: 'ra-dragon',     color: '#e74c3c' },
  { id: 'npc',      label: 'NPC',      icon: 'ra-hood',       color: '#888'    },
];

// ============================================================

// ============================================================
// PARTY MANAGER COMPONENT
// ============================================================
function PartyManager({ onAddToCombat }) {

  // ---- Party members loaded from localStorage ----
  const [party, setParty] = useState(() => {
    try {
      const saved = localStorage.getItem('torchlight-party');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ---- Form visibility ----
  const [showForm, setShowForm]       = useState(false);

  // ---- Which member is being edited ----
  const [editingId, setEditingId]     = useState(null);

  // ---- Which member we're adding to combat (waiting for initiative) ----
  const [addingInitFor, setAddingInitFor] = useState(null);

  // ---- Initiative input value ----
  const [initInput, setInitInput]     = useState('');

  // ---- Form fields ----
  const [form, setForm] = useState({
    name:  '',
    token: 'warrior',
    maxHp: 20,
    role:  '',
  });


  // ============================================================
  // SAVE TO LOCALSTORAGE whenever party changes
  // ============================================================
  useEffect(() => {
    localStorage.setItem('torchlight-party', JSON.stringify(party));
  }, [party]);


  // ============================================================
  // OPEN FORM FOR NEW CHARACTER
  // ============================================================
  const openAddForm = () => {
    setForm({ name: '', token: 'warrior', maxHp: 20, role: '' });
    setEditingId(null);
    setShowForm(true);
    setAddingInitFor(null);
  };


  // ============================================================
  // OPEN FORM TO EDIT EXISTING CHARACTER
  // ============================================================
  const openEditForm = (member) => {
    setForm({
      name:  member.name,
      token: member.token.id,
      maxHp: member.maxHp,
      role:  member.role || '',
    });
    setEditingId(member.id);
    setShowForm(true);
    setAddingInitFor(null);
  };


  // ============================================================
  // SAVE CHARACTER (add or edit)
  // ============================================================
  const saveCharacter = () => {
    if (!form.name.trim()) return;

    const token = TOKENS.find(t => t.id === form.token) || TOKENS[0];

    if (editingId) {
      setParty(prev => prev.map(m =>
        m.id === editingId
          ? { ...m, name: form.name.trim(), token, maxHp: parseInt(form.maxHp) || 20, role: form.role }
          : m
      ));
    } else {
      if (party.length >= 8) return;
      setParty(prev => [...prev, {
        id:    Date.now(),
        name:  form.name.trim(),
        token,
        maxHp: parseInt(form.maxHp) || 20,
        role:  form.role,
      }]);
    }

    setShowForm(false);
    setEditingId(null);
  };


  // ============================================================
  // REMOVE A CHARACTER
  // ============================================================
  const removeMember = (id) => {
    setParty(prev => prev.filter(m => m.id !== id));
  };


  // ============================================================
  // START ADD TO COMBAT — opens initiative input
  // ============================================================
  const addToCombat = (member) => {
    setAddingInitFor(member);
    setInitInput('');
    setShowForm(false);
  };


  // ============================================================
  // CONFIRM ADD TO COMBAT WITH INITIATIVE
  // ============================================================
  const confirmAddToCombat = () => {
    if (!addingInitFor) return;
    const init = parseInt(initInput);
    if (isNaN(init) || init < 1) return;

    onAddToCombat({
      id:         Date.now(),
      name:       addingInitFor.name,
      initiative: init,
      hp:         addingInitFor.maxHp,
      maxHp:      addingInitFor.maxHp,
      tempHp:     0,
      effects:    [],
      token:      addingInitFor.token,
    });

    setAddingInitFor(null);
    setInitInput('');
  };


  // ============================================================
  // ADD ALL TO COMBAT
  // Uses a random roll for each — DM can adjust in tracker
  // ============================================================
  const addAllToCombat = () => {
    party.forEach(member => {
      onAddToCombat({
        id:         Date.now() + Math.random(),
        name:       member.name,
        initiative: 0,
        hp:         member.maxHp,
        maxHp:      member.maxHp,
        tempHp:     0,
        effects:    [],
        token:      member.token,
      });
    });
  };


  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="party-manager">

      {/* ---- Header ---- */}
      <div className="party-header">
        <h3 className="party-title">🧙 Party</h3>
        <div className="party-header-btns">
          {party.length > 0 && (
            <button
              className="party-add-all-btn"
              onClick={addAllToCombat}
              title="Add all to combat with random initiative"
            >
              ⚔️ All
            </button>
          )}
          {party.length < 8 && (
            <button className="party-new-btn" onClick={openAddForm}>
              + New
            </button>
          )}
        </div>
      </div>

      {/* ---- Party list ---- */}
      <div className="party-list">
        {party.length === 0 && (
          <div className="party-empty">No party members yet — add up to 8!</div>
        )}
        {party.map(member => (
          <div key={member.id} className="party-member">

            {/* Token */}
            <div
              className="party-token"
              style={{
                background: member.token.color + '22',
                border: `1px solid ${member.token.color}66`,
              }}
            >
              <i className={`ra ${member.token.icon}`} style={{ color: member.token.color }} />
            </div>

            {/* Name and role */}
            <div className="party-member-info">
              <span className="party-member-name">{member.name}</span>
              {member.role && <span className="party-member-role">{member.role}</span>}
            </div>

            {/* HP */}
            <span className="party-member-hp">{member.maxHp} HP</span>

            {/* Buttons */}
            <div className="party-member-btns">
              <button
                className="party-combat-btn"
                onClick={() => addToCombat(member)}
                title="Add to combat"
              >⚔️</button>
              <button
                className="party-edit-btn"
                onClick={() => openEditForm(member)}
                title="Edit"
              >✏️</button>
              <button
                className="party-remove-btn"
                onClick={() => removeMember(member.id)}
                title="Remove"
              >✕</button>
            </div>

          </div>
        ))}
      </div>

      {/* ---- Initiative input popup ---- */}
      {addingInitFor && (
        <div className="init-popup">
          <div className="init-popup-label">
            Initiative for <strong>{addingInitFor.name}</strong>
          </div>
          <div className="init-popup-row">
            <input
              type="number"
              className="party-form-input"
              placeholder="Roll..."
              value={initInput}
              onChange={e => setInitInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmAddToCombat();
                if (e.key === 'Escape') setAddingInitFor(null);
              }}
              autoFocus
              min="1"
              max="30"
            />
            <button className="party-save-btn" onClick={confirmAddToCombat}>Add</button>
            <button
              className="party-cancel-btn"
              onClick={() => setAddingInitFor(null)}
            >✕</button>
          </div>
        </div>
      )}

      {/* ---- Add/Edit Form ---- */}
      {showForm && (
        <div className="party-form">
          <div className="party-form-title">
            {editingId ? 'Edit Character' : 'New Character'}
          </div>

          <input
            className="party-form-input"
            placeholder="Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && saveCharacter()}
            autoFocus
          />

          <input
            className="party-form-input"
            placeholder="Role (e.g. Fighter, Wizard, Familiar)"
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          />

          <input
            className="party-form-input"
            type="number"
            placeholder="Max HP"
            value={form.maxHp}
            onChange={e => setForm(f => ({ ...f, maxHp: e.target.value }))}
          />

          {/* Token picker */}
          <div className="party-token-grid">
            {TOKENS.map(token => (
              <button
                key={token.id}
                className={`party-token-option ${form.token === token.id ? 'selected' : ''}`}
                style={form.token === token.id
                  ? { borderColor: token.color, background: token.color + '22' }
                  : {}}
                onClick={() => setForm(f => ({ ...f, token: token.id }))}
                title={token.label}
              >
                <i
                  className={`ra ${token.icon}`}
                  style={{ color: form.token === token.id ? token.color : '#888' }}
                />
                <span>{token.label}</span>
              </button>
            ))}
          </div>

          <div className="party-form-btns">
            <button className="party-save-btn" onClick={saveCharacter}>
              {editingId ? 'Save Changes' : 'Add Character'}
            </button>
            <button
              className="party-cancel-btn"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default PartyManager;