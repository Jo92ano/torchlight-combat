// ============================================================
// SESSIONMANAGER.JS — Torchlight Combat
// Saves and loads complete session state using IndexedDB
// Supports: save, load, delete, export to .json, import from .json
// ============================================================

import React, { useState, useEffect, useRef } from 'react';

// ============================================================
// INDEXEDDB HELPERS
// ============================================================
const DB_NAME    = 'torchlight-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

// ---- Open the database ----
const openDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror   = () => reject(req.error);
});

// ---- Save a session ----
const saveSession = async (session) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(session);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
};

// ---- Load all sessions ----
const loadAllSessions = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
};

// ---- Delete a session ----
const deleteSession = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
};


// ============================================================
// SESSION MANAGER COMPONENT
// ============================================================
function SessionManager({
  // ---- All app state passed in for saving ----
  combatants,
  setCombatants,
  currentTurn,
  setCurrentTurn,
  terrain,
  setTerrain,
  obstacles,
  setObstacles,
  tokenPositions,
  setTokenPositions,
  // ---- Visibility control ----
  isOpen,
  onClose,
}) {

  // ---- List of saved sessions ----
  const [sessions, setSessions]     = useState([]);

  // ---- Name input for new save ----
  const [saveName, setSaveName]     = useState('');

  // ---- Status message ----
  const [status, setStatus]         = useState('');

  // ---- Confirm delete id ----
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ---- File input ref for import ----
  const fileInputRef = useRef(null);


  // ============================================================
  // LOAD SESSION LIST ON OPEN
  // ============================================================
  useEffect(() => {
    if (isOpen) loadSessions();
  }, [isOpen]);


  const loadSessions = async () => {
    try {
      const all = await loadAllSessions();
      // Sort newest first
      all.sort((a, b) => b.savedAt - a.savedAt);
      setSessions(all);
    } catch (err) {
      setStatus('Failed to load sessions.');
    }
  };


  // ============================================================
  // SAVE CURRENT SESSION
  // ============================================================
  const handleSave = async () => {
    const name = saveName.trim();
    if (!name) { setStatus('Please enter a session name.'); return; }

    const session = {
      id:             Date.now(),
      name,
      savedAt:        Date.now(),
      // ---- Combat state ----
      combatants,
      currentTurn,
      // ---- Map state ----
      terrain,
      obstacles,
      tokenPositions,
      // ---- Party state (from localStorage) ----
      party: (() => {
        try { return JSON.parse(localStorage.getItem('torchlight-party') || '[]'); }
        catch { return []; }
      })(),
      // ---- Notes (from localStorage) ----
      notes: (() => {
        try { return JSON.parse(localStorage.getItem('torchlight-notes') || '[]'); }
        catch { return []; }
      })(),
    };

    try {
      await saveSession(session);
      await loadSessions();
      setSaveName('');
      setStatus(`✓ Session "${name}" saved.`);
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus('Failed to save session.');
    }
  };


  // ============================================================
  // LOAD A SESSION
  // ============================================================
  const handleLoad = (session) => {
    // ---- Restore combat state ----
    setCombatants(session.combatants || []);
    setCurrentTurn(session.currentTurn || 0);

    // ---- Restore map state ----
    setTerrain(session.terrain || Array(50).fill(null).map(() => Array(50).fill('empty')));
    setObstacles(session.obstacles || []);
    setTokenPositions(session.tokenPositions || {});

    // ---- Restore party to localStorage ----
    if (session.party) {
      localStorage.setItem('torchlight-party', JSON.stringify(session.party));
    }

    // ---- Restore notes to localStorage ----
    if (session.notes) {
      localStorage.setItem('torchlight-notes', JSON.stringify(session.notes));
    }

    setStatus(`✓ Loaded "${session.name}".`);
    setTimeout(() => { setStatus(''); onClose(); }, 1500);
  };


  // ============================================================
  // DELETE A SESSION
  // ============================================================
  const handleDelete = async (id) => {
    try {
      await deleteSession(id);
      await loadSessions();
      setConfirmDelete(null);
      setStatus('Session deleted.');
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      setStatus('Failed to delete session.');
    }
  };


  // ============================================================
  // EXPORT SESSION AS .json FILE
  // ============================================================
  const handleExport = (session) => {
    const json = JSON.stringify(session, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${session.name.replace(/[^a-z0-9]/gi, '_')}_torchlight.json`;
    a.click();
    URL.revokeObjectURL(url);
  };


  // ============================================================
  // IMPORT SESSION FROM .json FILE
  // ============================================================
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const session = JSON.parse(ev.target.result);
        // Give it a new id to avoid collisions
        session.id = Date.now();
        session.savedAt = Date.now();
        await saveSession(session);
        await loadSessions();
        setStatus(`✓ Imported "${session.name}".`);
        setTimeout(() => setStatus(''), 3000);
      } catch (err) {
        setStatus('Failed to import — invalid file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  // ============================================================
  // FORMAT DATE
  // ============================================================
  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };


  // ---- Don't render if closed ----
  if (!isOpen) return null;


  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      {/* ---- Backdrop ---- */}
      <div className="session-backdrop" onClick={onClose} />

      {/* ---- Modal ---- */}
      <div className="session-modal">

        {/* Header */}
        <div className="session-modal-header">
          <span className="session-modal-title">💾 Session Manager</span>
          <button className="session-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* ---- Save current session ---- */}
        <div className="session-save-section">
          <div className="session-section-label">Save current session</div>
          <div className="session-save-row">
            <input
              className="session-name-input"
              type="text"
              placeholder="Session name (e.g. Goblin Ambush - Session 3)"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <button className="session-save-btn" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>

        {/* ---- Import from file ---- */}
        <div className="session-import-row">
          <button
            className="session-import-btn"
            onClick={() => fileInputRef.current.click()}
          >
            ⬆ Import .json
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>

        {/* ---- Status message ---- */}
        {status && <div className="session-status">{status}</div>}

        {/* ---- Saved sessions list ---- */}
        <div className="session-section-label" style={{ marginTop: 12 }}>
          Saved sessions ({sessions.length})
        </div>

        <div className="session-list">
          {sessions.length === 0 && (
            <div className="session-empty">
              No saved sessions yet. Save your current session above.
            </div>
          )}

          {sessions.map(session => (
            <div key={session.id} className="session-item">

              {/* Session info */}
              <div className="session-item-info">
                <span className="session-item-name">{session.name}</span>
                <span className="session-item-date">{formatDate(session.savedAt)}</span>
                <span className="session-item-meta">
                  {session.combatants?.length || 0} combatants ·{' '}
                  {session.party?.length || 0} party members ·{' '}
                  {session.notes?.length || 0} notes
                </span>
              </div>

              {/* Session actions */}
              <div className="session-item-btns">
                {/* Load */}
                <button
                  className="session-btn session-btn--load"
                  onClick={() => handleLoad(session)}
                  title="Load this session"
                >
                  ↩ Load
                </button>

                {/* Export */}
                <button
                  className="session-btn session-btn--export"
                  onClick={() => handleExport(session)}
                  title="Export as .json file"
                >
                  ⬇ Export
                </button>

                {/* Delete — requires confirmation */}
                {confirmDelete === session.id ? (
                  <>
                    <button
                      className="session-btn session-btn--confirm"
                      onClick={() => handleDelete(session.id)}
                    >
                      Confirm
                    </button>
                    <button
                      className="session-btn session-btn--cancel"
                      onClick={() => setConfirmDelete(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="session-btn session-btn--delete"
                    onClick={() => setConfirmDelete(session.id)}
                    title="Delete this session"
                  >
                    ✕
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>

      </div>
    </>
  );
}

export default SessionManager;