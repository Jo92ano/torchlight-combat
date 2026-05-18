// ============================================================
// APP.JS — Torchlight Combat
// Main application shell
// Manages shared combat state, map state and tab navigation
// ============================================================

import React, { useState } from 'react';
import './App.css';

// ---- Combat components ----
import Initiative   from './components/Initiative';
import BattleMap    from './components/BattleMap';
import DiceRoller   from './components/DiceRoller';
import TurnTimer    from './components/TurnTimer';
import PartyManager from './components/PartyManager';

// ---- Notes component ----
import Notes from './components/Notes';


// ============================================================
// MAP CONSTANTS
// ============================================================
const COLS = 50;
const ROWS = 50;


function App() {

  // ============================================================
  // TAB STATE
  // ============================================================
  const [activeTab, setActiveTab] = useState('combat');


  // ============================================================
  // SHARED COMBAT STATE
  // ============================================================
  const [combatants, setCombatants]   = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);


  // ============================================================
  // MAP STATE — lifted from BattleMap
  // Lives here so PlayerView can also read it later
  // ============================================================

  // Terrain grid: 2D array of terrain type strings
  const [terrain, setTerrain] = useState(
    () => Array(ROWS).fill(null).map(() => Array(COLS).fill('empty'))
  );

  // Obstacles placed on the map
  const [obstacles, setObstacles] = useState([]);

  // Token positions: { [combatantId]: { row, col } }
  const [tokenPositions, setTokenPositions] = useState({});


  // ============================================================
  // ADD CHARACTER FROM PARTY MANAGER TO COMBAT
  // ============================================================
  const addToCombat = (newCombatant) => {
    setCombatants(prev => {
      const updated = [...prev, newCombatant]
        .sort((a, b) => b.initiative - a.initiative);
      return updated;
    });
  };


  // ============================================================
  // RENDER
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
        </div>
      </div>

      {/* ---- NOTES PAGE ---- */}
      {activeTab === 'notes' && <Notes />}

      {/* ---- COMBAT VIEW ---- */}
      <div style={{ display: activeTab === 'combat' ? 'block' : 'none' }}>

        {/* Top row: Initiative + Party Manager */}
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

        {/* Bottom row: Battle Map + Side Panel */}
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