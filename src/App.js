// ============================================================
// APP.JS — Torchlight Combat
// Main application shell
// Manages shared combat state and tab navigation
// ============================================================

import React, { useState } from 'react';
import './App.css';

// ---- Combat components ----
import Initiative    from './components/Initiative';
import BattleMap     from './components/BattleMap';
import DiceRoller    from './components/DiceRoller';
import TurnTimer     from './components/TurnTimer';
import PartyManager  from './components/PartyManager';

// ---- Notes component ----
import Notes from './components/Notes';


function App() {

  // ============================================================
  // TAB STATE
  // Controls which view is shown: 'combat' or 'notes'
  // ============================================================
  const [activeTab, setActiveTab] = useState('combat');


  // ============================================================
  // SHARED COMBAT STATE
  // Passed down to Initiative, BattleMap, TurnTimer
  // ============================================================
  const [combatants, setCombatants]   = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);


  // ============================================================
  // ADD CHARACTER FROM PARTY MANAGER TO COMBAT
  // Keeps the combatant list sorted by initiative (highest first)
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

      {/* ---- APP HEADER: Logo + Tab Navigation ---- */}
      <div className="app-header">
        <h1>🔦 Torchlight Combat</h1>

        <div className="app-tabs">
          {/* Combat tab */}
          <button
            className={`app-tab ${activeTab === 'combat' ? 'active' : ''}`}
            onClick={() => setActiveTab('combat')}
          >
            ⚔️ Combat
          </button>

          {/* Notes tab */}
          <button
            className={`app-tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            📝 Notes
          </button>
        </div>
      </div>


      {/* ---- NOTES PAGE ---- */}
      {/* Rendered when Notes tab is active */}
      {activeTab === 'notes' && <Notes />}


      {/* ---- COMBAT VIEW ---- */}
      {/* Hidden when Notes tab is active, preserved in DOM so state is kept */}
      <div style={{ display: activeTab === 'combat' ? 'block' : 'none' }}>

        {/* Top row: Initiative Tracker + Party Manager */}
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

        {/* Bottom row: Battle Map + Side Panel (Timer + Dice) */}
        <div className="bottom-row">
          <div className="map-column">
            <BattleMap
              combatants={combatants}
              currentTurn={currentTurn}
            />
          </div>
          <div className="side-panel">
            <div className="side-panel-header">⚔️ Combat Tools</div>
            <TurnTimer currentTurn={currentTurn} />
            <DiceRoller />
          </div>
        </div>

      </div>
      {/* ---- END COMBAT VIEW ---- */}

    </div>
  );
}

export default App;
