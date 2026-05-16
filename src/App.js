import React, { useState } from 'react';
import './App.css';
import Initiative from './components/Initiative';
import BattleMap from './components/BattleMap';
import DiceRoller from './components/DiceRoller';
import TurnTimer from './components/TurnTimer';
import PartyManager from './components/PartyManager';

function App() {
  // ---- Shared state: combatants and current turn ----
  const [combatants, setCombatants]   = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);

  // ============================================================
  // ADD A CHARACTER FROM PARTY MANAGER TO COMBAT
  // Keeps list sorted by initiative
  // ============================================================
  const addToCombat = (newCombatant) => {
    setCombatants(prev => {
      const updated = [...prev, newCombatant]
        .sort((a, b) => b.initiative - a.initiative);
      return updated;
    });
  };

  return (
    <div className="app">
      <h1>🔦 Torchlight Combat</h1>

      {/* ---- Top row: Initiative + Party Manager ---- */}
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

      {/* ---- Bottom row: Battle Map + Side Panel ---- */}
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
  );
}

export default App;