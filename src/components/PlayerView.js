// ============================================================
// PLAYERVIEW.JS — Torchlight Combat
// Read-only battle map for players
// Polls localStorage every second for live updates from DM
// Fog of war based on PC positions and sight/darkvision values
// ============================================================

import React, { useState, useEffect } from 'react';

// ============================================================
// CONSTANTS
// ============================================================
const CELL_SIZE = 40;
const COLS      = 50;
const ROWS      = 50;

// ============================================================
// TERRAIN COLORS
// ============================================================
const TERRAIN_COLORS = {
  empty:     'transparent',
  high:      '#8B6914AA',
  low:       '#1a3a5cAA',
  difficult: '#2d5a1bAA',
  hazard:    '#8B1a1aAA',
  wall:      '#444444FF',
};

// ============================================================
// OBSTACLE ICONS
// ============================================================
const OBSTACLE_ICONS = {
  tree: '🌲', boulder: '🪨', pillar: '🏛️', barrel: '🛢️',
  table: '🪵', table_set: '🍽️', fire: '🔥', water: '🌊',
  door_open: '🚪', door_locked: '🔒', door_barricade: '🚧',
  hole: '🕳️', ladder: '🪜', window: '🪟', window_open: '🔓',
  candle: '🕯️', lantern: '🔦', torch: '🪔', magic_light: '⭐',
  darkness: '🌑', chair: '🪑', bed: '🛏️', mirror: '🪞',
  bookshelf: '📚', weapon_rack: '🗡️', alchemy: '⚗️',
  chest: '📦', chest_open: '🗃️', web: '🕸️',
};

// ---- Hidden obstacle types — never shown to players ----
const HIDDEN_TYPES = new Set([
  'door_hidden', 'door_secret', 'trap', 'trap_hidden',
  'poison_vent', 'rune_trap',
]);

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
// PLAYER VIEW COMPONENT
// ============================================================
function PlayerView({ standalone }) {

  const [combatants,     setCombatants]     = useState([]);
  const [currentTurn,    setCurrentTurn]    = useState(0);
  const [terrain,        setTerrain]        = useState(
    () => Array(ROWS).fill(null).map(() => Array(COLS).fill('empty'))
  );
  const [obstacles,      setObstacles]      = useState([]);
  const [tokenPositions, setTokenPositions] = useState({});
  const [party,          setParty]          = useState([]);
  const [mapImage,       setMapImage]       = useState(null);


  // ============================================================
  // POLL LOCALSTORAGE EVERY SECOND
  // ============================================================
  useEffect(() => {
    const poll = () => {
      try {
        const mapState = localStorage.getItem('torchlight-map-state');
        if (mapState) {
          const parsed = JSON.parse(mapState);
          setCombatants(parsed.combatants        || []);
          setCurrentTurn(parsed.currentTurn      || 0);
          setObstacles(parsed.obstacles           || []);
          setTokenPositions(parsed.tokenPositions || {});
        }
      } catch {}

      try {
        const savedTerrain = localStorage.getItem('torchlight-terrain');
        if (savedTerrain) setTerrain(JSON.parse(savedTerrain));
      } catch {}

      try {
        const savedParty = localStorage.getItem('torchlight-party');
        if (savedParty) setParty(JSON.parse(savedParty));
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, []);


  // ---- Load map image from IndexedDB on mount ----
  useEffect(() => {
    loadImageFromDB().then(data => { if (data) setMapImage(data); });
  }, []);


  // ============================================================
  // FOG OF WAR CALCULATION WITH WALL BLOCKING
  // ============================================================
  const calcFog = () => {
    const visible = new Set();
    const dimmed  = new Set();

    // ---- Check if line from (r1,c1) to (r2,c2) hits a wall ----
    const hasLineOfSight = (r1, c1, r2, c2) => {
      const steps = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
      if (steps === 0) return true;
      for (let i = 1; i < steps; i++) {
        const r = Math.round(r1 + (r2 - r1) * (i / steps));
        const c = Math.round(c1 + (c2 - c1) * (i / steps));
        if (terrain[r]?.[c] === 'wall') return false;
      }
      return true;
    };

    party.forEach(member => {
      const combatant = combatants.find(c => c.name === member.name);
      if (!combatant) return;
      const pos = tokenPositions[combatant.id];
      if (!pos) return;

      const sightCells      = Math.ceil((member.sight || 30) / 5);
      const darkvisionCells = member.darkvision
        ? Math.ceil((member.darkvisionRange || 60) / 5)
        : 0;
      const maxRange = Math.max(sightCells, darkvisionCells);

      for (let r = pos.row - maxRange; r <= pos.row + maxRange; r++) {
        for (let c = pos.col - maxRange; c <= pos.col + maxRange; c++) {
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
          const dist = Math.max(Math.abs(r - pos.row), Math.abs(c - pos.col));
          const key  = `${r}-${c}`;
          const los  = hasLineOfSight(pos.row, pos.col, r, c);

          if (!los) continue; // wall blocks sight

          if (dist <= sightCells) {
            visible.add(key);
            dimmed.delete(key);
          } else if (dist <= darkvisionCells && !visible.has(key)) {
            dimmed.add(key);
          }
        }
      }
    });

    return { visible, dimmed };
  };

  const { visible, dimmed } = calcFog();

  const hasPCsOnMap = party.some(member => {
    const combatant = combatants.find(c => c.name === member.name);
    return combatant && tokenPositions[combatant.id];
  });

  const visibleObstacles = obstacles.filter(o => !HIDDEN_TYPES.has(o.type));


  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="player-view">

      {/* Header */}
      <div className="player-view-header">
        <span className="player-view-title">👁 Player View</span>
        <span className="player-view-sub">
          {hasPCsOnMap
            ? `${party.filter(m => {
                const c = combatants.find(x => x.name === m.name);
                return c && tokenPositions[c.id];
              }).length} PC(s) on map`
            : 'No PCs placed on map — fog covers all'}
        </span>
      </div>

      {/* Map */}
      <div className="player-view-map-wrap">
        <div
          className="map-grid-wrapper"
          style={{ position: 'relative', width: '100%', height: '80vh' }}
        >
          {/* Background image */}
          {mapImage && (
            <img
              src={mapImage.src}
              alt="Map background"
              style={{
                position: 'absolute',
                top: mapImage.posY || 0,
                left: mapImage.posX || 0,
                transform: `scale(${(mapImage.scale || 100) / 100})`,
                transformOrigin: 'top left',
                zIndex: 0,
                pointerEvents: 'none',
                maxWidth: 'none',
              }}
              draggable={false}
            />
          )}

          {/* Grid */}
          <div
            className="map-grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
              gridTemplateRows:    `repeat(${ROWS}, ${CELL_SIZE}px)`,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {Array(ROWS).fill(null).map((_, row) =>
              Array(COLS).fill(null).map((_, col) => {
                const key       = `${row}-${col}`;
                const isVisible = visible.has(key);
                const isDimmed  = dimmed.has(key);
                const isFogged  = !hasPCsOnMap || (!isVisible && !isDimmed);
                const color     = TERRAIN_COLORS[terrain[row]?.[col]] || 'transparent';
                const obstacle  = visibleObstacles.find(o => o.row === row && o.col === col);
                const tokens    = combatants.filter(c => {
                  const p = tokenPositions[c.id];
                  return p && p.row === row && p.col === col;
                });

                return (
                  <div
                    key={key}
                    className="map-cell"
                    style={{ background: isFogged ? 'transparent' : color }}
                  >
                    {/* Obstacle */}
                    {obstacle && isVisible && (
                      <span className="cell-obstacle">
                        {OBSTACLE_ICONS[obstacle.type] || '?'}
                      </span>
                    )}

                    {/* Tokens */}
                    {!isFogged && tokens.map(c => {
                      const isActive = combatants.indexOf(c) === currentTurn;
                      return (
                        <div
                          key={c.id}
                          className={`grid-token ${isActive ? 'active' : ''} ${c.hp === 0 ? 'dead' : ''}`}
                          style={{
                            background: c.token.color + 'CC',
                            border:     '3px solid #fff',
                            boxShadow:  `0 0 0 2px ${c.token.color}, 0 0 12px ${c.token.color}`,
                            opacity:    c.hp === 0 ? 0.4 : 1,
                            filter:     isDimmed && !isVisible ? 'brightness(0.5)' : 'none',
                          }}
                        >
                          {c.hp === 0
                            ? <span style={{ fontSize: '0.9rem' }}>💀</span>
                            : <i
                                className={`ra ${c.token.icon}`}
                                style={{
                                  color: '#fff',
                                  fontSize: '1.2rem',
                                  filter: 'drop-shadow(0 0 4px rgba(0,0,0,1)) drop-shadow(0 0 4px rgba(0,0,0,1))',
                                }}
                              />
                          }
                        </div>
                      );
                    })}

                    {/* Fog overlay */}
                    {isFogged && <div className="player-view-fog" />}

                    {/* Dim overlay for darkvision */}
                    {isDimmed && !isVisible && <div className="player-view-dim" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="player-view-legend">
        <span className="player-view-legend-item">
          <span className="player-view-legend-swatch" style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)' }} />
          Visible
        </span>
        <span className="player-view-legend-item">
          <span className="player-view-legend-swatch" style={{ background: 'rgba(50,80,120,.6)' }} />
          Darkvision
        </span>
        <span className="player-view-legend-item">
          <span className="player-view-legend-swatch" style={{ background: '#060b14' }} />
          Hidden
        </span>
      </div>

    </div>
  );
}

export default PlayerView;