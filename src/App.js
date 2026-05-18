// ============================================================
// APP.JS — Torchlight Combat
// Manual URL routing — no React Router needed
// /player shows PlayerView, everything else shows DM console
// ============================================================

import React, { useState, useEffect } from 'react';
import './App.css';

// ---- Combat components ----
import Initiative    from './components/Initiative';
import BattleMap     from './components/BattleMap';
import DiceRoller    from './components/DiceRoller';
import TurnTimer     from './components/TurnTimer';
import PartyManager  from './components/PartyManager';

// ---- Other views ----
import Notes          from './components/Notes';
import PlayerView     from './components/PlayerView';
import SessionManager from './components/SessionManager';


// ============================================================
// CONSTANTS
// ============================================================
const COLS = 50;
const ROWS = 50;


// ============================================================
// INDEXEDDB IMAGE LOADER
// ============================================================
const loadImageFromDB = () => new Promise((resolve) => {
  try {
    const req = indexedDB.open('torchlight-mapimage', 1);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('image')) { resolve(null); return; }
      const tx  = db.transaction('image', 'readonly');
      const get = tx.objectStore('image').get('mapbg');
      get.onsuccess = () => resolve(get.result || null);
      get.onerror   = () => resolve(null);
    };
    req.onerror = () => resolve(null);
  } catch { resolve(null); }
});


// ============================================================
// APP COMPONENT
// ============================================================
function App() {

  // ---- Detect if we're on the /player route ----
  const isPlayerView = window.location.pathname === '/player';

  // ---- Tab state (DM only) ----
  const [activeTab, setActiveTab]     = useState('combat');
  const [sessionOpen, setSessionOpen] = useState(false);

  // ---- Combat state ----
  const [combatants, setCombatants]   = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);

  // ---- Map state ----
  const [terrain, setTerrain] = useState(
    () => Array(ROWS).fill(null).map(() => Array(COLS).fill('empty'))
  );
  const [obstacles, setObstacles]           = useState([]);
  const [tokenPositions, setTokenPositions] = useState({});
  const [mapImage, setMapImage]             = useState(null);

  // ---- Load persisted image on startup ----
  useEffect(() => {
    loadImageFromDB().then(data => { if (data) setMapImage(data); });
  }, []);

  // ---- Sync map state to localStorage so Player View can read it ----
  useEffect(() => {
    localStorage.setItem('torchlight-map-state', JSON.stringify({
      combatants,
      currentTurn,
      obstacles,
      tokenPositions,
    }));
  }, [combatants, currentTurn, obstacles, tokenPositions]);

   // ---- Sync terrain to localStorage for Player View ----
  useEffect(() => {
    localStorage.setItem('torchlight-terrain', JSON.stringify(terrain));
  }, [terrain]);

  // ---- Add combatant from party ----
  const addToCombat = (newCombatant) => {
    setCombatants(prev =>
      [...prev, newCombatant].sort((a, b) => b.initiative - a.initiative)
    );
  };


  // ============================================================
  // PLAYER VIEW — standalone page at /player
  // ============================================================
  if (isPlayerView) {
    return (
      <div className="app">
        <PlayerView
          combatants={combatants}
          currentTurn={currentTurn}
          terrain={terrain}
          obstacles={obstacles}
          tokenPositions={tokenPositions}
          mapImage={mapImage}
          standalone={true}
        />
      </div>
    );
  }


  // ============================================================
  // DM CONSOLE — main interface
  // ============================================================
  return (
    <div className="app">

      {/* ---- APP HEADER ---- */}
      <div className="app-header">
        <h1>🔦 Torchlight Combat</h1>

        <div className="app-tabs">
          <button
            className={`app-tab ${activeTab === 'combat' ? 'active' : ''}`}
            onClick={() => setActiveTab('combat')}
          >
            ⚔️ Combat
          </button>

          <button
            className={`app-tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            📝 Notes
          </button>

          {/* Opens player view in new window */}
          <button
            className="app-tab"
            onClick={() => window.open('/player', '_blank')}
            title="Open player view in new window for streaming"
          >
            👁 Player View
          </button>

          <button
            className="app-tab session-tab"
            onClick={() => setSessionOpen(true)}
          >
            💾 Sessions
          </button>
        </div>
      </div>


      {/* ---- SESSION MANAGER ---- */}
      <SessionManager
        isOpen={sessionOpen}
        onClose={() => setSessionOpen(false)}
        combatants={combatants}
        setCombatants={setCombatants}
        currentTurn={currentTurn}
        setCurrentTurn={setCurrentTurn}
        terrain={terrain}
        setTerrain={setTerrain}
        obstacles={obstacles}
        setObstacles={setObstacles}
        tokenPositions={tokenPositions}
        setTokenPositions={setTokenPositions}
      />


      {/* ---- NOTES PAGE ---- */}
      {activeTab === 'notes' && <Notes />}


      {/* ---- COMBAT VIEW ---- */}
      <div style={{ display: activeTab === 'combat' ? 'block' : 'none' }}>

        <div className="top-row">
          <div className="initiative-column">
            <Initiative
              combatants={combatants}
              setCombatants={setCombatants}
              currentTurn={currentTurn}
              setCurrentTurn={setCurrentTurn}
            />
          </div>
          <div className="party-column">
            <PartyManager onAddToCombat={addToCombat} />
          </div>
        </div>

        <div className="bottom-row">
          <div className="map-column">
            <BattleMap
              combatants={combatants}
              currentTurn={currentTurn}
              terrain={terrain}
              setTerrain={setTerrain}
              obstacles={obstacles}
              setObstacles={setObstacles}
              tokenPositions={tokenPositions}
              setTokenPositions={setTokenPositions}
              mapImage={mapImage}
              setMapImage={setMapImage}
            />
          </div>
          <div className="side-panel">
            <div className="side-panel-header">⚔️ Combat Tools</div>
            <TurnTimer currentTurn={currentTurn} />
            <DiceRoller />
          </div>
        </div>

      </div>

    </div>
  );
}

export default App;
