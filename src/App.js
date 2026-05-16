import React, { useState } from 'react';
import './App.css';
import Initiative from './components/Initiative';
import BattleMap from './components/BattleMap';
import DiceRoller from './components/DiceRoller';
import TurnTimer from './components/TurnTimer';

function App() {
  // ---- Shared state: combatants and current turn ----
  // Lifted here so Initiative, BattleMap, and TurnTimer can all access them
  const [combatants, setCombatants]   = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);

  return (
    <div className="app">
      <h1>🔦 Torchlight Combat</h1>

      {/* ---- Initiative Tracker (narrow) ---- */}
      <Initiative
        combatants={combatants}
        setCombatants={setCombatants}
        currentTurn={currentTurn}
        setCurrentTurn={setCurrentTurn}
      />

      {/* ---- Bottom row: Battle Map + Side Panel ---- */}
      <div className="bottom-row">

        {/* Battle map takes most of the space */}
        <div className="map-column">
          <BattleMap
            combatants={combatants}
            currentTurn={currentTurn}
          />
        </div>

        {/* Side panel: timer + dice roller */}
        <div className="side-panel">
          <div className="side-panel-header">⚔️ Combat Tools</div>
          <TurnTimer currentTurn={currentTurn} />
          <DiceRoller />
        </div>

      </div>
    </div>
  );
}

export default App;